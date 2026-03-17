/**
 * Format a number as Tunisian Dinar (TND) with 3 decimal places
 */
export function formatTND(amount: number): string {
  return `${amount.toFixed(3)} TND`
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