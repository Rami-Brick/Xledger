import { supabase } from '@/lib/supabase'

export const CATEGORIES = [
  'Salaires',
  'Charges fixes',
  'Fournisseurs',
  'Transport',
  'Packaging',
  'Sponsoring',
  'Subscriptions',
  'Prêts',
  'Divers',
  'Recettes',
] as const

export type Category = (typeof CATEGORIES)[number]
export const MAIN_VIEW_TRANSACTIONS_FILTER = 'is_internal.is.null,is_internal.eq.false'

export interface Transaction {
  id: string
  created_at: string
  branch_id: string
  date: string
  salary_month: string | null
  category: Category
  amount: number
  description: string | null
  is_internal: boolean
  employee_id: string | null
  fixed_charge_id: string | null
  product_id: string | null
  subcategory_id: string | null
  subscription_id: string | null
  loan_contact_id: string | null
  fixed_charge_request_id: string | null
}

export interface TransactionInsert {
  branch_id: string
  date: string
  salary_month?: string | null
  category: Category
  amount: number
  description?: string | null
  is_internal?: boolean
  employee_id?: string | null
  fixed_charge_id?: string | null
  product_id?: string | null
  subcategory_id?: string | null
  subscription_id?: string | null
  loan_contact_id?: string | null
  fixed_charge_request_id?: string | null
}

export interface DeleteTransactionResult {
  reopenedFixedChargeRequest: boolean
}

export async function createTransaction(transaction: TransactionInsert) {
  const { data, error } = await supabase
    .from('transactions')
    .insert(transaction)
    .select()
    .single()

  if (error) throw error
  return data as Transaction
}

export interface GetTransactionsFilters {
  branchId: string
  category?: Category
  startDate?: string
  endDate?: string
  search?: string
  limit?: number
  includeInternal?: boolean
}

export async function getTransactions(filters: GetTransactionsFilters) {
  let query = supabase
    .from('transactions')
    .select(`
      *,
      employees(name),
      fixed_charges(name),
      products(name),
      subcategories(name),
      subscriptions(name),
      loan_contacts(name)
    `)
    .eq('branch_id', filters.branchId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (!filters.includeInternal) query = query.or(MAIN_VIEW_TRANSACTIONS_FILTER)
  if (filters.category) query = query.eq('category', filters.category)
  if (filters.startDate) query = query.gte('date', filters.startDate)
  if (filters.endDate) query = query.lte('date', filters.endDate)
  if (filters.search) query = query.ilike('description', `%${filters.search}%`)
  if (filters.limit) query = query.limit(filters.limit)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function updateTransaction(id: string, updates: Partial<TransactionInsert>) {
  const { data, error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Transaction
}

async function reopenFixedChargeRequest(requestId: string) {
  const { error } = await supabase
    .from('fixed_charge_requests')
    .update({
      status: 'pending',
      approved_amount: null,
      status_changed_by: null,
      status_changed_at: null,
      decision_note: null,
    })
    .eq('id', requestId)
    .eq('status', 'approved')

  if (error) throw error
}

export async function deleteTransaction(id: string): Promise<DeleteTransactionResult> {
  const { data: transaction, error: fetchError } = await supabase
    .from('transactions')
    .select('fixed_charge_request_id')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) throw fetchError

  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw error

  if (transaction?.fixed_charge_request_id) {
    await reopenFixedChargeRequest(transaction.fixed_charge_request_id)
    return { reopenedFixedChargeRequest: true }
  }

  return { reopenedFixedChargeRequest: false }
}

export async function getEmployeeSalaryStatus(branchId: string) {
  const { data, error } = await supabase
    .from('employee_salary_status')
    .select('*')
    .eq('branch_id', branchId)
  if (error) throw error
  return data
}
