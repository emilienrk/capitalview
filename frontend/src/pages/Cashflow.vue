<script setup lang="ts">
import { ArrowDown, ArrowUp, Circle, DollarSign, Pencil, Scale, Search, Trash2 } from 'lucide-vue-next'

import { onMounted, ref, reactive, computed } from 'vue'
import { useCashflowStore } from '@/stores/cashflow'
import { useBankStore } from '@/stores/bank'
import { useFormatters } from '@/composables/useFormatters'
import { usePrivacyMode } from '@/composables/usePrivacyMode'
import PageHeader from '@/components/PageHeader.vue'
import {
  BaseCard, BaseButton, BaseInput, BaseSelect, BaseModal,
  BaseAlert, BaseEmptyState, BaseBadge, BaseStatCard, BaseAutocomplete,
} from '@/components'
import type { CashflowCreate, CashflowResponse, FlowType, Frequency } from '@/types'

const cashflow = useCashflowStore()
const bank = useBankStore()
const { formatCurrency } = useFormatters()
const { privacyMode, togglePrivacyMode, maskValue } = usePrivacyMode()

const showFormModal = ref(false)
const editingId = ref<string | null>(null)
const activeTab = ref<'all' | 'inflows' | 'outflows'>('all')
const searchQuery = ref('')
const deleteConfirmId = ref<string | null>(null)
const hasFetchedOnce = ref(false)

const form = reactive<CashflowCreate>({
  name: '',
  flow_type: 'INFLOW' as FlowType,
  category: '',
  amount: 0,
  frequency: 'MONTHLY' as Frequency,
  transaction_date: new Date().toISOString().split('T')[0] as string,
  bank_account_id: undefined,
})

const bankAccountOptions = computed(() => [
  { label: 'Aucun compte lié', value: '' },
  ...(bank.summary?.accounts ?? [])
    .slice()
    .sort((a, b) => {
      if (a.account_type === 'CHECKING' && b.account_type !== 'CHECKING') return -1
      if (b.account_type === 'CHECKING' && a.account_type !== 'CHECKING') return 1
      return 0
    })
    .map(a => ({
      label: a.institution_name ? `${a.name} (${a.institution_name})` : a.name,
      value: a.id,
    })),
])

const existingCategories = computed(() => {
  const categories = new Set(cashflow.cashflows.map(c => c.category))
  return Array.from(categories)
    .sort()
    .map(c => c.charAt(0).toUpperCase() + c.slice(1))
})

const errors = reactive({
  name: '',
  category: '',
  amount: '',
})

const amountInput = ref('0')

const selectedDay = ref(new Date().getDate())
const selectedMonth = ref(new Date().getMonth() + 1)

const monthOptions = [
  { label: 'Janvier', value: 1 },
  { label: 'Février', value: 2 },
  { label: 'Mars', value: 3 },
  { label: 'Avril', value: 4 },
  { label: 'Mai', value: 5 },
  { label: 'Juin', value: 6 },
  { label: 'Juillet', value: 7 },
  { label: 'Août', value: 8 },
  { label: 'Septembre', value: 9 },
  { label: 'Octobre', value: 10 },
  { label: 'Novembre', value: 11 },
  { label: 'Décembre', value: 12 },
]

const monthLabels: Record<number, string> = {
  1: 'janvier', 2: 'février', 3: 'mars', 4: 'avril',
  5: 'mai', 6: 'juin', 7: 'juillet', 8: 'août',
  9: 'septembre', 10: 'octobre', 11: 'novembre', 12: 'décembre',
}

const dayOptions = computed(() =>
  Array.from({ length: 31 }, (_, i) => ({ label: String(i + 1), value: i + 1 }))
)

const flowTypeOptions = [
  { label: 'Revenu', value: 'INFLOW' },
  { label: 'Dépense', value: 'OUTFLOW' },
]

