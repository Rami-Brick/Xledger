import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
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
import { CircularIconButton } from '@/components/system-ui/primitives'
import { formatTND } from '@/lib/format'
import { cn } from '@/lib/utils'

function getTodayDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Distinct hex per category so none repeat. Mix of the kit's identity palette
// plus a few complementary hues. Each pairs with a text color for contrast.
const CATEGORY_COLOR: Record<Category, { bg: string; fg: string }> = {
  Salaires:       { bg: '#2D7CF6', fg: '#FFFFFF' }, // blue
  'Charges fixes':{ bg: '#D94BF4', fg: '#FFFFFF' }, // magenta
  Fournisseurs:   { bg: '#FF9A18', fg: '#0A0B0A' }, // orange
  Transport:      { bg: '#FFC933', fg: '#0A0B0A' }, // amber
  Packaging:      { bg: '#38D3D3', fg: '#0A0B0A' }, // cyan
  Sponsoring:     { bg: '#FF5DA2', fg: '#FFFFFF' }, // pink
  Subscriptions:  { bg: '#8B5CF6', fg: '#FFFFFF' }, // violet
  'Prêts':        { bg: '#F97316', fg: '#0A0B0A' }, // deep orange
  Divers:         { bg: '#D7D9DF', fg: '#0A0B0A' }, // silver
  Recettes:       { bg: '#B8EB3C', fg: '#0A0B0A' }, // lime-green (revenue cue)
}

export default function AddTransactionPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { canCreateTransactions } = useRole()

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(() => {
    const category = searchParams.get('category')
    if (category && CATEGORIES.includes(category as Category)) return category as Category
    return null
  })
  const [date, setDate] = useState(getTodayDate)

  if (!canCreateTransactions) {
    return <Navigate to="/" replace />
  }

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
        description: `${category} - ${formatTND(Math.abs(data.amount))}`,
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
    <div className="relative w-full min-w-0">
      {/* Ambient atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none fixed -top-40 -left-40 h-[480px] w-[480px] rounded-full blur-3xl"
        style={{ background: 'rgba(92,214,180,0.10)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -bottom-40 -right-40 h-[520px] w-[520px] rounded-full blur-3xl"
        style={{ background: 'rgba(154,255,90,0.10)' }}
      />

      <div className="relative z-10 space-y-4">
        {!selectedCategory && (
          <div className="flex items-center gap-3">
            <CircularIconButton
              variant="glass"
              size="sm"
              icon={<ArrowLeft />}
              aria-label="Retour au tableau de bord"
              onClick={() => navigate('/dashboard')}
            />
            <span className="text-xs text-white/60">Retour au tableau de bord</span>
          </div>
        )}

        {!selectedCategory ? (
          <>
            {/* <p className="text-sm text-white/60">
              Selectionnez une categorie pour commencer.
            </p> */}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {CATEGORIES.map((category) => {
                const config = categoryConfig[category]
                const Icon = config.icon
                const color = CATEGORY_COLOR[category]
                const tintR = parseInt(color.bg.slice(1, 3), 16)
                const tintG = parseInt(color.bg.slice(3, 5), 16)
                const tintB = parseInt(color.bg.slice(5, 7), 16)
                const tintBase = `rgba(${tintR}, ${tintG}, ${tintB}, 0.14)`
                const tintHover = `rgba(${tintR}, ${tintG}, ${tintB}, 0.22)`
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => handleCategorySelect(category)}
                    style={{ ['--tile-tint' as string]: tintBase, ['--tile-tint-hover' as string]: tintHover }}
                    className={cn(
                      'group relative flex h-28 w-full flex-col items-start justify-between overflow-hidden rounded-[28px]',
                      'bg-[var(--tile-tint)] p-4 text-left backdrop-blur-2xl',
                      'transition-[background-color,transform] duration-200',
                      'hover:bg-[var(--tile-tint-hover)] active:scale-[0.98]',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
                      'focus-visible:ring-offset-2 focus-visible:ring-offset-black',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="inline-flex size-12 shrink-0 items-center justify-center rounded-full shadow-lg [&>svg]:size-5"
                      style={{ backgroundColor: color.bg, color: color.fg }}
                    >
                      <Icon />
                    </span>
                    <span className="w-full truncate text-left text-sm font-semibold tracking-tight text-white">
                      {config.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <div className="mx-auto w-full max-w-xl">
            <div className="mb-4 flex items-center gap-3">
              <CircularIconButton
                variant="glass"
                size="sm"
                icon={<ArrowLeft />}
                aria-label="Retour aux categories"
                onClick={handleBackToCategories}
              />
              <span className="text-xs text-white/60">Retour aux categories</span>
            </div>

            {(() => {
              const config = categoryConfig[selectedCategory]
              const Icon = config.icon
              const isRevenue = config.type === 'revenue'
              const color = CATEGORY_COLOR[selectedCategory]
              return (
                <div className="relative overflow-hidden rounded-3xl bg-white/[0.03] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-2xl md:p-6">
                  {/* Category color glow (top-left + bottom-right) */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -top-20 -left-20 h-64 w-64 rounded-full blur-3xl"
                    style={{ background: `${color.bg}33` }}
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full blur-3xl"
                    style={{ background: `${color.bg}22` }}
                  />

                  <div className="relative z-10 flex flex-col gap-5">
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden
                        className="inline-flex size-14 shrink-0 items-center justify-center rounded-full shadow-lg [&>svg]:size-6"
                        style={{ backgroundColor: color.bg, color: color.fg }}
                      >
                        <Icon />
                      </span>
                      <div className="flex min-w-0 flex-col">
                        <h2 className="text-lg font-semibold leading-none text-white">
                          {config.label}
                        </h2>
                        <span
                          className={cn(
                            'mt-1 text-[11px] uppercase tracking-wide',
                            isRevenue ? 'text-[#B8EB3C]' : 'text-white/46',
                          )}
                        >
                          {isRevenue ? 'Recette' : 'Dépense'}
                        </span>
                      </div>
                    </div>

                    <FloatingField label="Date">
                      <input
                        id="date"
                        type="date"
                        value={date}
                        onChange={(event) => setDate(event.target.value)}
                        className="w-full border-0 bg-transparent text-sm text-white outline-none [color-scheme:dark]"
                      />
                    </FloatingField>

                    {/* Per-category form — shared shadcn inputs render against dark tokens */}
                    {renderForm()}
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}

function FloatingField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1 rounded-2xl bg-white/[0.04] px-4 pt-2.5 pb-3 backdrop-blur-sm transition-colors focus-within:bg-white/[0.06] focus-within:ring-1 focus-within:ring-white/20">
      <span className="text-[11px] font-medium leading-none text-white/46">{label}</span>
      {children}
    </label>
  )
}
