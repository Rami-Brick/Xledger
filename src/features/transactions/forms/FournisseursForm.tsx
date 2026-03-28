import { useEffect, useState, type FormEvent } from 'react'
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
import InternalEntryField from './InternalEntryField'

interface FournisseursFormProps {
  date: string
  initialData?: {
    amount: number
    description: string
    product_id: string
    is_internal?: boolean
  }
  onSubmit: (data: {
    amount: number
    description: string
    product_id: string
    is_internal?: boolean
  }) => Promise<void>
}

export default function FournisseursForm({
  date,
  initialData,
  onSubmit,
}: FournisseursFormProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedId, setSelectedId] = useState(initialData?.product_id ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [amount, setAmount] = useState<number>(initialData?.amount ?? 0)
  const [isInternal, setIsInternal] = useState(initialData?.is_internal ?? false)
  const [loading, setLoading] = useState(false)
  const isEditing = !!initialData

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getProducts()
        setProducts(data.filter((product) => product.is_active))
      } catch {
        toast.error('Erreur lors du chargement des produits')
      }
    }

    load()
  }, [])

  const selectedProduct = products.find((product) => product.id === selectedId)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedId || amount <= 0) return

    setLoading(true)
    try {
      await onSubmit({
        amount,
        description: description || `Fournisseur - ${selectedProduct?.name}`,
        product_id: selectedId,
        is_internal: isInternal,
      })
      if (!isEditing) {
        setSelectedId('')
        setDescription('')
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
        <Label>Produit</Label>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger>
            <SelectValue placeholder="Selectionner un produit" />
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
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Ex: Commande 500 unites"
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
          onChange={(event) => setAmount(parseFloat(event.target.value) || 0)}
          required
        />
      </div>

      <InternalEntryField
        checked={isInternal}
        onCheckedChange={setIsInternal}
        categoryLabel="Fournisseurs"
      />

      <Button type="submit" className="w-full" disabled={loading || !selectedId || amount <= 0}>
        {loading ? 'Enregistrement...' : 'Enregistrer la depense'}
      </Button>
    </form>
  )
}
