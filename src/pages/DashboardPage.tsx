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
import { formatTND, formatDate } from '@/lib/format'
import { toast } from 'sonner'
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
import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useRole } from '@/lib/RoleProvider'
import {
  GlassPanel,
  PillStat,
  AvatarCircle,
  type Segment,
  type SegmentColor,
} from '@/components/system-ui/primitives'
import {
  PanelHeader,
  KPIStrip,
  PrimaryCTA,
  type KPIMetricData,
} from '@/components/system-ui/compounds'

/* Identity palette used for charts — matches kit tokens. */
const IDENTITY_COLORS = [
  '#2D7CF6', // blue
  '#D94BF4', // magenta
  '#38D3D3', // cyan
  '#FF9A18', // orange
  '#D7D9DF', // silver
  '#E8F21D', // chartreuse (keep last — lime-adjacent)
]

const REVENUE_COLOR = '#38D3D3' // cyan — positive flow
const EXPENSE_COLOR = '#D94BF4' // magenta — outflow

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

const AVATAR_COLOR_ROTATION: SegmentColor[] = [
  'blue',
  'magenta',
  'cyan',
  'orange',
  'silver',
  'chartreuse',
]

function avatarColorForCategory(category: string): SegmentColor {
  let hash = 0
  for (let i = 0; i < category.length; i++) {
    hash = (hash * 31 + category.charCodeAt(i)) >>> 0
  }
  return AVATAR_COLOR_ROTATION[hash % AVATAR_COLOR_ROTATION.length]
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { canCreateTransactions } = useRole()
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
    return (
      <DashboardShell>
        <p className="text-white/60 text-sm">Chargement du tableau de bord…</p>
      </DashboardShell>
    )
  }

  if (!stats) return null

  const chartData = monthly.map((m) => ({
    month: formatMonthLabel(m.month),
    Recettes: m.total_revenue,
    Dépenses: m.total_expenses,
  }))

  const filteredBreakdown = breakdown.filter((b) => b.category !== 'Prêts')

  const netPositive = stats.netThisMonth >= 0

  const kpiMetrics: KPIMetricData[] = [
    {
      id: 'balance',
      label: 'Solde total',
      value: formatTND(stats.totalBalance),
    },
    {
      id: 'revenue',
      label: 'Recettes ce mois',
      value: formatTND(stats.revenueThisMonth),
    },
    {
      id: 'expenses',
      label: 'Dépenses ce mois',
      value: formatTND(stats.expensesThisMonth),
    },
    {
      id: 'net',
      label: 'Net ce mois',
      value: `${netPositive ? '+' : ''}${formatTND(stats.netThisMonth)}`,
    },
  ]

  const kpiSegments: Segment[] = [
    { value: Math.max(stats.totalBalance, 0), color: 'cyan', label: 'Solde' },
    { value: stats.revenueThisMonth, color: 'blue', label: 'Recettes' },
    { value: stats.expensesThisMonth, color: 'magenta', label: 'Dépenses' },
    { value: Math.max(stats.netThisMonth, 0), color: 'chartreuse', label: 'Net' },
  ]

  return (
    <DashboardShell>
      <div className="space-y-6">
        <PanelHeader
          leading={
            <PillStat
              variant="accent"
              label="Net ce mois"
              value={`${netPositive ? '+' : ''}${formatTND(stats.netThisMonth)}`}
            />
          }
          trailing={
            canCreateTransactions ? (
              <PrimaryCTA
                label="Ajouter une transaction"
                icon={<Plus />}
                aria-label="Ajouter une nouvelle transaction"
                onClick={() => navigate('/ajouter')}
              />
            ) : undefined
          }
        />

        {/* KPI Strip */}
        <GlassPanel className="p-6 md:p-7">
          <KPIStrip
            metrics={kpiMetrics}
            segments={kpiSegments}
            barAriaLabel="Répartition solde, recettes, dépenses et net ce mois"
          />
        </GlassPanel>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <GlassPanel className="lg:col-span-2 p-6 md:p-7">
            <div className="flex flex-col gap-5">
              <PanelHeader
                leading={
                  <h2 className="text-white text-base font-semibold">
                    Recettes vs Dépenses
                  </h2>
                }
              />
              {chartData.length === 0 ? (
                <p className="text-sm text-white/46 text-center py-12">
                  Pas encore de données mensuelles
                </p>
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid
                        stroke="rgba(255,255,255,0.06)"
                        strokeDasharray="3 3"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="month"
                        stroke="rgba(255,255,255,0.46)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                      />
                      <YAxis
                        stroke="rgba(255,255,255,0.46)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        formatter={(value) => formatTND(Number(value))}
                        contentStyle={{
                          background: 'rgba(20,20,20,0.95)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 12,
                          color: '#fff',
                          fontSize: 12,
                        }}
                        labelStyle={{ color: 'rgba(255,255,255,0.72)', fontWeight: 600 }}
                        cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.72)' }}
                        iconType="circle"
                      />
                      <Bar dataKey="Recettes" fill={REVENUE_COLOR} radius={[6, 6, 0, 0]} />
                      <Bar dataKey="Dépenses" fill={EXPENSE_COLOR} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </GlassPanel>

          <GlassPanel className="p-6 md:p-7">
            <div className="flex flex-col gap-5">
              <PanelHeader
                leading={
                  <h2 className="text-white text-base font-semibold">
                    Dépenses par catégorie
                  </h2>
                }
              />
              {filteredBreakdown.length === 0 ? (
                <p className="text-sm text-white/46 text-center py-12">
                  Pas de dépenses ce mois
                </p>
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={filteredBreakdown}
                        dataKey="total_amount"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        innerRadius={56}
                        paddingAngle={3}
                        stroke="#0A0B0A"
                        strokeWidth={2}
                        label={(props: { name?: string; percent?: number }) =>
                          `${props.name || ''} ${((props.percent || 0) * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                        fontSize={11}
                      >
                        {filteredBreakdown.map((_, i) => (
                          <Cell
                            key={i}
                            fill={IDENTITY_COLORS[i % IDENTITY_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatTND(Number(value))}
                        contentStyle={{
                          background: 'rgba(20,20,20,0.95)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 12,
                          color: '#fff',
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </GlassPanel>
        </div>

        {/* Recent Transactions */}
        <GlassPanel className="p-6 md:p-7">
          <div className="flex flex-col gap-5">
            <PanelHeader
              leading={
                <h2 className="text-white text-base font-semibold">
                  Transactions récentes
                </h2>
              }
            />

            {recent.length === 0 ? (
              <p className="text-sm text-white/46 text-center py-6">
                Aucune transaction pour le moment
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-white/[0.06]">
                {recent.map((tx) => {
                  const Icon = categoryConfig[tx.category].icon
                  const entityName = getEntityName(tx)
                  const positive = tx.amount >= 0
                  return (
                    <li
                      key={tx.id}
                      className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <AvatarCircle
                          name={entityName || tx.category}
                          color={avatarColorForCategory(tx.category)}
                          size="md"
                          badge={
                            <span
                              className="inline-flex size-4 items-center justify-center rounded-full bg-[#0A0B0A] ring-1 ring-white/[0.08]"
                              aria-hidden
                            >
                              <Icon className="size-2.5 text-white/80" />
                            </span>
                          }
                        />
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <p className="truncate text-sm font-medium text-white">
                            {entityName || tx.category}
                          </p>
                          <p className="truncate text-[11px] text-white/46">
                            {formatDate(tx.date)} · {tx.category}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 text-sm font-semibold tracking-tight ${
                          positive ? 'text-[#B8EB3C]' : 'text-white/85'
                        }`}
                      >
                        {positive ? '+' : ''}
                        {formatTND(tx.amount)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </GlassPanel>
      </div>
    </DashboardShell>
  )
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {/* Ambient atmosphere — positioned within the page content so it paints behind panels */}
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
      <div className="relative z-10">{children}</div>
    </div>
  )
}
