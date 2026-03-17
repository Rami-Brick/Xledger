import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { CATEGORIES, type Category } from '@/features/transactions/api'
import { categoryConfig } from '@/features/transactions/categories'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { formatTND } from '@/lib/format'
import { toast } from 'sonner'
import { Download } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface MonthlySummaryRow {
  month: string
  total_revenue: number
  total_expenses: number
  net: number
}

interface CategoryTotal {
  category: string
  total: number
  count: number
}

interface EmployeeSalaryTotal {
  name: string
  total_paid: number
  count: number
}

interface ProductExpenseTotal {
  name: string
  total: number
  count: number
}

interface ExportTransaction {
  date: string
  category: string
  description: string | null
  amount: number
  entity: string
}

function getDefaultDateRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  return {
    start: start.toISOString().split('T')[0],
    end: now.toISOString().split('T')[0],
  }
}

function formatMonthLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const label = d.toLocaleDateString('fr-TN', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function formatMonthShort(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-TN', { month: 'short', year: '2-digit' })
}

function downloadCSV(data: ExportTransaction[], filename: string) {
  const headers = ['Date', 'Catégorie', 'Détail', 'Description', 'Montant (TND)']
  const rows = data.map((t) => [
    t.date, t.category, t.entity, t.description || '', t.amount.toFixed(3),
  ])
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const defaults = getDefaultDateRange()
  const [startDate, setStartDate] = useState(defaults.start)
  const [endDate, setEndDate] = useState(defaults.end)
  const [activeTab, setActiveTab] = useState<'monthly' | 'categories' | 'employees' | 'products'>('monthly')

  const [monthlySummary, setMonthlySummary] = useState<MonthlySummaryRow[]>([])
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([])
  const [employeeTotals, setEmployeeTotals] = useState<EmployeeSalaryTotal[]>([])
  const [productTotals, setProductTotals] = useState<ProductExpenseTotal[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const fetchReports = useCallback(async () => {
    setLoading(true)
    try {
      const { data: monthlyData } = await supabase
        .from('monthly_summary').select('*').order('month', { ascending: true })
      setMonthlySummary((monthlyData || []).map((r) => ({
        month: r.month, total_revenue: Number(r.total_revenue),
        total_expenses: Number(r.total_expenses), net: Number(r.net),
      })))

      const { data: txData } = await supabase
        .from('transactions').select('category, amount')
        .gte('date', startDate).lte('date', endDate).lt('amount', 0)
      const catMap = new Map<string, { total: number; count: number }>()
      for (const tx of txData || []) {
        const e = catMap.get(tx.category) || { total: 0, count: 0 }
        e.total += Math.abs(Number(tx.amount)); e.count += 1
        catMap.set(tx.category, e)
      }
      setCategoryTotals(Array.from(catMap.entries())
        .map(([category, { total, count }]) => ({ category, total, count }))
        .sort((a, b) => b.total - a.total))

      const { data: salaryData } = await supabase
        .from('transactions').select('amount, employees(name)')
        .eq('category', 'Salaires').gte('date', startDate).lte('date', endDate)
        .not('employee_id', 'is', null)
      const empMap = new Map<string, { total: number; count: number }>()
      for (const tx of salaryData || []) {
        const name = (tx.employees as any)?.name || 'Inconnu'
        const e = empMap.get(name) || { total: 0, count: 0 }
        e.total += Math.abs(Number(tx.amount)); e.count += 1
        empMap.set(name, e)
      }
      setEmployeeTotals(Array.from(empMap.entries())
        .map(([name, { total, count }]) => ({ name, total_paid: total, count }))
        .sort((a, b) => b.total_paid - a.total_paid))

      const { data: productData } = await supabase
        .from('transactions').select('amount, products(name)')
        .eq('category', 'Fournisseurs').gte('date', startDate).lte('date', endDate)
        .not('product_id', 'is', null)
      const prodMap = new Map<string, { total: number; count: number }>()
      for (const tx of productData || []) {
        const name = (tx.products as any)?.name || 'Inconnu'
        const e = prodMap.get(name) || { total: 0, count: 0 }
        e.total += Math.abs(Number(tx.amount)); e.count += 1
        prodMap.set(name, e)
      }
      setProductTotals(Array.from(prodMap.entries())
        .map(([name, { total, count }]) => ({ name, total, count }))
        .sort((a, b) => b.total - a.total))
    } catch { toast.error('Erreur lors du chargement des rapports') }
    finally { setLoading(false) }
  }, [startDate, endDate])

  useEffect(() => { fetchReports() }, [fetchReports])

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          date, category, amount, description,
          employees(name), fixed_charges(name), products(name),
          subcategories(name), subscriptions(name), loan_contacts(name)
        `)
        .gte('date', startDate).lte('date', endDate).order('date', { ascending: true })
      if (error) throw error
      const exportData: ExportTransaction[] = (data || []).map((tx: any) => ({
        date: tx.date, category: tx.category, description: tx.description,
        amount: Number(tx.amount),
        entity:
          tx.employees?.name ||
          tx.fixed_charges?.name ||
          tx.products?.name ||
          tx.subcategories?.name ||
          tx.subscriptions?.name ||
          tx.loan_contacts?.name ||
          '',
      }))
      downloadCSV(exportData, `transactions_${startDate}_${endDate}.csv`)
      toast.success(`${exportData.length} transactions exportées`)
    } catch { toast.error("Erreur lors de l'export") }
    finally { setExporting(false) }
  }

  const chartData = monthlySummary.map((m) => ({
    month: formatMonthShort(m.month), Recettes: m.total_revenue, Dépenses: m.total_expenses,
  }))

  const catChartData = categoryTotals.map((c) => ({ name: c.category, total: c.total }))

  const tabs = [
    { key: 'monthly' as const, label: 'Mensuel' },
    { key: 'categories' as const, label: 'Catégories' },
    { key: 'employees' as const, label: 'Salaires' },
    { key: 'products' as const, label: 'Produits' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Rapports</h2>
          <p className="text-muted-foreground text-sm mt-1">Analyses financières</p>
        </div>
        <Button onClick={handleExportCSV} disabled={exporting} variant="outline" size="sm" className="gap-2 w-full sm:w-auto">
          <Download className="h-4 w-4" />
          {exporting ? 'Export...' : 'Exporter CSV'}
        </Button>
      </div>

      {/* Date Range */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Début</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fin</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={() => {
                const now = new Date()
                setStartDate(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0])
                setEndDate(now.toISOString().split('T')[0])
              }}>Ce mois</Button>
              <Button variant="ghost" size="sm" onClick={() => {
                const now = new Date()
                setStartDate(new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0])
                setEndDate(now.toISOString().split('T')[0])
              }}>Cette année</Button>
              <Button variant="ghost" size="sm" onClick={() => {
                setStartDate('2020-01-01')
                setEndDate(new Date().toISOString().split('T')[0])
              }}>Tout</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs — scrollable */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground py-8 text-center">Chargement...</p>
      ) : (
        <>
          {/* Monthly Summary */}
          {activeTab === 'monthly' && (
            <div className="space-y-4">
              {chartData.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Évolution mensuelle</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="month" fontSize={11} tickLine={false} />
                        <YAxis fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip formatter={(value) => formatTND(Number(value))} />
                        <Bar dataKey="Recettes" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Dépenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-3">
                {monthlySummary.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Aucune donnée</p>
                ) : (
                  [...monthlySummary].reverse().map((row) => (
                    <Card key={row.month}>
                      <CardContent className="py-3 px-4">
                        <p className="font-medium text-sm mb-2">{formatMonthLabel(row.month)}</p>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">Recettes</p>
                            <p className="font-semibold text-green-600">{formatTND(row.total_revenue)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Dépenses</p>
                            <p className="font-semibold text-red-600">{formatTND(row.total_expenses)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Net</p>
                            <p className={`font-semibold ${row.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {row.net >= 0 ? '+' : ''}{formatTND(row.net)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Category Breakdown */}
          {activeTab === 'categories' && (
            <div className="space-y-4">
              {catChartData.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Dépenses par catégorie</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={catChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" fontSize={11} tickLine={false} />
                        <YAxis type="category" dataKey="name" fontSize={11} tickLine={false} width={90} />
                        <Tooltip formatter={(value) => formatTND(Number(value))} />
                        <Bar dataKey="total" fill="#6366f1" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {categoryTotals.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucune dépense sur cette période</p>
              ) : (
                <div className="space-y-2">
                  {categoryTotals.map((row) => {
                    const config = categoryConfig[row.category as Category]
                    return (
                      <Card key={row.category}>
                        <CardContent className="py-3 px-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={config ? `${config.color} ${config.textColor} border text-[10px]` : ''}>
                                {row.category}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{row.count} tx</span>
                            </div>
                            <span className="font-semibold text-sm text-red-600">{formatTND(row.total)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                  <Card className="bg-muted/50">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between font-semibold text-sm">
                        <span>Total ({categoryTotals.reduce((s, r) => s + r.count, 0)} tx)</span>
                        <span className="text-red-600">{formatTND(categoryTotals.reduce((s, r) => s + r.total, 0))}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* Employee Salary Report */}
          {activeTab === 'employees' && (
            <div className="space-y-2">
              {employeeTotals.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucun paiement sur cette période</p>
              ) : (
                <>
                  {employeeTotals.map((row) => (
                    <Card key={row.name}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{row.name}</p>
                            <p className="text-xs text-muted-foreground">{row.count} paiement{row.count !== 1 ? 's' : ''}</p>
                          </div>
                          <span className="font-semibold text-sm">{formatTND(row.total_paid)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <Card className="bg-muted/50">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between font-semibold text-sm">
                        <span>Total ({employeeTotals.reduce((s, r) => s + r.count, 0)} paiements)</span>
                        <span>{formatTND(employeeTotals.reduce((s, r) => s + r.total_paid, 0))}</span>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* Product Expense Report */}
          {activeTab === 'products' && (
            <div className="space-y-2">
              {productTotals.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Aucune dépense fournisseur sur cette période</p>
              ) : (
                <>
                  {productTotals.map((row) => (
                    <Card key={row.name}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{row.name}</p>
                            <p className="text-xs text-muted-foreground">{row.count} transaction{row.count !== 1 ? 's' : ''}</p>
                          </div>
                          <span className="font-semibold text-sm text-red-600">{formatTND(row.total)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <Card className="bg-muted/50">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between font-semibold text-sm">
                        <span>Total ({productTotals.reduce((s, r) => s + r.count, 0)} tx)</span>
                        <span className="text-red-600">{formatTND(productTotals.reduce((s, r) => s + r.total, 0))}</span>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}