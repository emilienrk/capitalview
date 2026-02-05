/**
 * Composable providing formatting utilities for currency, percentages, and dates.
 *
 * Note: The backend uses Python Decimal fields which Pydantic v2 serializes
 * as JSON strings (e.g. "175.2500"). All numeric formatters accept both
 * string and number values and coerce strings to numbers transparently.
 */

type NumericValue = number | string | null | undefined

/** Safely coerce a value (number or Decimal-string from API) to a number. */
function toNumber(value: NumericValue): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return isNaN(value) ? null : value
  if (typeof value === 'string') {
    const n = Number(value)
    return isNaN(n) ? null : n
  }
  return null
}

export function useFormatters() {
  function formatCurrency(value: NumericValue): string {
    const n = toNumber(value)
    if (n === null) return '—'
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n)
  }

  function formatPercent(value: NumericValue): string {
    const n = toNumber(value)
    if (n === null) return '—'
    const sign = n >= 0 ? '+' : ''
    return `${sign}${n.toFixed(2)} %`
  }

  function formatDate(value: string | null | undefined): string {
    if (!value) return '—'
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(value))
  }

  function formatDateTime(value: string | null | undefined): string {
    if (!value) return '—'
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  }

  function formatNumber(value: NumericValue, decimals = 2): string {
    const n = toNumber(value)
    if (n === null) return '—'
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n)
  }

  /** Returns 'text-success' or 'text-danger' based on sign */
  function profitLossClass(value: NumericValue): string {
    const n = toNumber(value)
    if (n === null) return 'text-text-muted dark:text-text-dark-muted'
    return n >= 0 ? 'text-success' : 'text-danger'
  }

  return {
    formatCurrency,
    formatPercent,
    formatDate,
    formatDateTime,
    formatNumber,
    profitLossClass,
  }
}
