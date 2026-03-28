import { useEffect, useState, type FormEvent } from 'react'
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
import InternalEntryField from './InternalEntryField'

interface SubcategoryFormProps {
  date: string
  parentCategory: 'Transport' | 'Packaging'
  initialData?: {
    amount: number
    description: string
    subcategory_id: string
    is_internal?: boolean
  }
  onSubmit: (data: {
    amount: number
    description: string
    subcategory_id: string
    is_internal?: boolean
  }) => Promise<void>
}

export default function SubcategoryForm({
  date,
  parentCategory,
  initialData,
  onSubmit,
}: SubcategoryFormProps) {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [selectedId, setSelectedId] = useState(initialData?.subcategory_id ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [amount, setAmount] = useState<number>(initialData?.amount ?? 0)
  const [isInternal, setIsInternal] = useState(initialData?.is_internal ?? false)
  const [loading, setLoading] = useState(false)
  const isEditing = !!initialData

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getSubcategories()
        setSubcategories(
          data.filter(
            (subcategory) => subcategory.category === parentCategory && subcategory.is_active
          )
        )
      } catch {
        toast.error('Erreur lors du chargement des sous-categories')
      }
    }

    load()
  }, [parentCategory])

  const selectedSubcategory = subcategories.find((subcategory) => subcategory.id === selectedId)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedId || amount <= 0) return

    setLoading(true)
    try {
      await onSubmit({
        amount,
        description:
          parentCategory === 'Packaging' ? description : selectedSubcategory?.name || description,
        subcategory_id: selectedId,
        is_internal: isInternal,
      })
      if (!isEditing) {
        setSelectedId('')
        setAmount(0)
        setDescription('')
        setIsInternal(false)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Sous-categorie</Label>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger>
            <SelectValue placeholder="Selectionner une sous-categorie" />
          </SelectTrigger>
          <SelectContent>
            {subcategories.map((subcategory) => (
              <SelectItem key={subcategory.id} value={subcategory.id}>
                {subcategory.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(parentCategory === 'Packaging' || parentCategory === 'Transport') && (
        <div className="space-y-2">
          <Label htmlFor="description">Description (optionnel)</Label>
          <Input
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
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
          onChange={(event) => setAmount(parseFloat(event.target.value) || 0)}
          required
        />
      </div>

      <InternalEntryField
        checked={isInternal}
        onCheckedChange={setIsInternal}
        categoryLabel={parentCategory}
      />

      <Button type="submit" className="w-full" disabled={loading || !selectedId || amount <= 0}>
        {loading ? 'Enregistrement...' : 'Enregistrer la depense'}
      </Button>
    </form>
  )
}
