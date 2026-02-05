<script setup lang="ts">
import { onMounted, ref, reactive, computed } from 'vue'
import { useStocksStore } from '@/stores/stocks'
import { useFormatters } from '@/composables/useFormatters'
import PageHeader from '@/components/PageHeader.vue'
import {
  BaseCard, BaseButton, BaseInput, BaseSelect, BaseModal,
  BaseSpinner, BaseAlert, BaseEmptyState, BaseBadge,
} from '@/components'
import type { StockAccountCreate, StockTransactionCreate } from '@/types'

const stocks = useStocksStore()
const { formatCurrency, formatPercent, formatNumber, profitLossClass } = useFormatters()

const showAccountModal = ref(false)
const showTxModal = ref(false)
const selectedAccountId = ref<number | null>(null)

const accountForm = reactive<StockAccountCreate>({
  name: '',
  account_type: 'CTO',
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

const accountTypeOptions = [
  { label: 'Compte-Titres Ordinaire', value: 'CTO' },
  { label: 'PEA-PME', value: 'PEA_PME' },
]

const txTypeOptions = [
  { label: 'Achat', value: 'BUY' },
  { label: 'Vente', value: 'SELL' },
  { label: 'Dépôt', value: 'DEPOSIT' },
  { label: 'Dividende', value: 'DIVIDEND' },
]

/** Filter CTO and PEA_PME accounts */
const ctoAccounts = computed(() =>
  stocks.accounts.filter((a) => a.account_type === 'CTO' || a.account_type === 'PEA_PME')
)

function openCreateAccount(): void {
  accountForm.name = ''
  accountForm.account_type = 'CTO'
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
  selectedAccountId.value = id
  await stocks.fetchAccount(id)
}

onMounted(() => {
  stocks.fetchAccounts()
})
</script>

<template>
  <div>
    <PageHeader title="Compte-Titres" description="CTO et PEA-PME">
      <template #actions>
        <BaseButton @click="openCreateAccount">+ Nouveau compte</BaseButton>
      </template>
    </PageHeader>

    <div v-if="stocks.isLoading && !stocks.accounts.length" class="flex justify-center py-20">
      <BaseSpinner size="lg" label="Chargement..." />
    </div>

    <BaseAlert v-if="stocks.error" variant="danger" dismissible @dismiss="stocks.error = null" class="mb-6">
      {{ stocks.error }}
    </BaseAlert>

    <!-- Account list -->
    <div v-if="ctoAccounts.length" class="space-y-4">
      <BaseCard
        v-for="account in ctoAccounts"
        :key="account.id"
        hoverable
        @click="selectAccount(account.id)"
      >
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-semibold text-text-main dark:text-text-dark-main">{{ account.name }}</h3>
            <p class="text-xs mt-1">
              <BaseBadge :variant="account.account_type === 'CTO' ? 'info' : 'primary'">{{ account.account_type }}</BaseBadge>
              <span v-if="account.bank_name" class="ml-2 text-text-muted dark:text-text-dark-muted">{{ account.bank_name }}</span>
            </p>
          </div>
          <BaseButton size="sm" variant="outline" @click.stop="openAddTransaction(account.id)">
            + Transaction
          </BaseButton>
        </div>
      </BaseCard>
    </div>

    <BaseEmptyState
      v-else-if="!stocks.isLoading"
      title="Aucun compte-titres"
      description="Créez un CTO ou PEA-PME pour suivre vos investissements"
      action-label="Créer un compte"
      @action="openCreateAccount"
    />

    <!-- Account detail -->
    <BaseCard v-if="stocks.currentAccount && selectedAccountId" title="Positions" class="mt-6">
      <template #header>
        <div class="flex items-center justify-between w-full">
          <div>
            <h3 class="text-lg font-semibold text-text-main dark:text-text-dark-main">{{ stocks.currentAccount.account_name }}</h3>
            <div class="flex gap-4 mt-1 text-sm">
              <span class="text-text-muted dark:text-text-dark-muted">Investi: {{ formatCurrency(stocks.currentAccount.total_invested) }}</span>
              <span :class="profitLossClass(stocks.currentAccount.profit_loss)">P/L: {{ formatCurrency(stocks.currentAccount.profit_loss) }} ({{ formatPercent(stocks.currentAccount.profit_loss_percentage) }})</span>
            </div>
          </div>
        </div>
      </template>

      <div v-if="stocks.currentAccount.positions?.length" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-text-muted dark:text-text-dark-muted uppercase tracking-wider">
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
            <tr v-for="pos in stocks.currentAccount.positions" :key="pos.ticker" class="hover:bg-surface-hover dark:hover:bg-surface-dark-hover transition-colors">
              <td class="px-4 py-2.5 font-medium text-text-main dark:text-text-dark-main">{{ pos.ticker }}</td>
              <td class="px-4 py-2.5 text-right">{{ formatNumber(pos.total_amount, 4) }}</td>
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
      <BaseEmptyState v-else title="Aucune position" description="Ajoutez des transactions pour voir vos positions" />
    </BaseCard>

    <!-- Create Account Modal -->
    <BaseModal :open="showAccountModal" title="Nouveau compte-titres" @close="showAccountModal = false">
      <form @submit.prevent="handleCreateAccount" class="space-y-4">
        <BaseInput v-model="accountForm.name" label="Nom du compte" placeholder="Ex: CTO Degiro" required />
        <BaseSelect v-model="accountForm.account_type" label="Type" :options="accountTypeOptions" required />
        <BaseInput v-model="accountForm.bank_name!" label="Courtier / Banque" placeholder="Ex: Degiro" />
      </form>
      <template #footer>
        <BaseButton variant="ghost" @click="showAccountModal = false">Annuler</BaseButton>
        <BaseButton :loading="stocks.isLoading" @click="handleCreateAccount">Créer</BaseButton>
      </template>
    </BaseModal>

    <!-- Create Transaction Modal -->
    <BaseModal :open="showTxModal" title="Nouvelle transaction" @close="showTxModal = false">
      <form @submit.prevent="handleCreateTransaction" class="space-y-4">
        <BaseInput v-model="txForm.ticker" label="Ticker" placeholder="Ex: AAPL" required />
        <BaseInput v-model="txForm.exchange!" label="Place" placeholder="Ex: NASDAQ" />
        <BaseSelect v-model="txForm.type" label="Type" :options="txTypeOptions" required />
        <div class="grid grid-cols-2 gap-4">
          <BaseInput v-model="txForm.amount" label="Quantité" type="number" required />
          <BaseInput v-model="txForm.price_per_unit" label="Prix unitaire (€)" type="number" required />
        </div>
        <BaseInput v-model="txForm.fees!" label="Frais (€)" type="number" />
        <BaseInput v-model="txForm.executed_at" label="Date d'exécution" type="datetime-local" required />
      </form>
      <template #footer>
        <BaseButton variant="ghost" @click="showTxModal = false">Annuler</BaseButton>
        <BaseButton :loading="stocks.isLoading" @click="handleCreateTransaction">Valider</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
