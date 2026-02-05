<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue'
import { useBankStore } from '@/stores/bank'
import { useFormatters } from '@/composables/useFormatters'
import PageHeader from '@/components/PageHeader.vue'
import {
  BaseCard, BaseButton, BaseInput, BaseSelect, BaseModal,
  BaseSpinner, BaseAlert, BaseEmptyState, BaseBadge,
} from '@/components'
import type { BankAccountCreate, BankAccountType } from '@/types'

const bank = useBankStore()
const { formatCurrency, formatDate } = useFormatters()

const showCreateModal = ref(false)
const editingId = ref<number | null>(null)

const form = reactive<BankAccountCreate>({
  name: '',
  account_type: 'CHECKING' as BankAccountType,
  bank_name: '',
  balance: 0,
})

const accountTypeOptions = [
  { label: 'Compte courant', value: 'CHECKING' },
  { label: 'Épargne', value: 'SAVINGS' },
  { label: 'Livret A', value: 'LIVRET_A' },
  { label: 'LDDS', value: 'LIVRET_DEVE' },
  { label: 'LEP', value: 'LEP' },
  { label: 'LDD', value: 'LDD' },
  { label: 'PEL', value: 'PEL' },
  { label: 'CEL', value: 'CEL' },
]

function openCreate(): void {
  editingId.value = null
  form.name = ''
  form.account_type = 'CHECKING'
  form.bank_name = ''
  form.balance = 0
  showCreateModal.value = true
}

function openEdit(account: { id: number; name: string; account_type: BankAccountType; bank_name: string | null; balance: number }): void {
  editingId.value = account.id
  form.name = account.name
  form.account_type = account.account_type
  form.bank_name = account.bank_name ?? ''
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

async function handleDelete(id: number): Promise<void> {
  if (confirm('Supprimer ce compte ?')) {
    await bank.deleteAccount(id)
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
              <BaseBadge variant="secondary">{{ account.account_type }}</BaseBadge>
              <span v-if="account.bank_name" class="text-xs text-text-muted dark:text-text-dark-muted">{{ account.bank_name }}</span>
            </div>
          </div>
          <p class="text-xl font-bold text-text-main dark:text-text-dark-main">
            {{ formatCurrency(account.balance) }}
          </p>
        </div>
        <div class="mt-4 flex items-center justify-between">
          <p class="text-xs text-text-muted dark:text-text-dark-muted">Mis à jour {{ formatDate(account.updated_at) }}</p>
          <div class="flex gap-2">
            <BaseButton size="sm" variant="ghost" @click="openEdit(account)">Modifier</BaseButton>
            <BaseButton size="sm" variant="ghost" @click="handleDelete(account.id)">
              <span class="text-danger">Supprimer</span>
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
        <BaseInput v-model="form.bank_name!" label="Banque" placeholder="Ex: BNP Paribas" />
        <BaseInput v-model="form.balance!" label="Solde" type="number" placeholder="0.00" />
      </form>
      <template #footer>
        <BaseButton variant="ghost" @click="showCreateModal = false">Annuler</BaseButton>
        <BaseButton :loading="bank.isLoading" @click="handleSubmit">
          {{ editingId ? 'Enregistrer' : 'Créer' }}
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>
