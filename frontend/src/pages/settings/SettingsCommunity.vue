<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useCommunityStore } from '@/stores/community'
import { useAuthStore } from '@/stores/auth'
import { BaseCard, BaseButton, BaseInput, BaseAlert, BaseSkeleton, BaseTextarea } from '@/components'

const communityStore = useCommunityStore()
const auth = useAuthStore()

// Profile fields
const communityActive = ref(false)
const displayName = ref('')
const bio = ref('')

// Position selection
const selectedStockIsins = ref<Set<string>>(new Set())
const selectedCryptoSymbols = ref<Set<string>>(new Set())

// Save state
const isSaving = ref(false)
const saveSuccess = ref(false)

const isLoading = computed(() => communityStore.isLoadingSettings || communityStore.isLoadingPositions)

onMounted(async () => {
  // Load settings and available positions in parallel
  await Promise.all([
    communityStore.fetchSettings(),
    communityStore.fetchAvailablePositions(),
  ])

  if (communityStore.settings) {
    communityActive.value = communityStore.settings.is_active
    displayName.value = communityStore.settings.display_name ?? ''
    bio.value = communityStore.settings.bio ?? ''
    selectedStockIsins.value = new Set(communityStore.settings.shared_stock_isins)
    selectedCryptoSymbols.value = new Set(communityStore.settings.shared_crypto_symbols)
  }
})

function toggleStock(isin: string): void {
  if (selectedStockIsins.value.has(isin)) {
    selectedStockIsins.value.delete(isin)
  } else {
    selectedStockIsins.value.add(isin)
  }
  // Force reactivity
  selectedStockIsins.value = new Set(selectedStockIsins.value)
}

function toggleCrypto(symbol: string): void {
  if (selectedCryptoSymbols.value.has(symbol)) {
    selectedCryptoSymbols.value.delete(symbol)
  } else {
    selectedCryptoSymbols.value.add(symbol)
  }
  selectedCryptoSymbols.value = new Set(selectedCryptoSymbols.value)
}

function selectAllStocks(): void {
  if (!communityStore.availablePositions) return
  selectedStockIsins.value = new Set(communityStore.availablePositions.stocks.map(s => s.symbol))
}

function deselectAllStocks(): void {
  selectedStockIsins.value = new Set()
}

function selectAllCrypto(): void {
  if (!communityStore.availablePositions) return
  selectedCryptoSymbols.value = new Set(communityStore.availablePositions.crypto.map(c => c.symbol))
}

function deselectAllCrypto(): void {
  selectedCryptoSymbols.value = new Set()
}

async function save(): Promise<void> {
  isSaving.value = true
  saveSuccess.value = false
  const success = await communityStore.updateSettings({
    is_active: communityActive.value,
    display_name: displayName.value.trim() || null,
    bio: bio.value.trim() || null,
    shared_stock_isins: [...selectedStockIsins.value],
    shared_crypto_symbols: [...selectedCryptoSymbols.value],
  })
  isSaving.value = false
  if (success) {
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 2000)
  }
}

const totalSelected = computed(() => selectedStockIsins.value.size + selectedCryptoSymbols.value.size)
</script>

