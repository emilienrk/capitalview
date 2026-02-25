<script setup lang="ts">
import { onMounted, ref, reactive, computed, watch } from 'vue'
import { useCryptoStore } from '@/stores/crypto'
import { useFormatters } from '@/composables/useFormatters'
import { useCurrencyToggle } from '@/composables/useCurrencyToggle'
import PageHeader from '@/components/PageHeader.vue'
import {
  BaseCard, BaseButton, BaseInput, BaseSelect, BaseModal,
  BaseSpinner, BaseAlert, BaseEmptyState, BaseBadge, BaseAutocomplete,
} from '@/components'
import CsvImportModal from '@/components/CsvImportModal.vue'
import type {
  CryptoAccountCreate,
  CryptoCompositeTransactionCreate,
  CryptoTransactionUpdate,
  TransactionResponse,
  AssetSearchResult,
  CryptoTransactionBulkCreate,
} from '@/types'

const crypto = useCryptoStore()
const { formatCurrency, formatPercent, formatNumber, profitLossClass } = useFormatters()
const { fetchRate } = useCurrencyToggle()

function formatEur(value: number | string | null | undefined): string {
  return formatCurrency(value, 'EUR')
}

type TxFormData = Omit<CryptoCompositeTransactionCreate, 'type'> & {
  type: CryptoCompositeTransactionCreate['type'] | 'BUY_FIAT' | 'BUY_SPOT' | 'FIAT_DEPOSIT' | 'FIAT_WITHDRAW'
}

const showAccountModal = ref(false)
const showTxModal = ref(false)
const showCsvImportModal = ref(false)
const csvImportAccountId = ref<string | null>(null)
const selectedAccountId = ref<string | null>(null)
const accountTransactions = ref<TransactionResponse[]>([])
const activeDetailTab = ref<'positions' | 'history'>('positions')
const editingTxId = ref<string | null>(null)
const editingAccountId = ref<string | null>(null)

const searchResults = ref<AssetSearchResult[]>([])
const isSearching = ref(false)
const searchQuery = ref('')

const searchResultsQuote = ref<AssetSearchResult[]>([])
const isSearchingQuote = ref(false)
const searchQueryQuote = ref('')

const accountForm = reactive<CryptoAccountCreate>({
  name: '',
  platform: '',
  public_address: '',
})

const txForm = reactive<TxFormData>({
  account_id: '',
  symbol: '',
  name: '',
  type: 'BUY_FIAT',
  amount: 0,
  price_per_unit: 0,
  quote_symbol: 'EUR',
  quote_amount: undefined,
  quote_price_per_unit: undefined,
  eur_amount: undefined,
  fee_included: true,
  fee_percentage: undefined,
  fee_eur: undefined,
  fee_symbol: undefined,
  fee_amount: undefined,
  executed_at: new Date().toISOString().slice(0, 16),
})

const FIAT_SYMBOLS = new Set(['EUR'])

const quoteMode = ref<'EUR' | 'crypto'>('EUR')

const feeMode = ref<'none' | 'included' | 'separate' | 'token'>('none')

const showQuoteStep = computed(() => txForm.type === 'BUY_FIAT' || txForm.type === 'BUY_SPOT')
const showFeeStep = computed(() => txForm.type === 'BUY_FIAT' || txForm.type === 'BUY_SPOT' || txForm.type === 'CRYPTO_DEPOSIT' || txForm.type === 'NON_TAXABLE_EXIT')

const wizardStep = ref(1)
const WIZARD_STEPS = 3
const wizardVisibleSteps = computed(() => {
  if (txForm.type === 'BUY_FIAT' || txForm.type === 'BUY_SPOT') return 3  // step1 + quote + fee
  if (txForm.type === 'CRYPTO_DEPOSIT' || txForm.type === 'NON_TAXABLE_EXIT') return 2 // step1 + fee (skip quote)
  return 1                                        // single-step types
})
const isLastStep = computed(() =>
  wizardStep.value === 3 || wizardVisibleSteps.value === 1
)

watch(() => txForm.type, (newType) => {
  wizardStep.value = 1
  feeMode.value = 'none'
  if (newType === 'BUY_FIAT') {
    quoteMode.value = 'EUR'
    txForm.quote_symbol = 'EUR'
  } else if (newType === 'BUY_SPOT') {
    quoteMode.value = 'crypto'
    txForm.quote_symbol = ''
    txForm.price_per_unit = 0
  } else if (newType === 'FIAT_DEPOSIT' || newType === 'FIAT_WITHDRAW') {
    txForm.symbol = 'EUR'
    searchQuery.value = ''
    searchResults.value = []
  } else if (txForm.symbol === 'EUR') {
    txForm.symbol = ''
  }
})

const calculatedPricePerUnit = computed((): number | null => {
  if (txForm.type !== 'BUY_FIAT') return null
  const qty = Number(txForm.amount)
  const qAmt = Number(txForm.quote_amount)
  if (!qty || !qAmt) return null
  return qAmt / qty
})

const estimatedFeeEur = computed((): number | null => {
  const baseAmount = Number(txForm.quote_amount || txForm.eur_amount || 0)
  if (!baseAmount) return null
  if (!txForm.fee_included && txForm.fee_eur) {
    return Number(txForm.fee_eur)
  }
  return null
})

// Always resolve fee base in EUR, not in crypto quote amount.
function eurBaseAmount(): number {
  if (txForm.type === 'BUY_FIAT') return Number(txForm.quote_amount || 0)
  return Number(txForm.eur_amount || 0)
}

