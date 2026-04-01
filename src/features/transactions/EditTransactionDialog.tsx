import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateTransaction, type Category } from '@/features/transactions/api'
import { categoryConfig } from '@/features/transactions/categories'
import { toast } from 'sonner'
import ChargesFixesForm from './forms/ChargesFixesForm'
import FournisseursForm from './forms/FournisseursForm'
import PretsForm from './forms/PretsForm'
import SalairesForm from './forms/SalairesForm'
import SimpleForm from './forms/SimpleForm'
import SubcategoryForm from './forms/SubcategoryForm'
import SubscriptionsForm from './forms/SubscriptionsForm'

interface TransactionRow {
  id: string
  date: string
  salary_month: string | null
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
  const [localDate, setLocalDate] = useState('')

  useEffect(() => {
    if (open && transaction?.date) {
      setLocalDate(transaction.date)
    }
  }, [open, transaction?.date])

  if (!transaction) return null

  const config = categoryConfig[transaction.category]
  const absAmount = Math.abs(transaction.amount)
  const isRendu = transaction.amount < 0

  const handleUpdate = async (formData: Record<string, unknown>) => {
    try {
      const transactionConfig = categoryConfig[transaction.category]
      const { isRendu: isRenduValue, ...dbFields } = formData
      const rawAmount = formData.amount as number

      let amount: number
      if (transaction.category === 'Prêts') {
        amount = (isRenduValue as boolean) ? -Math.abs(rawAmount) : Math.abs(rawAmount)
      } else {
        amount =
          transactionConfig.type === 'expense' ? -Math.abs(rawAmount) : Math.abs(rawAmount)
      }

      await updateTransaction(transaction.id, {
        date: localDate,
        ...dbFields,
        amount,
      })

      toast.success('Transaction modifiee')
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
              salary_month: transaction.salary_month,
              is_internal: transaction.is_internal ?? false,
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
              is_internal: transaction.is_internal ?? false,
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
              is_internal: transaction.is_internal ?? false,
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
              is_internal: transaction.is_internal ?? false,
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
              is_internal: transaction.is_internal ?? false,
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
        return (
          <SimpleForm
            date={localDate}
            categoryLabel="Sponsoring"
            descriptionRequired
            initialData={{
              amount: absAmount,
              description: transaction.description ?? '',
              is_internal: transaction.is_internal ?? false,
            }}
            onSubmit={handleUpdate}
          />
        )

      case 'Divers':
        return (
          <SimpleForm
            date={localDate}
            categoryLabel="Divers"
            descriptionRequired
            initialData={{
              amount: absAmount,
              description: transaction.description ?? '',
              is_internal: transaction.is_internal ?? false,
            }}
            onSubmit={handleUpdate}
          />
        )

      case 'Recettes':
      default:
        return (
          <SimpleForm
            date={localDate}
            categoryLabel="Recettes"
            initialData={{
              amount: absAmount,
              description: transaction.description ?? '',
              is_internal: transaction.is_internal ?? false,
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
            Modifier la transaction - <span className={config.textColor}>{transaction.category}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="mb-2 space-y-2">
          <Label htmlFor="edit-date">Date</Label>
          <Input
            id="edit-date"
            type="date"
            value={localDate}
            onChange={(event) => setLocalDate(event.target.value)}
          />
        </div>

        {renderForm()}
      </DialogContent>
    </Dialog>
  )
}
