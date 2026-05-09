import { MemoryRouter } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import FixedChargeApprovalSheet from '@/features/fixed-charges/FixedChargeApprovalSheet'
import {
  approveFixedChargeRequest,
  ensureFixedChargeRequestsGenerated,
  findPossibleExistingFixedChargeTransactions,
  getPendingFixedChargeRequests,
  skipFixedChargeRequest,
} from '@/features/fixed-charges/requests'
import type { FixedChargeRequest } from '@/features/fixed-charges/requests'

vi.mock('@/lib/RoleProvider', () => ({
  useRole: () => ({ canEditTransactions: true }),
}))
vi.mock('@/features/branches/BranchProvider', () => ({
  useBranch: () => ({
    activeBranch: { id: 'branch-test', slug: 'test', name: 'Test', country_code: 'TN', currency_code: 'TND', is_active: true },
    branches: [],
    setActiveBranchId: () => {},
    loading: false,
    error: null,
  }),
}))
vi.mock('@/features/fixed-charges/requests')
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const request: FixedChargeRequest = {
  id: 'request-1',
  created_at: '',
  updated_at: '',
  branch_id: 'branch-test',
  fixed_charge_id: 'charge-1',
  due_date: '2000-01-01',
  suggested_amount: '100' as unknown as number,
  status: 'pending',
  approved_amount: null,
  status_changed_by: null,
  status_changed_at: null,
  decision_note: null,
  fixed_charges: { name: 'Internet', default_amount: 100, is_active: true },
}

const mockEnsure = vi.mocked(ensureFixedChargeRequestsGenerated)
const mockGetPending = vi.mocked(getPendingFixedChargeRequests)
const mockFindDuplicates = vi.mocked(findPossibleExistingFixedChargeTransactions)
const mockApprove = vi.mocked(approveFixedChargeRequest)
const mockSkip = vi.mocked(skipFixedChargeRequest)

function renderSheet() {
  return render(
    <MemoryRouter>
      <FixedChargeApprovalSheet open={true} onOpenChange={() => {}} />
    </MemoryRouter>
  )
}

describe('FixedChargeApprovalSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEnsure.mockResolvedValue([])
    mockGetPending.mockResolvedValue([request])
    mockFindDuplicates.mockResolvedValue([])
    mockApprove.mockResolvedValue({ ...request, status: 'approved', approved_amount: 100 })
    mockSkip.mockResolvedValue({ ...request, status: 'skipped' })
  })

  it('renders the pending request with its suggested amount', async () => {
    renderSheet()

    expect(await screen.findByText('Internet')).toBeVisible()
    expect(screen.getByLabelText('Modifier le montant')).toHaveValue(100)
    expect(screen.getByRole('button', { name: /approuver/i })).toBeVisible()
  })

  it('approves with the current amount', async () => {
    renderSheet()

    await screen.findByText('Internet')
    await userEvent.clear(screen.getByLabelText('Modifier le montant'))
    await userEvent.type(screen.getByLabelText('Modifier le montant'), '125')
    await userEvent.click(screen.getByRole('button', { name: /approuver/i }))

    await waitFor(() => {
      expect(mockApprove).toHaveBeenCalledWith(request, 125)
    })
  })

  it('skips the period', async () => {
    renderSheet()

    await screen.findByText('Internet')
    await userEvent.click(screen.getByRole('button', { name: /ignorer/i }))

    await waitFor(() => {
      expect(mockSkip).toHaveBeenCalledWith(request)
    })
  })

  it('shows a duplicate warning', async () => {
    mockFindDuplicates.mockResolvedValue([
      {
        id: 'tx-1',
        date: '2000-01-02',
        amount: -100,
        description: 'Internet',
        fixed_charge_id: 'charge-1',
        fixed_charge_request_id: null,
      },
    ])

    renderSheet()

    expect(await screen.findByText('Transaction possible deja enregistree')).toBeVisible()
  })
})
