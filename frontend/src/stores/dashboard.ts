import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '@/api/client'
import type {
  PortfolioResponse,
  BankSummaryResponse,
  CashflowBalanceResponse,
  DashboardStatisticsResponse,
  UserSettingsResponse,
} from '@/types'

export const useDashboardStore = defineStore('dashboard', () => {
  const portfolio = ref<PortfolioResponse | null>(null)
  const bankAccounts = ref<BankSummaryResponse | null>(null)
  const cashflowBalance = ref<CashflowBalanceResponse | null>(null)
  const statistics = ref<DashboardStatisticsResponse | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll(settings?: UserSettingsResponse | null) {
    isLoading.value = true
    error.value = null

    const bankEnabled = settings?.bank_module_enabled ?? true
    const cashflowEnabled = settings?.cashflow_module_enabled ?? true

    try {
      const requests: Promise<unknown>[] = [
        apiClient.get<PortfolioResponse>('/dashboard/portfolio'),
        bankEnabled
          ? apiClient.get<BankSummaryResponse>('/bank/accounts')
          : Promise.resolve(null),
        cashflowEnabled
          ? apiClient.get<CashflowBalanceResponse>('/cashflow/me/balance')
          : Promise.resolve(null),
        apiClient.get<DashboardStatisticsResponse>('/dashboard/statistics'),
      ]

      const [portfolioData, bankData, cashflowData, statsData] = await Promise.all(requests)

      portfolio.value = portfolioData as PortfolioResponse
      bankAccounts.value = bankEnabled ? (bankData as BankSummaryResponse) : null
      cashflowBalance.value = cashflowEnabled ? (cashflowData as CashflowBalanceResponse) : null
      statistics.value = statsData as DashboardStatisticsResponse
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
