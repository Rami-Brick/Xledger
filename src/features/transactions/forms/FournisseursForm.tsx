import { useState, useEffect, type FormEvent } from 'react'
import { getProducts, type Product } from '@/features/products/api'
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

interface FournisseursFormProps {
  date: string
  initialData?: {
    amount: number
    description: string
    product_id: string
  }
  onSubmit: (data: {
    amount: number
    description: string
    product_id: string
  }) => Promise<void>
}

export default function FournisseursForm({ date, initialData, onSubmit }: FournisseursFormProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedId, setSelectedId] = useState(initialData?.product_id ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [amount, setAmount] = useState<number>(initialData?.amount ?? 0)
  const [loading, setLoading] = useState(false)
  const isEditing = !!initialData


  useEffect(() => {
    const load = async () => {
      try {
        const data = await getProducts()
        setProducts(data.filter((p) => p.is_active))
      } catch {
        toast.error('Erreur lors du chargement des produits')
      }
    }
    load()
  }, [])

  const selectedProduct = products.find((p) => p.id === selectedId)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedId || amount <= 0) return
    setLoading(true)
    try {
      await onSubmit({
        amount,
        description: description || `Fournisseur — ${selectedProduct?.name}`,
        product_id: selectedId,
      })
      if (!isEditing) {
        setSelectedId('')
        setDescription('')
        setAmount(0)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Produit</Label>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un produit" />
          </SelectTrigger>
          <SelectContent>
            {products.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optionnel)</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: Commande 500 unités"
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

      <Button type="submit" className="w-full" disabled={loading || !selectedId || amount <= 0}>
        {loading ? 'Enregistrement...' : 'Enregistrer la dépense'}
      </Button>
    </form>
  )
}