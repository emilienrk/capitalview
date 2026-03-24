<script setup lang="ts">
import { Check, Circle, Download, X } from 'lucide-vue-next'

import { ref, computed } from 'vue'
import BaseModal from '@/components/base/BaseModal.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseSelect from '@/components/base/BaseSelect.vue'
import BaseAlert from '@/components/base/BaseAlert.vue'
import type { BankAccountResponse } from '@/types'

interface BankHistoryEntry {
  snapshot_date: string
  value: number
}

interface Props {
  open: boolean
  accounts: BankAccountResponse[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  imported: [accountId: string]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const fileName = ref<string | null>(null)
const parsedEntries = ref<BankHistoryEntry[]>([])
const error = ref<string | null>(null)
const isLoading = ref(false)
const selectedAccountId = ref<string>(props.accounts[0]?.id ?? '')
const overwrite = ref(false)

const hasFile = computed(() => parsedEntries.value.length > 0)

const accountOptions = computed(() =>
  props.accounts.map(a => ({ label: a.name, value: a.id }))
)

const csvTemplate = 'snapshot_date,value'
const csvExample = '2024-01-31,12500.00\n2024-02-29,13200.50\n2024-03-31,11800.00'

function onFileSelect(event: Event): void {
  error.value = null
  parsedEntries.value = []

  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (!file.name.endsWith('.csv')) {
    error.value = 'Veuillez sélectionner un fichier CSV valide'
    return
  }

  fileName.value = file.name
  const reader = new FileReader()

  reader.onload = (e) => {
    try {
      const text = e.target?.result as string
      parseCSV(text)
    } catch (err) {
      error.value = 'Erreur lors de la lecture du fichier'
      console.error(err)
    }
  }

  reader.onerror = () => {
    error.value = 'Erreur lors de la lecture du fichier'
  }

  reader.readAsText(file)
}

function parseCSV(text: string): void {
  const firstLine = text.split('\n')[0]
  let delimiter = ','
  if (firstLine?.includes(';')) {
    delimiter = ';'
  } else if (firstLine?.includes('\t')) {
    delimiter = '\t'
  }

  // Normalize French decimal commas to dots
  const normalizedText = text.replace(/(\d),(\d)/g, '$1.$2')

  // Normalize DD/MM/YYYY dates to ISO
  const lines = normalizedText.trim().split('\n').map((line, index) => {
    if (index === 0) return line
    return line.replace(/(\d{2})\/(\d{2})\/(\d{4})/g, '$3-$2-$1')
  })

  if (lines.length < 2) {
    error.value = 'Le fichier CSV est vide ou invalide'
    return
  }

  const headers = lines[0]?.split(delimiter).map((h) => h.trim()) || []

  if (!headers.includes('snapshot_date') || !headers.includes('value')) {
    error.value = 'Colonnes requises manquantes : "snapshot_date" et "value"'
    return
  }

  const entries: BankHistoryEntry[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line || !line.trim()) continue

    const values = line.split(delimiter).map((v) => v.trim())

    if (values.length < headers.length) {
      while (values.length < headers.length) values.push('')
    }

    if (values.length > headers.length) {
      error.value = `Ligne ${i + 1} : trop de colonnes`
      return
    }

    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = values[idx] ?? '' })

    const dateStr = row['snapshot_date'] ?? ''
    const valueStr = row['value'] ?? ''

    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      error.value = `Ligne ${i + 1} : date invalide "${dateStr}" (format attendu: YYYY-MM-DD)`
      return
    }

    const value = parseFloat(valueStr)
    if (isNaN(value)) {
      error.value = `Ligne ${i + 1} : valeur numérique invalide "${valueStr}"`
      return
    }

    entries.push({ snapshot_date: dateStr, value })
  }

  if (entries.length === 0) {
    error.value = 'Aucune ligne valide trouvée'
    return
  }

  parsedEntries.value = entries
}

function triggerFileInput(): void {
  fileInput.value?.click()
}

