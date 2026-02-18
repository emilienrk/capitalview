import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '@/api/client'
import type { UserSettingsResponse, UserSettingsUpdate } from '@/types'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<UserSettingsResponse | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function fetchSettings(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      settings.value = await apiClient.get<UserSettingsResponse>('/settings')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Impossible de charger les paramètres'
    } finally {
      isLoading.value = false
    }
  }

  async function updateSettings(data: UserSettingsUpdate): Promise<boolean> {
    isLoading.value = true
    error.value = null
    try {
      settings.value = await apiClient.put<UserSettingsResponse>('/settings', data)
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Impossible de sauvegarder'
      return false
    } finally {
      isLoading.value = false
    }
  }

  return {
    settings,
    isLoading,
    error,
    fetchSettings,
    updateSettings,
  }
})
