import { useEffect, useState, type FormEvent } from 'react'
import { getEmployees, type Employee } from '@/features/employees/api'
import { getEmployeeSalaryStatus } from '@/features/transactions/api'
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
import { toast } from 'sonner'
import InternalEntryField from './InternalEntryField'

interface SalairesFormProps {
  date: string
  initialData?: {
    amount: number
    description: string
    employee_id: string
    is_internal?: boolean
  }
  onSubmit: (data: {
    amount: number
    description: string
    employee_id: string
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

export default function SalairesForm({ date, initialData, onSubmit }: SalairesFormProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [salaryStatus, setSalaryStatus] = useState<SalaryStatus[]>([])
  const [selectedId, setSelectedId] = useState(initialData?.employee_id ?? '')
  const [amount, setAmount] = useState<number>(initialData?.amount ?? 0)
  const [isInternal, setIsInternal] = useState(initialData?.is_internal ?? false)
  const [loading, setLoading] = useState(false)
  const isEditing = !!initialData

  useEffect(() => {
    const load = async () => {
      try {
        const [employeesData, status] = await Promise.all([
          getEmployees(),
          getEmployeeSalaryStatus(),
        ])
        setEmployees(employeesData.filter((employee) => employee.is_active))
        setSalaryStatus(status as SalaryStatus[])
      } catch {
        toast.error('Erreur lors du chargement des employes')
      }
    }

    load()
  }, [])

  const selectedEmployee = employees.find((employee) => employee.id === selectedId)
  const selectedStatus = salaryStatus.find((status) => status.employee_id === selectedId)

  const handleEmployeeChange = (id: string) => {
    setSelectedId(id)
    if (!isEditing) {
      const status = salaryStatus.find((item) => item.employee_id === id)
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
        is_internal: isInternal,
      })

      if (!isEditing) {
        setSelectedId('')
        setAmount(0)
        setIsInternal(false)
      }

      const status = await getEmployeeSalaryStatus()
      setSalaryStatus(status as SalaryStatus[])
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

      {selectedStatus && (
        <div className="space-y-2 rounded-md bg-muted p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Salaire de base</span>
            <span className="font-medium">{formatTND(selectedStatus.base_salary)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Paye ce mois</span>
            <span className="font-medium">{formatTND(selectedStatus.paid_this_month)}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="font-medium">Restant</span>
            <span
              className={`font-bold ${
                selectedStatus.remaining > 0 ? 'text-orange-600' : 'text-green-600'
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
          step="0.001"
          min="0.001"
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
