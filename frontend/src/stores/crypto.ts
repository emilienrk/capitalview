import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '@/api/client'
import type {
  CryptoAccountBasicResponse,
  CryptoAccountCreate,
  CryptoAccountUpdate,
  CryptoCompositeTransactionCreate,
  CryptoTransactionCreate,
  CryptoTransactionUpdate,
  CryptoTransactionBasicResponse,
  CryptoBulkImportRequest,
  CryptoBulkImportResponse,
  AccountSummaryResponse,
  TransactionResponse,
  AssetSearchResult,
  AssetInfoResponse,
  CrossAccountTransferCreate,
} from '@/types'

export const useCryptoStore = defineStore('crypto', () => {
  const accounts = ref<CryptoAccountBasicResponse[]>([])
  const currentAccount = ref<AccountSummaryResponse | null>(null)
  const transactions = ref<TransactionResponse[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)


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

  async function fetchAccount(id: string): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      currentAccount.value = await apiClient.get<AccountSummaryResponse>(`/crypto/accounts/${id}`)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors du chargement du compte'
    } finally {
      isLoading.value = false
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
  ): Promise<CryptoTransactionBasicResponse[] | null> {
    isLoading.value = true
    error.value = null
    try {
      return await apiClient.post<CryptoTransactionBasicResponse[]>(
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
  ): Promise<CryptoTransactionBasicResponse[] | null> {
    isLoading.value = true
    error.value = null
    try {
      return await apiClient.post<CryptoTransactionBasicResponse[]>(
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
    searchAssets,
    getAssetsInfo,
    fetchAccounts,
    fetchAccount,
    fetchDefaultAccount,
    createAccount,
    updateAccount,
    deleteAccount,
    fetchTransactions,
    fetchAccountTransactions,
    createTransaction,
    createCompositeTransaction,
    createCrossAccountTransfer,
    updateTransaction,
    deleteTransaction,
    bulkImportTransactions,
    reset,
  }
})
