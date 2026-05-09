import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useRole } from '@/lib/RoleProvider'
import { useBranch } from '@/features/branches/BranchProvider'
import {
  approveFixedChargeRequest,
  ensureFixedChargeRequestsGenerated,
  findPossibleExistingFixedChargeTransactions,
  getPendingFixedChargeRequests,
  skipFixedChargeRequest,
  type FixedChargeRequest,
  type PossibleFixedChargeTransaction,
} from './requests'
import { getTodayDateKey } from './recurrence'

type DuplicateMap = Record<string, PossibleFixedChargeTransaction[]>

async function loadDuplicates(requests: FixedChargeRequest[]) {
  const entries = await Promise.all(
    requests.map(async (request) => [
      request.id,
      await findPossibleExistingFixedChargeTransactions(request),
    ] as const)
  )
  return Object.fromEntries(entries) as DuplicateMap
}

/**
 * Shared state and actions for the fixed-charge approval queue.
 *
 * Used by both the avatar-dropdown "Notifications" entry (for the badge
 * count) and the sheet that lists pending requests. Keeping the data in a
 * single hook means we don't double-fetch when both consumers mount.
 */
export function useFixedChargeApprovals() {
  const { canEditTransactions } = useRole()
  const { activeBranch } = useBranch()
  const branchId = activeBranch?.id ?? null

  const [loading, setLoading] = useState(false)
  const [requests, setRequests] = useState<FixedChargeRequest[]>([])
  const [duplicates, setDuplicates] = useState<DuplicateMap>({})
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!canEditTransactions) return
    if (!branchId) return

    setLoading(true)
    try {
      await ensureFixedChargeRequestsGenerated(branchId)
      const pending = await getPendingFixedChargeRequests(branchId)
      setRequests(pending)
      setDuplicates(await loadDuplicates(pending))
    } catch {
      toast.error('Erreur chargement charges a valider')
    } finally {
      setLoading(false)
    }
  }, [branchId, canEditTransactions])

  useEffect(() => {
    refresh()
  }, [refresh])

  const dueCount = useMemo(() => {
    const today = getTodayDateKey()
    return requests.filter((request) => request.due_date <= today).length
  }, [requests])

  const handleApprove = useCallback(
    async (request: FixedChargeRequest, amount: number) => {
      setSubmittingId(request.id)
      try {
        await approveFixedChargeRequest(request, amount)
        toast.success('Charge approuvee')
        await refresh()
      } catch {
        toast.error("Erreur lors de l'approbation")
      } finally {
        setSubmittingId(null)
      }
    },
    [refresh],
  )

  const handleSkip = useCallback(
    async (request: FixedChargeRequest) => {
      setSubmittingId(request.id)
      try {
        await skipFixedChargeRequest(request)
        toast.success('Periode ignoree')
        await refresh()
      } catch {
        toast.error("Erreur lors de l'ignorance")
      } finally {
        setSubmittingId(null)
      }
    },
    [refresh],
  )

  return {
    canEditTransactions,
    loading,
    requests,
    duplicates,
    submittingId,
    dueCount,
    refresh,
    handleApprove,
    handleSkip,
  }
}
