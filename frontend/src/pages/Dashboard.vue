<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore } from '@/stores/dashboard'
import { useFormatters } from '@/composables/useFormatters'
import PageHeader from '@/components/PageHeader.vue'
import { BaseCard, BaseSpinner, BaseAlert, BaseEmptyState, BaseStatCard } from '@/components'

const auth = useAuthStore()
const dashboard = useDashboardStore()
const { formatCurrency, formatPercent, profitLossClass } = useFormatters()

onMounted(() => {
  if (auth.isAuthenticated) {
    dashboard.fetchAll()
  }
})
</script>

<template>
  <div>
    <PageHeader
      title="Dashboard"
      :description="`Bienvenue ${auth.user?.username ?? ''} — Vue d'ensemble de votre patrimoine`"
    />

    <!-- Loading -->
    <div v-if="dashboard.isLoading" class="flex justify-center py-20">
      <BaseSpinner size="lg" label="Chargement du dashboard..." />
    </div>

    <!-- Error -->
    <BaseAlert v-else-if="dashboard.error" variant="danger" dismissible @dismiss="dashboard.error = null">
      {{ dashboard.error }}
    </BaseAlert>

    <!-- Content -->
    <div v-else class="space-y-8">
      <!-- ── Summary KPI Cards ──────────────────────────── -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <BaseStatCard
          label="Solde bancaire"
          :value="formatCurrency(dashboard.bankAccounts?.total_balance)"
        >
          <template #icon>
            <div class="w-10 h-10 rounded-primary bg-info/10 flex items-center justify-center">
              <svg class="w-5 h-5 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </template>
        </BaseStatCard>

        <BaseStatCard
          label="Portfolio investi"
          :value="formatCurrency(dashboard.portfolio?.total_invested)"
        >
          <template #icon>
            <div class="w-10 h-10 rounded-primary bg-primary/10 flex items-center justify-center">
              <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </template>
        </BaseStatCard>

        <BaseStatCard
          label="Valeur actuelle"
          :value="formatCurrency(dashboard.portfolio?.current_value)"
          :sub-value="formatPercent(dashboard.portfolio?.profit_loss_percentage)"
          :sub-value-class="profitLossClass(dashboard.portfolio?.profit_loss_percentage)"
        >
          <template #icon>
            <div class="w-10 h-10 rounded-primary bg-success/10 flex items-center justify-center">
              <svg class="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </template>
        </BaseStatCard>

        <BaseStatCard
          label="Épargne mensuelle"
          :value="formatCurrency(dashboard.cashflowBalance?.monthly_balance)"
          :sub-value="dashboard.cashflowBalance?.savings_rate != null ? `Taux ${formatPercent(dashboard.cashflowBalance.savings_rate)}` : undefined"
          sub-value-class="text-text-muted dark:text-text-dark-muted"
        >
          <template #icon>
            <div class="w-10 h-10 rounded-primary bg-warning/10 flex items-center justify-center">
              <svg class="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </template>
        </BaseStatCard>
      </div>

      <!-- ── Cashflow Summary ───────────────────────────── -->
      <BaseCard title="Flux de trésorerie" subtitle="Revenus et dépenses mensuels">
        <div v-if="dashboard.cashflowBalance" class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="text-center p-4 rounded-secondary bg-success/5 border border-success/10">
            <p class="text-sm text-text-muted dark:text-text-dark-muted">Revenus mensuels</p>
            <p class="text-xl font-bold text-success mt-1">{{ formatCurrency(dashboard.cashflowBalance.monthly_inflows) }}</p>
          </div>
          <div class="text-center p-4 rounded-secondary bg-danger/5 border border-danger/10">
            <p class="text-sm text-text-muted dark:text-text-dark-muted">Dépenses mensuelles</p>
            <p class="text-xl font-bold text-danger mt-1">{{ formatCurrency(dashboard.cashflowBalance.monthly_outflows) }}</p>
          </div>
          <div class="text-center p-4 rounded-secondary bg-primary/5 border border-primary/10">
            <p class="text-sm text-text-muted dark:text-text-dark-muted">Balance nette</p>
            <p :class="['text-xl font-bold mt-1', profitLossClass(dashboard.cashflowBalance.monthly_balance)]">
              {{ formatCurrency(dashboard.cashflowBalance.monthly_balance) }}
            </p>
          </div>
        </div>
        <BaseEmptyState v-else title="Aucune donnée" description="Ajoutez vos flux de trésorerie pour commencer le suivi" />
      </BaseCard>

      <!-- ── Bank Accounts ──────────────────────────────── -->
      <BaseCard title="Comptes bancaires">
        <div v-if="dashboard.bankAccounts?.accounts?.length" class="divide-y divide-surface-border dark:divide-surface-dark-border">
          <div
            v-for="account in dashboard.bankAccounts.accounts"
            :key="account.id"
            class="flex items-center justify-between py-3 first:pt-0 last:pb-0"
          >
            <div>
              <p class="font-medium text-text-main dark:text-text-dark-main">{{ account.name }}</p>
              <p class="text-xs text-text-muted dark:text-text-dark-muted">
                {{ account.account_type }}
                <span v-if="account.bank_name"> · {{ account.bank_name }}</span>
              </p>
            </div>
            <p class="font-semibold text-text-main dark:text-text-dark-main">
              {{ formatCurrency(account.balance) }}
            </p>
          </div>
        </div>
        <BaseEmptyState v-else title="Aucun compte" description="Ajoutez un compte bancaire depuis la page Compte Courant" />
      </BaseCard>

      <!-- ── Investment Portfolio ────────────────────────── -->
      <BaseCard title="Portfolio d'investissement" subtitle="Actions et crypto-monnaies">
        <div v-if="dashboard.portfolio?.accounts?.length">
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
                  <p class="text-xs text-text-muted dark:text-text-dark-muted">{{ account.account_type }}</p>
                </div>
                <div class="text-right">
                  <p class="font-semibold text-text-main dark:text-text-dark-main">{{ formatCurrency(account.current_value) }}</p>
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
                      <th class="px-4 py-2">Ticker</th>
                      <th class="px-4 py-2 text-right">Quantité</th>
                      <th class="px-4 py-2 text-right">PRU</th>
                      <th class="px-4 py-2 text-right">Investi</th>
                      <th class="px-4 py-2 text-right">Valeur</th>
                      <th class="px-4 py-2 text-right">P/L</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-surface-border dark:divide-surface-dark-border">
                    <tr v-for="pos in account.positions" :key="pos.ticker" class="hover:bg-surface-hover dark:hover:bg-surface-dark-hover transition-colors">
                      <td class="px-4 py-2.5 font-medium text-text-main dark:text-text-dark-main">{{ pos.ticker }}</td>
                      <td class="px-4 py-2.5 text-right text-text-body dark:text-text-dark-body">{{ pos.total_amount }}</td>
                      <td class="px-4 py-2.5 text-right text-text-body dark:text-text-dark-body">{{ formatCurrency(pos.average_buy_price) }}</td>
                      <td class="px-4 py-2.5 text-right text-text-body dark:text-text-dark-body">{{ formatCurrency(pos.total_invested) }}</td>
                      <td class="px-4 py-2.5 text-right font-medium text-text-main dark:text-text-dark-main">{{ formatCurrency(pos.current_value) }}</td>
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
