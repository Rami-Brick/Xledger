import { useState } from 'react'
import { useSearchParams, Navigate } from 'react-router-dom'
import { useRole } from '@/lib/RoleProvider'
import { createTransaction, CATEGORIES, type Category } from '@/features/transactions/api'
import { categoryConfig } from '@/features/transactions/categories'
import SalairesForm from '@/features/transactions/forms/SalairesForm'
import ChargesFixesForm from '@/features/transactions/forms/ChargesFixesForm'
import FournisseursForm from '@/features/transactions/forms/FournisseursForm'
import SubcategoryForm from '@/features/transactions/forms/SubcategoryForm'
import SubscriptionsForm from '@/features/transactions/forms/SubscriptionsForm'
import PretsForm from '@/features/transactions/forms/PretsForm'
import SimpleForm from '@/features/transactions/forms/SimpleForm'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'

export default function AddTransactionPage() {
  const [searchParams] = useSearchParams()

  const { isAdmin } = useRole()
  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(() => {
    const cat = searchParams.get('category')
    if (cat && CATEGORIES.includes(cat as Category)) return cat as Category
    return null
  })
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])

  const handleSubmit = async (
    category: Category,
    data: {
      amount: number
      description: string
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
      // Reçu = money comes in (positive), Rendu = money goes out (negative)
      amount = data.isRendu ? -Math.abs(data.amount) : Math.abs(data.amount)
    } else {
      amount = config.type === 'expense' ? -Math.abs(data.amount) : Math.abs(data.amount)
    }

    await createTransaction({
      date,
      category,
      amount,
      description: data.description || null,
      employee_id: data.employee_id || null,
      fixed_charge_id: data.fixed_charge_id || null,
      product_id: data.product_id || null,
      subcategory_id: data.subcategory_id || null,
      subscription_id: data.subscription_id || null,
      loan_contact_id: data.loan_contact_id || null,
    })

    toast.success('Transaction enregistrée', {
      description: `${category} — ${Math.abs(data.amount).toFixed(3)} TND`,
    })
  }

  const renderForm = () => {
    if (!selectedCategory) return null
    const commonProps = { date }

    switch (selectedCategory) {
      case 'Salaires':
        return <SalairesForm {...commonProps} onSubmit={(data) => handleSubmit('Salaires', data)} />
      case 'Charges fixes':
        return <ChargesFixesForm {...commonProps} onSubmit={(data) => handleSubmit('Charges fixes', data)} />
      case 'Fournisseurs':
        return <FournisseursForm {...commonProps} onSubmit={(data) => handleSubmit('Fournisseurs', data)} />
      case 'Transport':
        return <SubcategoryForm {...commonProps} parentCategory="Transport" onSubmit={(data) => handleSubmit('Transport', data)} />
      case 'Packaging':
        return <SubcategoryForm {...commonProps} parentCategory="Packaging" onSubmit={(data) => handleSubmit('Packaging', data)} />
      case 'Subscriptions':
        return <SubscriptionsForm {...commonProps} onSubmit={(data) => handleSubmit('Subscriptions', data)} />
      case 'Prêts':
        return <PretsForm {...commonProps} onSubmit={(data) => handleSubmit('Prêts', data)} />
      case 'Sponsoring':
        return <SimpleForm {...commonProps} descriptionRequired descriptionPlaceholder="Ex: Facebook Ads 15 Mars" submitLabel="Enregistrer la dépense" onSubmit={(data) => handleSubmit('Sponsoring', data)} />
      case 'Divers':
        return <SimpleForm {...commonProps} descriptionRequired descriptionPlaceholder="Description de la dépense" submitLabel="Enregistrer la dépense" onSubmit={(data) => handleSubmit('Divers', data)} />
      case 'Recettes':
        return <SimpleForm {...commonProps} descriptionPlaceholder="Ex: Recette livraison 15 Mars" submitLabel="Enregistrer la recette" onSubmit={(data) => handleSubmit('Recettes', data)} />
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Ajouter une transaction</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Sélectionnez une catégorie puis remplissez le formulaire
        </p>
      </div>

      <div className="mb-6 max-w-xs">
        <Label htmlFor="date">Date</Label>
        <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
      </div>

      {!selectedCategory ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {CATEGORIES.map((cat) => {
            const config = categoryConfig[cat]
            const Icon = config.icon
            return (
              <Card
                key={cat}
                className={`cursor-pointer border-2 transition-all ${config.color}`}
                onClick={() => setSelectedCategory(cat)}
              >
                <CardContent className="flex flex-col items-center justify-center py-5 gap-2">
                  <Icon className={`h-7 w-7 ${config.textColor}`} />
                  <span className={`text-xs sm:text-sm font-medium text-center ${config.textColor}`}>
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
            onClick={() => setSelectedCategory(null)}
            className="mb-4 gap-2 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux catégories
          </Button>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-6">
                {(() => {
                  const config = categoryConfig[selectedCategory]
                  const Icon = config.icon
                  return (
                    <>
                      <div className={`p-2 rounded-md ${config.color}`}>
                        <Icon className={`h-5 w-5 ${config.textColor}`} />
                      </div>
                      <h3 className="text-lg font-semibold">{config.label}</h3>
                    </>
                  )
                })()}
              </div>
              {renderForm()}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}