export function getMonthInputFromDate(value: string) {
  return value.slice(0, 7)
}

export function normalizeSalaryMonth(value?: string | null) {
  if (!value) return null

  const monthValue = value.length >= 7 ? value.slice(0, 7) : value
  const [year, month] = monthValue.split('-')

  if (!year || !month) return null
  return `${year}-${month}-01`
}

export function getEffectiveSalaryMonth(transaction: {
  date: string
  salary_month?: string | null
}) {
  return normalizeSalaryMonth(transaction.salary_month) ?? normalizeSalaryMonth(transaction.date)
}

export function isSalaryMonthDifferentFromEntryDate(transaction: {
  date: string
  salary_month?: string | null
}) {
  const effectiveMonth = getEffectiveSalaryMonth(transaction)
  const entryMonth = normalizeSalaryMonth(transaction.date)

  return !!transaction.salary_month && effectiveMonth !== entryMonth
}

export function formatSalaryMonthLabel(value?: string | null) {
  const normalizedValue = normalizeSalaryMonth(value)
  if (!normalizedValue) return ''

  const [year, month] = normalizedValue.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  const label = date.toLocaleDateString('fr-TN', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}
