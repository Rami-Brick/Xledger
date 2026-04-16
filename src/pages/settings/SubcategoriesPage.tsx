import { useEffect, useState } from 'react'
import { useRole } from '@/lib/RoleProvider'
import { Navigate } from 'react-router-dom'
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
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'

type GroupKey = 'Transport' | 'Packaging'

export default function SubcategoriesPage() {
  const { canManage, loading: roleLoading } = useRole()
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSub, setEditingSub] = useState<Subcategory | null>(null)
  const [activeTab, setActiveTab] = useState<GroupKey>('Transport')
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

  useEffect(() => { fetchSubcategories() }, [])

  if (roleLoading) return null
  if (!canManage) return <Navigate to="/" replace />

  const handleAdd = () => {
    setEditingSub(null)
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
        toast.success('Sous-catégorie modifiée')
      } else {
        await createSubcategory(data)
        toast.success('Sous-catégorie ajoutée')
      }
      await fetchSubcategories()
    } catch {
      toast.error("Erreur lors de l'enregistrement")
    }
  }

  const handleToggleActive = async (sub: Subcategory) => {
    try {
      await toggleSubcategoryActive(sub.id, !sub.is_active)
      toast.success(sub.is_active ? `${sub.name} désactivée` : `${sub.name} réactivée`)
      await fetchSubcategories()
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteSubcategory(deleteTarget.id)
      toast.success(`${deleteTarget.name} supprimée`)
      setDeleteTarget(null)
      await fetchSubcategories()
    } catch {
      toast.error('Impossible de supprimer cette sous-catégorie.')
    }
  }

  const renderList = (group: GroupKey) => {
    const items = subcategories.filter((s) => s.category === group)
    if (items.length === 0) {
      return (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Aucune sous-catégorie.
        </p>
      )
    }
    return (
      <div className="space-y-2">
        {items.map((sub) => (
          <Card key={sub.id} className={!sub.is_active ? 'opacity-50' : ''}>
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{sub.name}</p>
                  <Badge variant={sub.is_active ? 'default' : 'secondary'} className="text-[10px]">
                    {sub.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(sub)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleActive(sub)}>
                    <span className="text-xs">{sub.is_active ? 'Off' : 'On'}</span>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(sub)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (loading) return <p className="text-muted-foreground">Chargement...</p>

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Sous-catégories</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Gérez les sous-catégories Transport et Packaging
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as GroupKey)}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="Transport">
              Transport
              <span className="ml-2 text-xs text-muted-foreground">
                ({subcategories.filter((s) => s.category === 'Transport').length})
              </span>
            </TabsTrigger>
            <TabsTrigger value="Packaging">
              Packaging
              <span className="ml-2 text-xs text-muted-foreground">
                ({subcategories.filter((s) => s.category === 'Packaging').length})
              </span>
            </TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" onClick={handleAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </div>

        <TabsContent value="Transport">{renderList('Transport')}</TabsContent>
        <TabsContent value="Packaging">{renderList('Packaging')}</TabsContent>
      </Tabs>

      <SubcategoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        subcategory={editingSub}
        defaultCategory={activeTab}
        onSubmit={handleSubmit}
      />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Supprimer cette sous-catégorie ?"
        description={`Êtes-vous sûr de vouloir supprimer "${deleteTarget?.name}" ?`}
        onConfirm={handleDelete}
      />
    </div>
  )
}