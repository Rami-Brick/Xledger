import { useEffect, useState, useCallback } from 'react'
import { useRole } from '@/lib/RoleProvider'
import {
  getTransactions,
  deleteTransaction,
  CATEGORIES,
  type Category,
} from '@/features/transactions/api'
import { categoryConfig } from '@/features/transactions/categories'
import EditTransactionDialog from '@/features/transactions/EditTransactionDialog'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatTND, formatDate } from '@/lib/format'
import { toast } from 'sonner'
import { Search, Trash2, X, Pencil } from 'lucide-react'

interface TransactionRow {
  id: string
  created_at: string
  date: string
  category: Category
  amount: number
  description: string | null
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

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<TransactionRow | null>(null)
  const [editTarget, setEditTarget] = useState<TransactionRow | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
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
        filtered = filtered.filter((t) => t.amount < 0)
      } else if (typeFilter === 'revenue') {
        filtered = filtered.filter((t) => t.amount > 0)
      }

      setTransactions(filtered)
    } catch {
      toast.error('Erreur lors du chargement des transactions')
    } finally {
      setLoading(false)
    }
  }, [search, categoryFilter, typeFilter, startDate, endDate])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

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

  const hasActiveFilters = search || categoryFilter !== 'all' || typeFilter !== 'all' || startDate || endDate
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0)

  return (
    <div className="w-full min-w-0">
      <div className="flex items-center justify-between mb-4">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold">Historique</h2>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
            {hasActiveFilters ? ' (filtré)' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
            <Search className="h-3.5 w-3.5 mr-1" />
            Filtres
          </Button>
        </div>
      </div>

      {/* Search — always visible */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Advanced filters — collapsible on mobile, always visible on desktop */}
      <div className={`space-y-3 mb-4 ${showFilters ? 'block' : 'hidden'} sm:block`}>
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="text-xs sm:text-sm">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="text-xs sm:text-sm">
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
            onChange={(e) => setStartDate(e.target.value)}
            className="text-xs sm:text-sm"
          />
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="text-xs sm:text-sm"
          />
        </div>
      </div>

      {/* Summary */}
      {transactions.length > 0 && (
        <div className="mb-3 text-xs sm:text-sm text-muted-foreground">
          Total:{' '}
          <span className={`font-semibold ${totalAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalAmount >= 0 ? '+' : ''}{formatTND(totalAmount)}
          </span>
        </div>
      )}

      {/* Transaction List */}
      {loading ? (
        <p className="text-muted-foreground py-8 text-center">Chargement...</p>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Aucune transaction trouvée.</p>
          {hasActiveFilters && (
            <Button variant="link" onClick={clearFilters} className="mt-2">
              Réinitialiser les filtres
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => {
            const config = categoryConfig[tx.category]
            const Icon = config.icon
            const entityName = getEntityName(tx)
            return (
              <Card key={tx.id}>
                <CardContent className="py-2.5 px-3 sm:py-3 sm:px-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* Icon */}
                    <div className={`p-1.5 sm:p-2 rounded-md shrink-0 ${config.color}`}>
                      <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${config.textColor}`} />
                    </div>

                    {/* Content — takes remaining space */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs sm:text-sm font-medium truncate">
                          {entityName || tx.description || tx.category}
                        </p>
                        <span
                          className={`text-xs sm:text-sm font-semibold shrink-0 ${
                            tx.amount >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {tx.amount >= 0 ? '+' : ''}{formatTND(tx.amount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0">
                            {formatDate(tx.date)}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0 leading-tight ${config.color} ${config.textColor} border`}
                          >
                            {tx.category}
                          </Badge>
                        </div>
                        {isAdmin && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => setEditTarget(tx)}
                            >
                              <Pencil className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 sm:h-7 sm:w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(tx)}
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
        description={`Êtes-vous sûr de vouloir supprimer cette transaction de ${deleteTarget ? formatTND(Math.abs(deleteTarget.amount)) : ''} ? Cette action est irréversible.`}
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