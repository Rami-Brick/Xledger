import { useEffect, useMemo, useState } from 'react'
import { useRole } from '@/lib/RoleProvider'
import { Navigate } from 'react-router-dom'
import { MoreHorizontal, Pencil, Plus, Power, Trash2 } from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  CircularIconButton,
  GlassPanel,
  PillButton,
} from '@/components/system-ui/primitives'
import { PrimaryCTA } from '@/components/system-ui/compounds'
import { SettingsItemTitle } from '@/components/system-ui/settings/SettingsListPage'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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

  useEffect(() => {
    fetchSubcategories()
  }, [])

  const currentItems = useMemo(
    () => subcategories.filter((s) => s.category === activeTab),
    [subcategories, activeTab],
  )

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

  const tabs: { key: GroupKey; label: string }[] = [
    { key: 'Transport', label: 'Transport' },
    { key: 'Packaging', label: 'Packaging' },
  ]

  return (
    <div className="relative w-full min-w-0">
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 -left-40 h-[480px] w-[480px] rounded-full blur-3xl"
        style={{ background: 'rgba(92,214,180,0.10)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -bottom-40 -right-40 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{ background: 'rgba(154,255,90,0.10)' }}
      />

      <div className="relative z-10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="text-xl font-semibold tracking-tight text-white md:text-2xl">
              Sous-catégories
            </h1>
            <p className="text-xs text-white/60 md:text-sm">
              Gérez les sous-catégories Transport et Packaging.
            </p>
          </div>

          <CircularIconButton
            variant="light"
            size="md"
            icon={<Plus />}
            aria-label="Ajouter une sous-catégorie"
            onClick={handleAdd}
            className="md:hidden"
          />
          <PrimaryCTA
            label="Ajouter une sous-catégorie"
            icon={<Plus />}
            aria-label="Ajouter une sous-catégorie"
            onClick={handleAdd}
            className="hidden md:inline-flex"
          />
        </div>

        <nav
          aria-label="Groupes de sous-catégories"
          className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map((tab) => {
            const isActive = tab.key === activeTab
            const count = subcategories.filter((s) => s.category === tab.key).length
            return (
              <PillButton
                key={tab.key}
                variant={isActive ? 'light' : 'ghost'}
                size="sm"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setActiveTab(tab.key)}
                className="shrink-0"
              >
                {tab.label}
                <span
                  className={cn(
                    'ml-1 rounded-full px-1.5 text-[10px] font-semibold',
                    isActive ? 'bg-black/10 text-black/70' : 'bg-white/[0.08] text-white/60',
                  )}
                >
                  {count}
                </span>
              </PillButton>
            )
          })}
        </nav>

        {loading ? (
          <GlassPanel className="p-6">
            <p className="py-6 text-center text-sm text-white/46">Chargement…</p>
          </GlassPanel>
        ) : currentItems.length === 0 ? (
          <GlassPanel className="p-6">
            <p className="py-12 text-center text-sm text-white/60">
              Aucune sous-catégorie.
            </p>
          </GlassPanel>
        ) : (
          <GlassPanel className="p-3 md:p-4">
            <div className="flex flex-col">
              {currentItems.map((item) => {
                const inactive = item.is_active === false
                return (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-2xl px-2 py-3',
                      inactive && 'opacity-50',
                    )}
                  >
                    <SettingsItemTitle
                      name={item.name}
                      isActive={item.is_active ?? true}
                      activeLabel="Active"
                      inactiveLabel="Inactive"
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <CircularIconButton
                          variant="glass"
                          size="sm"
                          icon={<MoreHorizontal />}
                          aria-label="Actions"
                        />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        sideOffset={6}
                        className="min-w-44 rounded-xl border border-white/[0.08] bg-[#141414] p-1.5 text-white shadow-xl ring-0"
                      >
                        <DropdownMenuItem
                          className="gap-2 rounded-lg px-2 py-2 text-sm text-white/90 focus:bg-white/[0.06] focus:text-white"
                          onSelect={(e) => {
                            e.preventDefault()
                            handleEdit(item)
                          }}
                        >
                          <Pencil className="size-4" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 rounded-lg px-2 py-2 text-sm text-white/90 focus:bg-white/[0.06] focus:text-white"
                          onSelect={(e) => {
                            e.preventDefault()
                            handleToggleActive(item)
                          }}
                        >
                          <Power className="size-4" />
                          {inactive ? 'Réactiver' : 'Désactiver'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-1 bg-white/[0.06]" />
                        <DropdownMenuItem
                          className="gap-2 rounded-lg px-2 py-2 text-sm text-[#FF9A18] focus:bg-[#FF9A18]/10 focus:text-[#FF9A18]"
                          onSelect={(e) => {
                            e.preventDefault()
                            setDeleteTarget(item)
                          }}
                        >
                          <Trash2 className="size-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )
              })}
            </div>
          </GlassPanel>
        )}
      </div>

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
