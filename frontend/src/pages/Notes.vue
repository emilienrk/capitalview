<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue'
import { useNotesStore } from '@/stores/notes'
import PageHeader from '@/components/PageHeader.vue'
import {
  BaseCard, BaseButton, BaseInput, BaseTextarea, BaseModal,
  BaseSpinner, BaseAlert, BaseEmptyState,
} from '@/components'
import type { NoteCreate } from '@/types'

const notes = useNotesStore()

const showModal = ref(false)
const editingId = ref<string | null>(null)

const form = reactive<NoteCreate>({
  name: '',
  description: '',
})

function openCreate(): void {
  editingId.value = null
  form.name = ''
  form.description = ''
  showModal.value = true
}

function openEdit(note: { id: string; name: string; description: string | null }): void {
  editingId.value = note.id
  form.name = note.name
  form.description = note.description ?? ''
  showModal.value = true
}

async function handleSubmit(): Promise<void> {
  if (editingId.value) {
    await notes.updateNote(editingId.value, { ...form })
  } else {
    await notes.createNote({ ...form })
  }
  showModal.value = false
}

async function handleDelete(id: string): Promise<void> {
  if (confirm('Supprimer cette note ?')) {
    await notes.deleteNote(id)
  }
}

onMounted(() => {
  notes.fetchAll()
})
</script>

<template>
  <div>
    <PageHeader title="Notes" description="Stratégies, idées d'investissement et notes personnelles">
      <template #actions>
        <BaseButton @click="openCreate">+ Nouvelle note</BaseButton>
      </template>
    </PageHeader>

    <div v-if="notes.isLoading && !notes.notes.length" class="flex justify-center py-20">
      <BaseSpinner size="lg" label="Chargement..." />
    </div>

    <BaseAlert v-if="notes.error" variant="danger" dismissible @dismiss="notes.error = null" class="mb-6">
      {{ notes.error }}
    </BaseAlert>

    <!-- Notes grid -->
    <div v-if="notes.notes.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <BaseCard
        v-for="note in notes.notes"
        :key="note.id"
        hoverable
        @click="openEdit(note)"
      >
        <h3 class="font-semibold text-text-main dark:text-text-dark-main mb-2">{{ note.name }}</h3>
        <p class="text-sm text-text-body dark:text-text-dark-body line-clamp-4 whitespace-pre-wrap">
          {{ note.description || 'Aucune description' }}
        </p>
        <div class="mt-4 flex justify-end">
          <BaseButton size="sm" variant="ghost" @click.stop="handleDelete(note.id)">
            <span class="text-danger text-xs">Supprimer</span>
          </BaseButton>
        </div>
      </BaseCard>
    </div>

    <BaseEmptyState
      v-else-if="!notes.isLoading"
      title="Aucune note"
      description="Documentez vos stratégies et idées d'investissement"
      action-label="Créer une note"
      @action="openCreate"
    />

    <!-- Create/Edit Modal -->
    <BaseModal
      :open="showModal"
      :title="editingId ? 'Modifier la note' : 'Nouvelle note'"
      size="lg"
      @close="showModal = false"
    >
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <BaseInput v-model="form.name" label="Titre" placeholder="Ex: Stratégie DCA ETF" required />
        <BaseTextarea
          v-model="form.description!"
          label="Contenu"
          placeholder="Décrivez votre stratégie, vos objectifs, vos réflexions..."
          :rows="8"
        />
      </form>
      <template #footer>
        <BaseButton variant="ghost" @click="showModal = false">Annuler</BaseButton>
        <BaseButton :loading="notes.isLoading" @click="handleSubmit">
          {{ editingId ? 'Enregistrer' : 'Créer' }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>