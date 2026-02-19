<script setup lang="ts">
import { onMounted } from 'vue'
import { useDashboardStore } from '@/stores/dashboard'
import { useBankStore } from '@/stores/bank'
import { useFormatters } from '@/composables/useFormatters'
import PageHeader from '@/components/PageHeader.vue'
import {
  BaseCard, BaseSpinner, BaseAlert, BaseEmptyState, BaseStatCard,
} from '@/components'

const dashboard = useDashboardStore()
const bank = useBankStore()
const { formatCurrency, formatPercent, profitLossClass, formatAccountType } = useFormatters()

onMounted(async () => {
  await Promise.all([
    dashboard.fetchAll(),
    bank.fetchAccounts(),
  ])
})

/**
 * Total net worth = bank balance + portfolio current value (or invested if current unavailable)
 */
function totalNetWorth(): number | null {
  const bankTotal = Number(bank.summary?.total_balance) || 0
  const portfolioValue = Number(dashboard.portfolio?.current_value ?? dashboard.portfolio?.total_invested) || 0
  return bankTotal + portfolioValue
}
</script>

<template>
  <div>
    <PageHeader title="Patrimoine" description="Vue d'ensemble de votre patrimoine total" />

    <div v-if="dashboard.isLoading" class="flex justify-center py-20">
      <BaseSpinner size="lg" label="Chargement du patrimoine..." />
    </div>

    <BaseAlert v-if="dashboard.error" variant="danger" class="mb-6">{{ dashboard.error }}</BaseAlert>

    <div v-else class="space-y-8">
      <!-- Net Worth -->
      <div class="p-6 rounded-card bg-primary/5 border border-primary/10 text-center">
        <p class="text-sm text-text-muted dark:text-text-dark-muted">Patrimoine total estimé</p>
        <p class="text-4xl font-bold text-text-main dark:text-text-dark-main mt-2">
          {{ formatCurrency(totalNetWorth()) }}
        </p>
      </div>

      <!-- Breakdown -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <BaseStatCard
          label="Liquidités"
          :value="formatCurrency(bank.summary?.total_balance)"
        />
        <BaseStatCard
          label="Investissements"
          :value="formatCurrency(dashboard.portfolio?.current_value ?? dashboard.portfolio?.total_invested)"
          :sub-value="formatPercent(dashboard.portfolio?.profit_loss_percentage)"
          :sub-value-class="profitLossClass(dashboard.portfolio?.profit_loss_percentage)"
        />
        <BaseStatCard
          label="Épargne mensuelle"
          :value="formatCurrency(dashboard.cashflowBalance?.monthly_balance)"
        />
      </div>

      <!-- Account breakdown by type -->
      <BaseCard title="Répartition par compte">
        <div v-if="dashboard.portfolio?.accounts?.length" class="space-y-3">
          <div
            v-for="account in dashboard.portfolio.accounts"
            :key="account.account_id"
            class="flex items-center justify-between py-2 border-b border-surface-border dark:border-surface-dark-border last:border-0"
          >
            <div>
              <p class="font-medium text-text-main dark:text-text-dark-main">{{ account.account_name }}</p>
              <p class="text-xs text-text-muted dark:text-text-dark-muted">{{ formatAccountType(account.account_type) }}</p>
            </div>
            <div class="text-right">
              <p class="font-semibold text-text-main dark:text-text-dark-main">{{ formatCurrency(account.current_value ?? account.total_invested) }}</p>
              <p :class="['text-xs font-medium', profitLossClass(account.profit_loss)]">
                {{ formatPercent(account.profit_loss_percentage) }}
              </p>
            </div>
          </div>
        </div>
        <BaseEmptyState v-else title="Aucun investissement" description="Ajoutez des comptes pour visualiser votre répartition" />
      </BaseCard>
    </div>
  </div>
</template>
