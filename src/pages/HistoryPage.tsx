import { useCallback, useEffect, useState } from 'react'
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
import { categoryConfig } from '@/features/transactions/categories'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog'
import EditTransactionDialog from '@/features/transactions/EditTransactionDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

export default function HistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [loading, setLoading] = useState(true)
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
  const { isAdmin } = useRole()

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getTransactions({
        category: categoryFilter !== 'all' ? (categoryFilter as Category) : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: search || undefined,
        includeInternal: showInternalEntries,
      })

      let filtered = data as TransactionRow[]

      if (typeFilter === 'expense') {
        filtered = filtered.filter((transaction) => transaction.amount < 0)
      } else if (typeFilter === 'revenue') {
        filtered = filtered.filter((transaction) => transaction.amount > 0)
      }

      setTransactions(filtered)
    } catch {
      toast.error('Erreur lors du chargement des transactions')
    } finally {
      setLoading(false)
    }
  }, [categoryFilter, endDate, search, showInternalEntries, startDate, typeFilter])

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
    <div className="w-full min-w-0">
      <div className="mb-4 flex items-center justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-bold sm:text-2xl">Historique</h2>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
            {hasActiveFilters ? ' (filtre)' : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-xs">
              <X className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reinitialiser</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="text-xs sm:hidden"
          >
            <Search className="mr-1 h-3.5 w-3.5" />
            Filtres
          </Button>
        </div>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-9"
        />
      </div>

      <div className={`mb-4 space-y-3 ${showFilters ? 'block' : 'hidden'} sm:block`}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <Label
              htmlFor="history-category-filter"
              className="shrink-0 text-xs text-muted-foreground"
            >
              Categories
            </Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger id="history-category-filter" className="flex-1 text-xs sm:text-sm">
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

          <div className="flex items-center gap-2">
            <Label htmlFor="history-type-filter" className="shrink-0 text-xs text-muted-foreground">
              Type
            </Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger id="history-type-filter" className="flex-1 text-xs sm:text-sm">
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
            className="text-xs sm:text-sm"
          />
          <Input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="text-xs sm:text-sm"
          />

          <div className="flex items-center gap-2 rounded-md border px-3 py-2 sm:col-span-2">
            <input
              id="history-include-internal"
              type="checkbox"
              checked={showInternalEntries}
              onChange={(event) => setShowInternalEntries(event.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <Label
              htmlFor="history-include-internal"
              className="cursor-pointer text-xs text-muted-foreground sm:text-sm"
            >
              Entrees internes
            </Label>
          </div>
        </div>
      </div>

      {transactions.length > 0 && (
        <div className="mb-3 text-xs text-muted-foreground sm:text-sm">
          Total:{' '}
          <span className={`font-semibold ${totalAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalAmount >= 0 ? '+' : ''}
            {formatTND(totalAmount)}
          </span>
        </div>
      )}

      {loading ? (
        <p className="py-8 text-center text-muted-foreground">Chargement...</p>
      ) : transactions.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p>Aucune transaction trouvee.</p>
          {hasActiveFilters && (
            <Button variant="link" onClick={clearFilters} className="mt-2">
              Reinitialiser les filtres
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((transaction) => {
            const config = categoryConfig[transaction.category]
            const Icon = config.icon
            const entityName = getEntityName(transaction)

            return (
              <Card key={transaction.id}>
                <CardContent className="px-3 py-2.5 sm:px-4 sm:py-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`shrink-0 rounded-md p-1.5 sm:p-2 ${config.color}`}>
                      <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${config.textColor}`} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-medium sm:text-sm">
                          {entityName || transaction.description || transaction.category}
                        </p>
                        <span
                          className={`shrink-0 text-xs font-semibold sm:text-sm ${
                            transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {transaction.amount >= 0 ? '+' : ''}
                          {formatTND(transaction.amount)}
                        </span>
                      </div>

                      <div className="mt-0.5 flex items-center justify-between">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span className="shrink-0 text-[10px] text-muted-foreground sm:text-xs">
                            {formatDate(transaction.date)}
                          </span>
                          <Badge
                            variant="outline"
                            className={`border px-1 py-0 text-[8px] leading-tight sm:px-1.5 sm:text-[10px] ${config.color} ${config.textColor}`}
                          >
                            {transaction.category}
                          </Badge>
                          {transaction.is_internal && (
                            <Badge variant="secondary" className="text-[8px] sm:text-[10px]">
                              Interne
                            </Badge>
                          )}
                        </div>

                        {isAdmin && (
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-foreground sm:h-7 sm:w-7"
                              onClick={() => setEditTarget(transaction)}
                            >
                              <Pencil className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive sm:h-7 sm:w-7"
                              onClick={() => setDeleteTarget(transaction)}
                            >
                              <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
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
