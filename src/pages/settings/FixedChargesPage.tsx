import { useEffect, useState } from 'react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatTND } from '@/lib/format'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'

export default function FixedChargesPage() {
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

  useEffect(() => {
    fetchCharges()
  }, [])

  const handleAdd = () => {
    setEditingCharge(null)
    setDialogOpen(true)
  }

  const handleEdit = (charge: FixedCharge) => {
    setEditingCharge(charge)
    setDialogOpen(true)
  }

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
    } catch {
      toast.error('Erreur lors de l\'enregistrement')
    }
  }

  const handleToggleActive = async (charge: FixedCharge) => {
    try {
      await toggleFixedChargeActive(charge.id, !charge.is_active)
      toast.success(
        charge.is_active
          ? `${charge.name} a été désactivée`
          : `${charge.name} a été réactivée`
      )
      await fetchCharges()
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteFixedCharge(deleteTarget.id)
      toast.success(`${deleteTarget.name} a été supprimée`)
      setDeleteTarget(null)
      await fetchCharges()
    } catch {
      toast.error('Impossible de supprimer cette charge. Elle est peut-être liée à des transactions.')
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">Chargement...</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Charges fixes</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gérez vos charges récurrentes avec leurs montants par défaut
          </p>
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter une charge
        </Button>
      </div>

      {charges.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Aucune charge fixe pour le moment.</p>
          <p className="text-sm mt-1">Cliquez sur "Ajouter une charge" pour commencer.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead className="text-right">Montant par défaut</TableHead>
              <TableHead className="text-center">Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {charges.map((charge) => (
              <TableRow
                key={charge.id}
                className={!charge.is_active ? 'opacity-50' : ''}
              >
                <TableCell className="font-medium">{charge.name}</TableCell>
                <TableCell className="text-right">
                  {formatTND(charge.default_amount)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={charge.is_active ? 'default' : 'secondary'}>
                    {charge.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(charge)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(charge)}
                    >
                      {charge.is_active ? 'Désactiver' : 'Réactiver'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(charge)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

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
        description={`Êtes-vous sûr de vouloir supprimer "${deleteTarget?.name}" ? Cette action est irréversible.`}
        onConfirm={handleDelete}
      />
    </div>
  )
}