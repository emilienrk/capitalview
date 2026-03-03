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
  PickCreate,
  PickResponse,
  PickUpdate,
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

  // ── Picks (likes) ─────────────────────────────────────────

  const myPicks = ref<PickResponse[]>([])
  const isLoadingPicks = ref(false)

  async function fetchMyPicks(): Promise<void> {
    isLoadingPicks.value = true
    error.value = null
    try {
      myPicks.value = await apiClient.get<PickResponse[]>('/community/picks/me')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Impossible de charger vos picks'
    } finally {
      isLoadingPicks.value = false
    }
  }

  async function createPick(data: PickCreate): Promise<PickResponse | null> {
    error.value = null
    try {
      const pick = await apiClient.post<PickResponse>('/community/picks', data)
      myPicks.value.unshift(pick)
      // Also add to viewed profile if it's the current user's profile
      if (viewedProfile.value) {
        viewedProfile.value.picks.unshift(pick)
      }
      return pick
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Impossible de créer le pick'
      return null
    }
  }

  async function updatePick(pickId: number, data: PickUpdate): Promise<PickResponse | null> {
    error.value = null
    try {
      const pick = await apiClient.put<PickResponse>(`/community/picks/${pickId}`, data)
      // Update in myPicks
      const idx = myPicks.value.findIndex((p) => p.id === pickId)
      if (idx !== -1) myPicks.value[idx] = pick
      // Update in viewed profile
      if (viewedProfile.value) {
        const pidx = viewedProfile.value.picks.findIndex((p) => p.id === pickId)
        if (pidx !== -1) viewedProfile.value.picks[pidx] = pick
      }
      return pick
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Impossible de modifier le pick'
      return null
    }
  }

  async function deletePick(pickId: number): Promise<boolean> {
    error.value = null
    try {
      await apiClient.delete(`/community/picks/${pickId}`)
      myPicks.value = myPicks.value.filter((p) => p.id !== pickId)
      // Remove from viewed profile
      if (viewedProfile.value) {
        viewedProfile.value.picks = viewedProfile.value.picks.filter((p) => p.id !== pickId)
      }
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Impossible de supprimer le pick'
      return false
    }
  }

  /** Check if the current user already picked a given symbol+asset_type. */
  function hasPicked(symbol: string, assetType: 'CRYPTO' | 'STOCK'): boolean {
    return myPicks.value.some(
      (p) => p.symbol === symbol && p.asset_type === assetType,
    )
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
    // Picks
    myPicks,
    isLoadingPicks,
    fetchMyPicks,
    createPick,
    updatePick,
    deletePick,
    hasPicked,
  }
})
