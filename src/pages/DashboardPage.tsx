import { useEffect, useState } from 'react'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatTND, formatDate } from '@/lib/format'
import { toast } from 'sonner'
import {
  TrendingUp,
  TrendingDown,
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
  Legend,
} from 'recharts'

const PIE_COLORS = [
  '#3b82f6', '#8b5cf6', '#f97316', '#eab308',
  '#14b8a6', '#ec4899', '#6b7280',
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
}

function getEntityName(tx: RecentTx): string {
  if (tx.employees) return tx.employees.name
  if (tx.fixed_charges) return tx.fixed_charges.name
  if (tx.products) return tx.products.name
  if (tx.subcategories) return tx.subcategories.name
  return tx.description || ''
}

function formatMonthLabel(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-TN', { month: 'short', year: '2-digit' })
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

  if (loading) {
    return <p className="text-muted-foreground">Chargement du tableau de bord...</p>
  }

  if (!stats) return null

  const chartData = monthly.map((m) => ({
    month: formatMonthLabel(m.month),
    Recettes: m.total_revenue,
    Dépenses: m.total_expenses,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Tableau de bord</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Vue d'ensemble financière
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Solde total</p>
                <p className={`text-2xl font-bold mt-1 ${stats.totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatTND(stats.totalBalance)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-muted">
                <Wallet className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recettes ce mois</p>
                <p className="text-2xl font-bold mt-1 text-green-600">
                  {formatTND(stats.revenueThisMonth)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-50">
                <ArrowUpRight className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Dépenses ce mois</p>
                <p className="text-2xl font-bold mt-1 text-red-600">
                  {formatTND(stats.expensesThisMonth)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-red-50">
                <ArrowDownRight className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net ce mois</p>
                <p className={`text-2xl font-bold mt-1 ${stats.netThisMonth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.netThisMonth >= 0 ? '+' : ''}{formatTND(stats.netThisMonth)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-muted">
                <Scale className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend - Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recettes vs Dépenses</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Pas encore de données mensuelles
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" fontSize={12} tickLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(value) => formatTND(Number(value))}
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                  <Bar dataKey="Recettes" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Dépenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dépenses par catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            {breakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Pas de dépenses ce mois
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={breakdown}
                    dataKey="total_amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={50}
                    paddingAngle={2}
                    label={(props: { name?: string; percent?: number }) =>
                      `${props.name || ''} ${((props.percent || 0) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                    fontSize={11}
                  >
                    {breakdown.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatTND(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transactions récentes</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune transaction pour le moment
            </p>
          ) : (
            <div className="space-y-3">
              {recent.map((tx) => {
                const config = categoryConfig[tx.category]
                const Icon = config.icon
                const entityName = getEntityName(tx)
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-md ${config.color}`}>
                        <Icon className={`h-4 w-4 ${config.textColor}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {entityName || tx.category}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(tx.date)} · {tx.category}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-sm font-semibold ${
                        tx.amount >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {tx.amount >= 0 ? '+' : ''}
                      {formatTND(tx.amount)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}