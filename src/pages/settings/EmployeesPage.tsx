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
import { formatTND } from '@/lib/format'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'

export default function EmployeesPage() {
  const { canManage, loading: roleLoading } = useRole()
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

  if (roleLoading) return null
  if (!canManage) return <Navigate to="/" replace />

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
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-[22px] sm:text-[28px] font-semibold tracking-tight leading-tight">
            Employés
          </h2>
          <p className="mt-1 text-[13px] sm:text-sm text-muted-foreground">
            Gérez les profils des employés et leurs salaires de base
          </p>
        </div>
        <Button onClick={handleAdd} size="sm" className="gap-2 rounded-lg">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Ajouter un employé</span>
          <span className="sm:hidden">Ajouter</span>
        </Button>
      </div>

      {/* List container */}
      <div className="premium-surface premium-surface-airy surface-tint-violet rounded-2xl p-4 sm:p-6">
        <div className="mb-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Équipe
          </p>
          <h3 className="mt-1 text-base font-semibold text-foreground">
            {employees.length} employé{employees.length !== 1 ? 's' : ''}
          </h3>
        </div>

        {employees.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Aucun employé pour le moment. Cliquez sur "Ajouter" pour commencer.
          </p>
        ) : (
          <div className="space-y-2.5">
            {employees.map((employee) => (
              <div
                key={employee.id}
                className={`row-surface flex items-center gap-3 rounded-2xl px-4 py-3 ${
                  !employee.is_active ? 'opacity-60' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[13px] font-medium text-foreground tracking-tight">
                      {employee.name}
                    </p>
                    <Badge
                      variant={employee.is_active ? 'default' : 'secondary'}
                      className="h-4 rounded-full px-1.5 text-[9px] font-medium"
                    >
                      {employee.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                    {employee.role && (
                      <span className="text-[11px] text-muted-foreground">
                        · {employee.role}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                    <span>
                      Salaire:{' '}
                      <span className="font-medium tabular-nums text-foreground">
                        {formatTND(employee.base_salary)}
                      </span>
                    </span>
                    <span>
                      Jour de paie:{' '}
                      <span className="font-medium tabular-nums text-foreground">
                        {employee.pay_day}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                    onClick={() => handleEdit(employee)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 rounded-full px-2 text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={() => handleToggleActive(employee)}
                  >
                    {employee.is_active ? 'Off' : 'On'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteTarget(employee)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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