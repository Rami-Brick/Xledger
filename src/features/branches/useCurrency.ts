import { useBranch } from './BranchProvider'
import { formatCurrency } from '@/lib/format'

/**
 * Branch-aware currency formatting helper.
 *
 * Returns the active branch's ISO currency code and a `format(amount)`
 * function that suffixes the amount with that code. Falls back to 'TND'
 * when no branch is loaded yet (e.g. initial render before BranchProvider
 * resolves).
 */
export function useCurrency() {
  const { activeBranch } = useBranch()
  const currencyCode = activeBranch?.currency_code ?? 'TND'
  return {
    currencyCode,
    format: (amount: number) => formatCurrency(amount, currencyCode),
  }
}
