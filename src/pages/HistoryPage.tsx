import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useRole } from '@/lib/RoleProvider'
import {
  CATEGORIES,
  deleteTransaction,
  getTransactions,
  type Category,
} from '@/features/transactions/api'
import { categoryConfig } from '@/features/transactions/categories'
import EditTransactionDialog from '@/features/transactions/EditTransactionDialog'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog'
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
import { Pencil, Search, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

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

function getEntityName(tx: TransactionRow): string {
  if (tx.employees) return tx.employees.name
  if (tx.fixed_charges) return tx.fixed_charges.name
  if (tx.products) return tx.products.name
  if (tx.subcategories) return tx.subcategories.name
  if (tx.subscriptions) return tx.subscriptions.name
  if (tx.loan_contacts) return tx.loan_contacts.name
  return ''
}

function getCategoryFilterFromSearchParams(searchParams: URLSearchParams) {
  const category = searchParams.get('category')
  return category && CATEGORIES.includes(category as Category) ? category : 'all'
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
  const { isAdmin } = useRole()

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getTransactions({
        category: categoryFilter !== 'all' ? (categoryFilter as Category) : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: search || undefined,
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
  }, [categoryFilter, endDate, search, startDate, typeFilter])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  useEffect(() => {
    const categoryFromUrl = getCategoryFilterFromSearchParams(searchParams)
    setCategoryFilter((current) => (current === categoryFromUrl ? current : categoryFromUrl))
  }, [searchParams])

  useEffect(() => {
    const currentCategory = searchParams.get('category')

    if (categoryFilter === 'all') {
      if (!currentCategory) return

      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('category')
      setSearchParams(nextParams, { replace: true })
      return
    }

    if (currentCategory === categoryFilter) return

    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('category', categoryFilter)
    setSearchParams(nextParams, { replace: true })
  }, [categoryFilter, searchParams, setSearchParams])

  const handleDelete = async () => {
    if (!deleteTarget) return

    try {
      await deleteTransaction(deleteTarget.id)
      toast.success('Transaction supprimée')
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
  }

  const hasActiveFilters =
    search || categoryFilter !== 'all' || typeFilter !== 'all' || startDate || endDate
  const totalAmount = transactions.reduce((sum, transaction) => sum + transaction.amount, 0)

  return (
    <div className="w-full min-w-0">
      <div className="mb-4 flex items-center justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-bold sm:text-2xl">Historique</h2>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
            {hasActiveFilters ? ' (filtré)' : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-xs">
              <X className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Réinitialiser</span>
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
            <Label htmlFor="history-category-filter" className="shrink-0 text-xs text-muted-foreground">
              Catégories
            </Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger id="history-category-filter" className="flex-1 text-xs sm:text-sm">
                <SelectValue placeholder="Catégorie" />
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
                <SelectItem value="expense">Dépenses</SelectItem>
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
          <p>Aucune transaction trouvée.</p>
          {hasActiveFilters && (
            <Button variant="link" onClick={clearFilters} className="mt-2">
              Réinitialiser les filtres
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
        description={`Êtes-vous sûr de vouloir supprimer cette transaction de ${
          deleteTarget ? formatTND(Math.abs(deleteTarget.amount)) : ''
        } ? Cette action est irréversible.`}
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
