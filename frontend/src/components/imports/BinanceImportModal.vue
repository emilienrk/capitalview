<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useCryptoStore } from '@/stores/crypto'
import BaseModal from '@/components/BaseModal.vue'
import BaseButton from '@/components/BaseButton.vue'
import BaseAlert from '@/components/BaseAlert.vue'
import BaseSpinner from '@/components/BaseSpinner.vue'
import type {
  BinanceImportGroupPreview,
  BinanceImportPreviewResponse,
  BinanceImportRowPreview,
} from '@/types'

interface Props {
  open: boolean
  accountId: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  imported: []
}>()

const crypto = useCryptoStore()

// ── State ────────────────────────────────────────────────────

type Step = 'upload' | 'review' | 'result'
const step = ref<Step>('upload')
const fileName = ref<string | null>(null)
const error = ref<string | null>(null)
const isLoading = ref(false)

// Preview data (mutable copy so users can edit eur_amount)
const previewGroups = ref<BinanceImportGroupPreview[]>([])
const previewStats = reactive({
  totalGroups: 0,
  totalRows: 0,
  groupsNeedingEur: 0,
})

// Per-group price per unit input (keyed by group_index)
const groupPricePerUnit = reactive<Record<number, number | null>>({})

// Set of group indices excluded by the user (crypto withdrawals)
const excludedGroups = reactive(new Set<number>())

// Import result
const importResult = reactive({
  importedCount: 0,
  groupsCount: 0,
})

// ── Helpers to identify group properties ─────────────────────

/** Get a summary of the main BUY crypto in a group (sum of all BUY rows for the primary symbol). */
function getMainBuySummary(group: BinanceImportGroupPreview): { symbol: string; totalAmount: number } | null {
  const STABLECOINS = new Set(['USDC', 'USDT', 'DAI', 'BUSD', 'FDUSD'])
  const buyRows = group.rows.filter((r) => r.mapped_type === 'BUY')
  if (buyRows.length === 0) return null

  // Pick the primary symbol: prefer non-stablecoin, non-EUR
  const primaryRow = buyRows.find(
    (r) => !STABLECOINS.has(r.mapped_symbol) && r.mapped_symbol !== 'EUR',
  ) ?? buyRows[0]!
  const symbol = primaryRow.mapped_symbol

  // Sum all BUY rows with that symbol
  const totalAmount = buyRows
    .filter((r) => r.mapped_symbol === symbol)
    .reduce((sum, r) => sum + r.mapped_amount, 0)

  return { symbol, totalAmount }
}

/** True if this group is a crypto-only withdrawal (not EUR). */
function isCryptoWithdrawal(group: BinanceImportGroupPreview): boolean {
  return (
    group.rows.length > 0 &&
    group.rows.every((r) => r.mapped_type === 'TRANSFER') &&
    group.rows.every((r) => r.mapped_symbol !== 'EUR')
  )
}

/** True if this group is a crypto deposit (no EUR anchor). */
function isCryptoDeposit(group: BinanceImportGroupPreview): boolean {
  return (
    group.rows.length > 0 &&
    !group.has_eur &&
    group.rows.some((r) => r.mapped_type === 'BUY') &&
    group.rows.every((r) => r.mapped_symbol !== 'EUR')
  )
}

// ── Computed ─────────────────────────────────────────────────

/** Groups that will actually be imported (after exclusions). */
const activeGroups = computed(() =>
  previewGroups.value.filter((g) => !excludedGroups.has(g.group_index)),
)

const activeRowCount = computed(() =>
  activeGroups.value.reduce((sum, g) => sum + g.rows.length + (g.needs_eur_input && g.eur_amount && g.eur_amount > 0 ? 1 : 0), 0),
)

const canConfirm = computed(() => {
  return activeGroups.value
    .filter((g) => g.needs_eur_input)
    .every((g) => g.eur_amount !== null && g.eur_amount >= 0)
})

const modalTitle = computed(() => {
  if (step.value === 'upload') return 'Import Binance — Fichier'
  if (step.value === 'review') return 'Import Binance — Vérification'
  return 'Import Binance — Terminé'
})

// ── File handling ────────────────────────────────────────────

function onFileSelect(event: Event): void {
  error.value = null
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  if (!file.name.endsWith('.csv')) {
    error.value = 'Veuillez sélectionner un fichier CSV (.csv)'
    return
  }
  fileName.value = file.name
  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target?.result as string
    if (text) sendPreview(text)
  }
  reader.onerror = () => {
    error.value = 'Erreur de lecture du fichier.'
  }
  reader.readAsText(file)
}

