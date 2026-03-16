import { useEffect, useState } from 'react'
import {
  getSubcategories,
  createSubcategory,
  updateSubcategory,
  toggleSubcategoryActive,
  deleteSubcategory,
  type Subcategory,
  type SubcategoryInsert,
} from '@/features/subcategories/api'
import SubcategoryFormDialog from '@/features/subcategories/SubcategoryFormDialog'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'

const GROUPS: { key: 'Transport' | 'Packaging'; label: string }[] = [
  { key: 'Transport', label: 'Transport' },
  { key: 'Packaging', label: 'Packaging' },
]

export default function SubcategoriesPage() {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSub, setEditingSub] = useState<Subcategory | null>(null)
  const [addingToCategory, setAddingToCategory] = useState<'Transport' | 'Packaging'>('Transport')
  const [deleteTarget, setDeleteTarget] = useState<Subcategory | null>(null)

  const fetchSubcategories = async () => {
    try {
      const data = await getSubcategories()
      setSubcategories(data)
    } catch {
      toast.error('Erreur lors du chargement des sous-catégories')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubcategories()
  }, [])

  const handleAdd = (category: 'Transport' | 'Packaging') => {
    setEditingSub(null)
    setAddingToCategory(category)
    setDialogOpen(true)
  }

  const handleEdit = (sub: Subcategory) => {
    setEditingSub(sub)
    setDialogOpen(true)
  }

  const handleSubmit = async (data: SubcategoryInsert) => {
    try {
      if (editingSub) {
        await updateSubcategory(editingSub.id, data)
        toast.success('Sous-catégorie modifiée avec succès')
      } else {
        await createSubcategory(data)
        toast.success('Sous-catégorie ajoutée avec succès')
      }
      await fetchSubcategories()
    } catch {
      toast.error('Erreur lors de l\'enregistrement')
    }
  }

  const handleToggleActive = async (sub: Subcategory) => {
    try {
      await toggleSubcategoryActive(sub.id, !sub.is_active)
      toast.success(
        sub.is_active
          ? `${sub.name} a été désactivée`
          : `${sub.name} a été réactivée`
      )
      await fetchSubcategories()
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteSubcategory(deleteTarget.id)
      toast.success(`${deleteTarget.name} a été supprimée`)
      setDeleteTarget(null)
      await fetchSubcategories()
    } catch {
      toast.error('Impossible de supprimer cette sous-catégorie. Elle est peut-être liée à des transactions.')
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">Chargement...</p>
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Sous-catégories</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Gérez les sous-catégories pour Transport et Packaging
        </p>
      </div>

      <div className="space-y-8">
        {GROUPS.map((group) => {
          const items = subcategories.filter((s) => s.category === group.key)

          return (
            <div key={group.key}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{group.label}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAdd(group.key)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter
                </Button>
              </div>

              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  Aucune sous-catégorie pour {group.label}.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead className="text-center">Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((sub) => (
                      <TableRow
                        key={sub.id}
                        className={!sub.is_active ? 'opacity-50' : ''}
                      >
                        <TableCell className="font-medium">{sub.name}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={sub.is_active ? 'default' : 'secondary'}>
                            {sub.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(sub)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(sub)}
                            >
                              {sub.is_active ? 'Désactiver' : 'Réactiver'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTarget(sub)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )
        })}
      </div>

      <SubcategoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        subcategory={editingSub}
        defaultCategory={addingToCategory}
        onSubmit={handleSubmit}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Supprimer cette sous-catégorie ?"
        description={`Êtes-vous sûr de vouloir supprimer "${deleteTarget?.name}" ? Cette action est irréversible.`}
        onConfirm={handleDelete}
      />
    </div>
  )
}