import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiClient } from '@/api/client'
import type { GlobalHistorySnapshotResponse } from '@/types'

// Cache TTL: 1 hour — data is daily, no need to refresh frequently
const CACHE_TTL_MS = 60 * 60 * 1000

export const useWealthHistoryStore = defineStore('wealthHistory', () => {
  const history = ref<GlobalHistorySnapshotResponse[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const _fetchedAt = ref<number | null>(null)

  const isCacheValid = computed(() => {
    if (!_fetchedAt.value || history.value.length === 0) return false
    return Date.now() - _fetchedAt.value < CACHE_TTL_MS
  })

  // Only show the chart when there's at least 7 days of history — less is not meaningful
  const hasMeaningfulHistory = computed(() => {
    if (history.value.length < 7) return false
    const first = new Date(history.value[0].snapshot_date).getTime()
    const last  = new Date(history.value[history.value.length - 1].snapshot_date).getTime()
    return last - first >= 6 * 24 * 60 * 60 * 1000 // 6 days gap = 7 distinct days
  })

  async function fetchHistory(force = false) {
    if (!force && isCacheValid.value) return

    isLoading.value = true
    error.value = null
    try {
      const data = await apiClient.get<GlobalHistorySnapshotResponse[]>('/dashboard/history')
      history.value = data
      _fetchedAt.value = Date.now()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors du chargement de l\'historique'
    } finally {
      isLoading.value = false
    }
  }

  function reset() {
    history.value = []
    _fetchedAt.value = null
    error.value = null
  }

  return {
    history,
    isLoading,
    error,
    isCacheValid,
    hasMeaningfulHistory,
    fetchHistory,
    reset,
  }
})
