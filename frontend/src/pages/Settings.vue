<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useDarkMode } from '@/composables/useDarkMode'
import { useFormatters } from '@/composables/useFormatters'
import PageHeader from '@/components/PageHeader.vue'
import { BaseCard, BaseButton, BaseInput, BaseAlert, BaseSkeleton, BaseTextarea } from '@/components'

const auth = useAuthStore()
const settingsStore = useSettingsStore()
const appVersion = __APP_VERSION__
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

// Objectives save state (independent from financial settings)
const isSavingObjectives = ref(false)
const saveObjectivesSuccess = ref(false)

// Password change form
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const isSavingPassword = ref(false)
const passwordError = ref('')
const passwordSuccess = ref(false)

// Crypto module settings
const cryptoModuleEnabled = ref(false)
const cryptoShowNegativePositions = ref(false)
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
    cryptoShowNegativePositions.value = settingsStore.settings.crypto_show_negative_positions ?? false
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
  isSavingObjectives.value = true
  saveObjectivesSuccess.value = false
  const success = await settingsStore.updateSettings({
    objectives: objectives.value || null,
  })
  isSavingObjectives.value = false
  if (success) {
    saveObjectivesSuccess.value = true
    setTimeout(() => { saveObjectivesSuccess.value = false }, 2000)
  }
}

function handlePasswordChange(): void {
  passwordError.value = ''
  passwordSuccess.value = false
  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    passwordError.value = 'Veuillez remplir tous les champs.'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'Les nouveaux mots de passe ne correspondent pas.'
    return
  }
  if (newPassword.value.length < 8) {
    passwordError.value = 'Le mot de passe doit contenir au moins 8 caractères.'
    return
  }
  // TODO: appel API backend à implémenter
  isSavingPassword.value = true
  setTimeout(() => {
    isSavingPassword.value = false
    passwordSuccess.value = true
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    setTimeout(() => { passwordSuccess.value = false }, 3000)
  }, 500)
}

