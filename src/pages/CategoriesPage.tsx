import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useRole } from '@/lib/RoleProvider'
import {
  CATEGORIES,
  MAIN_VIEW_TRANSACTIONS_FILTER,
  deleteTransaction,
  getTransactions,
  type Category,
} from '@/features/transactions/api'
import { categoryConfig } from '@/features/transactions/categories'
import { getFixedCharges, type FixedCharge } from '@/features/fixed-charges/api'
import { getProducts, type Product } from '@/features/products/api'
import { getSubcategories, type Subcategory } from '@/features/subcategories/api'
import { getSubscriptions, type Subscription } from '@/features/subscriptions/api'
import { getLoanContacts, getLoanBalances, type LoanContact } from '@/features/loan-contacts/api'
import EditTransactionDialog from '@/features/transactions/EditTransactionDialog'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { formatTND, formatDate } from '@/lib/format'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Pencil, Plus, Trash2 } from 'lucide-react'

interface CategorySummary {
  category: string
  count: number
  total: number
}

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

interface LoanBalance {
  loan_contact_id: string
  name: string
  total_lent: number
  total_repaid: number
  remaining: number
}

function getEntityName(tx: TransactionRow): string {
  if (tx.employees) return tx.employees.name
  if (tx.fixed_charges) return tx.fixed_charges.name
  if (tx.products) return tx.products.name
  if (tx.subcategories) return tx.subcategories.name
  if (tx.subscriptions) return tx.subscriptions.name
  if (tx.loan_contacts) return tx.loan_contacts.name
  return tx.description || ''
}

function getCurrentMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const end = now.toISOString().split('T')[0]
  return { start, end }
}

