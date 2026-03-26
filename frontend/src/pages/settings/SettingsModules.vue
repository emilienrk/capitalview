<script setup lang="ts">
import { Database, LayoutGrid } from 'lucide-vue-next'

import { onMounted, ref } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { BaseCard, BaseButton, BaseInput, BaseAlert, BaseSkeleton } from '@/components'

const settingsStore = useSettingsStore()

// Module toggles
const bankModuleEnabled = ref(true)
const cashflowModuleEnabled = ref(true)
const wealthModuleEnabled = ref(true)
const isSavingModules = ref(false)
const saveModulesSuccess = ref(false)

// Crypto settings
const cryptoModuleEnabled = ref(false)
const cryptoShowNegativePositions = ref(false)
const cryptoMode = ref<'SINGLE' | 'MULTI'>('SINGLE')
const cryptoPreviousMode = ref<'SINGLE' | 'MULTI'>('SINGLE')
const usdEurRate = ref<number | null>(null)
const isSavingCrypto = ref(false)
const saveCryptoSuccess = ref(false)
const cryptoErrorMessage = ref<string | null>(null)

onMounted(() => {
  if (settingsStore.settings) {
    bankModuleEnabled.value = settingsStore.settings.bank_module_enabled ?? true
    cashflowModuleEnabled.value = settingsStore.settings.cashflow_module_enabled ?? true
    wealthModuleEnabled.value = settingsStore.settings.wealth_module_enabled ?? true
    cryptoModuleEnabled.value = settingsStore.settings.crypto_module_enabled
    cryptoShowNegativePositions.value = settingsStore.settings.crypto_show_negative_positions ?? false
    cryptoMode.value = settingsStore.settings.crypto_mode
    cryptoPreviousMode.value = settingsStore.settings.crypto_mode
    usdEurRate.value = settingsStore.settings.usd_eur_rate ?? null
  }
})

async function saveModulesSettings(): Promise<void> {
  isSavingModules.value = true
  saveModulesSuccess.value = false
  const success = await settingsStore.updateSettings({
    bank_module_enabled: bankModuleEnabled.value,
    cashflow_module_enabled: cashflowModuleEnabled.value,
    wealth_module_enabled: wealthModuleEnabled.value,
  })
  isSavingModules.value = false
  if (success) {
    saveModulesSuccess.value = true
    setTimeout(() => { saveModulesSuccess.value = false }, 2000)
  }
}

