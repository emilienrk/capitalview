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
    const success = await auth.login(username.value, password.value)
    if (success) {
      router.push('/')
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
  <div class="min-h-[80vh] flex flex-col items-center justify-center bg-background dark:bg-background-dark transition-colors duration-300">
    <div class="w-full max-w-md p-8 bg-surface dark:bg-surface-dark rounded-2xl shadow-xl border border-surface-border dark:border-surface-dark-border">
      <h1 class="text-3xl font-bold text-text-main dark:text-text-dark-main mb-2 text-center">Connexion</h1>
      <p class="text-text-muted dark:text-text-dark-muted mb-8 text-center">Accédez à votre tableau de bord CapitalView</p>

      <form @submit.prevent="handleLogin" class="space-y-6">
        <div>
          <label for="username" class="block text-sm font-medium text-text-main dark:text-text-dark-main mb-1">Nom d'utilisateur</label>
          <input
            id="username"
            v-model="username"
            type="text"
            required
            class="w-full px-4 py-3 rounded-xl border border-surface-border dark:border-surface-dark-border bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-text-main dark:text-text-dark-main"
            placeholder="votre_nom"
          />
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-text-main dark:text-text-dark-main mb-1">Mot de passe</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            class="w-full px-4 py-3 rounded-xl border border-surface-border dark:border-surface-dark-border bg-white dark:bg-slate-800 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-text-main dark:text-text-dark-main"
            placeholder="••••••••"
          />
        </div>

        <div v-if="error" class="p-3 bg-red-50 text-danger text-sm rounded-lg border border-red-100">
          {{ error }}
        </div>

        <button
          type="submit"
          :disabled="isLoading"
          class="w-full bg-primary hover:bg-primary-hover text-primary-content font-semibold py-3 rounded-xl transition-colors shadow-lg shadow-primary-light disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="isLoading">Connexion en cours...</span>
          <span v-else>Se connecter</span>
        </button>
      </form>
    </div>
  </div>
</template>