function onFeePercentageInput(val: string | number): void {
  const num = val !== '' && val != null ? Number(val) : undefined
  txForm.fee_percentage = num != null && num >= 0 ? num : undefined
  if (num && num > 0) {
    const base = eurBaseAmount()
    if (base > 0) {
      txForm.fee_eur = Number((base * num / 100).toFixed(8))
    }
  }
}

const previewPru = computed((): number | null => {
  const qty = Number(txForm.amount)
  if (!qty) return null

  let baseEur = 0
  if (txForm.type === 'BUY_FIAT') {
    baseEur = Number(txForm.quote_amount || 0)
  } else if (txForm.type === 'BUY_SPOT') {
    baseEur = (Number(txForm.price_per_unit) || 0) * qty
  } else {
    // CRYPTO_DEPOSIT
    baseEur = Number(txForm.eur_amount || 0)
  }

  if (!baseEur) return null
  const feeEur = feeMode.value === 'separate' ? Number(txForm.fee_eur || 0) : 0
  return (baseEur + feeEur) / qty
})

function nextWizardStep(): void {
  if (wizardStep.value === 1 && showFeeStep.value && !showQuoteStep.value) {
    wizardStep.value = 3  // CRYPTO_DEPOSIT: skip quote step
  } else if (wizardStep.value < WIZARD_STEPS) {
    wizardStep.value++
  }
}

function prevWizardStep(): void {
  if (wizardStep.value === 3 && !showQuoteStep.value) {
    wizardStep.value = 1  // skip back over quote step
  } else if (wizardStep.value > 1) {
    wizardStep.value--
  }
}

function clearFeeLeg(): void {
  txForm.fee_eur = undefined
  txForm.fee_percentage = undefined
  txForm.fee_included = true
  txForm.fee_symbol = undefined
  txForm.fee_amount = undefined
}

const txTypeOptions = [
  { label: 'Achat Fiat (EUR → Crypto)', value: 'BUY_FIAT' },
  { label: 'Swap (Crypto ↔ Crypto)', value: 'BUY_SPOT' },
  { label: 'Récompense / Staking', value: 'REWARD' },
  { label: 'Dépôt EUR', value: 'FIAT_DEPOSIT' },
  { label: 'Retrait EUR (vers compte bancaire)', value: 'FIAT_WITHDRAW' },
  { label: 'Dépôt Crypto (avec PRU)', value: 'CRYPTO_DEPOSIT' },
  { label: 'Frais on-chain (gaz isolé)', value: 'GAS_FEE' },
  { label: 'Sortie imposable — vente contre EUR', value: 'EXIT' },
  { label: 'Sortie non-imposable — don / envoi hors périmètre (0 €)', value: 'NON_TAXABLE_EXIT' },
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
  let result
  if (editingAccountId.value) {
    result = await crypto.updateAccount(editingAccountId.value, { ...accountForm })
  } else {
    result = await crypto.createAccount({ ...accountForm })
  }
  if (result) {
    showAccountModal.value = false
  }
}

function openAddTransaction(accountId: string): void {
  editingTxId.value = null
  txForm.account_id = accountId
  txForm.symbol = ''
  txForm.name = ''
  txForm.type = 'BUY_FIAT'
  txForm.amount = 0
  txForm.price_per_unit = 0
  txForm.quote_symbol = 'EUR'
  txForm.quote_amount = undefined
  txForm.quote_price_per_unit = undefined
  txForm.eur_amount = undefined
  txForm.fee_included = true
  txForm.fee_percentage = undefined
  txForm.fee_eur = undefined
  txForm.fee_symbol = undefined
  txForm.fee_amount = undefined
  feeMode.value = 'none'
  txForm.executed_at = new Date().toISOString().slice(0, 16)
  txForm.tx_hash = undefined
  txForm.notes = undefined
  searchQuery.value = ''
  searchResults.value = []
  searchQueryQuote.value = ''
  searchResultsQuote.value = []
  quoteMode.value = 'EUR'
  wizardStep.value = 1
  showTxModal.value = true
}

function openCsvImport(accountId: string): void {
  csvImportAccountId.value = accountId
  showCsvImportModal.value = true
}

async function handleCsvImport(transactions: CryptoTransactionBulkCreate[]): Promise<boolean> {
  if (!csvImportAccountId.value) return false

  const result = await crypto.bulkImportTransactions(csvImportAccountId.value, transactions)
  
  if (result) {
    showCsvImportModal.value = false
    await selectAccount(csvImportAccountId.value)
    return true
  }
  return false
}

function openEditTransaction(tx: any): void {
  editingTxId.value = tx.id
  txForm.account_id = selectedAccountId.value!
  txForm.symbol = tx.symbol
  txForm.name = tx.name || ''
  txForm.type = tx.type
  txForm.amount = tx.amount
  txForm.price_per_unit = tx.price_per_unit
  txForm.quote_symbol = 'EUR'
  txForm.quote_amount = undefined
  txForm.quote_price_per_unit = undefined
  txForm.eur_amount = undefined
  txForm.fee_included = true
  txForm.fee_percentage = undefined
  txForm.fee_eur = undefined
  txForm.fee_symbol = undefined
  txForm.fee_amount = undefined
  txForm.executed_at = tx.executed_at.slice(0, 16)
  searchQuery.value = tx.name || tx.symbol
  searchResults.value = []
  showTxModal.value = true
}

