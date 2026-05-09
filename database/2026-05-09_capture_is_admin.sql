-- Capture is_admin() into version control.
--
-- This function already exists in production (created via the Supabase
-- console) and is used by the admin_insert_transactions,
-- admin_update_transactions, and admin_delete_transactions policies on
-- public.transactions.
--
-- Behavior is unchanged: returns true when the current user has
-- profiles.role = 'admin'.
--
-- We add the same hardening as can_edit_transactions() and can_manage():
-- STABLE, pinned search_path, explicit grants. The existing definition
-- omits these but works because PostgreSQL's defaults happen to be safe
-- enough; we set them explicitly so future migrations sit on a known
-- baseline.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS
  'Returns true when the current authenticated user has profiles.role = ''admin''. Used by transactions write policies.';

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
