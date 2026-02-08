<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue'
import { useCryptoStore } from '@/stores/crypto'
import { useFormatters } from '@/composables/useFormatters'
import PageHeader from '@/components/PageHeader.vue'
import {
  BaseCard, BaseButton, BaseInput, BaseSelect, BaseModal,
  BaseSpinner, BaseAlert, BaseEmptyState, BaseBadge,
} from '@/components'
import type { CryptoAccountCreate, CryptoTransactionCreate, TransactionResponse } from '@/types'

const crypto = useCryptoStore()
const { formatCurrency, formatPercent, formatNumber, profitLossClass } = useFormatters()

const showAccountModal = ref(false)
const showTxModal = ref(false)
const selectedAccountId = ref<number | null>(null)
const accountTransactions = ref<TransactionResponse[]>([])
const activeDetailTab = ref<'positions' | 'history'>('positions')
const editingTxId = ref<number | null>(null)
const editingAccountId = ref<number | null>(null)

const accountForm = reactive<CryptoAccountCreate>({
  name: '',
  platform: '',
  public_address: '',
})

const txForm = reactive<CryptoTransactionCreate>({
  account_id: 0,
  ticker: '',
  type: 'BUY',
  amount: 0,
  price_per_unit: 0,
  fees: 0,
  fees_ticker: 'EUR',
  executed_at: new Date().toISOString().slice(0, 16),
})

const txTypeOptions = [
  { label: 'Achat', value: 'BUY' },
  { label: 'Vente', value: 'SELL' },
  { label: 'Swap', value: 'SWAP' },
  { label: 'Staking', value: 'STAKING' },
]

function openCreateAccount(): void {
  editingAccountId.value = null
  accountForm.name = ''
  accountForm.platform = ''
  accountForm.public_address = ''
  showAccountModal.value = true
}

function openEditAccount(account: any): void {
  editingAccountId.value = account.id
  accountForm.name = account.name
  accountForm.platform = account.platform || ''
  accountForm.public_address = account.public_address || ''
  showAccountModal.value = true
}

async function handleSubmitAccount(): Promise<void> {
  if (editingAccountId.value) {
    await crypto.updateAccount(editingAccountId.value, { ...accountForm })
  } else {
    await crypto.createAccount({ ...accountForm })
  }
  showAccountModal.value = false
}

function openAddTransaction(accountId: number): void {
  editingTxId.value = null
  txForm.account_id = accountId
  txForm.ticker = ''
  txForm.type = 'BUY'
  txForm.amount = 0
  txForm.price_per_unit = 0
  txForm.fees = 0
  txForm.fees_ticker = 'EUR'
  txForm.executed_at = new Date().toISOString().slice(0, 16)
  showTxModal.value = true
}

function openEditTransaction(tx: any): void {
  editingTxId.value = tx.id
  txForm.account_id = tx.account_id || selectedAccountId.value!
  txForm.ticker = tx.ticker
  txForm.type = tx.type
  txForm.amount = tx.amount
  txForm.price_per_unit = tx.price_per_unit
  txForm.fees = tx.fees
  txForm.fees_ticker = tx.fees_ticker || 'EUR'
  txForm.executed_at = tx.executed_at.slice(0, 16)
  showTxModal.value = true
}

async function handleSubmitTransaction(): Promise<void> {
  if (editingTxId.value) {
    await crypto.updateTransaction(editingTxId.value, { ...txForm })
  } else {
    await crypto.createTransaction({ ...txForm })
  }
  showTxModal.value = false
  if (selectedAccountId.value) {
    await Promise.all([
      crypto.fetchAccount(selectedAccountId.value),
      fetchAccountTransactions(selectedAccountId.value)
    ])
  }
}

async function deleteTransaction(id: number): Promise<void> {
  if (confirm('Supprimer cette transaction ?')) {
    await crypto.deleteTransaction(id)
    showTxModal.value = false
    if (selectedAccountId.value) {
      await Promise.all([
        crypto.fetchAccount(selectedAccountId.value),
        fetchAccountTransactions(selectedAccountId.value)
      ])
    }
  }
}

async function fetchAccountTransactions(id: number): Promise<void> {
  accountTransactions.value = await crypto.fetchAccountTransactions(id)
}

async function selectAccount(id: number): Promise<void> {
  selectedAccountId.value = id
  activeDetailTab.value = 'positions'
  await Promise.all([
    crypto.fetchAccount(id),
    fetchAccountTransactions(id)
  ])
}

