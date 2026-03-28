import { formatTND } from '@/lib/format'
import type { AuditLog, LogAction, LogReferenceData } from './api'

const TABLE_LABELS: Record<string, string> = {
  transactions: 'Transactions',
  employees: 'Employes',
  fixed_charges: 'Charges fixes',
  products: 'Produits',
  subcategories: 'Sous-categories',
  subscriptions: 'Abonnements',
  loan_contacts: 'Contacts de prets',
  profiles: 'Profils',
}

const ACTION_LABELS: Record<LogAction, string> = {
  INSERT: 'Ajout',
  UPDATE: 'Modification',
  DELETE: 'Suppression',
}

const FIELD_LABELS: Record<string, string> = {
  amount: 'montant',
  name: 'nom',
  base_salary: 'salaire de base',
  role: 'role',
  date: 'date',
  category: 'categorie',
  description: 'description',
  default_amount: 'montant par defaut',
  is_active: 'actif',
  is_internal: 'interne',
  pay_day: 'jour de paie',
  employee_id: 'employe',
  fixed_charge_id: 'charge fixe',
  product_id: 'produit',
  subcategory_id: 'sous-categorie',
  subscription_id: 'abonnement',
  loan_contact_id: 'contact de pret',
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString('fr-TN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getUserDisplayName(userId: string | null, referenceData: LogReferenceData) {
  if (!userId) return 'Utilisateur inconnu'
  return referenceData.users[userId]?.display_name || referenceData.users[userId]?.email || 'Utilisateur inconnu'
}

export function getLogActorLabel(userId: string | null, referenceData: LogReferenceData) {
  return getUserDisplayName(userId, referenceData)
}

function getRecordData(log: AuditLog) {
  return log.new_data || log.old_data || {}
}

function getTransactionEntityName(
  data: Record<string, unknown>,
  referenceData: LogReferenceData
) {
  if (typeof data.employee_id === 'string') return referenceData.employees[data.employee_id]
  if (typeof data.fixed_charge_id === 'string') return referenceData.fixedCharges[data.fixed_charge_id]
  if (typeof data.product_id === 'string') return referenceData.products[data.product_id]
  if (typeof data.subcategory_id === 'string') return referenceData.subcategories[data.subcategory_id]
  if (typeof data.subscription_id === 'string') return referenceData.subscriptions[data.subscription_id]
  if (typeof data.loan_contact_id === 'string') return referenceData.loanContacts[data.loan_contact_id]
  if (typeof data.description === 'string' && data.description.trim()) return data.description
  return null
}

function getTransactionSubject(data: Record<string, unknown>, referenceData: LogReferenceData) {
  const category = typeof data.category === 'string' ? data.category : 'Transaction'
  const entityName = getTransactionEntityName(data, referenceData)
  return entityName ? `${category} - ${entityName}` : category
}

function getSubjectLabel(log: AuditLog, referenceData: LogReferenceData) {
  const data = getRecordData(log)

  switch (log.table_name) {
    case 'transactions':
      return `une transaction ${getTransactionSubject(data, referenceData)}`
    case 'employees':
      return `l'employe "${String(data.name || 'Inconnu')}"`
    case 'fixed_charges':
      return `la charge fixe "${String(data.name || 'Inconnue')}"`
    case 'products':
      return `le produit "${String(data.name || 'Inconnu')}"`
    case 'subcategories':
      return `la sous-categorie "${String(data.name || 'Inconnue')}"`
    case 'subscriptions':
      return `l'abonnement "${String(data.name || 'Inconnu')}"`
    case 'loan_contacts':
      return `le contact de pret "${String(data.name || 'Inconnu')}"`
    case 'profiles':
      return `le profil de ${getUserDisplayName(log.record_id, referenceData)}`
    default:
      return `un enregistrement ${log.table_name}`
  }
}

function formatFieldValue(
  field: string,
  value: unknown,
  referenceData: LogReferenceData
): string {
  if (value === null || value === undefined || value === '') return 'vide'
  if (field === 'amount' || field === 'base_salary' || field === 'default_amount') {
    return formatTND(Number(value))
  }
  if (field === 'is_active' || field === 'is_internal') {
    return value ? 'Oui' : 'Non'
  }
  if (field === 'employee_id' && typeof value === 'string') {
    return referenceData.employees[value] || value
  }
  if (field === 'fixed_charge_id' && typeof value === 'string') {
    return referenceData.fixedCharges[value] || value
  }
  if (field === 'product_id' && typeof value === 'string') {
    return referenceData.products[value] || value
  }
  if (field === 'subcategory_id' && typeof value === 'string') {
    return referenceData.subcategories[value] || value
  }
  if (field === 'subscription_id' && typeof value === 'string') {
    return referenceData.subscriptions[value] || value
  }
  if (field === 'loan_contact_id' && typeof value === 'string') {
    return referenceData.loanContacts[value] || value
  }
  if (field === 'date' && typeof value === 'string') {
    return value
  }
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

function getChangedFields(log: AuditLog) {
  const oldData = log.old_data || {}
  const newData = log.new_data || {}
  const keys = new Set([...Object.keys(oldData), ...Object.keys(newData)])

  return Array.from(keys).filter((key) => {
    if (key === 'id' || key === 'created_at') return false
    return JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])
  })
}

function formatUpdateDiff(log: AuditLog, referenceData: LogReferenceData) {
  const changedFields = getChangedFields(log)
  if (changedFields.length === 0) return 'mise a jour sans changement visible'

  return changedFields
    .map((field) => {
      const label = FIELD_LABELS[field] || field
      const oldValue = formatFieldValue(field, log.old_data?.[field], referenceData)
      const newValue = formatFieldValue(field, log.new_data?.[field], referenceData)
      return `${label} ${oldValue} -> ${newValue}`
    })
    .join(', ')
}

export function getActionLabel(action: LogAction) {
  return ACTION_LABELS[action]
}

export function getTableLabel(tableName: string) {
  return TABLE_LABELS[tableName] || tableName
}

export function getActionBadgeClass(action: LogAction) {
  if (action === 'INSERT') return 'bg-green-100 text-green-700 hover:bg-green-100'
  if (action === 'UPDATE') return 'bg-orange-100 text-orange-700 hover:bg-orange-100'
  return 'bg-red-100 text-red-700 hover:bg-red-100'
}

export function formatLogTimestamp(value: string) {
  return formatTimestamp(value)
}

export function formatLogDescription(log: AuditLog, referenceData: LogReferenceData) {
  const actor = getUserDisplayName(log.user_id, referenceData)
  const subject = getSubjectLabel(log, referenceData)
  const data = getRecordData(log)

  if (log.action === 'INSERT') {
    if (log.table_name === 'transactions') {
      return `${actor} a ajoute ${subject} de ${formatTND(Number(data.amount || 0))}`
    }
    return `${actor} a ajoute ${subject}`
  }

  if (log.action === 'DELETE') {
    if (log.table_name === 'transactions') {
      return `${actor} a supprime ${subject} de ${formatTND(Number(data.amount || 0))}`
    }
    return `${actor} a supprime ${subject}`
  }

  return `${actor} a modifie ${subject} : ${formatUpdateDiff(log, referenceData)}`
}
