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

onMounted(async () => {
  await settingsStore.fetchSettings()
  if (settingsStore.settings) {
    flatTaxRate.value = +(settingsStore.settings.flat_tax_rate * 100).toFixed(2)
    taxPeaRate.value = +(settingsStore.settings.tax_pea_rate * 100).toFixed(2)
    yieldExpectation.value = +(settingsStore.settings.yield_expectation * 100).toFixed(2)
    inflationRate.value = +(settingsStore.settings.inflation_rate * 100).toFixed(2)
    objectives.value = settingsStore.settings.objectives ?? ''
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
              placeholder="Ex: Atteindre 100 000 € d'investissements d'ici 2030..."
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
