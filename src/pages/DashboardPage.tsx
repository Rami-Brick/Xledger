import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getDashboardStats,
  getMonthlySummary,
  getCategoryBreakdown,
  getRecentTransactions,
  type DashboardStats,
  type MonthlySummary,
  type CategoryBreakdown,
} from '@/features/dashboard/api'
import { categoryConfig } from '@/features/transactions/categories'
import type { Category } from '@/features/transactions/api'
import { formatTND, formatDate } from '@/lib/format'
import { toast } from 'sonner'
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const PIE_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  'var(--color-chart-6)',
  'var(--color-chart-7)',
  'var(--color-muted-foreground)',
]

interface RecentTx {
  id: string
  date: string
  category: Category
  amount: number
  description: string | null
  employees: { name: string } | null
  fixed_charges: { name: string } | null
  products: { name: string } | null
  subcategories: { name: string } | null
  subscriptions: { name: string } | null
  loan_contacts: { name: string } | null
}

function getEntityName(tx: RecentTx): string {
  if (tx.employees) return tx.employees.name
  if (tx.fixed_charges) return tx.fixed_charges.name
  if (tx.products) return tx.products.name
  if (tx.subcategories) return tx.subcategories.name
  if (tx.subscriptions) return tx.subscriptions.name
  if (tx.loan_contacts) return tx.loan_contacts.name
  return tx.description || ''
}

function formatMonthLabel(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-TN', { month: 'short', year: '2-digit' })
}

function currentMonthLabel(): string {
  return new Date().toLocaleDateString('fr-TN', { month: 'long', year: 'numeric' })
}

