<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { ref, onMounted } from 'vue'

const auth = useAuthStore()
const router = useRouter()
const isDark = ref(false)

onMounted(() => {
  isDark.value = document.documentElement.classList.contains('dark')
})

function toggleDarkMode() {
  isDark.value = !isDark.value
  if (isDark.value) {
    document.documentElement.classList.add('dark')
    localStorage.theme = 'dark'
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.theme = 'light'
  }
}

async function handleLogout() {
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Navigation menu -->
    <nav class="px-6 py-4 bg-surface dark:bg-surface-dark border-b border-surface-border dark:border-surface-dark-border shadow-sm flex flex-wrap gap-6 items-center sticky top-0 z-50">
      <span class="font-bold text-lg text-primary">{{ auth.user?.username }}</span>
      
      <div class="flex-1 flex gap-4 overflow-x-auto items-center text-sm font-medium">
        <router-link to="/dashboard" class="hover:text-primary transition-colors" active-class="text-primary font-bold">Dashboard</router-link>
        <router-link to="/compte-courant" class="hover:text-primary transition-colors" active-class="text-primary font-bold">Compte Courant</router-link>
        <router-link to="/pea" class="hover:text-primary transition-colors" active-class="text-primary font-bold">PEA</router-link>
        <router-link to="/compte-titre" class="hover:text-primary transition-colors" active-class="text-primary font-bold">Compte Titre</router-link>
        <router-link to="/patrimoine" class="hover:text-primary transition-colors" active-class="text-primary font-bold">Patrimoine</router-link>
        <router-link to="/crypto" class="hover:text-primary transition-colors" active-class="text-primary font-bold">Crypto</router-link>
        <router-link to="/autres-investissements" class="hover:text-primary transition-colors" active-class="text-primary font-bold">Autres</router-link>
        <router-link to="/notes" class="hover:text-primary transition-colors" active-class="text-primary font-bold">Notes</router-link>
        <router-link to="/theme-test" class="hover:text-primary transition-colors" active-class="text-primary font-bold">Thème</router-link>
      </div>

      <div class="flex items-center gap-4">
         <!-- Dark Mode Toggle (Icon only) -->
        <button @click="toggleDarkMode" class="p-2 rounded-lg hover:bg-background-subtle dark:hover:bg-surface-dark-border transition-colors text-text-muted dark:text-text-dark-muted" title="Basculer le thème">
          <svg v-if="isDark" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
          <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
        </button>

        <button @click="handleLogout" class="text-sm text-danger hover:text-red-700 font-medium transition-colors">Déconnexion</button>
      </div>
    </nav>

    <!-- Page content with container -->
    <main class="flex-1 p-6 container mx-auto">
      <slot />
    </main>
  </div>
</template>