async function sendPreview(csvContent: string): Promise<void> {
  isLoading.value = true
  error.value = null
  try {
    const result = await crypto.previewBinanceImport(csvContent)
    if (!result || result.total_groups === 0) {
      error.value = 'Aucune transaction trouvée dans le fichier.'
      isLoading.value = false
      return
    }
    // Deep reactive copy
    previewGroups.value = result.groups.map((g) => ({ ...g, rows: [...g.rows] }))
    previewStats.totalGroups = result.total_groups
    previewStats.totalRows = result.total_rows
    previewStats.groupsNeedingEur = result.groups_needing_eur

    // Init price-per-unit map & excluded set
    for (const g of previewGroups.value) {
      groupPricePerUnit[g.group_index] = null
    }
    excludedGroups.clear()

    step.value = 'review'
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Erreur lors de l'analyse"
  } finally {
    isLoading.value = false
  }
}

// ── Price per unit → eur_amount calculation ──────────────────

function setGroupPricePerUnit(groupIndex: number, value: string): void {
  const n = value === '' ? null : Number(value)
  groupPricePerUnit[groupIndex] = n !== null && !isNaN(n) && n >= 0 ? n : null

  // Compute eur_amount = total_buy_amount × price_per_unit
  const group = previewGroups.value.find((g) => g.group_index === groupIndex)
  if (!group) return
  const buySummary = getMainBuySummary(group)
  const price = groupPricePerUnit[groupIndex]
  if (buySummary && price !== null && price >= 0) {
    group.eur_amount = Number((buySummary.totalAmount * price).toFixed(2))
  } else {
    group.eur_amount = null
  }
}

// ── Exclude / include toggle ─────────────────────────────────

function toggleExclude(groupIndex: number): void {
  if (excludedGroups.has(groupIndex)) {
    excludedGroups.delete(groupIndex)
  } else {
    excludedGroups.add(groupIndex)
  }
}

// ── Confirm import ───────────────────────────────────────────

async function confirmImport(): Promise<void> {
  if (!props.accountId) return
  isLoading.value = true
  error.value = null
  try {
    const result = await crypto.confirmBinanceImport(props.accountId, activeGroups.value)
    if (result) {
      importResult.importedCount = result.imported_count
      importResult.groupsCount = result.groups_count
      step.value = 'result'
      emit('imported')
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Erreur lors de l'import"
  } finally {
    isLoading.value = false
  }
}

// ── Display helpers ──────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return iso
  }
}

function typeLabel(t: string): string {
  const map: Record<string, string> = {
    BUY: 'Achat',
    SPEND: 'Dépense',
    FEE: 'Frais',
    REWARD: 'Récompense',
    FIAT_DEPOSIT: 'Dépôt €',
    FIAT_ANCHOR: 'Ancre €',
    TRANSFER: 'Transfert',
    EXIT: 'Sortie',
  }
  return map[t] ?? t
}

function typeBadgeClass(t: string): string {
  switch (t) {
    case 'BUY':
    case 'FIAT_DEPOSIT':
      return 'bg-success/10 text-success'
    case 'SPEND':
    case 'EXIT':
      return 'bg-danger/10 text-danger'
    case 'FEE':
      return 'bg-warning/10 text-warning'
    case 'REWARD':
      return 'bg-info/10 text-info'
    case 'TRANSFER':
      return 'bg-secondary-light text-secondary dark:bg-secondary/20'
    default:
      return 'bg-secondary-light text-secondary'
  }
}

function resetModal(): void {
  step.value = 'upload'
  fileName.value = null
  error.value = null
  previewGroups.value = []
  previewStats.totalGroups = 0
  previewStats.totalRows = 0
  previewStats.groupsNeedingEur = 0
  excludedGroups.clear()
  Object.keys(groupPricePerUnit).forEach((k) => delete groupPricePerUnit[Number(k)])
}

function handleClose(): void {
  resetModal()
  emit('close')
}
</script>

