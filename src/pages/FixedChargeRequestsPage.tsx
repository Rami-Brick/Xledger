import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { CircularIconButton, GlassPanel } from '@/components/system-ui/primitives'
import FixedChargeRequestCard from '@/features/fixed-charges/FixedChargeRequestCard'
import { getTodayDateKey } from '@/features/fixed-charges/recurrence'
import {
  approveFixedChargeRequest,
  ensureFixedChargeRequestsGenerated,
  findPossibleExistingFixedChargeTransactions,
  getUpcomingFixedChargeRequests,
  skipFixedChargeRequest,
  type FixedChargeRequest,
  type PossibleFixedChargeTransaction,
} from '@/features/fixed-charges/requests'
import { useRole } from '@/lib/RoleProvider'

type DuplicateMap = Record<string, PossibleFixedChargeTransaction[]>

async function loadDuplicates(requests: FixedChargeRequest[]) {
  const pending = requests.filter((request) => request.status === 'pending')
  const entries = await Promise.all(
    pending.map(async (request) => [
      request.id,
      await findPossibleExistingFixedChargeTransactions(request),
    ] as const)
  )

  return Object.fromEntries(entries) as DuplicateMap
}

function sortRecentDecisions(requests: FixedChargeRequest[]) {
  return [...requests].sort((a, b) => {
    const left = a.status_changed_at || a.updated_at || a.due_date
    const right = b.status_changed_at || b.updated_at || b.due_date
    return right.localeCompare(left)
  })
}

export default function FixedChargeRequestsPage() {
  const navigate = useNavigate()
  const { canEditTransactions, loading: roleLoading } = useRole()
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<FixedChargeRequest[]>([])
  const [duplicates, setDuplicates] = useState<DuplicateMap>({})
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!canEditTransactions) return

    setLoading(true)
    try {
      await ensureFixedChargeRequestsGenerated()
      const nextRequests = await getUpcomingFixedChargeRequests()
      setRequests(nextRequests)
      setDuplicates(await loadDuplicates(nextRequests))
    } catch {
      toast.error('Erreur chargement charges a valider')
    } finally {
      setLoading(false)
    }
  }, [canEditTransactions])

  useEffect(() => {
    refresh()
  }, [refresh])

  const sections = useMemo(() => {
    const today = getTodayDateKey()
    const pending = requests.filter((request) => request.status === 'pending')
    const decided = requests.filter((request) => request.status !== 'pending')

    return {
      overdue: pending.filter((request) => request.due_date < today),
      today: pending.filter((request) => request.due_date === today),
      recent: sortRecentDecisions(decided).slice(0, 20),
    }
  }, [requests])

  if (roleLoading) return null
  if (!canEditTransactions) return <Navigate to="/dashboard" replace />

  const handleApprove = async (request: FixedChargeRequest, amount: number) => {
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
  }

  const handleSkip = async (request: FixedChargeRequest) => {
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
  }

  return (
    <div className="relative w-full min-w-0">
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 -left-40 h-[480px] w-[480px] rounded-full blur-3xl"
        style={{ background: 'rgba(217,75,244,0.10)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -bottom-40 -right-40 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{ background: 'rgba(184,235,60,0.10)' }}
      />

      <div className="relative z-10 space-y-5">
        <div className="flex items-center gap-3">
          <CircularIconButton
            variant="glass"
            size="sm"
            icon={<ArrowLeft />}
            aria-label="Retour aux categories"
            onClick={() => navigate('/categories?category=Charges%20fixes')}
          />
          <span className="text-xs text-white/60">Charges fixes</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white md:text-2xl">
              Charges a valider
            </h1>
            <p className="mt-1 text-sm text-white/60">
              Seulement les charges dues ou en retard sont affichees.
            </p>
          </div>
          <Button type="button" variant="outline" disabled={loading} onClick={refresh}>
            <RefreshCw className="size-4" />
            Actualiser
          </Button>
        </div>

        {loading ? (
          <GlassPanel className="p-6">
            <p className="py-8 text-center text-sm text-white/46">Chargement...</p>
          </GlassPanel>
        ) : (
          <div className="space-y-4">
            <RequestSection
              title="En retard"
              empty="Aucune charge en retard."
              requests={sections.overdue}
              duplicates={duplicates}
              submittingId={submittingId}
              onApprove={handleApprove}
              onSkip={handleSkip}
            />
            <RequestSection
              title="Aujourd'hui"
              empty="Aucune charge due aujourd'hui."
              requests={sections.today}
              duplicates={duplicates}
              submittingId={submittingId}
              onApprove={handleApprove}
              onSkip={handleSkip}
            />
            <RequestSection
              title="Decisions recentes"
              empty="Aucune decision recente."
              requests={sections.recent}
              duplicates={duplicates}
              submittingId={submittingId}
              showActions={false}
              onApprove={handleApprove}
              onSkip={handleSkip}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function RequestSection({
  title,
  empty,
  requests,
  duplicates,
  submittingId,
  showActions = true,
  onApprove,
  onSkip,
}: {
  title: string
  empty: string
  requests: FixedChargeRequest[]
  duplicates: DuplicateMap
  submittingId: string | null
  showActions?: boolean
  onApprove: (request: FixedChargeRequest, amount: number) => Promise<void>
  onSkip: (request: FixedChargeRequest) => Promise<void>
}) {
  return (
    <GlassPanel className="p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-white">{title}</p>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[11px] text-white/60">
          {requests.length}
        </span>
      </div>
      {requests.length === 0 ? (
        <p className="py-4 text-sm text-white/46">{empty}</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {requests.map((request) => (
            <FixedChargeRequestCard
              key={`${request.id}-${request.status}-${request.approved_amount || request.suggested_amount}`}
              request={request}
              duplicateTransactions={duplicates[request.id]}
              submitting={submittingId === request.id}
              showActions={showActions}
              onApprove={onApprove}
              onSkip={onSkip}
            />
          ))}
        </div>
      )}
    </GlassPanel>
  )
}