const frequencyOptions = [
  { label: 'Ponctuel', value: 'ONCE' },
  { label: 'Quotidien', value: 'DAILY' },
  { label: 'Hebdomadaire', value: 'WEEKLY' },
  { label: 'Mensuel', value: 'MONTHLY' },
  { label: 'Annuel', value: 'YEARLY' },
]

const frequencyLabels: Record<string, string> = {
  ONCE: 'Ponctuel',
  DAILY: 'Quotidien',
  WEEKLY: 'Hebdomadaire',
  MONTHLY: 'Mensuel',
  YEARLY: 'Annuel',
}

function capitalize(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const filteredCashflows = computed<CashflowResponse[]>(() => {
  let items = [...cashflow.cashflows]

  if (activeTab.value === 'inflows') {
    items = items.filter((c) => c.flow_type === 'INFLOW')
  } else if (activeTab.value === 'outflows') {
    items = items.filter((c) => c.flow_type === 'OUTFLOW')
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    items = items.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q),
    )
  }

  items.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())

  return items.map(item => ({
    ...item,
    category: capitalize(item.category)
  }))
})

const inflowsTotal = computed(() =>
  cashflow.cashflows
    .filter((c) => c.flow_type === 'INFLOW')
    .reduce((sum, c) => sum + Number(c.monthly_amount), 0),
)

const outflowsTotal = computed(() =>
  cashflow.cashflows
    .filter((c) => c.flow_type === 'OUTFLOW')
    .reduce((sum, c) => sum + Number(c.monthly_amount), 0),
)

const netBalance = computed(() => inflowsTotal.value - outflowsTotal.value)

const savingsRate = computed(() => {
  if (inflowsTotal.value === 0) return null
  return ((netBalance.value / inflowsTotal.value) * 100)
})

const categorySummary = computed(() => {
  const map = new Map<string, { category: string; flow_type: FlowType; total: number; count: number }>()
  for (const c of cashflow.cashflows) {
    const capitalizedCategory = capitalize(c.category)
    const key = `${c.flow_type}-${capitalizedCategory}`
    const existing = map.get(key)
    if (existing) {
      existing.total += Number(c.monthly_amount)
      existing.count++
    } else {
      map.set(key, { category: capitalizedCategory, flow_type: c.flow_type, total: Number(c.monthly_amount), count: 1 })
    }
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total)
})

function resetForm(): void {
  form.name = ''
  form.flow_type = 'INFLOW'
  form.category = ''
  form.amount = 0
  form.frequency = 'MONTHLY'
  form.transaction_date = new Date().toISOString().split('T')[0] as string
  form.bank_account_id = undefined
  amountInput.value = ''
  selectedDay.value = new Date().getDate()
  selectedMonth.value = new Date().getMonth() + 1
  errors.name = ''
  errors.category = ''
  errors.amount = ''
}

/** Build a date string from the selected day/month (year = current year). */
function buildDateFromDayMonth(): string {
  const year = new Date().getFullYear()
  const month = String(selectedMonth.value).padStart(2, '0')
  const day = String(selectedDay.value).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Format a date string as "le {day} {month}" for display. */
function formatDayMonth(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDate()
  const month = monthLabels[d.getMonth() + 1] || ''
  return `le ${day} ${month}`
}

function openCreate(type?: FlowType): void {
  editingId.value = null
  resetForm()
  if (type) form.flow_type = type
  showFormModal.value = true
}

function openEdit(item: CashflowResponse): void {
  editingId.value = item.id
  form.name = item.name
  form.flow_type = item.flow_type
  form.category = item.category
  form.amount = Number(item.amount)
  form.frequency = item.frequency
  form.transaction_date = item.transaction_date
  form.bank_account_id = item.bank_account_id ?? undefined
  amountInput.value = String(Number(item.amount))
  const d = new Date(item.transaction_date)
  selectedDay.value = d.getDate()
  selectedMonth.value = d.getMonth() + 1
  showFormModal.value = true
}

async function handleSubmit(): Promise<void> {
  errors.name = ''
  errors.category = ''
  errors.amount = ''

  let hasErrors = false

  if (!form.name.trim()) {
    errors.name = 'Le nom est requis'
    hasErrors = true
  }

  if (!form.category.trim()) {
    errors.category = 'La catégorie est requise'
    hasErrors = true
  }

  const parsedAmount = parseFloat(amountInput.value.replace(',', '.'))
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    errors.amount = 'Montant invalide'
    hasErrors = true
  }

  if (hasErrors) return

  const dateStr = buildDateFromDayMonth()

  if (editingId.value) {
    await cashflow.updateCashflow(editingId.value, {
      name: form.name,
      flow_type: form.flow_type,
      category: form.category.toLowerCase(),
      amount: parsedAmount,
      frequency: form.frequency,
      transaction_date: dateStr,
      bank_account_id: form.bank_account_id || undefined,
    })
  } else {
    await cashflow.createCashflow({
      ...form,
      category: form.category.toLowerCase(),
      amount: parsedAmount,
      transaction_date: dateStr,
      bank_account_id: form.bank_account_id || undefined,
    })
  }
  showFormModal.value = false
  await cashflow.fetchBalance()
}

