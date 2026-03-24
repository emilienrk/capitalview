import { defineStore } from 'pinia'
import { computed } from 'vue'
import { apiClient } from '@/api/client'
import { useChartCache } from '@/composables/useChartCache'
import type { GlobalHistorySnapshotResponse } from '@/types'

// Cache TTL: 1 hour — data is daily, no need to refresh frequently
const CACHE_TTL_MS = 60 * 60 * 1000

export const useWealthHistoryStore = defineStore('wealthHistory', () => {
  // Use generic chart cache composable for data fetching + caching logic
  const {
    data: history,
    isLoading,
    error,
    isCacheValid,
    fetch,
    reset,
  } = useChartCache<GlobalHistorySnapshotResponse[]>(
    async () => {
      const data = await apiClient.get<GlobalHistorySnapshotResponse[]>('/dashboard/history')
      // Normalize to chronological order for charts and date-span checks.
      return [...data].sort((a, b) =>
        new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime()
      )
    },
    { ttlMs: CACHE_TTL_MS, cacheKey: 'dashboard:wealth-history' },
  )

  // Only show the chart when there's at least 7 days of history — less is not meaningful
  const hasMeaningfulHistory = computed(() => {
    const historyArray = history.value
    if (!historyArray || historyArray.length < 7) return false
    const timestamps = historyArray
      .map((snapshot: GlobalHistorySnapshotResponse) => new Date(snapshot.snapshot_date).getTime())
      .filter((timestamp: number) => Number.isFinite(timestamp))

    if (timestamps.length < 7) return false

    const first = Math.min(...timestamps)
    const last = Math.max(...timestamps)
    return last - first >= 6  * 24 * 60 * 60 * 1000 // 6 days gap = 7 distinct days
  })

  return {
    // Pinia will auto-unwrap these Refs, so they become reactive properties
    history,
    isLoading,
    error,
    isCacheValid,
    hasMeaningfulHistory,
    fetchHistory: fetch,
    reset,
  }
})

