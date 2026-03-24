import { computed, ref, shallowRef, type Ref, type ComputedRef } from 'vue'
import { getOrFetchCached, invalidateCacheKey, isCacheEntryValid } from '@/services/cache'

export interface ChartCacheOptions {
  ttlMs?: number
  cacheKey?: string
}

export interface UseChartCacheReturn<T> {
  data: Ref<T | null>
  isLoading: Ref<boolean>
  error: Ref<string | null>
  isCacheValid: ComputedRef<boolean>
  fetch: (force?: boolean) => Promise<void>
  reset: () => void
}

/**
 * Generic composable for managing chart data with automatic caching.
 * Centralizes cache validation, stale detection, and error handling.
 *
 * @param fetcher - async function to fetch data from API
 * @param options - cache TTL in milliseconds (default: 1 hour)
 * @returns reactive state and control functions
 *
 * @example
 * const { data, isCacheValid, fetch } = useChartCache(
 *   () => apiClient.get('/dashboard/history'),
 *   { ttlMs: 60 * 60 * 1000 }
 * )
 * onMounted(() => fetch())
 */
export function useChartCache<T>(
  fetcher: () => Promise<T>,
  options: ChartCacheOptions = {},
): UseChartCacheReturn<T> {
  const { ttlMs = 60 * 60 * 1000, cacheKey = 'chart:default' } = options // Default: 1 hour

  const data = shallowRef<T | null>(null)
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)
  const _fetchedAt = ref<number | null>(null)

  const isCacheValid = computed(() => {
    if (!_fetchedAt.value || data.value === null) return false
    return isCacheEntryValid(cacheKey)
  })

  async function fetch(force = false) {
    isLoading.value = true
    error.value = null

    try {
      data.value = await getOrFetchCached<T>(cacheKey, fetcher, ttlMs, force)
      _fetchedAt.value = Date.now()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors du chargement'
    } finally {
      isLoading.value = false
    }
  }

  function reset() {
    invalidateCacheKey(cacheKey)
    data.value = null
    _fetchedAt.value = null
    error.value = null
  }

  return {
    data,
    isLoading,
    error,
    isCacheValid,
    fetch,
    reset,
  }
}
