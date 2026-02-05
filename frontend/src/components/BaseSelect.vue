<script setup lang="ts">
export interface SelectOption {
  label: string
  value: string | number
}

interface Props {
  modelValue: string | number
  label?: string
  options: SelectOption[]
  placeholder?: string
  error?: string
  disabled?: boolean
  required?: boolean
  id?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Sélectionner...',
  disabled: false,
  required: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

function onChange(event: Event): void {
  const target = event.target as HTMLSelectElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="space-y-1.5">
    <label
      v-if="props.label"
      :for="props.id"
      class="block text-sm font-medium text-text-main dark:text-text-dark-main"
    >
      {{ props.label }}
      <span v-if="props.required" class="text-danger ml-0.5">*</span>
    </label>
    <select
      :id="props.id"
      :value="props.modelValue"
      :disabled="props.disabled"
      :required="props.required"
      @change="onChange"
      :class="[
        'w-full px-4 py-2.5 rounded-input border bg-surface dark:bg-surface-dark transition-all duration-150',
        'text-text-main dark:text-text-dark-main',
        'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        props.error
          ? 'border-danger focus:ring-danger/20 focus:border-danger'
          : 'border-surface-border dark:border-surface-dark-border',
      ]"
    >
      <option value="" disabled>{{ props.placeholder }}</option>
      <option
        v-for="option in props.options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
    <p v-if="props.error" class="text-xs text-danger mt-1">{{ props.error }}</p>
  </div>
</template>
