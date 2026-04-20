import { useEffect, useState } from 'react'
import { useRole } from '@/lib/RoleProvider'
import { Navigate } from 'react-router-dom'
import {
  getLoanContacts,
  createLoanContact,
  updateLoanContact,
  toggleLoanContactActive,
  deleteLoanContact,
  getLoanBalances,
  type LoanContact,
  type LoanContactInsert,
} from '@/features/loan-contacts/api'
import LoanContactFormDialog from '@/features/loan-contacts/LoanContactFormDialog'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog'
import {
  SettingsListPage,
  SettingsItemMeta,
  SettingsItemTitle,
} from '@/components/system-ui/settings/SettingsListPage'
import { formatTND } from '@/lib/format'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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
    } catch {
      toast.error('Erreur chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (roleLoading) return null
  if (!canManage) return <Navigate to="/" replace />

  const getBalance = (id: string) => balances.find((b) => b.loan_contact_id === id)

  const handleSubmit = async (data: LoanContactInsert) => {
    try {
      if (editing) {
        await updateLoanContact(editing.id, data)
        toast.success('Modifié')
      } else {
        await createLoanContact(data)
        toast.success('Ajouté')
      }
      await fetchData()
    } catch {
      toast.error('Erreur')
    }
  }

  const handleToggleActive = async (contact: LoanContact) => {
    try {
      await toggleLoanContactActive(contact.id, !contact.is_active)
      toast.success(contact.is_active ? 'Désactivé' : 'Réactivé')
      await fetchData()
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteLoanContact(deleteTarget.id)
      toast.success('Supprimé')
      setDeleteTarget(null)
      await fetchData()
    } catch {
      toast.error('Impossible de supprimer')
    }
  }

  return (
    <>
      <SettingsListPage
        title="Contacts Prêts"
        subtitle="Gérez les personnes à qui la société prête de l'argent."
        items={contacts}
        loading={loading}
        emptyMessage="Aucun contact."
        addLabel="Ajouter un contact"
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
        renderMeta={(item) => {
          const bal = getBalance(item.id)
          return (
            <div className="flex min-w-0 flex-col gap-1">
              {item.description && (
                <p className="text-[11px] text-white/46">{item.description}</p>
              )}
              {bal && (
                <SettingsItemMeta>
                  <span className="shrink-0">
                    Reçu{' '}
                    <span className="font-medium text-white/90 tabular-nums">
                      {formatTND(bal.total_lent)}
                    </span>
                  </span>
                  <span className="shrink-0 text-white/30">·</span>
                  <span className="shrink-0">
                    Rendu{' '}
                    <span className="font-medium tabular-nums text-[#B8EB3C]">
                      {formatTND(bal.total_repaid)}
                    </span>
                  </span>
                  <span className="shrink-0 text-white/30">·</span>
                  <span className="shrink-0">
                    Reste{' '}
                    <span
                      className={cn(
                        'font-semibold tabular-nums',
                        bal.remaining > 0 ? 'text-[#FF9A18]' : 'text-[#B8EB3C]',
                      )}
                    >
                      {formatTND(bal.remaining)}
                    </span>
                  </span>
                </SettingsItemMeta>
              )}
            </div>
          )
        }}
      />

      <LoanContactFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contact={editing}
        onSubmit={handleSubmit}
      />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Supprimer ce contact ?"
        description={`Supprimer "${deleteTarget?.name}" ?`}
        onConfirm={handleDelete}
      />
    </>
  )
}
