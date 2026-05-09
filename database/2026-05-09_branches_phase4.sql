-- Phase 4: Branch-aware RLS + branch-aware audit logs.
--
-- Goal:
--   1. Update log_action() to copy branch_id from NEW/OLD on branch-scoped
--      tables, leaving NULL for tables that are not branch-scoped (profiles).
--   2. Rewrite every RLS policy on the 8 business tables so reads and writes
--      both require is_branch_member(branch_id), layered on top of the
--      existing role check.
--   3. Update the logs read policy to scope by branch membership too.
--
-- What deliberately does NOT change:
--   - The role rules themselves. is_admin() / can_manage() /
--     can_edit_transactions() all keep their current meanings.
--   - Policies stay TO public (matching current production), since helper
--     functions already block anonymous users and the user wants no
--     behavior change beyond branch isolation.
--   - The fixed_charge_approval insert policy keeps every one of its
--     existing checks (Charges fixes, amount<0, fixed_charge_id required,
--     EXISTS check on the request) and just gains a branch-membership
--     check.
--
-- Pre-requisites already in place:
--   - branches, branch_memberships, branch_id columns (Phase 2).
--   - branch_id NOT NULL + composite FKs (Phase 3).
--   - is_branch_member(uuid) (Phase 2).
--   - is_admin(), can_manage(), can_edit_transactions() captured into
--     migrations (capture_is_admin.sql, capture_can_manage.sql, and
--     2026-05-02_add_fixed_charge_requests.sql).

BEGIN;

-- ============================================================================
-- 1. log_action(): copy branch_id from the row when the table is scoped
-- ============================================================================
--
-- The trigger fires on inserts/updates/deletes for: transactions, employees,
-- fixed_charges, products, subcategories, subscriptions, loan_contacts, and
-- fixed_charge_requests. All of those have branch_id NOT NULL after Phase 3.
--
-- profiles also has a log trigger but is NOT branch-scoped — we leave
-- branch_id NULL for those rows, which the logs read policy below tolerates
-- via the OR branch_id IS NULL clause.
--
-- We extract branch_id from to_jsonb(NEW)/to_jsonb(OLD) so we don't need to
-- know the table at compile time. If the JSON has no branch_id key
-- (profiles), the cast to uuid yields NULL.

CREATE OR REPLACE FUNCTION public.log_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  new_json jsonb;
  old_json jsonb;
  new_branch uuid;
  old_branch uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    new_json := to_jsonb(NEW);
    new_branch := nullif(new_json ->> 'branch_id', '')::uuid;
    INSERT INTO public.logs (user_id, action, table_name, record_id, old_data, new_data, branch_id)
    VALUES (auth.uid(), 'INSERT', TG_TABLE_NAME, NEW.id, NULL, new_json, new_branch);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    new_json := to_jsonb(NEW);
    old_json := to_jsonb(OLD);
    new_branch := nullif(new_json ->> 'branch_id', '')::uuid;
    INSERT INTO public.logs (user_id, action, table_name, record_id, old_data, new_data, branch_id)
    VALUES (auth.uid(), 'UPDATE', TG_TABLE_NAME, NEW.id, old_json, new_json, new_branch);
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    old_json := to_jsonb(OLD);
    old_branch := nullif(old_json ->> 'branch_id', '')::uuid;
    INSERT INTO public.logs (user_id, action, table_name, record_id, old_data, new_data, branch_id)
    VALUES (auth.uid(), 'DELETE', TG_TABLE_NAME, OLD.id, old_json, NULL, old_branch);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- ============================================================================
-- 2. transactions: rewrite all 4 policies + the fixed-charge approval one
-- ============================================================================

-- Read: was USING (true). Now requires branch membership.
DROP POLICY IF EXISTS read_transactions ON public.transactions;
CREATE POLICY read_transactions
  ON public.transactions
  FOR SELECT
  USING (public.is_branch_member(branch_id));

-- Insert (admin-only): admin_insert_transactions used WITH CHECK (is_admin()).
-- Adds branch membership.
DROP POLICY IF EXISTS admin_insert_transactions ON public.transactions;
CREATE POLICY admin_insert_transactions
  ON public.transactions
  FOR INSERT
  WITH CHECK (
    public.is_admin()
    AND public.is_branch_member(branch_id)
  );

