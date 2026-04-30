import { useEffect, useState, type FormEvent } from 'react'
import { getEmployees, type Employee } from '@/features/employees/api'
import { MAIN_VIEW_TRANSACTIONS_FILTER } from '@/features/transactions/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatTND } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import InternalEntryField from './InternalEntryField'
import {
  formatSalaryMonthLabel,
  getEffectiveSalaryMonth,
  getMonthInputFromDate,
  normalizeSalaryMonth,
} from '@/features/transactions/salaryMonth'

interface SalairesFormProps {
  date: string
  initialData?: {
    amount: number
    description: string
    employee_id: string
    salary_month?: string | null
    is_internal?: boolean
  }
  onSubmit: (data: {
    amount: number
    description: string
    employee_id: string
    salary_month?: string | null
    is_internal?: boolean
  }) => Promise<void>
}

interface SalaryStatus {
  employee_id: string
  name: string
  base_salary: number
  paid_this_month: number
  remaining: number
}

interface SalaryTransactionRow {
  employee_id: string | null
  amount: number
  date: string
  salary_month: string | null
}

export default function SalairesForm({ date, initialData, onSubmit }: SalairesFormProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [salaryStatus, setSalaryStatus] = useState<SalaryStatus[]>([])
  const [salaryTransactions, setSalaryTransactions] = useState<SalaryTransactionRow[]>([])
  const [selectedId, setSelectedId] = useState(initialData?.employee_id ?? '')
  const [amount, setAmount] = useState<number>(initialData?.amount ?? 0)
  const [salaryMonth, setSalaryMonth] = useState(
    initialData?.salary_month ? getMonthInputFromDate(initialData.salary_month) : getMonthInputFromDate(date)
  )
  const [isInternal, setIsInternal] = useState(initialData?.is_internal ?? false)
  const [salaryMonthTouched, setSalaryMonthTouched] = useState(!!initialData?.salary_month)
  const [loading, setLoading] = useState(false)
  const isEditing = !!initialData

  const buildSalaryStatus = (employeesData: Employee[], transactions: SalaryTransactionRow[], monthValue: string) => {
    const targetMonth = normalizeSalaryMonth(monthValue)

    return employeesData
      .filter((employee) => employee.is_active)
      .map((employee) => {
        const employeeTransactions = transactions.filter(
          (transaction) =>
            transaction.employee_id === employee.id &&
            getEffectiveSalaryMonth(transaction) === targetMonth
        )

        const paidThisMonth = employeeTransactions.reduce(
          (sum, transaction) => sum + Math.abs(Number(transaction.amount)),
          0
        )

        return {
          employee_id: employee.id,
          name: employee.name,
          base_salary: Number(employee.base_salary),
          paid_this_month: paidThisMonth,
          remaining: Number(employee.base_salary) - paidThisMonth,
        }
      })
  }

  useEffect(() => {
    const load = async () => {
      try {
        const [employeesData, transactionsResult] = await Promise.all([
          getEmployees(),
          supabase
            .from('transactions')
            .select('employee_id, amount, date, salary_month')
            .eq('category', 'Salaires')
            .or(MAIN_VIEW_TRANSACTIONS_FILTER)
        ])

        if (transactionsResult.error) throw transactionsResult.error

        const activeEmployees = employeesData.filter((employee) => employee.is_active)
        const transactions = (transactionsResult.data || []) as SalaryTransactionRow[]

        setEmployees(activeEmployees)
        setSalaryTransactions(transactions)
        setSalaryStatus(buildSalaryStatus(activeEmployees, transactions, salaryMonth))
      } catch {
        toast.error('Erreur lors du chargement des employes')
      }
    }

    load()
  }, [])

  useEffect(() => {
    if (isEditing || salaryMonthTouched) return
    setSalaryMonth(getMonthInputFromDate(date))
  }, [date, isEditing, salaryMonthTouched])

  useEffect(() => {
    if (employees.length === 0) return
    setSalaryStatus(buildSalaryStatus(employees, salaryTransactions, salaryMonth))
  }, [employees, salaryMonth, salaryTransactions])

  const selectedEmployee = employees.find((employee) => employee.id === selectedId)
  const selectedStatus = salaryStatus.find((status) => status.employee_id === selectedId)
  const salaryMonthLabel = formatSalaryMonthLabel(salaryMonth)

  const handleEmployeeChange = (id: string) => {
    setSelectedId(id)
    if (!isEditing) {
      const status = buildSalaryStatus(employees, salaryTransactions, salaryMonth).find(
        (item) => item.employee_id === id
      )
      if (status && status.remaining > 0) {
        setAmount(status.remaining)
      } else {
        const employee = employees.find((item) => item.id === id)
        setAmount(employee?.base_salary || 0)
      }
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedId || amount <= 0) return

    setLoading(true)
    try {
      await onSubmit({
        amount,
        description: `Salaire - ${selectedEmployee?.name}`,
        employee_id: selectedId,
        salary_month: normalizeSalaryMonth(salaryMonth),
        is_internal: isInternal,
      })

      if (!isEditing) {
        setSelectedId('')
        setAmount(0)
        setSalaryMonth(getMonthInputFromDate(date))
        setSalaryMonthTouched(false)
        setIsInternal(false)
      }

      const { data, error } = await supabase
        .from('transactions')
        .select('employee_id, amount, date, salary_month')
        .eq('category', 'Salaires')
        .or(MAIN_VIEW_TRANSACTIONS_FILTER)

      if (error) throw error

      const transactions = (data || []) as SalaryTransactionRow[]
      setSalaryTransactions(transactions)
      setSalaryStatus(buildSalaryStatus(employees, transactions, salaryMonth))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Employe</Label>
        <Select value={selectedId} onValueChange={handleEmployeeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selectionner un employe" />
          </SelectTrigger>
          <SelectContent>
            {employees.map((employee) => (
              <SelectItem key={employee.id} value={employee.id}>
                {employee.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="salary-month">Mois du salaire</Label>
        <Input
          id="salary-month"
          type="month"
          value={salaryMonth}
          onChange={(event) => {
            const nextSalaryMonth = event.target.value
            setSalaryMonth(nextSalaryMonth)
            setSalaryMonthTouched(true)

            if (!isEditing && selectedId) {
              const status = buildSalaryStatus(employees, salaryTransactions, nextSalaryMonth).find(
                (item) => item.employee_id === selectedId
              )

              if (status && status.remaining > 0) {
                setAmount(status.remaining)
              } else {
                const employee = employees.find((item) => item.id === selectedId)
                setAmount(employee?.base_salary || 0)
              }
            }
          }}
          required
        />
      </div>

      {selectedStatus && (
        <div className="space-y-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm">
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/46">
            Calculs pour {salaryMonthLabel}
          </p>
          <div className="flex justify-between text-white/80">
            <span className="text-white/60">Salaire de base</span>
            <span className="font-medium tabular-nums text-white">{formatTND(selectedStatus.base_salary)}</span>
          </div>
          <div className="flex justify-between text-white/80">
            <span className="text-white/60">Payé ce mois</span>
            <span className="font-medium tabular-nums text-white">{formatTND(selectedStatus.paid_this_month)}</span>
          </div>
          <div className="flex justify-between border-t border-white/[0.06] pt-2">
            <span className="font-medium text-white">Restant</span>
            <span
              className={`font-bold tabular-nums ${
                selectedStatus.remaining > 0 ? 'text-[#FF9A18]' : 'text-[#B8EB3C]'
              }`}
            >
              {formatTND(selectedStatus.remaining)}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="amount">Montant (TND)</Label>
        <Input
          id="amount"
          type="number"
          step="1"
          min="1"
          value={amount || ''}
          onChange={(event) => setAmount(parseFloat(event.target.value) || 0)}
          required
        />
      </div>

      <InternalEntryField
        checked={isInternal}
        onCheckedChange={setIsInternal}
        categoryLabel="Salaires"
      />

      <Button type="submit" className="w-full" disabled={loading || !selectedId || amount <= 0}>
        {loading ? 'Enregistrement...' : 'Enregistrer le paiement'}
      </Button>
    </form>
  )
}
