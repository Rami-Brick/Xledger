-- Reopen an approved fixed-charge request when its generated transaction is deleted.
--
-- Without this, deleting the ledger transaction leaves fixed_charge_requests.status
-- as approved, so the bell will not show the charge again even though the expense
-- no longer exists in transactions.

CREATE OR REPLACE FUNCTION public.reopen_fixed_charge_request_on_transaction_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.fixed_charge_request_id IS NOT NULL THEN
    UPDATE public.fixed_charge_requests
    SET
      status = 'pending',
      approved_amount = NULL,
      status_changed_by = NULL,
      status_changed_at = NULL,
      decision_note = NULL
    WHERE id = OLD.fixed_charge_request_id
      AND status = 'approved';
  END IF;

  RETURN OLD;
END;
$$;

COMMENT ON FUNCTION public.reopen_fixed_charge_request_on_transaction_delete() IS
  'Resets an approved fixed-charge request to pending when its linked transaction is deleted.';

REVOKE ALL ON FUNCTION public.reopen_fixed_charge_request_on_transaction_delete() FROM PUBLIC;

DROP TRIGGER IF EXISTS reopen_fixed_charge_request_after_transaction_delete
  ON public.transactions;

CREATE TRIGGER reopen_fixed_charge_request_after_transaction_delete
  AFTER DELETE ON public.transactions
  FOR EACH ROW
  WHEN (OLD.fixed_charge_request_id IS NOT NULL)
  EXECUTE FUNCTION public.reopen_fixed_charge_request_on_transaction_delete();
