import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '@/api/client'
import type {
  AvailablePositionsResponse,
  CommunitySettingsResponse,
  CommunitySettingsUpdate,
  CommunityProfileListItem,
  CommunityProfileResponse,
} from '@/types'

export const useCommunityStore = defineStore('community', () => {
  // ── Settings state ─────────────────────────────────────────
  const settings = ref<CommunitySettingsResponse | null>(null)
  const isLoadingSettings = ref(false)

  // ── Available positions (for checkbox selection) ───────────
  const availablePositions = ref<AvailablePositionsResponse | null>(null)
  const isLoadingPositions = ref(false)

  // ── Profiles listing ───────────────────────────────────────
  const profiles = ref<CommunityProfileListItem[]>([])
  const isLoadingProfiles = ref(false)

  // ── Single profile view ────────────────────────────────────
  const viewedProfile = ref<CommunityProfileResponse | null>(null)
  const isLoadingProfile = ref(false)

  const error = ref<string | null>(null)

  // ── Settings actions ───────────────────────────────────────

  async function fetchSettings(): Promise<void> {
    isLoadingSettings.value = true
    error.value = null
    try {
      settings.value = await apiClient.get<CommunitySettingsResponse>('/community/settings')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Impossible de charger les paramètres communautaires'
    } finally {
      isLoadingSettings.value = false
    }
  }

  async function updateSettings(data: CommunitySettingsUpdate): Promise<boolean> {
    isLoadingSettings.value = true
    error.value = null
    try {
      settings.value = await apiClient.put<CommunitySettingsResponse>('/community/settings', data)
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Impossible de sauvegarder'
      return false
    } finally {
      isLoadingSettings.value = false
    }
  }

  // ── Profile listing ────────────────────────────────────────

  async function fetchProfiles(): Promise<void> {
    isLoadingProfiles.value = true
    error.value = null
    try {
      profiles.value = await apiClient.get<CommunityProfileListItem[]>('/community/profiles')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Impossible de charger les profils'
    } finally {
      isLoadingProfiles.value = false
    }
  }

  // ── Single profile ─────────────────────────────────────────

  async function fetchProfile(username: string): Promise<void> {
    isLoadingProfile.value = true
    error.value = null
    viewedProfile.value = null
    try {
      viewedProfile.value = await apiClient.get<CommunityProfileResponse>(
        `/community/profiles/${encodeURIComponent(username)}`,
      )
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Profil introuvable'
    } finally {
      isLoadingProfile.value = false
    }
  }

  // ── Available positions ────────────────────────────────────

  async function fetchAvailablePositions(): Promise<void> {
    isLoadingPositions.value = true
    error.value = null
    try {
      availablePositions.value = await apiClient.get<AvailablePositionsResponse>(
        '/community/available-positions',
      )
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Impossible de charger les positions disponibles'
    } finally {
      isLoadingPositions.value = false
    }
  }

  return {
    settings,
    isLoadingSettings,
    availablePositions,
    isLoadingPositions,
    profiles,
    isLoadingProfiles,
    viewedProfile,
    isLoadingProfile,
    error,
    fetchSettings,
    updateSettings,
    fetchProfiles,
    fetchProfile,
    fetchAvailablePositions,
  }
})
