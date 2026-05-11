import { useEffect, useState } from 'react'
import { useRole } from '@/lib/RoleProvider'
import { useBranch } from '@/features/branches/BranchProvider'
import { Navigate } from 'react-router-dom'
import {
  getInvestmentRecipients,
  createInvestmentRecipient,
  updateInvestmentRecipient,
  toggleInvestmentRecipientActive,
  deleteInvestmentRecipient,
  getInvestmentBalances,
  type InvestmentRecipient,
  type InvestmentRecipientInsert,
} from '@/features/investment-recipients/api'
import InvestmentRecipientFormDialog from '@/features/investment-recipients/InvestmentRecipientFormDialog'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog'
import {
  SettingsListPage,
  SettingsItemMeta,
  SettingsItemTitle,
} from '@/components/system-ui/settings/SettingsListPage'
import { useCurrency } from '@/features/branches/useCurrency'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface InvestmentBalance {
  investment_recipient_id: string
  name: string
  total_invested: number
  total_returned: number
  net_invested: number
}

export default function InvestmentRecipientsPage() {
  const { canManage, loading: roleLoading } = useRole()
  const { activeBranch } = useBranch()
  const { format: formatAmount } = useCurrency()
  const [recipients, setRecipients] = useState<InvestmentRecipient[]>([])
  const [balances, setBalances] = useState<InvestmentBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<InvestmentRecipient | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<InvestmentRecipient | null>(null)

  const branchId = activeBranch?.id ?? null

  const fetchData = async (id: string) => {
    try {
      const [r, b] = await Promise.all([getInvestmentRecipients(id), getInvestmentBalances(id)])
      setRecipients(r)
      setBalances(b)
    } catch {
      toast.error('Erreur chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!branchId) return
    setLoading(true)
    fetchData(branchId)
  }, [branchId])

  if (roleLoading) return null
  if (!canManage) return <Navigate to="/" replace />

  const getBalance = (id: string) => balances.find((b) => b.investment_recipient_id === id)

  const handleSubmit = async (data: Omit<InvestmentRecipientInsert, 'branch_id'>) => {
    if (!branchId) return
    try {
      if (editing) {
        await updateInvestmentRecipient(editing.id, data)
        toast.success('Modifié')
      } else {
        await createInvestmentRecipient({ ...data, branch_id: branchId })
        toast.success('Ajouté')
      }
      await fetchData(branchId)
    } catch {
      toast.error('Erreur')
    }
  }

  const handleToggleActive = async (recipient: InvestmentRecipient) => {
    if (!branchId) return
    try {
      await toggleInvestmentRecipientActive(recipient.id, !recipient.is_active)
      toast.success(recipient.is_active ? 'Désactivé' : 'Réactivé')
      await fetchData(branchId)
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || !branchId) return
    try {
      await deleteInvestmentRecipient(deleteTarget.id)
      toast.success('Supprimé')
      setDeleteTarget(null)
      await fetchData(branchId)
    } catch {
      toast.error('Impossible de supprimer')
    }
  }

  return (
    <>
      <SettingsListPage
        title="Bénéficiaires investissements"
        subtitle="Gérez les bénéficiaires que la société soutient ou finance."
        items={recipients}
        loading={loading}
        emptyMessage="Aucun bénéficiaire."
        addLabel="Ajouter un bénéficiaire"
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
                    Investi{' '}
                    <span className="font-medium text-white/90 tabular-nums">
                      {formatAmount(bal.total_invested)}
                    </span>
                  </span>
                  <span className="shrink-0 text-white/30">·</span>
                  <span className="shrink-0">
                    Retour{' '}
                    <span className="font-medium tabular-nums text-[#B8EB3C]">
                      {formatAmount(bal.total_returned)}
                    </span>
                  </span>
                  <span className="shrink-0 text-white/30">·</span>
                  <span className="shrink-0">
                    Net{' '}
                    <span
                      className={cn(
                        'font-semibold tabular-nums',
                        bal.net_invested > 0 ? 'text-[#FF9A18]' : 'text-[#B8EB3C]',
                      )}
                    >
                      {formatAmount(bal.net_invested)}
                    </span>
                  </span>
                </SettingsItemMeta>
              )}
            </div>
          )
        }}
      />

      <InvestmentRecipientFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        recipient={editing}
        onSubmit={handleSubmit}
      />
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Supprimer ce bénéficiaire ?"
        description={`Supprimer "${deleteTarget?.name}" ?`}
        onConfirm={handleDelete}
      />
    </>
  )
}
