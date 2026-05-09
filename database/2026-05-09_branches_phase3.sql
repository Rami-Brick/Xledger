-- Phase 3: Lock branch_id (NOT NULL + composite FKs + indexes).
--
-- Goal of this migration:
--   1. Flip branch_id to NOT NULL on all 8 business tables.
--   2. Add (id, branch_id) unique pairs on every parent table that
--      transactions can link to.
--   3. Replace the simple FKs from transactions with composite FKs that
--      include branch_id, so a Tunisia transaction CANNOT physically link
--      to a Libya employee/product/etc. even if the app sends bad ids.
--   4. Add the same composite FK from fixed_charge_requests to fixed_charges.
--   5. Add btree indexes on branch_id for every business table.
--   6. Replace the fixed_charge_requests UNIQUE (fixed_charge_id, due_date)
--      with UNIQUE (branch_id, fixed_charge_id, due_date) for explicit intent.
--
-- What this migration deliberately does NOT do (saved for Phase 4):
--   - RLS policy rewrites. All policies still use can_edit_transactions()
--     and can_manage(). After Phase 3, branch isolation is enforced at the
--     schema level even though RLS does not check membership yet.
--   - Updates to log_action(). Still happens in Phase 4.
--
-- Pre-flight check (run separately in psql, do not run inside this file):
--
--   -- Phase 2 backfill must have left zero NULL branch_ids:
  -- SELECT 'transactions' AS t, count(*) FROM public.transactions WHERE branch_id IS NULL
  -- UNION ALL SELECT 'employees',             count(*) FROM public.employees             WHERE branch_id IS NULL
  -- UNION ALL SELECT 'products',              count(*) FROM public.products              WHERE branch_id IS NULL
  -- UNION ALL SELECT 'fixed_charges',         count(*) FROM public.fixed_charges         WHERE branch_id IS NULL
  -- UNION ALL SELECT 'fixed_charge_requests', count(*) FROM public.fixed_charge_requests WHERE branch_id IS NULL
  -- UNION ALL SELECT 'subscriptions',         count(*) FROM public.subscriptions         WHERE branch_id IS NULL
  -- UNION ALL SELECT 'subcategories',         count(*) FROM public.subcategories         WHERE branch_id IS NULL
  -- UNION ALL SELECT 'loan_contacts',         count(*) FROM public.loan_contacts         WHERE branch_id IS NULL;
--
--   -- And no transaction should already point at a parent in another branch:
--   SELECT count(*) FROM public.transactions t
--     LEFT JOIN public.employees      e   ON e.id   = t.employee_id              AND e.branch_id  != t.branch_id
--     LEFT JOIN public.products       p   ON p.id   = t.product_id               AND p.branch_id  != t.branch_id
--     LEFT JOIN public.subcategories  sc  ON sc.id  = t.subcategory_id           AND sc.branch_id != t.branch_id
--     LEFT JOIN public.subscriptions  s   ON s.id   = t.subscription_id          AND s.branch_id  != t.branch_id
--     LEFT JOIN public.loan_contacts  lc  ON lc.id  = t.loan_contact_id          AND lc.branch_id != t.branch_id
--     LEFT JOIN public.fixed_charges  fc  ON fc.id  = t.fixed_charge_id          AND fc.branch_id != t.branch_id
--     LEFT JOIN public.fixed_charge_requests fcr ON fcr.id = t.fixed_charge_request_id AND fcr.branch_id != t.branch_id
--    WHERE e.id IS NOT NULL OR p.id IS NOT NULL OR sc.id IS NOT NULL OR s.id IS NOT NULL
--       OR lc.id IS NOT NULL OR fc.id IS NOT NULL OR fcr.id IS NOT NULL;
--   -- Should return 0. If not, fix the offending rows before running this migration.

BEGIN;

-- 1. NOT NULL flips -----------------------------------------------------------

ALTER TABLE public.transactions          ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE public.employees             ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE public.products              ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE public.fixed_charges         ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE public.fixed_charge_requests ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE public.subscriptions         ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE public.subcategories         ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE public.loan_contacts         ALTER COLUMN branch_id SET NOT NULL;
-- logs.branch_id stays nullable: profiles changes log with NULL.

