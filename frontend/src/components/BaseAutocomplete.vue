<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import BaseSpinner from './BaseSpinner.vue'

interface Props {
  modelValue: string
  label?: string
  placeholder?: string
  options: any[]
  error?: string
  disabled?: boolean
  required?: boolean
  id?: string
  remote?: boolean
  loading?: boolean
  displayValue?: (option: any) => string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '',
  disabled: false,
  required: false,
  options: () => [],
  remote: false,
  loading: false,
  displayValue: (option: any) => typeof option === 'string' ? option : String(option),
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'select': [option: any]
}>()

const isOpen = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)
const wrapperRef = ref<HTMLDivElement | null>(null)

const filteredOptions = computed(() => {
  if (props.remote) return props.options
  if (!props.modelValue) return []
  const query = props.modelValue.toLowerCase()
  return props.options
    .filter(opt => {
      const val = props.displayValue(opt)
      return val.toLowerCase().includes(query) && val.toLowerCase() !== query
    })
    .slice(0, 5)
})

watch(() => props.options, (newOptions) => {
  if (props.remote && newOptions.length > 0 && props.modelValue && props.modelValue.length >= 2) {
    isOpen.value = true
  }
})

function onInput(event: Event): void {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
  if (target.value.length >= 2) {
    isOpen.value = true
  } else {
    isOpen.value = false
  }
}

function selectOption(option: any): void {
  const val = props.displayValue(option)
  emit('update:modelValue', val)
  emit('select', option)
  isOpen.value = false
}

// Handle Tab key to select first suggestion
function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Tab' && isOpen.value && filteredOptions.value.length > 0) {
    const firstOption = filteredOptions.value[0]
    if (firstOption) {
      event.preventDefault() // Prevent focus change
      selectOption(firstOption)
    }
  } else if (event.key === 'Escape') {
    isOpen.value = false
  }
}

// Close dropdown when clicking outside
function handleClickOutside(event: MouseEvent): void {
  if (wrapperRef.value && !wrapperRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div ref="wrapperRef" class="space-y-1.5 relative">
    <label
      v-if="props.label"
      :for="props.id"
      class="block text-sm font-medium text-text-main dark:text-text-dark-main"
    >
      {{ props.label }}
      <span v-if="props.required" class="text-danger ml-0.5">*</span>
    </label>
    
    <div class="relative">
      <input
        ref="inputRef"
        :id="props.id"
        type="text"
        :value="props.modelValue"
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        :required="props.required"
        @input="onInput"
        @keydown="onKeydown"
        @focus="isOpen = true"
        autocomplete="off"
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
      
      <!-- Loading Indicator -->
      <div v-if="loading" class="absolute right-3 top-2.5 text-text-muted">
         <BaseSpinner size="sm" />
      </div>

      <!-- Autocomplete Dropdown -->
      <div
        v-if="isOpen && filteredOptions.length > 0"
        class="absolute z-10 w-full mt-1 bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border rounded-md shadow-lg overflow-hidden"
      >
        <ul class="max-h-60 overflow-auto py-1">
          <li
            v-for="(option, index) in filteredOptions"
            :key="index"
            @click="selectOption(option)"
            class="px-4 py-2 text-sm text-text-main dark:text-text-dark-main hover:bg-surface-hover dark:hover:bg-surface-dark-hover cursor-pointer flex justify-between items-center group"
          >
            <span class="w-full">
              <slot name="item" :item="option">
                {{ props.displayValue(option) }}
              </slot>
            </span>
            <span v-if="index === 0 && !remote" class="text-xs text-text-muted dark:text-text-dark-muted hidden group-hover:inline-block md:inline-block shrink-0 ml-2">
              Tab
            </span>
          </li>
        </ul>
      </div>
    </div>

    <p v-if="props.error" class="text-xs text-danger mt-1">{{ props.error }}</p>
  </div>
</template>
