<script setup lang="ts">
import { onMounted, ref, reactive, computed } from 'vue'
import { useStocksStore } from '@/stores/stocks'
import { useFormatters } from '@/composables/useFormatters'
import PageHeader from '@/components/PageHeader.vue'
import {
  BaseCard, BaseButton, BaseInput, BaseSelect, BaseModal,
  BaseSpinner, BaseAlert, BaseEmptyState, BaseBadge, BaseStatCard,
} from '@/components'
import type { StockAccountCreate, StockTransactionCreate, StockAccountType, TransactionResponse } from '@/types'

const stocks = useStocksStore()
const { formatCurrency, formatPercent, formatNumber, formatDate, profitLossClass } = useFormatters()

// ── State ────────────────────────────────────────────────────
const showAccountModal = ref(false)
const showTxModal = ref(false)
const showDeleteModal = ref(false)
const deleteTarget = ref<{ type: 'account' | 'transaction'; id: string; label: string } | null>(null)
const selectedAccountId = ref<string | null>(null)
const activeFilter = ref<'all' | 'PEA' | 'CTO' | 'PEA_PME'>('all')
const accountTransactions = ref<TransactionResponse[]>([])
const activeDetailTab = ref<'positions' | 'history'>('positions')
const editingTxId = ref<string | null>(null)
const editingAccountId = ref<string | null>(null)

const accountForm = reactive<StockAccountCreate>({
  name: '',
  account_type: 'CTO' as StockAccountType,
  institution_name: '',
})

