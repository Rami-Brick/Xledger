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
        <p className="py-12 text-center text-sm text-muted-foreground">
          Aucune sous-catégorie
        </p>
      )
    }
    return (
      <div className="space-y-2.5">
        {items.map((sub) => (
          <div
            key={sub.id}
            className={`row-surface flex items-center gap-3 rounded-2xl px-4 py-2.5 ${
              !sub.is_active ? 'opacity-60' : ''
            }`}
          >
            <div className="min-w-0 flex-1 flex flex-wrap items-center gap-2">
              <p className="truncate text-[13px] font-medium text-foreground tracking-tight">
                {sub.name}
              </p>
              <Badge
                variant={sub.is_active ? 'default' : 'secondary'}
                className="h-4 rounded-full px-1.5 text-[9px] font-medium"
              >
                {sub.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => handleEdit(sub)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 rounded-full px-2 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={() => handleToggleActive(sub)}
              >
                {sub.is_active ? 'Off' : 'On'}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteTarget(sub)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-[1400px] min-w-0">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="space-y-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl bg-muted/50" />
          ))}
        </div>
      </div>
    )
  }

  const tint = activeTab === 'Transport' ? 'surface-tint-gold' : 'surface-tint-teal'

  return (
    <div className="space-y-6 max-w-[1400px] min-w-0">
      <div>
        <h2 className="text-[22px] sm:text-[28px] font-semibold tracking-tight leading-tight">
          Sous-catégories
        </h2>
        <p className="mt-1 text-[13px] sm:text-sm text-muted-foreground">
          Gérez les sous-catégories Transport et Packaging
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as GroupKey)}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <TabsList className="rounded-full">
            <TabsTrigger value="Transport" className="rounded-full">
              Transport
              <span className="ml-2 text-xs text-muted-foreground">
                ({subcategories.filter((s) => s.category === 'Transport').length})
              </span>
            </TabsTrigger>
            <TabsTrigger value="Packaging" className="rounded-full">
              Packaging
              <span className="ml-2 text-xs text-muted-foreground">
                ({subcategories.filter((s) => s.category === 'Packaging').length})
              </span>
            </TabsTrigger>
          </TabsList>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAdd}
            className="gap-2 rounded-lg"
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </Button>
        </div>

        <div className={`premium-surface premium-surface-airy ${tint} rounded-2xl p-4 sm:p-6`}>
          <TabsContent value="Transport" className="mt-0">
            {renderList('Transport')}
          </TabsContent>
          <TabsContent value="Packaging" className="mt-0">
            {renderList('Packaging')}
          </TabsContent>
        </div>
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
