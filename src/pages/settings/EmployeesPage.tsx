import { useEffect, useState } from 'react'
import { useRole } from '@/lib/RoleProvider'
import { Navigate } from 'react-router-dom'
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
import { Card, CardContent } from '@/components/ui/card'
import { formatTND } from '@/lib/format'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const { canManage } = useRole()
    if (!canManage) return <Navigate to="/" replace />

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
      toast.error("Erreur lors de l'enregistrement")
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

  if (loading) return <p className="text-muted-foreground">Chargement...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Employés</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gérez les profils des employés et leurs salaires de base
          </p>
        </div>
        <Button onClick={handleAdd} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Ajouter un employé</span>
          <span className="sm:hidden">Ajouter</span>
        </Button>
      </div>

      {employees.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Aucun employé pour le moment.</p>
          <p className="text-sm mt-1">Cliquez sur "Ajouter" pour commencer.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {employees.map((employee) => (
            <Card
              key={employee.id}
              className={!employee.is_active ? 'opacity-50' : ''}
            >
              <CardContent className="py-4 px-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{employee.name}</p>
                      <Badge variant={employee.is_active ? 'default' : 'secondary'} className="text-[10px]">
                        {employee.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                    {employee.role && (
                      <p className="text-sm text-muted-foreground mt-0.5">{employee.role}</p>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
                      <span className="text-muted-foreground">
                        Salaire: <span className="font-medium text-foreground">{formatTND(employee.base_salary)}</span>
                      </span>
                      <span className="text-muted-foreground">
                        Jour de paie: <span className="font-medium text-foreground">{employee.pay_day}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(employee)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleToggleActive(employee)}
                    >
                      <span className="text-xs">{employee.is_active ? 'Off' : 'On'}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(employee)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
        description={`Êtes-vous sûr de vouloir supprimer "${deleteTarget?.name}" ? Cette action est irréversible.`}
        onConfirm={handleDelete}
      />
    </div>
  )
}