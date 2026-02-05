<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useDarkMode } from '@/composables/useDarkMode'
import { useFormatters } from '@/composables/useFormatters'
import PageHeader from '@/components/PageHeader.vue'
import { BaseCard, BaseButton } from '@/components'

const auth = useAuthStore()
const { isDark, toggleDarkMode } = useDarkMode()
const { formatDateTime } = useFormatters()
</script>

<template>
  <div>
    <PageHeader title="Paramètres" description="Configuration de votre compte et préférences" />

    <div class="space-y-6 max-w-2xl">
      <!-- Profile -->
      <BaseCard title="Profil">
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
                {{ formatDateTime(auth.user?.created_at) }}
              </p>
            </div>
          </div>
        </div>
      </BaseCard>

      <!-- Appearance -->
      <BaseCard title="Apparence">
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

      <!-- Security -->
      <BaseCard title="Sécurité">
        <div class="space-y-4">
          <p class="text-sm text-text-muted dark:text-text-dark-muted">
            Toutes les données sensibles (IBAN, adresses crypto) sont chiffrées avec AES-256.
          </p>
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-success" />
            <span class="text-sm text-text-body dark:text-text-dark-body">Chiffrement actif</span>
          </div>
        </div>
      </BaseCard>

      <!-- Version -->
      <div class="text-center py-4">
        <p class="text-xs text-text-muted dark:text-text-dark-muted">
          CapitalView v0.1.0 — &copy; 2026
        </p>
      </div>
    </div>
  </div>
</template>
