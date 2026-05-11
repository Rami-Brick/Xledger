-- Add the Investissements category infrastructure.
--
-- Mirrors the loan_contacts shape (per-branch entity with composite-FK from
-- transactions) but for tracking money the company spends on ventures with
-- the expectation of a future return. See loan_contacts in:
--   - database/2026-05-09_branches_phase3.sql (composite FK pattern)
--   - database/2026-05-09_branches_phase4.sql (RLS pattern)

BEGIN;

-- 1. investment_recipients table -------------------------------------------------

CREATE TABLE IF NOT EXISTS public.investment_recipients (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  branch_id    uuid NOT NULL REFERENCES public.branches (id),
  name         text NOT NULL,
  description  text,
  is_active    boolean NOT NULL DEFAULT true
);

-- 2. (id, branch_id) composite unique pair --------------------------------------
--
-- Required so the composite FK from transactions can target (id, branch_id).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'investment_recipients_id_branch_id_key'
  ) THEN
    ALTER TABLE public.investment_recipients
      ADD CONSTRAINT investment_recipients_id_branch_id_key UNIQUE (id, branch_id);
  END IF;
END $$;

-- 3. Index on investment_recipients.branch_id -----------------------------------

CREATE INDEX IF NOT EXISTS investment_recipients_branch_id_idx
  ON public.investment_recipients (branch_id);

-- 4. Add the investment_recipient_id column to transactions ---------------------
--
-- Must come before the partial index below: Postgres parses the index
-- predicate immediately, so the column has to exist first.

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS investment_recipient_id uuid;

CREATE INDEX IF NOT EXISTS transactions_investment_recipient_branch_idx
  ON public.transactions (branch_id, investment_recipient_id)
  WHERE investment_recipient_id IS NOT NULL;

-- 5. Composite FK from transactions ---------------------------------------------
--
-- Same restrictive ON DELETE behavior as transactions_loan_contact_branch_fk:
-- deleting a recipient that still has transactions errors out.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'transactions_investment_recipient_branch_fk'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_investment_recipient_branch_fk
      FOREIGN KEY (investment_recipient_id, branch_id)
      REFERENCES public.investment_recipients (id, branch_id);
  END IF;
END $$;

-- 6. RLS ------------------------------------------------------------------------

ALTER TABLE public.investment_recipients ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.investment_recipients TO authenticated;

DROP POLICY IF EXISTS read_investment_recipients ON public.investment_recipients;
CREATE POLICY read_investment_recipients
  ON public.investment_recipients
  FOR SELECT
  USING (public.is_branch_member(branch_id));

DROP POLICY IF EXISTS manage_write_investment_recipients ON public.investment_recipients;
CREATE POLICY manage_write_investment_recipients
  ON public.investment_recipients
  FOR INSERT
  WITH CHECK (public.can_manage() AND public.is_branch_member(branch_id));

DROP POLICY IF EXISTS manage_update_investment_recipients ON public.investment_recipients;
CREATE POLICY manage_update_investment_recipients
  ON public.investment_recipients
  FOR UPDATE
  USING (public.can_manage() AND public.is_branch_member(branch_id))
  WITH CHECK (public.can_manage() AND public.is_branch_member(branch_id));

DROP POLICY IF EXISTS manage_delete_investment_recipients ON public.investment_recipients;
CREATE POLICY manage_delete_investment_recipients
  ON public.investment_recipients
  FOR DELETE
  USING (public.can_manage() AND public.is_branch_member(branch_id));

-- 7. Audit trigger --------------------------------------------------------------
--
-- log_action() is the generic trigger from 2026-03-28_add_audit_logs.sql; it
-- reads branch_id directly from to_jsonb(NEW/OLD) so no per-table changes are
-- needed for branch-scoped logging.

DROP TRIGGER IF EXISTS log_investment_recipients ON public.investment_recipients;
CREATE TRIGGER log_investment_recipients
  AFTER INSERT OR UPDATE OR DELETE ON public.investment_recipients
  FOR EACH ROW EXECUTE FUNCTION public.log_action();

-- 8. Sanity check ---------------------------------------------------------------

DO $$
DECLARE
  actual integer;
BEGIN
  SELECT count(*) INTO actual
    FROM pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'investment_recipients';

  IF actual <> 4 THEN
    RAISE EXCEPTION
      'investment_recipients sanity check failed: found % policies, expected 4',
      actual;
  END IF;
END $$;

COMMIT;
