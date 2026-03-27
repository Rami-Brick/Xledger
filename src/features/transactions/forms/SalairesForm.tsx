import { useState, useEffect, type FormEvent } from 'react'
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

interface SalairesFormProps {
  date: string
  initialData?: {
    amount: number
    description: string
    employee_id: string
  }
  onSubmit: (data: {
    amount: number
    description: string
    employee_id: string
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
  const [loading, setLoading] = useState(false)
  const isEditing = !!initialData

  useEffect(() => {
    const load = async () => {
      try {
        const [emps, status] = await Promise.all([
          getEmployees(),
          getEmployeeSalaryStatus(),
        ])
        setEmployees(emps.filter((e) => e.is_active))
        setSalaryStatus(status as SalaryStatus[])
      } catch {
        toast.error('Erreur lors du chargement des employés')
      }
    }
    load()
  }, [])

  const selectedEmployee = employees.find((e) => e.id === selectedId)
  const selectedStatus = salaryStatus.find((s) => s.employee_id === selectedId)

  const handleEmployeeChange = (id: string) => {
    setSelectedId(id)
    if (!isEditing) {
      const status = salaryStatus.find((s) => s.employee_id === id)
      if (status && status.remaining > 0) {
        setAmount(status.remaining)
      } else {
        const emp = employees.find((e) => e.id === id)
        setAmount(emp?.base_salary || 0)
      }
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedId || amount <= 0) return
    setLoading(true)
    try {
      await onSubmit({
        amount,
        description: `Salaire — ${selectedEmployee?.name}`,
        employee_id: selectedId,
      })
      if (!isEditing) {
        setSelectedId('')
        setAmount(0)
      }
      // Refresh salary status after payment
      const status = await getEmployeeSalaryStatus()
      setSalaryStatus(status as SalaryStatus[])
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Employé</Label>
        <Select value={selectedId} onValueChange={handleEmployeeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un employé" />
          </SelectTrigger>
          <SelectContent>
            {employees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedStatus && (
        <div className="rounded-md bg-muted p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Salaire de base</span>
            <span className="font-medium">{formatTND(selectedStatus.base_salary)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payé ce mois</span>
            <span className="font-medium">{formatTND(selectedStatus.paid_this_month)}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="font-medium">Restant</span>
            <span className={`font-bold ${selectedStatus.remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
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
          onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading || !selectedId || amount <= 0}>
        {loading ? 'Enregistrement...' : 'Enregistrer le paiement'}
      </Button>
    </form>
  )
}