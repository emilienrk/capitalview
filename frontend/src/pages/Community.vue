<script setup lang="ts">
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
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
          </svg>
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
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            <span class="hidden sm:inline">Configurer mon profil</span>
            <span class="sm:hidden">Profil</span>
          </BaseButton>
        </RouterLink>
      </template>
    </PageHeader>

    <BaseAlert v-if="communityStore.error" variant="danger" dismissible @dismiss="communityStore.error = null" class="mb-6">
      {{ communityStore.error }}
    </BaseAlert>

    <div class="max-w-4xl">
      <!-- My picks panel -->
      <template v-if="showMyPicks">
        <button
          @click="closeMyPicks"
          class="mb-4 text-sm text-primary hover:underline flex items-center gap-1"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Retour
        </button>

        <BaseCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <svg class="w-5 h-5 text-danger" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                </svg>
                <h3 class="text-lg font-semibold text-text-main dark:text-text-dark-main">Ma watchlist</h3>
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
            <svg class="w-12 h-12 mx-auto text-text-muted dark:text-text-dark-muted mb-3" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
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
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                  </button>
                  <button
                    @click="handleDeletePick(pick.id)"
                    class="p-1 text-text-muted dark:text-text-dark-muted hover:text-danger transition-colors"
                    title="Supprimer"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
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
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
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
                      <svg class="w-3 h-3 inline mr-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
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
            <svg class="w-12 h-12 mx-auto text-text-muted dark:text-text-dark-muted mb-3" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
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
                  <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 9v7.5" />
                  </svg>
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
                <svg class="w-10 h-10 mx-auto text-text-muted dark:text-text-dark-muted mb-2" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                </svg>
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
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                          </svg>
                        </button>
                        <button
                          @click="handleDeletePick(pick.id)"
                          class="p-1 text-text-muted dark:text-text-dark-muted hover:text-danger transition-colors"
                          title="Supprimer"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
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
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted dark:text-text-dark-muted pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
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
                      <svg class="w-3 h-3 inline" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                    </BaseBadge>
                    <BaseBadge v-if="result.is_mutual" variant="success" size="sm">Mutuel</BaseBadge>
                  </div>
                  <p v-if="result.display_name" class="text-xs text-text-muted dark:text-text-dark-muted">
                    @{{ result.username }}
                  </p>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <BaseBadge v-if="result.is_following" variant="info" size="sm">Suivi</BaseBadge>
                  <svg class="w-5 h-5 text-text-muted dark:text-text-dark-muted" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
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
                <svg class="w-12 h-12 mx-auto text-text-muted dark:text-text-dark-muted mb-3" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                </svg>
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
                  <svg class="w-5 h-5 text-text-muted dark:text-text-dark-muted" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
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
