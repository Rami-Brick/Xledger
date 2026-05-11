import { useEffect, useState, type FormEvent } from 'react'
import {
  getInvestmentBalances,
  getInvestmentRecipients,
  type InvestmentRecipient,
} from '@/features/investment-recipients/api'
import { useBranch } from '@/features/branches/BranchProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCurrency } from '@/features/branches/useCurrency'
import { toast } from 'sonner'
import InternalEntryField from './InternalEntryField'

interface Props {
  date: string
  initialData?: {
    amount: number
    description: string
    investment_recipient_id: string
    isReturn: boolean
    is_internal: boolean
  }
  onSubmit: (data: {
    amount: number
    description: string
    investment_recipient_id: string
    isReturn: boolean
    is_internal: boolean
  }) => Promise<void>
}

interface InvestmentBalance {
  investment_recipient_id: string
  name: string
  total_invested: number
  total_returned: number
  net_invested: number
}

export default function InvestissementsForm({ initialData, onSubmit }: Props) {
  const { activeBranch } = useBranch()
  const { format: formatAmount, currencyCode } = useCurrency()
  const branchId = activeBranch?.id ?? null
  const [recipients, setRecipients] = useState<InvestmentRecipient[]>([])
  const [balances, setBalances] = useState<InvestmentBalance[]>([])
  const [selectedId, setSelectedId] = useState(initialData?.investment_recipient_id ?? '')
  const [isReturn, setIsReturn] = useState(initialData?.isReturn ?? false)
  const [isInternal, setIsInternal] = useState(initialData?.is_internal ?? false)
  const [amount, setAmount] = useState<number>(initialData?.amount ?? 0)
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [loading, setLoading] = useState(false)
  const isEditing = !!initialData

  const loadData = async (id: string) => {
    try {
      const [recipientsData, balancesData] = await Promise.all([
        getInvestmentRecipients(id),
        getInvestmentBalances(id),
      ])
      // While editing, keep an inactive recipient if it's the one already on the
      // transaction so it remains selectable in the dropdown.
      const visible = isEditing
        ? recipientsData.filter(
            (r) => r.is_active || r.id === initialData?.investment_recipient_id,
          )
        : recipientsData.filter((r) => r.is_active)
      setRecipients(visible)
      setBalances(balancesData)
    } catch {
      toast.error('Erreur chargement bénéficiaires')
    }
  }

  useEffect(() => {
    if (!branchId) return
    loadData(branchId)
  }, [branchId])

  const selectedBalance = balances.find((b) => b.investment_recipient_id === selectedId)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedId || amount <= 0 || !description.trim()) return

    setLoading(true)
    try {
      await onSubmit({
        amount,
        description: description.trim(),
        investment_recipient_id: selectedId,
        isReturn,
        is_internal: isInternal,
      })

      if (!isEditing) {
        setSelectedId('')
        setAmount(0)
        setDescription('')
        setIsReturn(false)
        setIsInternal(false)
      }

      if (branchId) await loadData(branchId)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Type</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={!isReturn ? 'default' : 'outline'}
            onClick={() => setIsReturn(false)}
            className="w-full"
          >
            Investi
          </Button>
          <Button
            type="button"
            variant={isReturn ? 'default' : 'outline'}
            onClick={() => setIsReturn(true)}
            className="w-full"
          >
            Retour
          </Button>
        </div>
        <p className="text-xs text-white/46">
          {isReturn
            ? 'Retour sur investissement — argent qui entre'
            : 'Argent investi — sortie de fonds'}
        </p>
      </div>

      <div className="space-y-2">
        <Label>Bénéficiaire</Label>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un bénéficiaire" />
          </SelectTrigger>
          <SelectContent>
            {recipients.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
                {r.description ? ` - ${r.description}` : ''}
                {!r.is_active ? ' (inactif)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedBalance && (
        <div className="space-y-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm">
          <div className="flex justify-between text-white/80">
            <span className="text-white/60">Total investi</span>
            <span className="font-medium tabular-nums text-white">{formatAmount(selectedBalance.total_invested)}</span>
          </div>
          <div className="flex justify-between text-white/80">
            <span className="text-white/60">Total retour</span>
            <span className="font-medium tabular-nums text-[#B8EB3C]">{formatAmount(selectedBalance.total_returned)}</span>
          </div>
          <div className="flex justify-between border-t border-white/[0.06] pt-2">
            <span className="font-medium text-white">Net investi</span>
            <span
              className={`font-bold tabular-nums ${
                selectedBalance.net_invested > 0 ? 'text-[#FF9A18]' : 'text-[#B8EB3C]'
              }`}
            >
              {formatAmount(selectedBalance.net_invested)}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="amount">Montant ({currencyCode})</Label>
        <Input
          id="amount"
          type="number"
          step="1"
          min="1"
          value={amount || ''}
          onChange={(event) => setAmount(parseFloat(event.target.value) || 0)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Ex: RNE filing fee, cafe meeting, capital transfer"
          required
        />
      </div>

      <InternalEntryField
        checked={isInternal}
        onCheckedChange={setIsInternal}
        categoryLabel="Investissements"
      />

      <Button
        type="submit"
        className="w-full"
        disabled={loading || !selectedId || amount <= 0 || !description.trim()}
      >
        {loading ? 'Enregistrement...' : isReturn ? 'Enregistrer le retour' : 'Enregistrer l’investissement'}
      </Button>
    </form>
  )
}
