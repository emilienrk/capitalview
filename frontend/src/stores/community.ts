import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '@/api/client'
import type {
  AvailablePositionsResponse,
  CommunitySettingsResponse,
  CommunitySettingsUpdate,
  CommunityProfileListItem,
  CommunityProfileResponse,
  CommunitySearchResult,
  FollowResponse,
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

  // ── Search ─────────────────────────────────────────────────
  const searchResults = ref<CommunitySearchResult[]>([])
  const isSearching = ref(false)

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

  // ── Search ─────────────────────────────────────────────────

  async function searchProfiles(query: string): Promise<void> {
    if (!query.trim()) {
      searchResults.value = []
      return
    }
    isSearching.value = true
    error.value = null
    try {
      searchResults.value = await apiClient.get<CommunitySearchResult[]>(
        `/community/search?q=${encodeURIComponent(query.trim())}`,
      )
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de la recherche'
      searchResults.value = []
    } finally {
      isSearching.value = false
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

  // ── Follow / Unfollow ──────────────────────────────────────

  async function followUser(username: string): Promise<FollowResponse | null> {
    error.value = null
    try {
      const res = await apiClient.post<FollowResponse>(
        `/community/follow/${encodeURIComponent(username)}`,
      )
      // Update local state in the viewed profile
      if (viewedProfile.value && viewedProfile.value.username === username) {
        viewedProfile.value.is_following = res.is_following
        viewedProfile.value.is_mutual = res.is_mutual
        if (res.is_following) {
          viewedProfile.value.followers_count++
        }
      }
      // Update in search results / profiles lists
      _updateFollowState(username, res)
      return res
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Impossible de suivre cet utilisateur'
      return null
    }
  }

  async function unfollowUser(username: string): Promise<FollowResponse | null> {
    error.value = null
    try {
      const res = await apiClient.delete<FollowResponse>(
        `/community/follow/${encodeURIComponent(username)}`
      )
      // Update local state in the viewed profile
      if (viewedProfile.value && viewedProfile.value.username === username) {
        viewedProfile.value.is_following = res.is_following
        viewedProfile.value.is_mutual = res.is_mutual
        viewedProfile.value.followers_count = Math.max(0, viewedProfile.value.followers_count - 1)
      }
      _updateFollowState(username, res)
      return res
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Impossible de ne plus suivre cet utilisateur'
      return null
    }
  }

  /** Update follow flags in search results and profile list items. */
  function _updateFollowState(username: string, state: FollowResponse): void {
    for (const list of [searchResults.value, profiles.value]) {
      const item = list.find((p) => p.username === username)
      if (item) {
        item.is_following = state.is_following
        item.is_mutual = state.is_mutual
      }
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
    searchResults,
    isSearching,
    viewedProfile,
    isLoadingProfile,
    error,
    fetchSettings,
    updateSettings,
    searchProfiles,
    fetchProfiles,
    fetchProfile,
    followUser,
    unfollowUser,
    fetchAvailablePositions,
  }
})
