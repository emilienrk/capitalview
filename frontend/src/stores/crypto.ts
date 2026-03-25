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
  CryptoAccountBasicResponse,
  CryptoAccountCreate,
  CryptoAccountUpdate,
  CryptoCompositeTransactionCreate,
  CryptoTransactionCreate,
  CryptoTransactionUpdate,
  CryptoTransactionBasicResponse,
  CryptoCompositeTransactionResponse,
  CryptoBulkImportRequest,
  CryptoBulkImportResponse,
  CryptoBulkCompositeImportRequest,
  CryptoBulkCompositeImportResponse,
  CryptoCompositeBulkItem,
  AccountSummaryResponse,
  TransactionResponse,
  AssetSearchResult,
  AssetInfoResponse,
  CrossAccountTransferCreate,
  BinanceImportPreviewResponse,
  BinanceImportConfirmRequest,
  BinanceImportConfirmResponse,
  BinanceImportGroupPreview,
  AccountHistorySnapshotResponse,
} from '@/types'

// Cache TTL: 1 hour — crypto history snapshots are not real-time chart data.
const CACHE_TTL_MS = 60 * 60 * 1000

export const useCryptoStore = defineStore('crypto', () => {
  const accounts = ref<CryptoAccountBasicResponse[]>([])
  const currentAccount = ref<AccountSummaryResponse | null>(null)
  const transactions = ref<TransactionResponse[]>([])
  const history = ref<AccountHistorySnapshotResponse[]>([])
  const accountHistoryById = ref<Record<string, AccountHistorySnapshotResponse[]>>({})
  const isLoading = ref(false)
  const historyLoading = ref(false)
  const error = ref<string | null>(null)
  const _liveFetchSeq = ref(0)
  const historyCacheKey = 'crypto:history:global'

  const isHistoryCacheValid = computed(() => {
    if (history.value.length === 0) return false
    return isCacheEntryValid(historyCacheKey)
  })

  function isAccountHistoryCacheValid(accountId: string): boolean {
    const cached = accountHistoryById.value[accountId]
    if (!cached || cached.length === 0) return false
    return isCacheEntryValid(`crypto:history:account:${accountId}`)
  }


  async function searchAssets(query: string): Promise<AssetSearchResult[]> {
    if (!query) return []
    try {
      return await apiClient.get<AssetSearchResult[]>(`/crypto/market/search?q=${encodeURIComponent(query)}`)
    } catch (e) {
      console.error('Search error:', e)
      return []
    }
  }

  async function getAssetsInfo(symbols: string[]): Promise<AssetInfoResponse[]> {
    if (!symbols.length) return []
    try {
      return await apiClient.post<AssetInfoResponse[]>('/crypto/market/info', symbols)
    } catch (e) {
      console.error('Assets Info error:', e)
      return []
    }
  }


  async function fetchAccounts(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      accounts.value = await apiClient.get<CryptoAccountBasicResponse[]>('/crypto/accounts')
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
      currentAccount.value = await apiClient.get<AccountSummaryResponse>(`/crypto/accounts/${id}${params}`)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors du chargement du compte'
    } finally {
      isLoading.value = false
    }
  }

  async function refreshAccount(id: string): Promise<void> {
    const seq = ++_liveFetchSeq.value
    try {
      const data = await apiClient.get<AccountSummaryResponse>(`/crypto/accounts/${id}`)
      if (seq === _liveFetchSeq.value) currentAccount.value = data
    } catch {
      // keep cached data on error
    }
  }

  async function fetchDefaultAccount(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      currentAccount.value = await apiClient.get<AccountSummaryResponse>('/crypto/accounts/default')
      // Expose the account in the accounts list so other parts of the UI can reference it
      if (currentAccount.value) {
        accounts.value = [{
          id: currentAccount.value.account_id,
          name: currentAccount.value.account_name,
          platform: null,
          public_address: null,
          opened_at: null,
          created_at: '',
          updated_at: '',
        }]
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors du chargement du portefeuille'
    } finally {
      isLoading.value = false
    }
  }

  async function createAccount(data: CryptoAccountCreate): Promise<CryptoAccountBasicResponse | null> {
    isLoading.value = true
    error.value = null
    try {
      const account = await apiClient.post<CryptoAccountBasicResponse>('/crypto/accounts', data)
      await fetchAccounts()
      return account
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de la création'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function updateAccount(id: string, data: CryptoAccountUpdate): Promise<CryptoAccountBasicResponse | null> {
    isLoading.value = true
    error.value = null
    try {
      const account = await apiClient.put<CryptoAccountBasicResponse>(`/crypto/accounts/${id}`, data)
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
      await apiClient.delete(`/crypto/accounts/${id}`)
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
      transactions.value = await apiClient.get<TransactionResponse[]>('/crypto/transactions')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors du chargement des transactions'
    }
  }

  async function fetchAccountTransactions(accountId: string): Promise<TransactionResponse[]> {
    try {
      return await apiClient.get<TransactionResponse[]>(`/crypto/transactions/account/${accountId}`)
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
        () => apiClient.get<AccountHistorySnapshotResponse[]>('/crypto/history'),
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
        `crypto:history:account:${accountId}`,
        () => apiClient.get<AccountHistorySnapshotResponse[]>(`/crypto/accounts/${accountId}/history`),
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
    invalidateCachePrefix('crypto:history:account:')
  }

  async function createTransaction(data: CryptoTransactionCreate): Promise<CryptoTransactionBasicResponse | null> {
    isLoading.value = true
    error.value = null
    try {
      const tx = await apiClient.post<CryptoTransactionBasicResponse>('/crypto/transactions', data)
      return tx
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de la création de la transaction'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function createCompositeTransaction(
    data: CryptoCompositeTransactionCreate,
  ): Promise<CryptoCompositeTransactionResponse | null> {
    isLoading.value = true
    error.value = null
    try {
      return await apiClient.post<CryptoCompositeTransactionResponse>(
        '/crypto/transactions/composite',
        data,
      )
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de la création de la transaction'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function createCrossAccountTransfer(
    data: CrossAccountTransferCreate,
  ): Promise<CryptoCompositeTransactionResponse | null> {
    isLoading.value = true
    error.value = null
    try {
      return await apiClient.post<CryptoCompositeTransactionResponse>(
        '/crypto/transactions/cross-account-transfer',
        data,
      )
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors du transfert inter-comptes'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function updateTransaction(id: string, data: CryptoTransactionUpdate): Promise<CryptoTransactionBasicResponse | null> {
    isLoading.value = true
    error.value = null
    try {
      const tx = await apiClient.put<CryptoTransactionBasicResponse>(`/crypto/transactions/${id}`, data)
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
      await apiClient.delete(`/crypto/transactions/${id}`)
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de la suppression'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function bulkImportTransactions(accountId: string, transactions: CryptoBulkImportRequest['transactions']): Promise<CryptoBulkImportResponse | null> {
    isLoading.value = true
    error.value = null
    try {
      const data: CryptoBulkImportRequest = {
        account_id: accountId,
        transactions,
      }
      const result = await apiClient.post<CryptoBulkImportResponse>('/crypto/transactions/bulk', data)
      return result
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de l\'import'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function bulkCompositeImportTransactions(
    accountId: string,
    transactions: CryptoCompositeBulkItem[],
  ): Promise<CryptoBulkCompositeImportResponse | null> {
    isLoading.value = true
    error.value = null
    try {
      const data: CryptoBulkCompositeImportRequest = {
        account_id: accountId,
        transactions,
      }
      return await apiClient.post<CryptoBulkCompositeImportResponse>('/crypto/transactions/bulk-composite', data)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de l\'import'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function previewBinanceImport(csvContent: string): Promise<BinanceImportPreviewResponse | null> {
    isLoading.value = true
    error.value = null
    try {
      return await apiClient.post<BinanceImportPreviewResponse>(
        '/crypto/import/binance/preview',
        { csv_content: csvContent },
      )
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de l\'analyse du fichier'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function confirmBinanceImport(
    accountId: string,
    groups: BinanceImportGroupPreview[],
  ): Promise<BinanceImportConfirmResponse | null> {
    isLoading.value = true
    error.value = null
    try {
      const payload: BinanceImportConfirmRequest = {
        account_id: accountId,
        groups,
      }
      return await apiClient.post<BinanceImportConfirmResponse>(
        '/crypto/import/binance/confirm',
        payload,
      )
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de l\'import Binance'
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
    searchAssets,
    getAssetsInfo,
    fetchAccounts,
    fetchAccount,
    refreshAccount,
    fetchDefaultAccount,
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
    createCompositeTransaction,
    createCrossAccountTransfer,
    updateTransaction,
    deleteTransaction,
    bulkImportTransactions,
    bulkCompositeImportTransactions,
    previewBinanceImport,
    confirmBinanceImport,
    reset,
  }
})
