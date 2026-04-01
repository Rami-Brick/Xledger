ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS salary_month date;

COMMENT ON COLUMN public.transactions.salary_month IS
'Salary period month for salary transactions. Stores the first day of the salary month, distinct from the real transaction entry/payment date.';
