import { useState, useEffect, type FormEvent } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { LoanContact, LoanContactInsert } from './api'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact?: LoanContact | null
  onSubmit: (data: LoanContactInsert) => Promise<void>
}

const emptyForm: LoanContactInsert = { name: '', description: '', is_active: true }

export default function LoanContactFormDialog({ open, onOpenChange, contact, onSubmit }: Props) {
  const [form, setForm] = useState<LoanContactInsert>(emptyForm)
  const [loading, setLoading] = useState(false)
  const isEditing = !!contact

  useEffect(() => {
    if (contact) {
      setForm({ name: contact.name, description: contact.description || '', is_active: contact.is_active })
    } else {
      setForm(emptyForm)
    }
  }, [contact, open])

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
          <DialogTitle>{isEditing ? 'Modifier le contact' : 'Ajouter un contact'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom de la personne" required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optionnel)</Label>
            <Input id="description" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex: Ami de Firas, Fournisseur X" />
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