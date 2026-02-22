<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { AssetCreate, AssetUpdate, AssetResponse } from '@/types'
import BaseModal from '@/components/BaseModal.vue'
import { BaseButton, BaseInput, BaseSelect } from '@/components'
import type { SelectOption } from '@/components/BaseSelect.vue'

interface Props {
  open: boolean
  asset?: AssetResponse | null
}

const props = withDefaults(defineProps<Props>(), {
  asset: null,
})

const emit = defineEmits<{
  close: []
  save: [data: AssetCreate | AssetUpdate]
}>()

const isEditing = computed(() => !!props.asset)

const CATEGORY_OPTIONS: SelectOption[] = [
  { label: 'Véhicule', value: 'Véhicule' },
  { label: 'Électronique', value: 'Électronique' },
  { label: 'Gaming / Skins', value: 'Gaming' },
  { label: 'Bijoux / Montres', value: 'Bijoux' },
  { label: 'Art / Collection', value: 'Art' },
  { label: 'Mobilier', value: 'Mobilier' },
  { label: 'Immobilier (non coté)', value: 'Immobilier' },
  { label: 'Autre', value: 'Autre' },
]

// Form state
const name = ref('')
const description = ref('')
const category = ref('')
const customCategory = ref('')
const purchasePrice = ref<number | string>('0')
const estimatedValue = ref<number | string>('')
const currency = ref('EUR')
const acquisitionDate = ref('')

function resetForm(): void {
  name.value = ''
  description.value = ''
  category.value = ''
  customCategory.value = ''
  purchasePrice.value = '0'
  estimatedValue.value = ''
  currency.value = 'EUR'
  acquisitionDate.value = ''
}

watch(() => props.open, (isOpen) => {
  if (isOpen && props.asset) {
    name.value = props.asset.name
    description.value = props.asset.description ?? ''
    // Check if the category matches a preset
    const preset = CATEGORY_OPTIONS.find(o => o.value === props.asset!.category)
    if (preset) {
      category.value = props.asset.category
      customCategory.value = ''
    } else {
      category.value = '_custom'
      customCategory.value = props.asset.category
    }
    purchasePrice.value = props.asset.purchase_price ?? ''
    estimatedValue.value = props.asset.estimated_value ?? ''
    currency.value = props.asset.currency
    acquisitionDate.value = props.asset.acquisition_date ?? ''
  } else if (isOpen) {
    resetForm()
  }
})

const effectiveCategory = computed(() =>
  category.value === '_custom' ? customCategory.value : category.value
)

const isValid = computed(() => {
  const hasName = name.value.trim().length > 0
  const hasCat = effectiveCategory.value.trim().length > 0
  const hasPurchase = purchasePrice.value !== '' && purchasePrice.value !== null && Number(purchasePrice.value) >= 0
  const hasEstimated = estimatedValue.value !== '' && estimatedValue.value !== null && Number(estimatedValue.value) >= 0
  return hasName && hasCat && (hasPurchase || hasEstimated)
})

function onSubmit(): void {
  if (!isValid.value) return

  const pp = purchasePrice.value !== '' && purchasePrice.value !== null
    ? Number(purchasePrice.value)
    : null

  const ev = estimatedValue.value !== '' && estimatedValue.value !== null
    ? Number(estimatedValue.value)
    : null

  const base = {
    name: name.value.trim(),
    description: description.value.trim() || null,
    category: effectiveCategory.value.trim(),
    purchase_price: pp,
    estimated_value: ev,
    currency: currency.value,
    acquisition_date: acquisitionDate.value || null,
  }

  emit('save', base)
}

const allCategoryOptions = computed<SelectOption[]>(() => [
  ...CATEGORY_OPTIONS,
  { label: 'Catégorie personnalisée…', value: '_custom' },
])
</script>

<template>
  <BaseModal :open="props.open" :title="isEditing ? 'Modifier le bien' : 'Ajouter un bien'" size="lg" @close="emit('close')">
    <form class="space-y-4" @submit.prevent="onSubmit">
      <BaseInput
        v-model="name"
        label="Nom"
        placeholder="Nom du bien"
        required
      />

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <BaseSelect
          v-model="category"
          label="Catégorie"
          :options="allCategoryOptions"
          required
        />
        <BaseInput
          v-if="category === '_custom'"
          v-model="customCategory"
          label="Catégorie personnalisée"
          placeholder="Nom de la catégorie"
          required
        />
        <BaseInput
          v-model="acquisitionDate"
          label="Date d'acquisition"
          type="date"
        />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <BaseInput
          v-model="purchasePrice"
          label="Prix d'achat"
          type="number"
          placeholder=""
        />
        <BaseInput
          v-model="estimatedValue"
          label="Valeur estimée actuelle"
          type="number"
          placeholder="Optionnel si prix d'achat renseigné"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-text-main dark:text-text-dark-main mb-1.5">
          Description
        </label>
        <textarea
          v-model="description"
          rows="2"
          placeholder="Description (optionnel)"
          class="w-full px-4 py-2.5 rounded-input border bg-surface dark:bg-surface-dark transition-all duration-150 resize-y text-text-main dark:text-text-dark-main placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary border-surface-border dark:border-surface-dark-border"
        />
      </div>
    </form>

    <template #footer>
      <BaseButton variant="ghost" @click="emit('close')">Annuler</BaseButton>
      <BaseButton :disabled="!isValid" @click="onSubmit">
        {{ isEditing ? 'Enregistrer' : 'Ajouter' }}
      </BaseButton>
    </template>
  </BaseModal>
</template>
