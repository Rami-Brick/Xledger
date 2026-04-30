import { useEffect, useState, type FormEvent } from 'react'
import { getSubscriptions, type Subscription } from '@/features/subscriptions/api'
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
import { toast } from 'sonner'
import InternalEntryField from './InternalEntryField'

interface Props {
  date: string
  initialData?: {
    amount: number
    description: string
    subscription_id: string
    is_internal?: boolean
  }
  onSubmit: (data: {
    amount: number
    description: string
    subscription_id: string
    is_internal?: boolean
  }) => Promise<void>
}

export default function SubscriptionsForm({ initialData, onSubmit }: Props) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [selectedId, setSelectedId] = useState(initialData?.subscription_id ?? '')
  const [amount, setAmount] = useState<number>(initialData?.amount ?? 0)
  const [isInternal, setIsInternal] = useState(initialData?.is_internal ?? false)
  const [loading, setLoading] = useState(false)
  const isEditing = !!initialData

  useEffect(() => {
    getSubscriptions()
      .then((data) => setSubscriptions(data.filter((subscription) => subscription.is_active)))
      .catch(() => toast.error('Erreur chargement abonnements'))
  }, [])

  const selectedSubscription = subscriptions.find((subscription) => subscription.id === selectedId)

  const handleChange = (id: string) => {
    setSelectedId(id)
    const subscription = subscriptions.find((item) => item.id === id)
    if (subscription && !isEditing) setAmount(subscription.default_amount)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedId || amount <= 0) return

    setLoading(true)
    try {
      await onSubmit({
        amount,
        description: selectedSubscription?.name || '',
        subscription_id: selectedId,
        is_internal: isInternal,
      })
      if (!isEditing) {
        setSelectedId('')
        setAmount(0)
        setIsInternal(false)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Abonnement</Label>
        <Select value={selectedId} onValueChange={handleChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selectionner un abonnement" />
          </SelectTrigger>
          <SelectContent>
            {subscriptions.map((subscription) => (
              <SelectItem key={subscription.id} value={subscription.id}>
                {subscription.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
        categoryLabel="Subscriptions"
      />

      <Button type="submit" className="w-full" disabled={loading || !selectedId || amount <= 0}>
        {loading ? 'Enregistrement...' : 'Enregistrer la depense'}
      </Button>
    </form>
  )
}
