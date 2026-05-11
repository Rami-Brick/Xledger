import { supabase } from '@/lib/supabase'

export type LogAction = 'INSERT' | 'UPDATE' | 'DELETE'

export interface AuditLog {
  id: string
  created_at: string
  branch_id: string | null
  user_id: string | null
  action: LogAction
  table_name: string
  record_id: string
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
}

export interface LogUser {
  id: string
  email: string | null
  display_name: string
  role: string | null
}

export interface LogReferenceData {
  users: Record<string, LogUser>
  employees: Record<string, string>
  fixedCharges: Record<string, string>
  products: Record<string, string>
  subcategories: Record<string, string>
  subscriptions: Record<string, string>
  loanContacts: Record<string, string>
  investmentRecipients: Record<string, string>
}

export interface FetchLogsFilters {
  branchId: string
  user_id?: string
  table_name?: string
  action?: LogAction
  date_from?: string
  date_to?: string
  offset?: number
  limit?: number
}

export async function fetchLogs(filters: FetchLogsFilters) {
  const offset = filters.offset ?? 0
  const limit = filters.limit ?? 50

  // Logs from branch-scoped tables filter by branch_id; profile changes have
  // branch_id NULL and are shown to all branches.
  let query = supabase
    .from('logs')
    .select('*')
    .or(`branch_id.eq.${filters.branchId},branch_id.is.null`)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (filters.user_id) query = query.eq('user_id', filters.user_id)
  if (filters.table_name) query = query.eq('table_name', filters.table_name)
  if (filters.action) query = query.eq('action', filters.action)
  if (filters.date_from) query = query.gte('created_at', `${filters.date_from}T00:00:00`)
  if (filters.date_to) query = query.lte('created_at', `${filters.date_to}T23:59:59.999`)

  const { data, error } = await query
  if (error) throw error

  return data as AuditLog[]
}

export async function fetchLogUsers() {
  const { data, error } = await supabase.rpc('get_log_users')
  if (error) return {}

  const users = (data || []) as LogUser[]
  return users.reduce<Record<string, LogUser>>((map, user) => {
    map[user.id] = user
    return map
  }, {})
}

export async function fetchLogReferenceData(branchId: string): Promise<LogReferenceData> {
  const [
    users,
    employeesResult,
    fixedChargesResult,
    productsResult,
    subcategoriesResult,
    subscriptionsResult,
    loanContactsResult,
    investmentRecipientsResult,
  ] = await Promise.all([
    fetchLogUsers(),
    supabase.from('employees').select('id, name').eq('branch_id', branchId),
    supabase.from('fixed_charges').select('id, name').eq('branch_id', branchId),
    supabase.from('products').select('id, name').eq('branch_id', branchId),
    supabase.from('subcategories').select('id, name').eq('branch_id', branchId),
    supabase.from('subscriptions').select('id, name').eq('branch_id', branchId),
    supabase.from('loan_contacts').select('id, name').eq('branch_id', branchId),
    supabase.from('investment_recipients').select('id, name').eq('branch_id', branchId),
  ])

  const results = [
    employeesResult,
    fixedChargesResult,
    productsResult,
    subcategoriesResult,
    subscriptionsResult,
    loanContactsResult,
    investmentRecipientsResult,
  ]

  for (const result of results) {
    if (result.error) throw result.error
  }

  const toNameMap = (rows: Array<{ id: string; name: string }> | null) =>
    (rows || []).reduce<Record<string, string>>((map, row) => {
      map[row.id] = row.name
      return map
    }, {})

  return {
    users,
    employees: toNameMap(employeesResult.data as Array<{ id: string; name: string }> | null),
    fixedCharges: toNameMap(fixedChargesResult.data as Array<{ id: string; name: string }> | null),
    products: toNameMap(productsResult.data as Array<{ id: string; name: string }> | null),
    subcategories: toNameMap(subcategoriesResult.data as Array<{ id: string; name: string }> | null),
    subscriptions: toNameMap(subscriptionsResult.data as Array<{ id: string; name: string }> | null),
    loanContacts: toNameMap(loanContactsResult.data as Array<{ id: string; name: string }> | null),
    investmentRecipients: toNameMap(investmentRecipientsResult.data as Array<{ id: string; name: string }> | null),
  }
}