function resetFile(): void {
  fileName.value = null
  parsedEntries.value = []
  error.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

async function handleImport(): Promise<void> {
  if (!selectedAccountId.value || parsedEntries.value.length === 0) return
  isLoading.value = true
  error.value = null
  try {
    const { useBankStore } = await import('@/stores/bank')
    const bank = useBankStore()
    const success = await bank.importHistory(selectedAccountId.value, parsedEntries.value, overwrite.value)
    if (success) {
      emit('imported', selectedAccountId.value)
      handleClose()
    } else {
      error.value = "L'import a échoué. Vérifiez vos données et réessayez."
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Erreur inattendue lors de l'import"
  } finally {
    isLoading.value = false
  }
}

function handleClose(): void {
  resetFile()
  overwrite.value = false
  emit('close')
}

function downloadTemplate(): void {
  const content = csvTemplate + '\n' + csvExample
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'template_historique_bancaire.csv'
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <BaseModal :open="props.open" title="Importer l'historique (CSV)" size="lg" @close="handleClose">
    <div class="space-y-6">
      <!-- Account selector -->
      <BaseSelect
        v-model="selectedAccountId"
        label="Compte bancaire"
        :options="accountOptions"
        required
      />

      <!-- Format instructions -->
      <div class="bg-background-subtle dark:bg-background-dark-subtle p-4 rounded-secondary">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-semibold text-text-main dark:text-text-dark-main">
            Format CSV
          </h3>
          <button
            @click="downloadTemplate"
            class="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-hover transition-colors"
          >
            <Download class="w-3.5 h-3.5" />
            Modèle
          </button>
        </div>
        <code class="block text-xs bg-background dark:bg-surface-dark p-2 rounded border border-surface-border dark:border-surface-dark-border overflow-x-auto">
          {{ csvTemplate }}
        </code>
        <p class="mt-2 text-xs text-text-muted dark:text-text-dark-muted">
          Séparateurs (virgule, point-virgule, tabulation) et décimales détectés automatiquement.
          Dates acceptées : YYYY-MM-DD ou DD/MM/YYYY.
        </p>
      </div>

      <!-- Error -->
      <BaseAlert v-if="error" variant="danger" dismissible @dismiss="error = null">
        {{ error }}
      </BaseAlert>

      <!-- File upload -->
      <div>
        <input
          ref="fileInput"
          type="file"
          accept=".csv"
          class="hidden"
          @change="onFileSelect"
        />

        <div
          v-if="!fileName"
          class="border-2 border-dashed border-surface-border dark:border-surface-dark-border rounded-card p-8 text-center"
        >
          <Circle class="w-12 h-12 mx-auto mb-4 text-text-muted dark:text-text-dark-muted" />
          <p class="text-sm text-text-body dark:text-text-dark-body mb-3">
            Glissez un fichier CSV ici ou
          </p>
          <BaseButton variant="outline" @click="triggerFileInput">Parcourir</BaseButton>
        </div>

        <div v-else class="space-y-3">
          <div class="flex items-center justify-between p-4 bg-background-subtle dark:bg-surface-dark-hover rounded-secondary">
            <div class="flex items-center gap-3">
              <Circle class="w-8 h-8 text-success" />
              <div>
                <p class="font-medium text-text-main dark:text-text-dark-main">{{ fileName }}</p>
                <p v-if="parsedEntries.length > 0" class="text-sm text-success flex items-center gap-1">
                  <Check class="w-4 h-4" />
                  {{ parsedEntries.length }} entrée(s) détectée(s)
                </p>
              </div>
            </div>
            <button
              @click="resetFile"
              class="p-2 rounded-secondary text-text-muted dark:text-text-dark-muted hover:bg-surface-active dark:hover:bg-surface-dark-hover transition-colors"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <!-- Overwrite option -->
      <label class="flex items-center gap-3 cursor-pointer">
        <input
          v-model="overwrite"
          type="checkbox"
          class="w-4 h-4 rounded accent-primary"
        />
        <div>
          <span class="text-sm font-medium text-text-main dark:text-text-dark-main">Écraser l'historique existant</span>
          <p class="text-xs text-text-muted dark:text-text-dark-muted">Supprime toutes les entrées existantes avant l'import</p>
        </div>
      </label>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <BaseButton variant="ghost" @click="handleClose">Annuler</BaseButton>
        <BaseButton
          :disabled="!hasFile || !selectedAccountId || isLoading"
          :loading="isLoading"
          @click="handleImport"
        >
          Importer {{ parsedEntries.length > 0 ? parsedEntries.length + ' entrée(s)' : '' }}
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>
