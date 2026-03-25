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
  StockAccountBasicResponse,
  StockAccountCreate,
  StockAccountUpdate,
  StockTransactionCreate,
  StockTransactionUpdate,
  StockTransactionBasicResponse,
  StockBulkImportRequest,
  StockBulkImportResponse,
  AccountSummaryResponse,
  TransactionResponse,
  AssetSearchResult,
  AssetInfoResponse,
  EurDepositCreate,
  AccountHistorySnapshotResponse,
} from '@/types'

// Cache TTL: 1 hour — stock history chart data does not require real-time refresh.
const CACHE_TTL_MS = 60 * 60 * 1000

export const useStocksStore = defineStore('stocks', () => {
  const accounts = ref<StockAccountBasicResponse[]>([])
  const currentAccount = ref<AccountSummaryResponse | null>(null)
  const transactions = ref<TransactionResponse[]>([])
  const history = ref<AccountHistorySnapshotResponse[]>([])
  const accountHistoryById = ref<Record<string, AccountHistorySnapshotResponse[]>>({})
  const isLoading = ref(false)
  const historyLoading = ref(false)
  const error = ref<string | null>(null)
  const _liveFetchSeq = ref(0)
  const historyCacheKey = 'stocks:history:global'

  const isHistoryCacheValid = computed(() => {
    if (history.value.length === 0) return false
    return isCacheEntryValid(historyCacheKey)
  })

  function isAccountHistoryCacheValid(accountId: string): boolean {
    const cached = accountHistoryById.value[accountId]
    if (!cached || cached.length === 0) return false
    return isCacheEntryValid(`stocks:history:account:${accountId}`)
  }


  async function searchAssets(query: string): Promise<AssetSearchResult[]> {
    if (!query) return []
    try {
      return await apiClient.get<AssetSearchResult[]>(`/stocks/market/search?q=${encodeURIComponent(query)}`)
    } catch (e) {
      console.error('Search error:', e)
      return []
    }
  }

  async function getAssetsInfo(symbols: string[]): Promise<AssetInfoResponse[]> {
    if (!symbols.length) return []
    try {
      return await apiClient.post<AssetInfoResponse[]>('/stocks/market/info', symbols)
    } catch (e) {
      console.error('Assets Info error:', e)
      return []
    }
  }


  async function fetchAccounts(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      accounts.value = await apiClient.get<StockAccountBasicResponse[]>('/stocks/accounts')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors du chargement des comptes'
    } finally {
      isLoading.value = false
    }
  }

  async function fetchAccount(id: string, dbOnly: boolean = false): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const params = dbOnly ? '?db_only=true' : ''
      currentAccount.value = await apiClient.get<AccountSummaryResponse>(`/stocks/accounts/${id}${params}`)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors du chargement du compte'
    } finally {
      isLoading.value = false
    }
  }

  async function refreshAccount(id: string): Promise<void> {
    const seq = ++_liveFetchSeq.value
    try {
      const data = await apiClient.get<AccountSummaryResponse>(`/stocks/accounts/${id}`)
      if (seq === _liveFetchSeq.value) currentAccount.value = data
    } catch {
      // keep cached data on error
    }
  }

  async function createAccount(data: StockAccountCreate): Promise<StockAccountBasicResponse | null> {
    isLoading.value = true
    error.value = null
    try {
      const account = await apiClient.post<StockAccountBasicResponse>('/stocks/accounts', data)
      await fetchAccounts()
      return account
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de la création'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function updateAccount(id: string, data: StockAccountUpdate): Promise<StockAccountBasicResponse | null> {
    isLoading.value = true
    error.value = null
    try {
      const account = await apiClient.put<StockAccountBasicResponse>(`/stocks/accounts/${id}`, data)
      await fetchAccounts()
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
      await apiClient.delete(`/stocks/accounts/${id}`)
      await fetchAccounts()
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de la suppression'
      return false
    } finally {
      isLoading.value = false
    }
  }


  async function fetchTransactions(): Promise<void> {
    try {
      transactions.value = await apiClient.get<TransactionResponse[]>('/stocks/transactions')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors du chargement des transactions'
    }
  }

  async function fetchAccountTransactions(accountId: string): Promise<TransactionResponse[]> {
    try {
      return await apiClient.get<TransactionResponse[]>(`/stocks/transactions/account/${accountId}`)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors du chargement des transactions'
      return []
    }
  }

  async function fetchHistory(force = false): Promise<void> {
    historyLoading.value = true
    error.value = null
    try {
      const data = await getOrFetchCached<AccountHistorySnapshotResponse[]>(
        historyCacheKey,
        () => apiClient.get<AccountHistorySnapshotResponse[]>('/stocks/history'),
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
        `stocks:history:account:${accountId}`,
        () => apiClient.get<AccountHistorySnapshotResponse[]>(`/stocks/accounts/${accountId}/history`),
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
    invalidateCachePrefix('stocks:history:account:')
  }

  async function createTransaction(data: StockTransactionCreate): Promise<StockTransactionBasicResponse | null> {
    isLoading.value = true
    error.value = null
    try {
      const tx = await apiClient.post<StockTransactionBasicResponse>('/stocks/transactions', data)
      return tx
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de la création de la transaction'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function updateTransaction(id: string, data: StockTransactionUpdate): Promise<StockTransactionBasicResponse | null> {
    isLoading.value = true
    error.value = null
    try {
      const tx = await apiClient.put<StockTransactionBasicResponse>(`/stocks/transactions/${id}`, data)
      return tx
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de la mise à jour de la transaction'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function deleteTransaction(id: string): Promise<boolean> {
    isLoading.value = true
    error.value = null
    try {
      await apiClient.delete(`/stocks/transactions/${id}`)
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de la suppression'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function bulkImportTransactions(accountId: string, transactions: StockBulkImportRequest['transactions']): Promise<StockBulkImportResponse | null> {
    isLoading.value = true
    error.value = null
    try {
      const data: StockBulkImportRequest = {
        account_id: accountId,
        transactions,
      }
      const result = await apiClient.post<StockBulkImportResponse>('/stocks/transactions/bulk', data)
      return result
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de l\'import'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function depositEur(accountId: string, data: EurDepositCreate): Promise<TransactionResponse | null> {
    isLoading.value = true
    error.value = null
    try {
      return await apiClient.post<TransactionResponse>(`/stocks/accounts/${accountId}/deposit`, data)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors du d\u00e9p\u00f4t'
      return null
    } finally {
      isLoading.value = false
    }
  }

  function reset(): void {
    accounts.value = []
    currentAccount.value = null
    transactions.value = []
    history.value = []
    accountHistoryById.value = {}
    invalidateHistoryCache()
    error.value = null
  }

  return {
    accounts,
    currentAccount,
    transactions,
    history,
    accountHistoryById,
    isLoading,
    historyLoading,
    error,
    isHistoryCacheValid,
    fetchAccounts,
    fetchAccount,
    refreshAccount,
    createAccount,
    updateAccount,
    deleteAccount,
    fetchTransactions,
    fetchAccountTransactions,
    fetchHistory,
    fetchHistoryForAccount,
    invalidateHistoryCache,
    isAccountHistoryCacheValid,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    bulkImportTransactions,
    depositEur,
    searchAssets,
    getAssetsInfo,
    reset,
  }
})
