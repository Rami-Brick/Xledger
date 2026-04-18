import { useEffect, useState } from 'react'
import { useRole } from '@/lib/RoleProvider'
import { Navigate } from 'react-router-dom'
import {
  getFixedCharges,
  createFixedCharge,
  updateFixedCharge,
  toggleFixedChargeActive,
  deleteFixedCharge,
  type FixedCharge,
  type FixedChargeInsert,
} from '@/features/fixed-charges/api'
import FixedChargeFormDialog from '@/features/fixed-charges/FixedChargeFormDialog'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatTND } from '@/lib/format'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'

export default function FixedChargesPage() {
  const { canManage, loading: roleLoading } = useRole()
  const [charges, setCharges] = useState<FixedCharge[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCharge, setEditingCharge] = useState<FixedCharge | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FixedCharge | null>(null)

  const fetchCharges = async () => {
    try {
      const data = await getFixedCharges()
      setCharges(data)
    } catch {
      toast.error('Erreur lors du chargement des charges fixes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCharges() }, [])

  if (roleLoading) return null
  if (!canManage) return <Navigate to="/" replace />

  const handleAdd = () => { setEditingCharge(null); setDialogOpen(true) }
  const handleEdit = (c: FixedCharge) => { setEditingCharge(c); setDialogOpen(true) }

  const handleSubmit = async (data: FixedChargeInsert) => {
    try {
      if (editingCharge) {
        await updateFixedCharge(editingCharge.id, data)
        toast.success('Charge modifiée avec succès')
      } else {
        await createFixedCharge(data)
        toast.success('Charge ajoutée avec succès')
      }
      await fetchCharges()
    } catch { toast.error("Erreur lors de l'enregistrement") }
  }

  const handleToggleActive = async (c: FixedCharge) => {
    try {
      await toggleFixedChargeActive(c.id, !c.is_active)
      toast.success(c.is_active ? `${c.name} désactivée` : `${c.name} réactivée`)
      await fetchCharges()
    } catch { toast.error('Erreur lors de la mise à jour') }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteFixedCharge(deleteTarget.id)
      toast.success(`${deleteTarget.name} supprimée`)
      setDeleteTarget(null)
      await fetchCharges()
    } catch { toast.error('Impossible de supprimer cette charge.') }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-[1400px] min-w-0">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="space-y-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted/50" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1400px] min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-[22px] sm:text-[28px] font-semibold tracking-tight leading-tight">
            Charges fixes
          </h2>
          <p className="mt-1 text-[13px] sm:text-sm text-muted-foreground">
            Gérez vos charges récurrentes
          </p>
        </div>
        <Button onClick={handleAdd} size="sm" className="gap-2 rounded-lg">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Ajouter une charge</span>
          <span className="sm:hidden">Ajouter</span>
        </Button>
      </div>

      <div className="premium-surface premium-surface-airy surface-tint-violet rounded-2xl p-4 sm:p-6">
        <div className="mb-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Charges
          </p>
          <h3 className="mt-1 text-base font-semibold text-foreground">
            {charges.length} enregistrée{charges.length !== 1 ? 's' : ''}
          </h3>
        </div>

        {charges.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Aucune charge fixe pour le moment
          </p>
        ) : (
          <div className="space-y-2.5">
            {charges.map((charge) => (
              <div
                key={charge.id}
                className={`row-surface flex items-center gap-3 rounded-2xl px-4 py-3 ${
                  !charge.is_active ? 'opacity-60' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[13px] font-medium text-foreground tracking-tight">
                      {charge.name}
                    </p>
                    <Badge
                      variant={charge.is_active ? 'default' : 'secondary'}
                      className="h-4 rounded-full px-1.5 text-[9px] font-medium"
                    >
                      {charge.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Montant par défaut:{' '}
                    <span className="font-medium tabular-nums text-foreground">
                      {formatTND(charge.default_amount)}
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                    onClick={() => handleEdit(charge)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 rounded-full px-2 text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={() => handleToggleActive(charge)}
                  >
                    {charge.is_active ? 'Off' : 'On'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteTarget(charge)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <FixedChargeFormDialog open={dialogOpen} onOpenChange={setDialogOpen} charge={editingCharge} onSubmit={handleSubmit} />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Supprimer cette charge ?"
        description={`Êtes-vous sûr de vouloir supprimer "${deleteTarget?.name}" ?`}
        onConfirm={handleDelete}
      />
    </div>
  )
}