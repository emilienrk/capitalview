<script setup lang="ts">
import { CreditCard, DollarSign, Eye, EyeOff, TrendingUp, WalletCards } from 'lucide-vue-next'

import { onMounted, computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore } from '@/stores/dashboard'
import { useWealthHistoryStore } from '@/stores/wealthHistory'
import { useSettingsStore } from '@/stores/settings'
import { useFormatters } from '@/composables/useFormatters'
import { usePrivacyMode } from '@/composables/usePrivacyMode'
import { useDarkMode } from '@/composables/useDarkMode'
import PageHeader from '@/components/PageHeader.vue'
import { BaseCard, BaseAlert, BaseEmptyState, BaseStatCard, BaseSkeleton, WealthHistoryChart } from '@/components'
import type { GlobalHistorySnapshotResponse } from '@/types'

const auth = useAuthStore()
const dashboard = useDashboardStore()
const historyStore = useWealthHistoryStore()
const settingsStore = useSettingsStore()
const { formatCurrency, formatPercent, formatNumber, profitLossClass, formatAccountType } = useFormatters()
const { privacyMode, togglePrivacyMode, maskValue } = usePrivacyMode()
const { isDark } = useDarkMode()

const bankEnabled = computed(() => settingsStore.settings?.bank_module_enabled ?? true)
const cashflowEnabled = computed(() => settingsStore.settings?.cashflow_module_enabled ?? true)
const wealthEnabled = computed(() => settingsStore.settings?.wealth_module_enabled ?? true)

// KPI card count = 2 fixed + optional bank + optional cashflow
const kpiCount = computed(() => 2 + (bankEnabled.value ? 1 : 0) + (cashflowEnabled.value ? 1 : 0))
const kpiColsClass = computed(() => {
  switch (kpiCount.value) {
    case 2: return 'grid-cols-1 sm:grid-cols-2'
    case 3: return 'grid-cols-1 sm:grid-cols-3'
    default: return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
  }
})

type HistoryGranularity = 'daily' | 'weekly' | 'monthly' | 'yearly'
const historyGranularity = ref<HistoryGranularity>('daily')

const granularityOptions: Array<{ value: HistoryGranularity; label: string }> = [
  { value: 'daily', label: 'Jour' },
  { value: 'weekly', label: 'Semaine' },
  { value: 'monthly', label: 'Mois' },
  { value: 'yearly', label: 'Année' },
]

