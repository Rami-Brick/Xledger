import { supabase } from '@/lib/supabase'
import { MAIN_VIEW_TRANSACTIONS_FILTER } from '@/features/transactions/api'

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
  const { data: allTx, error: allErr } = await supabase
    .from('transactions')
    .select('amount')
    .or(MAIN_VIEW_TRANSACTIONS_FILTER)

  if (allErr) throw allErr

  const totalBalance = (allTx || []).reduce((sum, tx) => sum + Number(tx.amount), 0)

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  const startStr = startOfMonth.toISOString().split('T')[0]

  const { data: monthTx, error: monthErr } = await supabase
    .from('transactions')
    .select('amount')
    .gte('date', startStr)
    .or(MAIN_VIEW_TRANSACTIONS_FILTER)

  if (monthErr) throw monthErr

  const revenueThisMonth = (monthTx || [])
    .filter((tx) => Number(tx.amount) > 0)
    .reduce((sum, tx) => sum + Number(tx.amount), 0)

  const expensesThisMonth = (monthTx || [])
    .filter((tx) => Number(tx.amount) < 0)
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0)

  return {
    totalBalance,
    revenueThisMonth,
    expensesThisMonth,
    netThisMonth: revenueThisMonth - expensesThisMonth,
  }
}

export async function getMonthlySummary(): Promise<MonthlySummary[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('date, amount')
    .or(MAIN_VIEW_TRANSACTIONS_FILTER)
    .order('date', { ascending: true })

  if (error) throw error

  const monthMap = new Map<string, MonthlySummary>()

  for (const row of data || []) {
    const amount = Number(row.amount)
    const month = `${row.date.slice(0, 7)}-01`
    const existing = monthMap.get(month) || {
      month,
      total_revenue: 0,
      total_expenses: 0,
      net: 0,
    }

    if (amount >= 0) {
      existing.total_revenue += amount
    } else {
      existing.total_expenses += Math.abs(amount)
    }

    existing.net = existing.total_revenue - existing.total_expenses
    monthMap.set(month, existing)
  }

  return Array.from(monthMap.values()).slice(-12)
}

export async function getCategoryBreakdown(): Promise<CategoryBreakdown[]> {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  const startStr = startOfMonth.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('transactions')
    .select('category, amount')
    .gte('date', startStr)
    .lt('amount', 0)
    .or(MAIN_VIEW_TRANSACTIONS_FILTER)

  if (error) throw error

  const categoryMap = new Map<string, CategoryBreakdown>()

  for (const row of data || []) {
    const existing = categoryMap.get(row.category) || {
      category: row.category,
      transaction_count: 0,
      total_amount: 0,
    }

    existing.transaction_count += 1
    existing.total_amount += Math.abs(Number(row.amount))
    categoryMap.set(row.category, existing)
  }

  return Array.from(categoryMap.values())
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
    .or(MAIN_VIEW_TRANSACTIONS_FILTER)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(8)

  if (error) throw error
  return data
}
