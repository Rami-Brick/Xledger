import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  MAIN_VIEW_TRANSACTIONS_FILTER,
  type Category,
} from '@/features/transactions/api'
import { getLoanBalances } from '@/features/loan-contacts/api'
import { Input } from '@/components/ui/input'
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
import { formatTND, formatWholeDinars } from '@/lib/format'
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
import { GlassPanel, PillButton } from '@/components/system-ui/primitives'
import { cn } from '@/lib/utils'

/* Identity palette for charts — matches dashboard/categories pages. */
const CHART_COLORS = ['#2D7CF6', '#D94BF4', '#38D3D3', '#FF9A18', '#D7D9DF', '#E8F21D', '#8B5CF6']

/* Category-specific colors for tag chips (reuses AddTransactionPage colors). */
const CATEGORY_COLOR: Record<string, { bg: string; fg: string }> = {
  Salaires:        { bg: '#2D7CF6', fg: '#FFFFFF' },
  'Charges fixes': { bg: '#D94BF4', fg: '#FFFFFF' },
  Fournisseurs:    { bg: '#FF9A18', fg: '#0A0B0A' },
  Transport:       { bg: '#FFC933', fg: '#0A0B0A' },
  Packaging:       { bg: '#38D3D3', fg: '#0A0B0A' },
  Sponsoring:      { bg: '#FF5DA2', fg: '#FFFFFF' },
  Subscriptions:   { bg: '#8B5CF6', fg: '#FFFFFF' },
  'Prêts':         { bg: '#F97316', fg: '#0A0B0A' },
  Divers:          { bg: '#D7D9DF', fg: '#0A0B0A' },
  Recettes:        { bg: '#B8EB3C', fg: '#0A0B0A' },
}

const REVENUE_COLOR = '#38D3D3' // cyan
const EXPENSE_COLOR = '#D94BF4' // magenta
const NET_COLOR = '#E8F21D'     // chartreuse (only shown on one chart — still scarce)

const SUBCATEGORY_CATEGORIES = new Set<Category>(['Transport', 'Packaging'])

const TOOLTIP_STYLE = {
  background: 'rgba(20,20,20,0.95)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  color: '#fff',
  fontSize: 12,
}

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

interface ExportTxRow {
  date: string
  category: string
  description: string | null
  amount: number | string
  employees: { name: string } | null
  fixed_charges: { name: string } | null
  products: { name: string } | null
  subcategories: { name: string } | null
  subscriptions: { name: string } | null
  loan_contacts: { name: string } | null
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
  return formatWholeDinars(amount)
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
    formatWholeDinars(Number(t.amount)),
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

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full min-w-0">
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 -left-40 h-[480px] w-[480px] rounded-full blur-3xl"
        style={{ background: 'rgba(154,255,90,0.10)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -bottom-40 -right-40 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{ background: 'rgba(92,214,180,0.10)' }}
      />
      <div className="relative z-10 min-w-0 space-y-5 overflow-x-hidden">{children}</div>
    </div>
  )
}

function CategoryChip({ category }: { category: string }) {
  const color = CATEGORY_COLOR[category]
  if (!color) {
    return (
      <span className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/80">
        {category}
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ backgroundColor: color.bg, color: color.fg }}
    >
      {category}
    </span>
  )
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

