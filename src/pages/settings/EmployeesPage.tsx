import { useEffect, useState } from 'react'
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  toggleEmployeeActive,
  deleteEmployee,
  type Employee,
  type EmployeeInsert,
} from '@/features/employees/api'
import EmployeeFormDialog from '@/features/employees/EmployeeFormDialog'
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

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null)

  const fetchEmployees = async () => {
    try {
      const data = await getEmployees()
      setEmployees(data)
    } catch {
      toast.error('Erreur lors du chargement des employés')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmployees()
  }, [])

  const handleAdd = () => {
    setEditingEmployee(null)
    setDialogOpen(true)
  }

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee)
    setDialogOpen(true)
  }

  const handleSubmit = async (data: EmployeeInsert) => {
    try {
      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, data)
        toast.success('Employé modifié avec succès')
      } else {
        await createEmployee(data)
        toast.success('Employé ajouté avec succès')
      }
      await fetchEmployees()
    } catch {
      toast.error('Erreur lors de l\'enregistrement')
    }
  }

  const handleToggleActive = async (employee: Employee) => {
    try {
      await toggleEmployeeActive(employee.id, !employee.is_active)
      toast.success(
        employee.is_active
          ? `${employee.name} a été désactivé`
          : `${employee.name} a été réactivé`
      )
      await fetchEmployees()
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteEmployee(deleteTarget.id)
      toast.success(`${deleteTarget.name} a été supprimé`)
      setDeleteTarget(null)
      await fetchEmployees()
    } catch {
      toast.error('Impossible de supprimer cet employé. Il est peut-être lié à des transactions.')
    }
  }

  if (loading) {
    return <p className="text-muted-foreground">Chargement...</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Employés</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gérez les profils des employés et leurs salaires de base
          </p>
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Ajouter un employé
        </Button>
      </div>

      {employees.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Aucun employé pour le moment.</p>
          <p className="text-sm mt-1">Cliquez sur "Ajouter un employé" pour commencer.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead className="text-right">Salaire de base</TableHead>
              <TableHead className="text-center">Jour de paie</TableHead>
              <TableHead className="text-center">Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((employee) => (
              <TableRow
                key={employee.id}
                className={!employee.is_active ? 'opacity-50' : ''}
              >
                <TableCell className="font-medium">{employee.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {employee.role || '—'}
                </TableCell>
                <TableCell className="text-right">
                  {formatTND(employee.base_salary)}
                </TableCell>
                <TableCell className="text-center">{employee.pay_day}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={employee.is_active ? 'default' : 'secondary'}>
                    {employee.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(employee)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(employee)}
                    >
                      {employee.is_active ? 'Désactiver' : 'Réactiver'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(employee)}
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

      <EmployeeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employee={editingEmployee}
        onSubmit={handleSubmit}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Supprimer cet employé ?"
        description={`Êtes-vous sûr de vouloir supprimer "${deleteTarget?.name}" ? Cette action est irréversible. Si cet employé est lié à des transactions, la suppression échouera.`}
        onConfirm={handleDelete}
      />
    </div>
  )
}