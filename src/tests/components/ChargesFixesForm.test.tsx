import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ChargesFixesForm from '@/features/transactions/forms/ChargesFixesForm'
import { getFixedCharges } from '@/features/fixed-charges/api'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))
vi.mock('@/features/fixed-charges/api')
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

const mockGetFixedCharges = vi.mocked(getFixedCharges)

const mockCharges = [
  { id: 'c1', name: 'Loyer bureau', default_amount: 1200, is_active: true, created_at: '' },
  { id: 'c2', name: 'Internet', default_amount: 80, is_active: true, created_at: '' },
  { id: 'c3', name: 'Ancienne charge', default_amount: 500, is_active: false, created_at: '' },
]

function selectOption(value: string) {
  // Radix Select renders a hidden <select> for accessibility — use it to change value
  const hiddenSelect = document.querySelector('select[aria-hidden="true"]') as HTMLSelectElement
  fireEvent.change(hiddenSelect, { target: { value } })
}

describe('ChargesFixesForm', () => {
  it('loads and shows only active charges options', async () => {
    mockGetFixedCharges.mockResolvedValue(mockCharges)
    render(<ChargesFixesForm date="2024-04-01" onSubmit={vi.fn()} />)

    await waitFor(() => {
      const hiddenSelect = document.querySelector('select[aria-hidden="true"]') as HTMLSelectElement
      const options = Array.from(hiddenSelect.options).map((o) => o.text)
      expect(options).toContain('Loyer bureau')
      expect(options).toContain('Internet')
      expect(options).not.toContain('Ancienne charge')
    })
  })

  it('auto-populates amount when a charge is selected (non-edit mode)', async () => {
    mockGetFixedCharges.mockResolvedValue(mockCharges)
    render(<ChargesFixesForm date="2024-04-01" onSubmit={vi.fn()} />)

    await waitFor(() => document.querySelector('select[aria-hidden="true"]'))
    selectOption('c1')

    await waitFor(() => {
      expect((screen.getByLabelText('Montant (TND)') as HTMLInputElement).value).toBe('1200')
    })
  })

  it('does not overwrite amount when in edit mode', async () => {
    mockGetFixedCharges.mockResolvedValue(mockCharges)
    render(
      <ChargesFixesForm
        date="2024-04-01"
        initialData={{ amount: 999, description: 'Loyer bureau', fixed_charge_id: 'c1', is_internal: false }}
        onSubmit={vi.fn()}
      />
    )

    await waitFor(() => {
      expect((screen.getByLabelText('Montant (TND)') as HTMLInputElement).value).toBe('999')
    })

    // Changing selection in edit mode should NOT change the amount
    selectOption('c2')
    await waitFor(() => {
      expect((screen.getByLabelText('Montant (TND)') as HTMLInputElement).value).toBe('999')
    })
  })

  it('submit button is disabled before charge is selected', async () => {
    mockGetFixedCharges.mockResolvedValue(mockCharges)
    render(<ChargesFixesForm date="2024-04-01" onSubmit={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Enregistrer la charge' })).toBeDisabled()
    })
  })

  it('calls onSubmit with correct shape after selecting charge', async () => {
    mockGetFixedCharges.mockResolvedValue(mockCharges)
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<ChargesFixesForm date="2024-04-01" onSubmit={onSubmit} />)

    await waitFor(() => document.querySelector('select[aria-hidden="true"]'))
    selectOption('c2')

    await waitFor(() => {
      expect((screen.getByLabelText('Montant (TND)') as HTMLInputElement).value).toBe('80')
    })

    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer la charge' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        fixed_charge_id: 'c2',
        amount: 80,
        description: 'Internet',
        is_internal: false,
      })
    })
  })
})
