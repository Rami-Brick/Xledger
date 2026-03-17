import { useState, useEffect, type FormEvent } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
import type { Subcategory, SubcategoryInsert } from './api'

interface SubcategoryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subcategory?: Subcategory | null
  defaultCategory?: 'Transport' | 'Packaging'
  onSubmit: (data: SubcategoryInsert) => Promise<void>
}

const emptyForm: SubcategoryInsert = {
  category: 'Transport',
  name: '',
  is_active: true,
}

export default function SubcategoryFormDialog({
  open,
  onOpenChange,
  subcategory,
  defaultCategory,
  onSubmit,
}: SubcategoryFormDialogProps) {
  const [form, setForm] = useState<SubcategoryInsert>(emptyForm)
  const [loading, setLoading] = useState(false)

  const isEditing = !!subcategory

  useEffect(() => {
    if (subcategory) {
      setForm({
        category: subcategory.category,
        name: subcategory.name,
        is_active: subcategory.is_active,
      })
    } else {
      setForm({
        ...emptyForm,
        category: defaultCategory || 'Transport',
      })
    }
  }, [subcategory, defaultCategory, open])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit(form)
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Modifier la sous-catégorie' : 'Ajouter une sous-catégorie'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Catégorie parente</Label>
            <Select
              value={form.category}
              onValueChange={(value) =>
                setForm({ ...form, category: value as 'Transport' | 'Packaging' })
              }
              disabled={isEditing}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Transport">Transport</SelectItem>
                <SelectItem value="Packaging">Packaging</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Essence Kia, Cartons, Scotch"
              required
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Enregistrement...' : isEditing ? 'Modifier' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}