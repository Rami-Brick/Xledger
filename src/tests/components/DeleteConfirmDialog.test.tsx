import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog'

describe('DeleteConfirmDialog', () => {
  it('renders nothing visible when open=false', () => {
    render(
      <DeleteConfirmDialog
        open={false}
        onOpenChange={vi.fn()}
        title="Supprimer l'employé"
        description="Cette action est irréversible."
        onConfirm={vi.fn()}
      />
    )
    expect(screen.queryByText("Supprimer l'employé")).not.toBeInTheDocument()
  })

  it('shows title and description when open=true', () => {
    render(
      <DeleteConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        title="Supprimer l'employé"
        description="Cette action est irréversible."
        onConfirm={vi.fn()}
      />
    )
    expect(screen.getByText("Supprimer l'employé")).toBeInTheDocument()
    expect(screen.getByText('Cette action est irréversible.')).toBeInTheDocument()
  })

  it('calls onOpenChange(false) when Annuler is clicked', async () => {
    const onOpenChange = vi.fn()
    render(
      <DeleteConfirmDialog
        open={true}
        onOpenChange={onOpenChange}
        title="Supprimer"
        description="Confirmer?"
        onConfirm={vi.fn()}
      />
    )
    await userEvent.click(screen.getByText('Annuler'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('calls onConfirm when Supprimer button is clicked', async () => {
    const onConfirm = vi.fn()
    render(
      <DeleteConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        title="Confirmer suppression"
        description="Confirmer?"
        onConfirm={onConfirm}
      />
    )
    // The action button has data-slot="alert-dialog-action"
    const buttons = screen.getAllByRole('button')
    const deleteBtn = buttons.find((b) => b.textContent === 'Supprimer')!
    await userEvent.click(deleteBtn)
    expect(onConfirm).toHaveBeenCalled()
  })
})
