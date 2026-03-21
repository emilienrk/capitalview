<script setup lang="ts">
import { Pencil, TrendingUp, Upload, Banknote } from 'lucide-vue-next'

import { onMounted, ref, reactive, computed } from 'vue'
import { useStocksStore } from '@/stores/stocks'
import { useBankStore } from '@/stores/bank'
import { useFormatters } from '@/composables/useFormatters'
import { useCurrencyToggle } from '@/composables/useCurrencyToggle'
import { usePrivacyMode } from '@/composables/usePrivacyMode'
import PageHeader from '@/components/PageHeader.vue'
import {
  BaseCard, BaseButton, BaseInput, BaseSelect, BaseModal,
  BaseSpinner, BaseAlert, BaseEmptyState, BaseBadge, BaseStatCard, BaseAutocomplete,
} from '@/components'
import CsvImportModal from '@/components/CsvImportModal.vue'
import type { StockAccountCreate, StockTransactionCreate, StockAccountType, TransactionResponse, AssetSearchResult, StockTransactionBulkCreate, PositionResponse, EurDepositCreate } from '@/types'


const stocks = useStocksStore()
const bank = useBankStore()
const { formatCurrency, formatPercent, formatNumber, formatDate, profitLossClass } = useFormatters()
const { displayCurrency, usdToEurRate, setCurrency, fetchRate } = useCurrencyToggle()
const { privacyMode, togglePrivacyMode, maskValue } = usePrivacyMode()

// ── State ────────────────────────────────────────────────────
const showAccountModal = ref(false)
const showTxModal = ref(false)
const showDeleteModal = ref(false)
const showCsvImportModal = ref(false)
const showDepositModal = ref(false)
const depositAccountId = ref<string | null>(null)
const editingDepositId = ref<string | null>(null)
const deductFromBank = ref(true)
const selectedBankAccountId = ref<string | null>(null)
const csvImportAccountId = ref<string | null>(null)
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
  identifier: '',
})

const txForm = reactive<StockTransactionCreate>({
  account_id: '',
  symbol: '',
  isin: '',
  exchange: '',
  type: 'BUY',
  amount: 0,
  price_per_unit: 0,
  fees: 0,
  executed_at: new Date().toISOString().slice(0, 16),
})

const depositForm = reactive<EurDepositCreate>({
  amount: 0,
  executed_at: new Date().toISOString().slice(0, 16),
  notes: '',
})

/** Sorted bank accounts: CHECKING first, then others */
const sortedBankAccounts = computed(() => {
  const accounts = bank.summary?.accounts ?? []
  return [...accounts].sort((a, b) => {
    if (a.account_type === 'CHECKING') return -1
    if (b.account_type === 'CHECKING') return 1
    return 0
  })
})

// ── Unified asset search ─────────────────────────────────────
interface AssetOption {
  symbol: string
  isin: string | null
  name: string | null
  exchange: string | null
  _source: 'known' | 'api'
}
const assetQuery = ref('')
const assetOptions = ref<AssetOption[]>([])
const isAssetSearching = ref(false)
const assetError = ref<string | null>(null)
const showExchange = ref(false)

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

/** Deduplicated list of known assets from existing transactions, shown by default in the asset picker */
const knownAssetOptions = computed((): AssetOption[] => {
  const seen = new Map<string, AssetOption>()
  for (const tx of stocks.transactions) {
    if (tx.isin === 'EUR') continue  // EUR cash is not a tradable asset
    const key = tx.isin || `${tx.symbol}__${tx.exchange ?? ''}`
    if (!seen.has(key)) {
      seen.set(key, {
        symbol: tx.symbol,
        isin: tx.isin,
        name: tx.name,
        exchange: tx.exchange,
        _source: 'known',
      })
    }
  }
  return Array.from(seen.values())
    .sort((a, b) => (a.name ?? a.symbol).localeCompare(b.name ?? b.symbol))
})

