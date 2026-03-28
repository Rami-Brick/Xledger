import { useEffect, useState, type FormEvent } from 'react'
import { getLoanBalances, getLoanContacts, type LoanContact } from '@/features/loan-contacts/api'
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
import { formatTND } from '@/lib/format'
import { toast } from 'sonner'
import InternalEntryField from './InternalEntryField'

interface Props {
  date: string
  initialData?: {
    amount: number
    description: string
    loan_contact_id: string
    isRendu: boolean
    is_internal: boolean
  }
  onSubmit: (data: {
    amount: number
    description: string
    loan_contact_id: string
    isRendu: boolean
    is_internal: boolean
  }) => Promise<void>
}

interface LoanBalance {
  loan_contact_id: string
  name: string
  total_lent: number
  total_repaid: number
  remaining: number
}

export default function PretsForm({ date, initialData, onSubmit }: Props) {
  const [contacts, setContacts] = useState<LoanContact[]>([])
  const [balances, setBalances] = useState<LoanBalance[]>([])
  const [selectedId, setSelectedId] = useState(initialData?.loan_contact_id ?? '')
  const [isRendu, setIsRendu] = useState(initialData?.isRendu ?? false)
  const [isInternal, setIsInternal] = useState(initialData?.is_internal ?? false)
  const [amount, setAmount] = useState<number>(initialData?.amount ?? 0)
  const [loading, setLoading] = useState(false)
  const isEditing = !!initialData

  const loadData = async () => {
    try {
      const [contactsData, balancesData] = await Promise.all([
        getLoanContacts(),
        getLoanBalances(),
      ])
      setContacts(contactsData.filter((contact) => contact.is_active))
      setBalances(balancesData)
    } catch {
      toast.error('Erreur chargement contacts')
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const selectedContact = contacts.find((contact) => contact.id === selectedId)
  const selectedBalance = balances.find((balance) => balance.loan_contact_id === selectedId)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!selectedId || amount <= 0) return

    setLoading(true)
    try {
      const label = isRendu ? 'Rendu' : 'Recu'
      await onSubmit({
        amount,
        description: `${label} - ${selectedContact?.name}`,
        loan_contact_id: selectedId,
        isRendu,
        is_internal: isInternal,
      })

      if (!isEditing) {
        setSelectedId('')
        setAmount(0)
        setIsRendu(false)
        setIsInternal(false)
      }

      await loadData()
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
            variant={!isRendu ? 'default' : 'outline'}
            onClick={() => setIsRendu(false)}
            className="w-full"
          >
            Recu
          </Button>
          <Button
            type="button"
            variant={isRendu ? 'default' : 'outline'}
            onClick={() => setIsRendu(true)}
            className="w-full"
          >
            Rendu
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {isRendu
            ? 'La societe rembourse - argent qui sort'
            : 'La societe recoit un pret - argent qui entre'}
        </p>
      </div>

      <div className="space-y-2">
        <Label>Personne</Label>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger>
            <SelectValue placeholder="Selectionner une personne" />
          </SelectTrigger>
          <SelectContent>
            {contacts.map((contact) => (
              <SelectItem key={contact.id} value={contact.id}>
                {contact.name}
                {contact.description ? ` - ${contact.description}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedBalance && (
        <div className="space-y-2 rounded-md bg-muted p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total recu</span>
            <span className="font-medium">{formatTND(selectedBalance.total_lent)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total rendu</span>
            <span className="font-medium">{formatTND(selectedBalance.total_repaid)}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="font-medium">Reste a rendre</span>
            <span
              className={`font-bold ${
                selectedBalance.remaining > 0 ? 'text-orange-600' : 'text-green-600'
              }`}
            >
              {formatTND(selectedBalance.remaining)}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="amount">Montant (TND)</Label>
        <Input
          id="amount"
          type="number"
          step="0.001"
          min="0.001"
          value={amount || ''}
          onChange={(event) => setAmount(parseFloat(event.target.value) || 0)}
          required
        />
      </div>

      <InternalEntryField
        checked={isInternal}
        onCheckedChange={setIsInternal}
        categoryLabel="Prets"
      />

      <Button type="submit" className="w-full" disabled={loading || !selectedId || amount <= 0}>
        {loading ? 'Enregistrement...' : isRendu ? 'Enregistrer le rendu' : 'Enregistrer le recu'}
      </Button>
    </form>
  )
}
