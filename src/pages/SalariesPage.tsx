import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useRole } from '@/lib/RoleProvider'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatTND, formatDate } from '@/lib/format'
import { toast } from 'sonner'
import { Users, ArrowRight, ArrowLeft, Calendar, CheckCircle2, AlertCircle, Clock } from 'lucide-react'

interface SalaryStatus {
  employee_id: string
  name: string
  role: string | null
  base_salary: number
  pay_day: number
  paid_this_month: number
  remaining: number
}

interface SalaryTransaction {
  id: string
  date: string
  amount: number
  description: string | null
}

function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getMonthDateRange(monthStr: string): { startDate: string; endDate: string } {
  const [year, month] = monthStr.split('-').map(Number)
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { startDate, endDate }
}

function getPayDayStatus(payDay: number): { label: string; icon: typeof CheckCircle2; color: string } {
  const today = new Date()
  const currentDay = today.getDate()
  if (currentDay < payDay) {
    return { label: `Le ${payDay}`, icon: Clock, color: 'text-muted-foreground' }
  } else if (currentDay === payDay) {
    return { label: "Aujourd'hui", icon: AlertCircle, color: 'text-orange-600' }
  } else {
    return { label: 'Dépassé', icon: AlertCircle, color: 'text-red-600' }
  }
}

function generateMonthOptions(): { value: string; label: string }[] {
  const options = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('fr-TN', { month: 'long', year: 'numeric' })
    options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) })
  }
  return options
}

