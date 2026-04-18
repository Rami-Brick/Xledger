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
  const { canManage, loading: roleLoading } = useRole()
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

  if (roleLoading) return null
  if (!canManage) return <Navigate to="/" replace />

  const getBalance = (id: string) => balances.find((b) => b.loan_contact_id === id)

  const handleSubmit = async (data: LoanContactInsert) => {
    try {
      if (editing) { await updateLoanContact(editing.id, data); toast.success('Modifié') }
      else { await createLoanContact(data); toast.success('Ajouté') }
      await fetchData()
    } catch { toast.error('Erreur') }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-[1400px] min-w-0">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="space-y-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted/50" />
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
            Contacts Prêts
          </h2>
          <p className="mt-1 text-[13px] sm:text-sm text-muted-foreground">
            Gérez les personnes à qui la société prête de l'argent
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

      <div className="premium-surface premium-surface-airy surface-tint-gold rounded-2xl p-4 sm:p-6">
        <div className="mb-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Contacts
          </p>
          <h3 className="mt-1 text-base font-semibold text-foreground">
            {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
          </h3>
        </div>

        {contacts.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Aucun contact pour le moment
          </p>
        ) : (
          <div className="space-y-2.5">
            {contacts.map((c) => {
              const bal = getBalance(c.id)
              return (
                <div
                  key={c.id}
                  className={`row-surface flex items-start gap-3 rounded-2xl px-4 py-3 ${
                    !c.is_active ? 'opacity-60' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[13px] font-medium text-foreground tracking-tight">
                        {c.name}
                      </p>
                      <Badge
                        variant={c.is_active ? 'default' : 'secondary'}
                        className="h-4 rounded-full px-1.5 text-[9px] font-medium"
                      >
                        {c.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                    {c.description && (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {c.description}
                      </p>
                    )}
                    {bal && (
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]">
                        <span className="text-muted-foreground">
                          Reçu:{' '}
                          <span className="font-medium tabular-nums text-foreground">
                            {formatTND(bal.total_lent)}
                          </span>
                        </span>
                        <span className="text-muted-foreground">
                          Rendu:{' '}
                          <span className="font-medium tabular-nums text-success">
                            {formatTND(bal.total_repaid)}
                          </span>
                        </span>
                        <span className="text-muted-foreground">
                          Reste:{' '}
                          <span
                            className={`font-semibold tabular-nums ${
                              bal.remaining > 0 ? 'text-destructive' : 'text-success'
                            }`}
                          >
                            {formatTND(bal.remaining)}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                      onClick={() => { setEditing(c); setDialogOpen(true) }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 rounded-full px-2 text-[11px] text-muted-foreground hover:text-foreground"
                      onClick={async () => {
                        await toggleLoanContactActive(c.id, !c.is_active)
                        toast.success(c.is_active ? 'Désactivé' : 'Réactivé')
                        await fetchData()
                      }}
                    >
                      {c.is_active ? 'Off' : 'On'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(c)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <LoanContactFormDialog open={dialogOpen} onOpenChange={setDialogOpen} contact={editing} onSubmit={handleSubmit} />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Supprimer ce contact ?"
        description={`Supprimer "${deleteTarget?.name}" ?`}
        onConfirm={async () => {
          if (!deleteTarget) return
          try {
            await deleteLoanContact(deleteTarget.id)
            toast.success('Supprimé')
            setDeleteTarget(null)
            await fetchData()
          } catch {
            toast.error('Impossible de supprimer')
          }
        }}
      />
    </div>
  )
}
