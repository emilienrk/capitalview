<script setup lang="ts">
import { AlertCircle, ArrowLeftRight, BarChart3, Check, ChevronDown, ChevronLeft, ChevronRight, Circle, Pencil, Plus, RefreshCw, Upload } from 'lucide-vue-next'

import { onMounted, ref, reactive, computed, watch } from 'vue'
import { useCryptoStore } from '@/stores/crypto'
import { useSettingsStore } from '@/stores/settings'
import { useBankStore } from '@/stores/bank'
import { useFormatters } from '@/composables/useFormatters'
import { useCurrencyToggle } from '@/composables/useCurrencyToggle'
import { usePrivacyMode } from '@/composables/usePrivacyMode'
import { useDarkMode } from '@/composables/useDarkMode'
import PageHeader from '@/components/PageHeader.vue'
import {
  BaseCard, BaseButton, BaseInput, BaseSelect, BaseModal,
  BaseSpinner, BaseAlert, BaseEmptyState, BaseBadge, BaseAutocomplete,
} from '@/components'
import CsvImportModal from '@/components/modals/CsvImportModal.vue'
import BinanceImportModal from '@/components/imports/BinanceImportModal.vue'
import BankHistoryChart from '@/components/charts/BankHistoryChart.vue'
import CryptoAllocationDonutChart from '@/components/charts/CryptoAllocationDonutChart.vue'
import type {
  AccountHistorySnapshotResponse,
  CryptoAccountCreate,
  CryptoAtomicTransactionType,
  CryptoCompositeTransactionType,
  CryptoCompositeTransactionCreate,
  CrossAccountTransferCreate,
  CryptoTransactionUpdate,
  TransactionResponse,
  AssetSearchResult,
  CryptoCompositeBulkItem,
} from '@/types'
import {
  type CryptoUiTransactionType,
  toCompositeApiType,
} from '@/utils/cryptoTransactionTypes'

const crypto = useCryptoStore()
const settingsStore = useSettingsStore()
const bank = useBankStore()
const { formatCurrency, formatPercent, formatNumber, profitLossClass } = useFormatters()
const { fetchRate, displayCurrency, usdToEurRate, toggleCurrency } = useCurrencyToggle()
const { privacyMode, togglePrivacyMode, maskValue } = usePrivacyMode()
const { isDark } = useDarkMode()

const isSingleMode = computed(
  () =>
    settingsStore.settings?.crypto_module_enabled === true &&
    settingsStore.settings?.crypto_mode === 'SINGLE',
)

function formatEur(value: number | string | null | undefined): string {
  return formatCurrency(value, 'EUR')
}

function formatAmount(value: number | string | null | undefined): string {
  if (displayCurrency.value === 'USD') {
    if (value === null || value === undefined) return formatCurrency(null, 'USD')
    const n = typeof value === 'string' ? Number(value) : value
    if (isNaN(n)) return formatCurrency(null, 'USD')
    return formatCurrency(n / usdToEurRate.value, 'USD')
  }
  return formatEur(value)
}

function maskAmount(value: number | string | null | undefined): string {
  return maskValue(formatAmount(value))
}

type TxFormType = CryptoUiTransactionType | CryptoAtomicTransactionType
type TxFormData = Omit<CryptoCompositeTransactionCreate, 'type'> & { type: TxFormType }

const showAccountModal = ref(false)
const showTxModal = ref(false)
const showCsvImportModal = ref(false)
const showBinanceImportModal = ref(false)
const csvImportAccountId = ref<string | null>(null)
const binanceImportAccountId = ref<string | null>(null)
// Import dropdown state: SINGLE mode (boolean) and MULTI mode (account id)
const showImportDropdown = ref(false)
const importDropdownAccountId = ref<string | null>(null)
const selectedAccountId = ref<string | null>(null)
const transferToAccountId = ref<string>('')
const accountTransactions = ref<TransactionResponse[]>([])
const activeDetailTab = ref<'positions' | 'history'>('positions')
type HistoryGranularity = 'daily' | 'weekly' | 'monthly' | 'yearly'
const historyGranularity = ref<HistoryGranularity>('daily')
const granularityOptions: Array<{ value: HistoryGranularity; label: string }> = [
  { value: 'daily', label: 'Jour' },
  { value: 'weekly', label: 'Semaine' },
  { value: 'monthly', label: 'Mois' },
  { value: 'yearly', label: 'Année' },
]
const editingTxId = ref<string | null>(null)
const editingGroupUuid = ref<string | null>(null)
const editingAccountId = ref<string | null>(null)
type CryptoChartSlide = 'evolution' | 'allocation' | 'pnl'
const chartSlide = ref<CryptoChartSlide>('evolution')
const chartSlides: Array<{ key: CryptoChartSlide; label: string }> = [
  { key: 'evolution', label: 'Évolution' },
  { key: 'allocation', label: 'Répartition' },
  { key: 'pnl', label: 'P/L journalier' },
]
/** Non-blocking balance warning shown after a transaction is created. */
const txWarning = ref<string | null>(null)
/** Informational message shown after a transaction is created. */
const txInfo = ref<string | null>(null)

// Bank deduction state for DEPOSIT
const deductFromBank = ref(true)
const selectedBankAccountId = ref<string | null>(null)

/** Sorted bank accounts: CHECKING first, then others */
const sortedBankAccounts = computed(() => {
  const accounts = bank.summary?.accounts ?? []
  return [...accounts].sort((a, b) => {
    if (a.account_type === 'CHECKING') return -1
    if (b.account_type === 'CHECKING') return 1
    return 0
  })
})

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
  opened_at: null,
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

const quoteMode = ref<'EUR' | 'crypto'>('EUR')

const feeMode = ref<'none' | 'included' | 'separate' | 'token'>('none')
const feeInputMode = ref<'eur' | 'percent'>('eur')

const showQuoteStep = computed(() => txForm.type === 'BUY_FIAT' || txForm.type === 'BUY_SPOT')
const showFeeStep = computed(() => txForm.type === 'BUY_FIAT' || txForm.type === 'BUY_SPOT' || txForm.type === 'NON_TAXABLE_EXIT' || txForm.type === 'SELL_TO_FIAT' || txForm.type === 'TRANSFER_TO_ACCOUNT')

const wizardStep = ref(1)
const WIZARD_STEPS = 3
const wizardVisibleSteps = computed(() => {
  if (txForm.type === 'BUY_FIAT' || txForm.type === 'BUY_SPOT') return 3
  if (txForm.type === 'NON_TAXABLE_EXIT' || txForm.type === 'SELL_TO_FIAT' || txForm.type === 'TRANSFER_TO_ACCOUNT') return 2 // step1 + fee (skip quote)
  return 1
})
const isLastStep = computed(() =>
  wizardStep.value === 3 || wizardVisibleSteps.value === 1
)

watch(() => txForm.type, async (newType) => {
  wizardStep.value = 1
  feeMode.value = 'none'
  feeInputMode.value = 'eur'
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
    // Pre-load bank accounts for the deduction option
    if (newType === 'FIAT_DEPOSIT' || newType === 'FIAT_WITHDRAW') {
      deductFromBank.value = true
      await bank.fetchAccounts()
      selectedBankAccountId.value = sortedBankAccounts.value[0]?.id ?? null
    }
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

function eurBaseAmount(): number {
  if (txForm.type === 'BUY_FIAT') return Number(txForm.quote_amount || 0)
  if (txForm.type === 'BUY_SPOT') return (Number(txForm.price_per_unit) || 0) * (Number(txForm.amount) || 0)
  if (txForm.type === 'TRANSFER_TO_ACCOUNT') {
    const sym = (txForm.symbol || '').toUpperCase()
    const pos = crypto.currentAccount?.positions?.find(p => p.symbol === sym)
    const pru = pos?.average_buy_price ?? 0
    return (Number(txForm.amount) || 0) * pru
  }
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
  } else {
    txForm.fee_eur = undefined
  }
}

function onFeeEurInput(val: string | number): void {
  const num = val !== '' && val != null ? Number(val) : undefined
  txForm.fee_eur = num != null && num >= 0 ? num : undefined
  if (num && num > 0) {
    const base = eurBaseAmount()
    if (base > 0) {
      txForm.fee_percentage = Number((num / base * 100).toFixed(4))
    }
  } else {
    txForm.fee_percentage = undefined
  }
}

const feeActiveValue = computed((): string => {
  if (feeInputMode.value === 'eur') {
    return txForm.fee_eur != null ? String(txForm.fee_eur) : ''
  }
  return txForm.fee_percentage != null ? String(txForm.fee_percentage) : ''
})

const feeDisplayValue = ref<string>(feeActiveValue.value)
watch(feeActiveValue, (val) => {
  const parsed = parseFloat(feeDisplayValue.value.replace(',', '.'))
  const incoming = parseFloat(val)
  if (parsed !== incoming) {
    feeDisplayValue.value = val
  }
})

const feeConversionDisplay = computed((): string | null => {
  if (feeInputMode.value === 'eur') {
    if (txForm.fee_percentage != null && Number(txForm.fee_percentage) > 0) {
      return `${Number(txForm.fee_percentage).toLocaleString('fr-FR', { maximumFractionDigits: 4 })}\u00a0%`
    }
  } else {
    if (txForm.fee_eur != null && Number(txForm.fee_eur) > 0) {
      return `${Number(txForm.fee_eur).toLocaleString('fr-FR', { maximumFractionDigits: 2 })}\u00a0€`
    }
  }
  return null
})

function onUnifiedFeeInput(val: string): void {
  feeDisplayValue.value = val
  // Skip conversion for pure intermediary states
  if (val === '' || val === '-' || val.endsWith('.') || val.endsWith(',')) return
  if (feeInputMode.value === 'eur') {
    onFeeEurInput(val)
  } else {
    onFeePercentageInput(val)
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
    baseEur = Number(txForm.eur_amount || 0)
  }

  if (!baseEur) return null
  const feeEur = feeMode.value === 'separate' ? Number(txForm.fee_eur || 0) : 0
  return (baseEur + feeEur) / qty
})

function nextWizardStep(): void {
  if (wizardStep.value === 1 && showFeeStep.value && !showQuoteStep.value) {
    wizardStep.value = 3
  } else if (wizardStep.value < WIZARD_STEPS) {
    wizardStep.value++
  }
}

function prevWizardStep(): void {
  if (wizardStep.value === 3 && !showQuoteStep.value) {
    wizardStep.value = 1
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
  feeInputMode.value = 'eur'
}

const txTypeOptions = computed(() => {
  const base = [
    { label: 'Achat · EUR → Crypto', value: 'BUY_FIAT' },
    { label: 'Swap · Crypto ↔ Crypto', value: 'BUY_SPOT' },
    { label: 'Récompense · Staking / Intérêts', value: 'REWARD' },
    { label: 'Dépôt · EUR → Exchange', value: 'FIAT_DEPOSIT' },
    { label: 'Retrait · Exchange → Banque', value: 'FIAT_WITHDRAW' },
    { label: 'Dépôt · Crypto avec PRU', value: 'CRYPTO_DEPOSIT' },
    { label: 'Frais · Gaz on-chain', value: 'FEE' },
    { label: 'Vente · Crypto → EUR', value: 'SELL_TO_FIAT' },
    { label: 'Sortie · Don / Envoi hors périmètre', value: 'NON_TAXABLE_EXIT' },
  ]
  if (!isSingleMode.value) {
    base.push({ label: 'Transfert · Vers un autre portefeuille', value: 'TRANSFER_TO_ACCOUNT' })
  }
  return base
})

const txTypeDescriptions: Record<string, string> = {
  BUY_FIAT: 'Achat de crypto avec des euros depuis un exchange.',
  BUY_SPOT: 'Échange d\'une crypto contre une autre (swap).',
  REWARD: 'Crypto reçue via staking, intérêts ou récompense.',
  FIAT_DEPOSIT: 'Dépôt d\'euros sur un compte exchange.',
  FIAT_WITHDRAW: 'Transfert d\'euros de l\'exchange vers votre compte bancaire.',
  CRYPTO_DEPOSIT: 'Réception de crypto achetée hors périmètre. Enregistre un dépôt EUR, un achat crypto et une sortie EUR pour refléter l\'investissement réel.',
  FEE: 'Frais de réseau payés on-chain (ex : gaz Ethereum).',
  SELL_TO_FIAT: 'Vente de crypto contre une devise fiat (ex: EUR).',
  NON_TAXABLE_EXIT: 'Don, envoi ou perte — aucune contrepartie EUR, valeur de cession nulle.',
  TRANSFER_TO_ACCOUNT: 'Déplacement de crypto vers un autre de vos portefeuilles — neutre fiscalement.',
}

const isFiatWithdraw = computed(() => txForm.type === 'FIAT_WITHDRAW' && isFiatSymbol(txForm.symbol || ''))

watch(isFiatWithdraw, async (enabled) => {
  if (!enabled) return
  deductFromBank.value = true
  await bank.fetchAccounts()
  if (!selectedBankAccountId.value) {
    selectedBankAccountId.value = sortedBankAccounts.value[0]?.id ?? null
  }
})

function openCreateAccount(): void {
  editingAccountId.value = null
  accountForm.name = ''
  accountForm.platform = ''
  accountForm.public_address = ''
  accountForm.opened_at = null
  showAccountModal.value = true
}

function openEditAccount(account: any): void {
  editingAccountId.value = account.id
  accountForm.name = account.name
  accountForm.platform = account.platform || ''
  accountForm.public_address = account.public_address || ''
  accountForm.opened_at = account.opened_at ?? null
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
    await loadCryptoChartHistories(true)
    showAccountModal.value = false
  }
}

