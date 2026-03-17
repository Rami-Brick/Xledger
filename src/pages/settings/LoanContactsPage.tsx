import { useEffect, useState } from 'react'
import { useRole } from '@/lib/RoleProvider'
import { Navigate } from 'react-router-dom'
import {
  getLoanContacts, createLoanContact, updateLoanContact,
  toggleLoanContactActive, deleteLoanContact, getLoanBalances,
  type LoanContact, type LoanContactInsert,
} from '@/features/loan-contacts/api'
import LoanContactFormDialog from '@/features/loan-contacts/LoanContactFormDialog'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatTND } from '@/lib/format'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'

interface LoanBalance {
  loan_contact_id: string
  name: string
  total_lent: number
  total_repaid: number
  remaining: number
}

export default function LoanContactsPage() {
  const { canManage } = useRole()
    if (!canManage) return <Navigate to="/" replace />

  const [contacts, setContacts] = useState<LoanContact[]>([])
  const [balances, setBalances] = useState<LoanBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<LoanContact | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LoanContact | null>(null)

  const fetchData = async () => {
    try {
      const [c, b] = await Promise.all([getLoanContacts(), getLoanBalances()])
      setContacts(c)
      setBalances(b)
    } catch { toast.error('Erreur chargement') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const getBalance = (id: string) => balances.find((b) => b.loan_contact_id === id)

  const handleSubmit = async (data: LoanContactInsert) => {
    try {
      if (editing) { await updateLoanContact(editing.id, data); toast.success('Modifié') }
      else { await createLoanContact(data); toast.success('Ajouté') }
      await fetchData()
    } catch { toast.error('Erreur') }
  }

  if (loading) return <p className="text-muted-foreground">Chargement...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Contacts Prêts</h2>
          <p className="text-muted-foreground text-sm mt-1">Gérez les personnes à qui la société prête de l'argent</p>
        </div>
          <Button onClick={() => { setEditing(null); setDialogOpen(true) }} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Ajouter</span>
          </Button>
      </div>

      {contacts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground"><p>Aucun contact.</p></div>
      ) : (
        <div className="space-y-3">
          {contacts.map((c) => {
            const bal = getBalance(c.id)
            return (
              <Card key={c.id} className={!c.is_active ? 'opacity-50' : ''}>
                <CardContent className="py-4 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{c.name}</p>
                        <Badge variant={c.is_active ? 'default' : 'secondary'} className="text-[10px]">
                          {c.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                      {c.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
                      )}
                      {bal && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                          <span className="text-muted-foreground">
                            Reçu: <span className="font-medium text-foreground">{formatTND(bal.total_lent)}</span>
                          </span>
                          <span className="text-muted-foreground">
                            Rendu: <span className="font-medium text-green-600">{formatTND(bal.total_repaid)}</span>
                          </span>
                          <span className="text-muted-foreground">
                            Reste: <span className={`font-semibold ${bal.remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                              {formatTND(bal.remaining)}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(c); setDialogOpen(true) }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={async () => {
                        await toggleLoanContactActive(c.id, !c.is_active); toast.success(c.is_active ? 'Désactivé' : 'Réactivé'); await fetchData()
                      }}>
                        <span className="text-xs">{c.is_active ? 'Off' : 'On'}</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(c)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <LoanContactFormDialog open={dialogOpen} onOpenChange={setDialogOpen} contact={editing} onSubmit={handleSubmit} />
      <DeleteConfirmDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Supprimer ce contact ?" description={`Supprimer "${deleteTarget?.name}" ?`}
        onConfirm={async () => { if (!deleteTarget) return; try { await deleteLoanContact(deleteTarget.id); toast.success('Supprimé'); setDeleteTarget(null); await fetchData() } catch { toast.error('Impossible de supprimer') } }}
      />
    </div>
  )
}