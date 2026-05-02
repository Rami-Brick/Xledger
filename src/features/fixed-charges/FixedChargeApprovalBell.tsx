import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, ArrowRight, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useRole } from '@/lib/RoleProvider'
import { cn } from '@/lib/utils'
import FixedChargeRequestCard from './FixedChargeRequestCard'
import { getTodayDateKey } from './recurrence'
import {
  approveFixedChargeRequest,
  ensureFixedChargeRequestsGenerated,
  findPossibleExistingFixedChargeTransactions,
  getPendingFixedChargeRequests,
  skipFixedChargeRequest,
  type FixedChargeRequest,
  type PossibleFixedChargeTransaction,
} from './requests'

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

export default function FixedChargeApprovalBell() {
  const navigate = useNavigate()
  const { canEditTransactions } = useRole()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [requests, setRequests] = useState<FixedChargeRequest[]>([])
  const [duplicates, setDuplicates] = useState<DuplicateMap>({})
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!canEditTransactions) return

    setLoading(true)
    try {
      await ensureFixedChargeRequestsGenerated()
      const pending = await getPendingFixedChargeRequests()
      setRequests(pending)
      setDuplicates(await loadDuplicates(pending))
    } catch {
      toast.error('Erreur chargement charges a valider')
    } finally {
      setLoading(false)
    }
  }, [canEditTransactions])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (open) refresh()
  }, [open, refresh])

  const dueCount = useMemo(() => {
    const today = getTodayDateKey()
    return requests.filter((request) => request.due_date <= today).length
  }, [requests])

  if (!canEditTransactions) return null

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
    <>
      <button
        type="button"
        aria-label={`Charges a valider${dueCount > 0 ? `: ${dueCount}` : ''}`}
        onClick={() => setOpen(true)}
        className={cn(
          'relative inline-flex size-10 shrink-0 items-center justify-center rounded-full',
          'border border-white/[0.08] bg-white/[0.06] text-white transition-colors',
          'hover:bg-white/[0.10] focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
          dueCount > 0 && 'border-[#FF4D6D]/40 bg-[#FF4D6D]/15 text-[#FFB3C0] animate-pulse'
        )}
      >
        <Bell className="size-[18px]" />
        {dueCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-[#FF4D6D] px-1 text-[10px] font-bold text-white">
            {dueCount}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full border-white/[0.08] bg-[#0A0B0A] text-white sm:max-w-md"
        >
          <SheetHeader className="border-b border-white/[0.06] px-5 py-4">
            <SheetTitle className="text-white">Charges a valider</SheetTitle>
            <SheetDescription className="text-white/46">
              Approuver, ajuster le montant ou ignorer la periode.
            </SheetDescription>
          </SheetHeader>

          <div className="flex items-center justify-between gap-3 px-5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={refresh}
            >
              <RefreshCw className="size-4" />
              Actualiser
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false)
                navigate('/charges-fixes-a-venir')
              }}
            >
              Voir tout
              <ArrowRight className="size-4" />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
            {loading ? (
              <p className="py-8 text-center text-sm text-white/46">Chargement...</p>
            ) : requests.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/46">
                Aucune charge a valider.
              </p>
            ) : (
              <div className="space-y-3">
                {requests.map((request) => (
                  <FixedChargeRequestCard
                    key={`${request.id}-${request.status}-${request.approved_amount || request.suggested_amount}`}
                    request={request}
                    duplicateTransactions={duplicates[request.id]}
                    submitting={submittingId === request.id}
                    onApprove={handleApprove}
                    onSkip={handleSkip}
                  />
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
