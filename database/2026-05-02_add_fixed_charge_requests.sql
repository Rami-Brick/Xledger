-- Fixed charge recurrence + approval queue.
--
-- Design notes:
-- - Existing transactions.date remains the business/due date.
-- - Existing transactions.created_at remains the approval/entry creation timestamp.
-- - fixed_charge_requests stores the pending item before it becomes a real transaction.
-- - UI can label "skipped" as "Decline / Skip this period".

ALTER TABLE public.fixed_charges
  ADD COLUMN IF NOT EXISTS schedule_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurrence_frequency text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS recurrence_interval integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS schedule_start_date date,
  ADD COLUMN IF NOT EXISTS due_day_of_week integer,
  ADD COLUMN IF NOT EXISTS due_day_of_month integer,
  ADD COLUMN IF NOT EXISTS due_month integer,
  ADD COLUMN IF NOT EXISTS due_day_mode text NOT NULL DEFAULT 'day_of_month',
  ADD COLUMN IF NOT EXISTS generate_days_ahead integer NOT NULL DEFAULT 45;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fixed_charges_recurrence_frequency_check'
  ) THEN
    ALTER TABLE public.fixed_charges
      ADD CONSTRAINT fixed_charges_recurrence_frequency_check
      CHECK (recurrence_frequency IN ('weekly', 'monthly', 'yearly'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fixed_charges_recurrence_interval_check'
  ) THEN
    ALTER TABLE public.fixed_charges
      ADD CONSTRAINT fixed_charges_recurrence_interval_check
      CHECK (recurrence_interval >= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fixed_charges_due_day_of_week_check'
  ) THEN
    ALTER TABLE public.fixed_charges
      ADD CONSTRAINT fixed_charges_due_day_of_week_check
      CHECK (due_day_of_week IS NULL OR due_day_of_week BETWEEN 1 AND 7);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fixed_charges_due_day_of_month_check'
  ) THEN
    ALTER TABLE public.fixed_charges
      ADD CONSTRAINT fixed_charges_due_day_of_month_check
      CHECK (due_day_of_month IS NULL OR due_day_of_month BETWEEN 1 AND 31);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fixed_charges_due_month_check'
  ) THEN
    ALTER TABLE public.fixed_charges
      ADD CONSTRAINT fixed_charges_due_month_check
      CHECK (due_month IS NULL OR due_month BETWEEN 1 AND 12);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fixed_charges_due_day_mode_check'
  ) THEN
    ALTER TABLE public.fixed_charges
      ADD CONSTRAINT fixed_charges_due_day_mode_check
      CHECK (due_day_mode IN ('day_of_month', 'last_day_of_month'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fixed_charges_generate_days_ahead_check'
  ) THEN
    ALTER TABLE public.fixed_charges
      ADD CONSTRAINT fixed_charges_generate_days_ahead_check
      CHECK (generate_days_ahead BETWEEN 0 AND 730);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fixed_charges_schedule_config_check'
  ) THEN
    ALTER TABLE public.fixed_charges
      ADD CONSTRAINT fixed_charges_schedule_config_check
      CHECK (
        schedule_enabled = false
        OR (
          schedule_start_date IS NOT NULL
          AND (
            (
              recurrence_frequency = 'weekly'
              AND due_day_of_week IS NOT NULL
            )
            OR (
              recurrence_frequency = 'monthly'
              AND (
                due_day_mode = 'last_day_of_month'
                OR due_day_of_month IS NOT NULL
              )
            )
            OR (
              recurrence_frequency = 'yearly'
              AND due_month IS NOT NULL
              AND (
                due_day_mode = 'last_day_of_month'
                OR due_day_of_month IS NOT NULL
              )
            )
          )
        )
      );
  END IF;
END $$;

COMMENT ON COLUMN public.fixed_charges.schedule_enabled IS
  'When true, this fixed charge can generate pending approval requests.';
COMMENT ON COLUMN public.fixed_charges.recurrence_frequency IS
  'Recurrence unit: weekly, monthly, or yearly.';
COMMENT ON COLUMN public.fixed_charges.recurrence_interval IS
  'Every N recurrence units. Example: 3 with monthly means every 3 months.';
COMMENT ON COLUMN public.fixed_charges.schedule_start_date IS
  'First date from which request generation is allowed.';
COMMENT ON COLUMN public.fixed_charges.due_day_of_week IS
  'ISO weekday for weekly charges: 1 Monday through 7 Sunday.';
COMMENT ON COLUMN public.fixed_charges.due_day_of_month IS
  'Day of month for monthly/yearly charges. If the month is shorter, app logic should clamp to month end.';
COMMENT ON COLUMN public.fixed_charges.due_month IS
  'Month number for yearly charges: 1 January through 12 December.';
COMMENT ON COLUMN public.fixed_charges.due_day_mode IS
  'day_of_month uses due_day_of_month; last_day_of_month uses the final day of the due month.';
COMMENT ON COLUMN public.fixed_charges.generate_days_ahead IS
  'How far ahead the app should create/display pending fixed-charge requests.';

