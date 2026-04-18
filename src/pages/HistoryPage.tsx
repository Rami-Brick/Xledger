import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Pencil, Search, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { useRole } from '@/lib/RoleProvider'
import {
  CATEGORIES,
  deleteTransaction,
  getTransactions,
  type Category,
} from '@/features/transactions/api'
import {
  formatSalaryMonthLabel,
  isSalaryMonthDifferentFromEntryDate,
} from '@/features/transactions/salaryMonth'
import { categoryConfig } from '@/features/transactions/categories'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog'
import EditTransactionDialog from '@/features/transactions/EditTransactionDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDate, formatTND } from '@/lib/format'

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

function getEntityName(transaction: TransactionRow): string {
  if (transaction.employees) return transaction.employees.name
  if (transaction.fixed_charges) return transaction.fixed_charges.name
  if (transaction.products) return transaction.products.name
  if (transaction.subcategories) return transaction.subcategories.name
  if (transaction.subscriptions) return transaction.subscriptions.name
  if (transaction.loan_contacts) return transaction.loan_contacts.name
  return ''
}

function getCategoryFilterFromSearchParams(searchParams: URLSearchParams) {
  const category = searchParams.get('category')
  return category && CATEGORIES.includes(category as Category) ? category : 'all'
}

function getIncludeInternalFromSearchParams(searchParams: URLSearchParams) {
  return searchParams.get('includeInternal') === 'true'
}

const PAGE_SIZE = 50

