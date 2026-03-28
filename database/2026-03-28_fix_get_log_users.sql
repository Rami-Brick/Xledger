CREATE OR REPLACE FUNCTION public.get_log_users()
RETURNS TABLE (
  id uuid,
  email text,
  display_name text,
  role text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT can_manage() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    profiles.id,
    users.email::text,
    COALESCE(
      NULLIF(initcap(split_part(COALESCE(users.email::text, ''), '@', 1)), ''),
      users.email::text,
      'Utilisateur inconnu'
    )::text AS display_name,
    profiles.role::text
  FROM public.profiles AS profiles
  LEFT JOIN auth.users AS users
    ON users.id = profiles.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_log_users() TO authenticated;
