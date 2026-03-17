import { useState, useEffect, type FormEvent } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Subscription, SubscriptionInsert } from './api'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  subscription?: Subscription | null
  onSubmit: (data: SubscriptionInsert) => Promise<void>
}

const emptyForm: SubscriptionInsert = { name: '', default_amount: 0, is_active: true }

export default function SubscriptionFormDialog({ open, onOpenChange, subscription, onSubmit }: Props) {
  const [form, setForm] = useState<SubscriptionInsert>(emptyForm)
  const [loading, setLoading] = useState(false)
  const isEditing = !!subscription

  useEffect(() => {
    if (subscription) {
      setForm({ name: subscription.name, default_amount: subscription.default_amount, is_active: subscription.is_active })
    } else {
      setForm(emptyForm)
    }
  }, [subscription, open])

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
          <DialogTitle>{isEditing ? 'Modifier l\'abonnement' : 'Ajouter un abonnement'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom du service</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Claude, ChatGPT, Canva" required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Montant par défaut (TND)</Label>
            <Input id="amount" type="number" step="0.001" min="0" value={form.default_amount} onChange={(e) => setForm({ ...form, default_amount: parseFloat(e.target.value) || 0 })} required />
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