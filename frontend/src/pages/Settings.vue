<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useDarkMode } from '@/composables/useDarkMode'
import { useFormatters } from '@/composables/useFormatters'
import PageHeader from '@/components/PageHeader.vue'
import { BaseCard, BaseButton, BaseInput, BaseAlert, BaseSkeleton } from '@/components'

const auth = useAuthStore()
const settingsStore = useSettingsStore()
const { isDark, toggleDarkMode } = useDarkMode()
const { formatDateTime } = useFormatters()

// Local form state for financial settings
const flatTaxRate = ref(30)
const taxPeaRate = ref(17.2)
const yieldExpectation = ref(5)
const inflationRate = ref(2)
const objectives = ref('')
const isSaving = ref(false)
const saveSuccess = ref(false)

// Crypto module settings
const cryptoModuleEnabled = ref(false)
const cryptoMode = ref<'SINGLE' | 'MULTI'>('SINGLE')
// null = use auto-fetched live rate
const usdEurRate = ref<number | null>(null)
const isSavingCrypto = ref(false)
const saveCryptoSuccess = ref(false)

onMounted(async () => {
  await settingsStore.fetchSettings()
  if (settingsStore.settings) {
    flatTaxRate.value = +(settingsStore.settings.flat_tax_rate * 100).toFixed(2)
    taxPeaRate.value = +(settingsStore.settings.tax_pea_rate * 100).toFixed(2)
    yieldExpectation.value = +(settingsStore.settings.yield_expectation * 100).toFixed(2)
    inflationRate.value = +(settingsStore.settings.inflation_rate * 100).toFixed(2)
    objectives.value = settingsStore.settings.objectives ?? ''
    cryptoModuleEnabled.value = settingsStore.settings.crypto_module_enabled
    cryptoMode.value = settingsStore.settings.crypto_mode
    usdEurRate.value = settingsStore.settings.usd_eur_rate ?? null
  }
})

async function saveFinancialSettings(): Promise<void> {
  isSaving.value = true
  saveSuccess.value = false
  const success = await settingsStore.updateSettings({
    flat_tax_rate: flatTaxRate.value / 100,
    tax_pea_rate: taxPeaRate.value / 100,
    yield_expectation: yieldExpectation.value / 100,
    inflation_rate: inflationRate.value / 100,
  })
  isSaving.value = false
  if (success) {
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 2000)
  }
}

async function saveObjectives(): Promise<void> {
  isSaving.value = true
  saveSuccess.value = false
  const success = await settingsStore.updateSettings({
    objectives: objectives.value || null,
  })
  isSaving.value = false
  if (success) {
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 2000)
  }
}

async function saveCryptoSettings(): Promise<void> {
  isSavingCrypto.value = true
  saveCryptoSuccess.value = false
  const success = await settingsStore.updateSettings({
    crypto_module_enabled: cryptoModuleEnabled.value,
    crypto_mode: cryptoModuleEnabled.value ? cryptoMode.value : undefined,
    usd_eur_rate: usdEurRate.value,
  })
  isSavingCrypto.value = false
  if (success) {
    saveCryptoSuccess.value = true
    setTimeout(() => { saveCryptoSuccess.value = false }, 2000)
  }
}
</script>

