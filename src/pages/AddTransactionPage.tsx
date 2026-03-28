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
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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

    await createTransaction({
      date,
      category,
      amount,
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
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Ajouter une transaction</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Selectionnez une categorie puis remplissez le formulaire
        </p>
      </div>

      {!selectedCategory ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {CATEGORIES.map((category) => {
            const config = categoryConfig[category]
            const Icon = config.icon
            return (
              <Card
                key={category}
                className={`cursor-pointer border-2 transition-all ${config.color}`}
                onClick={() => handleCategorySelect(category)}
              >
                <CardContent className="flex flex-col items-center justify-center gap-2 py-5">
                  <Icon className={`h-7 w-7 ${config.textColor}`} />
                  <span className={`text-center text-xs font-medium sm:text-sm ${config.textColor}`}>
                    {config.label}
                  </span>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="max-w-md">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToCategories}
            className="mb-4 gap-2 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux categories
          </Button>
          <Card>
            <CardContent className="pt-6">
              <div className="mb-6 flex items-center gap-3">
                {(() => {
                  const config = categoryConfig[selectedCategory]
                  const Icon = config.icon
                  return (
                    <>
                      <div className={`rounded-md p-2 ${config.color}`}>
                        <Icon className={`h-5 w-5 ${config.textColor}`} />
                      </div>
                      <h3 className="text-lg font-semibold">{config.label}</h3>
                    </>
                  )
                })()}
              </div>
              <div className="mb-6 space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </div>
              {renderForm()}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