function formatAssetOption(opt: AssetOption): string {
  const parts: string[] = [opt.symbol]
  if (opt.name) parts.push(opt.name)
  if (opt.isin) parts.push(`(${opt.isin})`)
  return parts.join(' – ')
}

function handleSelectUnifiedAsset(asset: AssetOption): void {
  txForm.symbol = asset.symbol
  txForm.isin = asset.isin ?? ''
  txForm.exchange = asset.exchange ?? ''
  if (asset.name) txForm.name = asset.name
  assetQuery.value = formatAssetOption(asset)
  assetError.value = null
  if (asset.exchange) showExchange.value = true
}

/** Show currency toggle only if current account has at least one non-EUR position */
const canToggleCurrency = computed(() =>
  selectedAccountSummary.value?.positions?.some(p => p.currency && p.currency !== 'EUR') ?? false
)

// ── Currency helpers ─────────────────────────────────────────
/** Convert a position value to EUR using the live rate (assumes non-EUR = USD) */
function posToEur(value: number | string | null | undefined, currency: string): number | null {
  if (value == null) return null
  const n = Number(value)
  if (isNaN(n)) return null
  if (currency && currency !== 'EUR') return n * usdToEurRate.value
  return n
}

/** Format a market price in the active display currency */
function formatPosPrice(value: number | string | null | undefined, currency: string): string {
  const c = currency || 'EUR'
  if (c !== 'EUR' && displayCurrency.value === 'EUR') {
    return formatCurrency(posToEur(value, c), 'EUR')
  }
  return formatCurrency(value, c)
}

/** Format PRU: always entered in EUR, convert to native in USD mode */
function formatPru(avgBuyPrice: number | string, currency: string): string {
  const c = currency || 'EUR'
  if (c !== 'EUR' && displayCurrency.value === 'USD') {
    const rate = usdToEurRate.value
    return formatCurrency(rate > 0 ? Number(avgBuyPrice) / rate : Number(avgBuyPrice), c)
  }
  return formatCurrency(avgBuyPrice, 'EUR')
}

/** P&L in EUR (total_invested is always EUR as entered by user) */
function posProfitLossEur(pos: PositionResponse): number | null {
  if (pos.current_value == null) return null
  return posToEur(pos.current_value, pos.currency) as number - Number(pos.total_invested)
}

function posProfitLossPctEur(pos: PositionResponse): number | null {
  const pl = posProfitLossEur(pos)
  if (pl == null) return null
  const inv = Number(pos.total_invested)
  return inv > 0 ? (pl / inv) * 100 : 0
}

/** Transactions sorted from most recent to oldest. */
const sortedTransactions = computed(() => {
  return [...accountTransactions.value].sort(
    (a, b) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime()
  )
})

/** EUR cash position (isin='EUR') from account summary, if any. */
const eurPosition = computed(() =>
  selectedAccountSummary.value?.positions?.find(p => p.isin === 'EUR') ?? null
)

/** Positions sorted by total invested (descending) — EUR cash excluded, shown separately. */
const sortedPositions = computed(() => {
  if (!selectedAccountSummary.value?.positions) return []
  return [...selectedAccountSummary.value.positions]
    .filter(p => p.isin !== 'EUR')
    .sort((a, b) => Number(b.total_invested ?? 0) - Number(a.total_invested ?? 0))
})

// ── Actions ──────────────────────────────────────────────────
function openCreateAccount(): void {
  editingAccountId.value = null
  accountForm.name = ''
  // Default to CTO, or PEA if no PEA exists yet
  accountForm.account_type = hasPea.value ? 'CTO' : 'PEA'
  accountForm.institution_name = ''
  accountForm.identifier = ''
  showAccountModal.value = true
}

function openEditAccount(account: any): void {
  editingAccountId.value = account.id
  accountForm.name = account.name
  accountForm.account_type = account.account_type
  accountForm.institution_name = account.institution_name || ''
  accountForm.identifier = account.identifier || ''
  showAccountModal.value = true
}

