<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
  icon: string
}

const tabs: Tab[] = [
  {
    id: 'general',
    label: 'Général',
    icon: 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z',
  },
  {
    id: 'finances',
    label: 'Finances',
    icon: 'M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z',
  },
  {
    id: 'modules',
    label: 'Modules',
    icon: 'M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z',
  },
  {
    id: 'communaute',
    label: 'Communauté',
    icon: 'M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z',
  },
  {
    id: 'securite',
    label: 'Sécurité',
    icon: 'M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z',
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

    <!-- Tab navigation -->
    <nav class="sticky top-0 z-10 -mx-1 mb-6 bg-background dark:bg-background-dark py-2">
      <div class="flex gap-1 overflow-x-auto">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="setTab(tab.id)"
          :class="[
            'shrink-0 flex items-center gap-2 px-4 py-2 rounded-button text-sm font-medium transition-colors',
            activeTab === tab.id
              ? 'bg-primary text-primary-content'
              : 'text-text-muted dark:text-text-dark-muted bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border hover:border-primary hover:text-primary',
          ]"
        >
          <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" :d="tab.icon" />
          </svg>
          {{ tab.label }}
        </button>
      </div>
    </nav>

    <!-- Tab content -->
    <div class="max-w-3xl">
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
    </div>
  </div>
</template>
