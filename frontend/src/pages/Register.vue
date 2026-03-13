<script setup lang="ts">
import { AlertCircle, ArrowRight, Circle, Eye, EyeOff, LoaderCircle, Lock, Mail, ShieldCheck, User } from 'lucide-vue-next'

import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref('')
const isLoading = ref(false)
const showPassword = ref(false)

const auth = useAuthStore()
const router = useRouter()

// Password strength validation
const passwordChecks = computed(() => ({
  minLength: password.value.length >= 8,
  hasUpper: /[A-Z]/.test(password.value),
  hasLower: /[a-z]/.test(password.value),
  hasDigit: /\d/.test(password.value),
  hasSpecial: /[^A-Za-z0-9]/.test(password.value),
}))

const passwordStrength = computed(() => {
  const checks = Object.values(passwordChecks.value)
  const passed = checks.filter(Boolean).length
  if (passed <= 2) return { label: 'Faible', color: 'bg-danger', width: 'w-1/4' }
  if (passed <= 3) return { label: 'Moyen', color: 'bg-warning', width: 'w-2/4' }
  if (passed <= 4) return { label: 'Bon', color: 'bg-info', width: 'w-3/4' }
  return { label: 'Fort', color: 'bg-success', width: 'w-full' }
})

const passwordsMatch = computed(() => password.value === confirmPassword.value)
const isFormValid = computed(() =>
  username.value.length >= 3 &&
  /^[a-zA-Z0-9_-]+$/.test(username.value) &&
  email.value.includes('@') &&
  Object.values(passwordChecks.value).every(Boolean) &&
  passwordsMatch.value
)