<template>
  <div class="space-y-6">
    <!-- Profile Card -->
    <BaseCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-secondary bg-primary/10 flex items-center justify-center shrink-0">
            <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
          </div>
          <h3 class="text-lg font-semibold text-text-main dark:text-text-dark-main">Profil communautaire</h3>
        </div>
      </template>

      <template v-if="isLoading && !communityStore.settings">
        <div class="space-y-4">
          <BaseSkeleton variant="rect" height="2.5rem" />
          <BaseSkeleton variant="rect" height="2.5rem" />
          <BaseSkeleton variant="rect" height="5rem" />
        </div>
      </template>

      <template v-else>
        <p class="text-sm text-text-muted dark:text-text-dark-muted mb-4">
          Personnalisez votre profil public. Seul votre PnL (%) sera visible.
          Aucun montant ni quantité ne sera partagé.
        </p>

        <div class="space-y-5">
          <!-- Enable toggle -->
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-text-main dark:text-text-dark-main">Activer le profil</p>
              <p class="text-sm text-text-muted dark:text-text-dark-muted">
                Votre profil sera visible par les utilisateurs connectés
              </p>
            </div>
            <button
              type="button"
              @click="communityActive = !communityActive"
              :class="[
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0',
                communityActive ? 'bg-primary' : 'bg-surface-border dark:bg-surface-dark-border',
              ]"
              :aria-pressed="communityActive"
            >
              <span
                :class="[
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm',
                  communityActive ? 'translate-x-6' : 'translate-x-1',
                ]"
              />
            </button>
          </div>

          <!-- Profile fields (shown when active) -->
          <Transition
            enter-active-class="transition-all duration-200 overflow-hidden"
            enter-from-class="opacity-0 max-h-0"
            enter-to-class="opacity-100 max-h-96"
            leave-active-class="transition-all duration-200 overflow-hidden"
            leave-from-class="opacity-100 max-h-96"
            leave-to-class="opacity-0 max-h-0"
          >
            <div v-if="communityActive" class="space-y-4 pt-4 border-t border-surface-border dark:border-surface-dark-border">
              <!-- Preview avatar + username -->
              <div class="flex items-center gap-3 p-3 rounded-card bg-background-subtle dark:bg-surface-dark">
                <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span class="text-primary text-lg font-bold">
                    {{ (displayName || auth.user?.username || '?').charAt(0).toUpperCase() }}
                  </span>
                </div>
                <div>
                  <p class="font-medium text-text-main dark:text-text-dark-main">
                    {{ displayName || auth.user?.username }}
                  </p>
                  <p v-if="bio" class="text-sm text-text-muted dark:text-text-dark-muted line-clamp-1">{{ bio }}</p>
                </div>
              </div>

              <BaseInput
                v-model="displayName"
                label="Nom d'affichage (optionnel)"
                placeholder="Par défaut : votre nom d'utilisateur"
                maxlength="100"
              />
              <BaseTextarea
                v-model="bio"
                label="Bio (optionnel)"
                :rows="3"
                placeholder="Présentez-vous en quelques mots..."
                maxlength="500"
              />
            </div>
          </Transition>
        </div>
      </template>
    </BaseCard>

    <!-- Position Selection -->
    <Transition
      enter-active-class="transition-all duration-300 overflow-hidden"
      enter-from-class="opacity-0 max-h-0"
      enter-to-class="opacity-100 max-h-[200rem]"
      leave-active-class="transition-all duration-300 overflow-hidden"
      leave-from-class="opacity-100 max-h-[200rem]"
      leave-to-class="opacity-0 max-h-0"
    >
      <BaseCard v-if="communityActive">
        <template #header>
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-secondary bg-primary/10 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" /></svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-text-main dark:text-text-dark-main">Positions partagées</h3>
              <p v-if="totalSelected > 0" class="text-xs text-text-muted dark:text-text-dark-muted">
                {{ totalSelected }} position(s) sélectionnée(s)
              </p>
            </div>
          </div>
        </template>

        <template v-if="communityStore.isLoadingPositions">
          <div class="space-y-3">
            <BaseSkeleton v-for="i in 4" :key="i" variant="rect" height="2.5rem" />
          </div>
        </template>

        <template v-else-if="!communityStore.availablePositions || (communityStore.availablePositions.stocks.length === 0 && communityStore.availablePositions.crypto.length === 0)">
          <div class="text-center py-6">
            <p class="text-text-muted dark:text-text-dark-muted">
              Aucune position disponible à partager.
            </p>
            <p class="text-sm text-text-muted dark:text-text-dark-muted mt-1">
              Ajoutez des transactions dans vos comptes Bourse ou Crypto pour qu'elles apparaissent ici.
            </p>
          </div>
        </template>

        <template v-else>
          <p class="text-sm text-text-muted dark:text-text-dark-muted mb-4">
            Cochez les positions dont vous souhaitez partager le PnL (%).
            Seules les positions avec un solde positif sont disponibles.
          </p>

          <!-- Stocks -->
          <div v-if="communityStore.availablePositions.stocks.length > 0" class="mb-6">
            <div class="flex items-center justify-between mb-3">
              <p class="text-sm font-semibold text-text-main dark:text-text-dark-main flex items-center gap-2">
                <span class="inline-block w-2 h-2 rounded-full bg-primary"></span>
                Actions ({{ communityStore.availablePositions.stocks.length }})
              </p>
              <div class="flex gap-2 text-xs">
                <button
                  type="button"
                  @click="selectAllStocks"
                  class="text-primary hover:underline"
                >
                  Tout cocher
                </button>
                <span class="text-text-muted dark:text-text-dark-muted">|</span>
                <button
                  type="button"
                  @click="deselectAllStocks"
                  class="text-text-muted dark:text-text-dark-muted hover:text-danger"
                >
                  Tout décocher
                </button>
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label
                v-for="pos in communityStore.availablePositions.stocks"
                :key="pos.symbol"
                :class="[
                  'flex items-center gap-3 p-3 rounded-card border cursor-pointer transition-colors',
                  selectedStockIsins.has(pos.symbol)
                    ? 'border-primary bg-primary/5 dark:bg-primary/10'
                    : 'border-surface-border dark:border-surface-dark-border hover:border-primary/40',
                ]"
              >
                <input
                  type="checkbox"
                  :checked="selectedStockIsins.has(pos.symbol)"
                  @change="toggleStock(pos.symbol)"
                  class="accent-primary shrink-0 w-4 h-4"
                />
                <span class="font-medium text-sm text-text-main dark:text-text-dark-main">{{ pos.symbol }}</span>
              </label>
            </div>
          </div>

          <!-- Crypto -->
          <div v-if="communityStore.availablePositions.crypto.length > 0">
            <div class="flex items-center justify-between mb-3">
              <p class="text-sm font-semibold text-text-main dark:text-text-dark-main flex items-center gap-2">
                <span class="inline-block w-2 h-2 rounded-full bg-info"></span>
                Crypto ({{ communityStore.availablePositions.crypto.length }})
              </p>
              <div class="flex gap-2 text-xs">
                <button
                  type="button"
                  @click="selectAllCrypto"
                  class="text-primary hover:underline"
                >
                  Tout cocher
                </button>
                <span class="text-text-muted dark:text-text-dark-muted">|</span>
                <button
                  type="button"
                  @click="deselectAllCrypto"
                  class="text-text-muted dark:text-text-dark-muted hover:text-danger"
                >
                  Tout décocher
                </button>
              </div>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <label
                v-for="pos in communityStore.availablePositions.crypto"
                :key="pos.symbol"
                :class="[
                  'flex items-center gap-3 p-3 rounded-card border cursor-pointer transition-colors',
                  selectedCryptoSymbols.has(pos.symbol)
                    ? 'border-info bg-info/5 dark:bg-info/10'
                    : 'border-surface-border dark:border-surface-dark-border hover:border-info/40',
                ]"
              >
                <input
                  type="checkbox"
                  :checked="selectedCryptoSymbols.has(pos.symbol)"
                  @change="toggleCrypto(pos.symbol)"
                  class="accent-primary shrink-0 w-4 h-4"
                />
                <span class="font-medium text-sm text-text-main dark:text-text-dark-main">{{ pos.symbol }}</span>
              </label>
            </div>
          </div>
        </template>
      </BaseCard>
    </Transition>

    <!-- Save button -->
    <div class="flex items-center justify-between">
      <BaseAlert v-if="saveSuccess" variant="success" class="flex-1 mr-4 py-1.5!">
        Paramètres communautaires sauvegardés.
      </BaseAlert>
      <BaseAlert v-if="communityStore.error" variant="danger" class="flex-1 mr-4 py-1.5!">
        {{ communityStore.error }}
      </BaseAlert>
      <div class="ml-auto">
        <BaseButton @click="save" :loading="isSaving" size="sm">
          Enregistrer
        </BaseButton>
      </div>
    </div>
  </div>
</template>
