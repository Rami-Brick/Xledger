import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PretsForm from '@/features/transactions/forms/PretsForm'
import { getLoanBalances, getLoanContacts } from '@/features/loan-contacts/api'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))
vi.mock('@/features/loan-contacts/api')
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

const mockGetLoanContacts = vi.mocked(getLoanContacts)
const mockGetLoanBalances = vi.mocked(getLoanBalances)

const mockContacts = [
  { id: 'lc1', name: 'Ali Ben Salah', description: 'Ami', is_active: true, created_at: '' },
  { id: 'lc2', name: 'Inactive Contact', description: '', is_active: false, created_at: '' },
]

const mockBalances = [
  { loan_contact_id: 'lc1', name: 'Ali Ben Salah', total_lent: 5000, total_repaid: 2000, remaining: 3000 },
]

function selectContact(value: string) {
  const hiddenSelect = document.querySelector('select[aria-hidden="true"]') as HTMLSelectElement
  fireEvent.change(hiddenSelect, { target: { value } })
}

describe('PretsForm', () => {
  beforeEach(() => {
    mockGetLoanContacts.mockResolvedValue(mockContacts)
    mockGetLoanBalances.mockResolvedValue(mockBalances)
  })

  it('defaults to Recu mode (submit button shows "Enregistrer le recu")', async () => {
    render(<PretsForm date="2024-04-01" onSubmit={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Enregistrer le recu' })).toBeInTheDocument()
    })
  })

  it('shows "argent qui entre" description by default (Recu state)', async () => {
    render(<PretsForm date="2024-04-01" onSubmit={vi.fn()} />)
    await waitFor(() => {
      expect(screen.getByText(/argent qui entre/i)).toBeInTheDocument()
    })
  })

  it('clicking "Rendu" switches description to "argent qui sort"', async () => {
    render(<PretsForm date="2024-04-01" onSubmit={vi.fn()} />)
    await waitFor(() => screen.getByRole('button', { name: 'Rendu' }))
    await userEvent.click(screen.getByRole('button', { name: 'Rendu' }))
    expect(screen.getByText(/argent qui sort/i)).toBeInTheDocument()
  })

  it('submit button label switches after clicking Rendu', async () => {
    render(<PretsForm date="2024-04-01" onSubmit={vi.fn()} />)
    await waitFor(() => screen.getByRole('button', { name: 'Rendu' }))
    await userEvent.click(screen.getByRole('button', { name: 'Rendu' }))
    expect(screen.getByRole('button', { name: 'Enregistrer le rendu' })).toBeInTheDocument()
  })

  it('shows only active contacts in the hidden select options', async () => {
    render(<PretsForm date="2024-04-01" onSubmit={vi.fn()} />)

    await waitFor(() => {
      const hiddenSelect = document.querySelector('select[aria-hidden="true"]') as HTMLSelectElement
      const options = Array.from(hiddenSelect.options).map((o) => o.text)
      expect(options.some((t) => t.includes('Ali Ben Salah'))).toBe(true)
      expect(options.every((t) => !t.includes('Inactive Contact'))).toBe(true)
    })
  })

  it('shows balance panel after selecting a contact with a balance', async () => {
    render(<PretsForm date="2024-04-01" onSubmit={vi.fn()} />)

    await waitFor(() => document.querySelector('select[aria-hidden="true"]'))
    selectContact('lc1')

    await waitFor(() => {
      expect(screen.getByText('Total recu')).toBeInTheDocument()
      expect(screen.getByText('5000.000 TND')).toBeInTheDocument()
      expect(screen.getByText('Reste a rendre')).toBeInTheDocument()
    })
  })

  it('calls onSubmit with isRendu=false when in Recu mode', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<PretsForm date="2024-04-01" onSubmit={onSubmit} />)

    await waitFor(() => document.querySelector('select[aria-hidden="true"]'))
    selectContact('lc1')

    await userEvent.type(screen.getByLabelText('Montant (TND)'), '1000')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer le recu' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ isRendu: false, loan_contact_id: 'lc1' })
      )
    })
  })

  it('calls onSubmit with isRendu=true when in Rendu mode', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<PretsForm date="2024-04-01" onSubmit={onSubmit} />)

    await waitFor(() => screen.getByRole('button', { name: 'Rendu' }))
    await userEvent.click(screen.getByRole('button', { name: 'Rendu' }))

    await waitFor(() => document.querySelector('select[aria-hidden="true"]'))
    selectContact('lc1')

    await userEvent.type(screen.getByLabelText('Montant (TND)'), '500')
    await userEvent.click(screen.getByRole('button', { name: 'Enregistrer le rendu' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ isRendu: true, loan_contact_id: 'lc1' })
      )
    })
  })
})
