<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue'
import { BaseCard, BaseEmptyState } from '@/components'
</script>

<template>
  <div>
    <PageHeader title="Autres Investissements" description="Immobilier, assurance-vie et autres placements" />

    <BaseCard>
      <BaseEmptyState
        title="Bientôt disponible"
        description="Cette section permettra de suivre vos investissements immobiliers, assurance-vie, SCPI et autres placements alternatifs."
      >
        <template #icon>
          <svg class="w-8 h-8 text-text-muted dark:text-text-dark-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </template>
      </BaseEmptyState>
    </BaseCard>
  </div>
</template>
