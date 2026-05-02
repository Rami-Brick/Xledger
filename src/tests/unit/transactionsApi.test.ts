import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteTransaction } from '@/features/transactions/api'

const { fromMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: fromMock,
  },
}))

function makeLookupChain(fixedChargeRequestId: string | null) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: { fixed_charge_request_id: fixedChargeRequestId },
    error: null,
  })
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))

  return { select, eq, maybeSingle }
}

function makeDeleteChain() {
  const eq = vi.fn().mockResolvedValue({ error: null })
  const deleteFn = vi.fn(() => ({ eq }))

  return { delete: deleteFn, eq }
}

function makeRequestUpdateChain() {
  const secondEq = vi.fn().mockResolvedValue({ error: null })
  const firstEq = vi.fn(() => ({ eq: secondEq }))
  const update = vi.fn(() => ({ eq: firstEq }))

  return { update, firstEq, secondEq }
}

describe('deleteTransaction', () => {
  beforeEach(() => {
    fromMock.mockReset()
  })

  it('reopens the linked fixed-charge request after deleting an approval transaction', async () => {
    const lookupChain = makeLookupChain('request-1')
    const deleteChain = makeDeleteChain()
    const requestUpdateChain = makeRequestUpdateChain()

    fromMock
      .mockReturnValueOnce(lookupChain)
      .mockReturnValueOnce(deleteChain)
      .mockReturnValueOnce(requestUpdateChain)

    const result = await deleteTransaction('transaction-1')

    expect(result).toEqual({ reopenedFixedChargeRequest: true })
    expect(fromMock).toHaveBeenNthCalledWith(1, 'transactions')
    expect(fromMock).toHaveBeenNthCalledWith(2, 'transactions')
    expect(fromMock).toHaveBeenNthCalledWith(3, 'fixed_charge_requests')
    expect(lookupChain.select).toHaveBeenCalledWith('fixed_charge_request_id')
    expect(lookupChain.eq).toHaveBeenCalledWith('id', 'transaction-1')
    expect(deleteChain.delete).toHaveBeenCalled()
    expect(deleteChain.eq).toHaveBeenCalledWith('id', 'transaction-1')
    expect(requestUpdateChain.update).toHaveBeenCalledWith({
      status: 'pending',
      approved_amount: null,
      status_changed_by: null,
      status_changed_at: null,
      decision_note: null,
    })
    expect(requestUpdateChain.firstEq).toHaveBeenCalledWith('id', 'request-1')
    expect(requestUpdateChain.secondEq).toHaveBeenCalledWith('status', 'approved')
  })

  it('does not touch fixed-charge requests for normal transactions', async () => {
    const lookupChain = makeLookupChain(null)
    const deleteChain = makeDeleteChain()

    fromMock.mockReturnValueOnce(lookupChain).mockReturnValueOnce(deleteChain)

    const result = await deleteTransaction('transaction-1')

    expect(result).toEqual({ reopenedFixedChargeRequest: false })
    expect(fromMock).toHaveBeenCalledTimes(2)
  })
})
