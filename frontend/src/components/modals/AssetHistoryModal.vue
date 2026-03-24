<script setup lang="ts">
import { Check, Pencil, Trash2, X } from 'lucide-vue-next'

import { computed, ref, watch } from 'vue'

import type {
  AssetResponse,
  AssetValuationCreate,
  AssetValuationResponse,
  AssetValuationUpdate,
} from '@/types'
import { useAssetStore } from '@/stores/asset'
import { useFormatters } from '@/composables/useFormatters'
import BaseModal from '@/components/base/BaseModal.vue'
import AssetValuationChart from '@/components/charts/AssetValuationChart.vue'
import { BaseButton, BaseInput, BaseSpinner } from '@/components'

interface Props {
  open: boolean
  asset: AssetResponse | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

const store = useAssetStore()
const { formatCurrency, formatDate } = useFormatters()

const isLoadingHistory = ref(false)
const newValue = ref<number | string>('')
const newNote = ref('')
const newDate = ref(new Date().toISOString().slice(0, 10))
const formError = ref<string | null>(null)

const editingValuationId = ref<string | null>(null)
const editValue = ref<number | string>('')
const editNote = ref('')
const editDate = ref(new Date().toISOString().slice(0, 10))

const acquisitionDate = computed<Date | null>(() => {
  if (!props.asset?.acquisition_date) return null
  return parseDateOnly(props.asset.acquisition_date)
})

const addDateError = computed<string | null>(() => getDateBeforeAcquisitionMessage(newDate.value))

const chartPoints = computed<Array<{ date: string; value: number; source: 'purchase' | 'valuation' }>>(() => {
  if (!props.asset) return []

  const points: Array<{ date: string; value: number; source: 'purchase' | 'valuation' }> = []

  const purchasePrice = props.asset.purchase_price !== null
    ? Number(props.asset.purchase_price)
    : null

  const hasPurchaseAnchorInValuations = props.asset.acquisition_date !== null && purchasePrice !== null
    ? store.valuations.some((valuation) => {
        const sameDate = valuation.valued_at === props.asset!.acquisition_date
        const sameValue = Number(valuation.estimated_value) === purchasePrice
        return sameDate && sameValue
      })
    : false

  if (props.asset.acquisition_date && purchasePrice !== null && !hasPurchaseAnchorInValuations) {
    points.push({
      date: props.asset.acquisition_date,
      value: purchasePrice,
      source: 'purchase',
    })
  }

  for (const valuation of store.valuations) {
    points.push({
      date: valuation.valued_at,
      value: Number(valuation.estimated_value),
      source: 'valuation',
    })
  }

  points.sort((a, b) => {
    const ta = parseDateOnly(a.date)?.getTime() ?? 0
    const tb = parseDateOnly(b.date)?.getTime() ?? 0
    return ta - tb
  })

  return points
})

watch(() => props.open, async (isOpen) => {
  if (isOpen && props.asset) {
    isLoadingHistory.value = true
    await store.fetchValuations(props.asset.id)
    isLoadingHistory.value = false
    formError.value = null
    editingValuationId.value = null
    newDate.value = new Date().toISOString().slice(0, 10)
  } else if (!isOpen) {
    formError.value = null
    editingValuationId.value = null
  }
})

function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function getDateBeforeAcquisitionMessage(dateValue: string): string | null {
  const selected = parseDateOnly(dateValue)
  const acquired = acquisitionDate.value
  if (!selected || !acquired) return null
  if (selected < acquired) {
    return `La date de valorisation ne peut pas etre avant la date d'acquisition (${formatDate(props.asset?.acquisition_date)}).`
  }
  return null
}

async function addEntry(): Promise<void> {
  if (!props.asset || !newValue.value) return
  formError.value = null

  if (addDateError.value) {
    formError.value = addDateError.value
    return
  }

  const data: AssetValuationCreate = {
    estimated_value: Number(newValue.value),
    note: newNote.value.trim() || null,
    valued_at: newDate.value,
  }

  const created = await store.addValuation(props.asset.id, data)
  if (!created) {
    formError.value = store.error ?? 'Erreur lors de l\'ajout de la valorisation'
    return
  }

  newValue.value = ''
  newNote.value = ''
  newDate.value = new Date().toISOString().slice(0, 10)
}

function startEdit(v: AssetValuationResponse): void {
  editingValuationId.value = v.id
  editValue.value = Number(v.estimated_value)
  editNote.value = v.note ?? ''
  editDate.value = v.valued_at
  formError.value = null
}

function cancelEdit(): void {
  editingValuationId.value = null
  editValue.value = ''
  editNote.value = ''
  editDate.value = new Date().toISOString().slice(0, 10)
}

async function saveEdit(v: AssetValuationResponse): Promise<void> {
  if (!props.asset || !editingValuationId.value || !editValue.value) return
  formError.value = null

  const editDateError = getDateBeforeAcquisitionMessage(editDate.value)
  if (editDateError) {
    formError.value = editDateError
    return
  }

  const payload: AssetValuationUpdate = {
    estimated_value: Number(editValue.value),
    note: editNote.value.trim() || null,
    valued_at: editDate.value,
  }

  const updated = await store.updateValuation(props.asset.id, v.id, payload)
  if (!updated) {
    formError.value = store.error ?? 'Erreur lors de la modification de la valorisation'
    return
  }

  cancelEdit()
}

async function removeEntry(v: AssetValuationResponse): Promise<void> {
  if (!props.asset) return
  await store.deleteValuation(props.asset.id, v.id)
}
</script>

<template>
  <BaseModal
    :open="props.open"
    :title="`Historique — ${props.asset?.name ?? ''}`"
    size="lg"
    @close="emit('close')"
  >
    <div
      v-if="chartPoints.length > 1"
      class="mb-6 p-3 rounded-card bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border"
    >
      <p class="text-sm font-medium text-text-main dark:text-text-dark-main mb-2">Evolution depuis l'achat</p>
      <AssetValuationChart :points="chartPoints" :height="228" :show-point-date-labels="true" />
    </div>

