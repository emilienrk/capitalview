<script setup lang="ts">
import { FileText, User } from 'lucide-vue-next'

import { useAuthStore } from '@/stores/auth'
import { useDarkMode } from '@/composables/useDarkMode'
import { useFormatters } from '@/composables/useFormatters'
import { BaseCard } from '@/components'

const auth = useAuthStore()
const { isDark, toggleDarkMode } = useDarkMode()
const { formatDateTime, formatDate } = useFormatters()
</script>

<template>
  <div class="space-y-6">
    <!-- Profile -->
    <BaseCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-secondary bg-primary/10 flex items-center justify-center shrink-0">
            <User class="w-4 h-4 text-primary" stroke-width="2" />
          </div>
          <h3 class="text-lg font-semibold text-text-main dark:text-text-dark-main">Compte</h3>
        </div>
      </template>
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
              {{ formatDate(auth.user?.created_at) }}
            </p>
          </div>
        </div>
      </div>
    </BaseCard>

    <!-- Appearance -->
    <BaseCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-secondary bg-primary/10 flex items-center justify-center shrink-0">
            <FileText class="w-4 h-4 text-primary" stroke-width="2" />
          </div>
          <h3 class="text-lg font-semibold text-text-main dark:text-text-dark-main">Apparence</h3>
        </div>
      </template>
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
  </div>
</template>
