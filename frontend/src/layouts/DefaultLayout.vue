<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { useDarkMode } from '@/composables/useDarkMode'
import { useSwipe } from '@/composables/useSwipe'
import { useSettingsStore } from '@/stores/settings'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const { isDark, toggleDarkMode } = useDarkMode()
const settingsStore = useSettingsStore()

const sidebarOpen = ref(false)

// Swipe gestures – mobile only (touch devices)
// Swipe right from left edge → open sidebar
// Swipe left anywhere → close sidebar
useSwipe({
  onSwipeRight: () => { sidebarOpen.value = true },
  onSwipeLeft: () => { sidebarOpen.value = false },
})

// Prevent body scroll when sidebar is open on mobile
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
  icon: string
}

const BASE_NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    to: '/dashboard',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  },
  {
    label: 'Compte Courant',
    to: '/bank-accounts',
    icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  },
  {
    label: 'Cashflow',
    to: '/cashflow',
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    label: 'Bourse',
    to: '/stock-market',
    icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  },
  {
    label: 'Patrimoine',
    to: '/wealth',
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  },
  {
    label: 'Notes',
    to: '/notes',
    icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  },
  {
    label: 'Paramètres',
    to: '/settings',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  },
]

const CRYPTO_NAV_ITEM: NavItem = {
  label: 'Crypto',
  to: '/crypto',
  icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
}

/**
 * Insert the Crypto item between Bourse and Patrimoine when the module is enabled.
 * The positions of the fixed items are known so we can splice precisely.
 */
const navItems = computed<NavItem[]>(() => {
  const items = [...BASE_NAV_ITEMS]
  if (settingsStore.settings?.crypto_module_enabled) {
    // Insert after 'Bourse' (index 3)
    items.splice(4, 0, CRYPTO_NAV_ITEM)
  }
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
  if (!settingsStore.settings) {
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
          <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" :d="item.icon" />
          </svg>
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
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>

    <!-- ── Main content ──────────────────────────────────── -->
    <div class="flex-1 flex flex-col min-w-0 lg:ml-sidebar">
      <!-- Mobile top bar -->
      <header class="lg:hidden flex items-center h-14 px-4 pt-[env(safe-area-inset-top)] bg-surface dark:bg-surface-dark border-b border-surface-border dark:border-surface-dark-border sticky top-0 z-20">
        <button
          @click="sidebarOpen = true"
          class="p-2 -ml-2 rounded-secondary text-text-muted dark:text-text-dark-muted hover:bg-surface-hover dark:hover:bg-surface-dark-hover transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span class="ml-3 font-semibold text-text-main dark:text-text-dark-main">CapitalView</span>
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-y-auto p-4 lg:p-8">
        <div class="max-w-7xl mx-auto">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>