const tooltipContentStyle: React.CSSProperties = {
  background: 'var(--color-popover)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  fontSize: '12px',
  color: 'var(--color-popover-foreground)',
  boxShadow: '0 10px 30px -12px oklch(0 0 0 / 0.25)',
  backdropFilter: 'blur(10px) saturate(1.1)',
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 max-w-[1400px]">
      <div className="space-y-2">
        <div className="h-7 w-56 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded-lg bg-muted/70" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-2 h-24 animate-pulse rounded-2xl bg-muted" />
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="h-[380px] lg:col-span-2 animate-pulse rounded-2xl bg-muted" />
        <div className="h-[380px] animate-pulse rounded-2xl bg-muted" />
      </div>
      <div className="h-80 animate-pulse rounded-2xl bg-muted" />
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [monthly, setMonthly] = useState<MonthlySummary[]>([])
  const [breakdown, setBreakdown] = useState<CategoryBreakdown[]>([])
  const [recent, setRecent] = useState<RecentTx[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [s, m, b, r] = await Promise.all([
          getDashboardStats(),
          getMonthlySummary(),
          getCategoryBreakdown(),
          getRecentTransactions(),
        ])
        setStats(s)
        setMonthly(m)
        setBreakdown(b)
        setRecent(r as RecentTx[])
      } catch {
        toast.error('Erreur lors du chargement du tableau de bord')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <DashboardSkeleton />
  if (!stats) return null

  const chartData = monthly.map((m) => ({
    month: formatMonthLabel(m.month),
    Recettes: m.total_revenue,
    Dépenses: m.total_expenses,
  }))

  const pieData = breakdown.filter((b) => b.category !== 'Prêts')
  const pieTotal = pieData.reduce((sum, item) => sum + item.total_amount, 0)

  const balanceIsPositive = stats.totalBalance >= 0
  const netIsPositive = stats.netThisMonth >= 0

  return (
    <div className="space-y-6 sm:space-y-8 max-w-[1400px] min-w-0">
      {/* Page header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-[22px] sm:text-[28px] font-semibold tracking-tight leading-tight">
            Tableau de bord
          </h2>
          <p className="mt-1 text-[13px] sm:text-sm text-muted-foreground">
            Vue d'ensemble financière · <span className="capitalize">{currentMonthLabel()}</span>
          </p>
        </div>
        {/* reserved slot for future period filter / quick actions */}
        <div className="flex items-center gap-2" />
      </div>

      {/* KPI row — Crextio-compact: hero + 3 supporting on one row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Hero: Solde total */}
        <div className="premium-surface-hero lg:col-span-2 rounded-2xl px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Wallet className="h-4 w-4" style={{ color: 'var(--color-brand-accent)' }} />
              <span className="text-xs font-medium">Solde total</span>
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                balanceIsPositive
                  ? 'bg-success-soft text-success'
                  : 'bg-warning-soft text-destructive'
              }`}
            >
              {balanceIsPositive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {balanceIsPositive ? 'Positif' : 'Négatif'}
            </span>
          </div>
          <p className="mt-2 text-[28px] font-semibold tracking-tight tabular-nums text-foreground">
            {formatTND(stats.totalBalance)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Solde net cumulé</p>
        </div>

        {/* Recettes ce mois */}
        <div className="premium-surface surface-tint-success rounded-2xl px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <ArrowUpRight className="h-4 w-4" />
              <span className="text-xs font-medium">Recettes ce mois</span>
            </div>
            <span className="inline-flex items-center rounded-full bg-success-soft px-1.5 py-0.5 text-success">
              <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
          <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums text-foreground">
            {formatTND(stats.revenueThisMonth)}
          </p>
        </div>

        {/* Dépenses ce mois */}
        <div className="premium-surface surface-tint-rose rounded-2xl px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <ArrowDownRight className="h-4 w-4" />
              <span className="text-xs font-medium">Dépenses ce mois</span>
            </div>
            <span className="inline-flex items-center rounded-full bg-warning-soft px-1.5 py-0.5 text-destructive">
              <ArrowDownRight className="h-3 w-3" />
            </span>
          </div>
          <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums text-foreground">
            {formatTND(stats.expensesThisMonth)}
          </p>
        </div>

        {/* Net ce mois */}
        <div className="premium-surface surface-tint-violet rounded-2xl px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-muted-foreground">
              <Scale className="h-4 w-4" />
              <span className="text-xs font-medium">Net ce mois</span>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-1.5 py-0.5 ${
                netIsPositive
                  ? 'bg-success-soft text-success'
                  : 'bg-warning-soft text-destructive'
              }`}
            >
              {netIsPositive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
            </span>
          </div>
          <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums text-foreground">
            {netIsPositive ? '+' : ''}
            {formatTND(stats.netThisMonth)}
          </p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly trend */}
        <div className="premium-surface surface-tint-teal lg:col-span-2 rounded-2xl p-6">
          <div className="mb-4">
            <SectionLabel>Tendance mensuelle</SectionLabel>
            <h3 className="mt-1 text-base font-semibold text-foreground">
              Recettes vs Dépenses
            </h3>
          </div>
          {chartData.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Pas encore de données mensuelles
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--color-border)"
                />
                <XAxis
                  dataKey="month"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  stroke="var(--color-muted-foreground)"
                />
                <YAxis
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  stroke="var(--color-muted-foreground)"
                />
                <Tooltip
                  formatter={(value) => formatTND(Number(value))}
                  contentStyle={tooltipContentStyle}
                  cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }}
                />
                <Bar
                  dataKey="Recettes"
                  fill="var(--color-success)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="Dépenses"
                  fill="var(--color-destructive)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category breakdown */}
        <div className="premium-surface surface-tint-violet rounded-2xl p-6">
          <div className="mb-4">
            <SectionLabel>Ce mois</SectionLabel>
            <h3 className="mt-1 text-base font-semibold text-foreground">
              Dépenses par catégorie
            </h3>
          </div>
          {pieData.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Pas de dépenses ce mois
            </p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="total_amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    innerRadius={60}
                    paddingAngle={4}
                    stroke="transparent"
                    strokeWidth={0}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatTND(Number(value))}
                    contentStyle={tooltipContentStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5">
                {pieData.map((item, i) => {
                  const pct = pieTotal > 0 ? (item.total_amount / pieTotal) * 100 : 0
                  return (
                    <div key={item.category} className="flex items-center gap-2 text-xs">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="flex-1 truncate text-foreground">{item.category}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="premium-surface surface-tint-gold rounded-2xl p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <SectionLabel>Activité récente</SectionLabel>
            <h3 className="mt-1 text-base font-semibold text-foreground">
              Transactions récentes
            </h3>
          </div>
          <Link
            to="/historique"
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Tout voir →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucune transaction pour le moment
          </p>
        ) : (
          <div className="space-y-1">
            {recent.map((tx) => {
              const config = categoryConfig[tx.category]
              const Icon = config.icon
              const entityName = getEntityName(tx)
              const isPositive = tx.amount >= 0
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-4 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60"
                >
                  <div
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${config.color}`}
                  >
                    <Icon className={`h-4 w-4 ${config.textColor}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {entityName || tx.category}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDate(tx.date)} · {tx.category}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-sm font-semibold tabular-nums ${
                      isPositive ? 'text-success' : 'text-destructive'
                    }`}
                  >
                    {isPositive ? '+' : ''}
                    {formatTND(tx.amount)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
