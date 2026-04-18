import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { useRole } from '@/lib/RoleProvider'
import { createTransaction, CATEGORIES, type Category } from '@/features/transactions/api'
import { categoryConfig } from '@/features/transactions/categories'
import ChargesFixesForm from '@/features/transactions/forms/ChargesFixesForm'
import FournisseursForm from '@/features/transactions/forms/FournisseursForm'
import PretsForm from '@/features/transactions/forms/PretsForm'
import SalairesForm from '@/features/transactions/forms/SalairesForm'
import SimpleForm from '@/features/transactions/forms/SimpleForm'
import SubcategoryForm from '@/features/transactions/forms/SubcategoryForm'
import SubscriptionsForm from '@/features/transactions/forms/SubscriptionsForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const categorySurfaceTint: Record<Category, string> = {
  Recettes: 'surface-tint-success',
  Salaires: 'surface-tint-violet',
  'Charges fixes': 'surface-tint-violet',
  Fournisseurs: 'surface-tint-warning',
  Transport: 'surface-tint-gold',
  Packaging: 'surface-tint-teal',
  Sponsoring: 'surface-tint-rose',
  Subscriptions: 'surface-tint-violet',
  'Prêts': 'surface-tint-gold',
  Divers: 'surface-tint-teal',
}

function getTodayDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function AddTransactionPage() {
  const [searchParams] = useSearchParams()
  const { canCreateTransactions } = useRole()

  if (!canCreateTransactions) {
    return <Navigate to="/" replace />
  }

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(() => {
    const category = searchParams.get('category')
    if (category && CATEGORIES.includes(category as Category)) return category as Category
    return null
  })
  const [date, setDate] = useState(getTodayDate)

  const handleCategorySelect = (category: Category) => {
    setDate(getTodayDate())
    setSelectedCategory(category)
  }

  const handleBackToCategories = () => {
    setSelectedCategory(null)
    setDate(getTodayDate())
  }

  const handleSubmit = async (
    category: Category,
    data: {
      amount: number
      description: string
      salary_month?: string | null
      is_internal?: boolean
      employee_id?: string
      fixed_charge_id?: string
      product_id?: string
      subcategory_id?: string
      subscription_id?: string
      loan_contact_id?: string
      isRendu?: boolean
    }
  ) => {
    const config = categoryConfig[category]

    let amount: number
    if (category === 'Prêts') {
      amount = data.isRendu ? -Math.abs(data.amount) : Math.abs(data.amount)
    } else {
      amount = config.type === 'expense' ? -Math.abs(data.amount) : Math.abs(data.amount)
    }

    try {
      await createTransaction({
        date,
        category,
        amount,
        salary_month: data.salary_month || null,
        description: data.description || null,
        is_internal: data.is_internal || false,
        employee_id: data.employee_id || null,
        fixed_charge_id: data.fixed_charge_id || null,
        product_id: data.product_id || null,
        subcategory_id: data.subcategory_id || null,
        subscription_id: data.subscription_id || null,
        loan_contact_id: data.loan_contact_id || null,
      })

      toast.success('Transaction enregistree', {
        description: `${category} - ${Math.abs(data.amount).toFixed(3)} TND`,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      toast.error("Échec de l'enregistrement", { description: message })
      throw err
    }
  }

  const renderForm = () => {
    if (!selectedCategory) return null
    const commonProps = { date }

    switch (selectedCategory) {
      case 'Salaires':
        return <SalairesForm {...commonProps} onSubmit={(data) => handleSubmit('Salaires', data)} />
      case 'Charges fixes':
        return (
          <ChargesFixesForm
            {...commonProps}
            onSubmit={(data) => handleSubmit('Charges fixes', data)}
          />
        )
      case 'Fournisseurs':
        return (
          <FournisseursForm
            {...commonProps}
            onSubmit={(data) => handleSubmit('Fournisseurs', data)}
          />
        )
      case 'Transport':
        return (
          <SubcategoryForm
            {...commonProps}
            parentCategory="Transport"
            onSubmit={(data) => handleSubmit('Transport', data)}
          />
        )
      case 'Packaging':
        return (
          <SubcategoryForm
            {...commonProps}
            parentCategory="Packaging"
            onSubmit={(data) => handleSubmit('Packaging', data)}
          />
        )
      case 'Subscriptions':
        return (
          <SubscriptionsForm
            {...commonProps}
            onSubmit={(data) => handleSubmit('Subscriptions', data)}
          />
        )
      case 'Prêts':
        return <PretsForm {...commonProps} onSubmit={(data) => handleSubmit('Prêts', data)} />
      case 'Sponsoring':
        return (
          <SimpleForm
            {...commonProps}
            categoryLabel="Sponsoring"
            descriptionRequired
            descriptionPlaceholder="Ex: Facebook Ads 15 Mars"
            submitLabel="Enregistrer la depense"
            onSubmit={(data) => handleSubmit('Sponsoring', data)}
          />
        )
      case 'Divers':
        return (
          <SimpleForm
            {...commonProps}
            categoryLabel="Divers"
            descriptionRequired
            descriptionPlaceholder="Description de la depense"
            submitLabel="Enregistrer la depense"
            onSubmit={(data) => handleSubmit('Divers', data)}
          />
        )
      case 'Recettes':
        return (
          <SimpleForm
            {...commonProps}
            categoryLabel="Recettes"
            descriptionPlaceholder="Ex: Recette livraison 15 Mars"
            submitLabel="Enregistrer la recette"
            onSubmit={(data) => handleSubmit('Recettes', data)}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6 max-w-[1400px] min-w-0">
      {/* Page header — dashboard-aligned */}
      <div>
        <h2 className="text-[22px] sm:text-[28px] font-semibold tracking-tight leading-tight">
          Ajouter une transaction
        </h2>
        <p className="mt-1 text-[13px] sm:text-sm text-muted-foreground">
          {selectedCategory
            ? 'Remplissez les détails ci-dessous pour enregistrer cette transaction'
            : 'Sélectionnez une catégorie pour commencer'}
        </p>
      </div>

      {!selectedCategory ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {CATEGORIES.map((category) => {
            const config = categoryConfig[category]
            const Icon = config.icon
            const tint = categorySurfaceTint[category]
            return (
              <button
                key={category}
                type="button"
                onClick={() => handleCategorySelect(category)}
                className={`premium-surface ${tint} group rounded-2xl px-4 py-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              >
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className={`grid h-11 w-11 place-items-center rounded-xl ${config.color}`}>
                    <Icon className={`h-5 w-5 ${config.textColor}`} />
                  </div>
                  <span className="text-center text-[13px] font-medium tracking-tight text-foreground">
                    {config.label}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="max-w-2xl">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToCategories}
            className="mb-4 gap-2 text-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux catégories
          </Button>
          <div
            className={`premium-surface ${categorySurfaceTint[selectedCategory]} rounded-2xl p-6`}
          >
            <div className="mb-6 flex items-center gap-3">
              {(() => {
                const config = categoryConfig[selectedCategory]
                const Icon = config.icon
                return (
                  <>
                    <div
                      className={`grid h-11 w-11 place-items-center rounded-xl ${config.color}`}
                    >
                      <Icon className={`h-5 w-5 ${config.textColor}`} />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Catégorie
                      </p>
                      <h3 className="text-base font-semibold tracking-tight text-foreground">
                        {config.label}
                      </h3>
                    </div>
                  </>
                )
              })()}
            </div>
            <div className="mb-6 space-y-2">
              <Label htmlFor="date" className="text-xs font-medium text-foreground">
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            {renderForm()}
          </div>
        </div>
      )}
    </div>
  )
}
