<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
// @ts-ignore - tailwind config is JS file
import tailwindConfig from '../../tailwind.config.js'

// Dark Mode Logic
const isDark = ref(false)

function toggleDarkMode() {
  isDark.value = !isDark.value
  if (isDark.value) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  }
}

onMounted(() => {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    isDark.value = true
    document.documentElement.classList.add('dark')
  }
})

// Extraction de la configuration
const themeColors = (tailwindConfig as any)?.theme?.extend?.colors || {}
const themeFonts = (tailwindConfig as any)?.theme?.extend?.fontFamily || {}

function flattenColors(colors: any, prefix = ''): { name: string, value: string, class: string }[] {
  let result: { name: string, value: string, class: string }[] = []
  for (const key in colors) {
    const value = colors[key]
    const currentName = prefix ? `${prefix}-${key}` : key
    if (typeof value === 'string') {
      const className = key === 'DEFAULT' ? prefix : currentName
      const displayName = key === 'DEFAULT' ? prefix : currentName
      result.push({ name: displayName, value: value, class: `bg-${className}` })
    } else if (typeof value === 'object') {
      result = result.concat(flattenColors(value, currentName))
    }
  }
  return result
}

const colorGroups = computed(() => {
  const flattened = flattenColors(themeColors)
  const groups: Record<string, typeof flattened> = {}
  flattened.forEach(color => {
    const parts = color.name.split('-')
    const groupName = (parts[0] || 'default') as string
    if (!groups[groupName]) groups[groupName] = []
    groups[groupName]!.push(color)
  })
  return groups
})
</script>

<template>
  <div class="min-h-screen bg-background dark:bg-background-dark text-text-main dark:text-text-dark-main p-8 transition-colors duration-300">
    <div class="max-w-6xl mx-auto">
      <header class="mb-12 border-b border-surface-border dark:border-surface-dark-border pb-6 flex justify-between items-end">
        <div>
          <h1 class="text-4xl font-bold mb-4 font-sans">Design System & Mode Sombre</h1>
          <p class="text-text-muted dark:text-text-dark-muted text-lg">
            Configuration Tailwind v4 avec support natif du mode sombre.
          </p>
        </div>
        
        <!-- Toggle Mode Sombre -->
        <button 
          @click="toggleDarkMode"
          class="flex items-center gap-3 px-4 py-2 rounded-xl bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border shadow-soft hover:scale-105 transition-all"
        >
          <span v-if="!isDark" class="text-warning">
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"></path></svg>
          </span>
          <span v-else class="text-info">
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>
          </span>
          <span class="font-bold">{{ isDark ? 'Mode Sombre' : 'Mode Clair' }}</span>
        </button>
      </header>

      <!-- 1. SURFACES & CARTES -->
      <section class="mb-16">
        <h2 class="text-2xl font-bold mb-6 flex items-center">Surfaces & Feedback</h2>
        <div class="grid md:grid-cols-3 gap-6">
          <div class="p-8 rounded-2xl bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border shadow-card">
            <h3 class="font-bold mb-2">Carte Standard</h3>
            <p class="text-text-body dark:text-text-dark-body">S'adapte automatiquement au thème.</p>
          </div>
          <div class="p-8 rounded-2xl bg-primary/10 border border-primary/20">
            <h3 class="font-bold text-primary mb-2">Accent Primaire</h3>
            <p class="text-primary/80">Reste lisible dans les deux modes.</p>
          </div>
          <div class="p-8 rounded-2xl bg-background-subtle dark:bg-background-dark-subtle border border-surface-border dark:border-surface-dark-border">
            <h3 class="font-bold mb-2">Fond Subtil</h3>
            <p class="text-text-muted dark:text-text-dark-muted">Pour les zones moins importantes.</p>
          </div>
        </div>
      </section>

      <!-- 2. BOUTONS & ÉTATS -->
      <section class="mb-16">
        <h2 class="text-2xl font-bold mb-6">Interactions</h2>
        <div class="bg-surface dark:bg-surface-dark p-8 rounded-2xl border border-surface-border dark:border-surface-dark-border shadow-soft">
          <div class="flex flex-wrap gap-4 mb-8">
            <button class="px-6 py-3 rounded-xl bg-primary text-primary-content font-bold hover:bg-primary-hover transition-all">Primary</button>
            <button class="px-6 py-3 rounded-xl bg-secondary text-white font-bold hover:bg-secondary-hover transition-all">Secondary</button>
            <button class="px-6 py-3 rounded-xl border-2 border-primary text-primary font-bold hover:bg-primary/5 transition-all">Outline</button>
          </div>
          <div class="grid md:grid-cols-2 gap-8">
            <input type="text" placeholder="Entrée de texte..." class="w-full px-4 py-3 rounded-xl border border-surface-border dark:border-surface-dark-border bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary outline-none transition-all">
            <div class="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger font-medium">Message d'erreur stylisé</div>
          </div>
        </div>
      </section>

      <!-- 3. PALETTE DE COULEURS -->
      <section>
        <h2 class="text-2xl font-bold mb-6">Couleurs du Thème</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div v-for="(colors, groupName) in colorGroups" :key="groupName" class="bg-surface dark:bg-surface-dark rounded-xl border border-surface-border dark:border-surface-dark-border overflow-hidden">
            <div class="p-3 bg-background-subtle dark:bg-background-dark-subtle font-bold capitalize">{{ groupName }}</div>
            <div class="p-3 space-y-2">
              <div v-for="color in colors" :key="color.name" class="flex items-center gap-3">
                <div class="w-8 h-8 rounded shadow-inner" :style="{ backgroundColor: color.value }"></div>
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-bold truncate">{{ color.name }}</p>
                  <p class="text-[10px] opacity-50 font-mono uppercase">{{ color.value }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
