import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useRole } from '@/lib/RoleProvider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDate, formatTND } from '@/lib/format'
import { toast } from 'sonner'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Users,
} from 'lucide-react'

interface SalaryStatus {
  employee_id: string
  name: string
  role: string | null
  base_salary: number
  pay_day: number
  paid_in_period: number
  remaining: number
  payment_count: number
}

interface SalaryTransaction {
  id: string
  date: string
  amount: number
  description: string | null
}

const ALL_MONTHS_VALUE = 'all'

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
  }

  if (currentDay === payDay) {
    return { label: "Aujourd'hui", icon: AlertCircle, color: 'text-orange-600' }
  }

  return { label: 'Dépassé', icon: AlertCircle, color: 'text-red-600' }
}

function generateMonthOptions(): { value: string; label: string }[] {
  const options = [{ value: ALL_MONTHS_VALUE, label: 'Tous' }]
  const now = new Date()

  for (let index = 0; index < 12; index += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1)
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const label = date.toLocaleDateString('fr-TN', { month: 'long', year: 'numeric' })
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
  const isAllTime = selectedMonth === ALL_MONTHS_VALUE
  const isCurrentMonth = !isAllTime && selectedMonth === getCurrentMonth()

  const fetchStatuses = useCallback(async () => {
    setLoading(true)
    setExpandedEmployee(null)

    try {
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (employeesError) throw employeesError

      let transactionsQuery = supabase
        .from('transactions')
        .select('employee_id, amount')
        .eq('category', 'Salaires')

      if (!isAllTime) {
        const { startDate, endDate } = getMonthDateRange(selectedMonth)
        transactionsQuery = transactionsQuery.gte('date', startDate).lte('date', endDate)
      }

      const { data: transactions, error: transactionsError } = await transactionsQuery

      if (transactionsError) throw transactionsError

      const statusList: SalaryStatus[] = (employees || []).map((employee) => {
        const employeeTransactions = (transactions || []).filter(
          (transaction) => transaction.employee_id === employee.id
        )
        const paidInPeriod = employeeTransactions.reduce(
          (sum, transaction) => sum + Math.abs(Number(transaction.amount)),
          0
        )

        return {
          employee_id: employee.id,
          name: employee.name,
          role: employee.role,
          base_salary: Number(employee.base_salary),
          pay_day: employee.pay_day,
          paid_in_period: paidInPeriod,
          remaining: Number(employee.base_salary) - paidInPeriod,
          payment_count: employeeTransactions.length,
        }
      })

      setStatuses(statusList)
    } catch {
      toast.error('Erreur lors du chargement des salaires')
    } finally {
      setLoading(false)
    }
  }, [isAllTime, selectedMonth])

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
      let historyQuery = supabase
        .from('transactions')
        .select('id, date, amount, description')
        .eq('category', 'Salaires')
        .eq('employee_id', employeeId)

      if (!isAllTime) {
        const { startDate, endDate } = getMonthDateRange(selectedMonth)
        historyQuery = historyQuery.gte('date', startDate).lte('date', endDate)
      }

      const { data, error } = await historyQuery.order('date', { ascending: true })

      if (error) throw error
      setEmployeeHistory(data as SalaryTransaction[])
    } catch {
      toast.error("Erreur lors du chargement de l'historique")
    } finally {
      setHistoryLoading(false)
    }
  }

  const totalBase = statuses.reduce((sum, employee) => sum + employee.base_salary, 0)
  const totalPaid = statuses.reduce((sum, employee) => sum + employee.paid_in_period, 0)
  const totalRemaining = statuses.reduce((sum, employee) => sum + employee.remaining, 0)
  const totalPayments = statuses.reduce((sum, employee) => sum + employee.payment_count, 0)

  if (loading) return <p className="text-muted-foreground">Chargement...</p>

  return (
    <div className="space-y-6">
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
          <p className="mt-1 text-sm text-muted-foreground">Suivi des paiements de salaires</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => navigate('/historique?category=Salaires')}
            className="gap-2 w-full sm:w-auto"
          >
            Voir tout
            <ArrowRight className="h-4 w-4" />
          </Button>

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

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="px-3 pb-4 pt-4 sm:px-6 sm:pt-6">
            <p className="text-xs text-muted-foreground sm:text-sm">
              {isAllTime ? 'Base mensuelle' : 'Base'}
            </p>
            <p className="mt-1 text-base font-bold sm:text-xl">{formatTND(totalBase)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-3 pb-4 pt-4 sm:px-6 sm:pt-6">
            <p className="text-xs text-muted-foreground sm:text-sm">
              {isAllTime ? 'Payé total' : 'Payé'}
            </p>
            <p className="mt-1 text-base font-bold text-green-600 sm:text-xl">{formatTND(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-3 pb-4 pt-4 sm:px-6 sm:pt-6">
            <p className="text-xs text-muted-foreground sm:text-sm">
              {isAllTime ? 'Paiements' : 'Restant'}
            </p>
            <p
              className={`mt-1 text-base font-bold sm:text-xl ${
                isAllTime
                  ? 'text-foreground'
                  : totalRemaining > 0
                    ? 'text-orange-600'
                    : 'text-green-600'
              }`}
            >
              {isAllTime ? totalPayments : formatTND(totalRemaining)}
            </p>
          </CardContent>
        </Card>
      </div>

      {statuses.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <Users className="mx-auto mb-3 h-10 w-10 opacity-50" />
          <p>Aucun employé actif.</p>
          <Button variant="link" onClick={() => navigate('/parametres/employes')} className="mt-2">
            Gérer les employés
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {statuses.map((employee) => {
            const paidPercent =
              employee.base_salary > 0
                ? Math.min((employee.paid_in_period / employee.base_salary) * 100, 100)
                : 0
            const isFullyPaid = employee.remaining <= 0
            const isOverpaid = employee.remaining < 0
            const payStatus = isCurrentMonth ? getPayDayStatus(employee.pay_day) : null
            const isExpanded = expandedEmployee === employee.employee_id

            return (
              <Card
                key={employee.employee_id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  !isAllTime && isFullyPaid ? 'border-green-200 bg-green-50/30' : ''
                }`}
                onClick={() => loadEmployeeHistory(employee.employee_id)}
              >
                <CardContent className="space-y-3 px-4 pb-4 pt-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold sm:text-base">{employee.name}</p>
                      {employee.role && <p className="text-xs text-muted-foreground">{employee.role}</p>}
                    </div>
                    <div className="shrink-0">
                      {isAllTime ? (
                        <Badge variant="outline" className="text-[10px]">
                          {employee.payment_count} paiement{employee.payment_count !== 1 ? 's' : ''}
                        </Badge>
                      ) : isFullyPaid ? (
                        <Badge className="bg-green-100 text-[10px] text-green-700 hover:bg-green-100">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Payé
                        </Badge>
                      ) : payStatus ? (
                        <Badge variant="outline" className={`${payStatus.color} text-[10px]`}>
                          <Calendar className="mr-1 h-3 w-3" />
                          {payStatus.label}
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  {isAllTime ? (
                    <div className="grid grid-cols-3 gap-3 text-xs sm:text-sm">
                      <div>
                        <p className="text-muted-foreground">Base mensuelle</p>
                        <p className="mt-1 font-medium">{formatTND(employee.base_salary)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Payé total</p>
                        <p className="mt-1 font-medium text-green-600">{formatTND(employee.paid_in_period)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Paiements</p>
                        <p className="mt-1 font-medium">{employee.payment_count}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="mb-1.5 flex justify-between text-xs sm:text-sm">
                          <span className="text-muted-foreground">{formatTND(employee.paid_in_period)}</span>
                          <span className="font-medium">{formatTND(employee.base_salary)}</span>
                        </div>
                        <Progress
                          value={paidPercent}
                          className={`h-2 ${
                            isFullyPaid ? '[&>div]:bg-green-500' : '[&>div]:bg-blue-500'
                          }`}
                        />
                      </div>

                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">Restant</span>
                        <span
                          className={`font-semibold ${
                            isOverpaid
                              ? 'text-red-600'
                              : isFullyPaid
                                ? 'text-green-600'
                                : 'text-orange-600'
                          }`}
                        >
                          {isOverpaid
                            ? `Surplus: ${formatTND(Math.abs(employee.remaining))}`
                            : formatTND(employee.remaining)}
                        </span>
                      </div>
                    </>
                  )}

                  {isExpanded && (
                    <div className="border-t pt-3" onClick={(event) => event.stopPropagation()}>
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        {isAllTime ? 'Historique complet' : 'Historique des paiements'}
                      </p>
                      {historyLoading ? (
                        <p className="text-xs text-muted-foreground">Chargement...</p>
                      ) : employeeHistory.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {isAllTime ? 'Aucun paiement enregistré' : 'Aucun paiement ce mois'}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {employeeHistory.map((transaction) => (
                            <div key={transaction.id} className="flex items-center justify-between text-xs">
                              <div className="min-w-0">
                                <span className="text-muted-foreground">{formatDate(transaction.date)}</span>
                                {transaction.description && (
                                  <span className="ml-2 truncate text-muted-foreground">
                                    · {transaction.description}
                                  </span>
                                )}
                              </div>
                              <span className="ml-3 shrink-0 font-medium">
                                {formatTND(Math.abs(transaction.amount))}
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
