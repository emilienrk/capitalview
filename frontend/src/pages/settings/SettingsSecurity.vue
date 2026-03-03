<script setup lang="ts">
import { ref } from 'vue'
import { BaseCard, BaseButton, BaseInput, BaseAlert } from '@/components'

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const isSavingPassword = ref(false)
const passwordError = ref('')
const passwordSuccess = ref(false)

function handlePasswordChange(): void {
  passwordError.value = ''
  passwordSuccess.value = false
  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    passwordError.value = 'Veuillez remplir tous les champs.'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'Les nouveaux mots de passe ne correspondent pas.'
    return
  }
  if (newPassword.value.length < 8) {
    passwordError.value = 'Le mot de passe doit contenir au moins 8 caractères.'
    return
  }
  // TODO: implement backend API call for password change
  isSavingPassword.value = true
  setTimeout(() => {
    isSavingPassword.value = false
    passwordSuccess.value = true
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    setTimeout(() => { passwordSuccess.value = false }, 3000)
  }, 500)
}
</script>

<template>
  <div class="space-y-6">
    <BaseCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-secondary bg-primary/10 flex items-center justify-center shrink-0">
            <svg class="w-4 h-4 text-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
          </div>
          <h3 class="text-lg font-semibold text-text-main dark:text-text-dark-main">Sécurité</h3>
        </div>
      </template>
      <div class="space-y-6">
        <!-- Encryption status -->
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-success shrink-0" />
          <span class="text-sm text-text-body dark:text-text-dark-body">Chiffrement des données actif — vos informations sensibles sont protégées</span>
        </div>

        <!-- Password change form -->
        <div class="pt-4 border-t border-surface-border dark:border-surface-dark-border space-y-4">
          <div>
            <p class="font-medium text-text-main dark:text-text-dark-main">Changer le mot de passe</p>
            <p class="text-sm text-text-muted dark:text-text-dark-muted mt-0.5">Choisissez un mot de passe d'au moins 8 caractères.</p>
          </div>

          <BaseAlert v-if="passwordError" variant="danger">{{ passwordError }}</BaseAlert>
          <BaseAlert v-if="passwordSuccess" variant="success">Fonctionnalité à venir — le mot de passe n'a pas été modifié.</BaseAlert>

          <form @submit.prevent="handlePasswordChange" class="space-y-4">
            <BaseInput v-model="currentPassword" label="Mot de passe actuel" type="password" placeholder="••••••••" autocomplete="current-password" />
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <BaseInput v-model="newPassword" label="Nouveau mot de passe" type="password" placeholder="••••••••" autocomplete="new-password" />
              <BaseInput v-model="confirmPassword" label="Confirmer le mot de passe" type="password" placeholder="••••••••" autocomplete="new-password" />
            </div>
            <div class="flex justify-end">
              <BaseButton type="submit" :loading="isSavingPassword" size="sm">Changer le mot de passe</BaseButton>
            </div>
          </form>
        </div>
      </div>
    </BaseCard>
  </div>
</template>
