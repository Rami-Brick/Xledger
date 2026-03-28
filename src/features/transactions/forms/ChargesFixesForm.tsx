import { useEffect, useState, type FormEvent } from 'react'
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
import InternalEntryField from './InternalEntryField'

interface ChargesFixesFormProps {
  date: string
  initialData?: {
    amount: number
    description: string
    fixed_charge_id: string
    is_internal?: boolean
  }
  onSubmit: (data: {
    amount: number
    description: string
    fixed_charge_id: string
    is_internal?: boolean
  }) => Promise<void>
}

export default function ChargesFixesForm({
  date,
  initialData,
  onSubmit,
}: ChargesFixesFormProps) {
  const [charges, setCharges] = useState<FixedCharge[]>([])
  const [selectedId, setSelectedId] = useState(initialData?.fixed_charge_id ?? '')
  const [amount, setAmount] = useState<number>(initialData?.amount ?? 0)
  const [isInternal, setIsInternal] = useState(initialData?.is_internal ?? false)
  const [loading, setLoading] = useState(false)
  const isEditing = !!initialData

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getFixedCharges()
        setCharges(data.filter((charge) => charge.is_active))
      } catch {
        toast.error('Erreur lors du chargement des charges fixes')
      }
    }

    load()
  }, [])

  const selectedCharge = charges.find((charge) => charge.id === selectedId)

  const handleChargeChange = (id: string) => {
    setSelectedId(id)
    const charge = charges.find((item) => item.id === id)
    if (charge && !isEditing) {
      setAmount(charge.default_amount)
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedId || amount <= 0) return

    setLoading(true)
    try {
      await onSubmit({
        amount,
        description: selectedCharge?.name || '',
        fixed_charge_id: selectedId,
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
        <Label>Charge fixe</Label>
        <Select value={selectedId} onValueChange={handleChargeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selectionner une charge" />
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
          onChange={(event) => setAmount(parseFloat(event.target.value) || 0)}
          required
        />
      </div>

      <InternalEntryField
        checked={isInternal}
        onCheckedChange={setIsInternal}
        categoryLabel="Charges fixes"
      />

      <Button type="submit" className="w-full" disabled={loading || !selectedId || amount <= 0}>
        {loading ? 'Enregistrement...' : 'Enregistrer la charge'}
      </Button>
    </form>
  )
}