async function handleSubmitAccount(): Promise<void> {
  let result
  if (editingAccountId.value) {
    result = await stocks.updateAccount(editingAccountId.value, { ...accountForm })
  } else {
    result = await stocks.createAccount({ ...accountForm })
  }
  if (result) {
    showAccountModal.value = false
  }
}

function openAddTransaction(accountId: string): void {
  editingTxId.value = null
  txForm.account_id = accountId
  txForm.symbol = ''
  txForm.isin = ''
  txForm.exchange = ''
  txForm.type = 'BUY'
  txForm.amount = 0
  txForm.price_per_unit = 0
  txForm.fees = 0
  txForm.executed_at = new Date().toISOString().slice(0, 16)
  assetQuery.value = ''
  assetOptions.value = knownAssetOptions.value
  assetError.value = null
  showExchange.value = false
  showTxModal.value = true
}

function openCsvImport(accountId: string): void {
  csvImportAccountId.value = accountId
  showCsvImportModal.value = true
}

async function openDeposit(accountId: string): Promise<void> {
  depositAccountId.value = accountId
  editingDepositId.value = null
  depositForm.amount = 0
  depositForm.executed_at = new Date().toISOString().slice(0, 16)
  depositForm.notes = ''
  deductFromBank.value = true
  // Fetch bank accounts to pre-select
  await bank.fetchAccounts()
  const first = sortedBankAccounts.value[0]
  selectedBankAccountId.value = first?.id ?? null
  showDepositModal.value = true
}

function openEditDeposit(tx: TransactionResponse): void {
  depositAccountId.value = selectedAccountId.value
  editingDepositId.value = tx.id
  depositForm.amount = tx.amount
  depositForm.executed_at = tx.executed_at.slice(0, 16)
  depositForm.notes = tx.notes ?? ''
  // Don't deduct from bank: the deduction already happened at creation
  deductFromBank.value = false
  showDepositModal.value = true
}

async function handleSubmitDeposit(): Promise<void> {
  if (depositForm.amount <= 0) {
    alert('Le montant doit être strictement positif.')
    return
  }

  // Editing an existing deposit
  if (editingDepositId.value) {
    const result = await stocks.updateTransaction(editingDepositId.value, {
      amount: depositForm.amount,
      executed_at: depositForm.executed_at,
      notes: depositForm.notes || undefined,
    })
    if (result) {
      showDepositModal.value = false
      if (selectedAccountId.value) {
        await Promise.all([
          stocks.fetchAccount(selectedAccountId.value),
          fetchAccountTransactions(selectedAccountId.value),
        ])
      }
    }
    return
  }

  // Check if selected bank account has enough balance
  if (deductFromBank.value && selectedBankAccountId.value) {
    const bankAcc = sortedBankAccounts.value.find(a => a.id === selectedBankAccountId.value)
    if (bankAcc && Number(bankAcc.balance) < Number(depositForm.amount)) {
      const ok = confirm(
        `Le solde du compte « ${bankAcc.name} » (${formatCurrency(bankAcc.balance)}) est insuffisant. Continuer quand même ?`
      )
      if (!ok) return
    }
  }

  const result = await stocks.depositEur(depositAccountId.value!, {
    amount: depositForm.amount,
    executed_at: depositForm.executed_at,
    notes: depositForm.notes || undefined,
  })
  if (result) {
    // Deduct from bank account if requested
    if (deductFromBank.value && selectedBankAccountId.value) {
      const bankAcc = sortedBankAccounts.value.find(a => a.id === selectedBankAccountId.value)
      if (bankAcc) {
        await bank.updateAccount(selectedBankAccountId.value, {
          balance: Number(bankAcc.balance) - Number(depositForm.amount),
        })
      }
    }
    showDepositModal.value = false
    if (selectedAccountId.value) {
      await Promise.all([
        stocks.fetchAccount(selectedAccountId.value),
        fetchAccountTransactions(selectedAccountId.value),
      ])
    }
  }
}