export default function HistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [allTransactions, setAllTransactions] = useState<TransactionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<TransactionRow | null>(null)
  const [editTarget, setEditTarget] = useState<TransactionRow | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>(() =>
    getCategoryFilterFromSearchParams(searchParams)
  )
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showInternalEntries, setShowInternalEntries] = useState<boolean>(() =>
    getIncludeInternalFromSearchParams(searchParams)
  )
  const { canEditTransactions, canDeleteTransactions } = useRole()

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getTransactions({
        category: categoryFilter !== 'all' ? (categoryFilter as Category) : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        includeInternal: showInternalEntries,
      })

      setAllTransactions(data as TransactionRow[])
    } catch {
      toast.error('Erreur lors du chargement des transactions')
    } finally {
      setLoading(false)
    }
  }, [categoryFilter, endDate, showInternalEntries, startDate])

  const transactions = useMemo(() => {
    let filtered = allTransactions

    if (search) {
      const term = search.toLowerCase()
      filtered = filtered.filter((transaction) => {
        const entityName = getEntityName(transaction).toLowerCase()
        const description = (transaction.description ?? '').toLowerCase()
        const category = transaction.category.toLowerCase()
        return entityName.includes(term) || description.includes(term) || category.includes(term)
      })
    }

    if (typeFilter === 'expense') {
      filtered = filtered.filter((transaction) => transaction.amount < 0)
    } else if (typeFilter === 'revenue') {
      filtered = filtered.filter((transaction) => transaction.amount > 0)
    }

    return filtered
  }, [allTransactions, search, typeFilter])

  const visibleTransactions = useMemo(
    () => transactions.slice(0, page * PAGE_SIZE),
    [transactions, page]
  )

  useEffect(() => { setPage(1) }, [transactions])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  useEffect(() => {
    const categoryFromUrl = getCategoryFilterFromSearchParams(searchParams)
    const includeInternalFromUrl = getIncludeInternalFromSearchParams(searchParams)

    setCategoryFilter((current) => (current === categoryFromUrl ? current : categoryFromUrl))
    setShowInternalEntries((current) =>
      current === includeInternalFromUrl ? current : includeInternalFromUrl
    )
  }, [searchParams])

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams)
    let shouldUpdate = false

    const currentCategory = searchParams.get('category')
    const currentIncludeInternal = searchParams.get('includeInternal')

    if (categoryFilter === 'all') {
      if (currentCategory) {
        nextParams.delete('category')
        shouldUpdate = true
      }
    } else if (currentCategory !== categoryFilter) {
      nextParams.set('category', categoryFilter)
      shouldUpdate = true
    }

    if (showInternalEntries) {
      if (currentIncludeInternal !== 'true') {
        nextParams.set('includeInternal', 'true')
        shouldUpdate = true
      }
    } else if (currentIncludeInternal) {
      nextParams.delete('includeInternal')
      shouldUpdate = true
    }

    if (shouldUpdate) {
      setSearchParams(nextParams, { replace: true })
    }
  }, [categoryFilter, searchParams, setSearchParams, showInternalEntries])

  const handleDelete = async () => {
    if (!deleteTarget) return

    try {
      await deleteTransaction(deleteTarget.id)
      toast.success('Transaction supprimee')
      setDeleteTarget(null)
      await fetchTransactions()
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  const clearFilters = () => {
    setSearch('')
    setCategoryFilter('all')
    setTypeFilter('all')
    setStartDate('')
    setEndDate('')
    setShowInternalEntries(false)
  }

  const hasActiveFilters =
    search ||
    categoryFilter !== 'all' ||
    typeFilter !== 'all' ||
    startDate ||
    endDate ||
    showInternalEntries
  const totalAmount = transactions.reduce((sum, transaction) => sum + transaction.amount, 0)

  return (
    <div className="space-y-6 max-w-[1400px] w-full min-w-0">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-[22px] sm:text-[28px] font-semibold tracking-tight leading-tight">
            Historique
          </h2>
          <p className="mt-1 text-[13px] sm:text-sm text-muted-foreground">
            {visibleTransactions.length < transactions.length
              ? `${visibleTransactions.length} sur ${transactions.length} transactions`
              : `${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}`}
            {hasActiveFilters ? ' · filtré' : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-1.5 text-foreground hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Réinitialiser</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="sm:hidden"
          >
            <Search className="mr-1.5 h-3.5 w-3.5" />
            Filtres
          </Button>
        </div>
      </div>

      {/* Compact filter bar — search + inline filters, no wrapping card */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative w-full sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-8 pl-8 text-[13px] rounded-lg"
          />
        </div>

        <div className={`${showFilters ? 'grid' : 'hidden'} grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center`}>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-8 w-full sm:w-auto min-w-0 sm:min-w-[130px] rounded-lg text-[13px]">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-full sm:w-auto min-w-0 sm:min-w-[110px] rounded-lg text-[13px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tout</SelectItem>
              <SelectItem value="expense">Dépenses</SelectItem>
              <SelectItem value="revenue">Recettes</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="h-8 w-full sm:w-auto rounded-lg text-[13px]"
            aria-label="Date de début"
          />
          <Input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="h-8 w-full sm:w-auto rounded-lg text-[13px]"
            aria-label="Date de fin"
          />

          <label
            htmlFor="history-include-internal"
            className="col-span-2 flex items-center gap-2 rounded-lg border border-border/70 px-2.5 h-8 cursor-pointer sm:col-span-1"
          >
            <input
              id="history-include-internal"
              type="checkbox"
              checked={showInternalEntries}
              onChange={(event) => setShowInternalEntries(event.target.checked)}
              className="h-3.5 w-3.5 rounded border-input"
            />
            <span className="text-[12px] font-medium text-foreground">
              Entrées internes
            </span>
          </label>
        </div>
      </div>

      {/* List container */}
      <div className="premium-surface premium-surface-airy surface-tint-gold rounded-2xl p-4 sm:p-6">
        {/* List header — total on the left, count on the right (flipped) */}
        <div className="mb-4 flex items-center justify-between gap-4">
          {transactions.length > 0 ? (
            <div>
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Total
              </p>
              <p
                className={`text-base font-semibold tabular-nums ${
                  totalAmount >= 0 ? 'text-success' : 'text-destructive'
                }`}
              >
                {totalAmount >= 0 ? '+' : ''}
                {formatTND(totalAmount)}
              </p>
            </div>
          ) : (
            <div />
          )}
          <div className="text-right">
            <h3 className="text-base font-semibold text-foreground">
              {transactions.length > 0
                ? `${visibleTransactions.length} affichée${visibleTransactions.length !== 1 ? 's' : ''}`
                : 'Aucun résultat'}
            </h3>
            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Transactions
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2.5 py-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[52px] animate-pulse rounded-full bg-muted/50" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">Aucune transaction trouvée</p>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="mt-3 text-foreground"
              >
                Réinitialiser les filtres
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {visibleTransactions.map((transaction) => {
              const config = categoryConfig[transaction.category]
              const Icon = config.icon
              const entityName = getEntityName(transaction)
              const showSalaryMonth = transaction.category === 'Salaires'
              const salaryMonthDiffers = isSalaryMonthDifferentFromEntryDate(transaction)
              const showDescription =
                (transaction.category === 'Fournisseurs' ||
                  transaction.category === 'Packaging') &&
                !!transaction.description
              const truncatedDescription =
                showDescription && transaction.description!.length > 30
                  ? transaction.description!.slice(0, 30) + '...'
                  : transaction.description
              const isPositive = transaction.amount >= 0

              return (
                <div
                  key={transaction.id}
                  className="row-surface group flex items-center gap-2 sm:gap-4 rounded-full pl-2 pr-3 sm:pr-4 py-2"
                >
                  <div
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${config.color}`}
                  >
                    <Icon className={`h-4 w-4 ${config.textColor}`} />
                  </div>

                  <div className="min-w-0 flex-1 sm:flex-[2]">
                    <p className="truncate text-[13px] font-medium text-foreground tracking-tight">
                      {entityName || transaction.description || transaction.category}
                    </p>
                    <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {formatDate(transaction.date)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">·</span>
                      <span className="text-[11px] text-muted-foreground">
                        {transaction.category}
                      </span>
                    </div>
                  </div>

                  <div className="hidden lg:flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                    {transaction.is_internal && (
                      <Badge
                        variant="secondary"
                        className="h-5 rounded-full px-2 text-[10px] font-medium"
                      >
                        Interne
                      </Badge>
                    )}
                    {showSalaryMonth && (
                      <Badge
                        variant="outline"
                        className={`h-5 rounded-full px-2 text-[10px] font-medium ${
                          salaryMonthDiffers
                            ? 'border-destructive/30 bg-warning-soft text-destructive'
                            : ''
                        }`}
                      >
                        Salaire:{' '}
                        {formatSalaryMonthLabel(
                          transaction.salary_month ?? transaction.date
                        )}
                      </Badge>
                    )}
                    {showDescription && (
                      <Badge
                        variant="outline"
                        className="h-5 rounded-full px-2 text-[10px] font-medium truncate max-w-[200px]"
                      >
                        {truncatedDescription}
                      </Badge>
                    )}
                  </div>

                  <span
                    className={`shrink-0 text-[12px] sm:text-[13px] font-semibold tabular-nums tracking-tight whitespace-nowrap ${
                      isPositive ? 'text-success' : 'text-destructive'
                    }`}
                  >
                    {isPositive ? '+' : ''}
                    {formatTND(transaction.amount)}
                  </span>

                  {(canEditTransactions || canDeleteTransactions) && (
                    <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 transition-opacity sm:group-hover:opacity-100">
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
              )
            })}
            {visibleTransactions.length < transactions.length && (
              <div className="pt-3 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-full"
                >
                  Charger plus ({transactions.length - visibleTransactions.length} restantes)
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

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
        onSuccess={fetchTransactions}
      />
    </div>
  )
}
