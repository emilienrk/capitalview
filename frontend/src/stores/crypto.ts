import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '@/api/client'
import type {
  CryptoAccountBasicResponse,
  CryptoAccountCreate,
  CryptoAccountUpdate,
  CryptoTransactionCreate,
  CryptoTransactionBasicResponse,
  AccountSummaryResponse,
  TransactionResponse,
} from '@/types'

export const useCryptoStore = defineStore('crypto', () => {
  const accounts = ref<CryptoAccountBasicResponse[]>([])
  const currentAccount = ref<AccountSummaryResponse | null>(null)
  const transactions = ref<TransactionResponse[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // ── Accounts ───────────────────────────────────────────────

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

  async function fetchAccount(id: number): Promise<void> {
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

  async function updateAccount(id: number, data: CryptoAccountUpdate): Promise<CryptoAccountBasicResponse | null> {
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

  async function deleteAccount(id: number): Promise<boolean> {
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

  // ── Transactions ───────────────────────────────────────────

  async function fetchTransactions(): Promise<void> {
    try {
      transactions.value = await apiClient.get<TransactionResponse[]>('/crypto/transactions')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors du chargement des transactions'
    }
  }

  async function fetchAccountTransactions(accountId: number): Promise<TransactionResponse[]> {
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

  async function deleteTransaction(id: number): Promise<boolean> {
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
    deleteTransaction,
    reset,
  }
})
