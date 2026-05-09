const wholeDinarFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
})

export function formatWholeDinars(amount: number): string {
  return wholeDinarFormatter.format(Math.round(amount))
}

/**
 * Format a number as a whole-unit amount with a currency code suffix,
 * e.g. `1500 TND` or `200 LYD`.
 */
export function formatCurrency(amount: number, currencyCode: string): string {
  return `${formatWholeDinars(amount)} ${currencyCode}`
}

/**
 * Format a date string to French locale display
 */
export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('fr-TN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
