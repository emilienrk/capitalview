import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '@/api/client'
import type {
  StockAccountBasicResponse,
  StockAccountCreate,
  StockAccountUpdate,
  StockTransactionCreate,
  StockTransactionUpdate,
  StockTransactionBasicResponse,
  AccountSummaryResponse,
  TransactionResponse,
  AssetSearchResult,
  AssetInfoResponse,
} from '@/types'

export const useStocksStore = defineStore('stocks', () => {
  const accounts = ref<StockAccountBasicResponse[]>([])
  const currentAccount = ref<AccountSummaryResponse | null>(null)
  const transactions = ref<TransactionResponse[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // ── Market Data ────────────────────────────────────────────

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

  // ── Accounts ───────────────────────────────────────────────

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

  async function fetchAccount(id: string): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      currentAccount.value = await apiClient.get<AccountSummaryResponse>(`/stocks/accounts/${id}`)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors du chargement du compte'
    } finally {
      isLoading.value = false
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

  // ── Transactions ───────────────────────────────────────────

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

  function reset(): void {
    accounts.value = []
    currentAccount.value = null
    transactions.value = []
    error.value = null
  }

  return {
    accounts,
    currentAccount,
    transactions,
    isLoading,
    error,
    fetchAccounts,
    fetchAccount,
    createAccount,
    updateAccount,
    deleteAccount,
    fetchTransactions,
    fetchAccountTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    searchAssets,
    getAssetsInfo,
    reset,
  }
})
