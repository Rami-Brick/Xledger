CREATE TABLE IF NOT EXISTS public.logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  old_data jsonb,
  new_data jsonb
);

CREATE OR REPLACE FUNCTION public.log_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.logs (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (auth.uid(), 'INSERT', TG_TABLE_NAME, NEW.id, NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.logs (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (auth.uid(), 'UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.logs (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (auth.uid(), 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS log_transactions ON public.transactions;
CREATE TRIGGER log_transactions
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.log_action();

DROP TRIGGER IF EXISTS log_employees ON public.employees;
CREATE TRIGGER log_employees
  AFTER INSERT OR UPDATE OR DELETE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.log_action();

DROP TRIGGER IF EXISTS log_fixed_charges ON public.fixed_charges;
CREATE TRIGGER log_fixed_charges
  AFTER INSERT OR UPDATE OR DELETE ON public.fixed_charges
  FOR EACH ROW EXECUTE FUNCTION public.log_action();

DROP TRIGGER IF EXISTS log_products ON public.products;
CREATE TRIGGER log_products
  AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.log_action();

DROP TRIGGER IF EXISTS log_subcategories ON public.subcategories;
CREATE TRIGGER log_subcategories
  AFTER INSERT OR UPDATE OR DELETE ON public.subcategories
  FOR EACH ROW EXECUTE FUNCTION public.log_action();

DROP TRIGGER IF EXISTS log_subscriptions ON public.subscriptions;
CREATE TRIGGER log_subscriptions
  AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.log_action();

DROP TRIGGER IF EXISTS log_loan_contacts ON public.loan_contacts;
CREATE TRIGGER log_loan_contacts
  AFTER INSERT OR UPDATE OR DELETE ON public.loan_contacts
  FOR EACH ROW EXECUTE FUNCTION public.log_action();

DROP TRIGGER IF EXISTS log_profiles ON public.profiles;
CREATE TRIGGER log_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_action();

ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS read_logs ON public.logs;
CREATE POLICY read_logs
  ON public.logs FOR SELECT
  USING (can_manage());

GRANT SELECT ON public.logs TO authenticated;

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
    RAISE EXCEPTION 'not allowed';
  END IF;

  RETURN QUERY
  SELECT
    profiles.id,
    users.email,
    COALESCE(NULLIF(initcap(split_part(users.email, '@', 1)), ''), users.email, 'Utilisateur inconnu') AS display_name,
    profiles.role::text
  FROM public.profiles AS profiles
  LEFT JOIN auth.users AS users
    ON users.id = profiles.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_log_users() TO authenticated;
