import { useEffect, useState, useCallback } from 'react'
import {
  getTransactions,
  deleteTransaction,
  CATEGORIES,
  type Category,
} from '@/features/transactions/api'
import { categoryConfig } from '@/features/transactions/categories'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatTND, formatDate } from '@/lib/format'
import { toast } from 'sonner'
import { Search, Trash2, X } from 'lucide-react'

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
  employees: { name: string } | null
  fixed_charges: { name: string } | null
  products: { name: string } | null
  subcategories: { name: string } | null
}

function getEntityName(tx: TransactionRow): string {
  if (tx.employees) return tx.employees.name
  if (tx.fixed_charges) return tx.fixed_charges.name
  if (tx.products) return tx.products.name
  if (tx.subcategories) return tx.subcategories.name
  return ''
}

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<TransactionRow | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

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
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Historique</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
            {hasActiveFilters ? ' (filtré)' : ''}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger>
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
          placeholder="Date début"
        />

        <div className="flex gap-2">
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="Date fin"
          />
          {hasActiveFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters} title="Réinitialiser">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Summary bar */}
      {transactions.length > 0 && (
        <div className="flex gap-6 mb-4 text-sm">
          <span className="text-muted-foreground">
            Total:{' '}
            <span className={`font-semibold ${totalAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalAmount >= 0 ? '+' : ''}{formatTND(totalAmount)}
            </span>
          </span>
        </div>
      )}

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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Détail</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => {
              const config = categoryConfig[tx.category]
              const entityName = getEntityName(tx)
              return (
                <TableRow key={tx.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(tx.date)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`${config.color} ${config.textColor} border`}
                    >
                      {tx.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {entityName || '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {tx.description || '—'}
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium whitespace-nowrap ${
                      tx.amount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {tx.amount >= 0 ? '+' : ''}
                    {formatTND(tx.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(tx)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Supprimer cette transaction ?"
        description={`Êtes-vous sûr de vouloir supprimer cette transaction de ${deleteTarget ? formatTND(Math.abs(deleteTarget.amount)) : ''} ? Cette action est irréversible.`}
        onConfirm={handleDelete}
      />
    </div>
  )
}