export default function SalariesPage() {
  const navigate = useNavigate()
  const { isAdmin } = useRole()
  const [statuses, setStatuses] = useState<SalaryStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth)
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null)
  const [employeeHistory, setEmployeeHistory] = useState<SalaryTransaction[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)


  const monthOptions = generateMonthOptions()
  const isCurrentMonth = selectedMonth === getCurrentMonth()

  const fetchStatuses = useCallback(async () => {
    setLoading(true)
    setExpandedEmployee(null)
    try {
      const { startDate, endDate } = getMonthDateRange(selectedMonth)

      const { data: employees, error: empErr } = await supabase
        .from('employees')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (empErr) throw empErr

      const { data: transactions, error: txErr } = await supabase
        .from('transactions')
        .select('employee_id, amount')
        .eq('category', 'Salaires')
        .gte('date', startDate)
        .lte('date', endDate)

      if (txErr) throw txErr

      const statusList: SalaryStatus[] = (employees || []).map((emp) => {
        const empTx = (transactions || []).filter((t) => t.employee_id === emp.id)
        const paid = empTx.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)
        return {
          employee_id: emp.id,
          name: emp.name,
          role: emp.role,
          base_salary: Number(emp.base_salary),
          pay_day: emp.pay_day,
          paid_this_month: paid,
          remaining: Number(emp.base_salary) - paid,
        }
      })

      setStatuses(statusList)
    } catch {
      toast.error('Erreur lors du chargement des salaires')
    } finally {
      setLoading(false)
    }
  }, [selectedMonth])

  useEffect(() => {
    fetchStatuses()
  }, [fetchStatuses])

  const loadEmployeeHistory = async (employeeId: string) => {
    if (expandedEmployee === employeeId) {
      setExpandedEmployee(null)
      return
    }
    setHistoryLoading(true)
    setExpandedEmployee(employeeId)
    try {
      const { startDate, endDate } = getMonthDateRange(selectedMonth)

      const { data, error } = await supabase
        .from('transactions')
        .select('id, date, amount, description')
        .eq('category', 'Salaires')
        .eq('employee_id', employeeId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      if (error) throw error
      setEmployeeHistory(data as SalaryTransaction[])
    } catch {
      toast.error("Erreur lors du chargement de l'historique")
    } finally {
      setHistoryLoading(false)
    }
  }

  const totalBase = statuses.reduce((s, e) => s + e.base_salary, 0)
  const totalPaid = statuses.reduce((s, e) => s + e.paid_this_month, 0)
  const totalRemaining = statuses.reduce((s, e) => s + e.remaining, 0)

  if (loading) return <p className="text-muted-foreground">Chargement...</p>

  return (
    <div className="space-y-6">
      {/* Header — stacks on mobile */}
      <div className="space-y-4">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-3 gap-2 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Toutes les catégories
          </Button>
          <h2 className="text-2xl font-bold">Salaires</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Suivi des paiements de salaires
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isAdmin && (
            <Button
              onClick={() => navigate('/ajouter?category=Salaires')}
              className="gap-2 w-full sm:w-auto"
            >
              Payer un salaire
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4 px-3 sm:pt-6 sm:px-6">
            <p className="text-xs sm:text-sm text-muted-foreground">Base</p>
            <p className="text-base sm:text-xl font-bold mt-1">{formatTND(totalBase)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 px-3 sm:pt-6 sm:px-6">
            <p className="text-xs sm:text-sm text-muted-foreground">Payé</p>
            <p className="text-base sm:text-xl font-bold mt-1 text-green-600">{formatTND(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 px-3 sm:pt-6 sm:px-6">
            <p className="text-xs sm:text-sm text-muted-foreground">Restant</p>
            <p className={`text-base sm:text-xl font-bold mt-1 ${totalRemaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {formatTND(totalRemaining)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Employee Cards */}
      {statuses.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>Aucun employé actif.</p>
          <Button variant="link" onClick={() => navigate('/parametres/employes')} className="mt-2">
            Gérer les employés
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {statuses.map((emp) => {
            const paidPercent = emp.base_salary > 0
              ? Math.min((emp.paid_this_month / emp.base_salary) * 100, 100)
              : 0
            const isFullyPaid = emp.remaining <= 0
            const isOverpaid = emp.remaining < 0
            const payStatus = isCurrentMonth ? getPayDayStatus(emp.pay_day) : null
            const isExpanded = expandedEmployee === emp.employee_id

            return (
              <Card
                key={emp.employee_id}
                className={`cursor-pointer transition-all hover:shadow-md ${isFullyPaid ? 'border-green-200 bg-green-50/30' : ''}`}
                onClick={() => loadEmployeeHistory(emp.employee_id)}
              >
                <CardContent className="pt-5 pb-4 px-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm sm:text-base truncate">{emp.name}</p>
                      {emp.role && (
                        <p className="text-xs text-muted-foreground">{emp.role}</p>
                      )}
                    </div>
                    <div className="shrink-0">
                      {isFullyPaid ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-[10px]">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Payé
                        </Badge>
                      ) : payStatus ? (
                        <Badge variant="outline" className={`${payStatus.color} text-[10px]`}>
                          <Calendar className="h-3 w-3 mr-1" />
                          {payStatus.label}
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  {/* Progress */}
                  <div>
                    <div className="flex justify-between text-xs sm:text-sm mb-1.5">
                      <span className="text-muted-foreground">
                        {formatTND(emp.paid_this_month)}
                      </span>
                      <span className="font-medium">
                        {formatTND(emp.base_salary)}
                      </span>
                    </div>
                    <Progress
                      value={paidPercent}
                      className={`h-2 ${isFullyPaid ? '[&>div]:bg-green-500' : '[&>div]:bg-blue-500'}`}
                    />
                  </div>

                  {/* Remaining */}
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Restant</span>
                    <span className={`font-semibold ${
                      isOverpaid ? 'text-red-600' : isFullyPaid ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {isOverpaid ? `Surplus: ${formatTND(Math.abs(emp.remaining))}` : formatTND(emp.remaining)}
                    </span>
                  </div>

                  {/* Expanded Payment History */}
                  {isExpanded && (
                    <div className="border-t pt-3" onClick={(e) => e.stopPropagation()}>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Historique des paiements
                      </p>
                      {historyLoading ? (
                        <p className="text-xs text-muted-foreground">Chargement...</p>
                      ) : employeeHistory.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Aucun paiement ce mois</p>
                      ) : (
                        <div className="space-y-2">
                          {employeeHistory.map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between text-xs">
                              <div className="min-w-0">
                                <span className="text-muted-foreground">{formatDate(tx.date)}</span>
                                {tx.description && (
                                  <span className="text-muted-foreground ml-2 truncate">· {tx.description}</span>
                                )}
                              </div>
                              <span className="font-medium shrink-0 ml-3">
                                {formatTND(Math.abs(tx.amount))}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}