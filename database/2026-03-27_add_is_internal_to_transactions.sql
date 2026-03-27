ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.transactions.is_internal IS
'Internal transaction flag. Internal loan entries stay visible in loan-specific views but are excluded from main finance views like dashboard, history, reports, and category overview totals.';