<template>
  <BaseModal :open="props.open" :title="modalTitle" size="lg" @close="handleClose">
    <!-- ── STEP 1: Upload ──────────────────────────────── -->
    <template v-if="step === 'upload'">
      <p class="text-sm text-text-body dark:text-text-dark-body mb-4">
        Sélectionnez un fichier CSV exporté depuis Binance.
        Le format attendu&nbsp;: <code class="text-xs bg-surface-active dark:bg-surface-dark-hover px-1 py-0.5 rounded-badge">User_ID, UTC_Time, Account, Operation, Coin, Change, Remark</code>
      </p>

      <label
        class="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-surface-border dark:border-surface-dark-border rounded-card cursor-pointer hover:border-primary transition-colors"
      >
        <svg class="w-8 h-8 text-text-muted dark:text-text-dark-muted mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        <span v-if="fileName" class="text-sm font-medium text-text-main dark:text-text-dark-main">{{ fileName }}</span>
        <span v-else class="text-sm text-text-muted dark:text-text-dark-muted">Cliquer pour choisir un fichier .csv</span>
        <input type="file" accept=".csv" class="hidden" @change="onFileSelect" />
      </label>

      <BaseAlert v-if="error" variant="danger" class="mt-4">{{ error }}</BaseAlert>

      <div v-if="isLoading" class="flex items-center justify-center mt-6">
        <BaseSpinner />
        <span class="ml-2 text-sm text-text-muted dark:text-text-dark-muted">Analyse en cours…</span>
      </div>
    </template>

    <!-- ── STEP 2: Review ──────────────────────────────── -->
    <template v-if="step === 'review'">
      <!-- Stats bar -->
      <div class="flex flex-wrap gap-4 mb-4 text-sm">
        <span class="text-text-body dark:text-text-dark-body">
          <strong>{{ activeGroups.length }}</strong>/{{ previewStats.totalGroups }} groupes
        </span>
        <span class="text-text-body dark:text-text-dark-body">
          <strong>{{ activeRowCount }}</strong> lignes
        </span>
        <span v-if="previewStats.groupsNeedingEur > 0" class="text-warning font-medium">
          {{ previewStats.groupsNeedingEur }} groupes nécessitent un prix EUR
        </span>
        <span v-if="excludedGroups.size > 0" class="text-text-muted dark:text-text-dark-muted">
          {{ excludedGroups.size }} exclus
        </span>
      </div>

      <BaseAlert v-if="error" variant="danger" class="mb-4">{{ error }}</BaseAlert>

      <!-- Groups table (scrollable) -->
      <div class="overflow-x-auto -mx-6 px-6">
        <table class="w-full text-xs border-collapse min-w-160">
          <thead>
            <tr class="border-b border-surface-border dark:border-surface-dark-border text-left">
              <th class="py-2 pr-1 text-text-muted dark:text-text-dark-muted font-medium w-8">#</th>
              <th class="py-2 pr-2 text-text-muted dark:text-text-dark-muted font-medium w-36">Date</th>
              <th class="py-2 pr-2 text-text-muted dark:text-text-dark-muted font-medium">Résumé</th>
              <th class="py-2 pr-2 text-text-muted dark:text-text-dark-muted font-medium">Détails</th>
              <th class="py-2 text-text-muted dark:text-text-dark-muted font-medium w-44 text-right">Prix EUR</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="group in previewGroups"
              :key="group.group_index"
              class="border-b border-surface-border/50 dark:border-surface-dark-border/50 transition-colors"
              :class="{
                'bg-warning/5': !excludedGroups.has(group.group_index) && group.needs_eur_input && (group.eur_amount === null || group.eur_amount < 0),
                'opacity-40 line-through': excludedGroups.has(group.group_index),
                'hover:bg-surface-hover dark:hover:bg-surface-dark-hover': !excludedGroups.has(group.group_index),
              }"
            >
              <!-- Index + exclude toggle -->
              <td class="py-2 pr-1 align-top">
                <div class="flex flex-col items-center gap-1">
                  <span class="text-text-muted dark:text-text-dark-muted font-mono text-[10px]">{{ group.group_index + 1 }}</span>
                  <!-- Show exclude checkbox for crypto withdrawals only -->
                  <template v-if="isCryptoWithdrawal(group)">
                    <label class="cursor-pointer" :title="excludedGroups.has(group.group_index) ? 'Inclure' : 'Exclure'">
                      <input
                        type="checkbox"
                        :checked="!excludedGroups.has(group.group_index)"
                        @change="toggleExclude(group.group_index)"
                        class="w-3.5 h-3.5 rounded-sm border-surface-border dark:border-surface-dark-border text-primary focus:ring-primary"
                      />
                    </label>
                  </template>
                </div>
              </td>

              <!-- Date -->
              <td class="py-2 pr-2 text-text-body dark:text-text-dark-body align-top whitespace-nowrap">
                {{ formatDate(group.timestamp) }}
              </td>

              <!-- Summary -->
              <td class="py-2 pr-2 text-text-main dark:text-text-dark-main font-medium align-top">
                {{ group.summary }}
              </td>

              <!-- Details (atomic rows) -->
              <td class="py-2 pr-2 align-top">
                <div
                  v-for="(row, ri) in group.rows"
                  :key="ri"
                  class="flex items-center gap-1 mb-0.5 last:mb-0"
                >
                  <span :class="['inline-block px-1.5 py-0.5 rounded-badge text-[10px] font-semibold leading-none', typeBadgeClass(row.mapped_type)]">
                    {{ typeLabel(row.mapped_type) }}
                  </span>
                  <span class="text-text-body dark:text-text-dark-body">
                    {{ row.mapped_amount }} {{ row.mapped_symbol }}
                  </span>
                </div>
              </td>

              <!-- EUR price column -->
              <td class="py-2 align-top text-right">
                <!-- Excluded group — no input -->
                <template v-if="excludedGroups.has(group.group_index)">
                  <span class="text-text-muted dark:text-text-dark-muted italic">exclu</span>
                </template>

                <!-- Auto (has EUR already) -->
                <template v-else-if="group.has_eur">
                  <span class="text-success font-medium">
                    {{ group.auto_eur_amount?.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) }} €
                  </span>
                  <span class="block text-[10px] text-text-muted dark:text-text-dark-muted">auto</span>
                </template>

                <!-- Manual: price per unit input for the received crypto -->
                <template v-else-if="group.needs_eur_input">
                  <div class="flex flex-col items-end gap-0.5">
                    <!-- Label: which crypto (total of all BUY rows) -->
                    <span class="text-[10px] font-medium text-text-main dark:text-text-dark-main">
                      {{ getMainBuySummary(group)?.totalAmount }}
                      {{ getMainBuySummary(group)?.symbol }}
                    </span>
                    <!-- Price per unit input -->
                    <div class="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        :placeholder="'€/' + (getMainBuySummary(group)?.symbol ?? '?')"
                        :value="groupPricePerUnit[group.group_index] ?? ''"
                        @input="setGroupPricePerUnit(group.group_index, ($event.target as HTMLInputElement).value)"
                        class="w-24 text-right text-xs px-2 py-1 rounded-input border border-surface-border dark:border-surface-dark-border bg-surface dark:bg-surface-dark text-text-main dark:text-text-dark-main focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                      />
                      <span class="text-[10px] text-text-muted dark:text-text-dark-muted">€</span>
                    </div>
                    <!-- Computed total -->
                    <span
                      v-if="group.eur_amount !== null && group.eur_amount > 0"
                      class="text-[10px] text-success"
                    >
                      = {{ group.eur_amount.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) }} €
                    </span>
                    <!-- USDC hint -->
                    <span
                      v-if="group.hint_usdc_amount"
                      class="text-[10px] text-text-muted dark:text-text-dark-muted"
                    >
                      ≈ {{ group.hint_usdc_amount?.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) }} USDC
                    </span>
                  </div>
                </template>

                <!-- No EUR needed (reward, etc.) -->
                <template v-else>
                  <span class="text-text-muted dark:text-text-dark-muted">—</span>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- ── STEP 3: Result ──────────────────────────────── -->
    <template v-if="step === 'result'">
      <BaseAlert variant="success" class="mb-4">
        Import terminé avec succès !
      </BaseAlert>
      <div class="text-sm text-text-body dark:text-text-dark-body space-y-1">
        <p><strong>{{ importResult.importedCount }}</strong> transactions créées</p>
        <p><strong>{{ importResult.groupsCount }}</strong> groupes importés</p>
      </div>
    </template>

    <!-- ── Footer ──────────────────────────────────────── -->
    <template #footer>
      <template v-if="step === 'review'">
        <BaseButton variant="outline" @click="resetModal">
          Retour
        </BaseButton>
        <BaseButton
          :disabled="!canConfirm || isLoading"
          @click="confirmImport"
        >
          <BaseSpinner v-if="isLoading" class="mr-2 w-4 h-4" />
          Importer {{ activeGroups.length }} groupes ({{ activeRowCount }} transactions)
        </BaseButton>
      </template>

      <template v-if="step === 'result'">
        <BaseButton @click="handleClose">
          Fermer
        </BaseButton>
      </template>
    </template>
  </BaseModal>
</template>