      const exportData: ExportTransaction[] = ((data as unknown as ExportTxRow[]) || []).map((tx) => ({
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
    <Shell>
      {/* Compact filter toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <PillButton
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
          </PillButton>
          <PillButton
            variant="ghost"
            size="sm"
            onClick={() => {
              const now = new Date()
              setStartDate(new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0])
              setEndDate(now.toISOString().split('T')[0])
            }}
          >
            Cette année
          </PillButton>
          <PillButton
            variant="ghost"
            size="sm"
            onClick={() => {
              setStartDate('2020-01-01')
              setEndDate(new Date().toISOString().split('T')[0])
            }}
          >
            Tout
          </PillButton>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            aria-label="Date de début"
            className="h-8 w-[140px] rounded-full border-white/[0.08] bg-white/[0.04] px-3 text-xs text-white [color-scheme:dark] focus-visible:border-white/30 focus-visible:ring-0"
          />
          <span className="text-xs text-white/46">—</span>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            aria-label="Date de fin"
            className="h-8 w-[140px] rounded-full border-white/[0.08] bg-white/[0.04] px-3 text-xs text-white [color-scheme:dark] focus-visible:border-white/30 focus-visible:ring-0"
          />
        </div>
        <PillButton
          variant="glass"
          size="sm"
          leadingIcon={<Download />}
          onClick={handleExportCSV}
          disabled={exporting}
        >
          {exporting ? 'Export…' : 'Exporter CSV'}
        </PillButton>
      </div>

      {/* Tab pills */}
      <nav
        aria-label="Onglets rapports"
        className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab
          return (
            <PillButton
              key={tab.key}
              variant={isActive ? 'light' : 'ghost'}
              size="sm"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => setActiveTab(tab.key)}
              className="shrink-0"
            >
              {tab.label}
            </PillButton>
          )
        })}
      </nav>

      {loading ? (
        <p className="py-8 text-center text-sm text-white/46">Chargement...</p>
      ) : (
        <>
          {activeTab === 'monthly' && (
            <div className="space-y-4">
              {chartData.length > 0 && (
                <GlassPanel className="p-4 md:p-5">
                  <div className="flex flex-col gap-4">
                    <h2 className="text-sm font-semibold text-white md:text-base">
                      Évolution mensuelle
                    </h2>
                    <div className="w-full overflow-x-auto">
                      <div className="min-w-[340px]">
                        <ResponsiveContainer width="100%" height={240}>
                          <ComposedChart data={chartData} margin={{ left: -10, right: 5 }}>
                            <CartesianGrid
                              stroke="rgba(255,255,255,0.06)"
                              strokeDasharray="3 3"
                              vertical={false}
                            />
                            <XAxis
                              dataKey="month"
                              stroke="rgba(255,255,255,0.46)"
                              fontSize={10}
                              tickLine={false}
                              axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                            />
                            <YAxis
                              stroke="rgba(255,255,255,0.46)"
                              fontSize={10}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={formatCompact}
                              width={44}
                            />
                            <Tooltip
                              formatter={(value) => formatTND(Number(value))}
                              contentStyle={TOOLTIP_STYLE}
                              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                            />
                            <Legend
                              wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.72)' }}
                              iconType="circle"
                            />
                            <Bar dataKey="Recettes" fill={REVENUE_COLOR} radius={[5, 5, 0, 0]} />
                            <Bar dataKey="Depenses" fill={EXPENSE_COLOR} radius={[5, 5, 0, 0]} />
                            <Line
                              type="monotone"
                              dataKey="Net"
                              stroke={NET_COLOR}
                              strokeWidth={2}
                              strokeDasharray="5 5"
                              dot={false}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </GlassPanel>
              )}

              <GlassPanel className="p-4 md:p-5">
                <div className="flex flex-col gap-4">
                  <h2 className="text-sm font-semibold text-white md:text-base">
                    Recettes quotidiennes
                  </h2>
                  {showDailyChart ? (
                    dailyChartData.length === 0 ? (
                      <p className="py-8 text-center text-sm text-white/46">
                        Aucune recette sur cette periode
                      </p>
                    ) : (
                      <div className="w-full overflow-x-auto">
                        <div className="min-w-[340px]">
                          <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={dailyChartData}>
                              <CartesianGrid
                                stroke="rgba(255,255,255,0.06)"
                                strokeDasharray="3 3"
                                vertical={false}
                              />
                              <XAxis
                                dataKey="date"
                                stroke="rgba(255,255,255,0.46)"
                                fontSize={10}
                                tickLine={false}
                                axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                                interval="preserveStartEnd"
                              />
                              <YAxis
                                stroke="rgba(255,255,255,0.46)"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={formatCompact}
                                width={44}
                              />
                              <Tooltip
                                formatter={(value) => formatTND(Number(value))}
                                contentStyle={TOOLTIP_STYLE}
                              />
                              <Line
                                type="monotone"
                                dataKey="amount"
                                stroke={REVENUE_COLOR}
                                strokeWidth={2}
                                dot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )
                  ) : (
                    <p className="py-4 text-sm text-white/46">
                      Ce graphique est disponible uniquement pour des periodes de 90 jours ou moins.
                    </p>
                  )}
                </div>
              </GlassPanel>

              <div className="space-y-2">
                {monthlySummary.length === 0 ? (
                  <p className="py-8 text-center text-sm text-white/46">Aucune donnee</p>
                ) : (
                  [...monthlySummary].reverse().map((row) => (
                    <GlassPanel key={row.month} className="p-3 md:p-4">
                      <p className="mb-2 text-sm font-medium text-white">
                        {formatMonthLabel(row.month)}
                      </p>
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3 sm:gap-2">
                        <MetricRow
                          label="Recettes"
                          value={formatTND(row.total_revenue)}
                          valueClass="text-[#B8EB3C]"
                        />
                        <MetricRow
                          label="Dépenses"
                          value={formatTND(row.total_expenses)}
                          valueClass="text-[#FF9A18]"
                        />
                        <MetricRow
                          label="Net"
                          value={`${row.net >= 0 ? '+' : ''}${formatTND(row.net)}`}
                          valueClass={row.net >= 0 ? 'text-[#B8EB3C]' : 'text-[#FF9A18]'}
                          topBorderOnMobile
                        />
                      </div>
                    </GlassPanel>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="space-y-4">
              <GlassPanel className="p-4 md:p-5">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-sm font-semibold text-white md:text-base">
                      Dépenses par catégorie (mois sélectionné)
                    </h2>
                    <Select value={selectedPieMonth} onValueChange={setSelectedPieMonth}>
                      <SelectTrigger className="min-w-0 w-full rounded-full border-white/[0.08] bg-white/[0.04] text-xs text-white sm:w-[200px]">
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
                  </div>

                  {pieLoading ? (
                    <p className="py-8 text-center text-sm text-white/46">Chargement...</p>
                  ) : pieChartData.length === 0 ? (
                    <p className="py-8 text-center text-sm text-white/46">
                      Pas de dépenses sur ce mois
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
                            innerRadius={56}
                            paddingAngle={3}
                            stroke="#0A0B0A"
                            strokeWidth={2}
                            labelLine={false}
                            label={false}
                          >
                            {pieChartData.map((_, index) => (
                              <Cell
                                key={index}
                                fill={CHART_COLORS[index % CHART_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => formatTND(Number(value))}
                            contentStyle={TOOLTIP_STYLE}
                          />
                        </PieChart>
                      </ResponsiveContainer>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {pieBreakdown.map((row, index) => (
                          <div
                            key={row.category}
                            className="flex min-w-0 items-center justify-between gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className="size-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                              />
                              <span className="truncate text-xs text-white/80 sm:text-sm">
                                {row.category}
                              </span>
                            </div>
                            <span className="shrink-0 text-xs font-semibold tabular-nums text-white sm:text-sm">
                              {formatTND(row.total)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </GlassPanel>

              {catChartData.length > 0 && (
                <GlassPanel className="p-4 md:p-5">
                  <div className="flex flex-col gap-4">
                    <h2 className="text-sm font-semibold text-white md:text-base">
                      Dépenses par catégorie
                    </h2>
                    <div className="w-full overflow-x-auto">
                      <div className="min-w-[280px]">
                        <ResponsiveContainer
                          width="100%"
                          height={Math.max(catChartData.length * 40, 150)}
                        >
                          <BarChart data={catChartData} layout="vertical" margin={{ left: 0, right: 5 }}>
                            <CartesianGrid
                              stroke="rgba(255,255,255,0.06)"
                              strokeDasharray="3 3"
                              horizontal={false}
                            />
                            <XAxis
                              type="number"
                              stroke="rgba(255,255,255,0.46)"
                              fontSize={10}
                              tickLine={false}
                              tickFormatter={formatCompact}
                            />
                            <YAxis
                              type="category"
                              dataKey="name"
                              stroke="rgba(255,255,255,0.46)"
                              fontSize={10}
                              tickLine={false}
                              width={80}
                            />
                            <Tooltip
                              formatter={(value) => formatTND(Number(value))}
                              contentStyle={TOOLTIP_STYLE}
                              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                            />
                            <Bar dataKey="total" fill="#8B5CF6" radius={[0, 5, 5, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </GlassPanel>
              )}

              {categoryTotals.length === 0 ? (
                <p className="py-8 text-center text-sm text-white/46">
                  Aucune dépense sur cette période
                </p>
              ) : (
                <div className="space-y-2">
                  {categoryTotals.map((row) => {
                    const subcategories = subcategoryBreakdown.get(row.category) || []
                    const canExpand = subcategories.length > 0
                    const isExpanded = expandedCategories.has(row.category)

                    return (
                      <Collapsible
                        key={row.category}
                        open={isExpanded}
                        onOpenChange={(open) => canExpand && setCategoryExpanded(row.category, open)}
                      >
                        <GlassPanel className="p-3 md:p-4">
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
                                        <ChevronDown className="size-4 shrink-0 text-white/46" />
                                      ) : (
                                        <ChevronRight className="size-4 shrink-0 text-white/46" />
                                      )}
                                      <CategoryChip category={row.category} />
                                      <span className="text-[10px] text-white/46 sm:text-xs">
                                        {row.count} tx
                                      </span>
                                    </button>
                                  </CollapsibleTrigger>
                                ) : (
                                  <>
                                    <CategoryChip category={row.category} />
                                    <span className="text-[10px] text-white/46 sm:text-xs">
                                      {row.count} tx
                                    </span>
                                  </>
                                )}
                              </div>
                              <span className="shrink-0 text-xs font-semibold tabular-nums text-[#FF9A18] sm:text-sm">
                                {formatTND(row.total)}
                              </span>
                            </div>

                            {canExpand && (
                              <CollapsibleContent>
                                <div className="space-y-1.5 border-l border-white/[0.08] pl-5">
                                  {subcategories.map((subcategory) => (
                                    <div
                                      key={`${row.category}-${subcategory.name}`}
                                      className="flex items-center justify-between gap-2"
                                    >
                                      <div className="min-w-0">
                                        <p className="truncate text-xs text-white/90 sm:text-sm">
                                          {subcategory.name}
                                        </p>
                                        <p className="text-[10px] text-white/46 sm:text-xs">
                                          {subcategory.count} tx
                                        </p>
                                      </div>
                                      <span className="shrink-0 text-xs font-medium tabular-nums text-[#FF9A18] sm:text-sm">
                                        {formatTND(subcategory.total)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </CollapsibleContent>
                            )}
                          </div>
                        </GlassPanel>
                      </Collapsible>
                    )
                  })}

                  <GlassPanel variant="raised" className="p-3 md:p-4">
                    <div className="flex items-center justify-between text-xs font-semibold sm:text-sm">
                      <span className="text-white">
                        Total ({categoryTotals.reduce((sum, row) => sum + row.count, 0)} tx)
                      </span>
                      <span className="tabular-nums text-[#FF9A18]">
                        {formatTND(categoryTotals.reduce((sum, row) => sum + row.total, 0))}
                      </span>
                    </div>
                  </GlassPanel>
                </div>
              )}
            </div>
          )}

          {activeTab === 'employees' && (
            <div className="space-y-2">
              {employeeTotals.length === 0 ? (
                <p className="py-8 text-center text-sm text-white/46">
                  Aucun paiement sur cette période
                </p>
              ) : (
                <>
                  {employeeTotals.map((row) => (
                    <GlassPanel key={row.name} className="p-3 md:p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{row.name}</p>
                          <p className="text-[10px] text-white/46 sm:text-xs">
                            {row.count} paiement{row.count !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold tabular-nums text-white sm:text-sm">
                          {formatTND(row.total_paid)}
                        </span>
                      </div>
                    </GlassPanel>
                  ))}
                  <GlassPanel variant="raised" className="p-3 md:p-4">
                    <div className="flex items-center justify-between text-xs font-semibold sm:text-sm">
                      <span className="text-white">
                        Total ({employeeTotals.reduce((sum, row) => sum + row.count, 0)})
                      </span>
                      <span className="tabular-nums text-white">
                        {formatTND(employeeTotals.reduce((sum, row) => sum + row.total_paid, 0))}
                      </span>
                    </div>
                  </GlassPanel>
                </>
              )}
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-2">
              {productTotals.length === 0 ? (
                <p className="py-8 text-center text-sm text-white/46">
                  Aucune dépense fournisseur sur cette période
                </p>
              ) : (
                <>
                  {productTotals.map((row) => (
                    <GlassPanel key={row.name} className="p-3 md:p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{row.name}</p>
                          <p className="text-[10px] text-white/46 sm:text-xs">
                            {row.count} transaction{row.count !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold tabular-nums text-[#FF9A18] sm:text-sm">
                          {formatTND(row.total)}
                        </span>
                      </div>
                    </GlassPanel>
                  ))}
                  <GlassPanel variant="raised" className="p-3 md:p-4">
                    <div className="flex items-center justify-between text-xs font-semibold sm:text-sm">
                      <span className="text-white">
                        Total ({productTotals.reduce((sum, row) => sum + row.count, 0)} tx)
                      </span>
                      <span className="tabular-nums text-[#FF9A18]">
                        {formatTND(productTotals.reduce((sum, row) => sum + row.total, 0))}
                      </span>
                    </div>
                  </GlassPanel>
                </>
              )}
            </div>
          )}

          {activeTab === 'loans' && (
            <div className="space-y-3">
              {loanSummary.length === 0 ? (
                <p className="py-8 text-center text-sm text-white/46">Aucun prêt enregistré</p>
              ) : (
                <>
                  {loanSummary.map((row) => (
                    <GlassPanel key={row.loan_contact_id} className="p-3 md:p-4">
                      <p className="mb-2 text-sm font-medium text-white">{row.name}</p>
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3 sm:gap-2">
                        <MetricRow
                          label="Reçu"
                          value={formatTND(row.total_lent)}
                          valueClass="text-[#B8EB3C]"
                        />
                        <MetricRow
                          label="Rendu"
                          value={formatTND(row.total_repaid)}
                          valueClass="text-[#FF9A18]"
                        />
                        <MetricRow
                          label="Solde"
                          value={formatTND(row.remaining)}
                          valueClass={cn(
                            row.remaining > 0
                              ? 'text-[#FF9A18]'
                              : row.remaining === 0
                                ? 'text-[#B8EB3C]'
                                : 'text-white',
                          )}
                          topBorderOnMobile
                        />
                      </div>
                    </GlassPanel>
                  ))}

                  <GlassPanel variant="raised" className="p-3 md:p-4">
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3 sm:gap-2">
                      <MetricRow
                        label="Total reçu"
                        value={formatTND(loanTotals.totalLent)}
                        valueClass="text-[#B8EB3C]"
                      />
                      <MetricRow
                        label="Total rendu"
                        value={formatTND(loanTotals.totalRepaid)}
                        valueClass="text-[#FF9A18]"
                      />
                      <MetricRow
                        label="Solde total"
                        value={formatTND(loanTotals.remaining)}
                        valueClass={cn(
                          loanTotals.remaining > 0
                            ? 'text-[#FF9A18]'
                            : loanTotals.remaining === 0
                              ? 'text-[#B8EB3C]'
                              : 'text-white',
                        )}
                        topBorderOnMobile
                      />
                    </div>
                  </GlassPanel>
                </>
              )}
            </div>
          )}
        </>
      )}
    </Shell>
  )
}

function MetricRow({
  label,
  value,
  valueClass,
  topBorderOnMobile,
}: {
  label: string
  value: string
  valueClass?: string
  topBorderOnMobile?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between sm:block',
        topBorderOnMobile && 'border-t border-white/[0.06] pt-1.5 sm:border-0 sm:pt-0',
      )}
    >
      <p className="text-[11px] text-white/46">{label}</p>
      <p
        className={cn(
          'text-xs font-semibold tabular-nums sm:mt-0.5 sm:text-sm',
          valueClass ?? 'text-white',
        )}
      >
        {value}
      </p>
    </div>
  )
}
