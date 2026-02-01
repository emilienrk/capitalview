<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

function handleSubmit() {
  auth.submitForm(router)
}
</script>

<template>
  <div>
    <h1>{{ auth.isRegisterMode ? 'Inscription' : 'Connexion' }}</h1>

    <form @submit.prevent="handleSubmit">
      <!-- Username (register only) -->
      <div v-if="auth.isRegisterMode">
        <label for="username">Nom d'utilisateur:</label>
        <br />
        <input
          id="username"
          v-model="auth.registerForm.username"
          type="text"
          required
          minlength="3"
          maxlength="50"
        />
      </div>

      <br />

      <!-- Email -->
      <div>
        <label for="email">Email:</label>
        <br />
        <input
          v-if="auth.isRegisterMode"
          id="email"
          v-model="auth.registerForm.email"
          type="email"
          required
        />
        <input
          v-else
          id="email"
          v-model="auth.loginForm.email"
          type="email"
          required
        />
      </div>

      <br />

      <!-- Password -->
      <div>
        <label for="password">Mot de passe:</label>
        <br />
        <input
          v-if="auth.isRegisterMode"
          id="password"
          v-model="auth.registerForm.password"
          type="password"
          required
          minlength="8"
        />
        <input
          v-else
          id="password"
          v-model="auth.loginForm.password"
          type="password"
          required
          minlength="8"
        />
      </div>

      <br />

      <!-- Error message -->
      <div v-if="auth.error" style="color: red;">
        Erreur: {{ auth.error }}
      </div>

      <br />

      <!-- Submit button -->
      <button type="submit" :disabled="auth.isLoading">
        {{ auth.isLoading ? 'Chargement...' : (auth.isRegisterMode ? "S'inscrire" : 'Se connecter') }}
      </button>
    </form>

    <br />
    <hr />
    <br />

    <!-- Toggle mode -->
    <p>
      {{ auth.isRegisterMode ? 'Déjà un compte ?' : 'Pas encore de compte ?' }}
      <button type="button" @click="auth.toggleMode">
        {{ auth.isRegisterMode ? 'Se connecter' : "S'inscrire" }}
      </button>
    </p>
  </div>
</template>
