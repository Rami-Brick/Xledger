import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import SimpleForm from '@/features/transactions/forms/SimpleForm'

const defaultProps = {
  date: '2024-04-01',
  categoryLabel: 'Recettes',
  onSubmit: vi.fn().mockResolvedValue(undefined),
}

describe('SimpleForm', () => {
  it('submit button is disabled when amount is 0', () => {
    render(<SimpleForm {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()
  })

  it('submit button is enabled when amount is filled', async () => {
    render(<SimpleForm {...defaultProps} />)
    await userEvent.type(screen.getByLabelText(/Montant/), '100')
    expect(screen.getByRole('button', { name: 'Enregistrer' })).not.toBeDisabled()
  })

  it('calls onSubmit with correct data', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<SimpleForm {...defaultProps} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText(/Description/), 'Vente produits')
    await userEvent.type(screen.getByLabelText(/Montant/), '500')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        amount: 500,
        description: 'Vente produits',
        is_internal: false,
      })
    })
  })

  it('resets fields after submit in non-edit mode', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<SimpleForm {...defaultProps} onSubmit={onSubmit} />)

    const amountInput = screen.getByLabelText(/Montant/)
    await userEvent.type(amountInput, '200')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    await waitFor(() => {
      expect((amountInput as HTMLInputElement).value).toBe('')
    })
  })

  it('pre-populates fields in edit mode', () => {
    render(
      <SimpleForm
        {...defaultProps}
        initialData={{ amount: 300, description: 'Sponsoring X', is_internal: false }}
        submitLabel="Modifier"
      />
    )
    expect((screen.getByLabelText(/Description/) as HTMLInputElement).value).toBe('Sponsoring X')
    expect((screen.getByLabelText(/Montant/) as HTMLInputElement).value).toBe('300')
  })

  it('does not reset fields after submit in edit mode', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <SimpleForm
        {...defaultProps}
        onSubmit={onSubmit}
        initialData={{ amount: 300, description: 'Test', is_internal: false }}
        submitLabel="Modifier"
      />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Modifier' }))

    await waitFor(() => {
      expect((screen.getByLabelText(/Montant/) as HTMLInputElement).value).toBe('300')
    })
  })

  it('description field has required attribute when descriptionRequired=true', () => {
    render(<SimpleForm {...defaultProps} descriptionRequired={true} />)
    expect(screen.getByLabelText(/Description/)).toBeRequired()
  })

  it('shows custom submitLabel on the button', () => {
    render(<SimpleForm {...defaultProps} submitLabel="Sauvegarder" />)
    expect(screen.getByRole('button', { name: 'Sauvegarder' })).toBeInTheDocument()
  })

  it('shows loading text on button while submitting', async () => {
    let resolveSubmit!: () => void
    const onSubmit = vi.fn(
      () => new Promise<void>((resolve) => { resolveSubmit = resolve })
    )
    render(<SimpleForm {...defaultProps} onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText(/Montant/), '100')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer' }))

    expect(screen.getByText('Enregistrement...')).toBeInTheDocument()
    resolveSubmit()
  })
})
