import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useRole } from '@/lib/RoleProvider'
import { formatDate, formatTND } from '@/lib/format'
import { supabase } from '@/lib/supabase'

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

  const categorySurfaceTint: Record<string, string> = {
    Recettes: 'surface-tint-success',
    Salaires: 'surface-tint-violet',
    'Charges fixes': 'surface-tint-violet',
    Fournisseurs: 'surface-tint-warning',
    Transport: 'surface-tint-gold',
    Packaging: 'surface-tint-teal',
    Sponsoring: 'surface-tint-rose',
    Subscriptions: 'surface-tint-violet',
    'Prêts': 'surface-tint-gold',
    Divers: 'surface-tint-teal',
  }

  if (!selectedCategory) {
    return (
      <div className="space-y-6 max-w-[1400px] min-w-0">
        <div>
          <h2 className="text-[22px] sm:text-[28px] font-semibold tracking-tight leading-tight">
            Catégories
          </h2>
          <p className="mt-1 text-[13px] sm:text-sm text-muted-foreground">
            Vue d'ensemble par catégorie · ce mois
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted/60" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
            {summaries.map((summary) => {
              const config = categoryConfig[summary.category as Category]
              const Icon = config.icon
              const tint = categorySurfaceTint[summary.category] || 'surface-tint-gold'

              return (
                <button
                  key={summary.category}
                  type="button"
                  onClick={() => openDetail(summary.category as Category)}
                  className={`premium-surface ${tint} group rounded-2xl px-4 py-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                >
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className={`grid h-11 w-11 place-items-center rounded-xl ${config.color}`}>
                      <Icon className={`h-5 w-5 ${config.textColor}`} />
                    </div>
                    <span className="text-[13px] font-medium tracking-tight text-foreground">
                      {config.label}
                    </span>
                  </div>
                  <div className="mt-4 space-y-0.5 text-center">
                    <p className="text-[17px] font-semibold tabular-nums tracking-tight text-foreground">
                      {formatTND(summary.total)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {summary.count} transaction{summary.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const config = categoryConfig[selectedCategory]
  const Icon = config.icon

  const renderEntities = () => {
    switch (selectedCategory) {
      case 'Charges fixes': {
        const activeCharges = fixedCharges.filter((charge) => charge.is_active)
        if (activeCharges.length === 0) return null

        return (
          <div className="premium-surface surface-tint-violet rounded-2xl p-5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Entités
            </p>
            <h3 className="mt-1 mb-4 text-base font-semibold text-foreground">
              Charges enregistrées
            </h3>
            <div className="space-y-2">
              {activeCharges.map((charge) => (
                <div
                  key={charge.id}
                  className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-sm"
                >
                  <span className="text-foreground">{charge.name}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatTND(charge.default_amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      }

      case 'Fournisseurs': {
        const activeProducts = products.filter((product) => product.is_active)
        if (activeProducts.length === 0) return null

        return (
          <div className="premium-surface surface-tint-warning rounded-2xl p-5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Entités
            </p>
            <h3 className="mt-1 mb-4 text-base font-semibold text-foreground">Produits actifs</h3>
            <div className="space-y-2">
              {activeProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-sm"
                >
                  <span className="text-foreground">{product.name}</span>
                  {product.description && (
                    <span className="text-xs text-muted-foreground">{product.description}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      }

      case 'Transport':
      case 'Packaging': {
        const activeSubcategories = subcategories.filter(
          (subcategory) => subcategory.category === selectedCategory && subcategory.is_active
        )
        if (activeSubcategories.length === 0) return null

        const tint = selectedCategory === 'Transport' ? 'surface-tint-gold' : 'surface-tint-teal'

        return (
          <div className={`premium-surface ${tint} rounded-2xl p-5`}>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Entités
            </p>
            <h3 className="mt-1 mb-4 text-base font-semibold text-foreground">Sous-catégories</h3>
            <div className="flex flex-wrap gap-2">
              {activeSubcategories.map((subcategory) => (
                <Badge
                  key={subcategory.id}
                  variant="outline"
                  className="h-6 rounded-full px-2.5 text-xs font-medium"
                >
                  {subcategory.name}
                </Badge>
              ))}
            </div>
          </div>
        )
      }

      case 'Subscriptions': {
        const activeSubscriptions = subscriptions.filter((subscription) => subscription.is_active)
        if (activeSubscriptions.length === 0) return null

        return (
          <div className="premium-surface surface-tint-violet rounded-2xl p-5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Entités
            </p>
            <h3 className="mt-1 mb-4 text-base font-semibold text-foreground">
              Abonnements actifs
            </h3>
            <div className="space-y-2">
              {activeSubscriptions.map((subscription) => (
                <div
                  key={subscription.id}
                  className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-sm"
                >
                  <span className="text-foreground">{subscription.name}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatTND(subscription.default_amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      }

      case 'Prêts': {
        if (loanBalances.length === 0 && loanContacts.length === 0) return null

        const totalReceived = loanBalances.reduce((sum, balance) => sum + balance.total_lent, 0)
        const totalReturned = loanBalances.reduce((sum, balance) => sum + balance.total_repaid, 0)
        const totalRemaining = loanBalances.reduce((sum, balance) => sum + balance.remaining, 0)

        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="premium-surface surface-tint-gold rounded-2xl px-5 py-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Total reçu
                </p>
                <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-foreground">
                  {formatTND(totalReceived)}
                </p>
              </div>
              <div className="premium-surface surface-tint-success rounded-2xl px-5 py-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Total rendu
                </p>
                <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-success">
                  {formatTND(totalReturned)}
                </p>
              </div>
              <div
                className={`premium-surface ${
                  totalRemaining > 0 ? 'surface-tint-warning' : 'surface-tint-success'
                } rounded-2xl px-5 py-4`}
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Reste
                </p>
                <p
                  className={`mt-2 text-xl font-semibold tabular-nums tracking-tight ${
                    totalRemaining > 0 ? 'text-destructive' : 'text-success'
                  }`}
                >
                  {formatTND(totalRemaining)}
                </p>
              </div>
            </div>

            {loanBalances.length > 0 && (
              <div className="premium-surface premium-surface-airy surface-tint-gold rounded-2xl p-4 sm:p-6">
                <div className="mb-4">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Contacts
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-foreground">
                    Soldes par personne
                  </h3>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Cliquez sur une personne pour voir l'historique
                  </p>
                </div>
                <div className="space-y-2.5">
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
                    const isSettled = balance.remaining <= 0

                    return (
                      <div
                        key={balance.loan_contact_id}
                        className="row-surface rounded-2xl overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => toggleLoanHistory(balance.loan_contact_id)}
                          className="w-full p-4 text-left"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="flex items-center justify-between gap-3">
                                <span className="truncate text-sm font-medium text-foreground tracking-tight">
                                  {balance.name}
                                </span>
                                <span
                                  className={`shrink-0 text-xs font-semibold tabular-nums ${
                                    isSettled ? 'text-success' : 'text-destructive'
                                  }`}
                                >
                                  {balance.remaining > 0
                                    ? `Reste: ${formatTND(balance.remaining)}`
                                    : 'Soldé'}
                                </span>
                              </div>
                              <Progress
                                value={percent}
                                className={`h-1.5 ${
                                  isSettled
                                    ? '[&>div]:bg-success'
                                    : '[&>div]:bg-brand-accent'
                                }`}
                              />
                              <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>Rendu: <span className="tabular-nums">{formatTND(balance.total_repaid)}</span></span>
                                <span>Reçu: <span className="tabular-nums">{formatTND(balance.total_lent)}</span></span>
                              </div>
                            </div>
                            <span className="shrink-0 text-muted-foreground mt-0.5">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </span>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="space-y-2 border-t border-border/50 px-4 py-3">
                            {entries.length === 0 ? (
                              <p className="py-2 text-sm text-muted-foreground">
                                Aucune entrée pour cette personne
                              </p>
                            ) : (
                              <>
                                {visibleEntries.map((transaction) => {
                                  const isPositive = transaction.amount >= 0
                                  return (
                                    <div
                                      key={transaction.id}
                                      className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 px-3 py-2"
                                    >
                                      <div className="min-w-0 space-y-0.5">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="text-sm font-medium text-foreground">
                                            {getLoanEntryType(transaction.amount)}
                                          </span>
                                          {transaction.is_internal && (
                                            <Badge
                                              variant="secondary"
                                              className="h-4 rounded-full px-1.5 text-[9px] font-medium"
                                            >
                                              Interne
                                            </Badge>
                                          )}
                                        </div>
                                        <p className="text-[11px] text-muted-foreground">
                                          {formatDate(transaction.date)}
                                          {transaction.description
                                            ? ` · ${transaction.description}`
                                            : ''}
                                        </p>
                                      </div>

                                      <div className="flex items-center gap-1 shrink-0">
                                        <span
                                          className={`text-sm font-semibold tabular-nums ${
                                            isPositive ? 'text-success' : 'text-destructive'
                                          }`}
                                        >
                                          {isPositive ? '+' : ''}
                                          {formatTND(transaction.amount)}
                                        </span>
                                        {(canEditTransactions || canDeleteTransactions) && (
                                          <div className="flex items-center gap-0.5 ml-1">
                                            {canEditTransactions && (
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                                                onClick={() => setEditTarget(transaction)}
                                              >
                                                <Pencil className="h-3.5 w-3.5" />
                                              </Button>
                                            )}
                                            {canDeleteTransactions && (
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => setDeleteTarget(transaction)}
                                              >
                                                <Trash2 className="h-3.5 w-3.5" />
                                              </Button>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}

                                {hasMore && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleShowMoreLoanEntries(balance.loan_contact_id)
                                    }
                                    className="w-full rounded-full"
                                  >
                                    Voir plus
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      }

      default:
        return null
    }
  }

  const detailTint = categorySurfaceTint[selectedCategory] || 'surface-tint-gold'

  return (
    <div className="space-y-6 max-w-[1400px] min-w-0">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedCategory(null)}
          className="mb-3 gap-2 text-foreground hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          Toutes les catégories
        </Button>
        <div className="flex items-center gap-3">
          <div className={`grid h-11 w-11 place-items-center rounded-xl ${config.color}`}>
            <Icon className={`h-5 w-5 ${config.textColor}`} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[22px] sm:text-[28px] font-semibold tracking-tight leading-tight">
              {config.label}
            </h2>
            <p className="text-[13px] sm:text-sm text-muted-foreground">Vue détaillée</p>
          </div>
        </div>
      </div>

      {detailLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted/60" />
            ))}
          </div>
          <div className="h-48 animate-pulse rounded-2xl bg-muted/60" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`premium-surface ${detailTint} rounded-2xl px-5 py-4`}>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Ce mois
              </p>
              <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-foreground">
                {formatTND(thisMonthTotal)}
              </p>
            </div>
            <div className={`premium-surface ${detailTint} rounded-2xl px-5 py-4`}>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Mois dernier
              </p>
              <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-foreground">
                {formatTND(lastMonthTotal)}
              </p>
            </div>
            <div className={`premium-surface ${detailTint} rounded-2xl px-5 py-4`}>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Total
              </p>
              <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-foreground">
                {formatTND(allTimeTotal)}
              </p>
            </div>
          </div>

          {canCreateTransactions && (
            <Button
              onClick={() =>
                navigate(`/ajouter?category=${encodeURIComponent(selectedCategory)}`)
              }
              className="w-full gap-2 rounded-lg sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Ajouter une transaction {config.label}
            </Button>
          )}

          {renderEntities()}

          {selectedCategory !== 'Prêts' && (
            <div className={`premium-surface premium-surface-airy ${detailTint} rounded-2xl p-4 sm:p-6`}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Activité
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-foreground">
                    Transactions récentes
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    navigate(`/historique?category=${encodeURIComponent(selectedCategory)}`)
                  }
                  className="gap-1 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Voir tout <ArrowRight className="h-3 w-3" />
                </Button>
              </div>

              {categoryTransactions.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Aucune transaction
                </p>
              ) : (
                <div className="space-y-2.5">
                  {categoryTransactions.map((transaction) => {
                    const entityName = getEntityName(transaction)
                    const isPositive = transaction.amount >= 0

                    return (
                      <div
                        key={transaction.id}
                        className="row-surface group flex items-center gap-3 rounded-full px-4 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="truncate text-[13px] font-medium text-foreground tracking-tight">
                              {entityName || transaction.description || selectedCategory}
                            </p>
                            {transaction.is_internal && (
                              <Badge
                                variant="secondary"
                                className="h-4 shrink-0 rounded-full px-1.5 text-[9px] font-medium"
                              >
                                Interne
                              </Badge>
                            )}
                          </div>
                          <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                            {formatDate(transaction.date)}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 text-[13px] font-semibold tabular-nums tracking-tight whitespace-nowrap ${
                            isPositive ? 'text-success' : 'text-destructive'
                          }`}
                        >
                          {isPositive ? '+' : ''}
                          {formatTND(transaction.amount)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
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
    </div>
  )
}
