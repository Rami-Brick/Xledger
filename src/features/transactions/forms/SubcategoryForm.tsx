import { useState, useEffect, type FormEvent } from 'react'
import { getSubcategories, type Subcategory } from '@/features/subcategories/api'
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

interface SubcategoryFormProps {
  date: string
  parentCategory: 'Transport' | 'Packaging'
  initialData?: {
    amount: number
    description: string
    subcategory_id: string
  }
  onSubmit: (data: {
    amount: number
    description: string
    subcategory_id: string
  }) => Promise<void>
}

export default function SubcategoryForm({ date, parentCategory, initialData,onSubmit }: SubcategoryFormProps) {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [selectedId, setSelectedId] = useState(initialData?.subcategory_id ??'')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [amount, setAmount] = useState<number>(initialData?.amount ?? 0)
  const [loading, setLoading] = useState(false)
  const isEditing = !!initialData

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getSubcategories()
        setSubcategories(data.filter((s) => s.category === parentCategory && s.is_active))
      } catch {
        toast.error('Erreur lors du chargement des sous-catégories')
      }
    }
    load()
  }, [parentCategory])

  const selectedSub = subcategories.find((s) => s.id === selectedId)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedId || amount <= 0) return
    setLoading(true)
    try {
      await onSubmit({
        amount,
        description: parentCategory === 'Packaging'
          ? description
          : selectedSub?.name || '',
        subcategory_id: selectedId,
      })
      if (!isEditing) {
        setSelectedId('')
        setAmount(0)
        setDescription('')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Sous-catégorie</Label>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner une sous-catégorie" />
          </SelectTrigger>
          <SelectContent>
            {subcategories.map((sub) => (
              <SelectItem key={sub.id} value={sub.id}>
                {sub.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {parentCategory === 'Packaging' && (
        <div className="space-y-2">
          <Label htmlFor="description">Description (optionnel)</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Commande 500 sacs"
          />
        </div>
      )}

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
        {loading ? 'Enregistrement...' : 'Enregistrer la dépense'}
      </Button>
    </form>
  )
}