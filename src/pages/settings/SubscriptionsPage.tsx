import { useEffect, useState } from 'react'
import { useRole } from '@/lib/RoleProvider'
import { Navigate } from 'react-router-dom'
import {
  getSubscriptions, createSubscription, updateSubscription,
  toggleSubscriptionActive, deleteSubscription,
  type Subscription, type SubscriptionInsert,
} from '@/features/subscriptions/api'
import SubscriptionFormDialog from '@/features/subscriptions/SubscriptionFormDialog'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatTND } from '@/lib/format'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'

export default function SubscriptionsPage() {
  const { canManage, loading: roleLoading } = useRole()
  const [subs, setSubs] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Subscription | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Subscription | null>(null)

  const fetch = async () => {
    try { setSubs(await getSubscriptions()) }
    catch { toast.error('Erreur chargement') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [])

  if (roleLoading) return null
  if (!canManage) return <Navigate to="/" replace />

  const handleSubmit = async (data: SubscriptionInsert) => {
    try {
      if (editing) { await updateSubscription(editing.id, data); toast.success('Modifié') }
      else { await createSubscription(data); toast.success('Ajouté') }
      await fetch()
    } catch { toast.error('Erreur') }
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
            Abonnements
          </h2>
          <p className="mt-1 text-[13px] sm:text-sm text-muted-foreground">
            Gérez vos abonnements logiciels et services
          </p>
        </div>
        <Button
          onClick={() => { setEditing(null); setDialogOpen(true) }}
          size="sm"
          className="gap-2 rounded-lg"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Ajouter</span>
        </Button>
      </div>

      <div className="premium-surface premium-surface-airy surface-tint-violet rounded-2xl p-4 sm:p-6">
        <div className="mb-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Services
          </p>
          <h3 className="mt-1 text-base font-semibold text-foreground">
            {subs.length} abonnement{subs.length !== 1 ? 's' : ''}
          </h3>
        </div>

        {subs.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Aucun abonnement pour le moment
          </p>
        ) : (
          <div className="space-y-2.5">
            {subs.map((s) => (
              <div
                key={s.id}
                className={`row-surface flex items-center gap-3 rounded-2xl px-4 py-3 ${
                  !s.is_active ? 'opacity-60' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[13px] font-medium text-foreground tracking-tight">
                      {s.name}
                    </p>
                    <Badge
                      variant={s.is_active ? 'default' : 'secondary'}
                      className="h-4 rounded-full px-1.5 text-[9px] font-medium"
                    >
                      {s.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Montant:{' '}
                    <span className="font-medium tabular-nums text-foreground">
                      {formatTND(s.default_amount)}
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                    onClick={() => { setEditing(s); setDialogOpen(true) }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 rounded-full px-2 text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={async () => {
                      await toggleSubscriptionActive(s.id, !s.is_active)
                      toast.success(s.is_active ? 'Désactivé' : 'Réactivé')
                      await fetch()
                    }}
                  >
                    {s.is_active ? 'Off' : 'On'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteTarget(s)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <SubscriptionFormDialog open={dialogOpen} onOpenChange={setDialogOpen} subscription={editing} onSubmit={handleSubmit} />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Supprimer cet abonnement ?"
        description={`Supprimer "${deleteTarget?.name}" ?`}
        onConfirm={async () => {
          if (!deleteTarget) return
          try {
            await deleteSubscription(deleteTarget.id)
            toast.success('Supprimé')
            setDeleteTarget(null)
            await fetch()
          } catch {
            toast.error('Impossible de supprimer')
          }
        }}
      />
    </div>
  )
}