async function saveCryptoSettings(): Promise<void> {
  isSavingCrypto.value = true
  saveCryptoSuccess.value = false
  cryptoErrorMessage.value = null
  
  const success = await settingsStore.updateSettings({
    crypto_module_enabled: cryptoModuleEnabled.value,
    crypto_show_negative_positions: cryptoShowNegativePositions.value,
    crypto_mode: cryptoModuleEnabled.value ? cryptoMode.value : undefined,
    usd_eur_rate: usdEurRate.value,
  })
  
  isSavingCrypto.value = false
  
  if (success) {
    saveCryptoSuccess.value = true
    cryptoPreviousMode.value = cryptoMode.value
    setTimeout(() => { saveCryptoSuccess.value = false }, 2000)
  } else {
    cryptoErrorMessage.value = settingsStore.error ?? 'Une erreur est survenue lors de l\'enregistrement.'
    // Reset mode to previous value on error
    cryptoMode.value = cryptoPreviousMode.value
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Modules -->
    <BaseCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-secondary bg-primary/10 flex items-center justify-center shrink-0">
            <LayoutGrid class="w-4 h-4 text-primary" stroke-width="2" />
          </div>
          <h3 class="text-lg font-semibold text-text-main dark:text-text-dark-main">Modules d'affichage</h3>
        </div>
      </template>
      <template v-if="settingsStore.isLoading && !settingsStore.settings">
        <div class="space-y-4">
          <BaseSkeleton v-for="i in 3" :key="i" variant="rect" height="2.5rem" />
        </div>
      </template>
      <template v-else>
        <p class="text-sm text-text-muted dark:text-text-dark-muted mb-4">
          Choisissez les modules à afficher dans la navigation.
        </p>
        <div class="space-y-5">
          <!-- Compte Bancaire -->
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-text-main dark:text-text-dark-main">Compte Bancaire</p>
              <p class="text-sm text-text-muted dark:text-text-dark-muted">Affiche la gestion des comptes bancaires</p>
            </div>
            <button type="button" @click="bankModuleEnabled = !bankModuleEnabled" :class="['relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0', bankModuleEnabled ? 'bg-primary' : 'bg-surface-border dark:bg-surface-dark-border']" :aria-pressed="bankModuleEnabled">
              <span :class="['inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm', bankModuleEnabled ? 'translate-x-6' : 'translate-x-1']" />
            </button>
          </div>

          <!-- Cashflow -->
          <div class="flex items-center justify-between pt-4 border-t border-surface-border dark:border-surface-dark-border">
            <div>
              <p class="font-medium text-text-main dark:text-text-dark-main">Cashflow</p>
              <p class="text-sm text-text-muted dark:text-text-dark-muted">Affiche le suivi des flux de trésorerie</p>
            </div>
            <button type="button" @click="cashflowModuleEnabled = !cashflowModuleEnabled" :class="['relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0', cashflowModuleEnabled ? 'bg-primary' : 'bg-surface-border dark:bg-surface-dark-border']" :aria-pressed="cashflowModuleEnabled">
              <span :class="['inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm', cashflowModuleEnabled ? 'translate-x-6' : 'translate-x-1']" />
            </button>
          </div>

          <!-- Patrimoine -->
          <div class="flex items-center justify-between pt-4 border-t border-surface-border dark:border-surface-dark-border">
            <div>
              <p class="font-medium text-text-main dark:text-text-dark-main">Patrimoine</p>
              <p class="text-sm text-text-muted dark:text-text-dark-muted">Affiche la gestion du patrimoine</p>
            </div>
            <button type="button" @click="wealthModuleEnabled = !wealthModuleEnabled" :class="['relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0', wealthModuleEnabled ? 'bg-primary' : 'bg-surface-border dark:bg-surface-dark-border']" :aria-pressed="wealthModuleEnabled">
              <span :class="['inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm', wealthModuleEnabled ? 'translate-x-6' : 'translate-x-1']" />
            </button>
          </div>

          <div class="flex items-center justify-between pt-2">
            <BaseAlert v-if="saveModulesSuccess" variant="success" class="flex-1 mr-4 py-1.5!">Modules sauvegardés.</BaseAlert>
            <div class="ml-auto">
              <BaseButton @click="saveModulesSettings" :loading="isSavingModules" size="sm">Enregistrer</BaseButton>
            </div>
          </div>
        </div>
      </template>
    </BaseCard>

    <!-- Crypto Module -->
    <BaseCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-secondary bg-primary/10 flex items-center justify-center shrink-0">
            <Database class="w-4 h-4 text-primary" stroke-width="2" />
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
              <p class="text-sm text-text-muted dark:text-text-dark-muted">Affiche l'entrée Crypto dans la navigation</p>
            </div>
            <button type="button" @click="cryptoModuleEnabled = !cryptoModuleEnabled" :class="['relative inline-flex h-6 w-11 items-center rounded-full transition-colors', cryptoModuleEnabled ? 'bg-primary' : 'bg-surface-border dark:bg-surface-dark-border']" :aria-pressed="cryptoModuleEnabled">
              <span :class="['inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm', cryptoModuleEnabled ? 'translate-x-6' : 'translate-x-1']" />
            </button>
          </div>

          <!-- Crypto sub-settings (only when enabled) -->
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

                <label :class="['flex items-start gap-3 p-4 rounded-card border-2 cursor-pointer transition-colors', cryptoMode === 'SINGLE' ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-surface-border dark:border-surface-dark-border hover:border-primary/40']">
                  <input type="radio" name="cryptoMode" value="SINGLE" v-model="cryptoMode" class="mt-0.5 accent-primary shrink-0" />
                  <div>
                    <p class="font-medium text-text-main dark:text-text-dark-main">
                      Patrimoine Global
                      <span class="ml-2 text-xs font-semibold uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded-secondary">Recommandé</span>
                    </p>
                    <p class="text-sm text-text-muted dark:text-text-dark-muted mt-0.5">Vue centralisée de toutes vos crypto-monnaies.</p>
                  </div>
                </label>

                <label :class="['flex items-start gap-3 p-4 rounded-card border-2 cursor-pointer transition-colors', cryptoMode === 'MULTI' ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-surface-border dark:border-surface-dark-border hover:border-primary/40']">
                  <input type="radio" name="cryptoMode" value="MULTI" v-model="cryptoMode" class="mt-0.5 accent-primary shrink-0" />
                  <div>
                    <p class="font-medium text-text-main dark:text-text-dark-main">
                      Gestion Multi-Comptes
                      <span class="ml-2 text-xs font-medium uppercase tracking-wide bg-surface-border dark:bg-surface-dark-border text-text-muted dark:text-text-dark-muted px-1.5 py-0.5 rounded-secondary">Avancé</span>
                    </p>
                    <p class="text-sm text-text-muted dark:text-text-dark-muted mt-0.5">Séparez vos portefeuilles par exchange ou cold wallet.</p>
                  </div>
                </label>
              </div>

              <div class="pt-4 border-t border-surface-border dark:border-surface-dark-border">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-medium text-text-main dark:text-text-dark-main">Afficher les positions négatives</p>
                    <p class="text-sm text-text-muted dark:text-text-dark-muted">Affiche les cryptos dont le solde est négatif</p>
                  </div>
                  <button type="button" @click="cryptoShowNegativePositions = !cryptoShowNegativePositions" :class="['relative inline-flex h-6 w-11 items-center rounded-full transition-colors', cryptoShowNegativePositions ? 'bg-primary' : 'bg-surface-border dark:bg-surface-dark-border']" :aria-pressed="cryptoShowNegativePositions">
                    <span :class="['inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm', cryptoShowNegativePositions ? 'translate-x-6' : 'translate-x-1']" />
                  </button>
                </div>
              </div>
            </div>
          </Transition>

          <!-- Exchange rate -->
          <div class="pt-3 border-t border-surface-border dark:border-surface-dark-border space-y-2">
            <p class="text-sm font-medium text-text-main dark:text-text-dark-main">Taux de change USD → EUR</p>
            <p class="text-xs text-text-muted dark:text-text-dark-muted">
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
                title="Réinitialiser"
              >
                Effacer
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between pt-2">
            <div class="flex-1 mr-4">
              <BaseAlert v-if="saveCryptoSuccess" variant="success" class="py-1.5!">Préférences Crypto sauvegardées.</BaseAlert>
              <BaseAlert v-else-if="cryptoErrorMessage" variant="danger" class="py-1.5!">{{ cryptoErrorMessage }}</BaseAlert>
            </div>
            <div class="ml-auto">
              <BaseButton @click="saveCryptoSettings" :loading="isSavingCrypto" size="sm">Enregistrer</BaseButton>
            </div>
          </div>
        </div>
      </template>
    </BaseCard>
  </div>
</template>
