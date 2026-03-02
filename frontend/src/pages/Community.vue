<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useCommunityStore } from '@/stores/community'
import PageHeader from '@/components/PageHeader.vue'
import { BaseCard, BaseAlert, BaseSkeleton, BaseSpinner, BaseBadge } from '@/components'

const communityStore = useCommunityStore()
const selectedUsername = ref<string | null>(null)

onMounted(async () => {
  await communityStore.fetchProfiles()
})

async function viewProfile(username: string): Promise<void> {
  selectedUsername.value = username
  await communityStore.fetchProfile(username)
}

function closeProfile(): void {
  selectedUsername.value = null
  communityStore.viewedProfile = null
}

function formatPnl(pnl: number | null): string {
  if (pnl === null) return '—'
  const sign = pnl >= 0 ? '+' : ''
  return `${sign}${pnl.toFixed(2)} %`
}

function pnlColorClass(pnl: number | null): string {
  if (pnl === null) return 'text-text-muted dark:text-text-dark-muted'
  return pnl >= 0 ? 'text-success' : 'text-danger'
}
</script>

<template>
  <div>
    <div class="flex items-start justify-between gap-4 mb-2">
      <PageHeader
        title="Communauté"
        description="Découvrez les performances publiques des autres investisseurs"
      />
      <RouterLink
        :to="{ path: '/settings', query: { tab: 'communaute' } }"
        class="shrink-0 flex items-center gap-2 px-4 py-2 rounded-button text-sm font-medium bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border hover:border-primary hover:text-primary text-text-body dark:text-text-dark-main transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
        Configurer mon profil
      </RouterLink>
    </div>

    <BaseAlert v-if="communityStore.error" variant="danger" dismissible @dismiss="communityStore.error = null" class="mb-6">
      {{ communityStore.error }}
    </BaseAlert>

    <div class="max-w-4xl">
      <!-- Profile detail view -->
      <template v-if="selectedUsername && communityStore.viewedProfile">
        <button
          @click="closeProfile"
          class="mb-4 text-sm text-primary hover:underline flex items-center gap-1"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Retour à la liste
        </button>

        <BaseCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span class="text-primary text-lg font-bold">
                    {{ communityStore.viewedProfile.username.charAt(0).toUpperCase() }}
                  </span>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-text-main dark:text-text-dark-main">
                    {{ communityStore.viewedProfile.username }}
                  </h3>
                  <p class="text-sm text-text-muted dark:text-text-dark-muted">
                    {{ communityStore.viewedProfile.positions.length }} position(s) partagée(s)
                  </p>
                </div>
              </div>
              <div v-if="communityStore.viewedProfile.global_pnl_percentage !== null" class="text-right">
                <p class="text-xs text-text-muted dark:text-text-dark-muted">PnL Global</p>
                <p class="text-xl font-bold" :class="pnlColorClass(communityStore.viewedProfile.global_pnl_percentage)">
                  {{ formatPnl(communityStore.viewedProfile.global_pnl_percentage) }}
                </p>
              </div>
            </div>
          </template>

          <div v-if="communityStore.viewedProfile.positions.length === 0" class="text-center py-8">
            <p class="text-text-muted dark:text-text-dark-muted">Aucune position partagée.</p>
          </div>

          <div v-else class="divide-y divide-surface-border dark:divide-surface-dark-border">
            <div
              v-for="pos in communityStore.viewedProfile.positions"
              :key="pos.symbol + pos.asset_type"
              class="flex items-center justify-between py-3"
            >
              <div class="flex items-center gap-3">
                <BaseBadge :variant="pos.asset_type === 'CRYPTO' ? 'info' : 'secondary'" size="sm">
                  {{ pos.asset_type }}
                </BaseBadge>
                <span class="font-medium text-text-main dark:text-text-dark-main">{{ pos.symbol }}</span>
              </div>
              <span class="font-semibold tabular-nums" :class="pnlColorClass(pos.pnl_percentage)">
                {{ formatPnl(pos.pnl_percentage) }}
              </span>
            </div>
          </div>
        </BaseCard>
      </template>

      <!-- Loading profile -->
      <template v-else-if="selectedUsername && communityStore.isLoadingProfile">
        <div class="flex items-center justify-center py-12">
          <BaseSpinner />
        </div>
      </template>

      <!-- Profiles list -->
      <template v-else>
        <template v-if="communityStore.isLoadingProfiles">
          <div class="space-y-3">
            <BaseSkeleton v-for="i in 5" :key="i" variant="rect" height="3.5rem" />
          </div>
        </template>

        <template v-else-if="communityStore.profiles.length === 0">
          <BaseCard>
            <div class="text-center py-8">
              <svg class="w-12 h-12 mx-auto text-text-muted dark:text-text-dark-muted mb-3" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
              <p class="text-text-muted dark:text-text-dark-muted">
                Aucun profil communautaire actif pour le moment.
              </p>
              <p class="text-sm text-text-muted dark:text-text-dark-muted mt-1">
                Activez le vôtre dans les <strong>Paramètres</strong> pour apparaître ici.
              </p>
              <RouterLink
                :to="{ path: '/settings', query: { tab: 'communaute' } }"
                class="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-button text-sm font-medium bg-primary text-primary-content hover:bg-primary-light transition-colors"
              >
                Configurer mon profil
              </RouterLink>
            </div>
          </BaseCard>
        </template>

        <template v-else>
          <div class="space-y-2">
            <button
              v-for="profile in communityStore.profiles"
              :key="profile.username"
              @click="viewProfile(profile.username)"
              class="w-full flex items-center gap-3 p-4 rounded-card bg-surface dark:bg-surface-dark border border-surface-border dark:border-surface-dark-border hover:border-primary transition-colors text-left"
            >
              <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span class="text-primary font-bold">
                  {{ profile.username.charAt(0).toUpperCase() }}
                </span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="font-medium text-text-main dark:text-text-dark-main truncate">
                  {{ profile.username }}
                </p>
              </div>
              <svg class="w-5 h-5 text-text-muted dark:text-text-dark-muted shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>
