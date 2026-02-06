<script setup lang="ts">
import { onMounted, ref, reactive, computed } from 'vue'
import { useStocksStore } from '@/stores/stocks'
import { useFormatters } from '@/composables/useFormatters'
import PageHeader from '@/components/PageHeader.vue'
import {
  BaseCard, BaseButton, BaseInput, BaseSelect, BaseModal,
  BaseSpinner, BaseAlert, BaseEmptyState, BaseBadge, BaseStatCard,
} from '@/components'
import type { StockAccountCreate, StockTransactionCreate, StockAccountType } from '@/types'

const stocks = useStocksStore()
const { formatCurrency, formatPercent, formatNumber, formatDate, profitLossClass } = useFormatters()

// ── State ────────────────────────────────────────────────────
const showAccountModal = ref(false)
const showTxModal = ref(false)
const showDeleteModal = ref(false)
const deleteTarget = ref<{ type: 'account' | 'transaction'; id: number; label: string } | null>(null)
const selectedAccountId = ref<number | null>(null)
const activeFilter = ref<'all' | 'PEA' | 'CTO' | 'PEA_PME'>('all')

const accountForm = reactive<StockAccountCreate>({
  name: '',
  account_type: 'CTO' as StockAccountType,
  bank_name: '',
})

const txForm = reactive<StockTransactionCreate>({
  account_id: 0,
  ticker: '',
  exchange: '',
  type: 'BUY',
  amount: 0,
  price_per_unit: 0,
  fees: 0,
  executed_at: new Date().toISOString().slice(0, 16),
})

// ── Options ──────────────────────────────────────────────────
const txTypeOptions = [
  { label: 'Achat', value: 'BUY' },
  { label: 'Vente', value: 'SELL' },
  { label: 'Dépôt', value: 'DEPOSIT' },
  { label: 'Dividende', value: 'DIVIDEND' },
]

const accountTypeLabels: Record<string, string> = {
  PEA: 'PEA',
  CTO: 'Compte-Titres',
  PEA_PME: 'PEA-PME',
}

// ── Computed ─────────────────────────────────────────────────

/** Check if user already has a PEA account */
const hasPea = computed(() =>
  stocks.accounts.some((a) => a.account_type === 'PEA'),
)

/** Available account types for creation — PEA only if none exists yet */
const availableAccountTypes = computed(() => {
  const types = [
    { label: 'Compte-Titres (CTO)', value: 'CTO' },
    { label: 'PEA-PME', value: 'PEA_PME' },
  ]
  if (!hasPea.value) {
    types.unshift({ label: 'PEA', value: 'PEA' })
  }
  return types
})

/** Filtered accounts based on active tab */
const filteredAccounts = computed(() => {
  if (activeFilter.value === 'all') return stocks.accounts
  return stocks.accounts.filter((a) => a.account_type === activeFilter.value)
})

/** Total account count per type for badges */
const accountCounts = computed(() => {
  const counts = { PEA: 0, CTO: 0, PEA_PME: 0 }
  for (const a of stocks.accounts) {
    if (a.account_type in counts) {
      counts[a.account_type as keyof typeof counts]++
    }
  }
  return counts
})

/** Portfolio totals from currentAccount data (when selected) */
const selectedAccountSummary = computed(() => stocks.currentAccount)

// ── Actions ──────────────────────────────────────────────────
function openCreateAccount(): void {
  accountForm.name = ''
  // Default to CTO, or PEA if no PEA exists yet
  accountForm.account_type = hasPea.value ? 'CTO' : 'PEA'
  accountForm.bank_name = ''
  showAccountModal.value = true
}

async function handleCreateAccount(): Promise<void> {
  await stocks.createAccount({ ...accountForm })
  showAccountModal.value = false
}

function openAddTransaction(accountId: number): void {
  txForm.account_id = accountId
  txForm.ticker = ''
  txForm.exchange = ''
  txForm.type = 'BUY'
  txForm.amount = 0
  txForm.price_per_unit = 0
  txForm.fees = 0
  txForm.executed_at = new Date().toISOString().slice(0, 16)
  showTxModal.value = true
}

async function handleCreateTransaction(): Promise<void> {
  const tx = await stocks.createTransaction({ ...txForm })
  if (tx) {
    showTxModal.value = false
    if (selectedAccountId.value) {
      await stocks.fetchAccount(selectedAccountId.value)
    }
  }
}

async function selectAccount(id: number): Promise<void> {
  if (selectedAccountId.value === id) {
    // Toggle: deselect
    selectedAccountId.value = null
    stocks.currentAccount = null
    return
  }
  selectedAccountId.value = id
  await stocks.fetchAccount(id)
}