export default function CategoriesPage() {
  const navigate = useNavigate()
  const { canTransact } = useRole()
  const [summaries, setSummaries] = useState<CategorySummary[]>([])
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [categoryTransactions, setCategoryTransactions] = useState<TransactionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [editTarget, setEditTarget] = useState<TransactionRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TransactionRow | null>(null)

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

      for (const tx of data || []) {
        const existing = map.get(tx.category)!
        existing.count += 1
        existing.total += Math.abs(Number(tx.amount))
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
    const transactions = await getTransactions({
      category,
      includeInternal: category === 'Prêts',
    })

    setCategoryTransactions(
      (category === 'Prêts' ? transactions : transactions.slice(0, 15)) as TransactionRow[]
    )

    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]

    let allTimeQuery = supabase.from('transactions').select('amount').eq('category', category)
    let thisMonthQuery = supabase.from('transactions').select('amount').eq('category', category).gte('date', thisMonthStart)
    let lastMonthQuery = supabase.from('transactions').select('amount').eq('category', category).gte('date', lastMonthStart).lte('date', lastMonthEnd)

    if (category !== 'Prêts') {
      allTimeQuery = allTimeQuery.or(MAIN_VIEW_TRANSACTIONS_FILTER)
      thisMonthQuery = thisMonthQuery.or(MAIN_VIEW_TRANSACTIONS_FILTER)
      lastMonthQuery = lastMonthQuery.or(MAIN_VIEW_TRANSACTIONS_FILTER)
    }

    const [allTime, thisMonth, lastMonth] = await Promise.all([
      allTimeQuery,
      thisMonthQuery,
      lastMonthQuery,
    ])

    setAllTimeTotal((allTime.data || []).reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0))
    setThisMonthTotal((thisMonth.data || []).reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0))
    setLastMonthTotal((lastMonth.data || []).reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0))

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
      toast.error('Erreur chargement détails')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    try {
      await deleteTransaction(deleteTarget.id)
      toast.success('Transaction supprimée')
      setDeleteTarget(null)
      await fetchSummaries()
      if (selectedCategory) {
        await fetchCategoryDetail(selectedCategory)
      }
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  if (!selectedCategory) {
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Catégories</h2>
          <p className="text-muted-foreground text-sm mt-1">Vue d&apos;ensemble par catégorie — ce mois</p>
        </div>

        {loading ? (
          <p className="text-muted-foreground py-8 text-center">Chargement...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {summaries.map((summary) => {
              const config = categoryConfig[summary.category as Category]
              const Icon = config.icon
              return (
                <Card
                  key={summary.category}
                  className={`cursor-pointer border-2 transition-all hover:shadow-md ${config.color}`}
                  onClick={() => openDetail(summary.category as Category)}
                >
                  <CardContent className="py-5 px-3">
                    <div className="flex flex-col items-center text-center gap-2">
                      <Icon className={`h-7 w-7 ${config.textColor}`} />
                      <span className={`text-xs sm:text-sm font-medium ${config.textColor}`}>{config.label}</span>
                    </div>
                    <div className="mt-3 text-center space-y-1">
                      <p className="text-lg font-bold">{formatTND(summary.total)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {summary.count} transaction{summary.count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </CardContent>
                </Card>
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
          <Card>
            <CardContent className="pt-5 pb-3">
              <p className="text-sm font-medium mb-3">Charges enregistrées</p>
              <div className="space-y-2">
                {activeCharges.map((charge) => (
                  <div key={charge.id} className="flex items-center justify-between text-sm py-1">
                    <span>{charge.name}</span>
                    <span className="text-muted-foreground">{formatTND(charge.default_amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      }

      case 'Fournisseurs': {
        const activeProducts = products.filter((product) => product.is_active)
        if (activeProducts.length === 0) return null

        return (
          <Card>
            <CardContent className="pt-5 pb-3">
              <p className="text-sm font-medium mb-3">Produits actifs</p>
              <div className="space-y-2">
                {activeProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between text-sm py-1">
                    <span>{product.name}</span>
                    {product.description && (
                      <span className="text-xs text-muted-foreground">{product.description}</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      }

      case 'Transport':
      case 'Packaging': {
        const activeSubcategories = subcategories.filter(
          (subcategory) => subcategory.category === selectedCategory && subcategory.is_active
        )
        if (activeSubcategories.length === 0) return null

        return (
          <Card>
            <CardContent className="pt-5 pb-3">
              <p className="text-sm font-medium mb-3">Sous-catégories</p>
              <div className="flex flex-wrap gap-2">
                {activeSubcategories.map((subcategory) => (
                  <Badge key={subcategory.id} variant="outline">{subcategory.name}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      }

      case 'Subscriptions': {
        const activeSubscriptions = subscriptions.filter((subscription) => subscription.is_active)
        if (activeSubscriptions.length === 0) return null

        return (
          <Card>
            <CardContent className="pt-5 pb-3">
              <p className="text-sm font-medium mb-3">Abonnements actifs</p>
              <div className="space-y-2">
                {activeSubscriptions.map((subscription) => (
                  <div key={subscription.id} className="flex items-center justify-between text-sm py-1">
                    <span>{subscription.name}</span>
                    <span className="text-muted-foreground">{formatTND(subscription.default_amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      }

      case 'Prêts': {
        if (loanBalances.length === 0 && loanContacts.length === 0) return null

        const totalReceived = loanBalances.reduce((sum, balance) => sum + balance.total_lent, 0)
        const totalReturned = loanBalances.reduce((sum, balance) => sum + balance.total_repaid, 0)
        const totalRemaining = loanBalances.reduce((sum, balance) => sum + balance.remaining, 0)

        return (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="pt-4 pb-4 px-3">
                  <p className="text-xs text-muted-foreground">Total reçu</p>
                  <p className="text-base font-bold mt-1">{formatTND(totalReceived)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 px-3">
                  <p className="text-xs text-muted-foreground">Total rendu</p>
                  <p className="text-base font-bold mt-1 text-green-600">{formatTND(totalReturned)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-4 px-3">
                  <p className="text-xs text-muted-foreground">Reste</p>
                  <p className={`text-base font-bold mt-1 ${totalRemaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {formatTND(totalRemaining)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {loanBalances.length > 0 && (
              <Card>
                <CardContent className="pt-5 pb-3">
                  <p className="text-sm font-medium mb-3">Soldes par personne</p>
                  <div className="space-y-3">
                    {loanBalances.map((balance) => {
                      const percent = balance.total_lent > 0
                        ? Math.min((balance.total_repaid / balance.total_lent) * 100, 100)
                        : 0

                      return (
                        <div key={balance.loan_contact_id} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{balance.name}</span>
                            <span className={`text-xs font-semibold ${balance.remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                              {balance.remaining > 0 ? `Reste: ${formatTND(balance.remaining)}` : 'Soldé'}
                            </span>
                          </div>
                          <Progress
                            value={percent}
                            className={`h-1.5 ${balance.remaining <= 0 ? '[&>div]:bg-green-500' : '[&>div]:bg-blue-500'}`}
                          />
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Rendu: {formatTND(balance.total_repaid)}</span>
                            <span>Reçu: {formatTND(balance.total_lent)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )
      }

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedCategory(null)}
          className="mb-3 gap-2 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Toutes les catégories
        </Button>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-md ${config.color}`}>
            <Icon className={`h-6 w-6 ${config.textColor}`} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{config.label}</h2>
            <p className="text-muted-foreground text-sm">Vue détaillée</p>
          </div>
        </div>
      </div>

      {detailLoading ? (
        <p className="text-muted-foreground py-8 text-center">Chargement...</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4 pb-4 px-3">
                <p className="text-xs text-muted-foreground">Ce mois</p>
                <p className="text-base sm:text-lg font-bold mt-1">{formatTND(thisMonthTotal)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 px-3">
                <p className="text-xs text-muted-foreground">Mois dernier</p>
                <p className="text-base sm:text-lg font-bold mt-1">{formatTND(lastMonthTotal)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 px-3">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-base sm:text-lg font-bold mt-1">{formatTND(allTimeTotal)}</p>
              </CardContent>
            </Card>
          </div>

          {canTransact && (
            <Button
              onClick={() => navigate(`/ajouter?category=${encodeURIComponent(selectedCategory)}`)}
              className="gap-2 w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Ajouter une transaction {config.label}
            </Button>
          )}

          {renderEntities()}

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">
                {selectedCategory === 'Prêts' ? 'Historique des prêts' : 'Transactions récentes'}
              </p>
              {selectedCategory !== 'Prêts' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/historique')}
                  className="text-xs gap-1"
                >
                  Voir tout <ArrowRight className="h-3 w-3" />
                </Button>
              )}
            </div>

            {categoryTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Aucune transaction</p>
            ) : (
              <div className="space-y-2">
                {categoryTransactions.map((tx) => {
                  const entityName = getEntityName(tx)

                  return (
                    <Card key={tx.id}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {entityName || tx.description || selectedCategory}
                              </p>
                              {tx.is_internal && (
                                <Badge variant="secondary" className="text-[10px] shrink-0">
                                  Interne
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-sm font-semibold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {tx.amount >= 0 ? '+' : ''}{formatTND(tx.amount)}
                            </span>
                            {selectedCategory === 'Prêts' && canTransact && (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  onClick={() => setEditTarget(tx)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteTarget(tx)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </>
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