async function handleDeleteAccount(id: number): Promise<void> {
  if (confirm('Supprimer ce portefeuille crypto et toutes ses transactions ?')) {
    await crypto.deleteAccount(id)
    if (selectedAccountId.value === id) {
      selectedAccountId.value = null
      crypto.currentAccount = null
    }
    showAccountModal.value = false
  }
}

onMounted(() => {
  crypto.fetchAccounts()
})
</script>

<template>
  <div>
    <PageHeader title="Crypto" description="Portefeuilles et transactions crypto-monnaies">
      <template #actions>
        <BaseButton @click="openCreateAccount">+ Nouveau portefeuille</BaseButton>
      </template>
    </PageHeader>

    <div v-if="crypto.isLoading && !crypto.accounts.length" class="flex justify-center py-20">
      <BaseSpinner size="lg" label="Chargement..." />
    </div>

    <BaseAlert v-if="crypto.error" variant="danger" dismissible @dismiss="crypto.error = null" class="mb-6">
      {{ crypto.error }}
    </BaseAlert>

    <!-- Account list -->
    <div v-if="crypto.accounts.length" class="space-y-4">
      <BaseCard
        v-for="account in crypto.accounts"
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
              <span v-if="account.platform" class="px-2 py-0.5 rounded text-xs font-medium bg-surface-active dark:bg-surface-dark-active text-text-muted dark:text-text-dark-muted">
                {{ account.platform }}
              </span>
            </div>
            <div class="flex items-center gap-3 mt-1">
              <span v-if="account.public_address" class="text-xs text-text-muted dark:text-text-dark-muted font-mono truncate max-w-[200px]">{{ account.public_address }}</span>
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

        <!-- Inline Detail -->
        <div
          v-if="selectedAccountId === account.id && crypto.currentAccount"
          class="mt-6 pt-6 border-t border-surface-border dark:border-surface-dark-border"
        >
          <!-- Summary Stats -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div>
              <p class="text-xs text-text-muted dark:text-text-dark-muted">Investi</p>
              <p class="text-lg font-bold text-text-main dark:text-text-dark-main">{{ formatCurrency(crypto.currentAccount.total_invested) }}</p>
            </div>
            <div>
              <p class="text-xs text-text-muted dark:text-text-dark-muted">P/L</p>
              <p :class="['text-lg font-bold', profitLossClass(crypto.currentAccount.profit_loss)]">
                {{ formatCurrency(crypto.currentAccount.profit_loss) }}
              </p>
            </div>
            <div>
              <p class="text-xs text-text-muted dark:text-text-dark-muted">Performance</p>
              <p :class="['text-lg font-bold', profitLossClass(crypto.currentAccount.profit_loss_percentage)]">
                {{ formatPercent(crypto.currentAccount.profit_loss_percentage) }}
              </p>
            </div>
          </div>

          <!-- Tabs (Segmented Control) -->
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

          <!-- Positions Tab -->
          <div v-if="activeDetailTab === 'positions'">
            <div v-if="crypto.currentAccount.positions?.length" class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-xs text-text-muted dark:text-text-dark-muted uppercase tracking-wider border-b border-surface-border dark:border-surface-dark-border">
                    <th class="px-4 py-2">Token</th>
                    <th class="px-4 py-2 text-right">Quantité</th>
                    <th class="px-4 py-2 text-right">PRU</th>
                    <th class="px-4 py-2 text-right">Investi</th>
                    <th class="px-4 py-2 text-right">Cours</th>
                    <th class="px-4 py-2 text-right">Valeur</th>
                    <th class="px-4 py-2 text-right">P/L</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-surface-border dark:divide-surface-dark-border">
                  <tr v-for="pos in crypto.currentAccount.positions" :key="pos.ticker" class="hover:bg-surface-hover dark:hover:bg-surface-dark-hover transition-colors">
                    <td class="px-4 py-2.5 font-medium text-text-main dark:text-text-dark-main">{{ pos.ticker }}</td>
                    <td class="px-4 py-2.5 text-right font-mono text-text-body dark:text-text-dark-body">{{ formatNumber(pos.total_amount, 6) }}</td>
                    <td class="px-4 py-2.5 text-right">{{ formatCurrency(pos.average_buy_price) }}</td>
                    <td class="px-4 py-2.5 text-right">{{ formatCurrency(pos.total_invested) }}</td>
                    <td class="px-4 py-2.5 text-right">{{ formatCurrency(pos.current_price) }}</td>
                    <td class="px-4 py-2.5 text-right font-medium">{{ formatCurrency(pos.current_value) }}</td>
                    <td class="px-4 py-2.5 text-right">
                      <span :class="['font-medium', profitLossClass(pos.profit_loss)]">{{ formatPercent(pos.profit_loss_percentage) }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <BaseEmptyState v-else title="Aucune position" description="Ajoutez des transactions pour voir vos positions crypto" />
          </div>

          <!-- History Tab -->
          <div v-else>
            <div v-if="accountTransactions.length" class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-xs text-text-muted dark:text-text-dark-muted uppercase tracking-wider border-b border-surface-border dark:border-surface-dark-border">
                    <th class="px-4 py-2">Date</th>
                    <th class="px-4 py-2">Type</th>
                    <th class="px-4 py-2">Token</th>
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
                      <BaseBadge :variant="tx.type === 'BUY' ? 'success' : tx.type === 'SELL' ? 'danger' : 'warning'">
                        {{ tx.type }}
                      </BaseBadge>
                    </td>
                    <td class="px-4 py-2.5 font-medium text-text-main dark:text-text-dark-main">{{ tx.ticker }}</td>
                    <td class="px-4 py-2.5 text-right font-mono">{{ formatNumber(tx.amount, 6) }}</td>
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
      </BaseCard>
    </div>

    <BaseEmptyState
      v-else-if="!crypto.isLoading"
      title="Aucun portefeuille crypto"
      description="Ajoutez votre premier portefeuille pour suivre vos crypto-monnaies"
      action-label="Ajouter un portefeuille"
      @action="openCreateAccount"
    />

    <!-- Create/Edit Account Modal -->
    <BaseModal :open="showAccountModal" :title="editingAccountId ? 'Modifier le portefeuille' : 'Nouveau portefeuille crypto'" @close="showAccountModal = false">
      <form @submit.prevent="handleSubmitAccount" class="space-y-4">
        <BaseInput v-model="accountForm.name" label="Nom" placeholder="Ex: Binance" required />
        <BaseInput v-model="accountForm.platform!" label="Nom du wallet" placeholder="Ex: Cold Storage" />
        <BaseInput v-model="accountForm.public_address!" label="Adresse publique" placeholder="Ex: bc1q..." />
      </form>
      <template #footer>
        <div class="flex justify-between w-full">
          <BaseButton v-if="editingAccountId" variant="danger" @click="handleDeleteAccount(editingAccountId)">
            Supprimer
          </BaseButton>
          <div v-else></div> <!-- Spacer -->
          <div class="flex gap-2">
            <BaseButton variant="ghost" @click="showAccountModal = false">Annuler</BaseButton>
            <BaseButton :loading="crypto.isLoading" @click="handleSubmitAccount">
              {{ editingAccountId ? 'Enregistrer' : 'Créer' }}
            </BaseButton>
          </div>
        </div>
      </template>
    </BaseModal>

    <!-- Create/Edit Transaction Modal -->
    <BaseModal :open="showTxModal" :title="editingTxId ? 'Modifier la transaction' : 'Nouvelle transaction crypto'" @close="showTxModal = false">
      <form @submit.prevent="handleSubmitTransaction" class="space-y-4">
        <BaseInput v-model="txForm.ticker" label="Token" placeholder="Ex: BTC, ETH" required />
        <BaseSelect v-model="txForm.type" label="Type" :options="txTypeOptions" required />
        <div class="grid grid-cols-2 gap-4">
          <BaseInput v-model="txForm.amount" label="Quantité" type="number" required />
          <BaseInput v-model="txForm.price_per_unit" label="Prix unitaire (€)" type="number" required />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <BaseInput v-model="txForm.fees!" label="Frais" type="number" />
          <BaseInput v-model="txForm.fees_ticker!" label="Devise frais" placeholder="EUR" />
        </div>
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
            <BaseButton :loading="crypto.isLoading" @click="handleSubmitTransaction">
              {{ editingTxId ? 'Enregistrer' : 'Valider' }}
            </BaseButton>
          </div>
        </div>
      </template>
    </BaseModal>
  </div>
</template>