CREATE TABLE IF NOT EXISTS public.fixed_charge_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  fixed_charge_id uuid NOT NULL REFERENCES public.fixed_charges (id) ON DELETE CASCADE,
  due_date date NOT NULL,
  suggested_amount numeric NOT NULL CHECK (suggested_amount > 0),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'skipped')),
  approved_amount numeric CHECK (approved_amount IS NULL OR approved_amount > 0),
  status_changed_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  status_changed_at timestamptz,
  decision_note text,
  UNIQUE (fixed_charge_id, due_date)
);

COMMENT ON TABLE public.fixed_charge_requests IS
  'Pending recurring fixed-charge items. Approving one creates a real Charges fixes transaction.';
COMMENT ON COLUMN public.fixed_charge_requests.due_date IS
  'Business date for the charge. Approved transactions should use this value as transactions.date.';
COMMENT ON COLUMN public.fixed_charge_requests.suggested_amount IS
  'Amount proposed from fixed_charges.default_amount at generation time.';
COMMENT ON COLUMN public.fixed_charge_requests.status IS
  'pending = needs action, approved = transaction created, skipped = not paid this period.';
COMMENT ON COLUMN public.fixed_charge_requests.approved_amount IS
  'Final amount used when approving, allowing the approver to override the suggestion.';
COMMENT ON COLUMN public.fixed_charge_requests.status_changed_by IS
  'Admin/mod who approved or skipped the request.';
COMMENT ON COLUMN public.fixed_charge_requests.status_changed_at IS
  'Timestamp of approval or skip action.';
COMMENT ON COLUMN public.fixed_charge_requests.decision_note IS
  'Optional note for skipped/changed requests.';

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS fixed_charge_request_id uuid
    REFERENCES public.fixed_charge_requests (id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_fixed_charge_request_id_key'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_fixed_charge_request_id_key
      UNIQUE (fixed_charge_request_id);
  END IF;
END $$;

COMMENT ON COLUMN public.transactions.fixed_charge_request_id IS
  'Links an approved recurring fixed-charge request to the created transaction.';

CREATE INDEX IF NOT EXISTS fixed_charge_requests_status_due_date_idx
  ON public.fixed_charge_requests (status, due_date);

CREATE INDEX IF NOT EXISTS fixed_charge_requests_fixed_charge_due_date_idx
  ON public.fixed_charge_requests (fixed_charge_id, due_date);

CREATE INDEX IF NOT EXISTS transactions_fixed_charge_date_idx
  ON public.transactions (fixed_charge_id, date)
  WHERE fixed_charge_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_fixed_charge_requests_updated_at ON public.fixed_charge_requests;
CREATE TRIGGER set_fixed_charge_requests_updated_at
  BEFORE UPDATE ON public.fixed_charge_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DO $$
BEGIN
  IF to_regclass('public.logs') IS NOT NULL
     AND to_regprocedure('public.log_action()') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS log_fixed_charge_requests ON public.fixed_charge_requests;
    CREATE TRIGGER log_fixed_charge_requests
      AFTER INSERT OR UPDATE OR DELETE ON public.fixed_charge_requests
      FOR EACH ROW EXECUTE FUNCTION public.log_action();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.can_edit_transactions()
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
      AND role::text IN ('admin', 'mod')
  );
$$;

COMMENT ON FUNCTION public.can_edit_transactions() IS
  'Returns true when the current authenticated user is an admin or mod.';

REVOKE ALL ON FUNCTION public.can_edit_transactions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_edit_transactions() TO authenticated;

ALTER TABLE public.fixed_charge_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS read_fixed_charge_requests_for_admin_and_mod
  ON public.fixed_charge_requests;
CREATE POLICY read_fixed_charge_requests_for_admin_and_mod
  ON public.fixed_charge_requests
  FOR SELECT
  TO authenticated
  USING (public.can_edit_transactions());

DROP POLICY IF EXISTS insert_fixed_charge_requests_for_admin_and_mod
  ON public.fixed_charge_requests;
CREATE POLICY insert_fixed_charge_requests_for_admin_and_mod
  ON public.fixed_charge_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit_transactions());

DROP POLICY IF EXISTS update_fixed_charge_requests_for_admin_and_mod
  ON public.fixed_charge_requests;
CREATE POLICY update_fixed_charge_requests_for_admin_and_mod
  ON public.fixed_charge_requests
  FOR UPDATE
  TO authenticated
  USING (public.can_edit_transactions())
  WITH CHECK (public.can_edit_transactions());

DROP POLICY IF EXISTS delete_fixed_charge_requests_for_admin_and_mod
  ON public.fixed_charge_requests;
CREATE POLICY delete_fixed_charge_requests_for_admin_and_mod
  ON public.fixed_charge_requests
  FOR DELETE
  TO authenticated
  USING (public.can_edit_transactions());

DROP POLICY IF EXISTS insert_fixed_charge_approval_transactions_for_admin_and_mod
  ON public.transactions;
CREATE POLICY insert_fixed_charge_approval_transactions_for_admin_and_mod
  ON public.transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_edit_transactions()
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
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fixed_charge_requests TO authenticated;
