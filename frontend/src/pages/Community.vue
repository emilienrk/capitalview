<script setup lang="ts">
import { Calendar, Check, ChevronRight, Heart, Lock, Pencil, Search, Settings, ShieldCheck, Trash2, Users } from 'lucide-vue-next'

import { onMounted, ref, watch, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useCommunityStore } from '@/stores/community'
import { useAuthStore } from '@/stores/auth'
import { useStocksStore } from '@/stores/stocks'
import { useCryptoStore } from '@/stores/crypto'
import PageHeader from '@/components/PageHeader.vue'
import {
  BaseCard, BaseAlert, BaseSkeleton, BaseSpinner, BaseBadge,
  BaseButton, BaseModal, BaseAutocomplete, BaseInput, BaseTextarea,
} from '@/components'
import type { PickCreate, PickResponse, AssetSearchResult } from '@/types'

const communityStore = useCommunityStore()
const authStore = useAuthStore()
const stocksStore = useStocksStore()
const cryptoStore = useCryptoStore()

const selectedUsername = ref<string | null>(null)
const searchQuery = ref('')
let searchTimeout: ReturnType<typeof setTimeout> | null = null

// Main view mode: 'list' (profiles), 'profile' (detail), 'my-picks' (own picks panel)
const showMyPicks = ref(false)

// Profile detail tab
const profileTab = ref<'positions' | 'picks' | 'about'>('positions')

// Pick modal state
const showPickModal = ref(false)
const editingPick = ref<PickResponse | null>(null)
const pickForm = ref<{ symbol: string; asset_type: 'CRYPTO' | 'STOCK'; comment: string; target_price: string }>({
  symbol: '',
  asset_type: 'STOCK',
  comment: '',
  target_price: '',
})
const pickSubmitting = ref(false)

// Asset search for pick modal
const assetSearchQuery = ref('')
const assetSearchResults = ref<AssetSearchResult[]>([])
const isSearchingAssets = ref(false)
let assetSearchTimeout: ReturnType<typeof setTimeout> | null = null

onMounted(async () => {
  await Promise.all([
    communityStore.fetchProfiles(),
    communityStore.fetchMyPicks(),
  ])
})

// Debounced search for profiles
watch(searchQuery, (val) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  if (!val.trim()) {
    communityStore.searchResults = []
    return
  }
  searchTimeout = setTimeout(() => {
    communityStore.searchProfiles(val)
  }, 300)
})

// Debounced asset search for pick modal
function handleAssetSearch(query: string): void {
  assetSearchQuery.value = query

  if (assetSearchTimeout) clearTimeout(assetSearchTimeout)
  if (!query || query.length < 2) {
    assetSearchResults.value = []
    return
  }

  assetSearchTimeout = setTimeout(async () => {
    isSearchingAssets.value = true
    try {
      const searchFn = pickForm.value.asset_type === 'CRYPTO'
        ? cryptoStore.searchAssets
        : stocksStore.searchAssets
      assetSearchResults.value = await searchFn(query)
    } catch (e) {
      console.error('Asset search error:', e)
      assetSearchResults.value = []
    } finally {
      isSearchingAssets.value = false
    }
  }, 300)
}

function handleSelectAsset(asset: AssetSearchResult): void {
  pickForm.value.symbol = asset.symbol
  assetSearchQuery.value = asset.name ? `${asset.symbol} — ${asset.name}` : asset.symbol
  assetSearchResults.value = []
}

function formatAssetDisplay(asset: AssetSearchResult): string {
  if (asset.name) {
    return `${asset.symbol} — ${asset.name}${asset.exchange ? ` (${asset.exchange})` : ''}`
  }
  return asset.symbol
}

async function viewProfile(username: string): Promise<void> {
  showMyPicks.value = false
  selectedUsername.value = username
  profileTab.value = 'positions'
  await communityStore.fetchProfile(username)
}

function closeProfile(): void {
  selectedUsername.value = null
  communityStore.viewedProfile = null
}

function openMyPicks(): void {
  selectedUsername.value = null
  communityStore.viewedProfile = null
  showMyPicks.value = true
}

function closeMyPicks(): void {
  showMyPicks.value = false
}

async function handleFollow(username: string): Promise<void> {
  await communityStore.followUser(username)
  if (selectedUsername.value === username) {
    await communityStore.fetchProfile(username)
  }
  await communityStore.fetchProfiles()
}

