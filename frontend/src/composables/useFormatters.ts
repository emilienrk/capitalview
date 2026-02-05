/**
 * Composable providing formatting utilities for currency, percentages, and dates.
 */
export function useFormatters() {
  function formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined || typeof value !== 'number') return '—'
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  function formatPercent(value: number | null | undefined): string {
    if (value === null || value === undefined || typeof value !== 'number') return '—'
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(2)} %`
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

  function formatNumber(value: number | null | undefined, decimals = 2): string {
    if (value === null || value === undefined || typeof value !== 'number') return '—'
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value)
  }

  /** Returns 'text-success' or 'text-danger' based on sign */
  function profitLossClass(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'text-text-muted dark:text-text-dark-muted'
    return value >= 0 ? 'text-success' : 'text-danger'
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