<template>
  <div>
    <PageHeader title="Paramètres" description="Configuration de votre compte et préférences" />

    <BaseAlert v-if="settingsStore.error" variant="danger" dismissible @dismiss="settingsStore.error = null" class="mb-6">
      {{ settingsStore.error }}
    </BaseAlert>

    <BaseAlert v-if="saveSuccess" variant="success" class="mb-6">
      Paramètres sauvegardés.
    </BaseAlert>

    <div class="space-y-6 max-w-2xl">
      <!-- Profile -->
      <BaseCard title="Profil">
        <div class="space-y-4">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span class="text-primary text-2xl font-bold">
                {{ auth.user?.username?.charAt(0).toUpperCase() ?? '?' }}
              </span>
            </div>
            <div>
              <p class="text-lg font-semibold text-text-main dark:text-text-dark-main">
                {{ auth.user?.username }}
              </p>
              <p class="text-sm text-text-muted dark:text-text-dark-muted">
                {{ auth.user?.email }}
              </p>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4 pt-4 border-t border-surface-border dark:border-surface-dark-border">
            <div>
              <p class="text-xs text-text-muted dark:text-text-dark-muted">Dernière connexion</p>
              <p class="text-sm font-medium text-text-main dark:text-text-dark-main">
                {{ formatDateTime(auth.user?.last_login) }}
              </p>
            </div>
            <div>
              <p class="text-xs text-text-muted dark:text-text-dark-muted">Membre depuis</p>
              <p class="text-sm font-medium text-text-main dark:text-text-dark-main">
                {{ formatDateTime(auth.user?.created_at) }}
              </p>
            </div>
          </div>
        </div>
      </BaseCard>

      <!-- Appearance -->
      <BaseCard title="Apparence">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-text-main dark:text-text-dark-main">Thème sombre</p>
            <p class="text-sm text-text-muted dark:text-text-dark-muted">
              Basculer entre le mode clair et sombre
            </p>
          </div>
          <button
            @click="toggleDarkMode"
            :class="[
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              isDark ? 'bg-primary' : 'bg-surface-border dark:bg-surface-dark-border',
            ]"
          >
            <span
              :class="[
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm',
                isDark ? 'translate-x-6' : 'translate-x-1',
              ]"
            />
          </button>
        </div>
      </BaseCard>

      <!-- Financial Parameters -->
      <BaseCard title="Paramètres financiers">
        <template v-if="settingsStore.isLoading && !settingsStore.settings">
          <div class="space-y-4">
            <div v-for="i in 4" :key="i" class="space-y-2">
              <BaseSkeleton variant="rect" width="30%" height="0.75rem" />
              <BaseSkeleton variant="rect" height="2.5rem" />
            </div>
          </div>
        </template>
        <template v-else>
          <p class="text-sm text-text-muted dark:text-text-dark-muted mb-4">
            Ces taux sont utilisés pour les projections et calculs de fiscalité.
          </p>
          <form @submit.prevent="saveFinancialSettings" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <BaseInput
                v-model="flatTaxRate"
                label="Flat Tax / PFU (%)"
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="30"
              />
              <BaseInput
                v-model="taxPeaRate"
                label="Prélèvements sociaux PEA (%)"
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="17.2"
              />
              <BaseInput
                v-model="yieldExpectation"
                label="Rendement attendu (%)"
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="5"
              />
              <BaseInput
                v-model="inflationRate"
                label="Taux d'inflation (%)"
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="2"
              />
            </div>
            <div class="flex justify-end">
              <BaseButton type="submit" :loading="isSaving" size="sm">
                Enregistrer
              </BaseButton>
            </div>
          </form>
        </template>
      </BaseCard>

      <!-- Objectives -->
      <BaseCard title="Objectifs patrimoniaux">
        <template v-if="settingsStore.isLoading && !settingsStore.settings">
          <div class="space-y-2">
            <BaseSkeleton variant="rect" height="5rem" />
          </div>
        </template>
        <template v-else>
          <p class="text-sm text-text-muted dark:text-text-dark-muted mb-4">
            Notez vos objectifs d'investissement et d'épargne.
          </p>
          <form @submit.prevent="saveObjectives" class="space-y-4">
            <textarea
              v-model="objectives"
              rows="4"
              placeholder="Vos objectifs d'épargne et d'investissement..."
              class="w-full rounded-input border border-surface-border dark:border-surface-dark-border bg-surface dark:bg-surface-dark text-text-main dark:text-text-dark-main placeholder:text-text-muted/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors resize-y"
            />
            <div class="flex justify-end">
              <BaseButton type="submit" :loading="isSaving" size="sm">
                Enregistrer
              </BaseButton>
            </div>
          </form>
        </template>
      </BaseCard>

      <!-- Crypto Module -->
      <BaseCard title="Module Crypto">
        <template v-if="settingsStore.isLoading && !settingsStore.settings">
          <div class="space-y-4">
            <BaseSkeleton variant="rect" height="2.5rem" />
          </div>
        </template>
        <template v-else>
          <p class="text-sm text-text-muted dark:text-text-dark-muted mb-4">
            Activez et configurez le suivi de vos crypto-monnaies.
          </p>
          <div class="space-y-5">
            <!-- Enable toggle -->
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-text-main dark:text-text-dark-main">Activer le module Crypto</p>
                <p class="text-sm text-text-muted dark:text-text-dark-muted">
                  Affiche l'entrée Crypto dans la navigation
                </p>
              </div>
              <button
                type="button"
                @click="cryptoModuleEnabled = !cryptoModuleEnabled"
                :class="[
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  cryptoModuleEnabled ? 'bg-primary' : 'bg-surface-border dark:bg-surface-dark-border',
                ]"
                :aria-pressed="cryptoModuleEnabled"
              >
                <span
                  :class="[
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm',
                    cryptoModuleEnabled ? 'translate-x-6' : 'translate-x-1',
                  ]"
                />
              </button>
            </div>

            <!-- Mode selection (only shown when module is enabled) -->
            <Transition
              enter-active-class="transition-all duration-200 overflow-hidden"
              enter-from-class="opacity-0 max-h-0"
              enter-to-class="opacity-100 max-h-96"
              leave-active-class="transition-all duration-200 overflow-hidden"
              leave-from-class="opacity-100 max-h-96"
              leave-to-class="opacity-0 max-h-0"
            >
              <div v-if="cryptoModuleEnabled" class="space-y-3 pt-3 border-t border-surface-border dark:border-surface-dark-border">
                <p class="text-sm font-medium text-text-main dark:text-text-dark-main">Mode de gestion</p>

                <!-- Option SINGLE -->
                <label
                  :class="[
                    'flex items-start gap-3 p-4 rounded-card border-2 cursor-pointer transition-colors',
                    cryptoMode === 'SINGLE'
                      ? 'border-primary bg-primary/5 dark:bg-primary/10'
                      : 'border-surface-border dark:border-surface-dark-border hover:border-primary/40',
                  ]"
                >
                  <input
                    type="radio"
                    name="cryptoMode"
                    value="SINGLE"
                    v-model="cryptoMode"
                    class="mt-0.5 accent-primary shrink-0"
                  />
                  <div>
                    <p class="font-medium text-text-main dark:text-text-dark-main">
                      Patrimoine Global
                      <span class="ml-2 text-xs font-semibold uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded-secondary">
                        Recommandé
                      </span>
                    </p>
                    <p class="text-sm text-text-muted dark:text-text-dark-muted mt-0.5">
                      Vue centralisée de toutes vos crypto-monnaies — adapté à la majorité des investisseurs.
                    </p>
                  </div>
                </label>

                <!-- Option MULTI -->
                <label
                  :class="[
                    'flex items-start gap-3 p-4 rounded-card border-2 cursor-pointer transition-colors',
                    cryptoMode === 'MULTI'
                      ? 'border-primary bg-primary/5 dark:bg-primary/10'
                      : 'border-surface-border dark:border-surface-dark-border hover:border-primary/40',
                  ]"
                >
                  <input
                    type="radio"
                    name="cryptoMode"
                    value="MULTI"
                    v-model="cryptoMode"
                    class="mt-0.5 accent-primary shrink-0"
                  />
                  <div>
                    <p class="font-medium text-text-main dark:text-text-dark-main">
                      Gestion Multi-Comptes
                      <span class="ml-2 text-xs font-medium uppercase tracking-wide bg-surface-border dark:bg-surface-dark-border text-text-muted dark:text-text-dark-muted px-1.5 py-0.5 rounded-secondary">
                        Avancé
                      </span>
                    </p>
                    <p class="text-sm text-text-muted dark:text-text-dark-muted mt-0.5">
                      Séparez vos portefeuilles par exchange ou cold wallet (ex : Binance, Ledger).
                    </p>
                  </div>
                </label>
              </div>
            </Transition>

            <!-- Exchange rate -->            <div class="pt-3 border-t border-surface-border dark:border-surface-dark-border space-y-2">
              <p class="text-sm font-medium text-text-main dark:text-text-dark-main">Taux de change USD → EUR</p>
              <p class="text-xs text-text-muted dark:text-text-dark-muted">
                Les prix des crypto-actifs sont exprimés en USD par les fournisseurs de données.
                Si le champ est vide, le taux est récupéré automatiquement (Yahoo Finance).
              </p>
              <div class="flex items-center gap-3">
                <BaseInput
                  :model-value="usdEurRate !== null ? String(usdEurRate) : ''"
                  @update:model-value="(v: string) => { usdEurRate = v !== '' ? parseFloat(v) : null }"
                  placeholder="ex : 0.92 (auto si vide)"
                  type="number"
                  step="0.0001"
                  min="0.01"
                  max="10"
                  class="flex-1"
                />
                <button
                  v-if="usdEurRate !== null"
                  type="button"
                  @click="usdEurRate = null"
                  class="text-xs text-text-muted dark:text-text-dark-muted hover:text-danger transition-colors whitespace-nowrap"
                  title="Réinitialiser — utiliser le taux automatique"
                >
                  Effacer
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between pt-2">
              <BaseAlert v-if="saveCryptoSuccess" variant="success" class="flex-1 mr-4 py-1.5!">
                Préférences Crypto sauvegardées.
              </BaseAlert>
              <div class="ml-auto">
                <BaseButton @click="saveCryptoSettings" :loading="isSavingCrypto" size="sm">
                  Enregistrer
                </BaseButton>
              </div>
            </div>
          </div>
        </template>
      </BaseCard>

      <!-- Security -->
      <BaseCard title="Sécurité">
        <div class="space-y-4">
          <p class="text-sm text-text-muted dark:text-text-dark-muted">
            Toutes vos données sensibles sont chiffrées pour garantir une confidentialité totale.
          </p>
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-success" />
            <span class="text-sm text-text-body dark:text-text-dark-body">Protection active</span>
          </div>
        </div>
      </BaseCard>

      <!-- Version -->
      <div class="text-center py-4">
        <p class="text-xs text-text-muted dark:text-text-dark-muted">
          CapitalView v0.1.0 — &copy; 2026
        </p>
      </div>
    </div>
  </div>
</template>