async function handleUnfollow(username: string): Promise<void> {
  await communityStore.unfollowUser(username)
  if (selectedUsername.value === username) {
    await communityStore.fetchProfile(username)
  }
  await communityStore.fetchProfiles()
}

function formatPnl(pnl: number | null): string {
  if (pnl === null) return '—'
  const sign = pnl >= 0 ? '+' : ''
  return `${sign}${pnl.toFixed(2)} %`
}

function pnlColorClass(pnl: number | null): string {
  if (pnl === null) return 'text-text-muted dark:text-text-dark-muted'
  return pnl >= 0 ? 'text-success' : 'text-danger'
}

function isOwnProfile(username: string): boolean {
  return authStore.user?.username === username
}

// ── Pick actions ─────────────────────────────────────────

function openAddPick(): void {
  editingPick.value = null
  pickForm.value = { symbol: '', asset_type: 'STOCK', comment: '', target_price: '' }
  assetSearchQuery.value = ''
  assetSearchResults.value = []
  showPickModal.value = true
}

function openEditPick(pick: PickResponse): void {
  editingPick.value = pick
  pickForm.value = {
    symbol: pick.symbol,
    asset_type: pick.asset_type,
    comment: pick.comment || '',
    target_price: pick.target_price !== null ? String(pick.target_price) : '',
  }
  assetSearchQuery.value = pick.symbol
  assetSearchResults.value = []
  showPickModal.value = true
}

function closePickModal(): void {
  showPickModal.value = false
  editingPick.value = null
  assetSearchQuery.value = ''
  assetSearchResults.value = []
}

// Re-trigger search when asset type changes (stock vs crypto)
watch(() => pickForm.value.asset_type, () => {
  if (assetSearchQuery.value.length >= 2 && !editingPick.value) {
    handleAssetSearch(assetSearchQuery.value)
  }
})

const isPickFormValid = computed(() => {
  return pickForm.value.symbol.trim().length > 0
})

async function submitPick(): Promise<void> {
  if (!isPickFormValid.value || pickSubmitting.value) return
  pickSubmitting.value = true

  const targetPrice = pickForm.value.target_price.trim()
    ? parseFloat(pickForm.value.target_price.replace(',', '.'))
    : null

  if (editingPick.value) {
    await communityStore.updatePick(editingPick.value.id, {
      comment: pickForm.value.comment.trim() || null,
      target_price: isNaN(targetPrice as number) ? null : targetPrice,
    })
  } else {
    const data: PickCreate = {
      symbol: pickForm.value.symbol.trim().toUpperCase(),
      asset_type: pickForm.value.asset_type,
      comment: pickForm.value.comment.trim() || null,
      target_price: isNaN(targetPrice as number) ? null : targetPrice,
    }
    await communityStore.createPick(data)
  }
  pickSubmitting.value = false
  closePickModal()
}

async function handleDeletePick(pickId: number): Promise<void> {
  await communityStore.deletePick(pickId)
}

/** Whether viewing the current user's own profile. */
const isViewingOwnProfile = computed(() => {
  if (!communityStore.viewedProfile) return false
  return isOwnProfile(communityStore.viewedProfile.username)
})

/** Picks displayed on the currently viewed profile. */
const profilePicks = computed(() => {
  return communityStore.viewedProfile?.picks ?? []
})
</script>

