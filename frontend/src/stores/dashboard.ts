import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '@/api/client'
import type {
  PortfolioResponse,
  BankSummaryResponse,
  CashflowBalanceResponse,
  DashboardStatisticsResponse,
} from '@/types'

export const useDashboardStore = defineStore('dashboard', () => {
  const portfolio = ref<PortfolioResponse | null>(null)
  const bankAccounts = ref<BankSummaryResponse | null>(null)
  const cashflowBalance = ref<CashflowBalanceResponse | null>(null)
  const statistics = ref<DashboardStatisticsResponse | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll() {
    isLoading.value = true
    error.value = null

    try {
      const [portfolioData, bankData, cashflowData, statsData] = await Promise.all([
        apiClient.get<PortfolioResponse>('/dashboard/portfolio'),
        apiClient.get<BankSummaryResponse>('/bank/accounts'),
        apiClient.get<CashflowBalanceResponse>('/cashflow/me/balance'),
        apiClient.get<DashboardStatisticsResponse>('/dashboard/statistics'),
      ])

      portfolio.value = portfolioData
      bankAccounts.value = bankData
      cashflowBalance.value = cashflowData
      statistics.value = statsData
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load dashboard'
    } finally {
      isLoading.value = false
    }
  }

  function reset() {
    portfolio.value = null
    bankAccounts.value = null
    cashflowBalance.value = null
    statistics.value = null
    error.value = null
  }

  return {
    portfolio,
    bankAccounts,
    cashflowBalance,
    statistics,
    isLoading,
    error,
    fetchAll,
    reset,
  }
})
