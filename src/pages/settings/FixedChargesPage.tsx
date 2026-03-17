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
import { Card, CardContent } from '@/components/ui/card'
import { formatTND } from '@/lib/format'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'

export default function FixedChargesPage() {
  const { isAdmin } = useRole()
    if (!isAdmin) return <Navigate to="/" replace />
    
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

  if (loading) return <p className="text-muted-foreground">Chargement...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Charges fixes</h2>
          <p className="text-muted-foreground text-sm mt-1">Gérez vos charges récurrentes</p>
        </div>
        <Button onClick={handleAdd} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Ajouter une charge</span>
          <span className="sm:hidden">Ajouter</span>
        </Button>
      </div>

      {charges.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Aucune charge fixe pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {charges.map((charge) => (
            <Card key={charge.id} className={!charge.is_active ? 'opacity-50' : ''}>
              <CardContent className="py-4 px-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{charge.name}</p>
                      <Badge variant={charge.is_active ? 'default' : 'secondary'} className="text-[10px]">
                        {charge.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Montant par défaut: <span className="font-medium text-foreground">{formatTND(charge.default_amount)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(charge)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleActive(charge)}>
                      <span className="text-xs">{charge.is_active ? 'Off' : 'On'}</span>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(charge)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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