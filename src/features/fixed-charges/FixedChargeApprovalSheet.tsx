import { useEffect } from 'react'
import { ArrowRight, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import FixedChargeRequestCard from './FixedChargeRequestCard'
import { useFixedChargeApprovals } from './useFixedChargeApprovals'

interface FixedChargeApprovalSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Controlled sheet that lists pending fixed-charge requests and lets the
 * user approve or skip them. The trigger lives elsewhere (avatar dropdown
 * "Notifications" item) — this component only owns the drawer.
 */
export default function FixedChargeApprovalSheet({
  open,
  onOpenChange,
}: FixedChargeApprovalSheetProps) {
  const navigate = useNavigate()
  const {
    canEditTransactions,
    loading,
    requests,
    duplicates,
    submittingId,
    refresh,
    handleApprove,
    handleSkip,
  } = useFixedChargeApprovals()

  // Refetch when the sheet opens — the data may have gone stale while the
  // user was elsewhere. The hook itself keeps a baseline up to date for
  // the badge count.
  useEffect(() => {
    if (open) refresh()
  }, [open, refresh])

  if (!canEditTransactions) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
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
              onOpenChange(false)
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
  )
}
