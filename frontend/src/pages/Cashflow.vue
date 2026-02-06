<script setup lang="ts">
import { onMounted, ref, reactive, computed } from 'vue'
import { useCashflowStore } from '@/stores/cashflow'
import { useFormatters } from '@/composables/useFormatters'
import PageHeader from '@/components/PageHeader.vue'
import {
  BaseCard, BaseButton, BaseInput, BaseSelect, BaseModal,
  BaseSpinner, BaseAlert, BaseEmptyState, BaseBadge, BaseStatCard,
} from '@/components'
import type { CashflowCreate, CashflowResponse, FlowType, Frequency } from '@/types'

const cashflow = useCashflowStore()
const { formatCurrency, formatDate, profitLossClass } = useFormatters()

// ── State ────────────────────────────────────────────────────
const showFormModal = ref(false)
const editingId = ref<number | null>(null)
const activeTab = ref<'all' | 'inflows' | 'outflows'>('all')
const searchQuery = ref('')
const deleteConfirmId = ref<number | null>(null)

const form = reactive<CashflowCreate>({
  name: '',
  flow_type: 'INFLOW' as FlowType,
  category: '',
  amount: 0,
  frequency: 'MONTHLY' as Frequency,
  transaction_date: new Date().toISOString().split('T')[0] as string,
})

// ── Options ──────────────────────────────────────────────────
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

// ── Computed ─────────────────────────────────────────────────
const filteredCashflows = computed<CashflowResponse[]>(() => {
  let items = [...cashflow.cashflows]

  // Filter by tab
  if (activeTab.value === 'inflows') {
    items = items.filter((c) => c.flow_type === 'INFLOW')
  } else if (activeTab.value === 'outflows') {
    items = items.filter((c) => c.flow_type === 'OUTFLOW')
  }

  // Filter by search
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    items = items.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q),
    )
  }

  // Sort by date descending
  items.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())

  return items
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
    const key = `${c.flow_type}-${c.category}`
    const existing = map.get(key)
    if (existing) {
      existing.total += Number(c.monthly_amount)
      existing.count++
    } else {
      map.set(key, { category: c.category, flow_type: c.flow_type, total: Number(c.monthly_amount), count: 1 })
    }
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total)
})

// ── Actions ──────────────────────────────────────────────────
function resetForm(): void {
  form.name = ''
  form.flow_type = 'INFLOW'
  form.category = ''
  form.amount = 0
  form.frequency = 'MONTHLY'
  form.transaction_date = new Date().toISOString().split('T')[0] as string
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
  showFormModal.value = true
}

async function handleSubmit(): Promise<void> {
  if (editingId.value) {
    await cashflow.updateCashflow(editingId.value, {
      name: form.name,
      category: form.category,
      amount: form.amount,
      frequency: form.frequency,
      transaction_date: form.transaction_date,
    })
  } else {
    await cashflow.createCashflow({ ...form })
  }
  showFormModal.value = false
  await cashflow.fetchBalance()
}

async function handleDelete(id: number): Promise<void> {
  await cashflow.deleteCashflow(id)
  deleteConfirmId.value = null
  await cashflow.fetchBalance()
}

// ── Lifecycle ────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([cashflow.fetchAll(), cashflow.fetchBalance()])
})
</script>

<template>
  <div>
    <PageHeader title="Flux de trésorerie" description="Gérez vos revenus et dépenses récurrents et ponctuels">
      <template #actions>
        <BaseButton @click="openCreate()">+ Nouveau flux</BaseButton>
      </template>
    </PageHeader>

    <!-- Loading -->
    <div v-if="cashflow.isLoading && !cashflow.cashflows.length" class="flex justify-center py-20">
      <BaseSpinner size="lg" label="Chargement..." />
    </div>

    <!-- Error -->
    <BaseAlert v-if="cashflow.error" variant="danger" dismissible @dismiss="cashflow.error = null" class="mb-6">
      {{ cashflow.error }}
    </BaseAlert>

    <!-- ── Stats Cards ──────────────────────────────────── -->
    <div v-if="cashflow.cashflows.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <BaseStatCard
        label="Revenus mensuels"
        :value="formatCurrency(inflowsTotal)"
        sub-value-class="text-success"
      >
        <template #icon>
          <div class="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
            <svg class="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
          </div>
        </template>
      </BaseStatCard>

      <BaseStatCard
        label="Dépenses mensuelles"
        :value="formatCurrency(outflowsTotal)"
        sub-value-class="text-danger"
      >
        <template #icon>
          <div class="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center">
            <svg class="w-5 h-5 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
            </svg>
          </div>
        </template>
      </BaseStatCard>

      <BaseStatCard
        label="Balance nette"
        :value="formatCurrency(netBalance)"
        :sub-value-class="profitLossClass(netBalance)"
      >
        <template #icon>
          <div :class="['w-10 h-10 rounded-full flex items-center justify-center', netBalance >= 0 ? 'bg-success/10' : 'bg-danger/10']">
            <svg :class="['w-5 h-5', netBalance >= 0 ? 'text-success' : 'text-danger']" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
          </div>
        </template>
      </BaseStatCard>

      <BaseStatCard
        label="Taux d'épargne"
        :value="savingsRate !== null ? `${savingsRate.toFixed(1)} %` : '—'"
        :sub-value="savingsRate !== null && savingsRate > 0 ? 'Positif' : savingsRate !== null ? 'Négatif' : undefined"
        :sub-value-class="savingsRate !== null && savingsRate >= 0 ? 'text-success' : 'text-danger'"
      >
        <template #icon>
          <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
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
              {{ formatCurrency(cat.total) }}
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
              {{ formatCurrency(cat.total) }}
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
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted dark:text-text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
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
                <span class="text-sm text-text-muted dark:text-text-dark-muted">{{ formatDate(item.transaction_date) }}</span>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-1">
                  <BaseButton size="sm" variant="ghost" @click="openEdit(item)">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </BaseButton>
                  <BaseButton size="sm" variant="ghost" @click="deleteConfirmId = item.id">
                    <svg class="w-4 h-4 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
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
      v-else-if="!cashflow.isLoading && !cashflow.cashflows.length"
      title="Aucun flux de trésorerie"
      description="Commencez par ajouter vos revenus et dépenses pour suivre votre cash flow"
      action-label="Ajouter un flux"
      @action="openCreate()"
    >
      <template #icon>
        <svg class="w-8 h-8 text-text-muted dark:text-text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </template>
    </BaseEmptyState>

    <!-- Empty filtered results -->
    <BaseEmptyState
      v-else-if="!cashflow.isLoading && cashflow.cashflows.length && !filteredCashflows.length"
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
        />
        <BaseSelect
          v-model="form.flow_type"
          label="Type"
          :options="flowTypeOptions"
          required
        />
        <BaseInput
          v-model="form.category"
          label="Catégorie"
          placeholder="Ex: Salaire, Logement, Loisirs..."
          required
        />
        <div class="grid grid-cols-2 gap-4">
          <BaseInput
            v-model="form.amount"
            label="Montant"
            type="number"
            placeholder="0.00"
            required
          />
          <BaseSelect
            v-model="form.frequency"
            label="Fréquence"
            :options="frequencyOptions"
            required
          />
        </div>
        <BaseInput
          v-model="form.transaction_date"
          label="Date"
          type="date"
          required
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
