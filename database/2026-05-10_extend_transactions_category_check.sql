-- Extend transactions.category CHECK to allow 'Investissements'.
--
-- The base transactions table was created in the Supabase console (predates
-- version-controlled migrations) with a CHECK constraint restricting category
-- to the original 10 values. Adding the new category in app code is not
-- enough — the database rejects inserts with:
--   23514 new row for relation "transactions" violates check constraint
--   "transactions_category_check"
--
-- This migration drops whatever the existing constraint is (we discover its
-- name dynamically since it isn't in version control) and recreates it with
-- the full 11-value list. Idempotent and safe to re-run.

BEGIN;

DO $$
DECLARE
  existing_name text;
BEGIN
  SELECT con.conname INTO existing_name
    FROM pg_constraint con
    JOIN pg_class       rel ON rel.oid = con.conrelid
    JOIN pg_namespace   nsp ON nsp.oid = rel.relnamespace
    JOIN pg_attribute   att ON att.attrelid = rel.oid
                            AND att.attnum = ANY (con.conkey)
   WHERE nsp.nspname = 'public'
     AND rel.relname = 'transactions'
     AND con.contype = 'c'
     AND att.attname = 'category';

  IF existing_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.transactions DROP CONSTRAINT %I', existing_name);
  END IF;
END $$;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_category_check
  CHECK (category IN (
    'Salaires',
    'Charges fixes',
    'Fournisseurs',
    'Transport',
    'Packaging',
    'Sponsoring',
    'Subscriptions',
    'Prêts',
    'Investissements',
    'Divers',
    'Recettes'
  ));

COMMIT;
