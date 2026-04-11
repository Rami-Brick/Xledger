import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  MAIN_VIEW_TRANSACTIONS_FILTER,
  type Category,
} from '@/features/transactions/api'
import { getLoanBalances } from '@/features/loan-contacts/api'
import { categoryConfig } from '@/features/transactions/categories'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { formatTND } from '@/lib/format'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight, Download } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
} from 'recharts'

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#f97316', '#eab308', '#14b8a6', '#ec4899', '#6b7280']
const SUBCATEGORY_CATEGORIES = new Set<Category>(['Transport', 'Packaging'])

interface MonthlySummaryRow {
  month: string
  total_revenue: number
  total_expenses: number
  net: number
}

interface CategoryTotal {
  category: string
  total: number
  count: number
}

interface EmployeeSalaryTotal {
  name: string
  total_paid: number
  count: number
}

interface ProductExpenseTotal {
  name: string
  total: number
  count: number
}

interface ExportTransaction {
  date: string
  category: string
  description: string | null
  amount: number
  entity: string
}

interface PieBreakdownRow {
  category: string
  total: number
}

interface DailyRevenuePoint {
  date: string
  amount: number
}

interface LoanSummaryRow {
  loan_contact_id: string
  name: string
  total_lent: number
  total_repaid: number
  remaining: number
}

interface SubcategoryBreakdownRow {
  name: string
  total: number
  count: number
}

function getDefaultDateRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  return {
    start: start.toISOString().split('T')[0],
    end: now.toISOString().split('T')[0],
  }
}

function formatMonthLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const label = d.toLocaleDateString('fr-TN', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function formatMonthShort(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-TN', { month: 'short', year: '2-digit' })
}

function formatCompact(amount: number): string {
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1)}k`
  return amount.toFixed(0)
}

function formatDayLabel(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-TN', { day: '2-digit', month: '2-digit' })
}

function getMonthRange(monthValue: string) {
  const [year, month] = monthValue.split('-').map(Number)
  const lastDay = new Date(year, month, 0).getDate()
  return {
    start: `${monthValue}-01`,
    end: `${monthValue}-${String(lastDay).padStart(2, '0')}`,
  }
}

function downloadCSV(data: ExportTransaction[], filename: string) {
  const headers = ['Date', 'Categorie', 'Detail', 'Description', 'Montant (TND)']
  const rows = data.map((t) => [
    t.date,
    t.category,
    t.entity,
    t.description || '',
    t.amount.toFixed(3),
  ])
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const defaults = getDefaultDateRange()
  const [startDate, setStartDate] = useState(defaults.start)
  const [endDate, setEndDate] = useState(defaults.end)
  const [activeTab, setActiveTab] = useState<
    'monthly' | 'categories' | 'employees' | 'products' | 'loans'
  >('monthly')

  const [monthlySummary, setMonthlySummary] = useState<MonthlySummaryRow[]>([])
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([])
  const [employeeTotals, setEmployeeTotals] = useState<EmployeeSalaryTotal[]>([])
  const [productTotals, setProductTotals] = useState<ProductExpenseTotal[]>([])
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenuePoint[]>([])
  const [selectedPieMonth, setSelectedPieMonth] = useState('')
  const [pieBreakdown, setPieBreakdown] = useState<PieBreakdownRow[]>([])
  const [pieLoading, setPieLoading] = useState(false)
  const [loanSummary, setLoanSummary] = useState<LoanSummaryRow[]>([])
  const [subcategoryBreakdown, setSubcategoryBreakdown] = useState<
    Map<string, SubcategoryBreakdownRow[]>
  >(new Map())
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const daysDiff = Math.round(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000
  )
  const showDailyChart = daysDiff <= 90
  const availableMonths = monthlySummary
    .map((row) => row.month.slice(0, 7))
    .sort((a, b) => b.localeCompare(a))

  const fetchReports = useCallback(async () => {
    setLoading(true)
    try {
      const { data: monthlyData, error: monthlyError } = await supabase
        .from('transactions')
        .select('date, amount')
        .or(MAIN_VIEW_TRANSACTIONS_FILTER)
        .order('date', { ascending: true })

      if (monthlyError) throw monthlyError

      const monthMap = new Map<string, MonthlySummaryRow>()
      for (const row of monthlyData || []) {
        const month = `${row.date.slice(0, 7)}-01`
        const amount = Number(row.amount)
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

      setMonthlySummary(
        Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month))
      )

      const { data: categoryData, error: categoryError } = await supabase
        .from('transactions')
        .select('category, amount')
        .gte('date', startDate)
        .lte('date', endDate)
        .lt('amount', 0)
        .neq('category', 'Prêts')
        .or(MAIN_VIEW_TRANSACTIONS_FILTER)

      if (categoryError) throw categoryError

      const categoryMap = new Map<string, { total: number; count: number }>()
      for (const tx of categoryData || []) {
        const existing = categoryMap.get(tx.category) || { total: 0, count: 0 }
        existing.total += Math.abs(Number(tx.amount))
        existing.count += 1
        categoryMap.set(tx.category, existing)
      }

      setCategoryTotals(
        Array.from(categoryMap.entries())
          .map(([category, { total, count }]) => ({ category, total, count }))
          .sort((a, b) => b.total - a.total)
      )

      const { data: salaryData, error: salaryError } = await supabase
        .from('transactions')
        .select('amount, employees(name)')
        .eq('category', 'Salaires')
        .gte('date', startDate)
        .lte('date', endDate)
        .not('employee_id', 'is', null)
        .or(MAIN_VIEW_TRANSACTIONS_FILTER)

      if (salaryError) throw salaryError

      const employeeMap = new Map<string, { total: number; count: number }>()
      for (const tx of salaryData || []) {
        const name = (tx.employees as { name?: string } | null)?.name || 'Inconnu'
        const existing = employeeMap.get(name) || { total: 0, count: 0 }
        existing.total += Math.abs(Number(tx.amount))
        existing.count += 1
        employeeMap.set(name, existing)
      }

      setEmployeeTotals(
        Array.from(employeeMap.entries())
          .map(([name, { total, count }]) => ({ name, total_paid: total, count }))
          .sort((a, b) => b.total_paid - a.total_paid)
      )

      const { data: productData, error: productError } = await supabase
        .from('transactions')
        .select('amount, products(name)')
        .eq('category', 'Fournisseurs')
        .gte('date', startDate)
        .lte('date', endDate)
        .not('product_id', 'is', null)
        .or(MAIN_VIEW_TRANSACTIONS_FILTER)

      if (productError) throw productError

      const productMap = new Map<string, { total: number; count: number }>()
      for (const tx of productData || []) {
        const name = (tx.products as { name?: string } | null)?.name || 'Inconnu'
        const existing = productMap.get(name) || { total: 0, count: 0 }
        existing.total += Math.abs(Number(tx.amount))
        existing.count += 1
        productMap.set(name, existing)
      }

      setProductTotals(
        Array.from(productMap.entries())
          .map(([name, { total, count }]) => ({ name, total, count }))
          .sort((a, b) => b.total - a.total)
      )

      if (showDailyChart) {
        const { data: dailyData, error: dailyError } = await supabase
          .from('transactions')
          .select('date, amount')
          .gt('amount', 0)
          .neq('category', 'Prêts')
          .gte('date', startDate)
          .lte('date', endDate)
          .or(MAIN_VIEW_TRANSACTIONS_FILTER)
          .order('date', { ascending: true })

        if (dailyError) throw dailyError

        const dailyMap = new Map<string, number>()
        for (const tx of dailyData || []) {
          const key = tx.date
          dailyMap.set(key, (dailyMap.get(key) || 0) + Number(tx.amount))
        }

        setDailyRevenue(
          Array.from(dailyMap.entries()).map(([date, amount]) => ({
            date,
            amount,
          }))
        )
      } else {
        setDailyRevenue([])
      }

      const { data: subcategoryData, error: subcategoryError } = await supabase
        .from('transactions')
        .select('category, amount, subcategories(name)')
        .in('category', Array.from(SUBCATEGORY_CATEGORIES))
        .not('subcategory_id', 'is', null)
        .gte('date', startDate)
        .lte('date', endDate)
        .lt('amount', 0)
        .or(MAIN_VIEW_TRANSACTIONS_FILTER)

      if (subcategoryError) throw subcategoryError

      const nestedMap = new Map<string, Map<string, { total: number; count: number }>>()
      for (const tx of subcategoryData || []) {
        const category = tx.category
        const subcategoryName =
          (tx.subcategories as { name?: string } | null)?.name || 'Inconnu'
        const categoryMapForSubcategories =
          nestedMap.get(category) || new Map<string, { total: number; count: number }>()
        const existing = categoryMapForSubcategories.get(subcategoryName) || {
          total: 0,
          count: 0,
        }

        existing.total += Math.abs(Number(tx.amount))
        existing.count += 1
        categoryMapForSubcategories.set(subcategoryName, existing)
        nestedMap.set(category, categoryMapForSubcategories)
      }

      const nextSubcategoryBreakdown = new Map<string, SubcategoryBreakdownRow[]>()
      for (const [category, values] of nestedMap.entries()) {
        nextSubcategoryBreakdown.set(
          category,
          Array.from(values.entries())
            .map(([name, { total, count }]) => ({ name, total, count }))
            .sort((a, b) => b.total - a.total)
        )
      }

      setSubcategoryBreakdown(nextSubcategoryBreakdown)
      setExpandedCategories((current) => {
        const next = new Set<string>()
        for (const category of current) {
          if (nextSubcategoryBreakdown.has(category)) next.add(category)
        }
        return next
      })
    } catch {
      toast.error('Erreur lors du chargement des rapports')
    } finally {
      setLoading(false)
    }
  }, [endDate, showDailyChart, startDate])

  const fetchPieBreakdown = useCallback(async () => {
    if (!selectedPieMonth) {
      setPieBreakdown([])
      return
    }

    setPieLoading(true)
    try {
      const { start, end } = getMonthRange(selectedPieMonth)
      const { data, error } = await supabase
        .from('transactions')
        .select('category, amount')
        .gte('date', start)
        .lte('date', end)
        .lt('amount', 0)
        .neq('category', 'Prêts')
        .or(MAIN_VIEW_TRANSACTIONS_FILTER)

      if (error) throw error

      const breakdownMap = new Map<string, number>()
      for (const row of data || []) {
        breakdownMap.set(
          row.category,
          (breakdownMap.get(row.category) || 0) + Math.abs(Number(row.amount))
        )
      }

      setPieBreakdown(
        Array.from(breakdownMap.entries())
          .map(([category, total]) => ({ category, total }))
          .sort((a, b) => b.total - a.total)
      )
    } catch {
      toast.error('Erreur lors du chargement du graphique par categorie')
    } finally {
      setPieLoading(false)
    }
  }, [selectedPieMonth])

  const fetchLoanSummary = useCallback(async () => {
    try {
      const balances = await getLoanBalances()
      setLoanSummary(balances.sort((a, b) => Math.abs(b.remaining) - Math.abs(a.remaining)))
    } catch {
      toast.error('Erreur lors du chargement des soldes de prets')
    }
  }, [])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  useEffect(() => {
    fetchLoanSummary()
  }, [fetchLoanSummary])

  useEffect(() => {
    if (!selectedPieMonth && availableMonths.length > 0) {
      setSelectedPieMonth(availableMonths[0])
    }
  }, [availableMonths, selectedPieMonth])

  useEffect(() => {
    fetchPieBreakdown()
  }, [fetchPieBreakdown])

  const setCategoryExpanded = (category: string, open: boolean) => {
    setExpandedCategories((current) => {
      const next = new Set(current)
      if (open) {
        next.add(category)
      } else {
        next.delete(category)
      }
      return next
    })
  }

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          date, category, amount, description,
          employees(name), fixed_charges(name), products(name),
          subcategories(name), subscriptions(name), loan_contacts(name)
        `)
        .or(MAIN_VIEW_TRANSACTIONS_FILTER)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      if (error) throw error

      const exportData: ExportTransaction[] = (data || []).map((tx: any) => ({
        date: tx.date,
        category: tx.category,
        description: tx.description,
        amount: Number(tx.amount),
        entity:
          tx.employees?.name ||
          tx.fixed_charges?.name ||
          tx.products?.name ||
          tx.subcategories?.name ||
          tx.subscriptions?.name ||
          tx.loan_contacts?.name ||
          '',
      }))

      downloadCSV(exportData, `transactions_${startDate}_${endDate}.csv`)
      toast.success(`${exportData.length} transactions exportees`)
    } catch {
      toast.error("Erreur lors de l'export")
    } finally {
      setExporting(false)
    }
  }

  const chartData = monthlySummary.map((row) => ({
    month: formatMonthShort(row.month),
    Recettes: row.total_revenue,
    Depenses: row.total_expenses,
    Net: row.net,
  }))

  const catChartData = categoryTotals.map((row) => ({
    name: row.category,
    total: row.total,
  }))

  const pieChartData = pieBreakdown.map((row) => ({
    name: row.category,
    total: row.total,
  }))

  const dailyChartData = dailyRevenue.map((row) => ({
    date: formatDayLabel(row.date),
    amount: row.amount,
  }))

  const loanTotals = loanSummary.reduce(
    (acc, row) => {
      acc.totalLent += row.total_lent
      acc.totalRepaid += row.total_repaid
      acc.remaining += row.remaining
      return acc
    },
    { totalLent: 0, totalRepaid: 0, remaining: 0 }
  )

  const tabs = [
    { key: 'monthly' as const, label: 'Mensuel' },
    { key: 'categories' as const, label: 'Categories' },
    { key: 'employees' as const, label: 'Salaires' },
    { key: 'products' as const, label: 'Produits' },
    { key: 'loans' as const, label: 'Prets' },
  ]

  return (
    <div className="min-w-0 space-y-5 overflow-x-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Rapports</h2>
          <p className="mt-1 text-sm text-muted-foreground">Analyses financieres</p>
        </div>
        <Button
          onClick={handleExportCSV}
          disabled={exporting}
          variant="outline"
          size="sm"
          className="w-full gap-2 sm:w-auto"
        >
          <Download className="h-4 w-4" />
          {exporting ? 'Export...' : 'Exporter CSV'}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Debut</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fin</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const now = new Date()
                  setStartDate(
                    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
                  )
                  setEndDate(now.toISOString().split('T')[0])
                }}
              >
                Ce mois
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const now = new Date()
                  setStartDate(new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0])
                  setEndDate(now.toISOString().split('T')[0])
                }}
              >
                Cette annee
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStartDate('2020-01-01')
                  setEndDate(new Date().toISOString().split('T')[0])
                }}
              >
                Tout
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="-mx-4 flex gap-1 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`border-b-2 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors sm:px-4 sm:text-sm ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-8 text-center text-muted-foreground">Chargement...</p>
      ) : (
        <>
          {activeTab === 'monthly' && (
            <div className="space-y-4">
              {chartData.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm sm:text-base">Evolution mensuelle</CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 sm:px-6">
                    <div className="w-full overflow-x-auto">
                      <div className="min-w-[340px]">
                        <ResponsiveContainer width="100%" height={240}>
                          <ComposedChart data={chartData} margin={{ left: -10, right: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="month" fontSize={10} tickLine={false} />
                            <YAxis
                              fontSize={10}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={formatCompact}
                              width={44}
                            />
                            <Tooltip formatter={(value) => formatTND(Number(value))} />
                            <Legend />
                            <Bar dataKey="Recettes" fill="#22c55e" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="Depenses" fill="#ef4444" radius={[3, 3, 0, 0]} />
                            <Line
                              type="monotone"
                              dataKey="Net"
                              stroke="#6366f1"
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              dot={false}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm sm:text-base">Recettes quotidiennes</CardTitle>
                </CardHeader>
                <CardContent>
                  {showDailyChart ? (
                    dailyChartData.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        Aucune recette sur cette periode
                      </p>
                    ) : (
                      <div className="w-full overflow-x-auto">
                        <div className="min-w-[340px]">
                          <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={dailyChartData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis
                                dataKey="date"
                                fontSize={10}
                                tickLine={false}
                                interval="preserveStartEnd"
                              />
                              <YAxis
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={formatCompact}
                                width={44}
                              />
                              <Tooltip formatter={(value) => formatTND(Number(value))} />
                              <Line
                                type="monotone"
                                dataKey="amount"
                                stroke="#22c55e"
                                strokeWidth={2}
                                dot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )
                  ) : (
                    <p className="py-4 text-sm text-muted-foreground">
                      Ce graphique est disponible uniquement pour des periodes de 90 jours ou moins.
                    </p>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-2">
                {monthlySummary.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">Aucune donnee</p>
                ) : (
                  [...monthlySummary].reverse().map((row) => (
                    <Card key={row.month}>
                      <CardContent className="px-3 py-3 sm:px-4">
                        <p className="mb-2 text-sm font-medium">{formatMonthLabel(row.month)}</p>
                        <div className="space-y-1.5 sm:grid sm:grid-cols-3 sm:gap-2 sm:space-y-0">
                          <div className="flex items-center justify-between sm:block">
                            <p className="text-xs text-muted-foreground">Recettes</p>
                            <p className="text-xs font-semibold text-green-600 sm:text-sm">
                              {formatTND(row.total_revenue)}
                            </p>
                          </div>
                          <div className="flex items-center justify-between sm:block">
                            <p className="text-xs text-muted-foreground">Depenses</p>
                            <p className="text-xs font-semibold text-red-600 sm:text-sm">
                              {formatTND(row.total_expenses)}
                            </p>
                          </div>
                          <div className="flex items-center justify-between border-t pt-1.5 sm:block sm:border-0 sm:pt-0">
                            <p className="text-xs text-muted-foreground">Net</p>
                            <p
                              className={`text-xs font-semibold sm:text-sm ${
                                row.net >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {row.net >= 0 ? '+' : ''}
                              {formatTND(row.net)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="flex min-w-0 flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-sm sm:text-base">
                    Depenses par categorie (mois selectionne)
                  </CardTitle>
                  <Select value={selectedPieMonth} onValueChange={setSelectedPieMonth}>
                    <SelectTrigger className="min-w-0 w-full sm:w-[180px]">
                      <SelectValue placeholder="Choisir un mois" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMonths.map((month) => (
                        <SelectItem key={month} value={month}>
                          {formatMonthLabel(`${month}-01`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent>
                  {pieLoading ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">Chargement...</p>
                  ) : pieChartData.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Pas de depenses sur ce mois
                    </p>
                  ) : (
                    <div className="min-w-0 space-y-4 overflow-hidden">
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie
                            data={pieChartData}
                            dataKey="total"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            innerRadius={50}
                            paddingAngle={2}
                            labelLine={false}
                            label={false}
                          >
                            {pieChartData.map((_, index) => (
                              <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatTND(Number(value))} />
                        </PieChart>
                      </ResponsiveContainer>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {pieBreakdown.map((row, index) => (
                          <div
                            key={row.category}
                            className="flex min-w-0 items-center justify-between gap-2 rounded-md border px-2 py-1.5"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                              />
                              <span className="truncate text-xs sm:text-sm">{row.category}</span>
                            </div>
                            <span className="shrink-0 text-xs font-medium sm:text-sm">
                              {formatTND(row.total)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {catChartData.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm sm:text-base">Depenses par categorie</CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 sm:px-6">
                    <div className="w-full overflow-x-auto">
                      <div className="min-w-[280px]">
                        <ResponsiveContainer
                          width="100%"
                          height={Math.max(catChartData.length * 40, 150)}
                        >
                          <BarChart data={catChartData} layout="vertical" margin={{ left: 0, right: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis
                              type="number"
                              fontSize={10}
                              tickLine={false}
                              tickFormatter={formatCompact}
                            />
                            <YAxis
                              type="category"
                              dataKey="name"
                              fontSize={10}
                              tickLine={false}
                              width={80}
                            />
                            <Tooltip formatter={(value) => formatTND(Number(value))} />
                            <Bar dataKey="total" fill="#6366f1" radius={[0, 3, 3, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {categoryTotals.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  Aucune depense sur cette periode
                </p>
              ) : (
                <div className="space-y-2">
                  {categoryTotals.map((row) => {
                    const config = categoryConfig[row.category as Category]
                    const subcategories = subcategoryBreakdown.get(row.category) || []
                    const canExpand = subcategories.length > 0
                    const isExpanded = expandedCategories.has(row.category)

                    return (
                      <Collapsible
                        key={row.category}
                        open={isExpanded}
                        onOpenChange={(open) => canExpand && setCategoryExpanded(row.category, open)}
                      >
                        <Card>
                          <CardContent className="px-3 py-3 sm:px-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-2">
                                  {canExpand ? (
                                    <CollapsibleTrigger asChild>
                                      <button
                                        type="button"
                                        className="flex min-w-0 items-center gap-2 text-left"
                                      >
                                        {isExpanded ? (
                                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        )}
                                        <Badge
                                          variant="outline"
                                          className={`shrink-0 border text-[10px] ${
                                            config ? `${config.color} ${config.textColor}` : ''
                                          }`}
                                        >
                                          {row.category}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground sm:text-xs">
                                          {row.count} tx
                                        </span>
                                      </button>
                                    </CollapsibleTrigger>
                                  ) : (
                                    <>
                                      <Badge
                                        variant="outline"
                                        className={`shrink-0 border text-[10px] ${
                                          config ? `${config.color} ${config.textColor}` : ''
                                        }`}
                                      >
                                        {row.category}
                                      </Badge>
                                      <span className="text-[10px] text-muted-foreground sm:text-xs">
                                        {row.count} tx
                                      </span>
                                    </>
                                  )}
                                </div>
                                <span className="shrink-0 text-xs font-semibold text-red-600 sm:text-sm">
                                  {formatTND(row.total)}
                                </span>
                              </div>

                              {canExpand && (
                                <CollapsibleContent>
                                  <div className="space-y-1.5 border-l border-border/70 pl-5">
                                    {subcategories.map((subcategory) => (
                                      <div
                                        key={`${row.category}-${subcategory.name}`}
                                        className="flex items-center justify-between gap-2"
                                      >
                                        <div className="min-w-0">
                                          <p className="truncate text-xs sm:text-sm">
                                            {subcategory.name}
                                          </p>
                                          <p className="text-[10px] text-muted-foreground sm:text-xs">
                                            {subcategory.count} tx
                                          </p>
                                        </div>
                                        <span className="shrink-0 text-xs font-medium text-red-600 sm:text-sm">
                                          {formatTND(subcategory.total)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </CollapsibleContent>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </Collapsible>
                    )
                  })}

                  <Card className="bg-muted/50">
                    <CardContent className="px-3 py-3 sm:px-4">
                      <div className="flex items-center justify-between text-xs font-semibold sm:text-sm">
                        <span>Total ({categoryTotals.reduce((sum, row) => sum + row.count, 0)} tx)</span>
                        <span className="text-red-600">
                          {formatTND(categoryTotals.reduce((sum, row) => sum + row.total, 0))}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {activeTab === 'employees' && (
            <div className="space-y-2">
              {employeeTotals.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  Aucun paiement sur cette periode
                </p>
              ) : (
                <>
                  {employeeTotals.map((row) => (
                    <Card key={row.name}>
                      <CardContent className="px-3 py-3 sm:px-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{row.name}</p>
                            <p className="text-[10px] text-muted-foreground sm:text-xs">
                              {row.count} paiement{row.count !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs font-semibold sm:text-sm">
                            {formatTND(row.total_paid)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <Card className="bg-muted/50">
                    <CardContent className="px-3 py-3 sm:px-4">
                      <div className="flex items-center justify-between text-xs font-semibold sm:text-sm">
                        <span>Total ({employeeTotals.reduce((sum, row) => sum + row.count, 0)})</span>
                        <span>
                          {formatTND(employeeTotals.reduce((sum, row) => sum + row.total_paid, 0))}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-2">
              {productTotals.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  Aucune depense fournisseur sur cette periode
                </p>
              ) : (
                <>
                  {productTotals.map((row) => (
                    <Card key={row.name}>
                      <CardContent className="px-3 py-3 sm:px-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{row.name}</p>
                            <p className="text-[10px] text-muted-foreground sm:text-xs">
                              {row.count} transaction{row.count !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs font-semibold text-red-600 sm:text-sm">
                            {formatTND(row.total)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <Card className="bg-muted/50">
                    <CardContent className="px-3 py-3 sm:px-4">
                      <div className="flex items-center justify-between text-xs font-semibold sm:text-sm">
                        <span>Total ({productTotals.reduce((sum, row) => sum + row.count, 0)} tx)</span>
                        <span className="text-red-600">
                          {formatTND(productTotals.reduce((sum, row) => sum + row.total, 0))}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {activeTab === 'loans' && (
            <div className="space-y-3">
              {loanSummary.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">Aucun pret enregistre</p>
              ) : (
                <>
                  {loanSummary.map((row) => (
                    <Card key={row.loan_contact_id}>
                      <CardContent className="px-3 py-3 sm:px-4">
                        <p className="mb-2 text-sm font-medium">{row.name}</p>
                        <div className="space-y-1.5 sm:grid sm:grid-cols-3 sm:gap-2 sm:space-y-0">
                          <div className="flex items-center justify-between sm:block">
                            <p className="text-xs text-muted-foreground">Recu</p>
                            <p className="text-xs font-semibold text-green-600 sm:text-sm">
                              {formatTND(row.total_lent)}
                            </p>
                          </div>
                          <div className="flex items-center justify-between sm:block">
                            <p className="text-xs text-muted-foreground">Rendu</p>
                            <p className="text-xs font-semibold text-red-600 sm:text-sm">
                              {formatTND(row.total_repaid)}
                            </p>
                          </div>
                          <div className="flex items-center justify-between border-t pt-1.5 sm:block sm:border-0 sm:pt-0">
                            <p className="text-xs text-muted-foreground">Solde</p>
                            <p
                              className={`text-xs font-semibold sm:text-sm ${
                                row.remaining > 0
                                  ? 'text-orange-600'
                                  : row.remaining === 0
                                    ? 'text-green-600'
                                    : 'text-red-600'
                              }`}
                            >
                              {formatTND(row.remaining)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <Card className="bg-muted/50">
                    <CardContent className="px-3 py-3 sm:px-4">
                      <div className="space-y-1.5 sm:grid sm:grid-cols-3 sm:gap-2 sm:space-y-0">
                        <div className="flex items-center justify-between sm:block">
                          <p className="text-xs text-muted-foreground">Total recu</p>
                          <p className="text-xs font-semibold text-green-600 sm:text-sm">
                            {formatTND(loanTotals.totalLent)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between sm:block">
                          <p className="text-xs text-muted-foreground">Total rendu</p>
                          <p className="text-xs font-semibold text-red-600 sm:text-sm">
                            {formatTND(loanTotals.totalRepaid)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between border-t pt-1.5 sm:block sm:border-0 sm:pt-0">
                          <p className="text-xs text-muted-foreground">Solde total</p>
                          <p
                            className={`text-xs font-semibold sm:text-sm ${
                              loanTotals.remaining > 0
                                ? 'text-orange-600'
                                : loanTotals.remaining === 0
                                  ? 'text-green-600'
                                  : 'text-red-600'
                            }`}
                          >
                            {formatTND(loanTotals.remaining)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