<template>
  <div>
    <PageHeader
      title="Communauté"
      description="Recherchez des investisseurs et suivez leurs performances"
    >
      <template #actions>
        <BaseButton variant="outline" size="sm" @click="openMyPicks">
          <Heart class="w-4 h-4" stroke-width="2" />
          Ma watchlist
          <span
            v-if="communityStore.myPicks.length > 0"
            class="inline-flex items-center justify-center px-1.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary"
          >
            {{ communityStore.myPicks.length }}
          </span>
        </BaseButton>
        <RouterLink :to="{ path: '/settings', query: { tab: 'communaute' } }">
          <BaseButton variant="outline" size="sm">
            <Settings class="w-4 h-4" stroke-width="2" />
            <span class="hidden sm:inline">Configurer mon profil</span>
          </BaseButton>
        </RouterLink>
      </template>
    </PageHeader>

    <BaseAlert v-if="communityStore.error" variant="danger" dismissible @dismiss="communityStore.error = null" class="mb-6">
      {{ communityStore.error }}
    </BaseAlert>

    <div>
      <!-- My picks panel -->
      <template v-if="showMyPicks">
        <button
          @click="closeMyPicks"
          class="mb-4 text-sm text-primary hover:underline flex items-center gap-1"
        >
          <Check class="w-4 h-4" stroke-width="2" />
          Retour
        </button>

        <BaseCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <ShieldCheck class="w-5 h-5 text-danger" />
                <h3 class="text-lg font-semibold text-text-main dark:text-text-dark-main">Watchlist</h3>
                <span
                  v-if="communityStore.myPicks.length > 0"
                  class="inline-flex items-center justify-center px-1.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary"
                >
                  {{ communityStore.myPicks.length }}
                </span>
              </div>
              <BaseButton size="sm" @click="openAddPick">
                + Ajouter
              </BaseButton>
            </div>
          </template>

          <BaseSpinner v-if="communityStore.isLoadingPicks" class="mx-auto my-8" />

          <div v-else-if="communityStore.myPicks.length === 0" class="text-center py-8">
            <Heart class="w-12 h-12 mx-auto text-text-muted dark:text-text-dark-muted mb-3" stroke-width="1.5" />
            <p class="text-text-muted dark:text-text-dark-muted font-medium">Aucun élément dans la watchlist</p>
            <p class="text-sm text-text-muted dark:text-text-dark-muted mt-1">
              Ajoutez des actions ou cryptos que vous surveillez.
            </p>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="pick in communityStore.myPicks"
              :key="pick.id"
              class="p-3 rounded-primary border border-surface-border dark:border-surface-dark-border bg-background-subtle dark:bg-background-dark"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <BaseBadge :variant="pick.asset_type === 'CRYPTO' ? 'info' : 'secondary'" size="sm">
                    {{ pick.asset_type }}
                  </BaseBadge>
                  <span class="font-semibold text-text-main dark:text-text-dark-main">{{ pick.symbol }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span v-if="pick.target_price !== null" class="text-xs text-text-muted dark:text-text-dark-muted">
                    Cible : <span class="font-medium text-text-main dark:text-text-dark-main">{{ pick.target_price }}</span>
                  </span>
                  <button
                    @click="openEditPick(pick)"
                    class="p-1 text-text-muted dark:text-text-dark-muted hover:text-primary transition-colors"
                    title="Modifier"
                  >
                    <Pencil class="w-4 h-4" stroke-width="2" />
                  </button>
                  <button
                    @click="handleDeletePick(pick.id)"
                    class="p-1 text-text-muted dark:text-text-dark-muted hover:text-danger transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 class="w-4 h-4" stroke-width="2" />
                  </button>
                </div>
              </div>
              <p v-if="pick.comment" class="mt-2 text-sm text-text-body dark:text-text-dark-main">
                {{ pick.comment }}
              </p>
              <p class="mt-1 text-xs text-text-muted dark:text-text-dark-muted">
                {{ new Date(pick.created_at).toLocaleDateString('fr-FR') }}
              </p>
            </div>
          </div>
        </BaseCard>
      </template>

      <!-- Profile detail view -->
      <template v-else-if="selectedUsername && communityStore.viewedProfile">
        <button
          @click="closeProfile"
          class="mb-4 text-sm text-primary hover:underline flex items-center gap-1"
        >
          <Check class="w-4 h-4" stroke-width="2" />
          Retour
        </button>

        <BaseCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span class="text-primary text-lg font-bold">
                    {{ (communityStore.viewedProfile.display_name || communityStore.viewedProfile.username).charAt(0).toUpperCase() }}
                  </span>
                </div>
                <div>
                  <div class="flex items-center gap-2 flex-wrap">
                    <h3 class="text-lg font-semibold text-text-main dark:text-text-dark-main">
                      {{ communityStore.viewedProfile.display_name || communityStore.viewedProfile.username }}
                    </h3>
                    <BaseBadge v-if="communityStore.viewedProfile.is_private" variant="secondary" size="sm">
                      <Lock class="w-3 h-3 inline mr-0.5" stroke-width="2" />
                      Privé
                    </BaseBadge>
                  </div>
                  <p v-if="communityStore.viewedProfile.display_name" class="text-sm text-text-muted dark:text-text-dark-muted">
                    @{{ communityStore.viewedProfile.username }}
                  </p>
                </div>
              </div>
              <div class="flex flex-col items-end gap-2">
                <!-- Follow / Unfollow button -->
                <BaseButton
                  v-if="!isOwnProfile(communityStore.viewedProfile.username)"
                  :variant="communityStore.viewedProfile.is_following ? 'outline' : 'primary'"
                  size="sm"
                  @click="communityStore.viewedProfile.is_following
                    ? handleUnfollow(communityStore.viewedProfile.username)
                    : handleFollow(communityStore.viewedProfile.username)"
                >
                  {{ communityStore.viewedProfile.is_following ? 'Ne plus suivre' : 'Suivre' }}
                </BaseButton>
                <BaseBadge v-if="communityStore.viewedProfile.is_mutual" variant="success" size="sm">
                  Abonnement mutuel
                </BaseBadge>
                <!-- Global PnL -->
                <div v-if="communityStore.viewedProfile.global_pnl_percentage !== null" class="text-right">
                  <p class="text-xs text-text-muted dark:text-text-dark-muted">PnL Global</p>
                  <p class="text-xl font-bold" :class="pnlColorClass(communityStore.viewedProfile.global_pnl_percentage)">
                    {{ formatPnl(communityStore.viewedProfile.global_pnl_percentage) }}
                  </p>
                </div>
              </div>
            </div>
          </template>

          <!-- Private + not mutual message -->
          <div
            v-if="communityStore.viewedProfile.is_private && !communityStore.viewedProfile.is_mutual && !isOwnProfile(communityStore.viewedProfile.username)"
            class="text-center py-8"
          >
            <Lock class="w-12 h-12 mx-auto text-text-muted dark:text-text-dark-muted mb-3" stroke-width="1.5" />
            <p class="text-text-muted dark:text-text-dark-muted font-medium">Compte privé</p>
            <p class="text-sm text-text-muted dark:text-text-dark-muted mt-1">
              Suivez cet utilisateur et attendez qu'il vous suive en retour pour voir ses positions.
            </p>
          </div>

          <!-- Tab navigation -->
          <template v-else>
            <div class="flex border-b border-surface-border dark:border-surface-dark-border mb-4">
              <button
                @click="profileTab = 'positions'"
                :class="[
                  'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
                  profileTab === 'positions'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted dark:text-text-dark-muted hover:text-text-main dark:hover:text-text-dark-main',
                ]"
              >
                Positions
              </button>
              <button
                @click="profileTab = 'picks'"
                :class="[
                  'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
                  profileTab === 'picks'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted dark:text-text-dark-muted hover:text-text-main dark:hover:text-text-dark-main',
                ]"
              >
                Picks
                <span
                  v-if="profilePicks.length > 0"
                  class="ml-1.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs rounded-full bg-primary/10 text-primary"
                >
                  {{ profilePicks.length }}
                </span>
              </button>
              <button
                @click="profileTab = 'about'"
                :class="[
                  'px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
                  profileTab === 'about'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted dark:text-text-dark-muted hover:text-text-main dark:hover:text-text-dark-main',
                ]"
              >
                À propos
              </button>
            </div>

            <!-- Positions tab -->
            <template v-if="profileTab === 'positions'">
              <div v-if="communityStore.viewedProfile.positions.length === 0" class="text-center py-8">
                <p class="text-text-muted dark:text-text-dark-muted">Aucune position partagée.</p>
              </div>

              <div v-else class="divide-y divide-surface-border dark:divide-surface-dark-border">
                <div
                  v-for="pos in communityStore.viewedProfile.positions"
                  :key="pos.symbol + pos.asset_type"
                  class="flex items-center justify-between py-3"
                >
                  <div class="flex items-center gap-3">
                    <BaseBadge :variant="pos.asset_type === 'CRYPTO' ? 'info' : 'secondary'" size="sm">
                      {{ pos.asset_type }}
                    </BaseBadge>
                    <div>
                      <span class="font-medium text-text-main dark:text-text-dark-main">{{ pos.name || pos.symbol }}</span>
                      <span v-if="pos.name" class="block text-xs text-text-muted dark:text-text-dark-muted">{{ pos.symbol }}</span>
                    </div>
                  </div>
                  <span class="font-semibold tabular-nums" :class="pnlColorClass(pos.pnl_percentage)">
                    {{ formatPnl(pos.pnl_percentage) }}
                  </span>
                </div>
              </div>
            </template>

            <!-- About tab -->
            <template v-if="profileTab === 'about'">
              <div class="space-y-4 py-2">
                <!-- Bio -->
                <div v-if="communityStore.viewedProfile.bio">
                  <p class="text-xs font-semibold uppercase tracking-wide text-text-muted dark:text-text-dark-muted mb-1">Description</p>
                  <p class="text-sm text-text-body dark:text-text-dark-main">
                    {{ communityStore.viewedProfile.bio }}
                  </p>
                </div>
                <div v-else>
                  <p class="text-sm text-text-muted dark:text-text-dark-muted italic">Aucune description.</p>
                </div>

                <!-- Stats -->
                <div class="grid grid-cols-2 gap-3">
                  <div class="p-3 rounded-primary bg-background-subtle dark:bg-background-dark border border-surface-border dark:border-surface-dark-border">
                    <p class="text-xs text-text-muted dark:text-text-dark-muted mb-0.5">Abonnés</p>
                    <p class="text-lg font-bold text-text-main dark:text-text-dark-main">{{ communityStore.viewedProfile.followers_count }}</p>
                  </div>
                  <div class="p-3 rounded-primary bg-background-subtle dark:bg-background-dark border border-surface-border dark:border-surface-dark-border">
                    <p class="text-xs text-text-muted dark:text-text-dark-muted mb-0.5">Abonnements</p>
                    <p class="text-lg font-bold text-text-main dark:text-text-dark-main">{{ communityStore.viewedProfile.following_count }}</p>
                  </div>
                </div>

                <!-- Member since -->
                <div v-if="communityStore.viewedProfile.created_at" class="flex items-center gap-2 text-sm text-text-muted dark:text-text-dark-muted">
                  <Calendar class="w-4 h-4 shrink-0" stroke-width="2" />
                  Membre depuis le {{ new Date(communityStore.viewedProfile.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) }}
                </div>
              </div>
            </template>

            <!-- Picks tab -->
            <template v-if="profileTab === 'picks'">
              <!-- Add pick button (own profile only) -->
              <div v-if="isViewingOwnProfile" class="mb-4">
                <BaseButton size="sm" @click="openAddPick">
                  + Ajouter un pick
                </BaseButton>
              </div>

              <div v-if="profilePicks.length === 0" class="text-center py-8">
                <Heart class="w-10 h-10 mx-auto text-text-muted dark:text-text-dark-muted mb-2" stroke-width="1.5" />
                <p class="text-text-muted dark:text-text-dark-muted">
                  {{ isViewingOwnProfile ? 'Vous n\'avez pas encore de picks.' : 'Aucun pick pour le moment.' }}
                </p>
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="pick in profilePicks"
                  :key="pick.id"
                  class="p-3 rounded-primary border border-surface-border dark:border-surface-dark-border bg-background-subtle dark:bg-background-dark"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <BaseBadge :variant="pick.asset_type === 'CRYPTO' ? 'info' : 'secondary'" size="sm">
                        {{ pick.asset_type }}
                      </BaseBadge>
                      <span class="font-semibold text-text-main dark:text-text-dark-main">{{ pick.symbol }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span v-if="pick.target_price !== null" class="text-xs text-text-muted dark:text-text-dark-muted">
                        Cible : <span class="font-medium text-text-main dark:text-text-dark-main">{{ pick.target_price }}</span>
                      </span>
                      <!-- Edit / Delete buttons (own profile only) -->
                      <template v-if="isViewingOwnProfile">
                        <button
                          @click="openEditPick(pick)"
                          class="p-1 text-text-muted dark:text-text-dark-muted hover:text-primary transition-colors"
                          title="Modifier"
                        >
                          <Pencil class="w-4 h-4" stroke-width="2" />
                        </button>
                        <button
                          @click="handleDeletePick(pick.id)"
                          class="p-1 text-text-muted dark:text-text-dark-muted hover:text-danger transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 class="w-4 h-4" stroke-width="2" />
                        </button>
                      </template>
                    </div>
                  </div>
                  <p v-if="pick.comment" class="mt-2 text-sm text-text-body dark:text-text-dark-main">
                    {{ pick.comment }}
                  </p>
                  <p class="mt-1 text-xs text-text-muted dark:text-text-dark-muted">
                    {{ new Date(pick.created_at).toLocaleDateString('fr-FR') }}
                  </p>
                </div>
              </div>
            </template>
          </template>
        </BaseCard>
      </template>

      <!-- Loading profile -->
      <template v-else-if="selectedUsername && communityStore.isLoadingProfile">
        <div class="flex items-center justify-center py-12">
          <BaseSpinner />
        </div>
      </template>

      <!-- Main view: Search + Profiles list -->
      <template v-else>
        <!-- Search bar -->
        <div class="mb-6">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted dark:text-text-dark-muted pointer-events-none" stroke-width="2" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Rechercher un investisseur par pseudo..."
              class="w-full pl-10 pr-4 py-2.5 text-sm rounded-input border border-surface-border dark:border-surface-dark-border bg-surface dark:bg-surface-dark text-text-main dark:text-text-dark-main placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <BaseSpinner v-if="communityStore.isSearching" class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" />
          </div>
        </div>

        <!-- Search results -->
        <template v-if="searchQuery.trim()">
          <template v-if="communityStore.searchResults.length > 0">
            <p class="text-sm text-text-muted dark:text-text-dark-muted mb-3">
              {{ communityStore.searchResults.length }} résultat(s)
            </p>
            <div class="space-y-2">
              <button
                v-for="result in communityStore.searchResults"
                :key="result.username"
                @click="viewProfile(result.username)"
                class="w-full flex items-center gap-3 p-4 rounded-card bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border hover:border-primary transition-colors text-left"
              >
                <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span class="text-primary font-bold">
                    {{ (result.display_name || result.username).charAt(0).toUpperCase() }}
                  </span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <p class="font-medium text-text-main dark:text-text-dark-main truncate">
                      {{ result.display_name || result.username }}
                    </p>
                    <BaseBadge v-if="result.is_private" variant="secondary" size="sm">
                      <Lock class="w-3 h-3 inline" stroke-width="2" />
                    </BaseBadge>
                    <BaseBadge v-if="result.is_mutual" variant="success" size="sm">Mutuel</BaseBadge>
                  </div>
                  <p v-if="result.display_name" class="text-xs text-text-muted dark:text-text-dark-muted">
                    @{{ result.username }}
                  </p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <BaseBadge v-if="result.is_following" variant="info" size="sm">Suivi</BaseBadge>
                  <ChevronRight class="w-5 h-5 text-text-muted dark:text-text-dark-muted" stroke-width="2" />
                </div>
              </button>
            </div>
          </template>

          <template v-else-if="!communityStore.isSearching">
            <BaseCard>
              <div class="text-center py-6">
                <p class="text-text-muted dark:text-text-dark-muted">
                  Aucun résultat pour « {{ searchQuery }} »
                </p>
                <p class="text-sm text-text-muted dark:text-text-dark-muted mt-1">
                  Les comptes privés n'apparaissent que si vous recherchez le pseudo exact.
                </p>
              </div>
            </BaseCard>
          </template>
        </template>

        <!-- Public profiles list (when no search) -->
        <template v-else>
          <p class="text-sm font-medium text-text-muted dark:text-text-dark-muted mb-3">
            Profils publics
          </p>

          <template v-if="communityStore.isLoadingProfiles">
            <div class="space-y-3">
              <BaseSkeleton v-for="i in 5" :key="i" variant="rect" height="3.5rem" />
            </div>
          </template>

          <template v-else-if="communityStore.profiles.length === 0">
            <BaseCard>
              <div class="text-center py-8">
                <Users class="w-12 h-12 mx-auto text-text-muted dark:text-text-dark-muted mb-3" stroke-width="1.5" />
                <p class="text-text-muted dark:text-text-dark-muted">
                  Aucun profil communautaire public pour le moment.
                </p>
                <p class="text-sm text-text-muted dark:text-text-dark-muted mt-1">
                  Utilisez la barre de recherche pour trouver un investisseur par pseudo.
                </p>
              </div>
            </BaseCard>
          </template>

          <template v-else>
            <div class="space-y-2">
              <button
                v-for="profile in communityStore.profiles"
                :key="profile.username"
                @click="viewProfile(profile.username)"
                class="w-full flex items-center gap-3 p-4 rounded-card bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border hover:border-primary transition-colors text-left"
              >
                <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span class="text-primary font-bold">
                    {{ (profile.display_name || profile.username).charAt(0).toUpperCase() }}
                  </span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <p class="font-medium text-text-main dark:text-text-dark-main truncate">
                      {{ profile.display_name || profile.username }}
                    </p>
                    <BaseBadge v-if="profile.is_mutual" variant="success" size="sm">Mutuel</BaseBadge>
                  </div>
                  <p v-if="profile.display_name" class="text-xs text-text-muted dark:text-text-dark-muted">
                    @{{ profile.username }}
                  </p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <BaseBadge v-if="profile.is_following" variant="info" size="sm">Suivi</BaseBadge>
                  <ChevronRight class="w-5 h-5 text-text-muted dark:text-text-dark-muted" stroke-width="2" />
                </div>
              </button>
            </div>
          </template>
        </template>
      </template>
    </div>

    <!-- Pick modal (global, accessible from any view) -->
    <BaseModal
      :open="showPickModal"
      :title="editingPick ? 'Modifier le pick' : 'Ajouter un pick'"
      size="sm"
      @close="closePickModal"
    >
      <form id="pick-form" @submit.prevent="submitPick" class="space-y-4">
        <!-- Asset type toggle -->
        <div>
          <label class="block text-sm font-medium text-text-main dark:text-text-dark-main mb-1.5">Type</label>
          <div class="flex gap-3">
            <label
              :class="[
                'flex-1 px-3 py-2 text-center text-sm rounded-input border cursor-pointer transition-colors',
                pickForm.asset_type === 'STOCK'
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-surface-border dark:border-surface-dark-border text-text-muted dark:text-text-dark-muted hover:border-primary/50',
              ]"
            >
              <input v-model="pickForm.asset_type" type="radio" value="STOCK" class="sr-only" :disabled="!!editingPick" />
              Action
            </label>
            <label
              :class="[
                'flex-1 px-3 py-2 text-center text-sm rounded-input border cursor-pointer transition-colors',
                pickForm.asset_type === 'CRYPTO'
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-surface-border dark:border-surface-dark-border text-text-muted dark:text-text-dark-muted hover:border-primary/50',
              ]"
            >
              <input v-model="pickForm.asset_type" type="radio" value="CRYPTO" class="sr-only" :disabled="!!editingPick" />
              Crypto
            </label>
          </div>
        </div>

        <!-- Symbol autocomplete -->
        <BaseAutocomplete
          v-if="!editingPick"
          :modelValue="assetSearchQuery"
          @update:modelValue="handleAssetSearch"
          @select="handleSelectAsset"
          label="Actif"
          :placeholder="pickForm.asset_type === 'CRYPTO' ? 'Rechercher BTC, ETH, SOL…' : 'Rechercher AAPL, MSFT, LVMH…'"
          :options="assetSearchResults"
          :remote="true"
          :loading="isSearchingAssets"
          :displayValue="formatAssetDisplay"
          required
        >
          <template #item="{ item }">
            <div class="flex items-center justify-between w-full">
              <div>
                <span class="font-medium">{{ item.symbol }}</span>
                <span v-if="item.name" class="text-text-muted dark:text-text-dark-muted ml-1.5">{{ item.name }}</span>
              </div>
              <span v-if="item.exchange" class="text-xs text-text-muted dark:text-text-dark-muted">{{ item.exchange }}</span>
            </div>
          </template>
        </BaseAutocomplete>

        <!-- Display symbol as read-only when editing -->
        <BaseInput
          v-if="editingPick"
          :modelValue="pickForm.symbol"
          label="Symbole"
          disabled
        />

        <!-- Target price -->
        <BaseInput
          v-model="pickForm.target_price"
          label="Prix regardé (optionnel)"
          placeholder="En euros"
          type="text"
        />

        <!-- Comment -->
        <BaseTextarea
          v-model="pickForm.comment"
          label="Note publique (optionnel)"
          placeholder="Pourquoi ce choix ?"
          :rows="3"
        />
      </form>

      <template #footer>
        <BaseButton variant="ghost" @click="closePickModal">
          Annuler
        </BaseButton>
        <BaseButton
          type="submit"
          form="pick-form"
          :loading="pickSubmitting"
          :disabled="!isPickFormValid"
        >
          {{ editingPick ? 'Modifier' : 'Ajouter' }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
