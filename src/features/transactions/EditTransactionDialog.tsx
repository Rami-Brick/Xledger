import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { updateTransaction, type Category } from '@/features/transactions/api'
import { categoryConfig } from '@/features/transactions/categories'
import { toast } from 'sonner'

import SimpleForm from './forms/SimpleForm'
import ChargesFixesForm from './forms/ChargesFixesForm'
import FournisseursForm from './forms/FournisseursForm'
import SubcategoryForm from './forms/SubcategoryForm'
import SubscriptionsForm from './forms/SubscriptionsForm'
import SalairesForm from './forms/SalairesForm'
import PretsForm from './forms/PretsForm'

interface TransactionRow {
  id: string
  date: string
  category: Category
  amount: number
  description: string | null
  is_internal: boolean | null
  employee_id: string | null
  fixed_charge_id: string | null
  product_id: string | null
  subcategory_id: string | null
  subscription_id: string | null
  loan_contact_id: string | null
}

interface EditTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: TransactionRow | null
  onSuccess: () => void
}

export default function EditTransactionDialog({
  open,
  onOpenChange,
  transaction,
  onSuccess,
}: EditTransactionDialogProps) {
  // Sync date when transaction changes
    const [localDate, setLocalDate] = useState('')

    useEffect(() => {
    if (open && transaction?.date) {
        setLocalDate(transaction.date)
    }
    }, [open, transaction?.date])

  if (!transaction) return null

  const config = categoryConfig[transaction.category]
  const absAmount = Math.abs(transaction.amount)
  const isRendu = transaction.amount < 0 // for Prêts: negative = Rendu (money out)

  const handleUpdate = async (formData: Record<string, unknown>) => {
    try {
        const config = categoryConfig[transaction.category]

        let amount: number
        const rawAmount = formData.amount as number
        if (transaction.category === 'Prêts') {
        const isRendu = formData.isRendu as boolean
        amount = isRendu ? -Math.abs(rawAmount) : Math.abs(rawAmount)
        } else {
        amount = config.type === 'expense' ? -Math.abs(rawAmount) : Math.abs(rawAmount)
        }

        await updateTransaction(transaction.id, {
        date: localDate,
        ...formData,
        amount,
        })
        toast.success('Transaction modifiée')
        onOpenChange(false)
        onSuccess()
    } catch {
        toast.error('Erreur lors de la modification')
    }
}
  const renderForm = () => {
    switch (transaction.category) {
      case 'Salaires':
        return (
          <SalairesForm
            date={localDate}
            initialData={{
              amount: absAmount,
              description: transaction.description ?? '',
              employee_id: transaction.employee_id ?? '',
            }}
            onSubmit={handleUpdate}
          />
        )

      case 'Charges fixes':
        return (
          <ChargesFixesForm
            date={localDate}
            initialData={{
              amount: absAmount,
              description: transaction.description ?? '',
              fixed_charge_id: transaction.fixed_charge_id ?? '',
            }}
            onSubmit={handleUpdate}
          />
        )

      case 'Fournisseurs':
        return (
          <FournisseursForm
            date={localDate}
            initialData={{
              amount: absAmount,
              description: transaction.description ?? '',
              product_id: transaction.product_id ?? '',
            }}
            onSubmit={handleUpdate}
          />
        )

      case 'Transport':
      case 'Packaging':
        return (
          <SubcategoryForm
            date={localDate}
            parentCategory={transaction.category}
            initialData={{
              amount: absAmount,
              description: transaction.description ?? '',
              subcategory_id: transaction.subcategory_id ?? '',
            }}
            onSubmit={handleUpdate}
          />
        )

      case 'Subscriptions':
        return (
          <SubscriptionsForm
            date={localDate}
            initialData={{
              amount: absAmount,
              description: transaction.description ?? '',
              subscription_id: transaction.subscription_id ?? '',
            }}
            onSubmit={handleUpdate}
          />
        )

      case 'Prêts':
        return (
          <PretsForm
            date={localDate}
            initialData={{
              amount: absAmount,
              description: transaction.description ?? '',
              loan_contact_id: transaction.loan_contact_id ?? '',
              isRendu,
              is_internal: transaction.is_internal ?? false,
            }}
            onSubmit={handleUpdate}
          />
        )

      case 'Sponsoring':
      case 'Divers':
      case 'Recettes':
      default:
        return (
          <SimpleForm
            date={localDate}
            initialData={{
              amount: absAmount,
              description: transaction.description ?? '',
            }}
            onSubmit={handleUpdate}
          />
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Modifier la transaction —{' '}
            <span className={config.textColor}>{transaction.category}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 mb-2">
          <Label htmlFor="edit-date">Date</Label>
          <Input
            id="edit-date"
            type="date"
            value={localDate}
            onChange={(e) => setLocalDate(e.target.value)}
          />
        </div>

        {renderForm()}
      </DialogContent>
    </Dialog>
  )
}
