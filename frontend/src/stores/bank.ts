import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '@/api/client'
import type {
  BankAccountResponse,
  BankSummaryResponse,
  BankAccountCreate,
  BankAccountUpdate,
} from '@/types'

export const useBankStore = defineStore('bank', () => {
  const summary = ref<BankSummaryResponse | null>(null)
  const currentAccount = ref<BankAccountResponse | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

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

  async function fetchAccount(id: number): Promise<void> {
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
      return account
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de la création du compte'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function updateAccount(id: number, data: BankAccountUpdate): Promise<BankAccountResponse | null> {
    isLoading.value = true
    error.value = null
    try {
      const account = await apiClient.put<BankAccountResponse>(`/bank/accounts/${id}`, data)
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
      await apiClient.delete(`/bank/accounts/${id}`)
      await fetchAccounts()
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de la suppression'
      return false
    } finally {
      isLoading.value = false
    }
  }

  function reset(): void {
    summary.value = null
    currentAccount.value = null
    error.value = null
  }

  return {
    summary,
    currentAccount,
    isLoading,
    error,
    fetchAccounts,
    fetchAccount,
    createAccount,
    updateAccount,
    deleteAccount,
    reset,
  }
})