const txForm = reactive<StockTransactionCreate>({
  account_id: '',
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

/** Check if user already has a PEA-PME account */
const hasPeaPme = computed(() =>
  stocks.accounts.some((a) => a.account_type === 'PEA_PME'),
)

/** Available account types for creation */
const availableAccountTypes = computed(() => [
  { label: 'Compte-Titres (CTO)', value: 'CTO' },
  { label: 'PEA', value: 'PEA', disabled: hasPea.value },
  { label: 'PEA-PME', value: 'PEA_PME', disabled: hasPeaPme.value },
])

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
  editingAccountId.value = null
  accountForm.name = ''
  // Default to CTO, or PEA if no PEA exists yet
  accountForm.account_type = hasPea.value ? 'CTO' : 'PEA'
  accountForm.institution_name = ''
  showAccountModal.value = true
}

function openEditAccount(account: any): void {
  editingAccountId.value = account.id
  accountForm.name = account.name
  accountForm.account_type = account.account_type
  accountForm.institution_name = account.institution_name || ''
  showAccountModal.value = true
}

async function handleSubmitAccount(): Promise<void> {
  if (editingAccountId.value) {
    await stocks.updateAccount(editingAccountId.value, { ...accountForm })
  } else {
    await stocks.createAccount({ ...accountForm })
  }
  showAccountModal.value = false
}

function openAddTransaction(accountId: string): void {
  editingTxId.value = null
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

function openEditTransaction(tx: any): void {
  editingTxId.value = tx.id
  txForm.account_id = selectedAccountId.value!
  txForm.ticker = tx.ticker
  txForm.exchange = tx.exchange
  txForm.type = tx.type
  txForm.amount = tx.amount
  txForm.price_per_unit = tx.price_per_unit
  txForm.fees = tx.fees
  txForm.executed_at = tx.executed_at.slice(0, 16)
  showTxModal.value = true
}

async function handleSubmitTransaction(): Promise<void> {
  if (editingTxId.value) {
    await stocks.updateTransaction(editingTxId.value, { ...txForm })
  } else {
    await stocks.createTransaction({ ...txForm })
  }
  showTxModal.value = false
  if (selectedAccountId.value) {
    await Promise.all([
      stocks.fetchAccount(selectedAccountId.value),
      fetchAccountTransactions(selectedAccountId.value)
    ])
  }
}

async function deleteTransaction(id: string): Promise<void> {
  if (confirm('Supprimer cette transaction ?')) {
    await stocks.deleteTransaction(id)
    showTxModal.value = false
    if (selectedAccountId.value) {
      await Promise.all([
        stocks.fetchAccount(selectedAccountId.value),
        fetchAccountTransactions(selectedAccountId.value)
      ])
    }
  }
}

async function fetchAccountTransactions(id: string): Promise<void> {
  accountTransactions.value = await stocks.fetchAccountTransactions(id)
}

async function selectAccount(id: string): Promise<void> {
  if (selectedAccountId.value === id) {
    // Toggle: deselect
    selectedAccountId.value = null
    stocks.currentAccount = null
    return
  }
  selectedAccountId.value = id
  activeDetailTab.value = 'positions'
  await Promise.all([
    stocks.fetchAccount(id),
    fetchAccountTransactions(id)
  ])
}

function confirmDeleteAccount(account: { id: string; name: string }): void {
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
    // Legacy delete path via confirmation modal, if used
    await stocks.deleteTransaction(deleteTarget.value.id)
    if (selectedAccountId.value) {
      await Promise.all([
        stocks.fetchAccount(selectedAccountId.value),
        fetchAccountTransactions(selectedAccountId.value)
      ])
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

    <!-- ── Filter tabs ──────────────────────────────────── -->
    <div v-if="stocks.accounts.length" class="mb-6 border-b border-surface-border dark:border-surface-dark-border">
      <div class="flex gap-6">
        <button
          v-for="tab in [
            { key: 'all' as const, label: 'Tous' },
            { key: 'PEA' as const, label: 'PEA' },
            { key: 'CTO' as const, label: 'CTO' },
            { key: 'PEA_PME' as const, label: 'PEA-PME' },
          ]"
          :key="tab.key"
          @click="activeFilter = tab.key"
          :class="[
            'pb-3 text-sm font-medium transition-all duration-150 border-b-2',
            activeFilter === tab.key
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted dark:text-text-dark-muted hover:text-text-main dark:hover:text-text-dark-main hover:border-surface-border dark:hover:border-surface-dark-border',
          ]"
        >
          {{ tab.label }}
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
              <span v-if="account.institution_name" class="text-xs text-text-muted dark:text-text-dark-muted">{{ account.institution_name }}</span>
              <span class="text-xs text-text-muted dark:text-text-dark-muted">Créé le {{ formatDate(account.created_at) }}</span>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0 ml-2 sm:ml-4">
            <BaseButton size="sm" variant="outline" @click.stop="openAddTransaction(account.id)">
              <span class="sm:hidden text-lg leading-none">+</span>
              <span class="hidden sm:inline">+ Transaction</span>
            </BaseButton>
            <BaseButton size="sm" variant="ghost" @click.stop="openEditAccount(account)">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
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

          <!-- Tabs -->
          <div class="mb-6">
            <div class="inline-flex bg-background-subtle dark:bg-background-dark-subtle rounded-lg p-1">
              <button
                v-for="tab in [{ key: 'positions', label: 'Positions' }, { key: 'history', label: 'Historique' }]"
                :key="tab.key"
                @click="activeDetailTab = tab.key as any"
                :class="[
                  'px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200',
                  activeDetailTab === tab.key
                    ? 'bg-surface dark:bg-surface-dark text-text-main dark:text-text-dark-main shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                    : 'text-text-muted dark:text-text-dark-muted hover:text-text-main dark:hover:text-text-dark-main',
                ]"
              >
                {{ tab.label }}
              </button>
            </div>
          </div>

          <!-- Positions table -->
          <div v-if="activeDetailTab === 'positions'">
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

          <!-- History Tab -->
          <div v-else>
            <div v-if="accountTransactions.length" class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-xs text-text-muted dark:text-text-dark-muted uppercase tracking-wider border-b border-surface-border dark:border-surface-dark-border">
                    <th class="px-4 py-2">Date</th>
                    <th class="px-4 py-2">Type</th>
                    <th class="px-4 py-2">Ticker</th>
                    <th class="px-4 py-2 text-right">Quantité</th>
                    <th class="px-4 py-2 text-right">Prix</th>
                    <th class="px-4 py-2 text-right">Total</th>
                    <th class="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-surface-border dark:divide-surface-dark-border">
                  <tr v-for="tx in accountTransactions" :key="tx.id" class="hover:bg-surface-hover dark:hover:bg-surface-dark-hover transition-colors">
                    <td class="px-4 py-2.5 text-text-muted dark:text-text-dark-muted">{{ new Date(tx.executed_at).toLocaleDateString() }}</td>
                    <td class="px-4 py-2.5">
                      <BaseBadge :variant="tx.type === 'BUY' || tx.type === 'DEPOSIT' ? 'success' : tx.type === 'SELL' ? 'danger' : 'info'">
                        {{ tx.type }}
                      </BaseBadge>
                    </td>
                    <td class="px-4 py-2.5 font-medium text-text-main dark:text-text-dark-main">{{ tx.ticker }}</td>
                    <td class="px-4 py-2.5 text-right font-mono">{{ formatNumber(tx.amount, 4) }}</td>
                    <td class="px-4 py-2.5 text-right">{{ formatCurrency(tx.price_per_unit) }}</td>
                    <td class="px-4 py-2.5 text-right font-medium">{{ formatCurrency(tx.amount * tx.price_per_unit) }}</td>
                                    <td class="px-4 py-2.5 text-right">
                                      <BaseButton size="sm" variant="ghost" @click="openEditTransaction(tx)">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </BaseButton>
                                    </td>
                    
                  </tr>
                </tbody>
              </table>
            </div>
            <BaseEmptyState v-else title="Aucune transaction" description="L'historique des transactions est vide" />
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
    <BaseModal :open="showAccountModal" :title="editingAccountId ? 'Modifier le compte' : 'Nouveau compte bourse'" @close="showAccountModal = false">
      <form @submit.prevent="handleSubmitAccount" class="space-y-4">
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
        <BaseInput v-model="accountForm.institution_name!" label="Courtier / Banque" placeholder="Ex: Boursorama, Degiro..." />
      </form>
      <template #footer>
        <div class="flex justify-between w-full">
          <BaseButton v-if="editingAccountId" variant="danger" @click="confirmDeleteAccount({ id: editingAccountId, name: accountForm.name })">
            Supprimer
          </BaseButton>
          <div v-else></div> <!-- Spacer -->
          <div class="flex gap-2">
            <BaseButton variant="ghost" @click="showAccountModal = false">Annuler</BaseButton>
            <BaseButton :loading="stocks.isLoading" @click="handleSubmitAccount">
              {{ editingAccountId ? 'Enregistrer' : 'Créer' }}
            </BaseButton>
          </div>
        </div>
      </template>
    </BaseModal>

    <!-- ── Create/Edit Transaction Modal ─────────────────────── -->
    <BaseModal :open="showTxModal" :title="editingTxId ? 'Modifier la transaction' : 'Nouvelle transaction'" @close="showTxModal = false">
      <form @submit.prevent="handleSubmitTransaction" class="space-y-4">
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
        <div class="flex justify-between w-full">
          <BaseButton v-if="editingTxId" variant="danger" @click="deleteTransaction(editingTxId)">
            Supprimer
          </BaseButton>
          <div v-else></div> <!-- Spacer -->
          <div class="flex gap-2">
            <BaseButton variant="ghost" @click="showTxModal = false">Annuler</BaseButton>
            <BaseButton :loading="stocks.isLoading" @click="handleSubmitTransaction">
              {{ editingTxId ? 'Enregistrer' : 'Valider' }}
            </BaseButton>
          </div>
        </div>
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