-- Update (admin-only): admin_update_transactions used USING (is_admin()).
-- Both USING and WITH CHECK gain branch membership so a row can't be
-- moved across branches.
DROP POLICY IF EXISTS admin_update_transactions ON public.transactions;
CREATE POLICY admin_update_transactions
  ON public.transactions
  FOR UPDATE
  USING (
    public.is_admin()
    AND public.is_branch_member(branch_id)
  )
  WITH CHECK (
    public.is_admin()
    AND public.is_branch_member(branch_id)
  );

-- Delete (admin-only): admin_delete_transactions used USING (is_admin()).
DROP POLICY IF EXISTS admin_delete_transactions ON public.transactions;
CREATE POLICY admin_delete_transactions
  ON public.transactions
  FOR DELETE
  USING (
    public.is_admin()
    AND public.is_branch_member(branch_id)
  );

-- Fixed-charge approval insert (admin and mod): keeps all original checks,
-- just gains branch membership. Mods can only insert transactions through
-- this path, so this is what lets a mod approve a charge in their branch.
DROP POLICY IF EXISTS insert_fixed_charge_approval_transactions_for_admin_and_mod
  ON public.transactions;
CREATE POLICY insert_fixed_charge_approval_transactions_for_admin_and_mod
  ON public.transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_edit_transactions()
    AND public.is_branch_member(branch_id)
    AND category = 'Charges fixes'
    AND amount < 0
    AND fixed_charge_id IS NOT NULL
    AND fixed_charge_request_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.fixed_charge_requests AS request
      WHERE request.id = transactions.fixed_charge_request_id
        AND request.fixed_charge_id = transactions.fixed_charge_id
        AND request.due_date = transactions.date
        AND request.status = 'pending'
        AND request.branch_id = transactions.branch_id
    )
  );

-- ============================================================================
-- 3. employees: rewrite all 4 policies
-- ============================================================================

DROP POLICY IF EXISTS read_employees ON public.employees;
CREATE POLICY read_employees
  ON public.employees
  FOR SELECT
  USING (public.is_branch_member(branch_id));

DROP POLICY IF EXISTS manage_write_employees ON public.employees;
CREATE POLICY manage_write_employees
  ON public.employees
  FOR INSERT
  WITH CHECK (
    public.can_manage()
    AND public.is_branch_member(branch_id)
  );

DROP POLICY IF EXISTS manage_update_employees ON public.employees;
CREATE POLICY manage_update_employees
  ON public.employees
  FOR UPDATE
  USING (
    public.can_manage()
    AND public.is_branch_member(branch_id)
  )
  WITH CHECK (
    public.can_manage()
    AND public.is_branch_member(branch_id)
  );

DROP POLICY IF EXISTS manage_delete_employees ON public.employees;
CREATE POLICY manage_delete_employees
  ON public.employees
  FOR DELETE
  USING (
    public.can_manage()
    AND public.is_branch_member(branch_id)
  );

-- ============================================================================
-- 4. products: same shape as employees
-- ============================================================================

DROP POLICY IF EXISTS read_products ON public.products;
CREATE POLICY read_products
  ON public.products
  FOR SELECT
  USING (public.is_branch_member(branch_id));

DROP POLICY IF EXISTS manage_write_products ON public.products;
CREATE POLICY manage_write_products
  ON public.products
  FOR INSERT
  WITH CHECK (public.can_manage() AND public.is_branch_member(branch_id));

DROP POLICY IF EXISTS manage_update_products ON public.products;
CREATE POLICY manage_update_products
  ON public.products
  FOR UPDATE
  USING (public.can_manage() AND public.is_branch_member(branch_id))
  WITH CHECK (public.can_manage() AND public.is_branch_member(branch_id));

DROP POLICY IF EXISTS manage_delete_products ON public.products;
CREATE POLICY manage_delete_products
  ON public.products
  FOR DELETE
  USING (public.can_manage() AND public.is_branch_member(branch_id));

-- ============================================================================
-- 5. fixed_charges
-- ============================================================================

DROP POLICY IF EXISTS read_fixed_charges ON public.fixed_charges;
CREATE POLICY read_fixed_charges
  ON public.fixed_charges
  FOR SELECT
  USING (public.is_branch_member(branch_id));

DROP POLICY IF EXISTS manage_write_fixed_charges ON public.fixed_charges;
CREATE POLICY manage_write_fixed_charges
  ON public.fixed_charges
  FOR INSERT
  WITH CHECK (public.can_manage() AND public.is_branch_member(branch_id));

