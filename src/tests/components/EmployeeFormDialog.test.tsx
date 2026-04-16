import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import EmployeeFormDialog from '@/features/employees/EmployeeFormDialog'

const mockEmployee = {
  id: 'emp-1',
  created_at: '2024-01-01',
  name: 'Jean Dupont',
  role: 'Marketing',
  base_salary: 1500,
  pay_day: 25,
  is_active: true,
}

describe('EmployeeFormDialog', () => {
  it('shows "Ajouter un employé" title when no employee prop', () => {
    render(
      <EmployeeFormDialog open={true} onOpenChange={vi.fn()} onSubmit={vi.fn()} />
    )
    expect(screen.getByText("Ajouter un employé")).toBeInTheDocument()
  })

  it('shows "Modifier l\'employé" title when employee is provided', () => {
    render(
      <EmployeeFormDialog
        open={true}
        onOpenChange={vi.fn()}
        employee={mockEmployee}
        onSubmit={vi.fn()}
      />
    )
    expect(screen.getByText("Modifier l'employé")).toBeInTheDocument()
  })

  it('pre-populates name field from employee prop', () => {
    render(
      <EmployeeFormDialog
        open={true}
        onOpenChange={vi.fn()}
        employee={mockEmployee}
        onSubmit={vi.fn()}
      />
    )
    expect((screen.getByLabelText('Nom complet') as HTMLInputElement).value).toBe('Jean Dupont')
  })

  it('pre-populates base_salary field from employee prop', () => {
    render(
      <EmployeeFormDialog
        open={true}
        onOpenChange={vi.fn()}
        employee={mockEmployee}
        onSubmit={vi.fn()}
      />
    )
    expect((screen.getByLabelText(/Salaire de base/) as HTMLInputElement).value).toBe('1500')
  })

  it('calls onSubmit with correct EmployeeInsert shape', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <EmployeeFormDialog open={true} onOpenChange={vi.fn()} onSubmit={onSubmit} />
    )

    await userEvent.type(screen.getByLabelText('Nom complet'), 'Fatima Mansouri')
    await userEvent.type(screen.getByLabelText(/Salaire de base/), '2000')

    await userEvent.click(screen.getByRole('button', { name: 'Ajouter' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Fatima Mansouri',
          base_salary: 2000,
          is_active: true,
        })
      )
    })
  })

  it('calls onOpenChange(false) when Annuler is clicked', async () => {
    const onOpenChange = vi.fn()
    render(
      <EmployeeFormDialog open={true} onOpenChange={onOpenChange} onSubmit={vi.fn()} />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('shows "Modifier" submit button in edit mode', () => {
    render(
      <EmployeeFormDialog
        open={true}
        onOpenChange={vi.fn()}
        employee={mockEmployee}
        onSubmit={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: 'Modifier' })).toBeInTheDocument()
  })
})
