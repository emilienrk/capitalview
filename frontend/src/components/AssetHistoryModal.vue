<script setup lang="ts">
import { ref, watch } from 'vue'
import type { AssetResponse, AssetValuationCreate, AssetValuationResponse } from '@/types'
import { useAssetStore } from '@/stores/asset'
import { useFormatters } from '@/composables/useFormatters'
import BaseModal from '@/components/BaseModal.vue'
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

watch(() => props.open, async (isOpen) => {
  if (isOpen && props.asset) {
    isLoadingHistory.value = true
    await store.fetchValuations(props.asset.id)
    isLoadingHistory.value = false
  }
})

async function addEntry(): Promise<void> {
  if (!props.asset || !newValue.value) return

  const data: AssetValuationCreate = {
    estimated_value: Number(newValue.value),
    note: newNote.value.trim() || null,
    valued_at: newDate.value,
  }

  await store.addValuation(props.asset.id, data)
  newValue.value = ''
  newNote.value = ''
  newDate.value = new Date().toISOString().slice(0, 10)
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
        class="flex items-center justify-between py-3 px-4 rounded-secondary border border-surface-border dark:border-surface-dark-border bg-surface dark:bg-surface-dark"
      >
        <div>
          <p class="font-medium text-text-main dark:text-text-dark-main">
            {{ formatCurrency(v.estimated_value) }}
          </p>
          <p class="text-xs text-text-muted dark:text-text-dark-muted">
            {{ formatDate(v.valued_at) }}
            <span v-if="v.note"> — {{ v.note }}</span>
          </p>
        </div>
        <button
          @click="removeEntry(v)"
          class="p-1.5 rounded-secondary text-text-muted dark:text-text-dark-muted hover:text-danger hover:bg-danger/10 transition-colors"
          title="Supprimer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>

    <template #footer>
      <BaseButton variant="ghost" @click="emit('close')">Fermer</BaseButton>
    </template>
  </BaseModal>
</template>