DROP POLICY IF EXISTS manage_update_fixed_charges ON public.fixed_charges;
CREATE POLICY manage_update_fixed_charges
  ON public.fixed_charges
  FOR UPDATE
  USING (public.can_manage() AND public.is_branch_member(branch_id))
  WITH CHECK (public.can_manage() AND public.is_branch_member(branch_id));

DROP POLICY IF EXISTS manage_delete_fixed_charges ON public.fixed_charges;
CREATE POLICY manage_delete_fixed_charges
  ON public.fixed_charges
  FOR DELETE
  USING (public.can_manage() AND public.is_branch_member(branch_id));

-- ============================================================================
-- 6. subcategories
-- ============================================================================

DROP POLICY IF EXISTS read_subcategories ON public.subcategories;
CREATE POLICY read_subcategories
  ON public.subcategories
  FOR SELECT
  USING (public.is_branch_member(branch_id));

DROP POLICY IF EXISTS manage_write_subcategories ON public.subcategories;
CREATE POLICY manage_write_subcategories
  ON public.subcategories
  FOR INSERT
  WITH CHECK (public.can_manage() AND public.is_branch_member(branch_id));

DROP POLICY IF EXISTS manage_update_subcategories ON public.subcategories;
CREATE POLICY manage_update_subcategories
  ON public.subcategories
  FOR UPDATE
  USING (public.can_manage() AND public.is_branch_member(branch_id))
  WITH CHECK (public.can_manage() AND public.is_branch_member(branch_id));

DROP POLICY IF EXISTS manage_delete_subcategories ON public.subcategories;
CREATE POLICY manage_delete_subcategories
  ON public.subcategories
  FOR DELETE
  USING (public.can_manage() AND public.is_branch_member(branch_id));

-- ============================================================================
-- 7. subscriptions
-- ============================================================================

DROP POLICY IF EXISTS read_subscriptions ON public.subscriptions;
CREATE POLICY read_subscriptions
  ON public.subscriptions
  FOR SELECT
  USING (public.is_branch_member(branch_id));

DROP POLICY IF EXISTS manage_write_subscriptions ON public.subscriptions;
CREATE POLICY manage_write_subscriptions
  ON public.subscriptions
  FOR INSERT
  WITH CHECK (public.can_manage() AND public.is_branch_member(branch_id));

DROP POLICY IF EXISTS manage_update_subscriptions ON public.subscriptions;
CREATE POLICY manage_update_subscriptions
  ON public.subscriptions
  FOR UPDATE
  USING (public.can_manage() AND public.is_branch_member(branch_id))
  WITH CHECK (public.can_manage() AND public.is_branch_member(branch_id));

DROP POLICY IF EXISTS manage_delete_subscriptions ON public.subscriptions;
CREATE POLICY manage_delete_subscriptions
  ON public.subscriptions
  FOR DELETE
  USING (public.can_manage() AND public.is_branch_member(branch_id));

-- ============================================================================
-- 8. loan_contacts
-- ============================================================================

DROP POLICY IF EXISTS read_loan_contacts ON public.loan_contacts;
CREATE POLICY read_loan_contacts
  ON public.loan_contacts
  FOR SELECT
  USING (public.is_branch_member(branch_id));

DROP POLICY IF EXISTS manage_write_loan_contacts ON public.loan_contacts;
CREATE POLICY manage_write_loan_contacts
  ON public.loan_contacts
  FOR INSERT
  WITH CHECK (public.can_manage() AND public.is_branch_member(branch_id));

DROP POLICY IF EXISTS manage_update_loan_contacts ON public.loan_contacts;
CREATE POLICY manage_update_loan_contacts
  ON public.loan_contacts
  FOR UPDATE
  USING (public.can_manage() AND public.is_branch_member(branch_id))
  WITH CHECK (public.can_manage() AND public.is_branch_member(branch_id));

DROP POLICY IF EXISTS manage_delete_loan_contacts ON public.loan_contacts;
CREATE POLICY manage_delete_loan_contacts
  ON public.loan_contacts
  FOR DELETE
  USING (public.can_manage() AND public.is_branch_member(branch_id));

-- ============================================================================
-- 9. fixed_charge_requests: keep can_edit_transactions(), add membership
-- ============================================================================
--
-- These policies currently target `authenticated` (not `public`), unlike the
-- others. We preserve that.