async function handleCsvImport(transactions: StockTransactionBulkCreate[]): Promise<boolean> {
  if (!csvImportAccountId.value) return false

  const result = await stocks.bulkImportTransactions(csvImportAccountId.value, transactions)
  
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
  txForm.isin = tx.isin || ''
  txForm.exchange = tx.exchange
  txForm.type = tx.type
  txForm.amount = tx.amount
  txForm.price_per_unit = tx.price_per_unit
  txForm.fees = tx.fees
  txForm.executed_at = tx.executed_at.slice(0, 16)
  // Pre-fill unified asset field from known assets or raw tx data
  const knownMatch = knownAssetOptions.value.find(k =>
    (tx.isin && k.isin === tx.isin) || k.symbol === tx.symbol
  )
  assetQuery.value = knownMatch
    ? formatAssetOption(knownMatch)
    : tx.name ? `${tx.symbol} – ${tx.name}` : tx.symbol
  assetOptions.value = knownAssetOptions.value
  assetError.value = null
  showExchange.value = !!tx.exchange
  showTxModal.value = true
}

async function handleSubmitTransaction(): Promise<void> {
  if (!txForm.isin || txForm.isin.trim() === '') {
    alert("L'ISIN est obligatoire.")
    return
  }

  // Basic ISIN format check (2 letters + 9 alphanum + 1 digit/char check) - length 12
  if (txForm.isin.length !== 12) {
      alert("Format ISIN invalide (doit faire 12 caractères).")
      return
  }

  if (txForm.amount <= 0) {
    alert("La quantité doit être strictement positive.")
    return
  }
  if (txForm.price_per_unit < 0 || (txForm.fees !== undefined && txForm.fees < 0)) {
    alert("Le prix et les frais doivent être positifs ou nuls.")
    return
  }

  let result
  if (editingTxId.value) {
    result = await stocks.updateTransaction(editingTxId.value, { ...txForm })
  } else {
    result = await stocks.createTransaction({ ...txForm })
  }
  if (result) {
    showTxModal.value = false
    if (selectedAccountId.value) {
      await Promise.all([
        stocks.fetchAccount(selectedAccountId.value),
        fetchAccountTransactions(selectedAccountId.value)
      ])
    }
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
  // First load: fast cached data from DB
  await Promise.all([
    stocks.fetchAccount(id, true),
    fetchAccountTransactions(id)
  ])
  // Then refresh in background with live market data
  stocks.refreshAccount(id)
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

// ISIN-like detection: 2 letters + at least 3 alphanumeric, no spaces
const ISIN_LIKE_RE = /^[A-Za-z]{2}[A-Za-z0-9]{3,}$/

let assetSearchTimeout: ReturnType<typeof setTimeout> | null = null
async function handleAssetInput(value: string): Promise<void> {
  // Cancel any pending API search immediately, before any early return
  if (assetSearchTimeout) {
    clearTimeout(assetSearchTimeout)
    assetSearchTimeout = null
  }
  isAssetSearching.value = false

  assetQuery.value = value
  assetError.value = null

  const q = value.trim().toLowerCase()

  // Always filter known assets immediately (client-side)
  const knownMatches: AssetOption[] = !q
    ? knownAssetOptions.value
    : knownAssetOptions.value.filter(a =>
        a.symbol.toLowerCase().includes(q) ||
        (a.name?.toLowerCase().includes(q) ?? false) ||
        (a.isin?.toLowerCase().includes(q) ?? false)
      )

  // Decide whether to also call the API:
  // - fewer than 3 known matches AND at least 2 chars typed
  // - OR the input looks like an ISIN (never in the known list by definition)
  const isIsinLike = ISIN_LIKE_RE.test(value) && !value.includes(' ')
  const needsApi = q.length >= 2 && (isIsinLike || knownMatches.length < 3)

  if (!needsApi) {
    assetOptions.value = knownMatches
    return
  }

  // Show known matches immediately, then append API results
  assetOptions.value = knownMatches

  if (assetSearchTimeout) clearTimeout(assetSearchTimeout)
  isAssetSearching.value = true

  assetSearchTimeout = setTimeout(async () => {
    try {
      const apiRaw: AssetSearchResult[] = await stocks.searchAssets(value)
      // Deduplicate: skip API results already covered by known assets or EUR
      const apiExtra: AssetOption[] = apiRaw
        .filter(r => r.isin !== 'EUR' && r.symbol !== 'EUR')
        .filter(r => !knownMatches.some(k =>
          (r.isin && r.isin === k.isin) || r.symbol === k.symbol
        ))
        .map(r => ({ symbol: r.symbol, isin: r.isin ?? null, name: r.name, exchange: r.exchange, _source: 'api' as const }))
      assetOptions.value = [...knownMatches, ...apiExtra]
    } catch {
      // keep current known matches on error
    } finally {
      isAssetSearching.value = false
    }
  }, 300)
}

// ── Lifecycle ────────────────────────────────────────────────
onMounted(() => {
  stocks.fetchAccounts()
  stocks.fetchTransactions()
  fetchRate()
})
</script>

<template>
  <div>
    <PageHeader title="Bourse" description="PEA, PEA-PME et Comptes-Titres">
      <template #actions>
        <BaseButton @click="openCreateAccount">+<span class="hidden sm:inline">&nbsp; Nouveau compte</span></BaseButton>
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
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          <div class="flex items-center gap-2 shrink-0 self-start">
            <BaseButton size="sm" variant="outline" @click.stop="openAddTransaction(account.id)">
              +<span class="hidden sm:inline">&nbsp; Transaction</span>
            </BaseButton>
            <BaseButton size="sm" variant="outline" @click.stop="openDeposit(account.id)" title="Déposer des euros">
              <Banknote class="w-4 h-4" /><span class="hidden sm:inline">&nbsp; Déposer</span>
            </BaseButton>
            <BaseButton size="sm" variant="outline" @click.stop="openCsvImport(account.id)" title="Importer CSV">
              <Upload class="w-4 h-4" />
              Importer
            </BaseButton>
            <BaseButton size="sm" variant="ghost" @click.stop="openEditAccount(account)">
              <Pencil class="w-4 h-4" />
            </BaseButton>
          </div>
        </div>

        <!-- Inline account detail when selected -->
        <div
          v-if="selectedAccountId === account.id && selectedAccountSummary"
          class="mt-6 pt-6 border-t border-surface-border dark:border-surface-dark-border"
        >
          <!-- Account summary stats -->
          <div :class="['grid gap-4 mb-6', eurPosition ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4']">
            <div>
              <p class="text-xs text-text-muted dark:text-text-dark-muted">Investi</p>
              <p class="text-lg font-bold text-text-main dark:text-text-dark-main">{{ maskValue(formatCurrency(selectedAccountSummary.total_invested)) }}</p>
            </div>
            <div v-if="eurPosition">
              <p class="text-xs text-text-muted dark:text-text-dark-muted">Euros</p>
              <p class="text-lg font-bold text-info">{{ maskValue(formatCurrency(eurPosition.current_value)) }}</p>
            </div>
            <div>
              <p class="text-xs text-text-muted dark:text-text-dark-muted">Valeur actuelle</p>
              <p class="text-lg font-bold text-text-main dark:text-text-dark-main">{{ maskValue(formatCurrency(selectedAccountSummary.current_value)) }}</p>
            </div>
            <div>
              <p class="text-xs text-text-muted dark:text-text-dark-muted">P/L</p>
              <p :class="['text-lg font-bold', profitLossClass(selectedAccountSummary.profit_loss)]">
                {{ maskValue(formatCurrency(selectedAccountSummary.profit_loss)) }}
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
          <div class="mb-4">
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

          <!-- Currency display toggle (only when account has non-EUR positions) -->
          <div v-if="canToggleCurrency && activeDetailTab === 'positions'" class="mb-5 flex items-center gap-2">
            <span class="text-xs text-text-muted dark:text-text-dark-muted">Affichage cours :</span>
            <div class="inline-flex bg-background-subtle dark:bg-background-dark-subtle rounded-lg p-0.5">
              <button
                v-for="opt in [{ key: 'EUR', label: '€ EUR' }, { key: 'USD', label: '$ Devise native' }]"
                :key="opt.key"
                @click="setCurrency(opt.key as 'EUR' | 'USD')"
                :class="[
                  'px-3 py-1 text-xs font-medium rounded-md transition-all duration-200',
                  displayCurrency === opt.key
                    ? 'bg-surface dark:bg-surface-dark text-text-main dark:text-text-dark-main shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                    : 'text-text-muted dark:text-text-dark-muted hover:text-text-main dark:hover:text-text-dark-main',
                ]"
              >
                {{ opt.label }}
              </button>
            </div>
            <span v-if="displayCurrency === 'USD'" class="text-xs text-info italic">
              P/L calculé en €
            </span>
          </div>

          <!-- Positions table -->
          <div v-if="activeDetailTab === 'positions'">
            <div v-if="sortedPositions.length" class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-xs text-text-muted dark:text-text-dark-muted uppercase tracking-wider border-b border-surface-border dark:border-surface-dark-border">
                    <th class="px-4 py-2">Nom</th>
                    <th class="px-4 py-2 text-right">Quantité</th>
                    <th class="px-4 py-2 text-right">PRU</th>
                    <th class="px-4 py-2 text-right">Investi (€)</th>
                    <th class="px-4 py-2 text-right">Cours</th>
                    <th class="px-4 py-2 text-right">Valeur</th>
                    <th class="px-4 py-2 text-right">P/L (€)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-surface-border dark:divide-surface-dark-border">
                  <tr
                    v-for="pos in sortedPositions"
                    :key="`${pos.symbol}-${pos.exchange || 'NONE'}`"
                    class="hover:bg-surface-hover dark:hover:bg-surface-dark-hover transition-colors"
                  >
                    <td class="px-4 py-2.5">
                      <span class="font-medium text-text-main dark:text-text-dark-main">{{ pos.name || pos.symbol }}</span>
                      <span v-if="pos.exchange" class="ml-1 text-xs text-text-muted dark:text-text-dark-muted">({{ pos.exchange }})</span>
                    </td>
                    <td class="px-4 py-2.5 text-right text-text-body dark:text-text-dark-body">{{ formatNumber(pos.total_amount, 4) }}</td>
                    <td class="px-4 py-2.5 text-right text-text-body dark:text-text-dark-body">{{ formatPru(pos.average_buy_price, pos.currency) }}</td>
                    <td class="px-4 py-2.5 text-right text-text-body dark:text-text-dark-body">{{ maskValue(formatCurrency(pos.total_invested)) }}</td>
                    <td class="px-4 py-2.5 text-right text-text-body dark:text-text-dark-body">{{ formatPosPrice(pos.current_price, pos.currency) }}</td>
                    <td class="px-4 py-2.5 text-right font-medium text-text-main dark:text-text-dark-main">{{ maskValue(formatPosPrice(pos.current_value, pos.currency)) }}</td>
                    <td class="px-4 py-2.5 text-right">
                      <span :class="['font-medium', profitLossClass(posProfitLossEur(pos))]">
                        {{ maskValue(formatCurrency(posProfitLossEur(pos))) }}
                      </span>
                      <span :class="['block text-xs', profitLossClass(posProfitLossPctEur(pos))]">
                        {{ formatPercent(posProfitLossPctEur(pos)) }}
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
            <div v-if="sortedTransactions.length" class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-xs text-text-muted dark:text-text-dark-muted uppercase tracking-wider border-b border-surface-border dark:border-surface-dark-border">
                    <th class="px-4 py-2">Date</th>
                    <th class="px-4 py-2">Type</th>
                    <th class="px-4 py-2">Symbole</th>
                    <th class="px-4 py-2">ISIN</th>
                    <th class="px-4 py-2">Place</th>
                    <th class="px-4 py-2 text-right">Quantité</th>
                    <th class="px-4 py-2 text-right">Prix</th>
                    <th class="px-4 py-2 text-right">Total</th>
                    <th class="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-surface-border dark:divide-surface-dark-border">
                  <tr v-for="tx in sortedTransactions" :key="tx.id"
                    :class="['transition-colors', tx.isin === 'EUR' ? 'bg-info/5 dark:bg-info/10' : 'hover:bg-surface-hover dark:hover:bg-surface-dark-hover']">
                    <td class="px-4 py-2.5 text-text-muted dark:text-text-dark-muted">{{ new Date(tx.executed_at).toLocaleDateString() }}</td>
                    <td class="px-4 py-2.5">
                      <BaseBadge :variant="tx.isin === 'EUR' ? 'info' : (tx.type === 'BUY' || tx.type === 'DEPOSIT' ? 'success' : tx.type === 'SELL' ? 'danger' : 'info')">
                        {{ tx.type }}
                      </BaseBadge>
                    </td>
                    <td class="px-4 py-2.5 font-medium text-text-main dark:text-text-dark-main">{{ tx.symbol || '-' }}</td>
                    <td class="px-4 py-2.5 text-text-muted dark:text-text-dark-muted text-xs">{{ tx.isin === 'EUR' ? '—' : (tx.isin || '-') }}</td>
                    <td class="px-4 py-2.5 text-text-muted dark:text-text-dark-muted text-xs">{{ tx.exchange || '—' }}</td>
                    <td class="px-4 py-2.5 text-right font-mono">{{ tx.isin === 'EUR' ? '—' : formatNumber(tx.amount, 4) }}</td>
                    <td class="px-4 py-2.5 text-right">{{ tx.isin === 'EUR' ? '—' : formatCurrency(tx.price_per_unit) }}</td>
                    <td class="px-4 py-2.5 text-right font-medium">{{ maskValue(formatCurrency(tx.isin === 'EUR' ? tx.amount : tx.amount * tx.price_per_unit)) }}</td>
                    <td class="px-4 py-2.5 text-right">
                      <BaseButton v-if="tx.isin !== 'EUR'" size="sm" variant="ghost" @click="openEditTransaction(tx)">
                        <Pencil class="w-4 h-4" />
                      </BaseButton>
                      <BaseButton v-else-if="tx.type === 'DEPOSIT'" size="sm" variant="ghost" @click="openEditDeposit(tx)">
                        <Pencil class="w-4 h-4" />
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
        <TrendingUp class="w-8 h-8 text-text-muted dark:text-text-dark-muted" />
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
          placeholder="Nom du compte"
          required
        />
        <BaseInput v-model="accountForm.institution_name!" label="Courtier / Banque" placeholder="Nom du courtier" />
        <BaseInput v-model="accountForm.identifier!" label="Identifiant" placeholder="Numéro de compte" />
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

        <!-- ── Unified asset picker ── -->
        <div>
          <BaseAutocomplete
            v-model="assetQuery"
            @update:model-value="handleAssetInput"
            @select="handleSelectUnifiedAsset"
            label="Actif"
            placeholder="Nom, symbole ou ISIN…"
            :options="assetOptions"
            :display-value="formatAssetOption"
            :loading="isAssetSearching"
            :show-all-on-focus="true"
            remote
            required
          >
            <template #item="{ item }">
              <div class="flex items-center justify-between gap-2 w-full">
                <div class="min-w-0">
                  <span class="font-medium">{{ item.symbol }}</span>
                  <span v-if="item.name" class="text-text-muted dark:text-text-dark-muted text-xs ml-1.5">{{ item.name }}</span>
                  <span v-if="item.isin" class="text-text-muted dark:text-text-dark-muted text-xs ml-1">({{ item.isin }})</span>
                </div>
                <span
                  :class="[
                    'text-xs shrink-0 px-1.5 py-0.5 rounded-secondary font-medium',
                    item._source === 'known'
                      ? 'bg-primary-light text-primary'
                      : 'bg-background-subtle dark:bg-background-dark-subtle text-text-muted dark:text-text-dark-muted',
                  ]"
                >{{ item._source === 'known' ? 'portefeuille' : 'marché' }}</span>
              </div>
            </template>
          </BaseAutocomplete>
          <p v-if="assetError" class="text-xs text-danger mt-1">{{ assetError }}</p>
          <p v-else class="text-xs text-text-muted dark:text-text-dark-muted mt-1">
            Tapez un nom, un symbole ou un ISIN — les actifs de votre portefeuille apparaissent en premier
          </p>
        </div>

        <!-- ISIN pré-rempli (confirmation / correction) + place de marché optionnelle -->
        <div :class="showExchange ? 'grid grid-cols-2 gap-4' : ''">
          <BaseInput
            v-model="txForm.isin!"
            label="ISIN"
            placeholder="Auto-rempli à la sélection"
            required
          />
          <BaseInput
            v-if="showExchange"
            v-model="txForm.exchange!"
            label="Place de marché"
            placeholder="Ex : XPAR, XNAS…"
          />
        </div>
        <button
          v-if="!showExchange"
          type="button"
          class="text-xs text-primary hover:underline -mt-2 block"
          @click="showExchange = true"
        >
          + Ajouter une place de marché
        </button>

        <BaseSelect v-model="txForm.type" label="Type de transaction" :options="txTypeOptions" required />
        <div class="grid grid-cols-2 gap-4">
          <BaseInput v-model="txForm.amount" label="Quantité" type="number" step="any" min="0" required />
          <BaseInput v-model="txForm.price_per_unit" label="Prix unitaire (€)" type="number" step="any" min="0" required />
        </div>
        <BaseInput v-model="txForm.fees!" label="Frais (€)" type="number" step="any" min="0" placeholder="0.00" />
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

    <!-- ── CSV Import Modal ────────────────────────────── -->
    <CsvImportModal
      :open="showCsvImportModal"
      :account-id="csvImportAccountId || ''"
      asset-type="stocks"
      :on-import="handleCsvImport"
      @close="showCsvImportModal = false"
    />

    <!-- ── EUR Deposit Modal ──────────────────────────── -->
    <BaseModal :open="showDepositModal" :title="editingDepositId ? 'Modifier le dépôt' : 'Déposer des euros'" @close="showDepositModal = false">
      <form @submit.prevent="handleSubmitDeposit" class="space-y-4">
        <BaseInput
          v-model="depositForm.amount"
          label="Montant (€)"
          type="number"
          step="any"
          min="0.01"
          placeholder="0.00"
          required
        />
        <BaseInput
          v-model="depositForm.executed_at"
          label="Date du dépôt"
          type="datetime-local"
          required
        />
        <BaseInput
          v-model="depositForm.notes!"
          label="Notes"
          placeholder="Optionnel"
        />

        <!-- Bank deduction option (only for new deposits) -->
        <div v-if="!editingDepositId" class="rounded-card border border-surface-border dark:border-surface-dark-border p-4 space-y-3">
          <label class="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              v-model="deductFromBank"
              class="h-4 w-4 rounded accent-primary"
            />
            <span class="text-sm font-medium text-text-main dark:text-text-dark-main">
              Déduire de mon compte bancaire
            </span>
          </label>

          <div v-if="deductFromBank && sortedBankAccounts.length" class="space-y-2">
            <label class="block text-xs text-text-muted dark:text-text-dark-muted">Compte source</label>
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
      </form>
      <template #footer>
        <div class="flex justify-between w-full">
          <BaseButton v-if="editingDepositId" variant="danger" @click="deleteTransaction(editingDepositId)">
            Supprimer
          </BaseButton>
          <div v-else></div>
          <div class="flex gap-2">
            <BaseButton variant="ghost" @click="showDepositModal = false">Annuler</BaseButton>
            <BaseButton :loading="stocks.isLoading || bank.isLoading" @click="handleSubmitDeposit">{{ editingDepositId ? 'Enregistrer' : 'Valider le dépôt' }}</BaseButton>
          </div>
        </div>
      </template>
    </BaseModal>
  </div>
</template>