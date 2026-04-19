import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MoreHorizontal, Pencil, Search, Trash2, X } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AvatarCircle,
  CircularIconButton,
  GlassPanel,
  PillButton,
  type SegmentColor,
} from '@/components/system-ui/primitives'
import { PanelHeader } from '@/components/system-ui/compounds'
import { formatDate, formatTND } from '@/lib/format'
import { cn } from '@/lib/utils'

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
  const showRowActions = canEditTransactions || canDeleteTransactions

  return (
    <div className="w-full min-w-0 space-y-4">
      <PanelHeader
        leading={
          <div className="flex flex-col gap-1">
            <p className="text-[11px] text-white/46">
              {visibleTransactions.length < transactions.length
                ? `${visibleTransactions.length} / ${transactions.length} transactions`
                : `${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}`}
              {hasActiveFilters ? ' · filtré' : ''}
            </p>
            {transactions.length > 0 && (
              <p className="text-xs text-white/72">
                Total :{' '}
                <span
                  className={cn(
                    'font-semibold tracking-tight',
                    totalAmount >= 0 ? 'text-[#B8EB3C]' : 'text-[#FF9A18]',
                  )}
                >
                  {totalAmount >= 0 ? '+' : ''}
                  {formatTND(totalAmount)}
                </span>
              </p>
            )}
          </div>
        }
        trailing={
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <PillButton
                variant="ghost"
                size="sm"
                leadingIcon={<X />}
                onClick={clearFilters}
              >
                Réinitialiser
              </PillButton>
            )}
            <PillButton
              variant="glass"
              size="sm"
              leadingIcon={<Search />}
              onClick={() => setShowFilters((v) => !v)}
              className="sm:hidden"
            >
              Filtres
            </PillButton>
          </div>
        }
      />

      {/* Filters panel */}
      <GlassPanel className="p-4 md:p-5">
        <div className="flex flex-col gap-3">
          {/* Search — always visible */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/46" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-10 rounded-full border-white/[0.08] bg-white/[0.04] pl-10 text-sm text-white placeholder:text-white/46 focus-visible:border-white/30 focus-visible:ring-0"
            />
          </div>

          {/* Advanced filters — collapsible on mobile, always shown on desktop */}
          <div className={cn('space-y-3', showFilters ? 'block' : 'hidden sm:block')}>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Label
                  htmlFor="history-category-filter"
                  className="shrink-0 text-xs text-white/46"
                >
                  Categories
                </Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger
                    id="history-category-filter"
                    className="min-w-0 flex-1 rounded-full border-white/[0.08] bg-white/[0.04] text-xs text-white sm:text-sm"
                  >
                    <SelectValue placeholder="Categorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex min-w-0 items-center gap-2">
                <Label htmlFor="history-type-filter" className="shrink-0 text-xs text-white/46">
                  Type
                </Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger
                    id="history-type-filter"
                    className="min-w-0 flex-1 rounded-full border-white/[0.08] bg-white/[0.04] text-xs text-white sm:text-sm"
                  >
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tout</SelectItem>
                    <SelectItem value="expense">Depenses</SelectItem>
                    <SelectItem value="revenue">Recettes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="h-10 rounded-full border-white/[0.08] bg-white/[0.04] text-xs text-white sm:text-sm [color-scheme:dark]"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="h-10 rounded-full border-white/[0.08] bg-white/[0.04] text-xs text-white sm:text-sm [color-scheme:dark]"
              />

              <label
                htmlFor="history-include-internal"
                className="flex cursor-pointer items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2 sm:col-span-2"
              >
                <input
                  id="history-include-internal"
                  type="checkbox"
                  checked={showInternalEntries}
                  onChange={(event) => setShowInternalEntries(event.target.checked)}
                  className="size-4 rounded border-white/20 bg-transparent accent-white"
                />
                <span className="text-xs text-white/72 sm:text-sm">Entrees internes</span>
              </label>
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* List */}
      {loading ? (
        <GlassPanel className="p-6">
          <p className="py-6 text-center text-sm text-white/46">Chargement...</p>
        </GlassPanel>
      ) : transactions.length === 0 ? (
        <GlassPanel className="p-6">
          <div className="flex flex-col items-center gap-3 py-12 text-center text-white/60">
            <p className="text-sm">Aucune transaction trouvee.</p>
            {hasActiveFilters && (
              <PillButton variant="light" size="sm" onClick={clearFilters}>
                Réinitialiser les filtres
              </PillButton>
            )}
          </div>
        </GlassPanel>
      ) : (
        <GlassPanel className="p-3 md:p-4">
          <div className="flex flex-col gap-1">
            {visibleTransactions.map((transaction) => {
              const Icon = categoryConfig[transaction.category].icon
              const entityName = getEntityName(transaction)
              const showSalaryMonth = transaction.category === 'Salaires'
              const salaryMonthDiffers = isSalaryMonthDifferentFromEntryDate(transaction)
              const showDescription =
                (transaction.category === 'Fournisseurs' ||
                  transaction.category === 'Packaging') &&
                !!transaction.description
              const truncatedDescription =
                showDescription && transaction.description!.length > 40
                  ? transaction.description!.slice(0, 40) + '...'
                  : transaction.description
              const positive = transaction.amount >= 0
              const displayName = entityName || transaction.description || transaction.category

              return (
                <div
                  key={transaction.id}
                  className="grid items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors duration-150 hover:bg-white/[0.03] grid-cols-[auto_minmax(0,1fr)_auto]"
                >
                  <AvatarCircle
                    name={displayName}
                    color={avatarColorForCategory(transaction.category)}
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

                  <div className="min-w-0 flex flex-col gap-0.5">
                    <span className="truncate text-sm font-medium text-white">
                      {displayName}
                    </span>
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-white/46">
                      <span className="shrink-0">{formatDate(transaction.date)}</span>
                      <span className="shrink-0">·</span>
                      <span className="shrink-0">{transaction.category}</span>
                      {transaction.is_internal && (
                        <>
                          <span className="shrink-0">·</span>
                          <span className="shrink-0 text-white/72">Interne</span>
                        </>
                      )}
                      {showSalaryMonth && (
                        <>
                          <span className="shrink-0">·</span>
                          <span
                            className={cn(
                              'shrink-0',
                              salaryMonthDiffers ? 'text-[#FF9A18]' : 'text-white/72',
                            )}
                          >
                            Salaire :{' '}
                            {formatSalaryMonthLabel(
                              transaction.salary_month ?? transaction.date,
                            )}
                          </span>
                        </>
                      )}
                      {showDescription && (
                        <>
                          <span className="hidden shrink-0 sm:inline">·</span>
                          <span className="hidden shrink-0 sm:inline">
                            {truncatedDescription}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={cn(
                        'text-sm font-semibold tracking-tight tabular-nums',
                        positive ? 'text-[#B8EB3C]' : 'text-white',
                      )}
                    >
                      {positive ? '+' : ''}
                      {formatTND(transaction.amount)}
                    </span>

                    {showRowActions && (
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
                          {canEditTransactions && (
                            <DropdownMenuItem
                              className="gap-2 rounded-lg px-2 py-2 text-sm text-white/90 focus:bg-white/[0.06] focus:text-white"
                              onSelect={(e) => {
                                e.preventDefault()
                                setEditTarget(transaction)
                              }}
                            >
                              <Pencil className="size-4" />
                              Modifier
                            </DropdownMenuItem>
                          )}
                          {canEditTransactions && canDeleteTransactions && (
                            <DropdownMenuSeparator className="my-1 bg-white/[0.06]" />
                          )}
                          {canDeleteTransactions && (
                            <DropdownMenuItem
                              className="gap-2 rounded-lg px-2 py-2 text-sm text-[#FF9A18] focus:bg-[#FF9A18]/10 focus:text-[#FF9A18]"
                              onSelect={(e) => {
                                e.preventDefault()
                                setDeleteTarget(transaction)
                              }}
                            >
                              <Trash2 className="size-4" />
                              Supprimer
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              )
            })}

            {visibleTransactions.length < transactions.length && (
              <div className="pt-3 text-center">
                <PillButton
                  variant="glass"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                >
                  Charger plus ({transactions.length - visibleTransactions.length} restants)
                </PillButton>
              </div>
            )}
          </div>
        </GlassPanel>
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
        onSuccess={fetchTransactions}
      />
    </div>
  )
}