async function handleDelete(id: string): Promise<void> {
  await cashflow.deleteCashflow(id)
  deleteConfirmId.value = null
  await cashflow.fetchBalance()
}

onMounted(async () => {
  await Promise.all([cashflow.fetchAll(), cashflow.fetchBalance(), bank.fetchAccounts()])
  hasFetchedOnce.value = true
})
</script>

<template>
  <div>
    <PageHeader title="Flux de trésorerie" description="Gérez vos revenus et dépenses récurrents et ponctuels">
      <template #actions>
        <BaseButton @click="openCreate()">
          +<span class="hidden sm:inline">&nbsp;Nouveau flux</span>
        </BaseButton>
      </template>
    </PageHeader>

    <!-- Error -->
    <BaseAlert v-if="cashflow.error" variant="danger" dismissible @dismiss="cashflow.error = null" class="mb-6">
      {{ cashflow.error }}
    </BaseAlert>

    <!-- ── Stats Cards ──────────────────────────────────── -->
    <div v-if="cashflow.cashflows.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <BaseStatCard
        label="Revenus mensuels"
        :value="maskValue(formatCurrency(inflowsTotal))"
        sub-value-class="text-success"
      >
        <template #icon>
          <div class="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
            <ArrowUp class="w-5 h-5 text-success" />
          </div>
        </template>
      </BaseStatCard>

      <BaseStatCard
        label="Dépenses mensuelles"
        :value="maskValue(formatCurrency(outflowsTotal))"
        sub-value-class="text-danger"
      >
        <template #icon>
          <div class="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center">
            <ArrowDown class="w-5 h-5 text-danger" />
          </div>
        </template>
      </BaseStatCard>

      <BaseStatCard
        label="Balance nette"
        :value="maskValue(formatCurrency(netBalance))"
      >
        <template #icon>
          <div class="w-10 h-10 rounded-full flex items-center justify-center bg-primary/10">
            <Scale class="w-5 h-5 text-primary" />
          </div>
        </template>
      </BaseStatCard>

      <BaseStatCard
        label="Taux d'épargne"
        :value="savingsRate !== null ? `${savingsRate.toFixed(1)} %` : '—'"
        :sub-value-class="savingsRate !== null && savingsRate >= 0 ? 'text-success' : 'text-danger'"
      >
        <template #icon>
          <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Circle class="w-5 h-5 text-primary" />
          </div>
        </template>
      </BaseStatCard>
    </div>

    <!-- ── Category Breakdown ───────────────────────────── -->
    <div v-if="categorySummary.length" class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <!-- Inflows by category -->
      <BaseCard title="Revenus par catégorie" subtitle="Montants mensualisés">
        <div class="space-y-3">
          <div
            v-for="cat in categorySummary.filter(c => c.flow_type === 'INFLOW')"
            :key="cat.category"
            class="flex items-center justify-between"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-2 h-2 rounded-full bg-success shrink-0"></div>
              <span class="text-sm text-text-main dark:text-text-dark-main truncate">{{ cat.category }}</span>
              <BaseBadge variant="secondary">{{ cat.count }}</BaseBadge>
            </div>
            <span class="text-sm font-semibold text-success whitespace-nowrap ml-4">
              {{ maskValue(formatCurrency(cat.total)) }}
            </span>
          </div>
          <p
            v-if="!categorySummary.filter(c => c.flow_type === 'INFLOW').length"
            class="text-sm text-text-muted dark:text-text-dark-muted text-center py-4"
          >
            Aucun revenu enregistré
          </p>
        </div>
      </BaseCard>

      <!-- Outflows by category -->
      <BaseCard title="Dépenses par catégorie" subtitle="Montants mensualisés">
        <div class="space-y-3">
          <div
            v-for="cat in categorySummary.filter(c => c.flow_type === 'OUTFLOW')"
            :key="cat.category"
            class="flex items-center justify-between"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-2 h-2 rounded-full bg-danger shrink-0"></div>
              <span class="text-sm text-text-main dark:text-text-dark-main truncate">{{ cat.category }}</span>
              <BaseBadge variant="secondary">{{ cat.count }}</BaseBadge>
            </div>
            <span class="text-sm font-semibold text-danger whitespace-nowrap ml-4">
              {{ maskValue(formatCurrency(cat.total)) }}
            </span>
          </div>
          <p
            v-if="!categorySummary.filter(c => c.flow_type === 'OUTFLOW').length"
            class="text-sm text-text-muted dark:text-text-dark-muted text-center py-4"
          >
            Aucune dépense enregistrée
          </p>
        </div>
      </BaseCard>
    </div>

    <!-- ── Tabs + Search ────────────────────────────────── -->
    <div v-if="cashflow.cashflows.length" class="mb-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <!-- Tabs -->
        <div class="flex gap-1 p-1 rounded-button bg-background-subtle dark:bg-background-dark-subtle">
          <button
            v-for="tab in [
              { key: 'all', label: 'Tous' },
              { key: 'inflows', label: 'Revenus' },
              { key: 'outflows', label: 'Dépenses' },
            ] as const"
            :key="tab.key"
            @click="activeTab = tab.key"
            :class="[
              'px-4 py-2 text-sm font-medium rounded-button transition-all duration-150',
              activeTab === tab.key
                ? 'bg-surface dark:bg-surface-dark text-text-main dark:text-text-dark-main shadow-sm'
                : 'text-text-muted dark:text-text-dark-muted hover:text-text-main dark:hover:text-text-dark-main',
            ]"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Search -->
        <div class="relative w-full sm:w-72">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted dark:text-text-dark-muted" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Rechercher..."
            class="w-full pl-10 pr-4 py-2.5 rounded-input border border-surface-border dark:border-surface-dark-border bg-surface dark:bg-surface-dark text-text-main dark:text-text-dark-main placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
          />
        </div>
      </div>
    </div>

    <!-- ── Cashflow Table ───────────────────────────────── -->
    <BaseCard v-if="filteredCashflows.length" :padding="false">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-surface-border dark:border-surface-dark-border">
              <th class="text-left px-6 py-3 text-xs font-semibold text-text-muted dark:text-text-dark-muted uppercase tracking-wider">Nom</th>
              <th class="text-left px-6 py-3 text-xs font-semibold text-text-muted dark:text-text-dark-muted uppercase tracking-wider">Catégorie</th>
              <th class="text-left px-6 py-3 text-xs font-semibold text-text-muted dark:text-text-dark-muted uppercase tracking-wider">Type</th>
              <th class="text-left px-6 py-3 text-xs font-semibold text-text-muted dark:text-text-dark-muted uppercase tracking-wider">Fréquence</th>
              <th class="text-right px-6 py-3 text-xs font-semibold text-text-muted dark:text-text-dark-muted uppercase tracking-wider">Montant</th>
              <th class="text-right px-6 py-3 text-xs font-semibold text-text-muted dark:text-text-dark-muted uppercase tracking-wider">Mensuel</th>
              <th class="text-left px-6 py-3 text-xs font-semibold text-text-muted dark:text-text-dark-muted uppercase tracking-wider">Date</th>
              <th class="text-right px-6 py-3 text-xs font-semibold text-text-muted dark:text-text-dark-muted uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-border dark:divide-surface-dark-border">
            <tr
              v-for="item in filteredCashflows"
              :key="item.id"
              class="hover:bg-surface-hover dark:hover:bg-surface-dark-hover transition-colors"
            >
              <td class="px-6 py-4">
                <span class="text-sm font-medium text-text-main dark:text-text-dark-main">{{ item.name }}</span>
              </td>
              <td class="px-6 py-4">
                <BaseBadge variant="secondary">{{ item.category }}</BaseBadge>
              </td>
              <td class="px-6 py-4">
                <BaseBadge :variant="item.flow_type === 'INFLOW' ? 'success' : 'danger'">
                  {{ item.flow_type === 'INFLOW' ? 'Revenu' : 'Dépense' }}
                </BaseBadge>
              </td>
              <td class="px-6 py-4">
                <span class="text-sm text-text-body dark:text-text-dark-body">{{ frequencyLabels[item.frequency] }}</span>
              </td>
              <td class="px-6 py-4 text-right">
                <span :class="['text-sm font-semibold', item.flow_type === 'INFLOW' ? 'text-success' : 'text-danger']">
                  {{ item.flow_type === 'INFLOW' ? '+' : '-' }}{{ formatCurrency(item.amount) }}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <span class="text-sm text-text-body dark:text-text-dark-body">
                  {{ formatCurrency(item.monthly_amount) }}
                </span>
              </td>
              <td class="px-6 py-4">
                <span class="text-sm text-text-muted dark:text-text-dark-muted">{{ formatDayMonth(item.transaction_date) }}</span>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-1">
                  <BaseButton size="sm" variant="ghost" @click="openEdit(item)">
                    <Pencil class="w-4 h-4" />
                  </BaseButton>
                  <BaseButton size="sm" variant="ghost" @click="deleteConfirmId = item.id">
                    <Trash2 class="w-4 h-4 text-danger" />
                  </BaseButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Table footer with count -->
      <template #footer>
        <div class="flex items-center justify-between">
          <p class="text-sm text-text-muted dark:text-text-dark-muted">
            {{ filteredCashflows.length }} flux affichés sur {{ cashflow.cashflows.length }}
          </p>
        </div>
      </template>
    </BaseCard>

    <!-- Empty state -->
    <BaseEmptyState
      v-else-if="hasFetchedOnce && !cashflow.isLoading && !cashflow.cashflows.length"
      title="Aucun flux de trésorerie"
      description="Commencez par ajouter vos revenus et dépenses pour suivre votre cash flow"
      action-label="Ajouter un flux"
      @action="openCreate()"
    >
      <template #icon>
        <DollarSign class="w-8 h-8 text-text-muted dark:text-text-dark-muted" />
      </template>
    </BaseEmptyState>

    <!-- Empty filtered results -->
    <BaseEmptyState
      v-else-if="hasFetchedOnce && !cashflow.isLoading && cashflow.cashflows.length && !filteredCashflows.length"
      title="Aucun résultat"
      description="Aucun flux ne correspond à votre recherche"
    >
      <template #action>
        <BaseButton variant="outline" @click="searchQuery = ''; activeTab = 'all'">Réinitialiser les filtres</BaseButton>
      </template>
    </BaseEmptyState>

    <!-- ── Create/Edit Modal ────────────────────────────── -->
    <BaseModal
      :open="showFormModal"
      :title="editingId ? 'Modifier le flux' : 'Nouveau flux'"
      @close="showFormModal = false"
    >
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <BaseInput
          v-model="form.name"
          label="Nom"
          placeholder="Ex: Salaire, Loyer, Netflix..."
          required
          :error="errors.name"
        />

        <!-- Flow type toggle -->
        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-text-main dark:text-text-dark-main">Type</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              @click="form.flow_type = 'INFLOW'"
              :class="[
                'py-2.5 rounded-input border text-sm font-medium transition-colors',
                form.flow_type === 'INFLOW'
                  ? 'bg-success/10 border-success/40 text-success'
                  : 'bg-surface dark:bg-surface-dark border-surface-border dark:border-surface-dark-border text-text-muted dark:text-text-dark-muted hover:text-text-main dark:hover:text-text-dark-main',
              ]"
            >
              ↑ Revenu
            </button>
            <button
              type="button"
              @click="form.flow_type = 'OUTFLOW'"
              :class="[
                'py-2.5 rounded-input border text-sm font-medium transition-colors',
                form.flow_type === 'OUTFLOW'
                  ? 'bg-danger/10 border-danger/40 text-danger'
                  : 'bg-surface dark:bg-surface-dark border-surface-border dark:border-surface-dark-border text-text-muted dark:text-text-dark-muted hover:text-text-main dark:hover:text-text-dark-main',
              ]"
            >
              ↓ Dépense
            </button>
          </div>
        </div>

        <BaseAutocomplete
          v-model="form.category"
          label="Catégorie"
          placeholder="Ex: Salaire, Logement, Loisirs..."
          required
          :options="existingCategories"
          :error="errors.category"
        />
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-text-main dark:text-text-dark-main">
              Montant <span class="text-danger ml-0.5">*</span>
            </label>
            <input
              v-model="amountInput"
              type="text"
              inputmode="decimal"
              placeholder="0.00"
              required
              :class="[
                'w-full px-4 py-2.5 rounded-input border bg-surface dark:bg-surface-dark text-text-main dark:text-text-dark-main placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
                errors.amount ? 'border-danger focus:ring-danger/20 focus:border-danger' : 'border-surface-border dark:border-surface-dark-border'
              ]"
            />
            <p v-if="errors.amount" class="text-xs text-danger mt-1">{{ errors.amount }}</p>
          </div>
          <BaseSelect
            v-model="form.frequency"
            label="Fréquence"
            :options="frequencyOptions"
            required
          />
        </div>
        <div v-if="form.frequency === 'MONTHLY' || form.frequency === 'YEARLY'" :class="form.frequency === 'YEARLY' ? 'grid grid-cols-2 gap-4' : ''">
          <BaseSelect
            v-model="selectedDay"
            label="Jour"
            :options="dayOptions"
            required
          />
          <BaseSelect
            v-if="form.frequency === 'YEARLY'"
            v-model="selectedMonth"
            label="Mois"
            :options="monthOptions"
            required
          />
        </div>
        <BaseSelect
          v-if="bankAccountOptions.length > 1"
          v-model="form.bank_account_id"
          label="Compte bancaire lié"
          :options="bankAccountOptions"
        />
      </form>
      <template #footer>
        <BaseButton variant="ghost" @click="showFormModal = false">Annuler</BaseButton>
        <BaseButton :loading="cashflow.isLoading" @click="handleSubmit">
          {{ editingId ? 'Enregistrer' : 'Créer' }}
        </BaseButton>
      </template>
    </BaseModal>

    <!-- ── Delete Confirmation Modal ────────────────────── -->
    <BaseModal
      :open="deleteConfirmId !== null"
      title="Confirmer la suppression"
      size="sm"
      @close="deleteConfirmId = null"
    >
      <p class="text-sm text-text-body dark:text-text-dark-body">
        Êtes-vous sûr de vouloir supprimer ce flux ? Cette action est irréversible.
      </p>
      <template #footer>
        <BaseButton variant="ghost" @click="deleteConfirmId = null">Annuler</BaseButton>
        <BaseButton variant="danger" :loading="cashflow.isLoading" @click="deleteConfirmId !== null && handleDelete(deleteConfirmId)">
          Supprimer
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>