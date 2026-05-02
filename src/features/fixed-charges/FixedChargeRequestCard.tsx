import { useState } from 'react'
import { AlertTriangle, Check, Clock, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDate, formatTND } from '@/lib/format'
import { cn } from '@/lib/utils'
import type {
  FixedChargeRequest,
  PossibleFixedChargeTransaction,
} from './requests'

interface FixedChargeRequestCardProps {
  request: FixedChargeRequest
  duplicateTransactions?: PossibleFixedChargeTransaction[]
  submitting?: boolean
  showActions?: boolean
  onApprove?: (request: FixedChargeRequest, amount: number) => Promise<void>
  onSkip?: (request: FixedChargeRequest) => Promise<void>
}

function statusLabel(status: FixedChargeRequest['status']) {
  if (status === 'approved') return 'Approuvee'
  if (status === 'skipped') return 'Ignoree'
  return 'A valider'
}

function statusClass(status: FixedChargeRequest['status']) {
  if (status === 'approved') return 'border-[#B8EB3C]/20 bg-[#B8EB3C]/10 text-[#B8EB3C]'
  if (status === 'skipped') return 'border-white/[0.08] bg-white/[0.04] text-white/46'
  return 'border-[#FF9A18]/20 bg-[#FF9A18]/10 text-[#FF9A18]'
}

export default function FixedChargeRequestCard({
  request,
  duplicateTransactions = [],
  submitting = false,
  showActions = true,
  onApprove,
  onSkip,
}: FixedChargeRequestCardProps) {
  const initialAmount = Number(
    request.approved_amount
      ?? request.suggested_amount
      ?? request.fixed_charges?.default_amount
      ?? 0
  )
  const [amountInput, setAmountInput] = useState(
    Number.isFinite(initialAmount) && initialAmount > 0 ? String(initialAmount) : ''
  )
  const amount = Number(amountInput)

  const canSubmit = request.status === 'pending' && Number.isFinite(amount) && amount > 0 && !submitting

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {request.fixed_charges?.name || 'Charge fixe'}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-white/46">
            <Clock className="size-3" />
            {formatDate(request.due_date)}
          </p>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium',
            statusClass(request.status)
          )}
        >
          {statusLabel(request.status)}
        </span>
      </div>

      {duplicateTransactions.length > 0 && request.status === 'pending' && (
        <div className="mt-3 rounded-xl border border-[#FF9A18]/20 bg-[#FF9A18]/10 p-3 text-xs text-[#FFCC8A]">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium">Transaction possible deja enregistree</p>
              <p className="mt-1 text-[#FFCC8A]/80">
                {formatDate(duplicateTransactions[0].date)} ·{' '}
                {formatTND(Math.abs(duplicateTransactions[0].amount))}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-3">
        <div className="w-full max-w-[12rem] space-y-1.5">
          <label
            htmlFor={`request-amount-${request.id}`}
            className="block whitespace-nowrap text-[11px] text-white/46"
          >
            Modifier le montant
          </label>
          <Input
            id={`request-amount-${request.id}`}
            type="number"
            min="1"
            step="1"
            value={amountInput}
            disabled={request.status !== 'pending' || submitting}
            onChange={(e) => setAmountInput(e.target.value)}
            className="h-11 rounded-xl text-base font-semibold tabular-nums"
          />
        </div>

        {showActions && request.status === 'pending' ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={!canSubmit}
              onClick={() => onApprove?.(request, amount)}
            >
              <Check className="size-4" />
              Approuver
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={submitting}
              onClick={() => onSkip?.(request)}
            >
              <SkipForward className="size-4" />
              Ignorer cette periode
            </Button>
          </div>
        ) : (
          <p className="text-right text-xs text-white/46">
            {request.approved_amount ? formatTND(request.approved_amount) : statusLabel(request.status)}
          </p>
        )}
      </div>
    </div>
  )
}
