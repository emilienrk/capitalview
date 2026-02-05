<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue'
import { useCryptoStore } from '@/stores/crypto'
import { useFormatters } from '@/composables/useFormatters'
import PageHeader from '@/components/PageHeader.vue'
import {
  BaseCard, BaseButton, BaseInput, BaseSelect, BaseModal,
  BaseSpinner, BaseAlert, BaseEmptyState, BaseBadge,
} from '@/components'
import type { CryptoAccountCreate, CryptoTransactionCreate } from '@/types'

const crypto = useCryptoStore()
const { formatCurrency, formatPercent, formatNumber, profitLossClass } = useFormatters()

const showAccountModal = ref(false)
const showTxModal = ref(false)
const selectedAccountId = ref<number | null>(null)

const accountForm = reactive<CryptoAccountCreate>({
  name: '',
  wallet_name: '',
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
  accountForm.name = ''
  accountForm.wallet_name = ''
  accountForm.public_address = ''
  showAccountModal.value = true
}

async function handleCreateAccount(): Promise<void> {
  await crypto.createAccount({ ...accountForm })
  showAccountModal.value = false
}

function openAddTransaction(accountId: number): void {
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

async function handleCreateTransaction(): Promise<void> {
  const tx = await crypto.createTransaction({ ...txForm })
  if (tx) {
    showTxModal.value = false
    if (selectedAccountId.value) {
      await crypto.fetchAccount(selectedAccountId.value)
    }
  }
}

async function selectAccount(id: number): Promise<void> {
  selectedAccountId.value = id
  await crypto.fetchAccount(id)
}

async function handleDeleteAccount(id: number): Promise<void> {
  if (confirm('Supprimer ce portefeuille crypto et toutes ses transactions ?')) {
    await crypto.deleteAccount(id)
    if (selectedAccountId.value === id) {
      selectedAccountId.value = null
      crypto.currentAccount = null
    }
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
    <div v-if="crypto.accounts.length" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <BaseCard
        v-for="account in crypto.accounts"
        :key="account.id"
        hoverable
        @click="selectAccount(account.id)"
      >
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-semibold text-text-main dark:text-text-dark-main">{{ account.name }}</h3>
            <p class="text-xs text-text-muted dark:text-text-dark-muted mt-1">
              <span v-if="account.wallet_name">{{ account.wallet_name }}</span>
            </p>
          </div>
          <div class="flex gap-2">
            <BaseButton size="sm" variant="outline" @click.stop="openAddTransaction(account.id)">+ Tx</BaseButton>
            <BaseButton size="sm" variant="ghost" @click.stop="handleDeleteAccount(account.id)">
              <span class="text-danger text-xs">Suppr.</span>
            </BaseButton>
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

    <!-- Account detail with positions -->
    <BaseCard v-if="crypto.currentAccount && selectedAccountId" class="mt-6">
      <template #header>
        <div class="flex items-center justify-between w-full">
          <div>
            <h3 class="text-lg font-semibold text-text-main dark:text-text-dark-main">{{ crypto.currentAccount.account_name }}</h3>
            <div class="flex gap-4 mt-1 text-sm">
              <span class="text-text-muted dark:text-text-dark-muted">Investi: {{ formatCurrency(crypto.currentAccount.total_invested) }}</span>
              <span :class="profitLossClass(crypto.currentAccount.profit_loss)">
                P/L: {{ formatCurrency(crypto.currentAccount.profit_loss) }} ({{ formatPercent(crypto.currentAccount.profit_loss_percentage) }})
              </span>
            </div>
          </div>
        </div>
      </template>

      <div v-if="crypto.currentAccount.positions?.length" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-xs text-text-muted dark:text-text-dark-muted uppercase tracking-wider">
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
    </BaseCard>

    <!-- Create Account Modal -->
    <BaseModal :open="showAccountModal" title="Nouveau portefeuille crypto" @close="showAccountModal = false">
      <form @submit.prevent="handleCreateAccount" class="space-y-4">
        <BaseInput v-model="accountForm.name" label="Nom" placeholder="Ex: Binance" required />
        <BaseInput v-model="accountForm.wallet_name!" label="Nom du wallet" placeholder="Ex: Cold Storage" />
        <BaseInput v-model="accountForm.public_address!" label="Adresse publique" placeholder="Ex: bc1q..." />
      </form>
      <template #footer>
        <BaseButton variant="ghost" @click="showAccountModal = false">Annuler</BaseButton>
        <BaseButton :loading="crypto.isLoading" @click="handleCreateAccount">Créer</BaseButton>
      </template>
    </BaseModal>

    <!-- Create Transaction Modal -->
    <BaseModal :open="showTxModal" title="Nouvelle transaction crypto" @close="showTxModal = false">
      <form @submit.prevent="handleCreateTransaction" class="space-y-4">
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
        <BaseButton variant="ghost" @click="showTxModal = false">Annuler</BaseButton>
        <BaseButton :loading="crypto.isLoading" @click="handleCreateTransaction">Valider</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
