import { useEffect, useState } from 'react'
import { useRole } from '@/lib/RoleProvider'
import { useBranch } from '@/features/branches/BranchProvider'
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
import {
  SettingsListPage,
  SettingsItemMeta,
  SettingsItemTitle,
} from '@/components/system-ui/settings/SettingsListPage'
import { useCurrency } from '@/features/branches/useCurrency'
import { toast } from 'sonner'

function getScheduleLabel(charge: FixedCharge) {
  if (!charge.schedule_enabled) return 'Non planifiee'

  const intervalLabel = charge.recurrence_interval > 1 ? ` x${charge.recurrence_interval}` : ''

  if (charge.recurrence_frequency === 'weekly') return `Hebdomadaire${intervalLabel}`
  if (charge.recurrence_frequency === 'yearly') return `Annuelle${intervalLabel}`
  return `Mensuelle${intervalLabel}`
}

export default function FixedChargesPage() {
  const { canManage, loading: roleLoading } = useRole()
  const { activeBranch } = useBranch()
  const { format: formatAmount } = useCurrency()
  const [charges, setCharges] = useState<FixedCharge[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCharge, setEditingCharge] = useState<FixedCharge | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FixedCharge | null>(null)

  const branchId = activeBranch?.id ?? null

  const fetchCharges = async (id: string) => {
    try {
      const data = await getFixedCharges(id)
      setCharges(data)
    } catch {
      toast.error('Erreur lors du chargement des charges fixes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!branchId) return
    setLoading(true)
    fetchCharges(branchId)
  }, [branchId])

  if (roleLoading) return null
  if (!canManage) return <Navigate to="/" replace />

  const handleAdd = () => {
    setEditingCharge(null)
    setDialogOpen(true)
  }

  const handleEdit = (charge: FixedCharge) => {
    setEditingCharge(charge)
    setDialogOpen(true)
  }

  const handleSubmit = async (data: Omit<FixedChargeInsert, 'branch_id'>) => {
    if (!branchId) return
    try {
      if (editingCharge) {
        await updateFixedCharge(editingCharge.id, data)
        toast.success('Charge modifiée avec succès')
      } else {
        await createFixedCharge({ ...data, branch_id: branchId })
        toast.success('Charge ajoutée avec succès')
      }
      await fetchCharges(branchId)
    } catch {
      toast.error("Erreur lors de l'enregistrement")
    }
  }

  const handleToggleActive = async (charge: FixedCharge) => {
    if (!branchId) return
    try {
      await toggleFixedChargeActive(charge.id, !charge.is_active)
      toast.success(
        charge.is_active ? `${charge.name} désactivée` : `${charge.name} réactivée`,
      )
      await fetchCharges(branchId)
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || !branchId) return
    try {
      await deleteFixedCharge(deleteTarget.id)
      toast.success(`${deleteTarget.name} supprimée`)
      setDeleteTarget(null)
      await fetchCharges(branchId)
    } catch {
      toast.error('Impossible de supprimer cette charge.')
    }
  }

  return (
    <>
      <SettingsListPage
        title="Charges fixes"
        subtitle="Gérez vos charges récurrentes."
        items={charges}
        loading={loading}
        emptyMessage="Aucune charge fixe pour le moment."
        addLabel="Ajouter une charge"
        onAdd={handleAdd}
        onEdit={handleEdit}
        onToggleActive={handleToggleActive}
        onDelete={(item) => setDeleteTarget(item)}
        renderTitle={(item) => (
          <SettingsItemTitle
            name={item.name}
            isActive={item.is_active ?? true}
            activeLabel="Active"
            inactiveLabel="Inactive"
          />
        )}
        renderMeta={(item) => (
          <SettingsItemMeta>
            <span className="shrink-0">
              Montant par défaut{' '}
              <span className="font-medium text-white/90">
                {formatAmount(item.default_amount)}
              </span>
            </span>
            <span className="shrink-0 text-white/30">·</span>
            <span className="shrink-0">{getScheduleLabel(item)}</span>
          </SettingsItemMeta>
        )}
      />

      <FixedChargeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        charge={editingCharge}
        onSubmit={handleSubmit}
      />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Supprimer cette charge ?"
        description={`Êtes-vous sûr de vouloir supprimer "${deleteTarget?.name}" ?`}
        onConfirm={handleDelete}
      />
    </>
  )
}
