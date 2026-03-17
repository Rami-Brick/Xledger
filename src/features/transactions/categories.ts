import {
  Users,
  Building2,
  Truck,
  Package,
  Megaphone,
  ShoppingCart,
  HelpCircle,
  TrendingUp,
  CreditCard,
  Handshake,
  type LucideIcon,
} from 'lucide-react'
import type { Category } from './api'

interface CategoryConfig {
  label: string
  icon: LucideIcon
  color: string
  textColor: string
  type: 'expense' | 'revenue'
}

export const categoryConfig: Record<Category, CategoryConfig> = {
  Salaires: {
    label: 'Salaires',
    icon: Users,
    color: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    textColor: 'text-blue-700',
    type: 'expense',
  },
  'Charges fixes': {
    label: 'Charges fixes',
    icon: Building2,
    color: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    textColor: 'text-purple-700',
    type: 'expense',
  },
  Fournisseurs: {
    label: 'Fournisseurs',
    icon: ShoppingCart,
    color: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
    textColor: 'text-orange-700',
    type: 'expense',
  },
  Transport: {
    label: 'Transport',
    icon: Truck,
    color: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200',
    textColor: 'text-yellow-700',
    type: 'expense',
  },
  Packaging: {
    label: 'Packaging',
    icon: Package,
    color: 'bg-teal-50 hover:bg-teal-100 border-teal-200',
    textColor: 'text-teal-700',
    type: 'expense',
  },
  Sponsoring: {
    label: 'Sponsoring',
    icon: Megaphone,
    color: 'bg-pink-50 hover:bg-pink-100 border-pink-200',
    textColor: 'text-pink-700',
    type: 'expense',
  },
  Subscriptions: {
    label: 'Subscriptions',
    icon: CreditCard,
    color: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200',
    textColor: 'text-indigo-700',
    type: 'expense',
  },
  'Prêts': {
    label: 'Prêts',
    icon: Handshake,
    color: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
    textColor: 'text-amber-700',
    type: 'expense', // default — the form will handle the loan/repayment toggle
  },
  Divers: {
    label: 'Divers',
    icon: HelpCircle,
    color: 'bg-gray-50 hover:bg-gray-100 border-gray-200',
    textColor: 'text-gray-700',
    type: 'expense',
  },
  Recettes: {
    label: 'Recettes',
    icon: TrendingUp,
    color: 'bg-green-50 hover:bg-green-100 border-green-200',
    textColor: 'text-green-700',
    type: 'revenue',
  },
}