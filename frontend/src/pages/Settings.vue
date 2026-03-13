<script setup lang="ts">
import type { Component } from 'vue'
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { LayoutGrid, Lock, User, Users, Wallet } from 'lucide-vue-next'
import { useSettingsStore } from '@/stores/settings'
import PageHeader from '@/components/PageHeader.vue'
import { BaseAlert } from '@/components'
import SettingsGeneral from './settings/SettingsGeneral.vue'
import SettingsFinances from './settings/SettingsFinances.vue'
import SettingsModules from './settings/SettingsModules.vue'
import SettingsCommunity from './settings/SettingsCommunity.vue'
import SettingsSecurity from './settings/SettingsSecurity.vue'

const route = useRoute()
const router = useRouter()
const settingsStore = useSettingsStore()
const appVersion = __APP_VERSION__

interface Tab {
  id: string
  label: string
  shortLabel: string
  icon: Component
}

const tabs: Tab[] = [
  {
    id: 'general',
    label: 'Général',
    shortLabel: 'Général',
    icon: User,
  },
  {
    id: 'finances',
    label: 'Finances',
    shortLabel: 'Finances',
    icon: Wallet,
  },
  {
    id: 'modules',
    label: 'Modules',
    shortLabel: 'Modules',
    icon: LayoutGrid,
  },
  {
    id: 'communaute',
    label: 'Communauté',
    shortLabel: 'Communauté',
    icon: Users,
  },
  {
    id: 'securite',
    label: 'Sécurité',
    shortLabel: 'Sécurité',
    icon: Lock,
  },
]

const activeTab = ref<string>((route.query.tab as string) || 'general')

watch(activeTab, (tab) => {
  router.replace({ query: { ...route.query, tab } })
})

watch(() => route.query.tab, (tab) => {
  if (tab && typeof tab === 'string' && tabs.some(t => t.id === tab)) {
    activeTab.value = tab
  }
})

function setTab(tabId: string): void {
  activeTab.value = tabId
}

onMounted(async () => {
  await settingsStore.fetchSettings()
})
</script>

<template>
  <div>
    <PageHeader title="Paramètres" />

    <BaseAlert v-if="settingsStore.error" variant="danger" dismissible @dismiss="settingsStore.error = null" class="mb-6">
      {{ settingsStore.error }}
    </BaseAlert>

    <div class="flex flex-col lg:flex-row gap-6 lg:items-start">

      <!-- Sidebar navigation (desktop) / Icon grid (mobile) -->
      <aside class="w-full lg:w-52 lg:shrink-0 lg:sticky lg:top-4">

        <!-- Desktop: pill nav, no card wrapper -->
        <nav class="hidden lg:flex flex-col gap-0.5 px-1">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="setTab(tab.id)"
            :class="[
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-button text-sm font-medium text-left transition-all duration-150',
              activeTab === tab.id
                ? 'bg-primary-light text-primary dark:bg-primary/20 dark:text-primary font-semibold'
                : 'text-text-muted dark:text-text-dark-muted hover:bg-background-subtle dark:hover:bg-background-dark-subtle hover:text-text-main dark:hover:text-text-dark-main',
            ]"
          >
            <span :class="['flex items-center justify-center w-7 h-7 rounded-secondary shrink-0 transition-colors', activeTab === tab.id ? 'bg-primary text-primary-content' : 'bg-background-subtle dark:bg-surface-dark text-text-muted dark:text-text-dark-muted']">
              <component :is="tab.icon" class="w-4 h-4" :stroke-width="1.75" />
            </span>
            {{ tab.label }}
          </button>
        </nav>

        <!-- Mobile: grouped card grid, no horizontal scroll -->
        <nav class="lg:hidden grid grid-cols-5 gap-1 bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border rounded-card shadow-card p-1.5">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="setTab(tab.id)"
            :class="[
              'flex flex-col items-center justify-center gap-1.5 px-1 py-2.5 rounded-primary text-[10px] font-medium leading-tight transition-colors',
              activeTab === tab.id
                ? 'bg-primary text-primary-content'
                : 'text-text-muted dark:text-text-dark-muted hover:bg-surface-active dark:hover:bg-surface-dark-hover hover:text-text-main dark:hover:text-text-dark-main',
            ]"
          >
            <component :is="tab.icon" class="w-5 h-5 shrink-0" :stroke-width="1.75" />
            <span class="w-full text-center truncate">{{ tab.shortLabel }}</span>
          </button>
        </nav>
      </aside>

      <!-- Tab content -->
      <main class="flex-1 min-w-0">
        <KeepAlive>
          <SettingsGeneral v-if="activeTab === 'general'" />
          <SettingsFinances v-else-if="activeTab === 'finances'" />
          <SettingsModules v-else-if="activeTab === 'modules'" />
          <SettingsCommunity v-else-if="activeTab === 'communaute'" />
          <SettingsSecurity v-else-if="activeTab === 'securite'" />
        </KeepAlive>

        <div class="text-center py-4 mt-6">
          <p class="text-xs text-text-muted dark:text-text-dark-muted">
            CapitalView v{{ appVersion }} — &copy; 2026
          </p>
        </div>
      </main>

    </div>
  </div>
</template>