async function handleRegister() {
  error.value = ''

  if (!passwordsMatch.value) {
    error.value = 'Les mots de passe ne correspondent pas'
    return
  }

  if (!Object.values(passwordChecks.value).every(Boolean)) {
    error.value = 'Le mot de passe ne respecte pas les critères de sécurité'
    return
  }

  isLoading.value = true
  try {
    const success = await auth.register({
      username: username.value,
      email: email.value,
      password: password.value,
    })
    if (success) {
      // Auto-login after registration
      const loginSuccess = await auth.login({
        email: email.value,
        password: password.value,
      })
      if (loginSuccess) {
        router.push('/dashboard')
      } else {
        router.push('/login')
      }
    } else {
      error.value = auth.error || 'Erreur lors de l\'inscription'
    }
  } catch (err) {
    error.value = 'Une erreur est survenue lors de l\'inscription'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-[85vh] flex flex-col items-center justify-center animate-fade-in px-4">
    <!-- Register Card -->
    <div class="w-full max-w-md bg-surface dark:bg-surface-dark p-8 rounded-card shadow-card border border-surface-border dark:border-surface-dark-border animate-slide-up">

      <!-- Header Section -->
      <div class="text-center mb-8">
        <img src="/capitalview.svg" alt="CapitalView Logo" class="w-16 h-16 mx-auto mb-4" />
        <h1 class="text-3xl font-bold text-text-main dark:text-text-dark-main tracking-tight">Créer un compte</h1>
        <p class="text-text-muted dark:text-text-dark-muted mt-2">Rejoignez CapitalView pour gérer votre patrimoine</p>
      </div>

      <!-- Register Form -->
      <form @submit.prevent="handleRegister" class="space-y-5">
        <!-- Username -->
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
              type="text"
              required
              minlength="3"
              maxlength="50"
              placeholder="Pseudo"
              autocomplete="username"
              class="w-full pl-11 pr-4 py-3.5 bg-background/50 dark:bg-background-dark-subtle border border-surface-border dark:border-surface-dark-border rounded-input focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-text-main dark:text-text-dark-main placeholder:text-text-muted/50"
            />
          </div>
          <p v-if="username.length > 0 && !/^[a-zA-Z0-9_-]+$/.test(username)" class="text-xs text-danger ml-1">
            Lettres, chiffres, _ et - uniquement (pas de point ni d'espace)
          </p>
        </div>

        <!-- Email -->
        <div class="space-y-2">
          <label for="email" class="text-sm font-semibold text-text-main dark:text-text-dark-main ml-1">
            Adresse email
          </label>
          <div class="relative group">
            <span class="absolute inset-y-0 left-0 pl-4 flex items-center text-text-muted group-focus-within:text-primary transition-colors">
              <Mail class="w-5 h-5" />
            </span>
            <input
              id="email"
              v-model="email"
              type="email"
              required
              placeholder="email@exemple.com"
              autocomplete="email"
              class="w-full pl-11 pr-4 py-3.5 bg-background/50 dark:bg-background-dark-subtle border border-surface-border dark:border-surface-dark-border rounded-input focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-text-main dark:text-text-dark-main placeholder:text-text-muted/50"
            />
          </div>
        </div>

        <!-- Password -->
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
              :type="showPassword ? 'text' : 'password'"
              required
              minlength="8"
              maxlength="100"
              placeholder="••••••••"
              autocomplete="new-password"
              class="w-full pl-11 pr-12 py-3.5 bg-background/50 dark:bg-background-dark-subtle border border-surface-border dark:border-surface-dark-border rounded-input focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-text-main dark:text-text-dark-main placeholder:text-text-muted/50"
            />
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="absolute inset-y-0 right-0 pr-4 flex items-center text-text-muted hover:text-text-main dark:hover:text-text-dark-main transition-colors"
            >
              <EyeOff v-if="showPassword" class="w-5 h-5" />
              <Eye v-else class="w-5 h-5" />
            </button>
          </div>

          <!-- Password strength indicator -->
          <div v-if="password.length > 0" class="space-y-2 mt-2">
            <div class="flex items-center gap-2">
              <div class="flex-1 h-1.5 bg-surface-border dark:bg-surface-dark-border rounded-full overflow-hidden">
                <div :class="[passwordStrength.color, passwordStrength.width, 'h-full rounded-full transition-all duration-300']" />
              </div>
              <span class="text-xs font-medium text-text-muted dark:text-text-dark-muted">{{ passwordStrength.label }}</span>
            </div>
            <ul class="space-y-1 text-xs">
              <li v-for="(check, key) in { 'Au moins 8 caractères': passwordChecks.minLength, 'Une majuscule': passwordChecks.hasUpper, 'Une minuscule': passwordChecks.hasLower, 'Un chiffre': passwordChecks.hasDigit, 'Un caractère spécial': passwordChecks.hasSpecial }" :key="key" class="flex items-center gap-1.5">
                <Circle v-if="check" class="w-3.5 h-3.5 text-success shrink-0" />
                <Circle v-else class="w-3.5 h-3.5 text-text-muted/40 dark:text-text-dark-muted/40 shrink-0" />
                <span :class="check ? 'text-success' : 'text-text-muted dark:text-text-dark-muted'">{{ key }}</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- Confirm Password -->
        <div class="space-y-2">
          <label for="confirmPassword" class="text-sm font-semibold text-text-main dark:text-text-dark-main ml-1">
            Confirmer le mot de passe
          </label>
          <div class="relative group">
            <span class="absolute inset-y-0 left-0 pl-4 flex items-center text-text-muted group-focus-within:text-primary transition-colors">
              <ShieldCheck class="w-5 h-5" />
            </span>
            <input
              id="confirmPassword"
              v-model="confirmPassword"
              type="password"
              required
              placeholder="••••••••"
              autocomplete="new-password"
              class="w-full pl-11 pr-4 py-3.5 bg-background/50 dark:bg-background-dark-subtle border border-surface-border dark:border-surface-dark-border rounded-input focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-text-main dark:text-text-dark-main placeholder:text-text-muted/50"
              :class="{ 'border-danger focus:ring-danger/20 focus:border-danger': confirmPassword.length > 0 && !passwordsMatch }"
            />
          </div>
          <p v-if="confirmPassword.length > 0 && !passwordsMatch" class="text-xs text-danger ml-1">
            Les mots de passe ne correspondent pas
          </p>
        </div>

        <!-- Error message -->
        <transition enter-active-class="animate-fade-in" leave-active-class="opacity-0 transition-opacity">
          <div v-if="error" class="flex items-center gap-3 p-4 bg-danger/10 border border-danger/20 text-danger text-sm rounded-input">
            <AlertCircle class="w-5 h-5 shrink-0" />
            {{ error }}
          </div>
        </transition>

        <!-- Submit -->
        <button
          type="submit"
          :disabled="isLoading || !isFormValid"
          class="group relative w-full bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-content font-bold py-4 rounded-button transition-all shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
        >
          <span v-if="isLoading" class="flex items-center justify-center gap-2">
            <LoaderCircle class="animate-spin h-5 w-5 text-current" />
            Création en cours...
          </span>
          <span v-else class="flex items-center justify-center gap-2">
            Créer mon compte
            <ArrowRight class="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </span>
        </button>
      </form>

      <!-- Link to login -->
      <div class="mt-6 text-center">
        <p class="text-sm text-text-muted dark:text-text-dark-muted">
          Déjà un compte ?
          <router-link to="/login" class="text-primary hover:text-primary-hover font-semibold transition-colors">
            Se connecter
          </router-link>
        </p>
      </div>

      <!-- Footer Branding -->
      <div class="mt-6 text-center">
        <p class="text-xs text-text-muted dark:text-text-dark-muted">
          CapitalView &copy; 2026 — Sécurisé & Privé
        </p>
      </div>
    </div>

    <!-- Background Decoration -->
    <div class="fixed top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none opacity-20 dark:opacity-10">
      <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary blur-[120px]"></div>
      <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400 blur-[120px]"></div>
    </div>
  </div>
</template>
