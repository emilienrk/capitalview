<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { BaseCard, BaseButton, BaseInput, BaseAlert, BaseSkeleton, BaseTextarea } from '@/components'

const settingsStore = useSettingsStore()

const flatTaxRate = ref(30)
const taxPeaRate = ref(17.2)
const yieldExpectation = ref(5)
const inflationRate = ref(2)
const objectives = ref('')
const isSaving = ref(false)
const saveSuccess = ref(false)
const isSavingObjectives = ref(false)
const saveObjectivesSuccess = ref(false)

onMounted(() => {
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
</script>

<template>
  <div class="space-y-6">
    <!-- Financial Parameters -->
    <BaseCard>
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
            <BaseInput v-model="flatTaxRate" label="Flat Tax / PFU (%)" type="number" step="0.1" min="0" max="100" placeholder="30" />
            <BaseInput v-model="taxPeaRate" label="Prélèvements sociaux PEA (%)" type="number" step="0.1" min="0" max="100" placeholder="17.2" />
            <BaseInput v-model="yieldExpectation" label="Rendement attendu (%)" type="number" step="0.1" min="0" max="100" placeholder="5" />
            <BaseInput v-model="inflationRate" label="Taux d'inflation (%)" type="number" step="0.1" min="0" max="100" placeholder="2" />
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
    <BaseCard>
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
          <BaseTextarea v-model="objectives" :rows="4" placeholder="Vos objectifs d'épargne et d'investissement..." />
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
  </div>
</template>
