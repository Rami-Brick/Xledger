-- Capture can_manage() into version control.
--
-- This function already exists in production (created via the Supabase
-- console) and is used by the audit-logs RLS policy in
-- 2026-03-28_add_audit_logs.sql and by get_log_users().
--
-- We re-declare it here so:
--   1. Staging matches production.
--   2. Future migrations (Phase 4 branch-aware RLS) sit on a known baseline.
--   3. The function is hardened the same way can_edit_transactions() is:
--        STABLE, pinned search_path, explicit grants.
--
-- Behavior is unchanged: returns true when the current user is admin or mod.

CREATE OR REPLACE FUNCTION public.can_manage()
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
      AND role IN ('admin', 'mod')
  );
$$;

COMMENT ON FUNCTION public.can_manage() IS
  'Returns true when the current authenticated user is an admin or mod. Used by audit-log RLS and get_log_users().';

REVOKE ALL ON FUNCTION public.can_manage() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage() TO authenticated;