function openAddTransaction(accountId: string): void {
  txWarning.value = null
  txInfo.value = null
  if (selectedAccountId.value !== accountId) {
    selectedAccountId.value = accountId
    // Load target account summary so modal hints are based on the right account.
    crypto.fetchAccount(accountId, true)
  }
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
  transferToAccountId.value = ''
  showTxModal.value = true
}

function openCsvImport(accountId?: string): void {
  csvImportAccountId.value = accountId ?? crypto.accounts[0]?.id ?? null
  showCsvImportModal.value = true
}

function openBinanceImport(accountId?: string): void {
  binanceImportAccountId.value = accountId ?? crypto.accounts[0]?.id ?? null
  showBinanceImportModal.value = true
}

async function handleBinanceImported(): Promise<void> {
  showBinanceImportModal.value = false
  if (binanceImportAccountId.value) {
    await selectAccount(binanceImportAccountId.value)
    await loadCryptoChartHistories(true)
  }
}

async function handleCsvImport(transactions: CryptoCompositeBulkItem[]): Promise<boolean> {
  if (!csvImportAccountId.value) return false

  const result = await crypto.bulkCompositeImportTransactions(csvImportAccountId.value, transactions)

  if (result) {
    showCsvImportModal.value = false
    await selectAccount(csvImportAccountId.value)
    await loadCryptoChartHistories(true)
    return true
  }
  return false
}

function openEditTransaction(tx: any): void {
  editingTxId.value = tx.id
  editingGroupUuid.value = tx.group_uuid || null
  txForm.account_id = selectedAccountId.value!
  txForm.symbol = tx.symbol
  txForm.name = tx.type === 'ANCHOR' ? 'Euro' : (tx.name || '')
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
  return ['SPEND', 'FEE', 'TRANSFER', 'WITHDRAW'].includes(type)
}

const TX_TYPE_ORDER: Record<string, number> = {
  REWARD: 0,
  BUY: 1,
  TRANSFER: 2,
  SPEND: 3,
  WITHDRAW: 4,
  FEE: 5,
  ANCHOR: 6,
}

const sortedTransactions = computed(() => {
  return [...accountTransactions.value].sort((a, b) => {
    const dateA = new Date(a.executed_at).getTime()
    const dateB = new Date(b.executed_at).getTime()
    if (dateA !== dateB) return dateB - dateA
    // Group together by group_uuid
    const gA = a.group_uuid ?? ''
    const gB = b.group_uuid ?? ''
    if (gA !== gB) return gA.localeCompare(gB)
    return (TX_TYPE_ORDER[a.type] ?? 99) - (TX_TYPE_ORDER[b.type] ?? 99)
  })
})

const sortedPositions = computed(() => {
  if (!crypto.currentAccount?.positions) return []
  const showNegative = settingsStore.settings?.crypto_show_negative_positions ?? false
  const visiblePositions = crypto.currentAccount.positions.filter((pos) => {
    if (showNegative) return true
    return Number(pos.total_amount) >= 0
  })

  return [...visiblePositions].sort(
    (a, b) => Number(b.total_invested ?? 0) - Number(a.total_invested ?? 0)
  )
})

const fiatDepositNegativeEurBalance = computed<number | null>(() => {
  if (!showTxModal.value || txForm.type !== 'FIAT_DEPOSIT') return null
  if (!crypto.currentAccount || selectedAccountId.value !== txForm.account_id) return null

  const eurPosition = crypto.currentAccount.positions?.find((p) => p.symbol === 'EUR')
  if (!eurPosition) return null

  const eurBalance = Number(eurPosition.total_amount ?? 0)
  if (!Number.isFinite(eurBalance) || eurBalance >= 0) return null
  return Math.abs(eurBalance)
})

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

function applyGranularity(history: AccountHistorySnapshotResponse[]): AccountHistorySnapshotResponse[] {
  if (historyGranularity.value === 'daily') return history

  const byBucket = new Map<string, AccountHistorySnapshotResponse>()
  for (const snapshot of history) {
    const bucketKey = getHistoryBucketKey(snapshot.snapshot_date, historyGranularity.value)
    byBucket.set(bucketKey, snapshot)
  }

  return Array.from(byBucket.values())
}

const cryptoChartSeries = computed(() => {
  const totalHistory = applyGranularity(crypto.history)
  const accountSeries = (crypto.accounts ?? [])
    .map((account) => ({
      name: account.name,
      history: applyGranularity(crypto.accountHistoryById[account.id] ?? []),
    }))
    .filter((series) => series.history.length > 0)

  const series = [{ name: 'Valeur totale', history: totalHistory }, ...accountSeries]
  return series.filter((line) => line.history.length > 0)
})