async function saveCryptoSettings(): Promise<void> {
  isSavingCrypto.value = true
  saveCryptoSuccess.value = false
  const success = await settingsStore.updateSettings({
    crypto_module_enabled: cryptoModuleEnabled.value,
    crypto_show_negative_positions: cryptoShowNegativePositions.value,
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

    <!-- Sticky anchor navigation -->
    <nav class="sticky top-0 z-10 -mx-1 mb-6 bg-background dark:bg-background-dark py-2">
      <div class="flex gap-2 overflow-x-auto scrollbar-hide">
        <a v-for="section in [
          { id: 'profil', label: 'Profil' },
          { id: 'apparence', label: 'Apparence' },
          { id: 'finances', label: 'Finances' },
          { id: 'objectifs', label: 'Objectifs' },
          { id: 'crypto', label: 'Crypto' },
          { id: 'securite', label: 'Sécurité' },
        ]" :key="section.id"
          :href="'#' + section.id"
          class="shrink-0 px-4 py-1.5 rounded-button text-sm font-medium border border-surface-border dark:border-surface-dark-border text-text-muted dark:text-text-dark-muted bg-surface dark:bg-surface-dark hover:border-primary hover:text-primary transition-colors"
        >
          {{ section.label }}
        </a>
      </div>
    </nav>

    <div class="space-y-6 max-w-3xl">
      <!-- Profile -->
      <BaseCard id="profil">
        <template #header>
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-secondary bg-primary/10 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
            </div>
            <h3 class="text-lg font-semibold text-text-main dark:text-text-dark-main">Profil</h3>
          </div>
        </template>
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
      <BaseCard id="apparence">
        <template #header>
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-secondary bg-primary/10 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z" /></svg>
            </div>
            <h3 class="text-lg font-semibold text-text-main dark:text-text-dark-main">Apparence</h3>
          </div>
        </template>
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
      <BaseCard id="finances">
        <template #header>
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-secondary bg-primary/10 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>
            </div>
            <h3 class="text-lg font-semibold text-text-main dark:text-text-dark-main">Paramètres financiers</h3>
          </div>
        </template>
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
            <div class="flex items-center justify-end gap-4">
              <BaseAlert v-if="saveSuccess" variant="success" class="flex-1 py-1.5!">
                Paramètres financiers sauvegardés.
              </BaseAlert>
              <BaseButton type="submit" :loading="isSaving" size="sm">
                Enregistrer
              </BaseButton>
            </div>
          </form>
        </template>
      </BaseCard>

      <!-- Objectives -->
      <BaseCard id="objectifs">
        <template #header>
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-secondary bg-primary/10 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>
            </div>
            <h3 class="text-lg font-semibold text-text-main dark:text-text-dark-main">Objectifs patrimoniaux</h3>
          </div>
        </template>
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
            <BaseTextarea
              v-model="objectives"
              :rows="4"
              placeholder="Vos objectifs d'épargne et d'investissement..."
            />
            <div class="flex items-center justify-end gap-4">
              <BaseAlert v-if="saveObjectivesSuccess" variant="success" class="flex-1 py-1.5!">
                Objectifs sauvegardés.
              </BaseAlert>
              <BaseButton type="submit" :loading="isSavingObjectives" size="sm">
                Enregistrer
              </BaseButton>
            </div>
          </form>
        </template>
      </BaseCard>

      <!-- Crypto Module -->
      <BaseCard id="crypto">
        <template #header>
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-secondary bg-primary/10 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" /></svg>
            </div>
            <h3 class="text-lg font-semibold text-text-main dark:text-text-dark-main">Module Crypto</h3>
          </div>
        </template>
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
              <div v-if="cryptoModuleEnabled" class="space-y-6 pt-3 border-t border-surface-border dark:border-surface-dark-border">
                <div class="space-y-3">
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

                <div class="pt-4 border-t border-surface-border dark:border-surface-dark-border">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="font-medium text-text-main dark:text-text-dark-main">Afficher les positions négatives</p>
                      <p class="text-sm text-text-muted dark:text-text-dark-muted">
                        Affiche les cryptos dont le solde est négatif (ex: short selling)
                      </p>
                    </div>
                    <button
                      type="button"
                      @click="cryptoShowNegativePositions = !cryptoShowNegativePositions"
                      :class="[
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                        cryptoShowNegativePositions ? 'bg-primary' : 'bg-surface-border dark:bg-surface-dark-border',
                      ]"
                      :aria-pressed="cryptoShowNegativePositions"
                    >
                      <span
                        :class="[
                          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm',
                          cryptoShowNegativePositions ? 'translate-x-6' : 'translate-x-1',
                        ]"
                      />
                    </button>
                  </div>
                </div>
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
                  @update:model-value="(v: string | number) => { usdEurRate = v !== '' ? parseFloat(String(v)) : null }"
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
      <BaseCard id="securite">
        <template #header>
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-secondary bg-primary/10 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
            </div>
            <h3 class="text-lg font-semibold text-text-main dark:text-text-dark-main">Sécurité</h3>
          </div>
        </template>
        <div class="space-y-6">
          <!-- Encryption status -->
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-success shrink-0" />
            <span class="text-sm text-text-body dark:text-text-dark-body">Chiffrement des données actif — vos informations sensibles sont protégées</span>
          </div>

          <!-- Password change form -->
          <div class="pt-4 border-t border-surface-border dark:border-surface-dark-border space-y-4">
            <div>
              <p class="font-medium text-text-main dark:text-text-dark-main">Changer le mot de passe</p>
              <p class="text-sm text-text-muted dark:text-text-dark-muted mt-0.5">Choisissez un mot de passe d'au moins 8 caractères.</p>
            </div>

            <BaseAlert v-if="passwordError" variant="danger">
              {{ passwordError }}
            </BaseAlert>
            <BaseAlert v-if="passwordSuccess" variant="success">
              Fonctionnalité à venir — le mot de passe n'a pas été modifié.
            </BaseAlert>

            <form @submit.prevent="handlePasswordChange" class="space-y-4">
              <BaseInput
                v-model="currentPassword"
                label="Mot de passe actuel"
                type="password"
                placeholder="••••••••"
                autocomplete="current-password"
              />
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <BaseInput
                  v-model="newPassword"
                  label="Nouveau mot de passe"
                  type="password"
                  placeholder="••••••••"
                  autocomplete="new-password"
                />
                <BaseInput
                  v-model="confirmPassword"
                  label="Confirmer le mot de passe"
                  type="password"
                  placeholder="••••••••"
                  autocomplete="new-password"
                />
              </div>
              <div class="flex justify-end">
                <BaseButton type="submit" :loading="isSavingPassword" size="sm">
                  Changer le mot de passe
                </BaseButton>
              </div>
            </form>
          </div>
        </div>
      </BaseCard>

      <!-- Version -->
      <div class="text-center py-4">
        <p class="text-xs text-text-muted dark:text-text-dark-muted">
          CapitalView v{{ appVersion }} — &copy; 2026
        </p>
      </div>
    </div>
  </div>
</template>
