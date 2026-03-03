<script setup lang="ts">
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
const usdEurRate = ref<number | null>(null)
const isSavingCrypto = ref(false)
const saveCryptoSuccess = ref(false)

onMounted(() => {
  if (settingsStore.settings) {
    bankModuleEnabled.value = settingsStore.settings.bank_module_enabled ?? true
    cashflowModuleEnabled.value = settingsStore.settings.cashflow_module_enabled ?? true
    wealthModuleEnabled.value = settingsStore.settings.wealth_module_enabled ?? true
    cryptoModuleEnabled.value = settingsStore.settings.crypto_module_enabled
    cryptoShowNegativePositions.value = settingsStore.settings.crypto_show_negative_positions ?? false
    cryptoMode.value = settingsStore.settings.crypto_mode
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
  <div class="space-y-6">
    <!-- Modules -->
    <BaseCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-secondary bg-primary/10 flex items-center justify-center shrink-0">
            <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" /></svg>
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
            <BaseAlert v-if="saveCryptoSuccess" variant="success" class="flex-1 mr-4 py-1.5!">Préférences Crypto sauvegardées.</BaseAlert>
            <div class="ml-auto">
              <BaseButton @click="saveCryptoSettings" :loading="isSavingCrypto" size="sm">Enregistrer</BaseButton>
            </div>
          </div>
        </div>
      </template>
    </BaseCard>
  </div>
</template>
