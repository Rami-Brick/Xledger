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
import {
  SettingsListPage,
  SettingsItemMeta,
  SettingsItemTitle,
} from '@/components/system-ui/settings/SettingsListPage'
import { formatTND } from '@/lib/format'
import { toast } from 'sonner'

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
          : `${employee.name} a été réactivé`,
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
      toast.error(
        'Impossible de supprimer cet employé. Il est peut-être lié à des transactions.',
      )
    }
  }

  return (
    <>
      <SettingsListPage
        title="Employés"
        subtitle="Gérez les profils des employés et leurs salaires de base."
        items={employees}
        loading={loading}
        emptyMessage="Aucun employé pour le moment."
        addLabel="Ajouter un employé"
        onAdd={handleAdd}
        onEdit={handleEdit}
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
        renderMeta={(item) => (
          <SettingsItemMeta>
            {item.role && <span className="shrink-0">{item.role}</span>}
            {item.role && <span className="shrink-0 text-white/30">·</span>}
            <span className="shrink-0">
              Salaire{' '}
              <span className="font-medium text-white/90">
                {formatTND(item.base_salary)}
              </span>
            </span>
            <span className="shrink-0 text-white/30">·</span>
            <span className="shrink-0">
              Jour de paie{' '}
              <span className="font-medium text-white/90">{item.pay_day}</span>
            </span>
          </SettingsItemMeta>
        )}
      />

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
    </>
  )
}
