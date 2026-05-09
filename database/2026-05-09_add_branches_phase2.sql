-- Phase 2: Branch foundation (schema + backfill, NO RLS changes yet).
--
-- Goal of this migration:
--   1. Create `branches` and `branch_memberships`.
--   2. Seed Tunisia and Libya.
--   3. Give every existing auth user membership in both branches.
--   4. Add nullable `branch_id` to every business table.
--   5. Backfill all existing rows to Tunisia.
--
-- What this migration deliberately does NOT do (saved for later phases):
--   - NOT NULL constraints on branch_id (Phase 3).
--   - Composite (id, branch_id) uniqueness + composite FKs (Phase 3).
--   - Branch-scoped RLS rewrites (Phase 4).
--   - Indexes on branch_id (Phase 3, after constraints settle).
--   - Changes to log_action() and the fixed_charge_requests unique key (Phase 3/4).
--
-- Run order: apply this migration, deploy the app with branch_id columns
-- still nullable and ignored by frontend code, verify nothing regressed,
-- then proceed to Phase 3.

BEGIN;

-- 1. branches -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  country_code text NOT NULL,
  currency_code text NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);

COMMENT ON TABLE public.branches IS
  'Business branches. Each row is one operating country/legal sub-entity.';
COMMENT ON COLUMN public.branches.slug IS
  'Stable machine identifier used by the frontend (e.g. ''tunisia'', ''libya'').';
COMMENT ON COLUMN public.branches.currency_code IS
  'ISO 4217 currency code displayed for amounts in this branch.';

INSERT INTO public.branches (slug, name, country_code, currency_code)
VALUES
  ('tunisia', 'Tunisia', 'TN', 'TND'),
  ('libya',   'Libya',   'LY', 'LYD')
ON CONFLICT (slug) DO NOTHING;

-- 2. branch_memberships -------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.branch_memberships (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, branch_id)
);

COMMENT ON TABLE public.branch_memberships IS
  'Membership only. The user''s role still lives in profiles.role and applies in every branch they are a member of.';

CREATE INDEX IF NOT EXISTS branch_memberships_branch_id_idx
  ON public.branch_memberships (branch_id);

-- Give every existing user membership in both branches. This matches the
-- v1 decision: shared roles, no per-branch role, no super-admin mode.
INSERT INTO public.branch_memberships (user_id, branch_id)
SELECT u.id, b.id
FROM auth.users u
CROSS JOIN public.branches b
ON CONFLICT DO NOTHING;

-- 3. Helper: is the current user a member of the given branch? ----------------
--
-- Defined now (not Phase 4) so future migrations can reference it. RLS
-- policies are NOT modified in this migration; they will be rewritten in
-- Phase 4 to use this helper alongside the existing can_edit_transactions().

CREATE OR REPLACE FUNCTION public.is_branch_member(b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.branch_memberships m
    WHERE m.user_id = auth.uid()
      AND m.branch_id = b
  );
$$;

COMMENT ON FUNCTION public.is_branch_member(uuid) IS
  'True when the current authenticated user is a member of the given branch.';

REVOKE ALL ON FUNCTION public.is_branch_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_branch_member(uuid) TO authenticated;

-- 4. Add nullable branch_id to every business table ---------------------------
--
-- Nullable for now so production keeps working between this migration
-- and the Phase 3 NOT NULL flip. Backfill happens immediately after.

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches (id);

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches (id);

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches (id);

ALTER TABLE public.fixed_charges
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches (id);

ALTER TABLE public.fixed_charge_requests
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches (id);

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches (id);

ALTER TABLE public.subcategories
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches (id);

ALTER TABLE public.loan_contacts
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches (id);

-- logs gets a nullable branch_id permanently: profile-row changes log
-- with NULL because profiles is not branch-scoped. Phase 4 will update
-- log_action() to copy branch_id from NEW/OLD on branch-scoped tables.
ALTER TABLE public.logs
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches (id);

-- 5. Backfill all existing rows to Tunisia ------------------------------------

UPDATE public.transactions
   SET branch_id = (SELECT id FROM public.branches WHERE slug = 'tunisia')
 WHERE branch_id IS NULL;

