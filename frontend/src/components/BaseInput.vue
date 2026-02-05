<script setup lang="ts">
interface Props {
  modelValue: string | number
  label?: string
  type?: string
  placeholder?: string
  error?: string
  disabled?: boolean
  required?: boolean
  id?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  placeholder: '',
  disabled: false,
  required: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

function onInput(event: Event): void {
  const target = event.target as HTMLInputElement
  const value = props.type === 'number' ? Number(target.value) : target.value
  emit('update:modelValue', value)
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
    <input
      :id="props.id"
      :type="props.type"
      :value="props.modelValue"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      :required="props.required"
      @input="onInput"
      :class="[
        'w-full px-4 py-2.5 rounded-input border bg-surface dark:bg-surface-dark transition-all duration-150',
        'text-text-main dark:text-text-dark-main placeholder:text-text-muted/50',
        'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        props.error
          ? 'border-danger focus:ring-danger/20 focus:border-danger'
          : 'border-surface-border dark:border-surface-dark-border',
      ]"
    />
    <p v-if="props.error" class="text-xs text-danger mt-1">{{ props.error }}</p>
  </div>
</template>
