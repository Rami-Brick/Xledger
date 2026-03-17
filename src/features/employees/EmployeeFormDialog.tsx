import { useState, useEffect, type FormEvent } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Employee, EmployeeInsert } from './api'

interface EmployeeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee?: Employee | null
  onSubmit: (data: EmployeeInsert) => Promise<void>
}

const emptyForm: EmployeeInsert = {
  name: '',
  role: '',
  base_salary: 0,
  pay_day: 25,
  is_active: true,
}

export default function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
  onSubmit,
}: EmployeeFormDialogProps) {
  const [form, setForm] = useState<EmployeeInsert>(emptyForm)
  const [loading, setLoading] = useState(false)

  const isEditing = !!employee

  useEffect(() => {
    if (employee) {
      setForm({
        name: employee.name,
        role: employee.role || '',
        base_salary: employee.base_salary,
        pay_day: employee.pay_day,
        is_active: employee.is_active,
      })
    } else {
      setForm(emptyForm)
    }
  }, [employee, open])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit(form)
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier l\'employé' : 'Ajouter un employé'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom complet</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nom de l'employé"
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Rôle</Label>
            <Select
                value={form.role || ''}
                onValueChange={(value) => setForm({ ...form, role: value })}
            >
                <SelectTrigger>
                <SelectValue placeholder="Sélectionner un rôle" />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="CEO">CEO</SelectItem>
                <SelectItem value="Head of Marketing">Head of Marketing</SelectItem>
                <SelectItem value="Head of IT">Head of IT</SelectItem>
                <SelectItem value="Agent de confirmation">Agent de confirmation</SelectItem>
                </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="base_salary">Salaire de base (TND)</Label>
              <Input
                id="base_salary"
                type="number"
                step="0.001"
                min="0"
                value={form.base_salary || ''}
                onChange={(e) =>
                  setForm({ ...form, base_salary: parseFloat(e.target.value) || 0 })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay_day">Jour de paie</Label>
              <Input
                id="pay_day"
                type="number"
                min="1"
                max="28"
                value={form.pay_day}
                onChange={(e) =>
                  setForm({ ...form, pay_day: parseInt(e.target.value) || 25 })
                }
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Enregistrement...' : isEditing ? 'Modifier' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}