function confirmDeleteAccount(account: { id: number; name: string }): void {
  deleteTarget.value = { type: 'account', id: account.id, label: account.name }
  showDeleteModal.value = true
}

async function handleDelete(): Promise<void> {
  if (!deleteTarget.value) return

  if (deleteTarget.value.type === 'account') {
    await stocks.deleteAccount(deleteTarget.value.id)
    if (selectedAccountId.value === deleteTarget.value.id) {
      selectedAccountId.value = null
      stocks.currentAccount = null
    }
  } else {
    await stocks.deleteTransaction(deleteTarget.value.id)
    if (selectedAccountId.value) {
      await stocks.fetchAccount(selectedAccountId.value)
    }
  }

  showDeleteModal.value = false
  deleteTarget.value = null
}

function badgeVariant(type: string): 'primary' | 'info' | 'warning' {
  if (type === 'PEA') return 'primary'
  if (type === 'PEA_PME') return 'warning'
  return 'info'
}

// ── Lifecycle ────────────────────────────────────────────────
onMounted(() => {
  stocks.fetchAccounts()
})
</script>

<template>
  <div>
    <PageHeader title="Bourse" description="PEA, PEA-PME et Comptes-Titres">
      <template #actions>
        <BaseButton @click="openCreateAccount">+ Nouveau compte</BaseButton>
      </template>
    </PageHeader>

    <!-- Loading -->
    <div v-if="stocks.isLoading && !stocks.accounts.length" class="flex justify-center py-20">
      <BaseSpinner size="lg" label="Chargement..." />
    </div>

    <!-- Error -->
    <BaseAlert v-if="stocks.error" variant="danger" dismissible @dismiss="stocks.error = null" class="mb-6">
      {{ stocks.error }}
    </BaseAlert>

    <!-- ── Stats overview ───────────────────────────────── -->
    <div v-if="stocks.accounts.length" class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      <BaseStatCard
        label="Comptes PEA"
        :value="String(accountCounts.PEA)"
      >
        <template #icon>
          <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        </template>
      </BaseStatCard>

      <BaseStatCard
        label="Comptes-Titres"
        :value="String(accountCounts.CTO)"
        sub-value="Illimité"
        sub-value-class="text-text-muted dark:text-text-dark-muted"
      >
        <template #icon>
          <div class="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center">
            <svg class="w-5 h-5 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </template>
      </BaseStatCard>

      <BaseStatCard
        label="PEA-PME"
        :value="String(accountCounts.PEA_PME)"
        sub-value="Illimité"
        sub-value-class="text-text-muted dark:text-text-dark-muted"
      >
        <template #icon>
          <div class="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
            <svg class="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </template>
      </BaseStatCard>
    </div>

    <!-- ── Filter tabs ──────────────────────────────────── -->
    <div v-if="stocks.accounts.length" class="mb-6">
      <div class="flex gap-1 p-1 rounded-button bg-background-subtle dark:bg-background-dark-subtle w-fit">
        <button
          v-for="tab in [
            { key: 'all' as const, label: 'Tous', count: stocks.accounts.length },
            { key: 'PEA' as const, label: 'PEA', count: accountCounts.PEA },
            { key: 'CTO' as const, label: 'CTO', count: accountCounts.CTO },
            { key: 'PEA_PME' as const, label: 'PEA-PME', count: accountCounts.PEA_PME },
          ]"
          :key="tab.key"
          @click="activeFilter = tab.key"
          :class="[
            'px-4 py-2 text-sm font-medium rounded-button transition-all duration-150 flex items-center gap-2',
            activeFilter === tab.key
              ? 'bg-surface dark:bg-surface-dark text-text-main dark:text-text-dark-main shadow-sm'
              : 'text-text-muted dark:text-text-dark-muted hover:text-text-main dark:hover:text-text-dark-main',
          ]"
        >
          {{ tab.label }}
          <span
            v-if="tab.count > 0"
            :class="[
              'text-xs font-bold px-1.5 py-0.5 rounded-full',
              activeFilter === tab.key
                ? 'bg-primary/10 text-primary'
                : 'bg-background-subtle dark:bg-background-dark-subtle text-text-muted dark:text-text-dark-muted',
            ]"
          >
            {{ tab.count }}
          </span>
        </button>
      </div>
    </div>

    <!-- ── Account list ─────────────────────────────────── -->
    <div v-if="filteredAccounts.length" class="space-y-4">
      <BaseCard
        v-for="account in filteredAccounts"
        :key="account.id"
        :class="[
          'transition-all duration-150',
          selectedAccountId === account.id ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-background-dark' : '',
        ]"
      >
        <div class="flex items-center justify-between">
          <div
            class="flex-1 cursor-pointer min-w-0"
            @click="selectAccount(account.id)"
          >
            <div class="flex items-center gap-3">
              <h3 class="font-semibold text-text-main dark:text-text-dark-main truncate">{{ account.name }}</h3>
              <BaseBadge :variant="badgeVariant(account.account_type)">
                {{ accountTypeLabels[account.account_type] || account.account_type }}
              </BaseBadge>
            </div>
            <div class="flex items-center gap-3 mt-1">
              <span v-if="account.bank_name" class="text-xs text-text-muted dark:text-text-dark-muted">{{ account.bank_name }}</span>
              <span class="text-xs text-text-muted dark:text-text-dark-muted">Créé le {{ formatDate(account.created_at) }}</span>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0 ml-4">
            <BaseButton size="sm" variant="outline" @click.stop="openAddTransaction(account.id)">
              + Transaction
            </BaseButton>
            <BaseButton size="sm" variant="ghost" @click.stop="confirmDeleteAccount(account)">
              <svg class="w-4 h-4 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </BaseButton>
          </div>
        </div>

        <!-- Inline account detail when selected -->
        <div
          v-if="selectedAccountId === account.id && selectedAccountSummary"
          class="mt-6 pt-6 border-t border-surface-border dark:border-surface-dark-border"
        >
          <!-- Account summary stats -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div>
              <p class="text-xs text-text-muted dark:text-text-dark-muted">Investi</p>
              <p class="text-lg font-bold text-text-main dark:text-text-dark-main">{{ formatCurrency(selectedAccountSummary.total_invested) }}</p>
            </div>
            <div>
              <p class="text-xs text-text-muted dark:text-text-dark-muted">Valeur actuelle</p>
              <p class="text-lg font-bold text-text-main dark:text-text-dark-main">{{ formatCurrency(selectedAccountSummary.current_value) }}</p>
            </div>
            <div>
              <p class="text-xs text-text-muted dark:text-text-dark-muted">P/L</p>
              <p :class="['text-lg font-bold', profitLossClass(selectedAccountSummary.profit_loss)]">
                {{ formatCurrency(selectedAccountSummary.profit_loss) }}
              </p>
            </div>
            <div>
              <p class="text-xs text-text-muted dark:text-text-dark-muted">Performance</p>
              <p :class="['text-lg font-bold', profitLossClass(selectedAccountSummary.profit_loss_percentage)]">
                {{ formatPercent(selectedAccountSummary.profit_loss_percentage) }}
              </p>
            </div>
          </div>

          <!-- Positions table -->
          <div v-if="selectedAccountSummary.positions?.length" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-xs text-text-muted dark:text-text-dark-muted uppercase tracking-wider border-b border-surface-border dark:border-surface-dark-border">
                  <th class="px-4 py-2">Ticker</th>
                  <th class="px-4 py-2 text-right">Quantité</th>
                  <th class="px-4 py-2 text-right">PRU</th>
                  <th class="px-4 py-2 text-right">Investi</th>
                  <th class="px-4 py-2 text-right">Cours</th>
                  <th class="px-4 py-2 text-right">Valeur</th>
                  <th class="px-4 py-2 text-right">P/L</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-surface-border dark:divide-surface-dark-border">
                <tr
                  v-for="pos in selectedAccountSummary.positions"
                  :key="pos.ticker"
                  class="hover:bg-surface-hover dark:hover:bg-surface-dark-hover transition-colors"
                >
                  <td class="px-4 py-2.5">
                    <span class="font-medium text-text-main dark:text-text-dark-main">{{ pos.ticker }}</span>
                    <span v-if="pos.name" class="ml-2 text-xs text-text-muted dark:text-text-dark-muted">{{ pos.name }}</span>
                  </td>
                  <td class="px-4 py-2.5 text-right text-text-body dark:text-text-dark-body">{{ formatNumber(pos.total_amount, 4) }}</td>
                  <td class="px-4 py-2.5 text-right text-text-body dark:text-text-dark-body">{{ formatCurrency(pos.average_buy_price) }}</td>
                  <td class="px-4 py-2.5 text-right text-text-body dark:text-text-dark-body">{{ formatCurrency(pos.total_invested) }}</td>
                  <td class="px-4 py-2.5 text-right text-text-body dark:text-text-dark-body">{{ formatCurrency(pos.current_price) }}</td>
                  <td class="px-4 py-2.5 text-right font-medium text-text-main dark:text-text-dark-main">{{ formatCurrency(pos.current_value) }}</td>
                  <td class="px-4 py-2.5 text-right">
                    <span :class="['font-medium', profitLossClass(pos.profit_loss)]">
                      {{ formatCurrency(pos.profit_loss) }}
                    </span>
                    <span :class="['block text-xs', profitLossClass(pos.profit_loss_percentage)]">
                      {{ formatPercent(pos.profit_loss_percentage) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="py-6 text-center">
            <p class="text-sm text-text-muted dark:text-text-dark-muted">Aucune position — ajoutez des transactions pour commencer</p>
          </div>
        </div>

        <!-- Loading spinner for account detail -->
        <div
          v-if="selectedAccountId === account.id && stocks.isLoading && !selectedAccountSummary"
          class="mt-6 pt-6 border-t border-surface-border dark:border-surface-dark-border flex justify-center py-8"
        >
          <BaseSpinner size="md" label="Chargement des positions..." />
        </div>
      </BaseCard>
    </div>

    <!-- Empty state -->
    <BaseEmptyState
      v-else-if="!stocks.isLoading && !stocks.accounts.length"
      title="Aucun compte bourse"
      description="Créez un PEA, un Compte-Titres ou un PEA-PME pour suivre vos investissements en bourse"
      action-label="Créer un compte"
      @action="openCreateAccount"
    >
      <template #icon>
        <svg class="w-8 h-8 text-text-muted dark:text-text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      </template>
    </BaseEmptyState>

    <!-- No results for filter -->
    <BaseEmptyState
      v-else-if="!stocks.isLoading && stocks.accounts.length && !filteredAccounts.length"
      title="Aucun compte de ce type"
      :description="`Aucun compte ${activeFilter === 'PEA_PME' ? 'PEA-PME' : activeFilter} trouvé`"
    >
      <template #action>
        <BaseButton variant="outline" @click="activeFilter = 'all'">Voir tous les comptes</BaseButton>
      </template>
    </BaseEmptyState>

    <!-- ── Create Account Modal ─────────────────────────── -->
    <BaseModal :open="showAccountModal" title="Nouveau compte bourse" @close="showAccountModal = false">
      <form @submit.prevent="handleCreateAccount" class="space-y-4">
        <BaseSelect
          v-model="accountForm.account_type"
          label="Type de compte"
          :options="availableAccountTypes"
          required
        />

        <BaseInput
          v-model="accountForm.name"
          label="Nom du compte"
          :placeholder="accountForm.account_type === 'PEA' ? 'Ex: PEA Boursorama' : 'Ex: CTO Degiro'"
          required
        />
        <BaseInput v-model="accountForm.bank_name!" label="Courtier / Banque" placeholder="Ex: Boursorama, Degiro..." />
      </form>
      <template #footer>
        <BaseButton variant="ghost" @click="showAccountModal = false">Annuler</BaseButton>
        <BaseButton :loading="stocks.isLoading" @click="handleCreateAccount">Créer</BaseButton>
      </template>
    </BaseModal>

    <!-- ── Create Transaction Modal ─────────────────────── -->
    <BaseModal :open="showTxModal" title="Nouvelle transaction" @close="showTxModal = false">
      <form @submit.prevent="handleCreateTransaction" class="space-y-4">
        <BaseInput v-model="txForm.ticker" label="Ticker" placeholder="Ex: AAPL, MSFT, CW8.PA" required />
        <BaseInput v-model="txForm.exchange!" label="Place de marché" placeholder="Ex: XPAR, NASDAQ" />
        <BaseSelect v-model="txForm.type" label="Type de transaction" :options="txTypeOptions" required />
        <div class="grid grid-cols-2 gap-4">
          <BaseInput v-model="txForm.amount" label="Quantité" type="number" required />
          <BaseInput v-model="txForm.price_per_unit" label="Prix unitaire (€)" type="number" required />
        </div>
        <BaseInput v-model="txForm.fees!" label="Frais (€)" type="number" placeholder="0.00" />
        <BaseInput v-model="txForm.executed_at" label="Date d'exécution" type="datetime-local" required />
      </form>
      <template #footer>
        <BaseButton variant="ghost" @click="showTxModal = false">Annuler</BaseButton>
        <BaseButton :loading="stocks.isLoading" @click="handleCreateTransaction">Valider</BaseButton>
      </template>
    </BaseModal>

    <!-- ── Delete Confirmation Modal ────────────────────── -->
    <BaseModal :open="showDeleteModal" title="Confirmer la suppression" size="sm" @close="showDeleteModal = false">
      <p class="text-sm text-text-body dark:text-text-dark-body">
        Supprimer le compte <strong class="text-text-main dark:text-text-dark-main">{{ deleteTarget?.label }}</strong> et toutes ses transactions ? Cette action est irréversible.
      </p>
      <template #footer>
        <BaseButton variant="ghost" @click="showDeleteModal = false">Annuler</BaseButton>
        <BaseButton variant="danger" :loading="stocks.isLoading" @click="handleDelete">Supprimer</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
