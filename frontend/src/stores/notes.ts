import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '@/api/client'
import type { NoteResponse, NoteCreate, NoteUpdate } from '@/types'

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<NoteResponse[]>([])
  const currentNote = ref<NoteResponse | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function fetchAll(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      notes.value = await apiClient.get<NoteResponse[]>('/notes')
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors du chargement des notes'
    } finally {
      isLoading.value = false
    }
  }

  async function fetchNote(id: number): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      currentNote.value = await apiClient.get<NoteResponse>(`/notes/${id}`)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors du chargement de la note'
    } finally {
      isLoading.value = false
    }
  }

  async function createNote(data: NoteCreate): Promise<NoteResponse | null> {
    isLoading.value = true
    error.value = null
    try {
      const note = await apiClient.post<NoteResponse>('/notes', data)
      await fetchAll()
      return note
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de la création'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function updateNote(id: number, data: NoteUpdate): Promise<NoteResponse | null> {
    isLoading.value = true
    error.value = null
    try {
      const note = await apiClient.put<NoteResponse>(`/notes/${id}`, data)
      await fetchAll()
      return note
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de la mise à jour'
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function deleteNote(id: number): Promise<boolean> {
    isLoading.value = true
    error.value = null
    try {
      await apiClient.delete(`/notes/${id}`)
      await fetchAll()
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur lors de la suppression'
      return false
    } finally {
      isLoading.value = false
    }
  }

  function reset(): void {
    notes.value = []
    currentNote.value = null
    error.value = null
  }

  return {
    notes,
    currentNote,
    isLoading,
    error,
    fetchAll,
    fetchNote,
    createNote,
    updateNote,
    deleteNote,
    reset,
  }
})
