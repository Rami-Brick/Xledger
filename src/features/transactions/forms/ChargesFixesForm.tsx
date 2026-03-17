import { useState, useEffect, type FormEvent } from 'react'
import { getFixedCharges, type FixedCharge } from '@/features/fixed-charges/api'
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

interface ChargesFixesFormProps {
  date: string
  onSubmit: (data: {
    amount: number
    description: string
    fixed_charge_id: string
  }) => Promise<void>
}

export default function ChargesFixesForm({ date, onSubmit }: ChargesFixesFormProps) {
  const [charges, setCharges] = useState<FixedCharge[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getFixedCharges()
        setCharges(data.filter((c) => c.is_active))
      } catch {
        toast.error('Erreur lors du chargement des charges fixes')
      }
    }
    load()
  }, [])

  const selectedCharge = charges.find((c) => c.id === selectedId)

  const handleChargeChange = (id: string) => {
    setSelectedId(id)
    const charge = charges.find((c) => c.id === id)
    if (charge) {
      setAmount(charge.default_amount)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedId || amount <= 0) return
    setLoading(true)
    try {
      await onSubmit({
        amount,
        description: selectedCharge?.name || '',
        fixed_charge_id: selectedId,
      })
      setSelectedId('')
      setAmount(0)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Charge fixe</Label>
        <Select value={selectedId} onValueChange={handleChargeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner une charge" />
          </SelectTrigger>
          <SelectContent>
            {charges.map((charge) => (
              <SelectItem key={charge.id} value={charge.id}>
                {charge.name}
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
          step="0.001"
          min="0.001"
          value={amount || ''}
          onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading || !selectedId || amount <= 0}>
        {loading ? 'Enregistrement...' : 'Enregistrer la charge'}
      </Button>
    </form>
  )
}