import { useState, useEffect, type FormEvent } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { InvestmentRecipient, InvestmentRecipientInsert } from './api'

type InvestmentRecipientFormData = Omit<InvestmentRecipientInsert, 'branch_id'>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  recipient?: InvestmentRecipient | null
  onSubmit: (data: InvestmentRecipientFormData) => Promise<void>
}

const emptyForm: InvestmentRecipientFormData = { name: '', description: '', is_active: true }

export default function InvestmentRecipientFormDialog({ open, onOpenChange, recipient, onSubmit }: Props) {
  const [form, setForm] = useState<InvestmentRecipientFormData>(emptyForm)
  const [loading, setLoading] = useState(false)
  const isEditing = !!recipient

  useEffect(() => {
    if (recipient) {
      setForm({ name: recipient.name, description: recipient.description || '', is_active: recipient.is_active })
    } else {
      setForm(emptyForm)
    }
  }, [recipient, open])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try { await onSubmit(form); onOpenChange(false) }
    finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Modifier le bénéficiaire' : 'Ajouter un bénéficiaire'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom du bénéficiaire" required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optionnel)</Label>
            <Input id="description" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex: tunisieGT, Libya Branch Fund" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Enregistrement...' : isEditing ? 'Modifier' : 'Ajouter'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
