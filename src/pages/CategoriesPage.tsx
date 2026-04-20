import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  CATEGORIES,
  MAIN_VIEW_TRANSACTIONS_FILTER,
  deleteTransaction,
  getTransactions,
  type Category,
} from '@/features/transactions/api'
import { categoryConfig } from '@/features/transactions/categories'
import { getFixedCharges, type FixedCharge } from '@/features/fixed-charges/api'
import { getLoanBalances, getLoanContacts, type LoanContact } from '@/features/loan-contacts/api'
import { getProducts, type Product } from '@/features/products/api'
import { getSubcategories, type Subcategory } from '@/features/subcategories/api'
import { getSubscriptions, type Subscription } from '@/features/subscriptions/api'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog'
import EditTransactionDialog from '@/features/transactions/EditTransactionDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  CircularIconButton,
  GlassPanel,
  PillButton,
} from '@/components/system-ui/primitives'
import { PrimaryCTA } from '@/components/system-ui/compounds'
import { useRole } from '@/lib/RoleProvider'
import { formatDate, formatTND } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface CategorySummary {
  category: string
  count: number
  total: number
}

interface TransactionRow {
  id: string
  created_at: string
  date: string
  salary_month: string | null
  category: Category
  amount: number
  description: string | null
  is_internal: boolean | null
  employee_id: string | null
  fixed_charge_id: string | null
  product_id: string | null
  subcategory_id: string | null
  subscription_id: string | null
  loan_contact_id: string | null
  employees: { name: string } | null
  fixed_charges: { name: string } | null
  products: { name: string } | null
  subcategories: { name: string } | null
  subscriptions: { name: string } | null
  loan_contacts: { name: string } | null
}

interface LoanBalance {
  loan_contact_id: string
  name: string
  total_lent: number
  total_repaid: number
  remaining: number
}

const LOAN_HISTORY_PAGE_SIZE = 5

// Distinct hex per category — mirrors AddTransactionPage so colors stay consistent.
const CATEGORY_COLOR: Record<Category, { bg: string; fg: string }> = {
  Salaires:       { bg: '#2D7CF6', fg: '#FFFFFF' },
  'Charges fixes':{ bg: '#D94BF4', fg: '#FFFFFF' },
  Fournisseurs:   { bg: '#FF9A18', fg: '#0A0B0A' },
  Transport:      { bg: '#FFC933', fg: '#0A0B0A' },
  Packaging:      { bg: '#38D3D3', fg: '#0A0B0A' },
  Sponsoring:     { bg: '#FF5DA2', fg: '#FFFFFF' },
  Subscriptions:  { bg: '#8B5CF6', fg: '#FFFFFF' },
  'Prêts':        { bg: '#F97316', fg: '#0A0B0A' },
  Divers:         { bg: '#D7D9DF', fg: '#0A0B0A' },
  Recettes:       { bg: '#B8EB3C', fg: '#0A0B0A' },
}

function getEntityName(transaction: TransactionRow): string {
  if (transaction.employees) return transaction.employees.name
  if (transaction.fixed_charges) return transaction.fixed_charges.name
  if (transaction.products) return transaction.products.name
  if (transaction.subcategories) return transaction.subcategories.name
  if (transaction.subscriptions) return transaction.subscriptions.name
  if (transaction.loan_contacts) return transaction.loan_contacts.name
  return transaction.description || ''
}

function getCurrentMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const end = now.toISOString().split('T')[0]
  return { start, end }
}

function getLoanEntryType(amount: number) {
  return amount >= 0 ? 'Recu' : 'Rendu'
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
      <div className="relative z-10 space-y-5">{children}</div>
    </div>
  )
}

