/**
 * Composable for toggling crypto display currency between USD and EUR.
 *
 * Crypto data is stored/fetched in USD. This composable provides a reactive
 * toggle and a conversion helper so the UI can optionally display values in EUR.
 */

import { ref, computed } from 'vue'
import { apiClient } from '@/api/client'
import { useFormatters } from '@/composables/useFormatters'

export type DisplayCurrency = 'USD' | 'EUR'

/** Fallback rate – mirrored from backend services/exchange_rate.py _FALLBACK_USD_EUR */
const DEFAULT_USD_EUR_RATE = 0.92

// Singleton state shared across all component instances
const displayCurrency = ref<DisplayCurrency>('USD')
const usdToEurRate = ref<number>(DEFAULT_USD_EUR_RATE)
const rateLoading = ref(false)

// TTL guard: avoid redundant fetches during SPA navigation
const RATE_TTL_MS = 60 * 60 * 1000 // 1 hour
let lastFetchedAt = 0

/**
 * Fetch the live USD→EUR rate from the backend (single source of truth).
 * Respects a TTL to avoid redundant calls during SPA navigation.
 */
async function fetchRate(): Promise<void> {
  const now = Date.now()
  if (now - lastFetchedAt < RATE_TTL_MS) return

  rateLoading.value = true
  try {
    const data = await apiClient.get<{ from: string; to: string; rate: number }>(
      '/dashboard/exchange-rate?from_currency=USD&to_currency=EUR',
    )
    if (data?.rate && data.rate > 0) {
      usdToEurRate.value = data.rate
      lastFetchedAt = now
    }
  } catch {
    // Keep the default/previous rate
  } finally {
    rateLoading.value = false
  }
}

type NumericValue = number | string | null | undefined

export function useCurrencyToggle() {
  const { formatCurrency } = useFormatters()

  /** Convert a USD value to the currently selected display currency. */
  function convertFromUsd(value: NumericValue): number | null {
    if (value === null || value === undefined) return null
    const n = typeof value === 'string' ? Number(value) : value
    if (isNaN(n)) return null

    if (displayCurrency.value === 'EUR') {
      return n * usdToEurRate.value
    }
    return n
  }

  /** Format a USD-denominated value in the currently selected display currency. */
  function formatUsdValue(value: NumericValue): string {
    return formatCurrency(convertFromUsd(value), activeCurrency.value)
  }

  /** The currency code to pass to formatCurrency(). */
  const activeCurrency = computed(() => displayCurrency.value)

  function toggleCurrency(): void {
    displayCurrency.value = displayCurrency.value === 'USD' ? 'EUR' : 'USD'
  }

  function setCurrency(c: DisplayCurrency): void {
    displayCurrency.value = c
  }

  return {
    displayCurrency,
    activeCurrency,
    usdToEurRate,
    rateLoading,
    fetchRate,
    convertFromUsd,
    formatUsdValue,
    toggleCurrency,
    setCurrency,
  }
}
