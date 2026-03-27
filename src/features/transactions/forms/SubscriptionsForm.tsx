import { useState, useEffect, type FormEvent } from 'react'
import { getSubscriptions, type Subscription } from '@/features/subscriptions/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface Props {
  date: string
  initialData?: {
    amount: number
    description: string
    subscription_id: string
  }
  onSubmit: (data: { amount: number; description: string; subscription_id: string }) => Promise<void>
}

export default function SubscriptionsForm({ date, initialData, onSubmit }: Props) {
  const [subs, setSubs] = useState<Subscription[]>([])
  const [selectedId, setSelectedId] = useState(initialData?.subscription_id ?? '')
  const [amount, setAmount] = useState<number>(initialData?.amount ?? 0)
  const [loading, setLoading] = useState(false)
  const isEditing = !!initialData

  useEffect(() => {
    getSubscriptions().then((data) => setSubs(data.filter((s) => s.is_active))).catch(() => toast.error('Erreur chargement abonnements'))
  }, [])

  const selectedSub = subs.find((s) => s.id === selectedId)

  const handleChange = (id: string) => {
    setSelectedId(id)
    const sub = subs.find((s) => s.id === id)
    if (sub && !isEditing) setAmount(sub.default_amount)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedId || amount <= 0) return
    setLoading(true)
    try {
      await onSubmit({ amount, description: selectedSub?.name || '', subscription_id: selectedId })
      if (!isEditing) {
        setSelectedId(''); setAmount(0)
      }
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Abonnement</Label>
        <Select value={selectedId} onValueChange={handleChange}>
          <SelectTrigger><SelectValue placeholder="Sélectionner un abonnement" /></SelectTrigger>
          <SelectContent>
            {subs.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="amount">Montant (TND)</Label>
        <Input id="amount" type="number" step="0.001" min="0.001" value={amount || ''} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} required />
      </div>
      <Button type="submit" className="w-full" disabled={loading || !selectedId || amount <= 0}>
        {loading ? 'Enregistrement...' : 'Enregistrer la dépense'}
      </Button>
    </form>
  )
}