let searchTimeout: ReturnType<typeof setTimeout> | null = null
async function handleSearchInput(value: string): Promise<void> {
  searchQuery.value = value
  
  if (!value || value.length < 2) {
    searchResults.value = []
    return
  }
  
  if (searchTimeout) clearTimeout(searchTimeout)
  
  searchTimeout = setTimeout(async () => {
    isSearching.value = true
    try {
      searchResults.value = await crypto.searchAssets(value)
    } catch (error) {
      console.error('Search error:', error)
      searchResults.value = []
    } finally {
      isSearching.value = false
    }
  }, 300)
}

function handleSelectAsset(asset: AssetSearchResult): void {
  txForm.symbol = asset.symbol
  txForm.name = asset.name || asset.symbol
  searchQuery.value = asset.name || asset.symbol
  searchResults.value = []
}

let searchTimeoutQuote: ReturnType<typeof setTimeout> | null = null
async function handleSearchInputQuote(value: string): Promise<void> {
  searchQueryQuote.value = value
  if (!value || value.length < 2) { searchResultsQuote.value = []; return }
  if (searchTimeoutQuote) clearTimeout(searchTimeoutQuote)
  searchTimeoutQuote = setTimeout(async () => {
    isSearchingQuote.value = true
    try { searchResultsQuote.value = await crypto.searchAssets(value) }
    catch { searchResultsQuote.value = [] }
    finally { isSearchingQuote.value = false }
  }, 300)
}
function handleSelectAssetQuote(asset: AssetSearchResult): void {
  txForm.quote_symbol = asset.symbol
  searchQueryQuote.value = asset.name || asset.symbol
  searchResultsQuote.value = []
}

const currentVisibleStep = computed(() => {
  if (wizardStep.value === 3 && !showQuoteStep.value) return 2
  return wizardStep.value
})

function isNegativeType(type: string): boolean {
  return ['SPEND', 'FEE', 'TRANSFER', 'EXIT'].includes(type)
}

function formatAssetDisplay(asset: AssetSearchResult): string {
  if (asset.name) {
    return `${asset.name} (${asset.symbol})`
  }
  return asset.symbol
}

async function handleSubmitTransaction(): Promise<void> {
  if (!txForm.symbol && searchQuery.value) {
    txForm.symbol = searchQuery.value.toUpperCase()
  }

  if (txForm.amount <= 0) {
    alert('La quantité doit être strictement positive.')
    return
  }

  if (feeMode.value === 'separate' && txForm.type !== 'BUY_SPOT' && txForm.type !== 'NON_TAXABLE_EXIT') {
    if (!txForm.fee_eur && !txForm.fee_percentage) {
      alert('Frais séparés : veuillez renseigner le montant en euros ou le pourcentage.')
      return
    }
    if (!txForm.fee_eur && txForm.fee_percentage) {
      const base = eurBaseAmount()
      if (base > 0) {
        txForm.fee_eur = Number((base * txForm.fee_percentage / 100).toFixed(8))
      }
    }
  }

  if (feeMode.value !== 'none') {
    if (txForm.fee_symbol && (!txForm.fee_amount || Number(txForm.fee_amount) <= 0)) {
      alert('Frais en token : veuillez renseigner la quantité prélevée.')
      return
    }
    if (!txForm.fee_symbol && txForm.fee_amount && Number(txForm.fee_amount) > 0) {
      alert('Frais en token : veuillez renseigner le symbole du token.')
      return
    }
  }

  const payload: CryptoCompositeTransactionCreate = { ...txForm } as CryptoCompositeTransactionCreate
  if (!editingTxId.value && (txForm.type === 'BUY_FIAT' || txForm.type === 'BUY_SPOT')) {
    if (txForm.type === 'BUY_FIAT') {
      payload.quote_symbol = 'EUR'
      payload.quote_price_per_unit = undefined
    } else {
      payload.eur_amount = (Number(txForm.price_per_unit) || 0) * (Number(txForm.amount) || 0)
      payload.quote_price_per_unit = undefined
    }
    payload.type = 'BUY'
  }

  if (txForm.price_per_unit !== undefined && txForm.price_per_unit < 0) {
    alert('Le prix doit être positif ou nul.')
    return
  }

  let success = false

  if (editingTxId.value) {
    const updateData: CryptoTransactionUpdate = {
      symbol: txForm.symbol || undefined,
      name: txForm.name || undefined,
      type: txForm.type as any,
      amount: txForm.amount,
      price_per_unit: txForm.price_per_unit,
      executed_at: txForm.executed_at,
      tx_hash: txForm.tx_hash || undefined,
      notes: txForm.notes || undefined,
    }
    const result = await crypto.updateTransaction(editingTxId.value, updateData)
    success = !!result
  } else {
    const result = await crypto.createCompositeTransaction(payload)
    success = !!result
  }

  if (success) {
    showTxModal.value = false
    if (selectedAccountId.value) {
      await Promise.all([
        crypto.fetchAccount(selectedAccountId.value),
        fetchAccountTransactions(selectedAccountId.value),
      ])
    }
  }
}

