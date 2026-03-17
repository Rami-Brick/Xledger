import { useEffect, useState } from 'react'
import {
  getSubscriptions, createSubscription, updateSubscription,
  toggleSubscriptionActive, deleteSubscription,
  type Subscription, type SubscriptionInsert,
} from '@/features/subscriptions/api'
import SubscriptionFormDialog from '@/features/subscriptions/SubscriptionFormDialog'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatTND } from '@/lib/format'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'

export default function SubscriptionsPage() {
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

  const handleSubmit = async (data: SubscriptionInsert) => {
    try {
      if (editing) { await updateSubscription(editing.id, data); toast.success('Modifié') }
      else { await createSubscription(data); toast.success('Ajouté') }
      await fetch()
    } catch { toast.error('Erreur') }
  }

  if (loading) return <p className="text-muted-foreground">Chargement...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Abonnements</h2>
          <p className="text-muted-foreground text-sm mt-1">Gérez vos abonnements logiciels et services</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true) }} size="sm" className="gap-2">
          <Plus className="h-4 w-4" /><span className="hidden sm:inline">Ajouter</span><span className="sm:hidden">+</span>
        </Button>
      </div>

      {subs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground"><p>Aucun abonnement.</p></div>
      ) : (
        <div className="space-y-3">
          {subs.map((s) => (
            <Card key={s.id} className={!s.is_active ? 'opacity-50' : ''}>
              <CardContent className="py-4 px-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{s.name}</p>
                      <Badge variant={s.is_active ? 'default' : 'secondary'} className="text-[10px]">
                        {s.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Montant: <span className="font-medium text-foreground">{formatTND(s.default_amount)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(s); setDialogOpen(true) }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={async () => {
                      await toggleSubscriptionActive(s.id, !s.is_active); toast.success(s.is_active ? 'Désactivé' : 'Réactivé'); await fetch()
                    }}>
                      <span className="text-xs">{s.is_active ? 'Off' : 'On'}</span>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(s)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <SubscriptionFormDialog open={dialogOpen} onOpenChange={setDialogOpen} subscription={editing} onSubmit={handleSubmit} />
      <DeleteConfirmDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Supprimer cet abonnement ?" description={`Supprimer "${deleteTarget?.name}" ?`}
        onConfirm={async () => { if (!deleteTarget) return; try { await deleteSubscription(deleteTarget.id); toast.success('Supprimé'); setDeleteTarget(null); await fetch() } catch { toast.error('Impossible de supprimer') } }}
      />
    </div>
  )
}