    <!-- Add new entry form -->
    <div class="mb-6 p-4 rounded-card bg-background-subtle dark:bg-background-dark-subtle border border-surface-border dark:border-surface-dark-border">
      <p class="text-sm font-medium text-text-main dark:text-text-dark-main mb-3">Nouvelle estimation</p>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <BaseInput
          v-model="newValue"
          label="Valeur"
          type="number"
          placeholder="0"
          required
        />
        <BaseInput
          v-model="newDate"
          label="Date"
          type="date"
          :error="addDateError ?? undefined"
          required
        />
        <BaseInput
          v-model="newNote"
          label="Note"
          placeholder="Optionnel"
        />
      </div>
      <div class="mt-3 flex justify-end">
        <BaseButton size="sm" :disabled="!newValue" @click="addEntry">Ajouter</BaseButton>
      </div>
      <p v-if="formError" class="mt-2 text-xs text-danger">{{ formError }}</p>
    </div>

    <!-- History list -->
    <div v-if="isLoadingHistory" class="flex justify-center py-8">
      <BaseSpinner size="md" />
    </div>

    <div v-else-if="store.valuations.length === 0" class="text-center py-8 text-text-muted dark:text-text-dark-muted text-sm">
      Aucun historique de valorisation.
    </div>

    <div v-else class="space-y-2 max-h-80 overflow-y-auto">
      <div
        v-for="v in store.valuations"
        :key="v.id"
        class="py-3 px-4 rounded-secondary border border-surface-border dark:border-surface-dark-border bg-surface dark:bg-surface-dark"
      >
        <div v-if="editingValuationId === v.id" class="space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <BaseInput
              v-model="editValue"
              label="Valeur"
              type="number"
              required
            />
            <BaseInput
              v-model="editDate"
              label="Date"
              type="date"
              :error="getDateBeforeAcquisitionMessage(editDate) ?? undefined"
              required
            />
            <BaseInput
              v-model="editNote"
              label="Note"
              placeholder="Optionnel"
            />
          </div>
          <div class="flex justify-end gap-2">
            <BaseButton variant="ghost" size="sm" @click="cancelEdit">
              <X class="w-4 h-4 mr-1" />
              Annuler
            </BaseButton>
            <BaseButton size="sm" :disabled="!editValue" @click="saveEdit(v)">
              <Check class="w-4 h-4 mr-1" />
              Enregistrer
            </BaseButton>
          </div>
        </div>

        <div v-else class="flex items-center justify-between">
          <div>
            <p class="font-medium text-text-main dark:text-text-dark-main">
              {{ formatCurrency(v.estimated_value) }}
            </p>
            <p class="text-xs text-text-muted dark:text-text-dark-muted">
              {{ formatDate(v.valued_at) }}
              <span v-if="v.note"> — {{ v.note }}</span>
            </p>
          </div>
          <div class="flex items-center gap-1">
            <button
              @click="startEdit(v)"
              class="p-1.5 rounded-secondary text-text-muted dark:text-text-dark-muted hover:text-primary hover:bg-primary/10 transition-colors"
              title="Modifier"
            >
              <Pencil class="w-4 h-4" />
            </button>
            <button
              @click="removeEntry(v)"
              class="p-1.5 rounded-secondary text-text-muted dark:text-text-dark-muted hover:text-danger hover:bg-danger/10 transition-colors"
              title="Supprimer"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <BaseButton variant="ghost" @click="emit('close')">Fermer</BaseButton>
    </template>
  </BaseModal>
</template>
