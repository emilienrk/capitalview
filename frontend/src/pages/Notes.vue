<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue'
import draggable from 'vuedraggable'
import { useNotesStore } from '@/stores/notes'
import PageHeader from '@/components/PageHeader.vue'
import {
  BaseCard, BaseButton, BaseInput, BaseTextarea, BaseModal,
  BaseSpinner, BaseAlert, BaseEmptyState,
} from '@/components'
import type { NoteCreate, NoteResponse } from '@/types'

const notes = useNotesStore()

const showModal = ref(false)
const editingId = ref<string | null>(null)
/** Tracks note ID pending delete confirmation */
const confirmingDeleteId = ref<string | null>(null)

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

function requestDelete(id: string): void {
  confirmingDeleteId.value = id
}

function cancelDelete(): void {
  confirmingDeleteId.value = null
}

async function confirmDelete(id: string): Promise<void> {
  await notes.deleteNote(id)
  confirmingDeleteId.value = null
}

/** Called by vuedraggable after a drag ends */
function onDragEnd(): void {
  const ids = notes.notes.map((n: NoteResponse) => n.id)
  notes.reorderNotes(ids)
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

    <!-- Notes grid with drag-and-drop -->
    <draggable
      v-if="notes.notes.length"
      v-model="notes.notes"
      item-key="id"
      handle=".drag-handle"
      ghost-class="opacity-30"
      animation="200"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      @end="onDragEnd"
    >
      <template #item="{ element: note }">
        <BaseCard hoverable @click="openEdit(note)">
          <!-- Header: drag handle + title + delete -->
          <div class="flex items-start gap-2">
            <!-- Drag handle -->
            <button
              class="drag-handle mt-0.5 cursor-grab active:cursor-grabbing text-text-muted dark:text-text-dark-muted hover:text-text-main dark:hover:text-text-dark-main transition-colors shrink-0"
              @click.stop
              title="Déplacer"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
              </svg>
            </button>

            <!-- Title -->
            <h3 class="flex-1 font-semibold text-text-main dark:text-text-dark-main mb-2 min-w-0">
              {{ note.name }}
            </h3>

            <!-- Delete: 2-step -->
            <div class="shrink-0" @click.stop>
              <Transition name="fade" mode="out-in">
                <!-- Step 1: trash icon -->
                <button
                  v-if="confirmingDeleteId !== note.id"
                  :key="'trash'"
                  class="p-1 rounded-secondary text-text-muted dark:text-text-dark-muted hover:text-danger hover:bg-danger/10 transition-colors"
                  title="Supprimer"
                  @click="requestDelete(note.id)"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
                <!-- Step 2: confirm + cancel -->
                <div v-else :key="'confirm'" class="flex items-center gap-1">
                  <button
                    class="p-1 rounded-secondary text-danger bg-danger/10 hover:bg-danger/20 transition-colors"
                    title="Confirmer"
                    @click="confirmDelete(note.id)"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button
                    class="p-1 rounded-secondary text-text-muted dark:text-text-dark-muted hover:text-text-main dark:hover:text-text-dark-main hover:bg-surface-hover dark:hover:bg-surface-dark-hover transition-colors"
                    title="Annuler"
                    @click="cancelDelete"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </Transition>
            </div>
          </div>

          <!-- Description -->
          <p class="text-sm text-text-body dark:text-text-dark-body line-clamp-4 whitespace-pre-wrap">
            {{ note.description || 'Aucune description' }}
          </p>
        </BaseCard>
      </template>
    </draggable>

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

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>