UPDATE public.employees
   SET branch_id = (SELECT id FROM public.branches WHERE slug = 'tunisia')
 WHERE branch_id IS NULL;

UPDATE public.products
   SET branch_id = (SELECT id FROM public.branches WHERE slug = 'tunisia')
 WHERE branch_id IS NULL;

UPDATE public.fixed_charges
   SET branch_id = (SELECT id FROM public.branches WHERE slug = 'tunisia')
 WHERE branch_id IS NULL;

UPDATE public.fixed_charge_requests
   SET branch_id = (SELECT id FROM public.branches WHERE slug = 'tunisia')
 WHERE branch_id IS NULL;

UPDATE public.subscriptions
   SET branch_id = (SELECT id FROM public.branches WHERE slug = 'tunisia')
 WHERE branch_id IS NULL;

UPDATE public.subcategories
   SET branch_id = (SELECT id FROM public.branches WHERE slug = 'tunisia')
 WHERE branch_id IS NULL;

UPDATE public.loan_contacts
   SET branch_id = (SELECT id FROM public.branches WHERE slug = 'tunisia')
 WHERE branch_id IS NULL;

-- For existing log rows: backfill branch_id from the live row when the
-- referenced record still exists. Anything we cannot resolve (deleted
-- records, profile changes) stays NULL, which is fine.

UPDATE public.logs l
   SET branch_id = t.branch_id
  FROM public.transactions t
 WHERE l.branch_id IS NULL
   AND l.table_name = 'transactions'
   AND l.record_id  = t.id;

UPDATE public.logs l
   SET branch_id = e.branch_id
  FROM public.employees e
 WHERE l.branch_id IS NULL
   AND l.table_name = 'employees'
   AND l.record_id  = e.id;

UPDATE public.logs l
   SET branch_id = p.branch_id
  FROM public.products p
 WHERE l.branch_id IS NULL
   AND l.table_name = 'products'
   AND l.record_id  = p.id;

UPDATE public.logs l
   SET branch_id = fc.branch_id
  FROM public.fixed_charges fc
 WHERE l.branch_id IS NULL
   AND l.table_name = 'fixed_charges'
   AND l.record_id  = fc.id;

UPDATE public.logs l
   SET branch_id = fcr.branch_id
  FROM public.fixed_charge_requests fcr
 WHERE l.branch_id IS NULL
   AND l.table_name = 'fixed_charge_requests'
   AND l.record_id  = fcr.id;

UPDATE public.logs l
   SET branch_id = s.branch_id
  FROM public.subscriptions s
 WHERE l.branch_id IS NULL
   AND l.table_name = 'subscriptions'
   AND l.record_id  = s.id;

UPDATE public.logs l
   SET branch_id = sc.branch_id
  FROM public.subcategories sc
 WHERE l.branch_id IS NULL
   AND l.table_name = 'subcategories'
   AND l.record_id  = sc.id;

UPDATE public.logs l
   SET branch_id = lc.branch_id
  FROM public.loan_contacts lc
 WHERE l.branch_id IS NULL
   AND l.table_name = 'loan_contacts'
   AND l.record_id  = lc.id;

-- 6. Sanity checks ------------------------------------------------------------
--
-- These RAISE EXCEPTION on any branch-scoped business table that still has
-- NULL branch_id rows after backfill. If one of these fires, the whole
-- transaction rolls back and you investigate before re-running.

DO $$
DECLARE
  bad_count integer;
  tbl       text;
  scoped_tables text[] := ARRAY[
    'transactions',
    'employees',
    'products',
    'fixed_charges',
    'fixed_charge_requests',
    'subscriptions',
    'subcategories',
    'loan_contacts'
  ];
BEGIN
  FOREACH tbl IN ARRAY scoped_tables LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE branch_id IS NULL', tbl)
      INTO bad_count;
    IF bad_count > 0 THEN
      RAISE EXCEPTION 'Phase 2 backfill incomplete: % rows in %.branch_id are still NULL', bad_count, tbl;
    END IF;
  END LOOP;
END $$;

COMMIT;
