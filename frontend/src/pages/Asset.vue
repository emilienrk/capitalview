<script setup lang="ts">
import { Check, Clock3, Eye, EyeOff, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-vue-next'

import { onMounted, ref, computed } from 'vue'
import { apiClient } from '@/api/client'
import { useDashboardStore } from '@/stores/dashboard'
import { useBankStore } from '@/stores/bank'
import { useAssetStore } from '@/stores/asset'
import { useSettingsStore } from '@/stores/settings'
import { useFormatters } from '@/composables/useFormatters'
import { usePrivacyMode } from '@/composables/usePrivacyMode'
import PageHeader from '@/components/PageHeader.vue'
import AssetFormModal from '@/components/AssetFormModal.vue'
import AssetHistoryModal from '@/components/AssetHistoryModal.vue'
import AssetEvolutionChart from '@/components/AssetEvolutionChart.vue'
import {
  BaseCard, BaseAlert, BaseEmptyState, BaseStatCard, BaseButton, BaseModal, BaseInput,
} from '@/components'
import type { AssetCreate, AssetUpdate, AssetResponse, AssetHistorySnapshotResponse } from '@/types'

const dashboard = useDashboardStore()
const bank = useBankStore()
const asset = useAssetStore()
const settingsStore = useSettingsStore()
const { formatCurrency, formatPercent, profitLossClass, formatDate, formatDateShort } = useFormatters()
const { privacyMode, togglePrivacyMode, maskValue } = usePrivacyMode()

const bankEnabled = computed(() => settingsStore.settings?.bank_module_enabled ?? true)

// 3 cols when bank is shown, 2 when hidden
const breakdownColsClass = computed(() =>
  bankEnabled.value ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'
)

const showAssetModal = ref(false)
const editingAsset = ref<AssetResponse | null>(null)
const showHistoryModal = ref(false)
const historyAsset = ref<AssetResponse | null>(null)

const showSellModal = ref(false)
const sellingAsset = ref<AssetResponse | null>(null)
const sellPrice = ref<number | string>('')
const sellDate = ref<string>(new Date().toISOString().substring(0, 10))

const assetHistory = ref<AssetHistorySnapshotResponse[]>([])
const isLoadingAssetHistory = ref(false)
const assetHistoryError = ref<string | null>(null)

async function fetchAssetHistory(): Promise<void> {
  isLoadingAssetHistory.value = true
  assetHistoryError.value = null
  try {
    const history = await apiClient.get<AssetHistorySnapshotResponse[]>('/assets/history')
    assetHistory.value = [...history].sort((a, b) =>
      new Date(a.snapshot_date).getTime() - new Date(b.snapshot_date).getTime()
    )
  } catch (e) {
    assetHistoryError.value = e instanceof Error ? e.message : 'Erreur lors du chargement de l\'evolution des assets'
  } finally {
    isLoadingAssetHistory.value = false
  }
}

onMounted(async () => {
  const promises: Promise<unknown>[] = [
    dashboard.fetchAll(settingsStore.settings),
    asset.fetchAssets(),
    fetchAssetHistory(),
  ]
  if (bankEnabled.value) {
    promises.push(bank.fetchAccounts())
  }
  await Promise.all(promises)
})

/**
 * Total net worth = (bank balance if enabled) + portfolio current value + personal assets
 */
function totalNetWorth(): number | null {
  const bankTotal = bankEnabled.value ? (Number(bank.summary?.total_balance) || 0) : 0
  const portfolioValue = Number(dashboard.portfolio?.current_value ?? dashboard.portfolio?.total_invested) || 0
  const assetsTotal = Number(asset.summary?.total_estimated_value) || 0
  return bankTotal + portfolioValue + assetsTotal
}

function openAddAsset(): void {
  editingAsset.value = null
  showAssetModal.value = true
}

function openEditAsset(a: AssetResponse): void {
  editingAsset.value = a
  showAssetModal.value = true
}

function openHistory(a: AssetResponse): void {
  historyAsset.value = a
  showHistoryModal.value = true
}

function openSellModal(a: AssetResponse): void {
  sellingAsset.value = a
  sellPrice.value = a.estimated_value
  sellDate.value = new Date().toISOString().substring(0, 10)
  showSellModal.value = true
}

async function confirmSell(): Promise<void> {
  if (!sellingAsset.value) return
  await asset.sellAsset(sellingAsset.value.id, {
    sold_price: Number(sellPrice.value) || 0,
    sold_at: sellDate.value || new Date().toISOString().substring(0, 10),
  })
  showSellModal.value = false
  sellingAsset.value = null
}

async function confirmHardDelete(): Promise<void> {
  if (!sellingAsset.value) return
  await asset.deleteAsset(sellingAsset.value.id)
  showSellModal.value = false
  sellingAsset.value = null
}

async function onSaveAsset(data: AssetCreate | AssetUpdate): Promise<void> {
  if (editingAsset.value) {
    await asset.updateAsset(editingAsset.value.id, data as AssetUpdate)
  } else {
    await asset.createAsset(data as AssetCreate)
  }
  showAssetModal.value = false
}

const groupedAssets = computed(() => {
  if (!asset.summary) return []
  const map = new Map<string, AssetResponse[]>()
  for (const a of asset.summary.assets) {
    const list = map.get(a.category) ?? []
    list.push(a)
    map.set(a.category, list)
  }
  return Array.from(map.entries()).map(([category, items]) => ({ category, items }))
})
</script>

<template>
  <div>
    <PageHeader title="Patrimoine" description="Vue d'ensemble de votre patrimoine total">
      <template #actions>
        <button
          @click="togglePrivacyMode"
          :title="privacyMode ? 'Afficher les valeurs' : 'Masquer les valeurs'"
          class="w-9 h-9 flex items-center justify-center rounded-button border border-surface-border dark:border-surface-dark-border bg-surface dark:bg-surface-dark text-text-muted dark:text-text-dark-muted hover:text-primary dark:hover:text-primary transition-colors"
        >
          <Eye v-if="!privacyMode" class="w-5 h-5" />
          <EyeOff v-else class="w-5 h-5" />
        </button>
      </template>
    </PageHeader>

    <BaseAlert v-if="dashboard.error" variant="danger" class="mb-6">{{ dashboard.error }}</BaseAlert>

    <div class="space-y-8">
      <!-- Net Worth -->
      <div class="p-6 rounded-card bg-primary/5 border border-primary/10 text-center">
        <p class="text-sm text-text-muted dark:text-text-dark-muted">Patrimoine total estimé</p>
        <p class="text-4xl font-bold text-text-main dark:text-text-dark-main mt-2">
          {{ maskValue(formatCurrency(totalNetWorth())) }}
        </p>
      </div>

      <!-- Breakdown -->
      <div :class="['grid gap-4', breakdownColsClass]">
        <BaseStatCard
          v-if="bankEnabled"
          label="Liquidités"
          :value="maskValue(formatCurrency(bank.summary?.total_balance))"
        />
        <BaseStatCard
          label="Investissements"
          :value="maskValue(formatCurrency(dashboard.portfolio?.current_value ?? dashboard.portfolio?.total_invested))"
          :sub-value="formatPercent(dashboard.portfolio?.profit_loss_percentage)"
          :sub-value-class="profitLossClass(dashboard.portfolio?.profit_loss_percentage)"
        />
        <BaseStatCard
          label="Biens personnels"
          :value="maskValue(formatCurrency(asset.summary?.total_estimated_value))"
          :sub-value="asset.summary?.asset_count ? `${asset.summary.asset_count} bien(s)` : undefined"
        />
      </div>

      <!-- Asset evolution chart -->
      <BaseCard title="Evolution des assets">
        <BaseAlert v-if="assetHistoryError" variant="danger" class="mb-4">{{ assetHistoryError }}</BaseAlert>
        <div v-if="isLoadingAssetHistory" class="h-44 rounded-secondary border border-surface-border dark:border-surface-dark-border flex items-center justify-center text-sm text-text-muted dark:text-text-dark-muted">
          Chargement de l'evolution...
        </div>
        <AssetEvolutionChart v-else :history="assetHistory" />
      </BaseCard>

      <!-- ═══════════════ PERSONAL ASSETS ═══════════════ -->
      <BaseCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-text-main dark:text-text-dark-main">Biens personnels</h3>
              <p class="text-sm text-text-muted dark:text-text-dark-muted mt-0.5">
                Objets, véhicules, skins, collections…
              </p>
            </div>
            <BaseButton size="sm" @click="openAddAsset">
              <Plus class="w-4 h-4 mr-1" />
              Ajouter
            </BaseButton>
          </div>
        </template>

        <!-- Error -->
        <BaseAlert v-if="asset.error" variant="danger" class="mb-4">{{ asset.error }}</BaseAlert>

        <!-- Empty state -->
        <BaseEmptyState
          v-if="asset.summary && asset.summary.asset_count === 0"
          title="Aucun bien enregistré"
          description="Ajoutez vos possessions pour les inclure dans votre patrimoine"
          action-label="Ajouter un bien"
          @action="openAddAsset"
        />

        <!-- Assets grouped by category -->
        <div v-else-if="asset.summary" class="space-y-6">
          <!-- Category summary pills -->
          <div v-if="asset.summary && asset.summary.categories.length > 1" class="flex flex-wrap gap-2">
            <span
              v-for="cat in asset.summary.categories"
              :key="cat.category"
              class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
            >
              {{ cat.category }}
              <span class="opacity-70">{{ formatCurrency(cat.total_estimated_value) }}</span>
            </span>
          </div>

          <!-- Asset list by category -->
          <div v-for="group in groupedAssets" :key="group.category" class="space-y-2">
            <h4 class="text-sm font-semibold text-text-muted dark:text-text-dark-muted uppercase tracking-wide">
              {{ group.category }}
            </h4>
            <div class="space-y-2">
              <div
                v-for="a in group.items"
                :key="a.id"
                class="flex items-center justify-between p-4 rounded-secondary border border-surface-border dark:border-surface-dark-border bg-surface dark:bg-surface-dark hover:border-primary/20 transition-colors"
              >
                <div class="min-w-0 flex-1">
                  <p class="font-medium text-text-main dark:text-text-dark-main truncate">{{ a.name }}</p>
                  <div class="hidden sm:flex items-center gap-3 mt-0.5">
                    <p v-if="a.acquisition_date" class="text-xs text-text-muted dark:text-text-dark-muted">
                      Acquis le {{ formatDate(a.acquisition_date) }}
                    </p>
                    <p v-if="a.purchase_price !== null && a.purchase_price > 0" class="text-xs text-text-muted dark:text-text-dark-muted">
                      Acheté {{ formatCurrency(a.purchase_price) }}
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-4 ml-4">
                  <div class="text-right">
                    <p class="font-semibold text-text-main dark:text-text-dark-main">{{ formatCurrency(a.estimated_value) }}</p>
                    <p v-if="a.last_valuation_date" class="text-xs text-text-muted dark:text-text-dark-muted inline-flex items-center gap-1 justify-end">
                      <RefreshCw class="w-3 h-3 shrink-0" />
                      <span class="hidden sm:inline">{{ formatDate(a.last_valuation_date) }}</span>
                      <span class="sm:hidden">{{ formatDateShort(a.last_valuation_date) }}</span>
                    </p>
                  </div>
                  <!-- Actions -->
                  <div class="flex items-center gap-1">
                    <button
                      @click="openHistory(a)"
                      class="p-1.5 rounded-secondary text-text-muted dark:text-text-dark-muted hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Historique"
                    >
                      <Clock3 class="w-4 h-4" />
                    </button>
                    <button
                      @click="openEditAsset(a)"
                      class="p-1.5 rounded-secondary text-text-muted dark:text-text-dark-muted hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Modifier"
                    >
                      <Pencil class="w-4 h-4" />
                    </button>
                    <button
                      @click="openSellModal(a)"
                      class="p-1.5 rounded-secondary text-text-muted dark:text-text-dark-muted hover:text-danger hover:bg-danger/10 transition-colors"
                      title="Vendu / Supprimer"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </BaseCard>
    </div>

    <!-- Modals -->
    <AssetFormModal
      :open="showAssetModal"
      :asset="editingAsset"
      @close="showAssetModal = false"
      @save="onSaveAsset"
    />
    <AssetHistoryModal
      :open="showHistoryModal"
      :asset="historyAsset"
      @close="showHistoryModal = false"
    />

    <!-- Sell / Remove modal -->
    <BaseModal :open="showSellModal" title="Retirer un bien" size="md" @close="showSellModal = false">
      <div v-if="sellingAsset" class="space-y-4">
        <p class="text-text-body dark:text-text-dark-muted">
          Que souhaitez-vous faire avec <span class="font-semibold text-text-main dark:text-text-dark-main">{{ sellingAsset.name }}</span> ?
        </p>

        <div class="p-4 rounded-secondary border border-surface-border dark:border-surface-dark-border bg-surface dark:bg-surface-dark space-y-3">
          <p class="text-sm font-medium text-text-main dark:text-text-dark-main">Vendu / Donné</p>
          <p class="text-xs text-text-muted dark:text-text-dark-muted">Le bien sera archivé.</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <BaseInput
              v-model="sellPrice"
              label="Prix de vente"
              type="number"
              placeholder="0"
            />
            <BaseInput
              v-model="sellDate"
              label="Date"
              type="date"
            />
          </div>
          <BaseButton class="w-full" @click="confirmSell">
            <Check class="w-4 h-4 mr-1.5" />
            Marquer comme vendu / donné
          </BaseButton>
        </div>

        <div class="relative">
          <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-surface-border dark:border-surface-dark-border"></div></div>
          <div class="relative flex justify-center text-xs"><span class="px-2 bg-background dark:bg-background-dark text-text-muted dark:text-text-dark-muted">ou</span></div>
        </div>

        <div class="p-4 rounded-secondary border border-danger/20 bg-danger/5 space-y-3">
          <p class="text-sm font-medium text-danger">Supprimer définitivement</p>
          <p class="text-xs text-text-muted dark:text-text-dark-muted">Le bien et tout son historique seront supprimés. Cette action est irréversible.</p>
          <BaseButton variant="danger" class="w-full" @click="confirmHardDelete">
            <Trash2 class="w-4 h-4 mr-1.5" />
            Supprimer définitivement
          </BaseButton>
        </div>
      </div>
      <template #footer>
        <BaseButton variant="ghost" @click="showSellModal = false">Annuler</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