export default function CategoriesPage() {
  const navigate = useNavigate()
  const { canCreateTransactions, canEditTransactions, canDeleteTransactions } = useRole()
  const [summaries, setSummaries] = useState<CategorySummary[]>([])
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [categoryTransactions, setCategoryTransactions] = useState<TransactionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [editTarget, setEditTarget] = useState<TransactionRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TransactionRow | null>(null)
  const [expandedLoanContactId, setExpandedLoanContactId] = useState<string | null>(null)
  const [loanHistoryVisibleCount, setLoanHistoryVisibleCount] = useState<Record<string, number>>({})

  const [fixedCharges, setFixedCharges] = useState<FixedCharge[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loanContacts, setLoanContacts] = useState<LoanContact[]>([])
  const [loanBalances, setLoanBalances] = useState<LoanBalance[]>([])

  const [allTimeTotal, setAllTimeTotal] = useState(0)
  const [lastMonthTotal, setLastMonthTotal] = useState(0)
  const [thisMonthTotal, setThisMonthTotal] = useState(0)

  const fetchSummaries = useCallback(async () => {
    setLoading(true)
    try {
      const { start, end } = getCurrentMonthRange()
      const { data, error } = await supabase
        .from('transactions')
        .select('category, amount')
        .gte('date', start)
        .lte('date', end)
        .or(MAIN_VIEW_TRANSACTIONS_FILTER)

      if (error) throw error

      const map = new Map<string, { count: number; total: number }>()
      for (const category of CATEGORIES) {
        map.set(category, { count: 0, total: 0 })
      }

      for (const transaction of data || []) {
        const existing = map.get(transaction.category)
        if (!existing) continue
        existing.count += 1
        existing.total += Math.abs(Number(transaction.amount))
      }

      setSummaries(
        Array.from(map.entries()).map(([category, { count, total }]) => ({
          category,
          count,
          total,
        }))
      )
    } catch {
      toast.error('Erreur chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSummaries()
  }, [fetchSummaries])

  const fetchCategoryDetail = useCallback(async (category: Category) => {
    const transactions = (await getTransactions({
      category,
      includeInternal: true,
    })) as TransactionRow[]

    setCategoryTransactions(category === 'Prêts' ? transactions : transactions.slice(0, 15))

    if (category === 'Prêts') {
      setExpandedLoanContactId(null)
      setLoanHistoryVisibleCount({})
    }

    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]

    const [allTime, thisMonth, lastMonth] = await Promise.all([
      supabase
        .from('transactions')
        .select('amount')
        .eq('category', category)
        .or(MAIN_VIEW_TRANSACTIONS_FILTER),
      supabase
        .from('transactions')
        .select('amount')
        .eq('category', category)
        .gte('date', thisMonthStart)
        .or(MAIN_VIEW_TRANSACTIONS_FILTER),
      supabase
        .from('transactions')
        .select('amount')
        .eq('category', category)
        .gte('date', lastMonthStart)
        .lte('date', lastMonthEnd)
        .or(MAIN_VIEW_TRANSACTIONS_FILTER),
    ])

    setAllTimeTotal((allTime.data || []).reduce((sum, transaction) => sum + Math.abs(Number(transaction.amount)), 0))
    setThisMonthTotal((thisMonth.data || []).reduce((sum, transaction) => sum + Math.abs(Number(transaction.amount)), 0))
    setLastMonthTotal((lastMonth.data || []).reduce((sum, transaction) => sum + Math.abs(Number(transaction.amount)), 0))

    switch (category) {
      case 'Charges fixes':
        setFixedCharges(await getFixedCharges())
        break
      case 'Fournisseurs':
        setProducts(await getProducts())
        break
      case 'Transport':
      case 'Packaging':
        setSubcategories(await getSubcategories())
        break
      case 'Subscriptions':
        setSubscriptions(await getSubscriptions())
        break
      case 'Prêts': {
        const [contacts, balances] = await Promise.all([getLoanContacts(), getLoanBalances()])
        setLoanContacts(contacts)
        setLoanBalances(balances)
        break
      }
      default:
        break
    }
  }, [])

  const openDetail = async (category: Category) => {
    if (category === 'Salaires') {
      navigate('/salaires')
      return
    }

    setSelectedCategory(category)
    setDetailLoading(true)

    try {
      await fetchCategoryDetail(category)
    } catch {
      toast.error('Erreur chargement details')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    try {
      await deleteTransaction(deleteTarget.id)
      toast.success('Transaction supprimee')
      setDeleteTarget(null)
      await fetchSummaries()
      if (selectedCategory) {
        await fetchCategoryDetail(selectedCategory)
      }
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  const toggleLoanHistory = (loanContactId: string) => {
    setExpandedLoanContactId((current) => (current === loanContactId ? null : loanContactId))
    setLoanHistoryVisibleCount((current) => {
      if (current[loanContactId]) return current
      return { ...current, [loanContactId]: LOAN_HISTORY_PAGE_SIZE }
    })
  }

  const handleShowMoreLoanEntries = (loanContactId: string) => {
    setLoanHistoryVisibleCount((current) => ({
      ...current,
      [loanContactId]: (current[loanContactId] || LOAN_HISTORY_PAGE_SIZE) + LOAN_HISTORY_PAGE_SIZE,
    }))
  }

  // ─── Grid state ─────────────────────────────────────────────────────────────
  if (!selectedCategory) {
    return (
      <Shell>
        <p className="text-sm text-white/60">Vue d&apos;ensemble par catégorie — ce mois.</p>

        {loading ? (
          <p className="py-8 text-center text-sm text-white/46">Chargement...</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {summaries.map((summary) => {
              const config = categoryConfig[summary.category as Category]
              const Icon = config.icon
              const color = CATEGORY_COLOR[summary.category as Category]

              return (
                <button
                  key={summary.category}
                  type="button"
                  onClick={() => openDetail(summary.category as Category)}
                  className={cn(
                    'group flex flex-col gap-3 rounded-[20px] border border-white/[0.08]',
                    'bg-white/[0.04] p-4 text-left transition-colors duration-150',
                    'hover:bg-white/[0.08] hover:border-white/[0.14]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
                    'focus-visible:ring-offset-2 focus-visible:ring-offset-black',
                  )}
                >
                  <span
                    aria-hidden
                    className="inline-flex size-10 items-center justify-center rounded-full [&>svg]:size-[18px]"
                    style={{ backgroundColor: color.bg, color: color.fg }}
                  >
                    <Icon />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">{config.label}</p>
                    <p className="mt-1 text-lg font-semibold tracking-tight tabular-nums text-white">
                      {formatTND(summary.total)}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </Shell>
    )
  }

  // ─── Detail state ───────────────────────────────────────────────────────────
  const config = categoryConfig[selectedCategory]
  const Icon = config.icon
  const color = CATEGORY_COLOR[selectedCategory]

  const renderEntities = () => {
    switch (selectedCategory) {
      case 'Charges fixes': {
        const activeCharges = fixedCharges.filter((charge) => charge.is_active)
        if (activeCharges.length === 0) return null

        return (
          <GlassPanel className="p-5">
            <p className="mb-3 text-xs font-medium text-white/72">Charges enregistrées</p>
            <div className="flex flex-col gap-1">
              {activeCharges.map((charge) => (
                <div
                  key={charge.id}
                  className="flex items-center justify-between py-1.5 text-sm"
                >
                  <span className="text-white">{charge.name}</span>
                  <span className="text-white/60 tabular-nums">
                    {formatTND(charge.default_amount)}
                  </span>
                </div>
              ))}
            </div>
          </GlassPanel>
        )
      }

      case 'Fournisseurs': {
        const activeProducts = products.filter((product) => product.is_active)
        if (activeProducts.length === 0) return null

        return (
          <GlassPanel className="p-5">
            <p className="mb-3 text-xs font-medium text-white/72">Produits actifs</p>
            <div className="flex flex-col gap-1">
              {activeProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between gap-3 py-1.5 text-sm"
                >
                  <span className="text-white">{product.name}</span>
                  {product.description && (
                    <span className="shrink-0 text-xs text-white/46">{product.description}</span>
                  )}
                </div>
              ))}
            </div>
          </GlassPanel>
        )
      }

      case 'Transport':
      case 'Packaging': {
        const activeSubcategories = subcategories.filter(
          (subcategory) => subcategory.category === selectedCategory && subcategory.is_active
        )
        if (activeSubcategories.length === 0) return null

        return (
          <GlassPanel className="p-5">
            <p className="mb-3 text-xs font-medium text-white/72">Sous-catégories</p>
            <div className="flex flex-wrap gap-1.5">
              {activeSubcategories.map((subcategory) => (
                <span
                  key={subcategory.id}
                  className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-white/80"
                >
                  {subcategory.name}
                </span>
              ))}
            </div>
          </GlassPanel>
        )
      }

      case 'Subscriptions': {
        const activeSubscriptions = subscriptions.filter((subscription) => subscription.is_active)
        if (activeSubscriptions.length === 0) return null

        return (
          <GlassPanel className="p-5">
            <p className="mb-3 text-xs font-medium text-white/72">Abonnements actifs</p>
            <div className="flex flex-col gap-1">
              {activeSubscriptions.map((subscription) => (
                <div
                  key={subscription.id}
                  className="flex items-center justify-between py-1.5 text-sm"
                >
                  <span className="text-white">{subscription.name}</span>
                  <span className="text-white/60 tabular-nums">
                    {formatTND(subscription.default_amount)}
                  </span>
                </div>
              ))}
            </div>
          </GlassPanel>
        )
      }

      case 'Prêts': {
        if (loanBalances.length === 0 && loanContacts.length === 0) return null

        const totalReceived = loanBalances.reduce((sum, balance) => sum + balance.total_lent, 0)
        const totalReturned = loanBalances.reduce((sum, balance) => sum + balance.total_repaid, 0)
        const totalRemaining = loanBalances.reduce((sum, balance) => sum + balance.remaining, 0)

        return (
          <div className="space-y-3">
            <GlassPanel className="p-4">
              <div className="grid grid-cols-3 gap-3">
                <StatCell label="Total recu" value={formatTND(totalReceived)} />
                <StatCell
                  label="Total rendu"
                  value={formatTND(totalReturned)}
                  valueClassName="text-[#B8EB3C]"
                />
                <StatCell
                  label="Reste"
                  value={formatTND(totalRemaining)}
                  valueClassName={
                    totalRemaining > 0 ? 'text-[#FF9A18]' : 'text-[#B8EB3C]'
                  }
                />
              </div>
            </GlassPanel>

            {loanBalances.length > 0 && (
              <GlassPanel className="p-5">
                <div className="mb-4">
                  <p className="text-xs font-medium text-white/72">Soldes par personne</p>
                  <p className="mt-1 text-[11px] text-white/46">
                    Cliquez sur une personne pour voir l&apos;historique.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {loanBalances.map((balance) => {
                    const percent =
                      balance.total_lent > 0
                        ? Math.min((balance.total_repaid / balance.total_lent) * 100, 100)
                        : 0
                    const isExpanded = expandedLoanContactId === balance.loan_contact_id
                    const entries = categoryTransactions.filter(
                      (transaction) => transaction.loan_contact_id === balance.loan_contact_id
                    )
                    const visibleCount =
                      loanHistoryVisibleCount[balance.loan_contact_id] || LOAN_HISTORY_PAGE_SIZE
                    const visibleEntries = entries.slice(0, visibleCount)
                    const hasMore = entries.length > visibleEntries.length

                    return (
                      <div
                        key={balance.loan_contact_id}
                        className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]"
                      >
                        <button
                          type="button"
                          onClick={() => toggleLoanHistory(balance.loan_contact_id)}
                          className="w-full p-4 text-left transition-colors hover:bg-white/[0.03]"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1 space-y-1.5">
                              <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="truncate font-medium text-white">
                                  {balance.name}
                                </span>
                                <span
                                  className={cn(
                                    'shrink-0 text-xs font-semibold tabular-nums',
                                    balance.remaining > 0 ? 'text-[#FF9A18]' : 'text-[#B8EB3C]',
                                  )}
                                >
                                  {balance.remaining > 0
                                    ? `Reste : ${formatTND(balance.remaining)}`
                                    : 'Soldé'}
                                </span>
                              </div>
                              <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                                <div
                                  className={cn(
                                    'h-full rounded-full transition-all',
                                    balance.remaining <= 0 ? 'bg-[#B8EB3C]' : 'bg-[#2D7CF6]',
                                  )}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[10px] text-white/46">
                                <span>Rendu : {formatTND(balance.total_repaid)}</span>
                                <span>Recu : {formatTND(balance.total_lent)}</span>
                              </div>
                            </div>
                            <span className="shrink-0 text-white/46">
                              {isExpanded ? (
                                <ChevronUp className="size-4" />
                              ) : (
                                <ChevronDown className="size-4" />
                              )}
                            </span>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="flex flex-col gap-2 border-t border-white/[0.06] bg-white/[0.02] px-4 py-3">
                            {entries.length === 0 ? (
                              <p className="text-sm text-white/46">
                                Aucune entree pour cette personne.
                              </p>
                            ) : (
                              <>
                                {visibleEntries.map((transaction) => {
                                  const positive = transaction.amount >= 0
                                  return (
                                    <div
                                      key={transaction.id}
                                      className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-2"
                                    >
                                      <div className="min-w-0 space-y-0.5">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <span className="text-sm font-medium text-white">
                                            {getLoanEntryType(transaction.amount)}
                                          </span>
                                          {transaction.is_internal && (
                                            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0 text-[10px] text-white/72">
                                              Interne
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[11px] text-white/46">
                                          {formatDate(transaction.date)}
                                          {transaction.description ? ` · ${transaction.description}` : ''}
                                        </p>
                                      </div>

                                      <div className="flex shrink-0 items-center gap-1.5">
                                        <span
                                          className={cn(
                                            'inline-flex h-7 items-center rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 text-[12px] font-semibold tabular-nums',
                                            positive ? 'text-[#B8EB3C]' : 'text-white',
                                          )}
                                        >
                                          {positive ? '+' : ''}
                                          {formatTND(transaction.amount)}
                                        </span>
                                        {(canEditTransactions || canDeleteTransactions) && (
                                          <RowActions
                                            onEdit={
                                              canEditTransactions
                                                ? () => setEditTarget(transaction)
                                                : undefined
                                            }
                                            onDelete={
                                              canDeleteTransactions
                                                ? () => setDeleteTarget(transaction)
                                                : undefined
                                            }
                                          />
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}

                                {hasMore && (
                                  <PillButton
                                    variant="glass"
                                    size="sm"
                                    onClick={() => handleShowMoreLoanEntries(balance.loan_contact_id)}
                                    className="self-center"
                                  >
                                    Voir plus
                                  </PillButton>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </GlassPanel>
            )}
          </div>
        )
      }

      default:
        return null
    }
  }

  return (
    <Shell>
      {/* Back button + header */}
      <div className="flex items-center gap-3">
        <CircularIconButton
          variant="glass"
          size="sm"
          icon={<ArrowLeft />}
          aria-label="Toutes les categories"
          onClick={() => setSelectedCategory(null)}
        />
        <span className="text-xs text-white/60">Toutes les catégories</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="inline-flex size-14 shrink-0 items-center justify-center rounded-full [&>svg]:size-6"
            style={{ backgroundColor: color.bg, color: color.fg }}
          >
            <Icon />
          </span>
          <div className="flex min-w-0 flex-col">
            <h2 className="text-lg font-semibold leading-none text-white md:text-xl">
              {config.label}
            </h2>
            <span className="mt-1 text-[11px] text-white/46">Vue détaillée</span>
          </div>
        </div>

        {canCreateTransactions && (
          <>
            <CircularIconButton
              variant="light"
              size="md"
              icon={<Plus />}
              aria-label={`Ajouter une transaction ${config.label}`}
              onClick={() =>
                navigate(`/ajouter?category=${encodeURIComponent(selectedCategory)}`)
              }
              className="md:hidden"
            />
            <PrimaryCTA
              label={`Ajouter ${config.label}`}
              icon={<Plus />}
              aria-label={`Ajouter une transaction ${config.label}`}
              onClick={() =>
                navigate(`/ajouter?category=${encodeURIComponent(selectedCategory)}`)
              }
              className="hidden md:inline-flex"
            />
          </>
        )}
      </div>

      {detailLoading ? (
        <p className="py-8 text-center text-sm text-white/46">Chargement...</p>
      ) : (
        <>
          <GlassPanel className="p-4 md:p-5">
            <div className="grid grid-cols-3 gap-3">
              <StatCell label="Ce mois" value={formatTND(thisMonthTotal)} />
              <StatCell label="Mois dernier" value={formatTND(lastMonthTotal)} />
              <StatCell label="Total" value={formatTND(allTimeTotal)} />
            </div>
          </GlassPanel>

          {renderEntities()}

          {selectedCategory !== 'Prêts' && (
            <GlassPanel className="p-3 md:p-4">
              <div className="flex items-center justify-between px-2 pb-2">
                <p className="text-xs font-medium text-white/72">Transactions récentes</p>
                <PillButton
                  variant="ghost"
                  size="sm"
                  trailingIcon={<ArrowRight />}
                  onClick={() =>
                    navigate(`/historique?category=${encodeURIComponent(selectedCategory)}`)
                  }
                >
                  Voir tout
                </PillButton>
              </div>

              {categoryTransactions.length === 0 ? (
                <p className="py-6 text-center text-sm text-white/46">Aucune transaction</p>
              ) : (
                <div className="flex flex-col">
                  {categoryTransactions.map((transaction) => {
                    const entityName = getEntityName(transaction)
                    const displayName =
                      entityName || transaction.description || selectedCategory
                    const positive = transaction.amount >= 0

                    return (
                      <div
                        key={transaction.id}
                        className="group grid items-center gap-3 rounded-2xl px-2 py-3 grid-cols-[minmax(0,1fr)_auto]"
                      >
                        <div className="min-w-0 flex flex-col gap-0.5">
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="truncate text-sm font-medium text-white">
                              {displayName}
                            </p>
                            {transaction.is_internal && (
                              <span className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0 text-[10px] text-white/72">
                                Interne
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-white/46">
                            {formatDate(transaction.date)}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5">
                          <span
                            className={cn(
                              'inline-flex h-8 items-center rounded-full border border-white/[0.08] bg-white/[0.04] px-3 text-[13px] font-semibold tabular-nums',
                              positive ? 'text-[#B8EB3C]' : 'text-white',
                            )}
                          >
                            {positive ? '+' : ''}
                            {formatTND(transaction.amount)}
                          </span>
                          {(canEditTransactions || canDeleteTransactions) && (
                            <RowActions
                              onEdit={
                                canEditTransactions
                                  ? () => setEditTarget(transaction)
                                  : undefined
                              }
                              onDelete={
                                canDeleteTransactions
                                  ? () => setDeleteTarget(transaction)
                                  : undefined
                              }
                            />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </GlassPanel>
          )}
        </>
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Supprimer cette transaction ?"
        description={`Etes-vous sur de vouloir supprimer cette transaction de ${
          deleteTarget ? formatTND(Math.abs(deleteTarget.amount)) : ''
        } ? Cette action est irreversible.`}
        onConfirm={handleDelete}
      />
      <EditTransactionDialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        transaction={editTarget}
        onSuccess={async () => {
          await fetchSummaries()
          if (selectedCategory) {
            await fetchCategoryDetail(selectedCategory)
          }
        }}
      />
    </Shell>
  )
}

function StatCell({
  label,
  value,
  valueClassName,
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="truncate text-[11px] text-white/46">{label}</span>
      <span
        className={cn(
          'truncate text-base font-semibold tracking-tight tabular-nums text-white md:text-lg',
          valueClassName,
        )}
      >
        {value}
      </span>
    </div>
  )
}

function RowActions({
  onEdit,
  onDelete,
}: {
  onEdit?: () => void
  onDelete?: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <CircularIconButton
          variant="glass"
          size="sm"
          icon={<MoreHorizontal />}
          aria-label="Actions"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="min-w-40 rounded-xl border border-white/[0.08] bg-[#141414] p-1.5 text-white shadow-xl ring-0"
      >
        {onEdit && (
          <DropdownMenuItem
            className="gap-2 rounded-lg px-2 py-2 text-sm text-white/90 focus:bg-white/[0.06] focus:text-white"
            onSelect={(e) => {
              e.preventDefault()
              onEdit()
            }}
          >
            <Pencil className="size-4" />
            Modifier
          </DropdownMenuItem>
        )}
        {onEdit && onDelete && (
          <DropdownMenuSeparator className="my-1 bg-white/[0.06]" />
        )}
        {onDelete && (
          <DropdownMenuItem
            className="gap-2 rounded-lg px-2 py-2 text-sm text-[#FF9A18] focus:bg-[#FF9A18]/10 focus:text-[#FF9A18]"
            onSelect={(e) => {
              e.preventDefault()
              onDelete()
            }}
          >
            <Trash2 className="size-4" />
            Supprimer
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
