CREATE OR REPLACE FUNCTION public.can_edit_transactions()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role::text
  INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();

  RETURN user_role IN ('admin', 'mod');
END;
$$;

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS update_transactions_for_admin_and_mod ON public.transactions;
CREATE POLICY update_transactions_for_admin_and_mod
  ON public.transactions
  FOR UPDATE
  USING (public.can_edit_transactions())
  WITH CHECK (public.can_edit_transactions());

GRANT UPDATE ON public.transactions TO authenticated;