const historyForAnalytics = computed<AccountHistorySnapshotResponse[]>(() => {
  const accountId = selectedAccountId.value
  if (accountId && crypto.accountHistoryById[accountId]?.length) {
    return [...crypto.accountHistoryById[accountId]].sort(
      (a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime(),
    )
  }

  return [...crypto.history].sort(
    (a, b) => new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime(),
  )
})

const pnlChartSeries = computed(() => {
  const hist = historyForAnalytics.value
  if (!hist.length) return []

  const dailyPnlSeries = hist
    .filter((point) => point.daily_pnl != null)
    .map((point) => ({
      ...point,
      total_value: Number(point.daily_pnl),
    }))

  if (!dailyPnlSeries.length) return []

  return [
    { name: 'P/L journalier', history: dailyPnlSeries },
  ]
})

const allocationSegments = computed(() => {
  const positions = crypto.currentAccount?.positions ?? []
  const fiat = new Set(['EUR', 'USD', 'USDC', 'USDT', 'DAI'])

  return positions
    .filter((position) => !fiat.has((position.symbol || '').toUpperCase()))
    .map((position) => ({
      name: position.symbol || position.name || 'Inconnu',
      value: Number(position.current_value ?? 0),
    }))
    .filter((segment) => segment.value > 0)
    .sort((a, b) => b.value - a.value)
})

function nextChartSlide(): void {
  if (!chartSlides.length) return
  const idx = chartSlides.findIndex((s) => s.key === chartSlide.value)
  const normalizedIdx = idx >= 0 ? idx : 0
  const nextSlide = chartSlides[(normalizedIdx + 1) % chartSlides.length]
  if (nextSlide) chartSlide.value = nextSlide.key
}

function prevChartSlide(): void {
  if (!chartSlides.length) return
  const idx = chartSlides.findIndex((s) => s.key === chartSlide.value)
  const normalizedIdx = idx >= 0 ? idx : 0
  const prevSlide = chartSlides[(normalizedIdx - 1 + chartSlides.length) % chartSlides.length]
  if (prevSlide) chartSlide.value = prevSlide.key
}

async function loadCryptoChartHistories(force = false): Promise<void> {
  await crypto.fetchHistory(force)
  await Promise.all(crypto.accounts.map((account) => crypto.fetchHistoryForAccount(account.id, force)))
}

const multiRowGroups = computed(() => {
  const counts: Record<string, number> = {}
  for (const tx of accountTransactions.value) {
    if (tx.group_uuid) {
      counts[tx.group_uuid] = (counts[tx.group_uuid] || 0) + 1
    }
  }
  return new Set(Object.entries(counts).filter(([, c]) => c > 1).map(([g]) => g))
})

function isGroupStart(tx: TransactionResponse, idx: number): boolean {
  if (!tx.group_uuid || !multiRowGroups.value.has(tx.group_uuid)) return false
  if (idx === 0) return true
  return sortedTransactions.value[idx - 1]?.group_uuid !== tx.group_uuid
}

function isGroupEnd(tx: TransactionResponse, idx: number): boolean {
  if (!tx.group_uuid || !multiRowGroups.value.has(tx.group_uuid)) return false
  if (idx === sortedTransactions.value.length - 1) return true
  return sortedTransactions.value[idx + 1]?.group_uuid !== tx.group_uuid
}

function isInGroup(tx: TransactionResponse): boolean {
  return !!tx.group_uuid && multiRowGroups.value.has(tx.group_uuid)
}

const groupColorIndex = computed(() => {
  const map: Record<string, number> = {}
  let colorIdx = 0
  for (const tx of sortedTransactions.value) {
    if (tx.group_uuid && multiRowGroups.value.has(tx.group_uuid) && !(tx.group_uuid in map)) {
      map[tx.group_uuid] = colorIdx % 2
      colorIdx++
    }
  }
  return map
})

function rowTooltip(tx: TransactionResponse): string | null {
  if (tx.type === 'ANCHOR') return 'Ancre de valorisation : fige le prix de revient de l\'opération'
  if (tx.type === 'FEE') return 'Frais réseau / exchange — déduit du solde token'
  if (tx.type === 'BUY' && tx.price_per_unit === 0) return 'Ligne d\'achat — le coût EUR est porté par l\'ancre du même groupe'
  return null
}

function formatAssetDisplay(asset: AssetSearchResult): string {
  return asset.name ? `${asset.name} (${asset.symbol})` : asset.symbol
}

const FIAT_SYMBOLS = new Set(['EUR','USD','GBP','CHF','JPY','CAD','AUD','CNY','NZD','SEK','NOK','DKK'])
function isFiatSymbol(symbol: string): boolean {
  return FIAT_SYMBOLS.has(symbol.toUpperCase())
}

async function handleSubmitTransaction(): Promise<void> {
  txWarning.value = null
  txInfo.value = null

  if (!txForm.symbol && searchQuery.value) {
    txForm.symbol = searchQuery.value.toUpperCase()
  }

  if (txForm.amount <= 0) {
    alert('La quantité doit être strictement positive.')
    return
  }

  if (feeMode.value === 'separate' && txForm.type !== 'BUY_SPOT' && txForm.type !== 'NON_TAXABLE_EXIT' && txForm.type !== 'TRANSFER_TO_ACCOUNT') {
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

  if (txForm.price_per_unit !== undefined && txForm.price_per_unit < 0) {
    alert('Le prix doit être positif ou nul.')
    return
  }

  if (txForm.type === 'TRANSFER_TO_ACCOUNT') {
    if (!transferToAccountId.value) {
      alert('Veuillez sélectionner un compte de destination.')
      return
    }
    const transferPayload: CrossAccountTransferCreate = {
      from_account_id: txForm.account_id,
      to_account_id: transferToAccountId.value,
      symbol: txForm.symbol || searchQuery.value.toUpperCase(),
      name: txForm.name || undefined,
      amount: txForm.amount,
      fee_symbol: feeMode.value !== 'none' ? (txForm.fee_symbol || undefined) : undefined,
      fee_amount: feeMode.value !== 'none' ? (txForm.fee_amount || undefined) : undefined,
      executed_at: txForm.executed_at,
      tx_hash: txForm.tx_hash || undefined,
      notes: txForm.notes || undefined,
    }
    const result = await crypto.createCrossAccountTransfer(transferPayload)
    if (result) {
      if (result.warning) txWarning.value = result.warning
      if (result.info) txInfo.value = result.info
      showTxModal.value = false
      await Promise.all([
        crypto.fetchAccount(txForm.account_id),
        crypto.fetchAccount(transferToAccountId.value),
        fetchAccountTransactions(selectedAccountId.value!),
      ])
      await loadCryptoChartHistories(true)
    }
    return
  }

  let success = false

  if (editingTxId.value) {
    const updateData: CryptoTransactionUpdate = {
      symbol: txForm.symbol || undefined,
      name: txForm.name || undefined,
      type: txForm.type as CryptoTransactionUpdate['type'],
      amount: txForm.amount,
      price_per_unit: txForm.price_per_unit,
      executed_at: txForm.executed_at,
      tx_hash: txForm.tx_hash || undefined,
      notes: txForm.notes || undefined,
    }
    const result = await crypto.updateTransaction(editingTxId.value, updateData)
    success = !!result
  } else {
    const payload: CryptoCompositeTransactionCreate = {
      ...txForm,
      type: toCompositeApiType(txForm.type as CryptoUiTransactionType | CryptoCompositeTransactionType),
    } as CryptoCompositeTransactionCreate

    if (txForm.type === 'BUY_FIAT' || txForm.type === 'BUY_SPOT') {
      if (txForm.type === 'BUY_FIAT') {
        payload.quote_symbol = 'EUR'
        payload.quote_price_per_unit = undefined
      } else {
        payload.eur_amount = (Number(txForm.price_per_unit) || 0) * (Number(txForm.amount) || 0)
        payload.quote_price_per_unit = undefined
      }
    }

    const result = await crypto.createCompositeTransaction(payload)
    if (result?.warning) txWarning.value = result.warning
    if (result?.info) txInfo.value = result.info
    success = !!result
  }

  if (success) {
    // For FIAT_DEPOSIT: deduct from bank. For FIAT_WITHDRAW on EUR: credit bank.
    if ((txForm.type === 'FIAT_DEPOSIT' || isFiatWithdraw.value) && deductFromBank.value && selectedBankAccountId.value) {
      const bankAcc = sortedBankAccounts.value.find(a => a.id === selectedBankAccountId.value)
      if (bankAcc) {
        if (txForm.type === 'FIAT_DEPOSIT') {
          if (Number(bankAcc.balance) < Number(txForm.amount)) {
            const ok = confirm(
              `Le solde du compte « ${bankAcc.name} » (${formatCurrency(bankAcc.balance)}) est insuffisant. Déduire quand même ?`
            )
            if (ok) {
              await bank.updateAccount(selectedBankAccountId.value, {
                balance: Number(bankAcc.balance) - Number(txForm.amount),
              })
            }
          } else {
            await bank.updateAccount(selectedBankAccountId.value, {
              balance: Number(bankAcc.balance) - Number(txForm.amount),
            })
          }
        } else {
          // FIAT_WITHDRAW on EUR: add the amount to the bank account
          await bank.updateAccount(selectedBankAccountId.value, {
            balance: Number(bankAcc.balance) + Number(txForm.amount),
          })
        }
      }
    }
    showTxModal.value = false
    if (selectedAccountId.value) {
      await Promise.all([
        crypto.fetchAccount(selectedAccountId.value),
        fetchAccountTransactions(selectedAccountId.value),
      ])
    }
    await loadCryptoChartHistories(true)
  }
}

async function deleteTransaction(id: string): Promise<void> {
  const confirmationMessage = editingGroupUuid.value
    ? 'Cette transaction fait partie d\'un groupe. La suppression supprimera toutes les transactions du groupe. Continuer ?'
    : 'Supprimer cette transaction ?'

  if (confirm(confirmationMessage)) {
    await crypto.deleteTransaction(id)
    showTxModal.value = false
    if (selectedAccountId.value) {
      await Promise.all([
        crypto.fetchAccount(selectedAccountId.value),
        fetchAccountTransactions(selectedAccountId.value)
      ])
    }
    await loadCryptoChartHistories(true)
  }
}

async function fetchAccountTransactions(id: string): Promise<void> {
  accountTransactions.value = await crypto.fetchAccountTransactions(id)
}

async function selectAccount(id: string): Promise<void> {
  selectedAccountId.value = id
  activeDetailTab.value = 'positions'
  // First load: fast cached data from DB
  await Promise.all([
    crypto.fetchAccount(id, true),
    fetchAccountTransactions(id)
  ])
  // Then refresh in background with live market data
  crypto.refreshAccount(id)
}

async function handleDeleteAccount(id: string): Promise<void> {
  if (confirm('Supprimer ce portefeuille crypto et toutes ses transactions ?')) {
    await crypto.deleteAccount(id)
    await loadCryptoChartHistories(true)
    if (selectedAccountId.value === id) {
      selectedAccountId.value = null
      crypto.currentAccount = null
    }
    showAccountModal.value = false
  }
}

onMounted(async () => {
  if (!settingsStore.settings) {
    await settingsStore.fetchSettings()
  }

  if (isSingleMode.value) {
    await crypto.fetchDefaultAccount()
    await loadCryptoChartHistories()
    const defaultId = crypto.accounts[0]?.id
    if (defaultId) {
      selectedAccountId.value = defaultId
      await fetchAccountTransactions(defaultId)
    }
  } else {
    await crypto.fetchAccounts()
    await loadCryptoChartHistories()
  }
  fetchRate()
})
</script>

<template>
  <div>
    <PageHeader title="Crypto" :description="isSingleMode ? 'Patrimoine global crypto-monnaies' : 'Portefeuilles et transactions crypto-monnaies'">
      <template #actions>
        <!-- Currency toggle -->
        <BaseButton
          variant="outline"
          size="sm"
          @click="toggleCurrency"
          :title="displayCurrency === 'USD' ? 'Afficher en euros' : 'Afficher en dollars'"
        >
          {{ displayCurrency === 'USD' ? '$ USD' : '€ EUR' }}
        </BaseButton>
        <!-- SINGLE mode: actions directly in header (no account management) -->
        <template v-if="isSingleMode && selectedAccountId">
          <!-- Import dropdown -->
          <div class="relative">
            <BaseButton variant="outline" size="sm" @click.stop="showImportDropdown = !showImportDropdown">
              <Upload class="w-4 h-4" />
              <span class="hidden sm:inline">Importer</span>
              <ChevronDown class="w-3 h-3 ml-1" />
            </BaseButton>
            <!-- Overlay to close on outside click -->
            <div v-if="showImportDropdown" class="fixed inset-0 z-40" @click="showImportDropdown = false" />
            <!-- Dropdown menu -->
            <div v-if="showImportDropdown" class="absolute right-0 top-full mt-1 z-50 bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border rounded-primary shadow-card min-w-45 overflow-hidden">
              <button
                class="w-full flex items-center gap-2 text-left px-4 py-2.5 text-sm text-text-body dark:text-text-dark-body hover:bg-background-subtle dark:hover:bg-background-dark-subtle transition-colors"
                @click.stop="openCsvImport(selectedAccountId!); showImportDropdown = false"
              >
                <BarChart3 class="w-4 h-4 text-text-muted dark:text-text-dark-muted shrink-0" />
                CSV générique
              </button>
              <button
                class="w-full flex items-center gap-2 text-left px-4 py-2.5 text-sm text-text-body dark:text-text-dark-body hover:bg-background-subtle dark:hover:bg-background-dark-subtle transition-colors"
                @click.stop="openBinanceImport(selectedAccountId!); showImportDropdown = false"
              >
                <Circle class="w-4 h-4 text-text-muted dark:text-text-dark-muted shrink-0" />
                Binance CSV
              </button>
            </div>
          </div>
          <BaseButton size="sm" @click="openAddTransaction(selectedAccountId!)">+<span class="hidden sm:inline">&nbsp;transaction</span></BaseButton>
        </template>
        <!-- MULTI mode: import + account creation -->
        <template v-else-if="!isSingleMode">
          <div class="relative" v-if="crypto.accounts.length">
            <BaseButton variant="outline" @click.stop="showImportDropdown = !showImportDropdown">
              <Upload class="w-4 h-4" />
              <span class="hidden sm:inline">Importer</span>
              <ChevronDown class="w-3 h-3 ml-1" />
            </BaseButton>
            <div v-if="showImportDropdown" class="fixed inset-0 z-40" @click="showImportDropdown = false" />
            <div v-if="showImportDropdown" class="absolute right-0 top-full mt-1 z-50 bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border rounded-primary shadow-card min-w-45 overflow-hidden">
              <button
                class="w-full flex items-center gap-2 text-left px-4 py-2.5 text-sm text-text-body dark:text-text-dark-body hover:bg-background-subtle dark:hover:bg-background-dark-subtle transition-colors"
                @click.stop="openCsvImport(); showImportDropdown = false"
              >
                <BarChart3 class="w-4 h-4 text-text-muted dark:text-text-dark-muted shrink-0" />
                CSV générique
              </button>
              <button
                class="w-full flex items-center gap-2 text-left px-4 py-2.5 text-sm text-text-body dark:text-text-dark-body hover:bg-background-subtle dark:hover:bg-background-dark-subtle transition-colors"
                @click.stop="openBinanceImport(); showImportDropdown = false"
              >
                <Circle class="w-4 h-4 text-text-muted dark:text-text-dark-muted shrink-0" />
                Binance CSV
              </button>
            </div>
          </div>
          <BaseButton @click="openCreateAccount">+<span class="hidden sm:inline">&nbsp; Nouveau portefeuille</span></BaseButton>
        </template>
      </template>
    </PageHeader>

    <!-- ── SINGLE MODE view ─────────────────────────────────── -->
    <template v-if="isSingleMode">
      <div v-if="crypto.isLoading && !crypto.currentAccount" class="flex justify-center py-20">
        <BaseSpinner size="lg" label="Chargement..." />
      </div>

      <BaseAlert v-if="crypto.error" variant="danger" dismissible @dismiss="crypto.error = null" class="mb-6">
        {{ crypto.error }}
      </BaseAlert>
      <BaseAlert v-if="txWarning" variant="warning" dismissible @dismiss="txWarning = null" class="mb-6">
        {{ txWarning }}
      </BaseAlert>
      <BaseAlert v-if="txInfo" variant="info" dismissible @dismiss="txInfo = null" class="mb-6">
        {{ txInfo }}
      </BaseAlert>

      <template v-if="!crypto.error && crypto.currentAccount">
        <!-- Summary Stats -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div class="rounded-secondary bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border p-4">
            <p class="text-[11px] font-medium uppercase tracking-wider text-text-muted dark:text-text-dark-muted mb-1.5">Investi</p>
            <p class="text-xl font-bold text-text-main dark:text-text-dark-main tabular-nums">{{ maskAmount(crypto.currentAccount.total_invested) }}</p>
          </div>
          <div class="rounded-secondary bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border p-4">
            <p class="text-[11px] font-medium uppercase tracking-wider text-text-muted dark:text-text-dark-muted mb-1.5">Valeur actuelle</p>
            <p class="text-xl font-bold text-text-main dark:text-text-dark-main tabular-nums">{{ maskAmount(crypto.currentAccount.current_value) }}</p>
          </div>
          <div class="rounded-secondary bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border p-4">
            <p class="text-[11px] font-medium uppercase tracking-wider text-text-muted dark:text-text-dark-muted mb-1.5">P/L</p>
            <p :class="['text-xl font-bold tabular-nums', profitLossClass(crypto.currentAccount.profit_loss)]">
              {{ maskAmount(crypto.currentAccount.profit_loss) }}
            </p>
          </div>
          <div class="rounded-secondary bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border p-4">
            <p class="text-[11px] font-medium uppercase tracking-wider text-text-muted dark:text-text-dark-muted mb-1.5">Performance</p>
            <p :class="['text-xl font-bold tabular-nums', profitLossClass(crypto.currentAccount.profit_loss_percentage)]">
              {{ formatPercent(crypto.currentAccount.profit_loss_percentage) }}
            </p>
          </div>
        </div>

        <BaseCard title="Analyse du portefeuille" subtitle="Évolution, répartition et performance" class="mb-6">
          <div class="mb-4 flex items-center justify-between gap-2">
            <div class="inline-flex rounded-button border border-surface-border dark:border-surface-dark-border bg-background-subtle dark:bg-background-dark-subtle p-1">
              <button
                v-for="slide in chartSlides"
                :key="slide.key"
                type="button"
                @click="chartSlide = slide.key"
                :class="[
                  'px-3 py-1.5 text-xs sm:text-sm rounded-button transition-colors',
                  chartSlide === slide.key
                    ? 'bg-primary text-primary-content'
                    : 'text-text-muted dark:text-text-dark-muted hover:text-text-main dark:hover:text-text-dark-main',
                ]"
              >
                {{ slide.label }}
              </button>
            </div>
            <div class="flex items-center gap-1">
              <BaseButton size="sm" variant="ghost" @click="prevChartSlide">
                <ChevronLeft class="w-4 h-4" />
              </BaseButton>
              <BaseButton size="sm" variant="ghost" @click="nextChartSlide">
                <ChevronRight class="w-4 h-4" />
              </BaseButton>
              <BaseButton size="sm" variant="outline" @click="loadCryptoChartHistories(true)">
                <RefreshCw class="w-4 h-4" /><span class="hidden sm:inline">&nbsp; Rafraîchir</span>
              </BaseButton>
            </div>
          </div>

          <div v-if="crypto.historyLoading" class="h-72 flex items-center justify-center">
            <BaseSpinner size="md" label="Chargement de l'historique..." />
          </div>

          <template v-else-if="chartSlide === 'evolution'">
            <template v-if="cryptoChartSeries.length > 0">
              <div class="mb-4 flex justify-end">
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
              <BankHistoryChart
                :series="cryptoChartSeries"
                :is-dark="isDark"
                :granularity="historyGranularity"
              />
            </template>
            <BaseEmptyState
              v-else
              title="Pas encore de données historiques"
              description="L'évolution s'affichera dès que des snapshots sont disponibles"
            />
          </template>

          <template v-else-if="chartSlide === 'allocation'">
            <template v-if="allocationSegments.length">
              <CryptoAllocationDonutChart :segments="allocationSegments" :is-dark="isDark" />
            </template>
            <BaseEmptyState
              v-else
              title="Pas de répartition disponible"
              description="Ajoutez des positions crypto pour voir la concentration du risque"
            />
          </template>

          <template v-else>
            <template v-if="pnlChartSeries.length > 0">
              <div class="mb-4 flex justify-end">
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
              <BankHistoryChart
                :series="pnlChartSeries"
                :is-dark="isDark"
                :granularity="historyGranularity"
              />
            </template>
            <BaseEmptyState
              v-else
              title="Pas de P/L cumulé disponible"
              description="L'indicateur apparaîtra avec un historique de portefeuille"
            />
          </template>
        </BaseCard>

        <BaseCard>
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
            <template v-if="sortedPositions.length">
              <!-- Desktop table -->
              <div class="hidden md:block overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="text-left text-[11px] text-text-muted dark:text-text-dark-muted uppercase tracking-wider border-b border-surface-border dark:border-surface-dark-border">
                      <th class="px-4 py-3">Actif</th>
                      <th class="px-4 py-3 text-right">Quantité</th>
                      <th class="px-4 py-3 text-right">PRU</th>
                      <th class="px-4 py-3 text-right">Investi</th>
                      <th class="px-4 py-3 text-right">Cours</th>
                      <th class="px-4 py-3 text-right">Valeur</th>
                      <th class="px-4 py-3 text-right">P/L</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-surface-border dark:divide-surface-dark-border">
                    <tr v-for="pos in sortedPositions" :key="pos.symbol" class="hover:bg-surface-hover dark:hover:bg-surface-dark-hover transition-colors">
                      <td class="px-4 py-3">
                        <p class="font-semibold text-text-main dark:text-text-dark-main">{{ pos.name || pos.symbol }}</p>
                        <p v-if="pos.name" class="text-xs text-text-muted dark:text-text-dark-muted">{{ pos.symbol }}</p>
                      </td>
                      <td class="px-4 py-3 text-right font-mono text-text-body dark:text-text-dark-body">{{ formatNumber(pos.total_amount, 6) }}</td>
                      <td class="px-4 py-3 text-right text-text-muted dark:text-text-dark-muted">{{ isFiatSymbol(pos.symbol) ? '—' : formatAmount(pos.average_buy_price) }}</td>
                      <td class="px-4 py-3 text-right text-text-muted dark:text-text-dark-muted">{{ isFiatSymbol(pos.symbol) ? '—' : maskAmount(pos.total_invested) }}</td>
                      <td class="px-4 py-3 text-right text-text-muted dark:text-text-dark-muted">{{ isFiatSymbol(pos.symbol) ? '—' : formatAmount(pos.current_price) }}</td>
                      <td class="px-4 py-3 text-right font-semibold text-text-main dark:text-text-dark-main">{{ maskAmount(pos.current_value) }}</td>
                      <td class="px-4 py-3 text-right">
                        <span :class="['font-semibold', profitLossClass(pos.profit_loss)]">{{ formatPercent(pos.profit_loss_percentage) }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <!-- Mobile cards -->
              <div class="md:hidden space-y-3">
                <div
                  v-for="pos in sortedPositions"
                  :key="pos.symbol"
                  class="rounded-secondary border border-surface-border dark:border-surface-dark-border p-4"
                >
                  <div class="flex items-center justify-between mb-3">
                    <div>
                      <p class="font-semibold text-text-main dark:text-text-dark-main">{{ pos.name || pos.symbol }}</p>
                      <p v-if="pos.name" class="text-xs text-text-muted dark:text-text-dark-muted">{{ pos.symbol }}</p>
                    </div>
                    <span :class="['text-sm font-bold tabular-nums', profitLossClass(pos.profit_loss)]">
                      {{ formatPercent(pos.profit_loss_percentage) }}
                    </span>
                  </div>
                  <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <p class="text-text-muted dark:text-text-dark-muted">Quantité</p>
                      <p class="font-mono font-medium text-text-body dark:text-text-dark-body">{{ formatNumber(pos.total_amount, 6) }}</p>
                    </div>
                    <div class="text-right">
                      <p class="text-text-muted dark:text-text-dark-muted">Valeur</p>
                      <p class="font-semibold text-text-main dark:text-text-dark-main">{{ maskAmount(pos.current_value) }}</p>
                    </div>
                    <div>
                      <p class="text-text-muted dark:text-text-dark-muted">PRU</p>
                      <p class="text-text-body dark:text-text-dark-body">{{ isFiatSymbol(pos.symbol) ? '—' : formatAmount(pos.average_buy_price) }}</p>
                    </div>
                    <div class="text-right">
                      <p class="text-text-muted dark:text-text-dark-muted">Investi</p>
                      <p class="text-text-body dark:text-text-dark-body">{{ isFiatSymbol(pos.symbol) ? '—' : maskAmount(pos.total_invested) }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </template>
            <BaseEmptyState v-else title="Aucune position" description="Ajoutez des transactions pour voir vos positions crypto" />
          </div>

          <!-- History Tab -->
          <div v-else>
            <template v-if="accountTransactions.length">
              <!-- Desktop table -->
              <div class="hidden md:block overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="text-left text-[11px] text-text-muted dark:text-text-dark-muted uppercase tracking-wider border-b border-surface-border dark:border-surface-dark-border">
                      <th class="w-1 px-0 py-3"></th>
                      <th class="px-4 py-3">Date</th>
                      <th class="px-4 py-3">Type</th>
                      <th class="px-4 py-3">Token</th>
                      <th class="px-4 py-3 text-right">Quantité</th>
                      <th class="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(tx, idx) in sortedTransactions" :key="tx.id"
                      :class="[
                        'transition-colors',
                        isInGroup(tx)
                          ? (groupColorIndex[tx.group_uuid!] === 0
                              ? 'bg-primary/3 dark:bg-primary/6 hover:bg-primary/6 dark:hover:bg-primary/10'
                              : 'bg-secondary/3 dark:bg-secondary/6 hover:bg-secondary/6 dark:hover:bg-secondary/10')
                          : 'hover:bg-surface-hover dark:hover:bg-surface-dark-hover',
                        isGroupStart(tx, idx) ? 'border-t border-surface-border dark:border-surface-dark-border' : '',
                        !isInGroup(tx) ? 'border-t border-surface-border/50 dark:border-surface-dark-border/50' : '',
                      ]"
                    >
                      <td class="w-1 px-0 py-0 relative">
                        <div
                          v-if="isInGroup(tx)"
                          :class="[
                            'absolute left-0 w-0.75',
                            groupColorIndex[tx.group_uuid!] === 0 ? 'bg-primary/40' : 'bg-secondary/40',
                            isGroupStart(tx, idx) ? 'top-0 rounded-t-full' : 'top-0',
                            isGroupEnd(tx, idx)   ? 'bottom-0 rounded-b-full' : 'bottom-0',
                          ]"
                          style="top: 0; bottom: 0;"
                        />
                      </td>
                      <td class="px-4 py-3 text-text-muted dark:text-text-dark-muted whitespace-nowrap">{{ new Date(tx.executed_at).toLocaleDateString() }}</td>
                      <td class="px-4 py-3">
                        <span class="inline-flex items-center gap-1.5">
                          <BaseBadge :variant="
                            tx.type === 'BUY' ? 'success' :
                            tx.type === 'SPEND' ? 'danger' :
                            tx.type === 'FEE' ? 'warning' :
                            tx.type === 'REWARD' ? 'info' :
                            tx.type === 'DEPOSIT' || tx.type === 'ANCHOR' ? 'secondary' :
                            tx.type === 'TRANSFER' ? 'secondary' :
                            tx.type === 'WITHDRAW' ? 'danger' :
                            'secondary'
                          ">
                            {{ tx.type }}
                          </BaseBadge>
                          <span
                            v-if="rowTooltip(tx)"
                            class="relative group/tip cursor-help"
                          >
                            <AlertCircle class="w-3.5 h-3.5 text-text-muted/50 dark:text-text-dark-muted/50" />
                            <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 text-[11px] leading-snug text-primary-content bg-text-main dark:bg-text-dark-main rounded-secondary shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover/tip:opacity-100 transition-opacity duration-150 z-50">
                              {{ rowTooltip(tx) }}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td class="px-4 py-3 font-medium text-text-main dark:text-text-dark-main">{{ tx.symbol }}</td>
                      <td
                        class="px-4 py-3 text-right font-mono"
                        :class="tx.type === 'ANCHOR' ? 'text-text-muted dark:text-text-dark-muted' : isNegativeType(tx.type) ? 'text-danger' : 'text-success'"
                      >
                        {{ tx.type === 'ANCHOR' ? '' : isNegativeType(tx.type) ? '\u2212' : '+' }}{{ formatNumber(tx.amount, 6) }}
                      </td>
                      <td class="px-4 py-3 text-right">
                        <BaseButton size="sm" variant="ghost" @click="openEditTransaction(tx)">
                          <Pencil class="w-4 h-4" />
                        </BaseButton>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <!-- Mobile cards -->
              <div class="md:hidden space-y-2">
                <div
                  v-for="(tx, idx) in sortedTransactions" :key="tx.id"
                  :class="[
                    'rounded-secondary p-3 transition-colors',
                    isInGroup(tx)
                      ? (groupColorIndex[tx.group_uuid!] === 0
                          ? 'bg-primary/5 dark:bg-primary/10 border-l-2 border-primary/30'
                          : 'bg-secondary/5 dark:bg-secondary/10 border-l-2 border-secondary/30')
                      : 'border border-surface-border dark:border-surface-dark-border',
                  ]"
                >
                  <div class="flex items-center justify-between mb-1.5">
                    <div class="flex items-center gap-2 min-w-0">
                      <BaseBadge :variant="
                        tx.type === 'BUY' ? 'success' :
                        tx.type === 'SPEND' ? 'danger' :
                        tx.type === 'FEE' ? 'warning' :
                        tx.type === 'REWARD' ? 'info' :
                        tx.type === 'DEPOSIT' || tx.type === 'ANCHOR' ? 'secondary' :
                        tx.type === 'TRANSFER' ? 'secondary' :
                        tx.type === 'WITHDRAW' ? 'danger' :
                        'secondary'
                      ">
                        {{ tx.type }}
                      </BaseBadge>
                      <span class="font-semibold text-sm text-text-main dark:text-text-dark-main truncate">{{ tx.symbol }}</span>
                    </div>
                    <BaseButton size="sm" variant="ghost" @click="openEditTransaction(tx)">
                      <Pencil class="w-4 h-4" />
                    </BaseButton>
                  </div>
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-text-muted dark:text-text-dark-muted">{{ new Date(tx.executed_at).toLocaleDateString() }}</span>
                    <span
                      class="font-mono font-medium"
                      :class="tx.type === 'ANCHOR' ? 'text-text-muted dark:text-text-dark-muted' : isNegativeType(tx.type) ? 'text-danger' : 'text-success'"
                    >
                      {{ tx.type === 'ANCHOR' ? '' : isNegativeType(tx.type) ? '\u2212' : '+' }}{{ formatNumber(tx.amount, 6) }}
                    </span>
                  </div>
                </div>
              </div>
            </template>
            <BaseEmptyState v-else title="Aucune transaction" description="L'historique des transactions est vide" />
          </div>
        </BaseCard>
      </template>
    </template>

    <!-- ── MULTI MODE view ────────────────────────────────── -->
    <template v-else>
      <div v-if="crypto.isLoading && !crypto.accounts.length" class="flex justify-center py-20">
        <BaseSpinner size="lg" label="Chargement..." />
      </div>

      <BaseAlert v-if="crypto.error" variant="danger" dismissible @dismiss="crypto.error = null" class="mb-6">
        {{ crypto.error }}
      </BaseAlert>
      <BaseAlert v-if="txWarning" variant="warning" dismissible @dismiss="txWarning = null" class="mb-6">
        {{ txWarning }}
      </BaseAlert>
      <BaseAlert v-if="txInfo" variant="info" dismissible @dismiss="txInfo = null" class="mb-6">
        {{ txInfo }}
      </BaseAlert>

      <BaseCard v-if="crypto.accounts.length" title="Analyse du portefeuille" subtitle="Évolution, répartition et performance" class="mb-6">
        <div class="mb-4 flex items-center justify-between gap-2">
          <div class="inline-flex rounded-button border border-surface-border dark:border-surface-dark-border bg-background-subtle dark:bg-background-dark-subtle p-1">
            <button
              v-for="slide in chartSlides"
              :key="slide.key"
              type="button"
              @click="chartSlide = slide.key"
              :class="[
                'px-3 py-1.5 text-xs sm:text-sm rounded-button transition-colors',
                chartSlide === slide.key
                  ? 'bg-primary text-primary-content'
                  : 'text-text-muted dark:text-text-dark-muted hover:text-text-main dark:hover:text-text-dark-main',
              ]"
            >
              {{ slide.label }}
            </button>
          </div>
          <div class="flex items-center gap-1">
            <BaseButton size="sm" variant="ghost" @click="prevChartSlide">
              <ChevronLeft class="w-4 h-4" />
            </BaseButton>
            <BaseButton size="sm" variant="ghost" @click="nextChartSlide">
              <ChevronRight class="w-4 h-4" />
            </BaseButton>
            <BaseButton size="sm" variant="outline" @click="loadCryptoChartHistories(true)">
              <RefreshCw class="w-4 h-4" /><span class="hidden sm:inline">&nbsp; Rafraîchir</span>
            </BaseButton>
          </div>
        </div>

        <div v-if="crypto.historyLoading" class="h-72 flex items-center justify-center">
          <BaseSpinner size="md" label="Chargement de l'historique..." />
        </div>

        <template v-else-if="chartSlide === 'evolution'">
          <template v-if="cryptoChartSeries.length > 0">
            <div class="mb-4 flex justify-end">
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
            <BankHistoryChart
              :series="cryptoChartSeries"
              :is-dark="isDark"
              :granularity="historyGranularity"
            />
          </template>
          <BaseEmptyState
            v-else
            title="Pas encore de données historiques"
            description="L'évolution s'affichera dès que des snapshots sont disponibles"
          />
        </template>

        <template v-else-if="chartSlide === 'allocation'">
          <template v-if="allocationSegments.length">
            <CryptoAllocationDonutChart :segments="allocationSegments" :is-dark="isDark" />
          </template>
          <BaseEmptyState
            v-else
            title="Pas de répartition disponible"
            description="Ajoutez des positions crypto pour voir la concentration du risque"
          />
        </template>

        <template v-else>
          <template v-if="pnlChartSeries.length > 0">
            <div class="mb-4 flex justify-end">
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
            <BankHistoryChart
              :series="pnlChartSeries"
              :is-dark="isDark"
              :granularity="historyGranularity"
            />
          </template>
          <BaseEmptyState
            v-else
            title="Pas de P/L cumulé disponible"
            description="L'indicateur apparaîtra avec un historique de portefeuille"
          />
        </template>
      </BaseCard>

      <div v-if="crypto.accounts.length" class="space-y-4">
        <BaseCard
          v-for="account in crypto.accounts"
          :key="account.id"
          :class="[
            'transition-all duration-150',
            selectedAccountId === account.id ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-background-dark' : '',
          ]"
        >
          <!-- Account header -->
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div
              class="flex-1 cursor-pointer min-w-0"
              @click="selectAccount(account.id)"
            >
              <div class="flex items-center gap-2.5">
                <h3 class="font-semibold text-text-main dark:text-text-dark-main truncate">{{ account.name }}</h3>
                <span v-if="account.platform" class="px-2 py-0.5 rounded-badge text-[11px] font-medium bg-surface-active dark:bg-surface-dark-active text-text-muted dark:text-text-dark-muted">
                  {{ account.platform }}
                </span>
              </div>
              <p v-if="account.public_address" class="text-xs text-text-muted dark:text-text-dark-muted font-mono truncate max-w-60 mt-1">{{ account.public_address }}</p>
            </div>
            <!-- Actions: wrap on mobile -->
            <div class="flex flex-wrap items-center gap-2 shrink-0">
              <BaseButton size="sm" variant="outline" @click.stop="openAddTransaction(account.id)">
                + Transaction
              </BaseButton>
              <BaseButton size="sm" variant="ghost" @click.stop="openEditAccount(account)">
                <Pencil class="w-4 h-4" />
              </BaseButton>
            </div>
          </div>

          <!-- Inline Detail -->
          <div
            v-if="selectedAccountId === account.id && crypto.currentAccount"
            class="mt-6 pt-6 border-t border-surface-border dark:border-surface-dark-border"
          >
            <!-- Summary Stats -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <div class="rounded-secondary bg-background-subtle dark:bg-background-dark-subtle p-3.5">
                <p class="text-[11px] font-medium uppercase tracking-wider text-text-muted dark:text-text-dark-muted mb-1">Investi</p>
                <p class="text-lg font-bold text-text-main dark:text-text-dark-main tabular-nums">{{ maskAmount(crypto.currentAccount.total_invested) }}</p>
              </div>
              <div class="rounded-secondary bg-background-subtle dark:bg-background-dark-subtle p-3.5">
                <p class="text-[11px] font-medium uppercase tracking-wider text-text-muted dark:text-text-dark-muted mb-1">Valeur actuelle</p>
                <p class="text-lg font-bold text-text-main dark:text-text-dark-main tabular-nums">{{ maskAmount(crypto.currentAccount.current_value) }}</p>
              </div>
              <div class="rounded-secondary bg-background-subtle dark:bg-background-dark-subtle p-3.5">
                <p class="text-[11px] font-medium uppercase tracking-wider text-text-muted dark:text-text-dark-muted mb-1">P/L</p>
                <p :class="['text-lg font-bold tabular-nums', profitLossClass(crypto.currentAccount.profit_loss)]">
                  {{ maskAmount(crypto.currentAccount.profit_loss) }}
                </p>
              </div>
              <div class="rounded-secondary bg-background-subtle dark:bg-background-dark-subtle p-3.5">
                <p class="text-[11px] font-medium uppercase tracking-wider text-text-muted dark:text-text-dark-muted mb-1">Performance</p>
                <p :class="['text-lg font-bold tabular-nums', profitLossClass(crypto.currentAccount.profit_loss_percentage)]">
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
              <template v-if="sortedPositions.length">
                <!-- Desktop table -->
                <div class="hidden md:block overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead>
                      <tr class="text-left text-[11px] text-text-muted dark:text-text-dark-muted uppercase tracking-wider border-b border-surface-border dark:border-surface-dark-border">
                        <th class="px-4 py-3">Actif</th>
                        <th class="px-4 py-3 text-right">Quantité</th>
                        <th class="px-4 py-3 text-right">PRU</th>
                        <th class="px-4 py-3 text-right">Investi</th>
                        <th class="px-4 py-3 text-right">Cours</th>
                        <th class="px-4 py-3 text-right">Valeur</th>
                        <th class="px-4 py-3 text-right">P/L</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-surface-border dark:divide-surface-dark-border">
                      <tr v-for="pos in sortedPositions" :key="pos.symbol" class="hover:bg-surface-hover dark:hover:bg-surface-dark-hover transition-colors">
                        <td class="px-4 py-3">
                          <p class="font-semibold text-text-main dark:text-text-dark-main">{{ pos.name || pos.symbol }}</p>
                          <p v-if="pos.name" class="text-xs text-text-muted dark:text-text-dark-muted">{{ pos.symbol }}</p>
                        </td>
                        <td class="px-4 py-3 text-right font-mono text-text-body dark:text-text-dark-body">{{ formatNumber(pos.total_amount, 6) }}</td>
                        <td class="px-4 py-3 text-right text-text-muted dark:text-text-dark-muted">{{ isFiatSymbol(pos.symbol) ? '—' : formatAmount(pos.average_buy_price) }}</td>
                        <td class="px-4 py-3 text-right text-text-muted dark:text-text-dark-muted">{{ isFiatSymbol(pos.symbol) ? '—' : maskAmount(pos.total_invested) }}</td>
                        <td class="px-4 py-3 text-right text-text-muted dark:text-text-dark-muted">{{ isFiatSymbol(pos.symbol) ? '—' : formatAmount(pos.current_price) }}</td>
                        <td class="px-4 py-3 text-right font-semibold text-text-main dark:text-text-dark-main">{{ maskAmount(pos.current_value) }}</td>
                        <td class="px-4 py-3 text-right">
                          <span :class="['font-semibold', profitLossClass(pos.profit_loss)]">{{ formatPercent(pos.profit_loss_percentage) }}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <!-- Mobile cards -->
                <div class="md:hidden space-y-3">
                  <div
                    v-for="pos in sortedPositions"
                    :key="pos.symbol"
                    class="rounded-secondary border border-surface-border dark:border-surface-dark-border p-4"
                  >
                    <div class="flex items-center justify-between mb-3">
                      <div>
                        <p class="font-semibold text-text-main dark:text-text-dark-main">{{ pos.name || pos.symbol }}</p>
                        <p v-if="pos.name" class="text-xs text-text-muted dark:text-text-dark-muted">{{ pos.symbol }}</p>
                      </div>
                      <span :class="['text-sm font-bold tabular-nums', profitLossClass(pos.profit_loss)]">
                        {{ formatPercent(pos.profit_loss_percentage) }}
                      </span>
                    </div>
                    <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div>
                        <p class="text-text-muted dark:text-text-dark-muted">Quantité</p>
                        <p class="font-mono font-medium text-text-body dark:text-text-dark-body">{{ formatNumber(pos.total_amount, 6) }}</p>
                      </div>
                      <div class="text-right">
                        <p class="text-text-muted dark:text-text-dark-muted">Valeur</p>
                        <p class="font-semibold text-text-main dark:text-text-dark-main">{{ maskAmount(pos.current_value) }}</p>
                      </div>
                      <div>
                        <p class="text-text-muted dark:text-text-dark-muted">PRU</p>
                        <p class="text-text-body dark:text-text-dark-body">{{ isFiatSymbol(pos.symbol) ? '—' : formatAmount(pos.average_buy_price) }}</p>
                      </div>
                      <div class="text-right">
                        <p class="text-text-muted dark:text-text-dark-muted">Investi</p>
                        <p class="text-text-body dark:text-text-dark-body">{{ isFiatSymbol(pos.symbol) ? '—' : maskAmount(pos.total_invested) }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              <BaseEmptyState v-else title="Aucune position" description="Ajoutez des transactions pour voir vos positions crypto" />
            </div>

            <!-- History Tab -->
            <div v-else>
              <template v-if="accountTransactions.length">
                <!-- Desktop table -->
                <div class="hidden md:block overflow-x-auto">
                  <table class="w-full text-sm">
                    <thead>
                      <tr class="text-left text-[11px] text-text-muted dark:text-text-dark-muted uppercase tracking-wider border-b border-surface-border dark:border-surface-dark-border">
                        <th class="w-1 px-0 py-3"></th>
                        <th class="px-4 py-3">Date</th>
                        <th class="px-4 py-3">Type</th>
                        <th class="px-4 py-3">Token</th>
                        <th class="px-4 py-3 text-right">Quantité</th>
                        <th class="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="(tx, idx) in sortedTransactions" :key="tx.id"
                        :class="[
                          'transition-colors',
                          isInGroup(tx)
                            ? (groupColorIndex[tx.group_uuid!] === 0
                                ? 'bg-primary/3 dark:bg-primary/6 hover:bg-primary/6 dark:hover:bg-primary/10'
                                : 'bg-secondary/3 dark:bg-secondary/6 hover:bg-secondary/6 dark:hover:bg-secondary/10')
                            : 'hover:bg-surface-hover dark:hover:bg-surface-dark-hover',
                          isGroupStart(tx, idx) ? 'border-t border-surface-border dark:border-surface-dark-border' : '',
                          !isInGroup(tx) ? 'border-t border-surface-border/50 dark:border-surface-dark-border/50' : '',
                        ]"
                      >
                        <td class="w-1 px-0 py-0 relative">
                          <div
                            v-if="isInGroup(tx)"
                            :class="[
                              'absolute left-0 w-0.75',
                              groupColorIndex[tx.group_uuid!] === 0 ? 'bg-primary/40' : 'bg-secondary/40',
                              isGroupStart(tx, idx) ? 'top-0 rounded-t-full' : 'top-0',
                              isGroupEnd(tx, idx)   ? 'bottom-0 rounded-b-full' : 'bottom-0',
                            ]"
                            style="top: 0; bottom: 0;"
                          />
                        </td>
                        <td class="px-4 py-3 text-text-muted dark:text-text-dark-muted whitespace-nowrap">{{ new Date(tx.executed_at).toLocaleDateString() }}</td>
                        <td class="px-4 py-3">
                          <span class="inline-flex items-center gap-1.5">
                            <BaseBadge :variant="
                              tx.type === 'BUY' ? 'success' :
                              tx.type === 'SPEND' ? 'danger' :
                              tx.type === 'FEE' ? 'warning' :
                              tx.type === 'REWARD' ? 'info' :
                              tx.type === 'DEPOSIT' || tx.type === 'ANCHOR' ? 'secondary' :
                              tx.type === 'TRANSFER' ? 'secondary' :
                              tx.type === 'WITHDRAW' ? 'danger' :
                              'secondary'
                            ">
                              {{ tx.type }}
                            </BaseBadge>
                            <span
                              v-if="rowTooltip(tx)"
                              class="relative group/tip cursor-help"
                            >
                              <AlertCircle class="w-3.5 h-3.5 text-text-muted/50 dark:text-text-dark-muted/50" />
                              <span class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 text-[11px] leading-snug text-primary-content bg-text-main dark:bg-text-dark-main rounded-secondary shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover/tip:opacity-100 transition-opacity duration-150 z-50">
                                {{ rowTooltip(tx) }}
                              </span>
                            </span>
                          </span>
                        </td>
                        <td class="px-4 py-3 font-medium text-text-main dark:text-text-dark-main">{{ tx.symbol }}</td>
                        <td
                          class="px-4 py-3 text-right font-mono"
                          :class="tx.type === 'ANCHOR' ? 'text-text-muted dark:text-text-dark-muted' : isNegativeType(tx.type) ? 'text-danger' : 'text-success'"
                        >
                          {{ tx.type === 'ANCHOR' ? '' : isNegativeType(tx.type) ? '\u2212' : '+' }}{{ formatNumber(tx.amount, 6) }}
                        </td>
                        <td class="px-4 py-3 text-right">
                          <BaseButton size="sm" variant="ghost" @click="openEditTransaction(tx)">
                            <Pencil class="w-4 h-4" />
                          </BaseButton>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <!-- Mobile cards -->
                <div class="md:hidden space-y-2">
                  <div
                    v-for="(tx, idx) in sortedTransactions" :key="tx.id"
                    :class="[
                      'rounded-secondary p-3 transition-colors',
                      isInGroup(tx)
                        ? (groupColorIndex[tx.group_uuid!] === 0
                            ? 'bg-primary/5 dark:bg-primary/10 border-l-2 border-primary/30'
                            : 'bg-secondary/5 dark:bg-secondary/10 border-l-2 border-secondary/30')
                        : 'border border-surface-border dark:border-surface-dark-border',
                    ]"
                  >
                    <div class="flex items-center justify-between mb-1.5">
                      <div class="flex items-center gap-2 min-w-0">
                        <BaseBadge :variant="
                          tx.type === 'BUY' ? 'success' :
                          tx.type === 'SPEND' ? 'danger' :
                          tx.type === 'FEE' ? 'warning' :
                          tx.type === 'REWARD' ? 'info' :
                          tx.type === 'DEPOSIT' || tx.type === 'ANCHOR' ? 'secondary' :
                          tx.type === 'TRANSFER' ? 'secondary' :
                          tx.type === 'WITHDRAW' ? 'danger' :
                          'secondary'
                        ">
                          {{ tx.type }}
                        </BaseBadge>
                        <span class="font-semibold text-sm text-text-main dark:text-text-dark-main truncate">{{ tx.symbol }}</span>
                      </div>
                      <BaseButton size="sm" variant="ghost" @click="openEditTransaction(tx)">
                        <Pencil class="w-4 h-4" />
                      </BaseButton>
                    </div>
                    <div class="flex items-center justify-between text-xs">
                      <span class="text-text-muted dark:text-text-dark-muted">{{ new Date(tx.executed_at).toLocaleDateString() }}</span>
                      <span
                        class="font-mono font-medium"
                        :class="tx.type === 'ANCHOR' ? 'text-text-muted dark:text-text-dark-muted' : isNegativeType(tx.type) ? 'text-danger' : 'text-success'"
                      >
                        {{ tx.type === 'ANCHOR' ? '' : isNegativeType(tx.type) ? '\u2212' : '+' }}{{ formatNumber(tx.amount, 6) }}
                      </span>
                    </div>
                  </div>
                </div>
              </template>
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
    </template>

    <!-- Create/Edit Account Modal -->
    <BaseModal :open="showAccountModal" :title="editingAccountId ? 'Modifier le portefeuille' : 'Nouveau portefeuille crypto'" @close="showAccountModal = false">
      <form @submit.prevent="handleSubmitAccount" class="space-y-4">
        <BaseInput v-model="accountForm.name" label="Nom" placeholder="Nom du portefeuille" required />
        <BaseInput v-model="accountForm.platform!" label="Nom du wallet" placeholder="Nom du wallet" />
        <BaseInput v-model="accountForm.public_address!" label="Adresse publique" placeholder="Adresse publique" />
        <BaseInput v-model="accountForm.opened_at!" label="Date d'ouverture" type="date" />
      </form>
      <template #footer>
        <div class="flex justify-between w-full">
          <BaseButton v-if="editingAccountId" variant="danger" @click="handleDeleteAccount(editingAccountId)">
            Supprimer
          </BaseButton>
          <div v-else></div>
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
      size="lg"
      @close="showTxModal = false"
    >
      <template #header>
        <div class="flex flex-col gap-0.5 min-w-0">
          <h2 class="text-lg font-semibold text-text-main dark:text-text-dark-main">
            {{ editingTxId ? 'Modifier la transaction' : 'Nouvelle transaction' }}
          </h2>
          <Transition enter-active-class="transition-all duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100">
            <p v-if="!editingTxId && txForm.type" class="text-xs text-text-muted dark:text-text-dark-muted truncate">
              {{ txTypeOptions.find(o => o.value === txForm.type)?.label }}
            </p>
          </Transition>
        </div>
      </template>
      <!-- Edit mode -->
      <form v-if="editingTxId" @submit.prevent="handleSubmitTransaction" class="space-y-4">
        <!-- Read-only symbol & name -->
        <div class="flex items-center gap-3 px-3 py-2.5 rounded-secondary bg-background-subtle dark:bg-background-dark-subtle border border-surface-border dark:border-surface-dark-border">
          <span class="font-semibold text-text-main dark:text-text-dark-main">{{ txForm.symbol }}</span>
          <span v-if="txForm.name" class="text-sm text-text-muted dark:text-text-dark-muted">{{ txForm.name }}</span>
        </div>
        <BaseInput v-model="txForm.amount" label="Quantité" type="number" step="any" min="0" required />
        <div>
          <BaseInput v-model="txForm.executed_at" label="Date d'exécution" type="datetime-local" required />
          <p v-if="editingGroupUuid" class="mt-1.5 text-xs text-info dark:text-info flex items-center gap-1.5">
            <AlertCircle class="w-3.5 h-3.5 shrink-0" />
            Cette transaction est liée à un groupe: modifier la date mettra à jour le groupe et la suppression supprimera toutes les transactions du groupe.
          </p>
        </div>
      </form>

      <!-- Create mode — multi-step wizard -->
      <div v-else>
        <div class="flex items-center justify-center mb-6 gap-0">
          <template v-for="s in wizardVisibleSteps" :key="s">
            <div
              :class="[
                'rounded-full transition-all duration-300',
                s < currentVisibleStep
                  ? 'w-2 h-2 bg-primary/60'
                  : s === currentVisibleStep
                    ? 'w-2.5 h-2.5 bg-primary shadow-sm'
                    : 'w-2 h-2 bg-surface-border dark:bg-surface-dark-border',
              ]"
            />
            <div
              v-if="s < wizardVisibleSteps"
              :class="[
                'h-px w-8 mx-2 rounded-full transition-colors duration-300',
                s < currentVisibleStep ? 'bg-primary/50' : 'bg-surface-border dark:bg-surface-dark-border',
              ]"
            />
          </template>
        </div>

        <div v-if="wizardStep === 1" class="space-y-5">

          <div>
            <p class="text-sm font-medium text-text-main dark:text-text-dark-main">Opération</p>
            <p class="text-xs text-text-muted dark:text-text-dark-muted mt-0.5">Sélectionnez le type et renseignez les informations principales.</p>
          </div>

          <div class="space-y-2">
            <BaseSelect v-model="txForm.type" label="Type de transaction" :options="txTypeOptions" required />
            <Transition
              enter-active-class="transition-all duration-200"
              enter-from-class="opacity-0 -translate-y-1"
              enter-to-class="opacity-100 translate-y-0"
            >
              <div
                v-if="txTypeDescriptions[txForm.type]"
                class="flex items-start gap-2 px-3 py-2 rounded-secondary bg-background-subtle dark:bg-background-dark-subtle border border-surface-border dark:border-surface-dark-border"
              >
                <Circle class="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <span class="text-xs text-text-muted dark:text-text-dark-muted leading-relaxed">{{ txTypeDescriptions[txForm.type] }}</span>
              </div>
            </Transition>
          </div>

          <template v-if="txForm.type === 'FIAT_DEPOSIT' || isFiatWithdraw">
            <BaseInput
              v-model="txForm.symbol"
              label="Devise"
              placeholder="EUR"
              required
            />
          </template>

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
              (txForm.type === 'FIAT_DEPOSIT' || isFiatWithdraw) ? 'Montant (€)'
              : txForm.type === 'FEE' ? 'Quantité de gaz brûlée'
              : txForm.type === 'SELL_TO_FIAT' ? 'Quantité vendue / dépensée'
              : txForm.type === 'NON_TAXABLE_EXIT' ? 'Quantité envoyée / donnée'
              : txForm.type === 'TRANSFER_TO_ACCOUNT' ? 'Quantité à transférer'
              : 'Quantité reçue'
            "
            type="number"
            step="any"
            min="0"
            required
          />

          <div
            v-if="txForm.type === 'FIAT_DEPOSIT' && fiatDepositNegativeEurBalance !== null"
            class="flex items-start gap-2 px-3 py-2 rounded-secondary bg-info/5 dark:bg-info/10 border border-info/20"
          >
            <Circle class="w-3.5 h-3.5 text-info shrink-0 mt-0.5" />
            <span class="text-xs text-info leading-relaxed">
              Solde EUR actuel négatif sur ce compte :
              <strong>{{ formatEur(-fiatDepositNegativeEurBalance) }}</strong>.
              Ce dépôt commencera d'abord par combler ce déficit.
            </span>
          </div>

          <div v-if="txForm.type === 'SELL_TO_FIAT'" class="flex items-start gap-2 px-3 py-2 rounded-secondary bg-info/5 dark:bg-info/10 border border-info/20">
            <Circle class="w-3.5 h-3.5 text-info shrink-0 mt-0.5" />
            <span class="text-xs text-info leading-relaxed">
              Vente imposable — la contrepartie fiat est créditée au solde exchange. Utiliser <strong>Sortie non-imposable</strong> si aucun euro reçu.
            </span>
          </div>

          <div v-if="txForm.type === 'NON_TAXABLE_EXIT'" class="flex items-start gap-2 px-3 py-2 rounded-secondary bg-warning/5 dark:bg-warning/10 border border-warning/20">
            <Circle class="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
            <span class="text-xs text-warning leading-relaxed">Sortie non-imposable — aucun euro crédité, valeur de cession nulle. En cas de réception d’euros, utiliser <strong>Sortie imposable</strong>.</span>
          </div>

          <BaseInput
            v-if="txForm.type === 'CRYPTO_DEPOSIT'"
            v-model="txForm.eur_amount!"
            label="Coût de revient (EUR)"
            type="number"
            step="any"
            min="0"
            required
          />

          <BaseInput
            v-if="txForm.type === 'SELL_TO_FIAT'"
            v-model="txForm.eur_amount!"
            label="Montant reçu (EUR)"
            type="number"
            step="any"
            min="0"
            required
          />

          <BaseInput
            v-if="txForm.type === 'BUY_SPOT'"
            v-model="txForm.price_per_unit!"
            label="Prix unitaire (€)"
            type="number"
            step="any"
            min="0"
            required
          />

          <BaseInput
            v-if="!showQuoteStep && !['CRYPTO_DEPOSIT', 'SELL_TO_FIAT', 'FIAT_DEPOSIT', 'FIAT_WITHDRAW', 'FEE', 'BUY_SPOT', 'NON_TAXABLE_EXIT', 'TRANSFER_TO_ACCOUNT'].includes(txForm.type)"
            v-model="txForm.price_per_unit!"
            label="Prix unitaire (€)"
            type="number"
            step="any"
            min="0"
          />

          <BaseSelect
            v-if="txForm.type === 'TRANSFER_TO_ACCOUNT'"
            v-model="transferToAccountId"
            label="Compte de destination"
            :options="crypto.accounts.filter(a => a.id !== txForm.account_id).map(a => ({ label: a.name, value: a.id }))"
            required
          />

          <div
            v-if="txForm.type === 'TRANSFER_TO_ACCOUNT'"
            class="flex items-start gap-2 px-3 py-2.5 rounded-secondary bg-info/5 dark:bg-info/10 border border-info/20"
          >
            <Circle class="w-3.5 h-3.5 text-info shrink-0 mt-0.5" />
            <span class="text-xs text-info leading-relaxed">
              L'ancre EUR du compte crédité sera calculée automatiquement : <strong>Quantité × PRU actuel du compte débité</strong>. Le coût de revient se transfère à l'identique, sans événement fiscal.
            </span>
          </div>

          <BaseInput v-model="txForm.executed_at" label="Date d'exécution" type="datetime-local" required />

          <!-- Bank account option — FIAT_DEPOSIT deducts, FIAT_WITHDRAW credits -->
          <div v-if="txForm.type === 'FIAT_DEPOSIT' || isFiatWithdraw" class="rounded-card border border-surface-border dark:border-surface-dark-border p-4 space-y-3">
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                v-model="deductFromBank"
                class="h-4 w-4 rounded accent-primary"
              />
              <span class="text-sm font-medium text-text-main dark:text-text-dark-main">
                {{ txForm.type === 'FIAT_DEPOSIT' ? 'Déduire de mon compte bancaire' : 'Créditer mon compte bancaire' }}
              </span>
            </label>

            <div v-if="deductFromBank && sortedBankAccounts.length" class="space-y-2">
              <label class="block text-xs text-text-muted dark:text-text-dark-muted">{{ txForm.type === 'FIAT_DEPOSIT' ? 'Compte source' : 'Compte de destination' }}</label>
              <select
                v-model="selectedBankAccountId"
                class="w-full px-3 py-2 text-sm rounded-input border border-surface-border dark:border-surface-dark-border bg-surface dark:bg-surface-dark text-text-main dark:text-text-dark-main focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option
                  v-for="acc in sortedBankAccounts"
                  :key="acc.id"
                  :value="acc.id"
                >
                  {{ acc.name }} — {{ formatCurrency(acc.balance) }}
                </option>
              </select>
            </div>

            <p v-if="deductFromBank && !sortedBankAccounts.length" class="text-xs text-text-muted dark:text-text-dark-muted">
              Aucun compte bancaire configuré.
            </p>
          </div>
        </div>

        <div v-else-if="wizardStep === 2 && showQuoteStep" class="space-y-5">

          <div>
            <p class="text-sm font-medium text-text-main dark:text-text-dark-main">Contrepartie</p>
            <p class="text-xs text-text-muted dark:text-text-dark-muted mt-0.5">Indiquez le montant échangé en retour de votre opération.</p>
          </div>

          <div class="flex items-center gap-3 px-4 py-3 rounded-card bg-primary/5 dark:bg-primary/10 border border-primary/15">
            <div class="w-8 h-8 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0">
              <Plus class="w-4 h-4 text-primary" />
            </div>
            <div class="min-w-0">
              <p class="text-xs text-text-muted dark:text-text-dark-muted">Reçu</p>
              <p class="text-sm font-bold text-text-main dark:text-text-dark-main tabular-nums">{{ txForm.amount }} {{ txForm.symbol }}</p>
            </div>
          </div>

          <template v-if="txForm.type === 'BUY_FIAT'">
            <BaseInput
              v-model="txForm.quote_amount!"
              label="Montant EUR dépensé"
              type="number"
              step="any"
              min="0"
              required
            />
          </template>

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

          <Transition
            enter-active-class="transition-all duration-300"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
          >
            <div
              v-if="calculatedPricePerUnit"
              class="rounded-card bg-linear-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 border border-primary/20 px-5 py-4"
            >
              <p class="text-[10px] font-semibold uppercase tracking-wider text-primary/70 mb-1.5">Prix unitaire calculé</p>
              <p class="text-2xl font-bold text-text-main dark:text-text-dark-main tabular-nums">
                1 {{ txForm.symbol }} ≈ {{ calculatedPricePerUnit.toLocaleString('fr-FR', { maximumFractionDigits: 4 }) }} €
              </p>
            </div>
          </Transition>
        </div>

        <div v-else-if="wizardStep === 3 && showFeeStep" class="space-y-5">

          <div>
            <p class="text-sm font-medium text-text-main dark:text-text-dark-main">Frais</p>
            <p class="text-xs text-text-muted dark:text-text-dark-muted mt-0.5">Configurez les frais éventuels liés à cette transaction.</p>
          </div>

          <template v-if="txForm.type !== 'BUY_SPOT' && txForm.type !== 'NON_TAXABLE_EXIT' && txForm.type !== 'TRANSFER_TO_ACCOUNT'">
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

            <div v-if="feeMode === 'none'" class="flex items-center gap-1.5">
              <Circle class="w-3.5 h-3.5 text-text-muted dark:text-text-dark-muted shrink-0" />
              <span class="text-[11px] text-text-muted dark:text-text-dark-muted leading-relaxed">Aucun frais comptabilisé. Le PRU est calculé sur le montant brut.</span>
            </div>

            <template v-else-if="feeMode === 'included'">
              <div class="flex items-center gap-1.5">
                <Circle class="w-3.5 h-3.5 text-text-muted dark:text-text-dark-muted shrink-0" />
                <span class="text-[11px] text-text-muted dark:text-text-dark-muted leading-relaxed">Les frais sont inclus dans le montant. Le PRU intègre la totalité.</span>
              </div>
            </template>

            <template v-else>
              <div class="space-y-3">
                <label class="block text-sm font-medium text-text-main dark:text-text-dark-main">
                  Montant des frais <span class="text-danger ml-0.5">*</span>
                </label>

                <div class="relative">
                  <input
                    :value="feeDisplayValue"
                    @input="onUnifiedFeeInput(($event.target as HTMLInputElement).value)"
                    type="text"
                    inputmode="decimal"
                    required
                    :placeholder="feeInputMode === 'eur' ? '0.00' : '0.00'"
                    class="w-full pl-4 pr-26 py-3 rounded-input border border-surface-border dark:border-surface-dark-border bg-surface dark:bg-surface-dark text-lg font-semibold tabular-nums text-text-main dark:text-text-dark-main placeholder:text-text-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-150"
                  />
                  <!-- Embedded unit toggle pill -->
                  <div class="absolute inset-y-0 right-2 flex items-center">
                    <div class="flex items-center bg-background-subtle dark:bg-background-dark rounded-button p-0.5 border border-surface-border/60 dark:border-surface-dark-border/60 shadow-sm">
                      <button
                        type="button"
                        @click="feeInputMode = 'eur'"
                        :class="[
                          'relative z-10 px-3 py-1 text-xs font-bold rounded-secondary transition-all duration-200',
                          feeInputMode === 'eur'
                            ? 'bg-primary text-primary-content shadow-sm scale-105'
                            : 'text-text-muted dark:text-text-dark-muted hover:text-text-main dark:hover:text-text-dark-main',
                        ]"
                      >EUR</button>
                      <button
                        type="button"
                        @click="feeInputMode = 'percent'"
                        :class="[
                          'relative z-10 px-3 py-1 text-xs font-bold rounded-secondary transition-all duration-200',
                          feeInputMode === 'percent'
                            ? 'bg-primary text-primary-content shadow-sm scale-105'
                            : 'text-text-muted dark:text-text-dark-muted hover:text-text-main dark:hover:text-text-dark-main',
                        ]"
                      >%</button>
                    </div>
                  </div>
                </div>

                <!-- Live conversion display -->
                <Transition
                  enter-active-class="transition-all duration-300 ease-out"
                  enter-from-class="opacity-0 -translate-y-1"
                  enter-to-class="opacity-100 translate-y-0"
                  leave-active-class="transition-all duration-200 ease-in"
                  leave-from-class="opacity-100 translate-y-0"
                  leave-to-class="opacity-0 -translate-y-1"
                >
                  <div v-if="feeConversionDisplay" class="flex items-center gap-2 pl-0.5">
                    <div class="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10">
                      <ArrowLeftRight class="w-3 h-3 text-primary" />
                    </div>
                    <span class="text-xs text-text-muted dark:text-text-dark-muted">
                      ≈ <span class="font-semibold text-primary">{{ feeConversionDisplay }}</span>
                    </span>
                  </div>
                </Transition>
              </div>

              <Transition enter-active-class="transition-all duration-200" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100">
                <div
                  v-if="txForm.fee_eur && Number(txForm.fee_eur) > 0"
                  class="rounded-card bg-linear-to-br from-warning/5 to-warning/10 dark:from-warning/10 dark:to-warning/20 border border-warning/20 px-5 py-3.5"
                >
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-warning/70 mb-1">Coût total</p>
                  <p class="text-xl font-bold text-text-main dark:text-text-dark-main tabular-nums">
                    {{ (Number(txForm.quote_amount || txForm.eur_amount || 0) + Number(txForm.fee_eur)).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) }}&nbsp;€
                  </p>
                </div>
              </Transition>
            </template>

            <Transition enter-active-class="transition-all duration-300" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100">
              <div
                v-if="previewPru"
                class="rounded-card bg-linear-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 border border-primary/20 px-5 py-4"
              >
                <div class="flex items-center justify-between mb-1.5">
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-primary/70">PRU prévisionnel</p>
                  <span v-if="feeMode === 'separate'" class="text-[10px] font-medium text-warning bg-warning/10 px-1.5 py-0.5 rounded-badge">frais inclus</span>
                </div>
                <p class="text-2xl font-bold text-text-main dark:text-text-dark-main tabular-nums">
                  1&nbsp;{{ txForm.symbol }}&nbsp;=&nbsp;{{ previewPru.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 6 }) }}&nbsp;€
                </p>
              </div>
            </Transition>

            <div v-if="feeMode !== 'none'" class="border-t border-surface-border dark:border-surface-dark-border pt-4 space-y-3">
              <div>
                <p class="text-xs font-semibold text-text-muted dark:text-text-dark-muted uppercase tracking-wider">
                  Frais en token
                  <span class="ml-1 text-[10px] font-normal normal-case tracking-normal">(optionnel)</span>
                </p>
                <p class="text-[11px] text-text-muted dark:text-text-dark-muted mt-0.5">Si les frais ont été prélevés dans un autre token (ex : BNB, ETH).</p>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <BaseInput
                  v-model="txForm.fee_symbol!"
                  label="Symbole du token"
                  @input="(e: Event) => { txForm.fee_symbol = (e.target as HTMLInputElement).value.toUpperCase() }"
                />
                <BaseInput
                  v-model="txForm.fee_amount!"
                  label="Quantité"
                  type="number"
                  step="any"
                  min="0"
                />
              </div>
              <Transition enter-active-class="transition-all duration-200" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100">
                <div
                  v-if="txForm.fee_symbol && txForm.fee_amount && Number(txForm.fee_amount) > 0"
                  class="rounded-secondary bg-info/10 border border-info/20 px-3 py-2 flex items-center gap-2"
                >
                  <Check class="w-3.5 h-3.5 text-info shrink-0" />
                  <p class="text-xs text-info">{{ txForm.fee_amount }} {{ txForm.fee_symbol }} seront déduits du solde.</p>
                </div>
              </Transition>
            </div>
          </template>

          <template v-else-if="txForm.type === 'TRANSFER_TO_ACCOUNT'">
            <!-- Toggle 2 options -->
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
                @click="feeMode = 'token'; txForm.fee_included = false; txForm.fee_eur = undefined; txForm.fee_percentage = undefined"
                :class="[
                  'px-3 py-1.5 text-sm font-medium rounded-secondary transition-all',
                  feeMode === 'token'
                    ? 'bg-primary text-primary-content shadow-sm'
                    : 'text-text-muted dark:text-text-dark-muted hover:text-text-main dark:hover:text-text-dark-main',
                ]"
              >Frais on-chain</button>
            </div>

            <div v-if="feeMode === 'none'" class="flex items-center gap-1.5">
              <Circle class="w-3.5 h-3.5 text-text-muted dark:text-text-dark-muted shrink-0" />
              <span class="text-[11px] text-text-muted dark:text-text-dark-muted leading-relaxed">Aucun frais de réseau. Le solde est débité uniquement du montant transféré.</span>
            </div>

            <template v-else-if="feeMode === 'token'">
              <div class="space-y-3">
                <p class="text-xs text-text-muted dark:text-text-dark-muted">Frais de réseau prélevés dans un token (ex : ETH pour le gaz, BNB, SOL…)</p>
                <div class="grid grid-cols-2 gap-3">
                  <BaseInput
                    v-model="txForm.fee_symbol!"
                    label="Token de frais"
                    placeholder="ETH, BNB…"
                    @input="(e: Event) => { txForm.fee_symbol = (e.target as HTMLInputElement).value.toUpperCase() }"
                    required
                  />
                  <BaseInput
                    v-model="txForm.fee_amount!"
                    label="Quantité prélevée"
                    type="number"
                    step="any"
                    min="0"
                    required
                  />
                </div>
                <Transition enter-active-class="transition-all duration-200" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100">
                  <div
                    v-if="txForm.fee_symbol && txForm.fee_amount && Number(txForm.fee_amount) > 0"
                    class="rounded-secondary bg-info/10 border border-info/20 px-3 py-2 flex items-center gap-2"
                  >
                    <Check class="w-3.5 h-3.5 text-info shrink-0" />
                    <p class="text-xs text-info">{{ txForm.fee_amount }} {{ txForm.fee_symbol }} seront déduits du solde du compte source.</p>
                  </div>
                </Transition>
              </div>
            </template>
          </template>

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

            <div v-if="feeMode === 'none'" class="flex items-center gap-1.5">
              <Circle class="w-3.5 h-3.5 text-text-muted dark:text-text-dark-muted shrink-0" />
              <span class="text-[11px] text-text-muted dark:text-text-dark-muted leading-relaxed">Aucun frais comptabilisé. Le PRU reste calculé sur la cotation précédente.</span>
            </div>

            <template v-else-if="feeMode === 'included'">
              <div class="flex items-center gap-1.5">
                <Circle class="w-3.5 h-3.5 text-text-muted dark:text-text-dark-muted shrink-0" />
                <span class="text-[11px] text-text-muted dark:text-text-dark-muted leading-relaxed">Frais inclus dans le taux de change. Une ligne FEE sera créée pour débiter le solde.</span>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <BaseInput
                  v-model="txForm.fee_symbol!"
                  label="Symbole du token"
                  @input="(e: Event) => { txForm.fee_symbol = (e.target as HTMLInputElement).value.toUpperCase() }"
                  required
                />
                <BaseInput
                  v-model="txForm.fee_amount!"
                  label="Quantité"
                  type="number"
                  step="any"
                  min="0"
                  required
                />
              </div>
              <Transition enter-active-class="transition-all duration-200" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100">
                <div
                  v-if="txForm.fee_symbol && txForm.fee_amount && Number(txForm.fee_amount) > 0"
                  class="rounded-secondary bg-info/10 border border-info/20 px-3 py-2 flex items-center gap-2"
                >
                  <Check class="w-3.5 h-3.5 text-info shrink-0" />
                  <p class="text-xs text-info">{{ txForm.fee_amount }} {{ txForm.fee_symbol }} seront déduits de ton solde. PRU inchangé.</p>
                </div>
              </Transition>
            </template>

            <!-- Frais séparés : fee_eur requis → augmente le PRU -->
            <template v-else-if="feeMode === 'separate'">
              <div class="space-y-3">
                <!-- Label -->
                <label class="block text-sm font-medium text-text-main dark:text-text-dark-main">
                  Montant des frais <span class="text-danger ml-0.5">*</span>
                </label>

                <!-- Input + unit toggle -->
                <div class="relative">
                  <input
                    :value="feeDisplayValue"
                    @input="onUnifiedFeeInput(($event.target as HTMLInputElement).value)"
                    type="text"
                    inputmode="decimal"
                    required
                    :placeholder="feeInputMode === 'eur' ? '0.00' : '0.00'"
                    class="w-full pl-4 pr-26 py-3 rounded-input border border-surface-border dark:border-surface-dark-border bg-surface dark:bg-surface-dark text-lg font-semibold tabular-nums text-text-main dark:text-text-dark-main placeholder:text-text-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-150"
                  />
                  <!-- Embedded unit toggle pill -->
                  <div class="absolute inset-y-0 right-2 flex items-center">
                    <div class="flex items-center bg-background-subtle dark:bg-background-dark rounded-button p-0.5 border border-surface-border/60 dark:border-surface-dark-border/60 shadow-sm">
                      <button
                        type="button"
                        @click="feeInputMode = 'eur'"
                        :class="[
                          'relative z-10 px-3 py-1 text-xs font-bold rounded-secondary transition-all duration-200',
                          feeInputMode === 'eur'
                            ? 'bg-primary text-primary-content shadow-sm scale-105'
                            : 'text-text-muted dark:text-text-dark-muted hover:text-text-main dark:hover:text-text-dark-main',
                        ]"
                      >EUR</button>
                      <button
                        type="button"
                        @click="feeInputMode = 'percent'"
                        :class="[
                          'relative z-10 px-3 py-1 text-xs font-bold rounded-secondary transition-all duration-200',
                          feeInputMode === 'percent'
                            ? 'bg-primary text-primary-content shadow-sm scale-105'
                            : 'text-text-muted dark:text-text-dark-muted hover:text-text-main dark:hover:text-text-dark-main',
                        ]"
                      >%</button>
                    </div>
                  </div>
                </div>

                <!-- Live conversion display -->
                <Transition
                  enter-active-class="transition-all duration-300 ease-out"
                  enter-from-class="opacity-0 -translate-y-1"
                  enter-to-class="opacity-100 translate-y-0"
                  leave-active-class="transition-all duration-200 ease-in"
                  leave-from-class="opacity-100 translate-y-0"
                  leave-to-class="opacity-0 -translate-y-1"
                >
                  <div v-if="feeConversionDisplay" class="flex items-center gap-2 pl-0.5">
                    <div class="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10">
                      <ArrowLeftRight class="w-3 h-3 text-primary" />
                    </div>
                    <span class="text-xs text-text-muted dark:text-text-dark-muted">
                      ≈ <span class="font-semibold text-primary">{{ feeConversionDisplay }}</span>
                    </span>
                  </div>
                </Transition>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <BaseInput
                  v-model="txForm.fee_symbol!"
                  label="Symbole du token"
                  @input="(e: Event) => { txForm.fee_symbol = (e.target as HTMLInputElement).value.toUpperCase() }"
                  required
                />
                <BaseInput
                  v-model="txForm.fee_amount!"
                  label="Quantité"
                  type="number"
                  step="any"
                  min="0"
                  required
                />
              </div>

              <Transition enter-active-class="transition-all duration-300" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100">
                <div
                  v-if="txForm.fee_eur && Number(txForm.fee_eur) > 0"
                  class="rounded-card bg-linear-to-br from-warning/5 to-warning/10 dark:from-warning/10 dark:to-warning/20 border border-warning/20 px-5 py-4 space-y-3"
                >
                  <div>
                    <p class="text-[10px] font-semibold uppercase tracking-wider text-warning/70 mb-1">Coût total</p>
                    <p class="text-xl font-bold text-text-main dark:text-text-dark-main tabular-nums">
                      {{ (Number(txForm.eur_amount || 0) + Number(txForm.fee_eur)).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) }}&nbsp;€
                    </p>
                  </div>
                  <div v-if="previewPru" class="border-t border-warning/20 pt-3">
                    <div class="flex items-center justify-between mb-1">
                      <p class="text-[10px] font-semibold uppercase tracking-wider text-primary/70">PRU prévisionnel</p>
                      <span class="text-[10px] font-medium text-warning bg-warning/10 px-1.5 py-0.5 rounded-badge">frais inclus</span>
                    </div>
                    <p class="text-xl font-bold text-text-main dark:text-text-dark-main tabular-nums">
                      1&nbsp;{{ txForm.symbol }}&nbsp;=&nbsp;{{ previewPru.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 6 }) }}&nbsp;€
                    </p>
                  </div>
                </div>
              </Transition>
            </template>
          </template>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between w-full">
          <!-- Edit footer -->
          <template v-if="editingTxId">
            <BaseButton variant="danger" @click="deleteTransaction(editingTxId)">Supprimer</BaseButton>
            <div class="flex gap-2">
              <BaseButton variant="ghost" @click="showTxModal = false">Annuler</BaseButton>
              <BaseButton :loading="crypto.isLoading" @click="handleSubmitTransaction">Enregistrer</BaseButton>
            </div>
          </template>

          <!-- Wizard footer -->
          <template v-else>
            <div>
              <BaseButton v-if="wizardStep > 1" variant="ghost" @click="prevWizardStep">
                <span class="flex items-center gap-1">
                  <ChevronLeft class="w-4 h-4" />
                  Retour
                </span>
              </BaseButton>
            </div>
            <div class="flex gap-2">
              <BaseButton variant="ghost" @click="showTxModal = false">Annuler</BaseButton>
              <template v-if="isLastStep">
                <BaseButton :loading="crypto.isLoading || bank.isLoading" @click="handleSubmitTransaction">
                  <span class="flex items-center gap-1.5">
                    <Check class="w-4 h-4" />
                    Confirmer
                  </span>
                </BaseButton>
              </template>
              <BaseButton v-else @click="nextWizardStep">
                <span class="flex items-center gap-1">
                  Continuer
                  <ChevronRight class="w-4 h-4" />
                </span>
              </BaseButton>
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
      :accounts="crypto.accounts"
      :on-import="handleCsvImport"
      @update:account-id="id => csvImportAccountId = id"
      @close="showCsvImportModal = false"
    />

    <!-- ── Binance Import Modal ────────────────────────── -->
    <BinanceImportModal
      :open="showBinanceImportModal"
      :account-id="binanceImportAccountId || ''"
      :accounts="crypto.accounts"
      @update:account-id="id => binanceImportAccountId = id"
      @close="showBinanceImportModal = false"
      @imported="handleBinanceImported"
    />
  </div>
</template>