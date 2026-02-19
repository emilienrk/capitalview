<script setup lang="ts">
import { onMounted, ref, reactive, computed } from 'vue'
import { useBankStore } from '@/stores/bank'
import { useFormatters } from '@/composables/useFormatters'
import PageHeader from '@/components/PageHeader.vue'
import {
  BaseCard, BaseButton, BaseInput, BaseSelect, BaseModal,
  BaseSpinner, BaseAlert, BaseEmptyState, BaseBadge,
} from '@/components'
import type { BankAccountCreate, BankAccountType } from '@/types'

const bank = useBankStore()
const { formatCurrency, formatDate, formatAccountType } = useFormatters()

const showCreateModal = ref(false)
const editingId = ref<string | null>(null)

const form = reactive<BankAccountCreate>({
  name: '',
  account_type: 'CHECKING' as BankAccountType,
  institution_name: '',
  balance: 0,
})

const accountTypeOptions = computed(() => {
  const existingTypes = new Set(bank.summary?.accounts?.map(a => a.account_type) || [])
  
  // Regulated accounts that should be unique per person
  const uniqueTypes = new Set(['LIVRET_A', 'LIVRET_DEVE', 'LEP', 'LDD', 'PEL', 'CEL'])

  return [
    { label: 'Compte courant', value: 'CHECKING' },
    { label: 'Épargne', value: 'SAVINGS' },
    { label: 'Livret A', value: 'LIVRET_A', disabled: existingTypes.has('LIVRET_A') },
    { label: 'LDDS', value: 'LIVRET_DEVE', disabled: existingTypes.has('LIVRET_DEVE') },
    { label: 'LEP', value: 'LEP', disabled: existingTypes.has('LEP') },
    { label: 'LDD', value: 'LDD', disabled: existingTypes.has('LDD') },
    { label: 'PEL', value: 'PEL', disabled: existingTypes.has('PEL') },
    { label: 'CEL', value: 'CEL', disabled: existingTypes.has('CEL') },
  ]
})

function openCreate(): void {
  editingId.value = null
  form.name = ''
  form.account_type = 'CHECKING'
  form.institution_name = ''
  form.balance = 0
  showCreateModal.value = true
}

function openEdit(account: { id: string; name: string; account_type: BankAccountType; institution_name: string | null; balance: number }): void {
  editingId.value = account.id
  form.name = account.name
  form.account_type = account.account_type
  form.institution_name = account.institution_name ?? ''
  form.balance = account.balance
  showCreateModal.value = true
}

async function handleSubmit(): Promise<void> {
  if (editingId.value) {
    await bank.updateAccount(editingId.value, { ...form })
  } else {
    await bank.createAccount({ ...form })
  }
  showCreateModal.value = false
}

async function handleDelete(id: string): Promise<void> {
  if (confirm('Supprimer ce compte ?')) {
    await bank.deleteAccount(id)
    showCreateModal.value = false
  }
}

onMounted(() => {
  bank.fetchAccounts()
})
</script>

<template>
  <div>
    <PageHeader title="Comptes Bancaires" description="Gérez vos comptes courants et d'épargne">
      <template #actions>
        <BaseButton @click="openCreate">+ Nouveau compte</BaseButton>
      </template>
    </PageHeader>

    <!-- Loading -->
    <div v-if="bank.isLoading && !bank.summary" class="flex justify-center py-20">
      <BaseSpinner size="lg" label="Chargement..." />
    </div>

    <!-- Error -->
    <BaseAlert v-if="bank.error" variant="danger" dismissible @dismiss="bank.error = null" class="mb-6">
      {{ bank.error }}
    </BaseAlert>

    <!-- Total balance -->
    <div v-if="bank.summary" class="mb-6 p-4 rounded-card bg-primary/5 border border-primary/10">
      <p class="text-sm text-text-muted dark:text-text-dark-muted">Solde total</p>
      <p class="text-3xl font-bold text-text-main dark:text-text-dark-main">
        {{ formatCurrency(bank.summary.total_balance) }}
      </p>
    </div>

    <!-- Account list -->
    <div v-if="bank.summary?.accounts?.length" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <BaseCard
        v-for="account in bank.summary.accounts"
        :key="account.id"
        hoverable
      >
        <div class="flex items-start justify-between">
          <div>
            <h3 class="font-semibold text-text-main dark:text-text-dark-main">{{ account.name }}</h3>
            <div class="flex items-center gap-2 mt-1">
              <BaseBadge variant="secondary">{{ formatAccountType(account.account_type) }}</BaseBadge>
              <span v-if="account.institution_name" class="text-xs text-text-muted dark:text-text-dark-muted">{{ account.institution_name }}</span>
            </div>
          </div>
          <p class="text-xl font-bold text-text-main dark:text-text-dark-main">
            {{ formatCurrency(account.balance) }}
          </p>
        </div>
        <div class="mt-4 flex items-center justify-between">
          <p class="text-xs text-text-muted dark:text-text-dark-muted">Mis à jour {{ formatDate(account.updated_at) }}</p>
          <div class="flex gap-2">
            <BaseButton size="sm" variant="ghost" @click="openEdit(account)">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </BaseButton>
          </div>
        </div>
      </BaseCard>
    </div>

    <BaseEmptyState
      v-else-if="!bank.isLoading"
      title="Aucun compte"
      description="Ajoutez votre premier compte bancaire pour commencer le suivi"
      action-label="Ajouter un compte"
      @action="openCreate"
    />

    <!-- Create/Edit Modal -->
    <BaseModal :open="showCreateModal" :title="editingId ? 'Modifier le compte' : 'Nouveau compte'" @close="showCreateModal = false">
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <BaseInput v-model="form.name" label="Nom du compte" placeholder="Ex: Compte courant" required />
        <BaseSelect v-model="form.account_type" label="Type de compte" :options="accountTypeOptions" required />
        <BaseInput v-model="form.institution_name!" label="Banque" placeholder="Ex: BNP Paribas" />
        <BaseInput v-model="form.balance!" label="Solde" type="number" placeholder="0.00" />
      </form>
      <template #footer>
        <div class="flex justify-between w-full">
          <BaseButton v-if="editingId" variant="danger" @click="handleDelete(editingId)">
            Supprimer
          </BaseButton>
          <div v-else></div> <!-- Spacer -->
          <div class="flex gap-2">
            <BaseButton variant="ghost" @click="showCreateModal = false">Annuler</BaseButton>
            <BaseButton :loading="bank.isLoading" @click="handleSubmit">
              {{ editingId ? 'Enregistrer' : 'Créer' }}
            </BaseButton>
          </div>
        </div>
      </template>
    </BaseModal>
  </div>
</template>