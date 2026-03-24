import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { apiClient } from '@/api/client'
import {
  getOrFetchCached,
  invalidateCacheKey,
  invalidateCachePrefix,
  isCacheEntryValid,
} from '@/services/cache'
import type {
  BankAccountResponse,
  BankSummaryResponse,
  BankAccountCreate,
  BankAccountUpdate,
  AccountHistorySnapshotResponse,
} from '@/types'

// Cache TTL: 1 hour — bank history updates are not real-time for most users.
const CACHE_TTL_MS = 60 * 60 * 1000

export const useBankStore = defineStore('bank', () => {
  const summary = ref<BankSummaryResponse | null>(null)
  const currentAccount = ref<BankAccountResponse | null>(null)
  const history = ref<AccountHistorySnapshotResponse[]>([])
  const accountHistoryById = ref<Record<string, AccountHistorySnapshotResponse[]>>({})
  const isLoading = ref(false)
  const historyLoading = ref(false)
  const error = ref<string | null>(null)
  const historyCacheKey = 'bank:history:global'

  const isHistoryCacheValid = computed(() => {
    if (history.value.length === 0) return false
    return isCacheEntryValid(historyCacheKey)
  })

  function isAccountHistoryCacheValid(accountId: string): boolean {
    const cached = accountHistoryById.value[accountId]
    if (!cached || cached.length === 0) return false
    return isCacheEntryValid(`bank:history:account:${accountId}`)
  }

  async function fetchAccounts(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      summary.value = await apiClient.get<BankSummaryResponse>('/bank/accounts')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors du chargement des comptes'
    } finally {
      isLoading.value = false
    }
  }

  async function fetchAccount(id: string): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      currentAccount.value = await apiClient.get<BankAccountResponse>(`/bank/accounts/${id}`)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors du chargement du compte'
    } finally {
      isLoading.value = false
    }
  }

  async function createAccount(data: BankAccountCreate): Promise<BankAccountResponse | null> {
    isLoading.value = true
    error.value = null
    try {
      const account = await apiClient.post<BankAccountResponse>('/bank/accounts', data)
      await fetchAccounts()
      invalidateHistoryCache()
      return account
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de la création du compte'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function updateAccount(id: string, data: BankAccountUpdate): Promise<BankAccountResponse | null> {
    isLoading.value = true
    error.value = null
    try {
      const account = await apiClient.put<BankAccountResponse>(`/bank/accounts/${id}`, data)
      await fetchAccounts()
      invalidateHistoryCache()
      return account
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de la mise à jour'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function deleteAccount(id: string): Promise<boolean> {
    isLoading.value = true
    error.value = null
    try {
      await apiClient.delete(`/bank/accounts/${id}`)
      await fetchAccounts()
      invalidateHistoryCache()
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de la suppression'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function importHistory(
    accountId: string,
    entries: { snapshot_date: string; value: number }[],
    overwrite = false,
  ): Promise<boolean> {
    isLoading.value = true
    error.value = null
    try {
      await apiClient.post(`/bank/accounts/${accountId}/history/import`, { entries, overwrite })
      await fetchAccounts()
      invalidateHistoryCache()
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Erreur lors de l'import"
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function fetchHistory(force = false): Promise<void> {
    historyLoading.value = true
    error.value = null
    try {
      const data = await getOrFetchCached<AccountHistorySnapshotResponse[]>(
        historyCacheKey,
        () => apiClient.get<AccountHistorySnapshotResponse[]>('/bank/history'),
        CACHE_TTL_MS,
        force,
      )
      history.value = [...data].sort((a, b) =>
        new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime(),
      )
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors du chargement de l\'historique'
    } finally {
      historyLoading.value = false
    }
  }

  async function fetchHistoryForAccount(accountId: string, force = false): Promise<void> {
    historyLoading.value = true
    error.value = null
    try {
      const data = await getOrFetchCached<AccountHistorySnapshotResponse[]>(
        `bank:history:account:${accountId}`,
        () => apiClient.get<AccountHistorySnapshotResponse[]>(`/bank/accounts/${accountId}/history`),
        CACHE_TTL_MS,
        force,
      )
      accountHistoryById.value[accountId] = [...data].sort((a, b) =>
        new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime(),
      )
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors du chargement de l\'historique'
    } finally {
      historyLoading.value = false
    }
  }

  function invalidateHistoryCache(): void {
    invalidateCacheKey(historyCacheKey)
    invalidateCachePrefix('bank:history:account:')
  }

  function reset(): void {
    summary.value = null
    currentAccount.value = null
    history.value = []
    accountHistoryById.value = {}
    invalidateHistoryCache()
    error.value = null
  }

  return {
    summary,
    currentAccount,
    history,
    accountHistoryById,
    isLoading,
    historyLoading,
    error,
    isHistoryCacheValid,
    fetchAccounts,
    fetchAccount,
    createAccount,
    updateAccount,
    deleteAccount,
    importHistory,
    fetchHistory,
    fetchHistoryForAccount,
    invalidateHistoryCache,
    reset,
  }
})
