import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { MAIN_VIEW_TRANSACTIONS_FILTER } from '@/features/transactions/api'
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
import { useRole } from '@/lib/RoleProvider'
import { formatDate, formatTND } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import {
  formatSalaryMonthLabel,
  getEffectiveSalaryMonth,
  isSalaryMonthDifferentFromEntryDate,
  normalizeSalaryMonth,
} from '@/features/transactions/salaryMonth'

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
  salary_month: string | null
  amount: number
  description: string | null
  is_internal: boolean | null
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
    return { label: "Aujourd'hui", icon: AlertCircle, color: 'text-destructive' }
  }

  return { label: 'Dépassé', icon: AlertCircle, color: 'text-destructive' }
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
  const { canCreateTransactions } = useRole()
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
        .select('employee_id, amount, date, salary_month')
        .eq('category', 'Salaires')
        .or(MAIN_VIEW_TRANSACTIONS_FILTER)

      const { data: transactions, error: transactionsError } = await transactionsQuery
      if (transactionsError) throw transactionsError

      const filteredTransactions = isAllTime
        ? transactions || []
        : (transactions || []).filter(
            (transaction) => getEffectiveSalaryMonth(transaction) === normalizeSalaryMonth(selectedMonth)
          )

      const statusList: SalaryStatus[] = (employees || []).map((employee) => {
        const employeeTransactions = filteredTransactions.filter(
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
        .select('id, date, salary_month, amount, description, is_internal')
        .eq('category', 'Salaires')
        .eq('employee_id', employeeId)

      const { data, error } = await historyQuery.order('date', { ascending: true })
      if (error) throw error

      const transactions = (data || []) as SalaryTransaction[]
      const filteredTransactions = isAllTime
        ? transactions
        : transactions.filter(
            (transaction) => getEffectiveSalaryMonth(transaction) === normalizeSalaryMonth(selectedMonth)
          )

      setEmployeeHistory(filteredTransactions)
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

  if (loading) {
    return (
      <div className="space-y-6 max-w-[1400px] min-w-0">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted/60" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-muted/60" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1400px] min-w-0">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-3 gap-2 text-foreground hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          Toutes les catégories
        </Button>
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50">
            <Users className="h-5 w-5 text-blue-700" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[22px] sm:text-[28px] font-semibold tracking-tight leading-tight">
              Salaires
            </h2>
            <p className="text-[13px] sm:text-sm text-muted-foreground">
              Suivi des paiements de salaires
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="h-9 w-full sm:w-[220px] rounded-lg text-[13px]">
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
          size="sm"
          onClick={() => navigate('/historique?category=Salaires')}
          className="h-9 gap-2 rounded-lg"
        >
          Voir tout
          <ArrowRight className="h-4 w-4" />
        </Button>

        {canCreateTransactions && (
          <Button
            size="sm"
            onClick={() => navigate('/ajouter?category=Salaires')}
            className="h-9 gap-2 rounded-lg"
          >
            Payer un salaire
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="premium-surface surface-tint-violet rounded-2xl px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {isAllTime ? 'Base mensuelle' : 'Base'}
          </p>
          <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-foreground">
            {formatTND(totalBase)}
          </p>
        </div>
        <div className="premium-surface surface-tint-success rounded-2xl px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {isAllTime ? 'Payé total' : 'Payé'}
          </p>
          <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight text-success">
            {formatTND(totalPaid)}
          </p>
        </div>
        <div
          className={`premium-surface ${
            isAllTime
              ? 'surface-tint-gold'
              : totalRemaining > 0
                ? 'surface-tint-warning'
                : 'surface-tint-success'
          } rounded-2xl px-5 py-4`}
        >
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {isAllTime ? 'Paiements' : 'Restant'}
          </p>
          <p
            className={`mt-2 text-xl font-semibold tabular-nums tracking-tight ${
              isAllTime
                ? 'text-foreground'
                : totalRemaining > 0
                  ? 'text-destructive'
                  : 'text-success'
            }`}
          >
            {isAllTime ? totalPayments : formatTND(totalRemaining)}
          </p>
        </div>
      </div>

      {statuses.length === 0 ? (
        <div className="premium-surface rounded-2xl p-12 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-60" />
          <p className="text-sm text-muted-foreground">Aucun employé actif</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/parametres/employes')}
            className="mt-3 text-foreground"
          >
            Gérer les employés
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {statuses.map((employee) => {
            const paidPercent =
              employee.base_salary > 0
                ? Math.min((employee.paid_in_period / employee.base_salary) * 100, 100)
                : 0
            const isFullyPaid = employee.remaining <= 0
            const isOverpaid = employee.remaining < 0
            const payStatus = isCurrentMonth ? getPayDayStatus(employee.pay_day) : null
            const isExpanded = expandedEmployee === employee.employee_id
            const cardTint =
              !isAllTime && isFullyPaid ? 'surface-tint-success' : 'surface-tint-violet'

            return (
              <button
                key={employee.employee_id}
                type="button"
                onClick={() => loadEmployeeHistory(employee.employee_id)}
                className={`premium-surface ${cardTint} rounded-2xl p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold tracking-tight text-foreground">
                        {employee.name}
                      </p>
                      {employee.role && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {employee.role}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0">
                      {isAllTime ? (
                        <Badge
                          variant="outline"
                          className="h-5 rounded-full px-2 text-[10px] font-medium"
                        >
                          {employee.payment_count} paiement
                          {employee.payment_count !== 1 ? 's' : ''}
                        </Badge>
                      ) : isFullyPaid ? (
                        <Badge className="h-5 gap-1 rounded-full bg-success-soft px-2 text-[10px] font-medium text-success hover:bg-success-soft">
                          <CheckCircle2 className="h-3 w-3" />
                          Payé
                        </Badge>
                      ) : payStatus ? (
                        <Badge
                          variant="outline"
                          className={`h-5 gap-1 rounded-full px-2 text-[10px] font-medium ${payStatus.color}`}
                        >
                          <Calendar className="h-3 w-3" />
                          {payStatus.label}
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  {isAllTime ? (
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Base
                        </p>
                        <p className="mt-1 text-[13px] font-semibold tabular-nums text-foreground">
                          {formatTND(employee.base_salary)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Payé
                        </p>
                        <p className="mt-1 text-[13px] font-semibold tabular-nums text-success">
                          {formatTND(employee.paid_in_period)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Paiements
                        </p>
                        <p className="mt-1 text-[13px] font-semibold tabular-nums text-foreground">
                          {employee.payment_count}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="mb-1.5 flex justify-between text-xs">
                          <span className="tabular-nums text-muted-foreground">
                            {formatTND(employee.paid_in_period)}
                          </span>
                          <span className="tabular-nums font-medium text-foreground">
                            {formatTND(employee.base_salary)}
                          </span>
                        </div>
                        <Progress
                          value={paidPercent}
                          className={`h-2 ${
                            isFullyPaid ? '[&>div]:bg-success' : '[&>div]:bg-brand-accent'
                          }`}
                        />
                      </div>

                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Restant</span>
                        <span
                          className={`font-semibold tabular-nums ${
                            isOverpaid
                              ? 'text-destructive'
                              : isFullyPaid
                                ? 'text-success'
                                : 'text-destructive'
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
                    <div
                      className="border-t border-border/50 pt-3"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {isAllTime ? 'Historique complet' : 'Historique des paiements'}
                      </p>
                      {historyLoading ? (
                        <p className="text-xs text-muted-foreground">Chargement...</p>
                      ) : employeeHistory.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {isAllTime ? 'Aucun paiement enregistré' : 'Aucun paiement ce mois'}
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          {employeeHistory.map((transaction) => (
                            <div
                              key={transaction.id}
                              className="flex items-center justify-between gap-2 rounded-xl bg-muted/40 px-2.5 py-1.5 text-xs"
                            >
                              <div className="min-w-0 flex items-center flex-wrap gap-1.5">
                                <span className="tabular-nums text-muted-foreground">
                                  {formatDate(transaction.date)}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`h-4 rounded-full px-1.5 text-[9px] font-medium ${
                                    isSalaryMonthDifferentFromEntryDate(transaction)
                                      ? 'border-destructive/30 bg-warning-soft text-destructive'
                                      : ''
                                  }`}
                                >
                                  {formatSalaryMonthLabel(
                                    transaction.salary_month ?? transaction.date
                                  )}
                                </Badge>
                                {transaction.is_internal && (
                                  <Badge
                                    variant="secondary"
                                    className="h-4 rounded-full px-1.5 text-[9px] font-medium"
                                  >
                                    Interne
                                  </Badge>
                                )}
                                {transaction.description && (
                                  <span className="truncate text-muted-foreground">
                                    · {transaction.description}
                                  </span>
                                )}
                              </div>
                              <span className="shrink-0 tabular-nums font-semibold text-foreground">
                                {formatTND(Math.abs(transaction.amount))}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