-- 2. (id, branch_id) unique pairs on parent tables ----------------------------
--
-- Required so a composite FK from transactions can reference (id, branch_id).
-- The plain primary key on id already guarantees uniqueness; this just adds
-- the pair as a referenceable target. UNIQUE rather than CONSTRAINT so the
-- accompanying btree index is created automatically.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employees_id_branch_id_key') THEN
    ALTER TABLE public.employees             ADD CONSTRAINT employees_id_branch_id_key             UNIQUE (id, branch_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_id_branch_id_key') THEN
    ALTER TABLE public.products              ADD CONSTRAINT products_id_branch_id_key              UNIQUE (id, branch_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subcategories_id_branch_id_key') THEN
    ALTER TABLE public.subcategories         ADD CONSTRAINT subcategories_id_branch_id_key         UNIQUE (id, branch_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_id_branch_id_key') THEN
    ALTER TABLE public.subscriptions         ADD CONSTRAINT subscriptions_id_branch_id_key         UNIQUE (id, branch_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'loan_contacts_id_branch_id_key') THEN
    ALTER TABLE public.loan_contacts         ADD CONSTRAINT loan_contacts_id_branch_id_key         UNIQUE (id, branch_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fixed_charges_id_branch_id_key') THEN
    ALTER TABLE public.fixed_charges         ADD CONSTRAINT fixed_charges_id_branch_id_key         UNIQUE (id, branch_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fixed_charge_requests_id_branch_id_key') THEN
    ALTER TABLE public.fixed_charge_requests ADD CONSTRAINT fixed_charge_requests_id_branch_id_key UNIQUE (id, branch_id);
  END IF;
END $$;

-- 3. Drop simple FKs from transactions, add composite FKs ---------------------
--
-- Existing FK names from the base schema are not in version control. We
-- discover them dynamically by (table, column) and drop whichever name
-- Postgres assigned. Then we re-add as composite FKs that include branch_id.

DO $$
DECLARE
  fk_name text;
  child_cols text[] := ARRAY[
    'employee_id',
    'product_id',
    'subcategory_id',
    'subscription_id',
    'loan_contact_id',
    'fixed_charge_id',
    'fixed_charge_request_id'
  ];
  col text;
BEGIN
  FOREACH col IN ARRAY child_cols LOOP
    SELECT con.conname INTO fk_name
      FROM pg_constraint con
      JOIN pg_class       rel ON rel.oid = con.conrelid
      JOIN pg_namespace   nsp ON nsp.oid = rel.relnamespace
      JOIN pg_attribute   att ON att.attrelid = rel.oid
                              AND att.attnum = ANY (con.conkey)
     WHERE nsp.nspname = 'public'
       AND rel.relname = 'transactions'
       AND con.contype = 'f'
       AND att.attname = col
       AND array_length(con.conkey, 1) = 1;
    IF fk_name IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.transactions DROP CONSTRAINT %I', fk_name);
    END IF;
  END LOOP;
END $$;

-- Composite FKs. ON DELETE behavior matches the existing semantics:
--   - employee/product/subcategory/subscription/loan_contact/fixed_charge:
--     restrict (default) — keep current behavior, deleting a parent that
--     still has transactions errors out, which is what the app expects.
--   - fixed_charge_request_id: SET NULL (matches the original FK in
--     2026-05-02_add_fixed_charge_requests.sql:166-167).

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_employee_branch_fk
  FOREIGN KEY (employee_id, branch_id)
  REFERENCES public.employees (id, branch_id);

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_product_branch_fk
  FOREIGN KEY (product_id, branch_id)
  REFERENCES public.products (id, branch_id);

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_subcategory_branch_fk
  FOREIGN KEY (subcategory_id, branch_id)
  REFERENCES public.subcategories (id, branch_id);

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_subscription_branch_fk
  FOREIGN KEY (subscription_id, branch_id)
  REFERENCES public.subscriptions (id, branch_id);

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_loan_contact_branch_fk
  FOREIGN KEY (loan_contact_id, branch_id)
  REFERENCES public.loan_contacts (id, branch_id);

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_fixed_charge_branch_fk
  FOREIGN KEY (fixed_charge_id, branch_id)
  REFERENCES public.fixed_charges (id, branch_id);

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_fixed_charge_request_branch_fk
  FOREIGN KEY (fixed_charge_request_id, branch_id)
  REFERENCES public.fixed_charge_requests (id, branch_id)
  ON DELETE SET NULL;

-- 4. fixed_charge_requests → fixed_charges composite FK -----------------------

DO $$
DECLARE
  fk_name text;
BEGIN
  SELECT con.conname INTO fk_name
    FROM pg_constraint con
    JOIN pg_class       rel ON rel.oid = con.conrelid
    JOIN pg_namespace   nsp ON nsp.oid = rel.relnamespace
    JOIN pg_attribute   att ON att.attrelid = rel.oid
                            AND att.attnum = ANY (con.conkey)
   WHERE nsp.nspname = 'public'
     AND rel.relname = 'fixed_charge_requests'
     AND con.contype = 'f'
     AND att.attname = 'fixed_charge_id'
     AND array_length(con.conkey, 1) = 1;
  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.fixed_charge_requests DROP CONSTRAINT %I', fk_name);
  END IF;
END $$;

ALTER TABLE public.fixed_charge_requests
  ADD CONSTRAINT fixed_charge_requests_fixed_charge_branch_fk
  FOREIGN KEY (fixed_charge_id, branch_id)
  REFERENCES public.fixed_charges (id, branch_id)
  ON DELETE CASCADE;

-- 5. branch_id indexes --------------------------------------------------------
--
-- Speeds up the .eq('branch_id', activeBranch.id) filter that every list
-- query in the app will add in Phase 6.

CREATE INDEX IF NOT EXISTS transactions_branch_id_idx          ON public.transactions          (branch_id);
CREATE INDEX IF NOT EXISTS employees_branch_id_idx             ON public.employees             (branch_id);
CREATE INDEX IF NOT EXISTS products_branch_id_idx              ON public.products              (branch_id);
CREATE INDEX IF NOT EXISTS fixed_charges_branch_id_idx         ON public.fixed_charges         (branch_id);
CREATE INDEX IF NOT EXISTS fixed_charge_requests_branch_id_idx ON public.fixed_charge_requests (branch_id);
CREATE INDEX IF NOT EXISTS subscriptions_branch_id_idx         ON public.subscriptions         (branch_id);
CREATE INDEX IF NOT EXISTS subcategories_branch_id_idx         ON public.subcategories         (branch_id);
CREATE INDEX IF NOT EXISTS loan_contacts_branch_id_idx         ON public.loan_contacts         (branch_id);
CREATE INDEX IF NOT EXISTS logs_branch_id_idx                  ON public.logs                  (branch_id);

-- A few branch-scoped lookup composites that match the app's hot paths.
CREATE INDEX IF NOT EXISTS transactions_branch_date_idx
  ON public.transactions (branch_id, date DESC);

-- 6. Replace fixed_charge_requests unique key ---------------------------------
--
-- Before: UNIQUE (fixed_charge_id, due_date)
-- After:  UNIQUE (branch_id, fixed_charge_id, due_date)
--
-- fixed_charge_id is already globally unique, so the old constraint was
-- functionally sufficient. We replace it anyway because:
--   - intent is clearer (this table is branch-scoped),
--   - the resulting btree index on (branch_id, fixed_charge_id, due_date)
--     is more useful for the app's "list pending requests for the active
--     branch" query.

DO $$
DECLARE
  uq_name text;
BEGIN
  SELECT con.conname INTO uq_name
    FROM pg_constraint con
    JOIN pg_class     rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
   WHERE nsp.nspname = 'public'
     AND rel.relname = 'fixed_charge_requests'
     AND con.contype = 'u'
     AND con.conkey  = (
       SELECT array_agg(att.attnum ORDER BY att.attnum)
         FROM pg_attribute att
        WHERE att.attrelid = rel.oid
          AND att.attname IN ('fixed_charge_id', 'due_date')
     );
  IF uq_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.fixed_charge_requests DROP CONSTRAINT %I', uq_name);
  END IF;
END $$;

ALTER TABLE public.fixed_charge_requests
  ADD CONSTRAINT fixed_charge_requests_branch_fixed_charge_due_date_key
  UNIQUE (branch_id, fixed_charge_id, due_date);

-- 7. Final sanity check -------------------------------------------------------

DO $$
DECLARE
  bad_count integer;
BEGIN
  -- No transaction may link to a parent in a different branch. The
  -- composite FKs make this physically impossible going forward; this
  -- check confirms the existing data is also clean before we commit.
  SELECT count(*) INTO bad_count
    FROM public.transactions t
    LEFT JOIN public.employees             e   ON e.id   = t.employee_id              AND e.branch_id  != t.branch_id
    LEFT JOIN public.products              p   ON p.id   = t.product_id               AND p.branch_id  != t.branch_id
    LEFT JOIN public.subcategories         sc  ON sc.id  = t.subcategory_id           AND sc.branch_id != t.branch_id
    LEFT JOIN public.subscriptions         s   ON s.id   = t.subscription_id          AND s.branch_id  != t.branch_id
    LEFT JOIN public.loan_contacts         lc  ON lc.id  = t.loan_contact_id          AND lc.branch_id != t.branch_id
    LEFT JOIN public.fixed_charges         fc  ON fc.id  = t.fixed_charge_id          AND fc.branch_id != t.branch_id
    LEFT JOIN public.fixed_charge_requests fcr ON fcr.id = t.fixed_charge_request_id  AND fcr.branch_id != t.branch_id
   WHERE e.id IS NOT NULL OR p.id IS NOT NULL OR sc.id IS NOT NULL OR s.id IS NOT NULL
      OR lc.id IS NOT NULL OR fc.id IS NOT NULL OR fcr.id IS NOT NULL;

  IF bad_count > 0 THEN
    RAISE EXCEPTION 'Phase 3 sanity check failed: % transactions link across branches', bad_count;
  END IF;
END $$;

COMMIT;
