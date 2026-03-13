<script setup lang="ts">
import { AlertCircle, ArrowRight, LoaderCircle, Lock, User } from 'lucide-vue-next'

import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter, useRoute } from 'vue-router'

const username = ref('')
const password = ref('')
const error = ref('')
const isLoading = ref(false)

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

async function handleLogin() {
  error.value = ''
  isLoading.value = true
  try {
    const success = await auth.login({ email: username.value, password: password.value })
    if (success) {
      const redirect = (route.query.redirect as string) || '/dashboard'
      router.push(redirect)
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
      
      <!-- Header Section -->
      <div class="text-center mb-10">
        <img src="/capitalview.svg" alt="CapitalView Logo" class="w-16 h-16 mx-auto mb-4" />
        <h1 class="text-3xl font-bold text-text-main dark:text-text-dark-main tracking-tight">Bienvenue</h1>
        <p class="text-text-muted dark:text-text-dark-muted mt-2">Connectez-vous à votre espace CapitalView</p>
      </div>

      <!-- Login Form -->
      <form @submit.prevent="handleLogin" class="space-y-6">
        <div class="space-y-2">
          <label for="username" class="text-sm font-semibold text-text-main dark:text-text-dark-main ml-1">
            Nom d'utilisateur
          </label>
          <div class="relative group">
            <span class="absolute inset-y-0 left-0 pl-4 flex items-center text-text-muted group-focus-within:text-primary transition-colors">
              <User class="w-5 h-5" />
            </span>
            <input
              id="username"
              v-model="username"
              type="email"
              required
              placeholder="email@exemple.com"
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
              <Lock class="w-5 h-5" />
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

        <!-- Feedback Messages -->
        <transition enter-active-class="animate-fade-in" leave-active-class="opacity-0 transition-opacity">
          <div v-if="error" class="flex items-center gap-3 p-4 bg-danger/10 border border-danger/20 text-danger text-sm rounded-input">
            <AlertCircle class="w-5 h-5 shrink-0" />
            {{ error }}
          </div>
        </transition>

        <!-- Form Submission -->
        <button
          type="submit"
          :disabled="isLoading"
          class="group relative w-full bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-content font-bold py-4 rounded-button transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
        >
          <span v-if="isLoading" class="flex items-center justify-center gap-2">
            <LoaderCircle class="animate-spin h-5 w-5 text-current" />
            Connexion en cours...
          </span>
          <span v-else class="flex items-center justify-center gap-2">
            Se connecter
            <ArrowRight class="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </span>
        </button>
      </form>

      <!-- Footer Branding -->
      <div class="mt-6 text-center">
        <p class="text-sm text-text-muted dark:text-text-dark-muted">
          Pas encore de compte ?
          <router-link to="/register" class="text-primary hover:text-primary-hover font-semibold transition-colors">
            Créer un compte
          </router-link>
        </p>
      </div>

      <div class="mt-4 text-center">
        <p class="text-xs text-text-muted dark:text-text-dark-muted">
          CapitalView &copy; 2026 — Sécurisé & Privé
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
