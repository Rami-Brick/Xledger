import { useState, useEffect, type FormEvent } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { FixedCharge, FixedChargeInsert } from './api'

interface FixedChargeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  charge?: FixedCharge | null
  onSubmit: (data: FixedChargeInsert) => Promise<void>
}

const emptyForm: FixedChargeInsert = {
  name: '',
  default_amount: 0,
  is_active: true,
}

export default function FixedChargeFormDialog({
  open,
  onOpenChange,
  charge,
  onSubmit,
}: FixedChargeFormDialogProps) {
  const [form, setForm] = useState<FixedChargeInsert>(emptyForm)
  const [loading, setLoading] = useState(false)

  const isEditing = !!charge

  useEffect(() => {
    if (charge) {
      setForm({
        name: charge.name,
        default_amount: charge.default_amount,
        is_active: charge.is_active,
      })
    } else {
      setForm(emptyForm)
    }
  }, [charge, open])

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
            {isEditing ? 'Modifier la charge' : 'Ajouter une charge fixe'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom de la charge</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Loyer bureau, Internet, Électricité"
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="default_amount">Montant par défaut (TND)</Label>
            <Input
              id="default_amount"
              type="number"
              step="0.001"
              min="0"
              value={form.default_amount}
              onChange={(e) =>
                setForm({ ...form, default_amount: parseFloat(e.target.value) || 0 })
              }
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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