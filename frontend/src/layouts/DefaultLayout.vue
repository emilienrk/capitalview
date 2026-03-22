<script setup lang="ts">
import type { Component } from 'vue'
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowUpDown, Bitcoin, CreditCard, Home, Landmark, LogOut, Menu, NotebookPen, Settings, TrendingUp, Users } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { useSwipe } from '@/composables/useSwipe'
import { useSettingsStore } from '@/stores/settings'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const settingsStore = useSettingsStore()

const sidebarOpen = ref(false)

useSwipe({
  onSwipeRight: () => { sidebarOpen.value = true },
  onSwipeLeft: () => { sidebarOpen.value = false },
})

watch(sidebarOpen, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
    document.documentElement.style.overflow = ''
  }
})

interface NavItem {
  label: string
  to: string
  icon: Component
}

const BASE_NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    icon: Home,
  },
  {
    label: 'Compte Bancaire',
    to: '/bank',
    icon: CreditCard,
  },
  {
    label: 'Cashflow',
    to: '/cashflow',
    icon: ArrowUpDown,
  },
  {
    label: 'Bourse',
    to: '/stock',
    icon: TrendingUp,
  },
  {
    label: 'Patrimoine',
    to: '/wealth',
    icon: Landmark,
  },
    {
    label: 'Communauté',
    to: '/community',
    icon: Users,
  },
  {
    label: 'Notes',
    to: '/notes',
    icon: NotebookPen,
  },
  {
    label: 'Paramètres',
    to: '/settings',
    icon: Settings,
  },
]

const CRYPTO_NAV_ITEM: NavItem = {
  label: 'Crypto',
  to: '/crypto',
  icon: Bitcoin,
}

const navItems = computed<NavItem[]>(() => {
  const s = settingsStore.settings
  const byPath = (path: string) => BASE_NAV_ITEMS.find(i => i.to === path)!

  const items: NavItem[] = [byPath('/dashboard')]

  if (s?.bank_module_enabled ?? true) items.push(byPath('/bank'))
  if (s?.cashflow_module_enabled ?? true) items.push(byPath('/cashflow'))

  items.push(byPath('/stock'))

  if (s?.crypto_module_enabled) items.push(CRYPTO_NAV_ITEM)

  if (s?.wealth_module_enabled ?? true) items.push(byPath('/wealth'))

  items.push(byPath('/community'))
  items.push(byPath('/notes'))
  items.push(byPath('/settings'))

  return items
})

function isActive(path: string): boolean {
  return route.path === path
}

async function handleLogout(): Promise<void> {
  await auth.logout()
  router.push('/login')
}

onMounted(async () => {
  if (auth.isAuthenticated && !settingsStore.settings) {
    await settingsStore.fetchSettings()
  }
})
</script>

<template>
  <div class="min-h-dvh flex bg-background dark:bg-background-dark">
    <!-- ── Mobile overlay ────────────────────────────────── -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="sidebarOpen"
        class="fixed z-30 bg-black/30 lg:hidden"
        style="top: -200vh; left: 0; right: 0; bottom: -200vh; height: 500vh;"
        @click="sidebarOpen = false"
      />
    </Transition>

    <!-- ── Sidebar ───────────────────────────────────────── -->
    <aside
      :class="[
        'fixed left-0 z-40 w-sidebar flex flex-col bg-sidebar dark:bg-sidebar-dark border-r border-sidebar-border dark:border-sidebar-dark-border transition-transform duration-200 lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      ]"
      style="top: 0; height: 100dvh; padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px);"
    >
      <!-- Brand -->
      <router-link to="/dashboard" class="flex items-center gap-3 px-6 h-16 border-b border-sidebar-border dark:border-sidebar-dark-border shrink-0 cursor-pointer" @click="sidebarOpen = false">
        <img src="/capitalview.svg" alt="CapitalView Logo" class="w-8 h-8" />
        <span class="font-bold text-lg text-text-main dark:text-text-dark-main tracking-tight">CapitalView</span>
      </router-link>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          @click="sidebarOpen = false"
          :class="[
            'flex items-center gap-3 px-3 py-2.5 rounded-button text-sm font-medium transition-colors duration-150',
            isActive(item.to)
              ? 'bg-sidebar-active dark:bg-sidebar-dark-active text-primary'
              : 'text-text-body dark:text-text-dark-body hover:bg-surface-hover dark:hover:bg-surface-dark-hover',
          ]"
        >
          <component :is="item.icon" class="w-5 h-5 shrink-0" :stroke-width="1.5" />
          {{ item.label }}
        </router-link>
      </nav>

      <!-- Bottom section -->
      <div class="shrink-0 p-3 border-t border-sidebar-border dark:border-sidebar-dark-border bg-sidebar dark:bg-sidebar-dark space-y-1.5">
        <!-- User info & logout -->
        <div class="flex items-center gap-3 px-3 py-2.5">
          <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span class="text-primary text-sm font-bold">{{ auth.user?.username?.charAt(0).toUpperCase() ?? '?' }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-text-main dark:text-text-dark-main truncate">{{ auth.user?.username }}</p>
            <p class="text-xs text-text-muted dark:text-text-dark-muted truncate">{{ auth.user?.email }}</p>
          </div>
          <button
            @click="handleLogout"
            class="shrink-0 p-1.5 rounded-secondary text-text-muted dark:text-text-dark-muted hover:text-danger hover:bg-danger/10 transition-colors"
            title="Déconnexion"
          >
            <LogOut class="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>

    <!-- ── Main content ──────────────────────────────────── -->
    <div class="flex-1 flex flex-col min-w-0 lg:ml-sidebar">
      <!-- Mobile top bar -->
      <header
        class="lg:hidden flex items-center px-4 bg-surface dark:bg-surface-dark border-b border-surface-border dark:border-surface-dark-border sticky top-0 z-20"
        style="height: calc(3.5rem + env(safe-area-inset-top, 0px)); padding-top: env(safe-area-inset-top, 0px);"
      >
        <button
          @click="sidebarOpen = true"
          class="p-2 -ml-2 rounded-secondary text-text-muted dark:text-text-dark-muted hover:bg-surface-hover dark:hover:bg-surface-dark-hover transition-colors"
        >
          <Menu class="w-5 h-5" />
        </button>
        <span class="ml-3 font-semibold text-text-main dark:text-text-dark-main">CapitalView</span>
      </header>

      <!-- Page content -->
      <!-- padding-bottom accounts for iPhone home indicator safe area -->
      <main class="flex-1 overflow-y-auto p-4 lg:p-8" style="padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));">
        <div class="max-w-7xl mx-auto">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>