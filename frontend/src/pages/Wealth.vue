<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useDashboardStore } from '@/stores/dashboard'
import { useBankStore } from '@/stores/bank'
import { useAssetStore } from '@/stores/asset'
import { useFormatters } from '@/composables/useFormatters'
import PageHeader from '@/components/PageHeader.vue'
import AssetFormModal from '@/components/AssetFormModal.vue'
import AssetHistoryModal from '@/components/AssetHistoryModal.vue'
import {
  BaseCard, BaseSpinner, BaseAlert, BaseEmptyState, BaseStatCard, BaseButton, BaseModal, BaseInput,
} from '@/components'
import type { AssetCreate, AssetUpdate, AssetResponse } from '@/types'

const dashboard = useDashboardStore()
const bank = useBankStore()
const asset = useAssetStore()
const { formatCurrency, formatPercent, profitLossClass, formatAccountType, formatDate, formatDateShort } = useFormatters()

// Asset modal state
const showAssetModal = ref(false)
const editingAsset = ref<AssetResponse | null>(null)
const showHistoryModal = ref(false)
const historyAsset = ref<AssetResponse | null>(null)

// Sell modal state
const showSellModal = ref(false)
const sellingAsset = ref<AssetResponse | null>(null)
const sellPrice = ref<number | string>('')
const sellDate = ref<string>(new Date().toISOString().substring(0, 10))

onMounted(async () => {
  await Promise.all([
    dashboard.fetchAll(),
    bank.fetchAccounts(),
    asset.fetchAssets(),
  ])
})

/**
 * Total net worth = bank balance + portfolio current value + personal assets
 */
function totalNetWorth(): number | null {
  const bankTotal = Number(bank.summary?.total_balance) || 0
  const portfolioValue = Number(dashboard.portfolio?.current_value ?? dashboard.portfolio?.total_invested) || 0
  const assetsTotal = Number(asset.summary?.total_estimated_value) || 0
  return bankTotal + portfolioValue + assetsTotal
}

// ─── Asset actions ───────────────────────────────────────
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

// ─── Computed helpers ────────────────────────────────────
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
    <PageHeader title="Patrimoine" description="Vue d'ensemble de votre patrimoine total" />

    <div v-if="dashboard.isLoading" class="flex justify-center py-20">
      <BaseSpinner size="lg" label="Chargement du patrimoine..." />
    </div>

    <BaseAlert v-if="dashboard.error" variant="danger" class="mb-6">{{ dashboard.error }}</BaseAlert>

    <div v-else class="space-y-8">
      <!-- Net Worth -->
      <div class="p-6 rounded-card bg-primary/5 border border-primary/10 text-center">
        <p class="text-sm text-text-muted dark:text-text-dark-muted">Patrimoine total estimé</p>
        <p class="text-4xl font-bold text-text-main dark:text-text-dark-main mt-2">
          {{ formatCurrency(totalNetWorth()) }}
        </p>
      </div>

      <!-- Breakdown -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <BaseStatCard
          label="Liquidités"
          :value="formatCurrency(bank.summary?.total_balance)"
        />
        <BaseStatCard
          label="Investissements"
          :value="formatCurrency(dashboard.portfolio?.current_value ?? dashboard.portfolio?.total_invested)"
          :sub-value="formatPercent(dashboard.portfolio?.profit_loss_percentage)"
          :sub-value-class="profitLossClass(dashboard.portfolio?.profit_loss_percentage)"
        />
        <BaseStatCard
          label="Biens personnels"
          :value="formatCurrency(asset.summary?.total_estimated_value)"
          :sub-value="asset.summary?.asset_count ? `${asset.summary.asset_count} bien(s)` : undefined"
        />
      </div>

      <!-- Account breakdown by type -->
      <BaseCard title="Répartition par compte">
        <div v-if="dashboard.portfolio?.accounts?.length" class="space-y-3">
          <div
            v-for="account in dashboard.portfolio.accounts"
            :key="account.account_id"
            class="flex items-center justify-between py-2 border-b border-surface-border dark:border-surface-dark-border last:border-0"
          >
            <div>
              <p class="font-medium text-text-main dark:text-text-dark-main">{{ account.account_name }}</p>
              <p class="text-xs text-text-muted dark:text-text-dark-muted">{{ formatAccountType(account.account_type) }}</p>
            </div>
            <div class="text-right">
              <p class="font-semibold text-text-main dark:text-text-dark-main">{{ formatCurrency(account.current_value ?? account.total_invested) }}</p>
              <p :class="['text-xs font-medium', profitLossClass(account.profit_loss)]">
                {{ formatPercent(account.profit_loss_percentage) }}
              </p>
            </div>
          </div>
        </div>
        <BaseEmptyState v-else title="Aucun investissement" description="Ajoutez des comptes pour visualiser votre répartition" />
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
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Ajouter
            </BaseButton>
          </div>
        </template>

        <!-- Loading -->
        <div v-if="asset.isLoading && !asset.summary" class="flex justify-center py-8">
          <BaseSpinner size="md" />
        </div>

        <!-- Error -->
        <BaseAlert v-if="asset.error" variant="danger" class="mb-4">{{ asset.error }}</BaseAlert>

        <!-- Empty state -->
        <BaseEmptyState
          v-if="!asset.isLoading && (!asset.summary || asset.summary.asset_count === 0)"
          title="Aucun bien enregistré"
          description="Ajoutez vos possessions pour les inclure dans votre patrimoine"
          action-label="Ajouter un bien"
          @action="openAddAsset"
        />

        <!-- Assets grouped by category -->
        <div v-else class="space-y-6">
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
                    <p class="text-xs text-text-muted dark:text-text-dark-muted inline-flex items-center gap-1 justify-end">
                      <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span class="hidden sm:inline">{{ formatDate(a.updated_at) }}</span>
                      <span class="sm:hidden">{{ formatDateShort(a.updated_at) }}</span>
                    </p>
                  </div>
                  <!-- Actions -->
                  <div class="flex items-center gap-1">
                    <button
                      @click="openHistory(a)"
                      class="p-1.5 rounded-secondary text-text-muted dark:text-text-dark-muted hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Historique"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    <button
                      @click="openEditAsset(a)"
                      class="p-1.5 rounded-secondary text-text-muted dark:text-text-dark-muted hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Modifier"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      @click="openSellModal(a)"
                      class="p-1.5 rounded-secondary text-text-muted dark:text-text-dark-muted hover:text-danger hover:bg-danger/10 transition-colors"
                      title="Vendu / Supprimer"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
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
          <p class="text-xs text-text-muted dark:text-text-dark-muted">Le bien sera archivé. Laissez le prix à 0 si c'est un don.</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <BaseInput
              v-model="sellPrice"
              label="Prix de vente"
              type="number"
              placeholder="0 si donné"
            />
            <BaseInput
              v-model="sellDate"
              label="Date"
              type="date"
            />
          </div>
          <BaseButton class="w-full" @click="confirmSell">
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
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
            <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
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
