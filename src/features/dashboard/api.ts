import { supabase } from '@/lib/supabase'

export interface DashboardStats {
  totalBalance: number
  revenueThisMonth: number
  expensesThisMonth: number
  netThisMonth: number
}

export interface MonthlySummary {
  month: string
  total_revenue: number
  total_expenses: number
  net: number
}

export interface CategoryBreakdown {
  category: string
  transaction_count: number
  total_amount: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  // Total balance (all time)
  const { data: allTx, error: allErr } = await supabase
    .from('transactions')
    .select('amount')

  if (allErr) throw allErr

  const totalBalance = allTx.reduce((sum, t) => sum + Number(t.amount), 0)

  // This month's data
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  const startStr = startOfMonth.toISOString().split('T')[0]

  const { data: monthTx, error: monthErr } = await supabase
    .from('transactions')
    .select('amount')
    .gte('date', startStr)

  if (monthErr) throw monthErr

  const revenueThisMonth = monthTx
    .filter((t) => Number(t.amount) > 0)
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const expensesThisMonth = monthTx
    .filter((t) => Number(t.amount) < 0)
    .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)

  return {
    totalBalance,
    revenueThisMonth,
    expensesThisMonth,
    netThisMonth: revenueThisMonth - expensesThisMonth,
  }
}

export async function getMonthlySummary(): Promise<MonthlySummary[]> {
  const { data, error } = await supabase
    .from('monthly_summary')
    .select('*')
    .order('month', { ascending: true })
    .limit(12)

  if (error) throw error
  return (data || []).map((row) => ({
    month: row.month,
    total_revenue: Number(row.total_revenue),
    total_expenses: Number(row.total_expenses),
    net: Number(row.net),
  }))
}

export async function getCategoryBreakdown(): Promise<CategoryBreakdown[]> {
  const { data, error } = await supabase
    .from('current_month_by_category')
    .select('*')

  if (error) throw error
  return (data || []).map((row) => ({
    category: row.category,
    transaction_count: Number(row.transaction_count),
    total_amount: Number(row.total_amount),
  }))
}

export async function getRecentTransactions() {
  const { data, error } = await supabase
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
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(8)

  if (error) throw error
  return data
}