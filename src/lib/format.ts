const wholeDinarFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
})

export function formatWholeDinars(amount: number): string {
  return wholeDinarFormatter.format(Math.round(amount))
}

/**
 * Format a number as Tunisian Dinar (TND) in whole dinars
 */
export function formatTND(amount: number): string {
  return `${formatWholeDinars(amount)} TND`
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