async function deleteTransaction(id: string): Promise<void> {
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

async function fetchAccountTransactions(id: string): Promise<void> {
  accountTransactions.value = await crypto.fetchAccountTransactions(id)
}

async function selectAccount(id: string): Promise<void> {
  selectedAccountId.value = id
  activeDetailTab.value = 'positions'
  await Promise.all([
    crypto.fetchAccount(id),
    fetchAccountTransactions(id)
  ])
}

async function handleDeleteAccount(id: string): Promise<void> {
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
  fetchRate()
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
              <span v-if="account.public_address" class="text-xs text-text-muted dark:text-text-dark-muted font-mono truncate max-w-50">{{ account.public_address }}</span>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0 ml-2 sm:ml-4">
            <BaseButton size="sm" variant="outline" @click.stop="openAddTransaction(account.id)">
              <span class="sm:hidden text-lg leading-none">+</span>
              <span class="hidden sm:inline">+ Transaction</span>
            </BaseButton>
            <BaseButton size="sm" variant="outline" @click.stop="openCsvImport(account.id)" title="Importer CSV">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span class="hidden sm:inline">Importer</span>
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
              <p class="text-lg font-bold text-text-main dark:text-text-dark-main">{{ formatEur(crypto.currentAccount.total_invested) }}</p>
            </div>
            <div>
              <p class="text-xs text-text-muted dark:text-text-dark-muted">P/L</p>
              <p :class="['text-lg font-bold', profitLossClass(crypto.currentAccount.profit_loss)]">
                {{ formatEur(crypto.currentAccount.profit_loss) }}
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
                    <th class="px-4 py-2">Nom</th>
                    <th class="px-4 py-2 text-right">Quantité</th>
                    <th class="px-4 py-2 text-right">PRU</th>
                    <th class="px-4 py-2 text-right">Investi</th>
                    <th class="px-4 py-2 text-right">Cours</th>
                    <th class="px-4 py-2 text-right">Valeur</th>
                    <th class="px-4 py-2 text-right">P/L</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-surface-border dark:divide-surface-dark-border">
                  <tr v-for="pos in crypto.currentAccount.positions" :key="pos.symbol" class="hover:bg-surface-hover dark:hover:bg-surface-dark-hover transition-colors">
                    <td class="px-4 py-2.5 font-medium text-text-main dark:text-text-dark-main">{{ pos.name || pos.symbol }}</td>
                    <td class="px-4 py-2.5 text-right font-mono text-text-body dark:text-text-dark-body">{{ formatNumber(pos.total_amount, 6) }}</td>
                    <td class="px-4 py-2.5 text-right">{{ formatEur(pos.average_buy_price) }}</td>
                    <td class="px-4 py-2.5 text-right">{{ formatEur(pos.total_invested) }}</td>
                    <td class="px-4 py-2.5 text-right">{{ formatEur(pos.current_price) }}</td>
                    <td class="px-4 py-2.5 text-right font-medium">{{ formatEur(pos.current_value) }}</td>
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
                      <BaseBadge :variant="
                        tx.type === 'BUY' ? 'success' :
                        tx.type === 'SPEND' ? 'danger' :
                        tx.type === 'FEE' ? 'warning' :
                        tx.type === 'REWARD' ? 'info' :
                        tx.type === 'FIAT_DEPOSIT' || tx.type === 'FIAT_ANCHOR' ? 'secondary' :
                        tx.type === 'TRANSFER' ? 'secondary' :
                        tx.type === 'EXIT' ? 'danger' :
                        'secondary'
                      ">
                        {{ tx.type }}
                      </BaseBadge>
                    </td>
                    <td class="px-4 py-2.5 font-medium text-text-main dark:text-text-dark-main">{{ tx.symbol }}</td>
                    <td
                      class="px-4 py-2.5 text-right font-mono"
                      :class="isNegativeType(tx.type) ? 'text-danger' : 'text-success'"
                    >
                      {{ isNegativeType(tx.type) ? '−' : '+' }}{{ formatNumber(tx.amount, 6) }}
                    </td>
                    <td class="px-4 py-2.5 text-right">{{ tx.price_per_unit > 0 ? formatEur(tx.price_per_unit) : '—' }}</td>
                    <td class="px-4 py-2.5 text-right font-medium">{{ formatEur(tx.total_cost) }}</td>
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
        <BaseInput v-model="accountForm.name" label="Nom" placeholder="Nom du portefeuille" required />
        <BaseInput v-model="accountForm.platform!" label="Nom du wallet" placeholder="Nom du wallet" />
        <BaseInput v-model="accountForm.public_address!" label="Adresse publique" placeholder="Adresse publique" />
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
    <BaseModal
      :open="showTxModal"
      :title="editingTxId ? 'Modifier la transaction' : 'Nouvelle transaction'"
      size="lg"
      @close="showTxModal = false"
    >
      <!-- ── EDIT MODE — formulaire simple ─────────────────────────── -->
      <form v-if="editingTxId" @submit.prevent="handleSubmitTransaction" class="space-y-4">
        <BaseAutocomplete
          :model-value="searchQuery"
          @update:model-value="handleSearchInput"
          @select="handleSelectAsset"
          label="Nom de la crypto"
          placeholder="Rechercher une crypto..."
          :options="searchResults"
          :display-value="formatAssetDisplay"
          :loading="isSearching"
          remote
          required
        />
        <BaseInput v-model="txForm.symbol" label="Symbole" placeholder="BTC" />
        <BaseSelect v-model="txForm.type" label="Type" :options="txTypeOptions" required />
        <div class="grid grid-cols-2 gap-4">
          <BaseInput v-model="txForm.amount" label="Quantité" type="number" step="any" min="0" required />
          <BaseInput v-model="txForm.price_per_unit!" label="Prix unitaire (€)" type="number" step="any" min="0" required />
        </div>
        <BaseInput v-model="txForm.executed_at" label="Date d'exécution" type="datetime-local" required />
      </form>

      <!-- ── CREATE MODE — wizard 3 étapes ─────────────────────────── -->
      <div v-else>
        <!-- Indicateur d'étapes -->
        <div class="flex items-center justify-center gap-1.5 mb-6">
          <template v-for="s in wizardVisibleSteps" :key="s">
            <div
              :class="[
                'rounded-full transition-all duration-200',
                s === currentVisibleStep
                  ? 'h-2 w-6 bg-primary'
                  : s < currentVisibleStep
                    ? 'h-2 w-2 bg-primary/40'
                    : 'h-2 w-2 bg-surface-border dark:bg-surface-dark-border',
              ]"
            />
          </template>
          <span class="ml-2 text-xs text-text-muted dark:text-text-dark-muted">
            Étape {{ currentVisibleStep }}/{{ wizardVisibleSteps }}
          </span>
        </div>

        <!-- ╔══════════════════════╗ -->
        <!-- ║  ÉTAPE 1 — Ce que tu reçois  ║ -->
        <!-- ╚══════════════════════╝ -->
        <div v-if="wizardStep === 1" class="space-y-4">
          <p class="text-xs font-semibold text-text-muted dark:text-text-dark-muted uppercase tracking-wider">
            Ce que tu reçois
          </p>

          <BaseSelect v-model="txForm.type" label="Type de transaction" :options="txTypeOptions" required />

          <!-- Dépôt / retrait fiat : symbole = EUR, pas de recherche crypto -->
          <template v-if="txForm.type === 'FIAT_DEPOSIT' || txForm.type === 'FIAT_WITHDRAW'">
            <BaseInput
              v-model="txForm.symbol"
              label="Devise"
              placeholder="EUR"
              required
            />
          </template>

          <!-- Tous les autres types : recherche crypto normale -->
          <template v-else>
            <BaseAutocomplete
              :model-value="searchQuery"
              @update:model-value="handleSearchInput"
              @select="handleSelectAsset"
              label="Nom de la crypto"
              placeholder="Rechercher une crypto..."
              :options="searchResults"
              :display-value="formatAssetDisplay"
              :loading="isSearching"
              remote
            />
            <BaseInput
              v-model="txForm.symbol"
              label="Symbole"
              placeholder="BTC, ETH, SOL..."
              required
            />
          </template>

          <BaseInput
            v-model="txForm.amount"
            :label="
              (txForm.type === 'FIAT_DEPOSIT' || txForm.type === 'FIAT_WITHDRAW') ? 'Montant (€)'
              : txForm.type === 'GAS_FEE' ? 'Quantité de gaz brûlée'
              : txForm.type === 'EXIT' ? 'Quantité vendue / dépensée'
              : txForm.type === 'NON_TAXABLE_EXIT' ? 'Quantité envoyée / donnée'
              : 'Quantité reçue'
            "
            type="number"
            step="any"
            min="0"
            required
          />

          <!-- Note contextuelle EXIT vs NON_TAXABLE_EXIT -->
          <p v-if="txForm.type === 'EXIT'" class="text-xs text-info">
            ⓘ La contrepartie en EUR sera automatiquement créditée dans ton solde EUR.
            Utilise <strong>Sortie non-imposable</strong> si tu ne reçois aucun euro (don, perte, envoi).
          </p>
          <p v-if="txForm.type === 'NON_TAXABLE_EXIT'" class="text-xs text-warning">
            ⓘ Aucun euro ne sera crédité. La valeur de céession est considérée nulle.
            Si tu reçois des euros en échange, utilise <strong>Sortie imposable</strong>.
          </p>

          <!-- Valeur EUR originale pour un dépôt crypto ou une vente -->
          <BaseInput
            v-if="txForm.type === 'CRYPTO_DEPOSIT'"
            v-model="txForm.eur_amount!"
            label="Valeur EUR de ce dépôt (coût de revient origine)"
            type="number"
            step="any"
            min="0"
            placeholder="ex : 15 000"
            required
          />
          <BaseInput
            v-if="txForm.type === 'EXIT'"
            v-model="txForm.eur_amount!"
            label="EUR reçus (prix de vente total)"
            type="number"
            step="any"
            min="0"
            placeholder="ex : 5 000"
            required
          />

          <!-- Prix unitaire EUR — Achat Spot uniquement (ancrage PRU en étape 1) -->
          <BaseInput
            v-if="txForm.type === 'BUY_SPOT'"
            v-model="txForm.price_per_unit!"
            label="Prix unitaire (€)"
            type="number"
            step="any"
            min="0"
            placeholder="ex : 92 000"
            required
          />

          <!-- Prix manuel pour les types sans étape de cotation (REWARD, TRANSFER) -->
          <BaseInput
            v-if="!showQuoteStep && !['CRYPTO_DEPOSIT', 'EXIT', 'FIAT_DEPOSIT', 'FIAT_WITHDRAW', 'GAS_FEE', 'BUY_SPOT', 'NON_TAXABLE_EXIT'].includes(txForm.type)"
            v-model="txForm.price_per_unit!"
            label="Prix unitaire (€)"
            type="number"
            step="any"
            min="0"
          />

          <BaseInput v-model="txForm.executed_at" label="Date d'exécution" type="datetime-local" required />
        </div>

        <!-- ╔══════════════════════╗ -->
        <!-- ║  ÉTAPE 2 — Ce que tu dépenses  ║ -->
        <!-- ╚══════════════════════╝ -->
        <div v-else-if="wizardStep === 2 && showQuoteStep" class="space-y-4">
          <p class="text-xs font-semibold text-text-muted dark:text-text-dark-muted uppercase tracking-wider">
            Ce que tu as dépensé
          </p>
          <p class="text-sm text-text-muted dark:text-text-dark-muted">
            Tu as reçu <strong class="text-text-main dark:text-text-dark-main">{{ txForm.amount }} {{ txForm.symbol }}</strong>.
            Avec quoi as-tu payé ?
          </p>

          <!-- Achat Fiat : montant EUR dépensé — prix unitaire calculé automatiquement -->
          <template v-if="txForm.type === 'BUY_FIAT'">
            <BaseInput
              v-model="txForm.quote_amount!"
              label="Montant en EUR dépensé"
              type="number"
              step="any"
              min="0"
              placeholder="ex : 42 000"
              required
            />
          </template>

          <!-- Achat Spot : crypto dépensée — l'ancrage EUR vient du prix unitaire renseigné en étape 1 -->
          <template v-else-if="txForm.type === 'BUY_SPOT'">
            <BaseAutocomplete
              :model-value="searchQueryQuote"
              @update:model-value="handleSearchInputQuote"
              @select="handleSelectAssetQuote"
              label="Crypto dépensée"
              placeholder="Rechercher USDC, ETH, SOL..."
              :options="searchResultsQuote"
              :display-value="formatAssetDisplay"
              :loading="isSearchingQuote"
              remote
            />
            <BaseInput
              v-model="txForm.quote_symbol!"
              label="Symbole"
              placeholder="USDC, ETH..."
              required
            />
            <BaseInput
              v-model="txForm.quote_amount!"
              label="Quantité dépensée"
              type="number"
              step="any"
              min="0"
              required
            />
          </template>

          <!-- Prix calculé automatiquement (Achat Fiat uniquement) -->
          <div
            v-if="calculatedPricePerUnit"
            class="rounded-secondary bg-background-subtle dark:bg-background-dark-subtle border border-surface-border dark:border-surface-dark-border px-4 py-3"
          >
            <p class="text-xs text-text-muted dark:text-text-dark-muted mb-0.5">Prix calculé</p>
            <p class="text-lg font-bold text-text-main dark:text-text-dark-main">
              1 {{ txForm.symbol }} ≈
              {{ calculatedPricePerUnit.toLocaleString('fr-FR', { maximumFractionDigits: 4 }) }} €
            </p>
          </div>
        </div>

        <!-- ╔═══════════════╗ -->
        <!-- ║  ÉTAPE 3 — Frais  ║ -->
        <!-- ╚═══════════════╝ -->
        <div v-else-if="wizardStep === 3 && showFeeStep" class="space-y-4">
          <p class="text-xs font-semibold text-text-muted dark:text-text-dark-muted uppercase tracking-wider">
            Frais (optionnel)
          </p>

          <!-- ── Achat Fiat & CRYPTO_DEPOSIT : frais EUR possibles ── -->
          <template v-if="txForm.type !== 'BUY_SPOT' && txForm.type !== 'NON_TAXABLE_EXIT'">
            <!-- Toggle 3 options -->
            <div class="inline-flex items-center gap-0.5 bg-surface dark:bg-surface-dark p-1 rounded-button border border-surface-border dark:border-surface-dark-border">
              <button
                type="button"
                @click="feeMode = 'none'; clearFeeLeg()"
                :class="[
                  'px-3 py-1.5 text-sm font-medium rounded-secondary transition-all',
                  feeMode === 'none'
                    ? 'bg-primary text-primary-content shadow-sm'
                    : 'text-text-muted dark:text-text-dark-muted hover:text-text-main dark:hover:text-text-dark-main',
                ]"
              >Pas de frais</button>
              <button
                type="button"
                @click="feeMode = 'included'; txForm.fee_included = true; txForm.fee_eur = undefined; txForm.fee_percentage = undefined"
                :class="[
                  'px-3 py-1.5 text-sm font-medium rounded-secondary transition-all',
                  feeMode === 'included'
                    ? 'bg-primary text-primary-content shadow-sm'
                    : 'text-text-muted dark:text-text-dark-muted hover:text-text-main dark:hover:text-text-dark-main',
                ]"
              >Inclus dans le prix</button>
              <button
                type="button"
                @click="feeMode = 'separate'; txForm.fee_included = false; txForm.fee_percentage = undefined"
                :class="[
                  'px-3 py-1.5 text-sm font-medium rounded-secondary transition-all',
                  feeMode === 'separate'
                    ? 'bg-primary text-primary-content shadow-sm'
                    : 'text-text-muted dark:text-text-dark-muted hover:text-text-main dark:hover:text-text-dark-main',
                ]"
              >Frais séparés</button>
            </div>

            <!-- Pas de frais -->
            <p v-if="feeMode === 'none'" class="text-sm text-text-muted dark:text-text-dark-muted">
              Aucun frais ne sera pris en compte pour cette transaction.
            </p>

            <!-- Inclus dans le prix -->
            <template v-else-if="feeMode === 'included'">
              <p class="text-xs text-text-muted dark:text-text-dark-muted">
                Les frais sont déjà compris dans le montant payé. Le PRU intègre la totalité du montant renseigné.
              </p>
            </template>

            <!-- Frais séparés -->
            <template v-else>
              <p class="text-xs text-text-muted dark:text-text-dark-muted">
                Renseigne les frais <strong class="text-text-main dark:text-text-dark-main">en euros ou en pourcentage</strong> — au moins l'un des deux est requis.
                Saisir le % calcule le montant en € automatiquement.
              </p>
              <div class="grid grid-cols-2 gap-3">
                <BaseInput
                  v-model="txForm.fee_eur!"
                  label="Frais (€)"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="ex : 5.00"
                />
                <BaseInput
                  :model-value="txForm.fee_percentage != null ? String(txForm.fee_percentage) : ''"
                  @update:model-value="onFeePercentageInput"
                  label="Frais (%)"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="ex : 0.25"
                />
              </div>
              <div
                v-if="txForm.fee_eur && Number(txForm.fee_eur) > 0"
                class="rounded-secondary bg-background-subtle dark:bg-background-dark-subtle border border-surface-border dark:border-surface-dark-border px-4 py-3"
              >
                <p class="text-xs text-text-muted dark:text-text-dark-muted mb-0.5">Coût total (asset + frais)</p>
                <p class="text-base font-semibold text-text-main dark:text-text-dark-main">
                  {{ (Number(txForm.quote_amount || txForm.eur_amount || 0) + Number(txForm.fee_eur)).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) }} €
                </p>
              </div>
            </template>

            <!-- PRU prévisionnel -->
            <div
              v-if="previewPru"
              class="rounded-secondary bg-background-subtle dark:bg-background-dark-subtle border border-surface-border dark:border-surface-dark-border px-4 py-3"
            >
              <p class="text-xs text-text-muted dark:text-text-dark-muted mb-0.5">
                PRU prévisionnel
                <span v-if="feeMode === 'separate'" class="ml-1 text-warning">(frais inclus)</span>
              </p>
              <p class="text-base font-semibold text-text-main dark:text-text-dark-main">
                1 {{ txForm.symbol }} = {{ previewPru.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 6 }) }} €
              </p>
            </div>

            <!-- Frais en token (si mode !== 'none') -->
            <div v-if="feeMode !== 'none'" class="border-t border-surface-border dark:border-surface-dark-border pt-4 space-y-3">
              <div>
                <p class="text-xs font-semibold text-text-muted dark:text-text-dark-muted uppercase tracking-wider">
                  Frais en token (optionnel)
                </p>
                <p class="text-xs text-text-muted dark:text-text-dark-muted mt-1">
                  Si les frais ont été prélevés dans un autre token (ex : BNB, ETH), renseigne-le pour débiter ton solde.
                  Le prix EUR est déduit automatiquement du coût total.
                </p>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <BaseInput
                  v-model="txForm.fee_symbol!"
                  label="Symbole du token"
                  placeholder="ex : BNB"
                  @input="(e: Event) => { txForm.fee_symbol = (e.target as HTMLInputElement).value.toUpperCase() }"
                />
                <BaseInput
                  v-model="txForm.fee_amount!"
                  label="Quantité"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="ex : 0.005"
                />
              </div>
              <div
                v-if="txForm.fee_symbol && txForm.fee_amount && Number(txForm.fee_amount) > 0"
                class="rounded-secondary bg-info/10 border border-info/30 px-3 py-2"
              >
                <p class="text-xs text-info">
                  ✓ {{ txForm.fee_amount }} {{ txForm.fee_symbol }} seront déduits de ton solde.
                </p>
              </div>
            </div>
          </template>

          <!-- ── Swap & Sortie non-imposable : frais en token, 3 options ── -->
          <template v-else>
            <!-- Toggle 3 options -->
            <div class="inline-flex items-center gap-0.5 bg-surface dark:bg-surface-dark p-1 rounded-button border border-surface-border dark:border-surface-dark-border">
              <button
                type="button"
                @click="feeMode = 'none'; clearFeeLeg()"
                :class="[
                  'px-3 py-1.5 text-sm font-medium rounded-secondary transition-all',
                  feeMode === 'none'
                    ? 'bg-primary text-primary-content shadow-sm'
                    : 'text-text-muted dark:text-text-dark-muted hover:text-text-main dark:hover:text-text-dark-main',
                ]"
              >Pas de frais</button>
              <button
                type="button"
                @click="feeMode = 'included'; txForm.fee_included = true; txForm.fee_eur = undefined; txForm.fee_percentage = undefined"
                :class="[
                  'px-3 py-1.5 text-sm font-medium rounded-secondary transition-all',
                  feeMode === 'included'
                    ? 'bg-primary text-primary-content shadow-sm'
                    : 'text-text-muted dark:text-text-dark-muted hover:text-text-main dark:hover:text-text-dark-main',
                ]"
              >Inclus dans le taux</button>
              <button
                type="button"
                @click="feeMode = 'separate'; txForm.fee_included = false; txForm.fee_eur = undefined; txForm.fee_percentage = undefined"
                :class="[
                  'px-3 py-1.5 text-sm font-medium rounded-secondary transition-all',
                  feeMode === 'separate'
                    ? 'bg-primary text-primary-content shadow-sm'
                    : 'text-text-muted dark:text-text-dark-muted hover:text-text-main dark:hover:text-text-dark-main',
                ]"
              >Frais séparés</button>
            </div>

            <!-- Pas de frais -->
            <p v-if="feeMode === 'none'" class="text-sm text-text-muted dark:text-text-dark-muted">
              Aucun frais ne sera pris en compte pour ce swap.
            </p>

            <!-- Inclus dans le taux : token seul, PRU inchangé -->
            <template v-else-if="feeMode === 'included'">
              <p class="text-xs text-text-muted dark:text-text-dark-muted">
                Les frais sont inclus dans le taux de change du swap.
                Cette option sert <strong class="text-text-main dark:text-text-dark-main">uniquement à maintenir la précision des soldes</strong> —
                le PRU reste calculé sur le seul montant EUR de l'étape 2.
                Une ligne <code>FEE price=0</code> sera créée pour débiter le token.
              </p>
              <div class="grid grid-cols-2 gap-3">
                <BaseInput
                  v-model="txForm.fee_symbol!"
                  label="Symbole du token"
                  placeholder="ex : BNB"
                  @input="(e: Event) => { txForm.fee_symbol = (e.target as HTMLInputElement).value.toUpperCase() }"
                />
                <BaseInput
                  v-model="txForm.fee_amount!"
                  label="Quantité"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="ex : 0.005"
                />
              </div>
              <div
                v-if="txForm.fee_symbol && txForm.fee_amount && Number(txForm.fee_amount) > 0"
                class="rounded-secondary bg-info/10 border border-info/30 px-3 py-2"
              >
                <p class="text-xs text-info">
                  ✓ {{ txForm.fee_amount }} {{ txForm.fee_symbol }} seront déduits de ton solde. PRU inchangé.
                </p>
              </div>
            </template>

            <!-- Frais séparés : fee_eur requis → s'ajoute à FIAT_ANCHOR → augmente le PRU -->
            <template v-else-if="feeMode === 'separate'">
              <p class="text-xs text-text-muted dark:text-text-dark-muted">
                Le montant EUR des frais s'ajoute au coût total du swap et
                <strong class="text-text-main dark:text-text-dark-main">augmente le PRU</strong>
                de l'actif reçu : <code>PRU = (EUR étape 2 + frais €) / quantité</code>.
              </p>
              <BaseInput
                v-model="txForm.fee_eur!"
                label="Montant des frais (€)"
                type="number"
                step="any"
                min="0"
                placeholder="ex : 3.50"
                required
              />
              <div class="grid grid-cols-2 gap-3">
                <BaseInput
                  v-model="txForm.fee_symbol!"
                  label="Symbole du token prélevé"
                  placeholder="ex : BNB"
                  @input="(e: Event) => { txForm.fee_symbol = (e.target as HTMLInputElement).value.toUpperCase() }"
                />
                <BaseInput
                  v-model="txForm.fee_amount!"
                  label="Quantité"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="ex : 0.005"
                />
              </div>
              <div
                v-if="txForm.fee_eur && Number(txForm.fee_eur) > 0"
                class="rounded-secondary bg-background-subtle dark:bg-background-dark-subtle border border-surface-border dark:border-surface-dark-border px-4 py-3 space-y-1"
              >
                <div>
                  <p class="text-xs text-text-muted dark:text-text-dark-muted mb-0.5">Coût total pris en compte</p>
                  <p class="text-base font-semibold text-text-main dark:text-text-dark-main">
                    {{ (Number(txForm.eur_amount || 0) + Number(txForm.fee_eur)).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) }} €
                  </p>
                </div>
                <div v-if="previewPru">
                  <p class="text-xs text-text-muted dark:text-text-dark-muted mb-0.5">PRU prévisionnel <span class="text-warning">(frais inclus)</span></p>
                  <p class="text-base font-semibold text-text-main dark:text-text-dark-main">
                    1 {{ txForm.symbol }} = {{ previewPru.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 6 }) }} €
                  </p>
                </div>
              </div>
            </template>
          </template>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between w-full">
          <!-- Pied Edition -->
          <template v-if="editingTxId">
            <BaseButton variant="danger" @click="deleteTransaction(editingTxId)">Supprimer</BaseButton>
            <div class="flex gap-2">
              <BaseButton variant="ghost" @click="showTxModal = false">Annuler</BaseButton>
              <BaseButton :loading="crypto.isLoading" @click="handleSubmitTransaction">Enregistrer</BaseButton>
            </div>
          </template>

          <!-- Pied Wizard -->
          <template v-else>
            <div>
              <BaseButton v-if="wizardStep > 1" variant="ghost" @click="prevWizardStep">
                ← Retour
              </BaseButton>
            </div>
            <div class="flex gap-2">
              <BaseButton variant="ghost" @click="showTxModal = false">Annuler</BaseButton>
              <!-- Dernière étape visible -->
              <template v-if="isLastStep">
                <BaseButton :loading="crypto.isLoading" @click="handleSubmitTransaction">
                  Confirmer
                </BaseButton>
              </template>
              <!-- Étapes intermédiaires -->
              <BaseButton v-else @click="nextWizardStep">Suivant →</BaseButton>
            </div>
          </template>
        </div>
      </template>
    </BaseModal>

    <!-- ── CSV Import Modal ────────────────────────────── -->
    <CsvImportModal
      :open="showCsvImportModal"
      :account-id="csvImportAccountId || ''"
      asset-type="crypto"
      :on-import="handleCsvImport"
      @close="showCsvImportModal = false"
    />
  </div>
</template>