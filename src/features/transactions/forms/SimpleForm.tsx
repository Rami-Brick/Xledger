import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SimpleFormProps {
  date: string
  descriptionRequired?: boolean
  descriptionPlaceholder?: string
  submitLabel?: string
  onSubmit: (data: {
    amount: number
    description: string
  }) => Promise<void>
}

export default function SimpleForm({
  date,
  descriptionRequired = false,
  descriptionPlaceholder = 'Description',
  submitLabel = 'Enregistrer',
  onSubmit,
}: SimpleFormProps) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (amount <= 0) return
    if (descriptionRequired && !description.trim()) return
    setLoading(true)
    try {
      await onSubmit({ amount, description })
      setDescription('')
      setAmount(0)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="description">
          Description {!descriptionRequired && '(optionnel)'}
        </Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={descriptionPlaceholder}
          required={descriptionRequired}
        />
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

      <Button type="submit" className="w-full" disabled={loading || amount <= 0}>
        {loading ? 'Enregistrement...' : submitLabel}
      </Button>
    </form>
  )
}