import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '@/api/client'
import type {
  PortfolioResponse,
  BankSummaryResponse,
  CashflowBalanceResponse,
} from '@/types'

export const useDashboardStore = defineStore('dashboard', () => {
  const portfolio = ref<PortfolioResponse | null>(null)
  const bankAccounts = ref<BankSummaryResponse | null>(null)
  const cashflowBalance = ref<CashflowBalanceResponse | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    isLoading.value = true
    error.value = null

    try {
      const [portfolioData, bankData, cashflowData] = await Promise.all([
        apiClient.get<PortfolioResponse>('/dashboard/portfolio'),
        apiClient.get<BankSummaryResponse>('/bank/accounts'),
        apiClient.get<CashflowBalanceResponse>('/cashflow/me/balance'),
      ])

      portfolio.value = portfolioData
      bankAccounts.value = bankData
      cashflowBalance.value = cashflowData
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load dashboard'
    } finally {
      isLoading.value = false
    }
  }

  function formatCurrency(value: number | string | null | undefined): string {
    const n = value !== null && value !== undefined ? Number(value) : NaN
    if (isNaN(n)) return '-'
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(n)
  }

  function formatPercent(value: number | string | null | undefined): string {
    const n = value !== null && value !== undefined ? Number(value) : NaN
    if (isNaN(n)) return '-'
    const sign = n >= 0 ? '+' : ''
    return `${sign}${n.toFixed(2)}%`
  }

  function reset() {
    portfolio.value = null
    bankAccounts.value = null
    cashflowBalance.value = null
    error.value = null
  }

  return {
    portfolio,
    bankAccounts,
    cashflowBalance,
    isLoading,
    error,
    fetchAll,
    formatCurrency,
    formatPercent,
    reset,
  }
})