DROP POLICY IF EXISTS read_fixed_charge_requests_for_admin_and_mod
  ON public.fixed_charge_requests;
CREATE POLICY read_fixed_charge_requests_for_admin_and_mod
  ON public.fixed_charge_requests
  FOR SELECT
  TO authenticated
  USING (
    public.can_edit_transactions()
    AND public.is_branch_member(branch_id)
  );

DROP POLICY IF EXISTS insert_fixed_charge_requests_for_admin_and_mod
  ON public.fixed_charge_requests;
CREATE POLICY insert_fixed_charge_requests_for_admin_and_mod
  ON public.fixed_charge_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_edit_transactions()
    AND public.is_branch_member(branch_id)
  );

DROP POLICY IF EXISTS update_fixed_charge_requests_for_admin_and_mod
  ON public.fixed_charge_requests;
CREATE POLICY update_fixed_charge_requests_for_admin_and_mod
  ON public.fixed_charge_requests
  FOR UPDATE
  TO authenticated
  USING (
    public.can_edit_transactions()
    AND public.is_branch_member(branch_id)
  )
  WITH CHECK (
    public.can_edit_transactions()
    AND public.is_branch_member(branch_id)
  );

DROP POLICY IF EXISTS delete_fixed_charge_requests_for_admin_and_mod
  ON public.fixed_charge_requests;
CREATE POLICY delete_fixed_charge_requests_for_admin_and_mod
  ON public.fixed_charge_requests
  FOR DELETE
  TO authenticated
  USING (
    public.can_edit_transactions()
    AND public.is_branch_member(branch_id)
  );

-- ============================================================================
-- 10. logs: scope reads to branches the user is a member of
-- ============================================================================
--
-- The previous policy was USING (can_manage()). After this migration, a
-- manager (admin/mod) can only read log rows whose branch_id is one of
-- their memberships, OR rows with branch_id NULL (profiles changes,
-- system events that are not branch-scoped).
--
-- In v1 every user has membership in every branch, so this matches today's
-- behavior exactly. It only starts to matter once memberships are revoked.

DROP POLICY IF EXISTS read_logs ON public.logs;
CREATE POLICY read_logs
  ON public.logs
  FOR SELECT
  USING (
    public.can_manage()
    AND (branch_id IS NULL OR public.is_branch_member(branch_id))
  );

-- ============================================================================
-- 11. branches and branch_memberships: read-only access for authenticated
-- ============================================================================
--
-- The frontend BranchProvider needs to list the branches a user can access.
-- It does so by selecting from branch_memberships joined to branches.
--
-- Reads of either table reveal nothing sensitive, so we allow any
-- authenticated user to read both. Writes are not exposed via RLS at all
-- (no INSERT/UPDATE/DELETE policy) so non-superusers cannot modify them
-- through the API. Branch creation and membership management happen via
-- migration or the Supabase dashboard.

ALTER TABLE public.branches            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_memberships  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS read_branches ON public.branches;
CREATE POLICY read_branches
  ON public.branches
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS read_own_branch_memberships ON public.branch_memberships;
CREATE POLICY read_own_branch_memberships
  ON public.branch_memberships
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT ON public.branches           TO authenticated;
GRANT SELECT ON public.branch_memberships TO authenticated;

-- ============================================================================
-- 12. Sanity check
-- ============================================================================
--
-- Confirm every business table has 4 policies (SELECT, INSERT, UPDATE,
-- DELETE) — except transactions which has 5 because of the fixed-charge
-- approval insert path.

DO $$
DECLARE
  shape  record;
  actual integer;
BEGIN
  FOR shape IN
    SELECT * FROM (VALUES
      ('employees',             4),
      ('products',              4),
      ('fixed_charges',         4),
      ('subcategories',         4),
      ('subscriptions',         4),
      ('loan_contacts',         4),
      ('fixed_charge_requests', 4),
      ('transactions',          5)
    ) AS t(tname, expected)
  LOOP
    SELECT count(*) INTO actual
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = shape.tname;
    IF actual <> shape.expected THEN
      RAISE EXCEPTION
        'Phase 4 sanity check failed: public.% has % policies, expected %',
        shape.tname, actual, shape.expected;
    END IF;
  END LOOP;
END $$;

COMMIT;
