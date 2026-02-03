<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const username = ref('')
const password = ref('')
const error = ref('')
const isLoading = ref(false)

const auth = useAuthStore()
const router = useRouter()

async function handleLogin() {
  error.value = ''
  isLoading.value = true
  try {
    const success = await auth.login({ email: username.value, password: password.value })
    if (success) {
      router.push('/dashboard')
    } else {
      error.value = 'Identifiants invalides'
    }
  } catch (err) {
    error.value = 'Une erreur est survenue lors de la connexion'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-[85vh] flex flex-col items-center justify-center animate-fade-in px-4">
    <!-- Login Card -->
    <div class="w-full max-w-md bg-surface dark:bg-surface-dark p-8 rounded-card shadow-card border border-surface-border dark:border-surface-dark-border animate-slide-up">
      
      <!-- Header -->
      <div class="text-center mb-10">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-primary bg-primary/10 text-primary mb-4">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 class="text-3xl font-bold text-text-main dark:text-text-dark-main tracking-tight">Bienvenue</h1>
        <p class="text-text-muted dark:text-text-dark-muted mt-2">Connectez-vous à votre espace CapitalView</p>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleLogin" class="space-y-6">
        <div class="space-y-2">
          <label for="username" class="text-sm font-semibold text-text-main dark:text-text-dark-main ml-1">
            Nom d'utilisateur
          </label>
          <div class="relative group">
            <span class="absolute inset-y-0 left-0 pl-4 flex items-center text-text-muted group-focus-within:text-primary transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </span>
            <input
              id="username"
              v-model="username"
              type="email"
              required
              placeholder="votre_email@exemple.com"
              class="w-full pl-11 pr-4 py-3.5 bg-background/50 dark:bg-background-dark-subtle border border-surface-border dark:border-surface-dark-border rounded-input focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-text-main dark:text-text-dark-main placeholder:text-text-muted/50"
            />
          </div>
        </div>

        <div class="space-y-2">
          <label for="password" class="text-sm font-semibold text-text-main dark:text-text-dark-main ml-1">
            Mot de passe
          </label>
          <div class="relative group">
            <span class="absolute inset-y-0 left-0 pl-4 flex items-center text-text-muted group-focus-within:text-primary transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </span>
            <input
              id="password"
              v-model="password"
              type="password"
              required
              placeholder="••••••••"
              class="w-full pl-11 pr-4 py-3.5 bg-background/50 dark:bg-background-dark-subtle border border-surface-border dark:border-surface-dark-border rounded-input focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-text-main dark:text-text-dark-main placeholder:text-text-muted/50"
            />
          </div>
        </div>

        <!-- Error Message -->
        <transition enter-active-class="animate-fade-in" leave-active-class="opacity-0 transition-opacity">
          <div v-if="error" class="flex items-center gap-3 p-4 bg-danger/10 border border-danger/20 text-danger text-sm rounded-input">
            <svg class="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
            {{ error }}
          </div>
        </transition>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="isLoading"
          class="group relative w-full bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-content font-bold py-4 rounded-button transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
        >
          <span v-if="isLoading" class="flex items-center justify-center gap-2">
            <svg class="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Connexion en cours...
          </span>
          <span v-else class="flex items-center justify-center gap-2">
            Se connecter
            <svg class="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </span>
        </button>
      </form>

      <!-- Footer Info -->
      <div class="mt-8 text-center">
        <p class="text-xs text-text-muted dark:text-text-dark-muted">
          CapitalView &copy; 2026 — Sécurisé par chiffrement AES-256
        </p>
      </div>
    </div>

    <!-- Background Decoration (Subtle) -->
    <div class="fixed top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none opacity-20 dark:opacity-10">
      <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary blur-[120px]"></div>
      <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400 blur-[120px]"></div>
    </div>
  </div>
</template>