import { useEffect, useState } from 'react'
import { useRole } from '@/lib/RoleProvider'
import { Navigate } from 'react-router-dom'
import {
  getSubscriptions,
  createSubscription,
  updateSubscription,
  toggleSubscriptionActive,
  deleteSubscription,
  type Subscription,
  type SubscriptionInsert,
} from '@/features/subscriptions/api'
import SubscriptionFormDialog from '@/features/subscriptions/SubscriptionFormDialog'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog'
import {
  SettingsListPage,
  SettingsItemMeta,
  SettingsItemTitle,
} from '@/components/system-ui/settings/SettingsListPage'
import { formatTND } from '@/lib/format'
import { toast } from 'sonner'

export default function SubscriptionsPage() {
  const { canManage, loading: roleLoading } = useRole()
  const [subs, setSubs] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Subscription | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Subscription | null>(null)

  const refetch = async () => {
    try {
      setSubs(await getSubscriptions())
    } catch {
      toast.error('Erreur chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refetch()
  }, [])

  if (roleLoading) return null
  if (!canManage) return <Navigate to="/" replace />

  const handleSubmit = async (data: SubscriptionInsert) => {
    try {
      if (editing) {
        await updateSubscription(editing.id, data)
        toast.success('Modifié')
      } else {
        await createSubscription(data)
        toast.success('Ajouté')
      }
      await refetch()
    } catch {
      toast.error('Erreur')
    }
  }

  const handleToggleActive = async (s: Subscription) => {
    try {
      await toggleSubscriptionActive(s.id, !s.is_active)
      toast.success(s.is_active ? 'Désactivé' : 'Réactivé')
      await refetch()
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteSubscription(deleteTarget.id)
      toast.success('Supprimé')
      setDeleteTarget(null)
      await refetch()
    } catch {
      toast.error('Impossible de supprimer')
    }
  }

  return (
    <>
      <SettingsListPage
        title="Abonnements"
        subtitle="Gérez vos abonnements logiciels et services."
        items={subs}
        loading={loading}
        emptyMessage="Aucun abonnement."
        addLabel="Ajouter un abonnement"
        onAdd={() => {
          setEditing(null)
          setDialogOpen(true)
        }}
        onEdit={(item) => {
          setEditing(item)
          setDialogOpen(true)
        }}
        onToggleActive={handleToggleActive}
        onDelete={(item) => setDeleteTarget(item)}
        renderTitle={(item) => (
          <SettingsItemTitle
            name={item.name}
            isActive={item.is_active ?? true}
            activeLabel="Actif"
            inactiveLabel="Inactif"
          />
        )}
        renderMeta={(item) => (
          <SettingsItemMeta>
            <span className="shrink-0">
              Montant{' '}
              <span className="font-medium text-white/90">
                {formatTND(item.default_amount)}
              </span>
            </span>
          </SettingsItemMeta>
        )}
      />

      <SubscriptionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        subscription={editing}
        onSubmit={handleSubmit}
      />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Supprimer cet abonnement ?"
        description={`Supprimer "${deleteTarget?.name}" ?`}
        onConfirm={handleDelete}
      />
    </>
  )
}