function getIsoWeekKey(snapshotDate: string): string {
  const date = new Date(snapshotDate)
  if (Number.isNaN(date.getTime())) return snapshotDate

  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const weekday = utcDate.getUTCDay() || 7
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - weekday)

  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1))
  const weekNumber = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${utcDate.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`
}

function getHistoryBucketKey(snapshotDate: string, granularity: HistoryGranularity): string {
  const date = new Date(snapshotDate)
  if (Number.isNaN(date.getTime())) return snapshotDate

  if (granularity === 'weekly') return getIsoWeekKey(snapshotDate)
  if (granularity === 'monthly') return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  if (granularity === 'yearly') return String(date.getFullYear())
  return snapshotDate
}

const chartHistory = computed<GlobalHistorySnapshotResponse[]>(() => {
  const history = historyStore.history
  if (historyGranularity.value === 'daily') return history

  // Keep the latest point of each period (end-of-week/month/year value).
  const byBucket = new Map<string, GlobalHistorySnapshotResponse>()
  for (const snapshot of history) {
    const bucketKey = getHistoryBucketKey(snapshot.snapshot_date, historyGranularity.value)
    byBucket.set(bucketKey, snapshot)
  }

  return Array.from(byBucket.values())
})

onMounted(() => {
  if (auth.isAuthenticated) {
    dashboard.fetchAll(settingsStore.settings)
    historyStore.fetchHistory()
  }
})
</script>

<template>
  <div>
    <PageHeader
      title="Dashboard"
      :description="`Bienvenue ${auth.user?.username ?? ''} — Vue d'ensemble de votre patrimoine`"
    >
      <template #actions>
        <button
          @click="togglePrivacyMode"
          :title="privacyMode ? 'Afficher les valeurs' : 'Masquer les valeurs'"
          class="w-9 h-9 flex items-center justify-center rounded-button border border-surface-border dark:border-surface-dark-border bg-surface dark:bg-surface-dark text-text-muted dark:text-text-dark-muted hover:text-primary dark:hover:text-primary transition-colors"
        >
          <!-- Eye icon (visible) -->
          <Eye v-if="!privacyMode" class="w-5 h-5" />
          <!-- Eye-off icon (hidden) -->
          <EyeOff v-else class="w-5 h-5" />
        </button>
      </template>
    </PageHeader>

    <!-- Error -->
    <BaseAlert v-if="dashboard.error" variant="danger" dismissible @dismiss="dashboard.error = null" class="mb-6">
      {{ dashboard.error }}
    </BaseAlert>

    <div class="space-y-8">
      <!-- ── Summary KPI Cards ──────────────────────────── -->
      <div :class="['grid gap-4', kpiColsClass]">
        <!-- Skeleton KPI cards -->
        <template v-if="dashboard.isLoading">
          <div v-for="i in kpiCount" :key="i" class="rounded-card bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border p-5 shadow-soft">
            <div class="flex items-start justify-between">
              <div class="flex-1 space-y-3">
                <BaseSkeleton variant="rect" width="60%" height="0.75rem" />
                <BaseSkeleton variant="rect" width="80%" height="1.5rem" />
              </div>
              <BaseSkeleton variant="circle" width="2.5rem" />
            </div>
          </div>
        </template>

        <!-- Real KPI cards -->
        <template v-else>
          <BaseStatCard
            v-if="bankEnabled"
            label="Solde bancaire"
            :value="maskValue(formatCurrency(dashboard.bankAccounts?.total_balance))"
          >
            <template #icon>
              <div class="w-10 h-10 rounded-primary bg-info/10 flex items-center justify-center">
                <CreditCard class="w-5 h-5 text-info" />
              </div>
            </template>
          </BaseStatCard>

          <BaseStatCard
            label="Portfolio investi"
            :value="maskValue(formatCurrency(dashboard.portfolio?.total_invested))"
          >
            <template #icon>
              <div class="w-10 h-10 rounded-primary bg-primary/10 flex items-center justify-center">
                <TrendingUp class="w-5 h-5 text-primary" />
              </div>
            </template>
          </BaseStatCard>

          <BaseStatCard
            label="Valeur actuelle"
            :value="maskValue(formatCurrency(dashboard.portfolio?.current_value))"
            :sub-value="formatPercent(dashboard.portfolio?.profit_loss_percentage)"
            :sub-value-class="profitLossClass(dashboard.portfolio?.profit_loss_percentage)"
          >
            <template #icon>
              <div class="w-10 h-10 rounded-primary bg-success/10 flex items-center justify-center">
                <DollarSign class="w-5 h-5 text-success" />
              </div>
            </template>
          </BaseStatCard>

          <BaseStatCard
            v-if="cashflowEnabled"
            label="Épargne mensuelle"
            :value="maskValue(formatCurrency(dashboard.cashflowBalance?.monthly_balance))"
            :sub-value="dashboard.cashflowBalance?.savings_rate != null ? `Taux ${formatPercent(dashboard.cashflowBalance.savings_rate)}` : undefined"
            sub-value-class="text-text-muted dark:text-text-dark-muted"
          >
            <template #icon>
              <div class="w-10 h-10 rounded-primary bg-warning/10 flex items-center justify-center">
                <WalletCards class="w-5 h-5 text-warning" />
              </div>
            </template>
          </BaseStatCard>
        </template>
      </div>

      <!-- ── Statistics: Distribution & Wealth ───────────────── -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Investment Distribution (Stock / Crypto) -->
        <BaseCard title="Répartition des investissements" subtitle="Bourse vs Crypto">
          <!-- Skeleton -->
          <div v-if="dashboard.isLoading" class="space-y-4">
            <div v-for="i in 2" :key="i" class="flex items-center justify-between p-4 rounded-secondary border border-surface-border dark:border-surface-dark-border">
              <div class="space-y-2 flex-1">
                <BaseSkeleton variant="rect" width="40%" height="0.75rem" />
                <BaseSkeleton variant="rect" width="60%" height="1.25rem" />
              </div>
              <BaseSkeleton variant="rect" width="3rem" height="1.5rem" />
            </div>
          </div>
          <!-- Data -->
          <div v-else-if="dashboard.statistics" class="space-y-4">
            <!-- Progress bar -->
            <div class="w-full h-3 rounded-full overflow-hidden bg-background-subtle dark:bg-background-dark-subtle">
              <div class="h-full flex">
                <div
                  class="bg-primary transition-all duration-500"
                  :style="{ width: `${dashboard.statistics.distribution.stock_percentage ?? 0}%` }"
                />
                <div
                  class="bg-warning transition-all duration-500"
                  :style="{ width: `${dashboard.statistics.distribution.crypto_percentage ?? 0}%` }"
                />
              </div>
            </div>

            <!-- Stock detail -->
            <div class="flex items-center justify-between p-4 rounded-secondary bg-primary/5 border border-primary/10">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-3 h-3 rounded-full bg-primary" />
                <div>
                  <p class="text-sm font-medium text-text-main dark:text-text-dark-main">Bourse</p>
                  <p class="text-xs text-text-muted dark:text-text-dark-muted">
                    Investi : {{ maskValue(formatCurrency(dashboard.statistics.distribution.stock_invested)) }}
                  </p>
                </div>
              </div>
              <div class="text-right">
                <p class="font-bold text-text-main dark:text-text-dark-main">
                  {{ maskValue(formatCurrency(dashboard.statistics.distribution.stock_current_value)) }}
                </p>
                <p class="text-sm font-medium text-primary">
                  {{ dashboard.statistics.distribution.stock_percentage != null ? `${Number(dashboard.statistics.distribution.stock_percentage).toFixed(2)} %` : '—' }}
                </p>
              </div>
            </div>

            <!-- Crypto detail -->
            <div class="flex items-center justify-between p-4 rounded-secondary bg-warning/5 border border-warning/10">
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-3 h-3 rounded-full bg-warning" />
                <div>
                  <p class="text-sm font-medium text-text-main dark:text-text-dark-main">Crypto</p>
                  <p class="text-xs text-text-muted dark:text-text-dark-muted">
                    Investi : {{ maskValue(formatCurrency(dashboard.statistics.distribution.crypto_invested)) }}
                  </p>
                </div>
              </div>
              <div class="text-right">
                <p class="font-bold text-text-main dark:text-text-dark-main">
                  {{ maskValue(formatCurrency(dashboard.statistics.distribution.crypto_current_value)) }}
                </p>
                <p class="text-sm font-medium text-warning">
                  {{ dashboard.statistics.distribution.crypto_percentage != null ? `${Number(dashboard.statistics.distribution.crypto_percentage).toFixed(2)} %` : '—' }}
                </p>
              </div>
            </div>
          </div>
          <BaseEmptyState v-else title="Aucune donnée" description="Ajoutez des investissements pour voir la répartition" />
        </BaseCard>

        <!-- Wealth Breakdown (Cash / Investments / Assets) -->
        <BaseCard title="Composition du patrimoine" subtitle="Cash, investissements et biens">
          <!-- Skeleton -->
          <div v-if="dashboard.isLoading" class="space-y-4">
            <div v-for="i in 3" :key="i" class="flex items-center justify-between p-4 rounded-secondary border border-surface-border dark:border-surface-dark-border">
              <div class="space-y-2 flex-1">
                <BaseSkeleton variant="rect" width="40%" height="0.75rem" />
                <BaseSkeleton variant="rect" width="60%" height="1.25rem" />
              </div>
              <BaseSkeleton variant="rect" width="3rem" height="1.5rem" />
            </div>
          </div>
          <!-- Data -->
          <div v-else-if="dashboard.statistics" class="space-y-4">
            <!-- Progress bar -->
            <div class="w-full h-3 rounded-full overflow-hidden bg-background-subtle dark:bg-background-dark-subtle">
              <div class="h-full flex">
                <div
                  class="bg-info transition-all duration-500"
                  :style="{ width: `${dashboard.statistics.wealth.cash_percentage ?? 0}%` }"
                />
                <div
                  class="bg-success transition-all duration-500"
                  :style="{ width: `${dashboard.statistics.wealth.investments_percentage ?? 0}%` }"
                />
                <div
                  class="bg-secondary transition-all duration-500"
                  :style="{ width: `${dashboard.statistics.wealth.assets_percentage ?? 0}%` }"
                />
              </div>
            </div>

            <!-- Cash -->
            <div v-if="bankEnabled" class="flex items-center justify-between p-4 rounded-secondary bg-info/5 border border-info/10">
              <div class="flex items-center gap-3">
                <div class="w-3 h-3 rounded-full bg-info" />
                <p class="text-sm font-medium text-text-main dark:text-text-dark-main">Cash</p>
              </div>
              <div class="text-right">
                <p class="font-bold text-text-main dark:text-text-dark-main">
                  {{ maskValue(formatCurrency(dashboard.statistics.wealth.cash)) }}
                </p>
                <p class="text-sm font-medium text-info">
                  {{ dashboard.statistics.wealth.cash_percentage != null ? `${Number(dashboard.statistics.wealth.cash_percentage).toFixed(2)} %` : '—' }}
                </p>
              </div>
            </div>

            <!-- Investments -->
            <div class="flex items-center justify-between p-4 rounded-secondary bg-success/5 border border-success/10">
              <div class="flex items-center gap-3">
                <div class="w-3 h-3 rounded-full bg-success" />
                <p class="text-sm font-medium text-text-main dark:text-text-dark-main">Investissements</p>
              </div>
              <div class="text-right">
                <p class="font-bold text-text-main dark:text-text-dark-main">
                  {{ maskValue(formatCurrency(dashboard.statistics.wealth.investments)) }}
                </p>
                <p class="text-sm font-medium text-success">
                  {{ dashboard.statistics.wealth.investments_percentage != null ? `${Number(dashboard.statistics.wealth.investments_percentage).toFixed(2)} %` : '—' }}
                </p>
              </div>
            </div>

            <!-- Assets -->
            <div v-if="wealthEnabled" class="flex items-center justify-between p-4 rounded-secondary bg-secondary/5 border border-secondary/10">
              <div class="flex items-center gap-3">
                <div class="w-3 h-3 rounded-full bg-secondary" />
                <p class="text-sm font-medium text-text-main dark:text-text-dark-main">Patrimoine matériel</p>
              </div>
              <div class="text-right">
                <p class="font-bold text-text-main dark:text-text-dark-main">
                  {{ maskValue(formatCurrency(dashboard.statistics.wealth.assets)) }}
                </p>
                <p class="text-sm font-medium text-secondary">
                  {{ dashboard.statistics.wealth.assets_percentage != null ? `${Number(dashboard.statistics.wealth.assets_percentage).toFixed(2)} %` : '—' }}
                </p>
              </div>
            </div>

            <!-- Total Wealth -->
            <div class="pt-3 border-t border-surface-border dark:border-surface-dark-border flex items-center justify-between">
              <p class="text-sm font-semibold text-text-main dark:text-text-dark-main">Patrimoine total</p>
              <p class="text-lg font-bold text-text-main dark:text-text-dark-main">
                {{ maskValue(formatCurrency(dashboard.statistics.wealth.total_wealth)) }}
              </p>
            </div>
          </div>
          <BaseEmptyState v-else title="Aucune donnée" description="Ajoutez des comptes pour voir la composition de votre patrimoine" />
        </BaseCard>
      </div>

      <!-- ── Wealth History Chart ───────────────────────── -->
      <BaseCard title="Évolution du patrimoine" subtitle="Historique journalier de la valeur globale">
        <div v-if="historyStore.isLoading" class="h-72 flex items-center justify-center">
          <BaseSkeleton variant="rect" width="100%" height="18rem" />
        </div>
        <BaseAlert v-else-if="historyStore.error" variant="danger">
          {{ historyStore.error }}
        </BaseAlert>
        <template v-else-if="historyStore.history.length > 0">
          <div class="mb-4 flex items-center justify-end">
            <div class="inline-flex rounded-button border border-surface-border dark:border-surface-dark-border bg-background-subtle dark:bg-background-dark-subtle p-1">
              <button
                v-for="option in granularityOptions"
                :key="option.value"
                type="button"
                @click="historyGranularity = option.value"
                :class="[
                  'px-3 py-1.5 text-xs sm:text-sm rounded-button transition-colors',
                  historyGranularity === option.value
                    ? 'bg-primary text-primary-content'
                    : 'text-text-muted dark:text-text-dark-muted hover:text-text-main dark:hover:text-text-dark-main',
                ]"
              >
                {{ option.label }}
              </button>
            </div>
          </div>
          <WealthHistoryChart
            :history="chartHistory"
            :is-dark="isDark"
            :bank-enabled="bankEnabled"
            :wealth-enabled="wealthEnabled"
            :granularity="historyGranularity"
          />
        </template>
        <BaseEmptyState
          v-else
          title="Pas encore assez de données"
          description="L'historique s'affichera après 7 jours de suivi quotidien"
        />
      </BaseCard>

      <!-- ── Investment Portfolio ────────────────────────── -->      <BaseCard title="Portfolio d'investissement" subtitle="Actions et crypto-monnaies">
        <!-- Skeleton -->
        <div v-if="dashboard.isLoading" class="space-y-4">
          <div class="rounded-secondary border border-surface-border dark:border-surface-dark-border overflow-hidden">
            <div class="px-4 py-3 bg-background-subtle dark:bg-background-dark-subtle flex items-center justify-between">
              <div class="space-y-2">
                <BaseSkeleton variant="rect" width="8rem" height="0.875rem" />
                <BaseSkeleton variant="rect" width="4rem" height="0.625rem" />
              </div>
              <div class="space-y-2 text-right">
                <BaseSkeleton variant="rect" width="6rem" height="0.875rem" />
                <BaseSkeleton variant="rect" width="4rem" height="0.625rem" />
              </div>
            </div>
            <div class="p-4 space-y-3">
              <BaseSkeleton v-for="i in 3" :key="i" variant="rect" height="1rem" />
            </div>
          </div>
        </div>
        <!-- Data -->
        <div v-else-if="dashboard.portfolio?.accounts?.length">
          <div class="space-y-6">
            <div
              v-for="account in dashboard.portfolio.accounts"
              :key="account.account_id"
              class="rounded-secondary border border-surface-border dark:border-surface-dark-border overflow-hidden"
            >
              <!-- Account header -->
              <div class="px-4 py-3 bg-background-subtle dark:bg-background-dark-subtle flex items-center justify-between">
                <div>
                  <p class="font-semibold text-text-main dark:text-text-dark-main">{{ account.account_name }}</p>
                  <p class="text-xs text-text-muted dark:text-text-dark-muted">{{ formatAccountType(account.account_type) }}</p>
                </div>
                <div class="text-right">
                  <p class="font-semibold text-text-main dark:text-text-dark-main">{{ maskValue(formatCurrency(account.current_value)) }}</p>
                  <p :class="['text-xs font-medium', profitLossClass(account.profit_loss)]">
                    {{ formatCurrency(account.profit_loss) }} ({{ formatPercent(account.profit_loss_percentage) }})
                  </p>
                </div>
              </div>

              <!-- Positions table -->
              <div v-if="account.positions?.length" class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="text-left text-text-muted dark:text-text-dark-muted text-xs uppercase tracking-wider">
                      <th class="px-4 py-2">Nom</th>
                      <th class="px-4 py-2 text-right">Quantité</th>
                      <th class="px-4 py-2 text-right">PRU</th>
                      <th class="px-4 py-2 text-right">Investi</th>
                      <th class="px-4 py-2 text-right">Valeur</th>
                      <th class="px-4 py-2 text-right">P/L</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-surface-border dark:divide-surface-dark-border">
                    <tr v-for="pos in account.positions" :key="pos.symbol" class="hover:bg-surface-hover dark:hover:bg-surface-dark-hover transition-colors">
                      <td class="px-4 py-2.5 font-medium text-text-main dark:text-text-dark-main">{{ pos.name || pos.symbol }}</td>
                      <td class="px-4 py-2.5 text-right text-text-body dark:text-text-dark-body">{{ formatNumber(pos.total_amount, 4) }}</td>
                      <td class="px-4 py-2.5 text-right text-text-body dark:text-text-dark-body">{{ formatCurrency(pos.average_buy_price) }}</td>
                      <td class="px-4 py-2.5 text-right text-text-body dark:text-text-dark-body">{{ formatCurrency(pos.total_invested) }}</td>
                      <td class="px-4 py-2.5 text-right font-medium text-text-main dark:text-text-dark-main">{{ maskValue(formatCurrency(pos.current_value)) }}</td>
                      <td class="px-4 py-2.5 text-right">
                        <span :class="['font-medium', profitLossClass(pos.profit_loss)]">
                          {{ formatPercent(pos.profit_loss_percentage) }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p v-else class="px-4 py-3 text-sm text-text-muted dark:text-text-dark-muted">Aucune position</p>
            </div>
          </div>
        </div>
        <BaseEmptyState v-else title="Aucun investissement" description="Ajoutez des comptes PEA, CTO ou Crypto pour suivre vos investissements" />
      </BaseCard>
    </div>
  </div>
</template>
