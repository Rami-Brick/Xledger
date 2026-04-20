import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Plus,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { MAIN_VIEW_TRANSACTIONS_FILTER } from '@/features/transactions/api'
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
import {
  CircularIconButton,
  GlassPanel,
  PillButton,
} from '@/components/system-ui/primitives'
import { PrimaryCTA } from '@/components/system-ui/compounds'
import { cn } from '@/lib/utils'

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

function getPayDayStatus(payDay: number): { label: string; icon: LucideIcon; className: string } {
  const today = new Date()
  const currentDay = today.getDate()

  if (currentDay < payDay) {
    return { label: `Le ${payDay}`, icon: Clock, className: 'text-white/60' }
  }

  if (currentDay === payDay) {
    return { label: "Aujourd'hui", icon: AlertCircle, className: 'text-[#FF9A18]' }
  }

  return { label: 'Dépassé', icon: AlertCircle, className: 'text-[#D94BF4]' }
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

      const transactionsQuery = supabase
        .from('transactions')
        .select('employee_id, amount, date, salary_month')
        .eq('category', 'Salaires')
        .or(MAIN_VIEW_TRANSACTIONS_FILTER)

      const { data: transactions, error: transactionsError } = await transactionsQuery
      if (transactionsError) throw transactionsError

      const filteredTransactions = isAllTime
        ? transactions || []
        : (transactions || []).filter(
            (transaction) =>
              getEffectiveSalaryMonth(transaction) === normalizeSalaryMonth(selectedMonth),
          )

      const statusList: SalaryStatus[] = (employees || []).map((employee) => {
        const employeeTransactions = filteredTransactions.filter(
          (transaction) => transaction.employee_id === employee.id,
        )
        const paidInPeriod = employeeTransactions.reduce(
          (sum, transaction) => sum + Math.abs(Number(transaction.amount)),
          0,
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
      const historyQuery = supabase
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
            (transaction) =>
              getEffectiveSalaryMonth(transaction) === normalizeSalaryMonth(selectedMonth),
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

  return (
    <div className="relative w-full min-w-0">
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 -left-40 h-[480px] w-[480px] rounded-full blur-3xl"
        style={{ background: 'rgba(92,214,180,0.10)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -bottom-40 -right-40 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{ background: 'rgba(154,255,90,0.10)' }}
      />

      <div className="relative z-10 space-y-4">
        {/* Back row */}
        <div className="flex items-center gap-3">
          <CircularIconButton
            variant="glass"
            size="sm"
            icon={<ArrowLeft />}
            aria-label="Retour"
            onClick={() => navigate(-1)}
          />
          <span className="text-xs text-white/60">Toutes les catégories</span>
        </div>

        {/* Header + toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="text-xl font-semibold tracking-tight text-white md:text-2xl">
              Salaires
            </h1>
            <p className="text-xs text-white/60">Suivi des paiements de salaires</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-8 min-w-[160px] rounded-full border-white/[0.08] bg-white/[0.04] text-xs text-white">
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

            <PillButton
              variant="glass"
              size="sm"
              trailingIcon={<ArrowRight />}
              onClick={() => navigate('/historique?category=Salaires')}
            >
              Voir tout
            </PillButton>

            {canCreateTransactions && (
              <>
                <CircularIconButton
                  variant="light"
                  size="md"
                  icon={<Plus />}
                  aria-label="Payer un salaire"
                  onClick={() => navigate('/ajouter?category=Salaires')}
                  className="md:hidden"
                />
                <PrimaryCTA
                  label="Payer un salaire"
                  icon={<Plus />}
                  aria-label="Payer un salaire"
                  onClick={() => navigate('/ajouter?category=Salaires')}
                  className="hidden md:inline-flex"
                />
              </>
            )}
          </div>
        </div>

        {/* Summary stats */}
        <GlassPanel className="p-4 md:p-5">
          <div className="grid grid-cols-3 gap-3">
            <StatCell label={isAllTime ? 'Base mensuelle' : 'Base'} value={formatTND(totalBase)} />
            <StatCell
              label={isAllTime ? 'Payé total' : 'Payé'}
              value={formatTND(totalPaid)}
              valueClass="text-[#B8EB3C]"
            />
            <StatCell
              label={isAllTime ? 'Paiements' : 'Restant'}
              value={isAllTime ? String(totalPayments) : formatTND(totalRemaining)}
              valueClass={
                isAllTime
                  ? 'text-white'
                  : totalRemaining > 0
                    ? 'text-[#FF9A18]'
                    : 'text-[#B8EB3C]'
              }
            />
          </div>
        </GlassPanel>

        {loading ? (
          <GlassPanel className="p-6">
            <p className="py-6 text-center text-sm text-white/46">Chargement…</p>
          </GlassPanel>
        ) : statuses.length === 0 ? (
          <GlassPanel className="p-6">
            <div className="flex flex-col items-center gap-3 py-12 text-center text-white/60">
              <Users className="size-10 opacity-50" />
              <p className="text-sm">Aucun employé actif.</p>
              <PillButton
                variant="glass"
                size="sm"
                onClick={() => navigate('/parametres/employes')}
              >
                Gérer les employés
              </PillButton>
            </div>
          </GlassPanel>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {statuses.map((employee) => {
              const paidPercent =
                employee.base_salary > 0
                  ? Math.min((employee.paid_in_period / employee.base_salary) * 100, 100)
                  : 0
              const isFullyPaid = employee.remaining <= 0
              const isOverpaid = employee.remaining < 0
              const payStatus = isCurrentMonth ? getPayDayStatus(employee.pay_day) : null
              const PayStatusIcon = payStatus?.icon
              const isExpanded = expandedEmployee === employee.employee_id

              return (
                <GlassPanel
                  key={employee.employee_id}
                  className={cn(
                    'cursor-pointer p-4 md:p-5 transition-colors hover:bg-white/[0.06]',
                    !isAllTime && isFullyPaid && 'ring-1 ring-[#B8EB3C]/20',
                  )}
                  onClick={() => loadEmployeeHistory(employee.employee_id)}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white md:text-base">
                          {employee.name}
                        </p>
                        {employee.role && (
                          <p className="text-[11px] text-white/46">{employee.role}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {isAllTime ? (
                          <span className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/72">
                            {employee.payment_count} paiement
                            {employee.payment_count !== 1 ? 's' : ''}
                          </span>
                        ) : isFullyPaid ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#B8EB3C]/15 px-2 py-0.5 text-[10px] font-medium text-[#B8EB3C]">
                            <CheckCircle2 className="size-3" />
                            Payé
                          </span>
                        ) : payStatus && PayStatusIcon ? (
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px]',
                              payStatus.className,
                            )}
                          >
                            <Calendar className="size-3" />
                            {payStatus.label}
                          </span>
                        ) : null}
                        {isExpanded ? (
                          <ChevronUp className="size-4 text-white/46" />
                        ) : (
                          <ChevronDown className="size-4 text-white/46" />
                        )}
                      </div>
                    </div>

                    {isAllTime ? (
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div>
                          <p className="text-white/46">Base</p>
                          <p className="mt-0.5 font-medium tabular-nums text-white">
                            {formatTND(employee.base_salary)}
                          </p>
                        </div>
                        <div>
                          <p className="text-white/46">Payé total</p>
                          <p className="mt-0.5 font-medium tabular-nums text-[#B8EB3C]">
                            {formatTND(employee.paid_in_period)}
                          </p>
                        </div>
                        <div>
                          <p className="text-white/46">Paiements</p>
                          <p className="mt-0.5 font-medium tabular-nums text-white">
                            {employee.payment_count}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-baseline justify-between text-[11px]">
                          <span className="tabular-nums text-white/60">
                            {formatTND(employee.paid_in_period)}
                          </span>
                          <span className="font-medium tabular-nums text-white">
                            {formatTND(employee.base_salary)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              isFullyPaid ? 'bg-[#B8EB3C]' : 'bg-[#2D7CF6]',
                            )}
                            style={{ width: `${paidPercent}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/60">Restant</span>
                          <span
                            className={cn(
                              'font-semibold tabular-nums',
                              isOverpaid
                                ? 'text-[#D94BF4]'
                                : isFullyPaid
                                  ? 'text-[#B8EB3C]'
                                  : 'text-[#FF9A18]',
                            )}
                          >
                            {isOverpaid
                              ? `Surplus ${formatTND(Math.abs(employee.remaining))}`
                              : formatTND(employee.remaining)}
                          </span>
                        </div>
                      </div>
                    )}

                    {isExpanded && (
                      <div
                        className="flex flex-col gap-2 border-t border-white/[0.06] pt-3"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <p className="text-[11px] font-medium text-white/72">
                          {isAllTime ? 'Historique complet' : 'Historique des paiements'}
                        </p>
                        {historyLoading ? (
                          <p className="text-[11px] text-white/46">Chargement…</p>
                        ) : employeeHistory.length === 0 ? (
                          <p className="text-[11px] text-white/46">
                            {isAllTime ? 'Aucun paiement enregistré' : 'Aucun paiement ce mois'}
                          </p>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            {employeeHistory.map((transaction) => {
                              const monthDiffers =
                                isSalaryMonthDifferentFromEntryDate(transaction)
                              return (
                                <div
                                  key={transaction.id}
                                  className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-3 py-2 text-[11px]"
                                >
                                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                    <span className="shrink-0 text-white/60">
                                      {formatDate(transaction.date)}
                                    </span>
                                    <span className="shrink-0 text-white/30">·</span>
                                    <span
                                      className={cn(
                                        'shrink-0',
                                        monthDiffers ? 'text-[#FF9A18]' : 'text-white/72',
                                      )}
                                    >
                                      Salaire{' '}
                                      {formatSalaryMonthLabel(
                                        transaction.salary_month ?? transaction.date,
                                      )}
                                    </span>
                                    {transaction.is_internal && (
                                      <>
                                        <span className="shrink-0 text-white/30">·</span>
                                        <span className="shrink-0 text-white/60">Interne</span>
                                      </>
                                    )}
                                    {transaction.description && (
                                      <>
                                        <span className="shrink-0 text-white/30">·</span>
                                        <span className="truncate text-white/46">
                                          {transaction.description}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                  <span className="shrink-0 font-medium tabular-nums text-white">
                                    {formatTND(Math.abs(transaction.amount))}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </GlassPanel>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCell({
  label,
  value,
  valueClass,
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="truncate text-[11px] text-white/46">{label}</span>
      <span
        className={cn(
          'truncate text-base font-semibold tracking-tight tabular-nums md:text-lg',
          valueClass ?? 'text-white',
        )}
      >
        {value}
      </span>
    </div>
  )
}
