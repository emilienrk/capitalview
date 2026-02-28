<script setup lang="ts">
import { ref, computed } from 'vue'
import BaseModal from './BaseModal.vue'
import BaseButton from './BaseButton.vue'
import BaseAlert from './BaseAlert.vue'

interface Props {
  open: boolean
  title?: string
  accountId: string
  assetType: 'stocks' | 'crypto'
  onImport: (transactions: any[]) => Promise<boolean>
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Importer des transactions',
})

const emit = defineEmits<{
  close: []
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const fileName = ref<string | null>(null)
const parsedTransactions = ref<any[]>([])
const error = ref<string | null>(null)
const isLoading = ref(false)

const hasFile = computed(() => parsedTransactions.value.length > 0)

const csvTemplate = computed(() => {
  if (props.assetType === 'stocks') {
    return 'isin,type,amount,price_per_unit,fees,executed_at,notes'
  }
  // Composite format: one line = one full operation (decomposed server-side)
  return 'symbol,type,amount,eur_amount,quote_symbol,quote_amount,fee_symbol,fee_amount,fee_included,executed_at,tx_hash,notes'
})

const csvExample = computed(() => {
  if (props.assetType === 'stocks') {
    return 'US0378331005,BUY,10,150.50,2.99,2026-01-15T10:30:00,Premier achat\nUS88160R1014,SELL,5,250.00,1.50,2026-01-20T14:00:00,'
  }
  return (
    'BTC,BUY,0.1,3000,EUR,3000,,,,2026-01-15T10:30:00,,Premier achat\n' +
    'BTC,BUY,0.1,2760,USDC,3000,BNB,0.01,,2026-01-20T14:00:00,0xabc,Swap avec frais\n' +
    'ETH,REWARD,2.5,0,,,,,,2026-01-25T09:00:00,,Staking\n' +
    'BTC,CRYPTO_DEPOSIT,0.5,15000,,,,,,2026-01-28T12:00:00,0xdef,Transfert entrant'
  )
})

function onFileSelect(event: Event): void {
  error.value = null
  parsedTransactions.value = []

  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  if (!file.name.endsWith('.csv')) {
    error.value = 'Veuillez sélectionner un fichier CSV valide'
    return
  }

  fileName.value = file.name
  const reader = new FileReader()

  reader.onload = (e) => {
    try {
      const text = e.target?.result as string
      parseCSV(text)
    } catch (err) {
      error.value = 'Erreur lors de la lecture du fichier'
      console.error(err)
    }
  }

  reader.onerror = () => {
    error.value = 'Erreur lors de la lecture du fichier'
  }

  reader.readAsText(file)
}

function parseCSV(text: string): void {
  const firstLine = text.split('\n')[0]
  let delimiter = ','
  if (firstLine?.includes(';')) {
    delimiter = ';'
  } else if (firstLine?.includes('\t')) {
    delimiter = '\t'
  }
  
  // Normalize French decimal commas to dots (always safe — regex only matches digit,digit)
  const normalizedText = text.replace(/(\d),(\d)/g, '$1.$2')
  
  // Normalize DD/MM/YYYY dates to ISO
  const lines = normalizedText.trim().split('\n').map((line, index) => {
    if (index === 0) return line // Skip header
    return line.replace(/(\d{2})\/(\d{2})\/(\d{4})/g, '$3-$2-$1T00:00:00')
  })

  if (lines.length < 2) {
    error.value = 'Le fichier CSV est vide ou invalide'
    return
  }

  const headers = lines[0]?.split(delimiter).map((h) => h.trim()) || []
  const transactions: any[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line || !line.trim()) continue
    
    const values = line.split(delimiter).map((v) => v.trim())

    // Pad missing optional trailing columns
    while (values.length < headers.length) {
      values.push('')
    }

    if (values.length > headers.length) {
      error.value = `Ligne ${i + 1} : trop de colonnes (${values.length} au lieu de ${headers.length}). Vérifiez qu'il n'y a pas de virgules dans vos données textuelles.`
      console.error(`Ligne ${i + 1}:`, { headers, values, line })
      return
    }

    const transaction: any = {}

    headers.forEach((header, index) => {
      const value = values[index]

      // Numeric fields
      const numericFields = props.assetType === 'stocks'
        ? ['amount', 'price_per_unit', 'fees']
        : ['amount', 'eur_amount', 'quote_amount', 'fee_amount']

      if (numericFields.includes(header)) {
        const numValue = value ? parseFloat(value) : 0
        if (value && isNaN(numValue)) {
          error.value = `Ligne ${i + 1} : valeur numérique invalide pour "${header}" : "${value}"`
          return
        }
        transaction[header] = numValue
      } else if (header === 'fee_included') {
        transaction[header] = value === '' || value === undefined || value.toLowerCase() !== 'false'
      } else {
        transaction[header] = value || ''
      }
    })

    try {
      validateTransaction(transaction)
      transactions.push(transaction)
    } catch (err) {
      error.value = `Ligne ${i + 1} : ${err instanceof Error ? err.message : 'Données invalides'}`
      console.error(`Ligne ${i + 1} validation error:`, transaction, err)
      return
    }
  }

  parsedTransactions.value = transactions
}

function validateTransaction(transaction: any): void {
  if (transaction.symbol) transaction.symbol = String(transaction.symbol).trim().toUpperCase()
  if (transaction.isin) transaction.isin = String(transaction.isin).trim()
  if (transaction.type) transaction.type = String(transaction.type).trim().toUpperCase()
  if (transaction.quote_symbol) transaction.quote_symbol = String(transaction.quote_symbol).trim().toUpperCase()
  if (transaction.fee_symbol) transaction.fee_symbol = String(transaction.fee_symbol).trim().toUpperCase()

  const requiredFields = props.assetType === 'stocks'
    ? ['isin', 'type', 'amount', 'price_per_unit', 'executed_at']
    : ['symbol', 'type', 'amount', 'executed_at']

  for (const field of requiredFields) {
    if (!transaction[field] || transaction[field] === '') {
      throw new Error(`Champ "${field}" manquant ou vide`)
    }
  }

  if (props.assetType === 'stocks') {
    if (transaction.isin.length !== 12) {
      throw new Error('Format ISIN invalide (doit faire 12 caractères)')
    }

    const validTypes = ['BUY', 'SELL', 'DEPOSIT', 'DIVIDEND']
    if (!validTypes.includes(transaction.type)) {
      throw new Error(`Type "${transaction.type}" invalide (valeurs: ${validTypes.join(', ')})`)
    }

    if (isNaN(transaction.price_per_unit) || transaction.price_per_unit < 0) {
      throw new Error('Prix invalide (doit être >= 0)')
    }

    if (transaction.fees !== undefined && (isNaN(transaction.fees) || transaction.fees < 0)) {
      throw new Error('Frais invalides')
    }
  } else {
    const validTypes = [
      'BUY', 'REWARD', 'FIAT_DEPOSIT', 'FIAT_WITHDRAW',
      'CRYPTO_DEPOSIT', 'TRANSFER', 'EXIT', 'GAS_FEE', 'NON_TAXABLE_EXIT',
    ]
    if (!validTypes.includes(transaction.type)) {
      throw new Error(`Type "${transaction.type}" invalide (valeurs: ${validTypes.join(', ')})`)
    }

    // BUY and CRYPTO_DEPOSIT need eur_amount
    if (['BUY', 'CRYPTO_DEPOSIT', 'EXIT'].includes(transaction.type)) {
      const eur = Number(transaction.eur_amount)
      if (isNaN(eur) || eur < 0) {
        throw new Error(`"eur_amount" invalide pour le type ${transaction.type}`)
      }
    }

    // quote_amount required if quote_symbol is set
    if (transaction.quote_symbol && (!transaction.quote_amount || Number(transaction.quote_amount) <= 0)) {
      throw new Error('"quote_amount" requis quand "quote_symbol" est renseigné')
    }

    // fee_amount required if fee_symbol is set
    if (transaction.fee_symbol && (!transaction.fee_amount || Number(transaction.fee_amount) <= 0)) {
      throw new Error('"fee_amount" requis quand "fee_symbol" est renseigné')
    }
  }

  if (isNaN(transaction.amount) || transaction.amount <= 0) {
    throw new Error('Quantité invalide (doit être > 0)')
  }

  if (!isValidDate(transaction.executed_at)) {
    throw new Error('Date invalide (format accepté: YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss ou DD/MM/YYYY)')
  }
}

function isValidDate(dateString: string): boolean {
  const ddmmyyyyPattern = /^(\d{2})\/(\d{2})\/(\d{4})$/
  const match = dateString.match(ddmmyyyyPattern)
  
  if (match) {
    const [, day, month, year] = match
    const isoDate = `${year}-${month}-${day}T00:00:00`
    const date = new Date(isoDate)
    return date instanceof Date && !isNaN(date.getTime())
  }
  
  const date = new Date(dateString)
  return date instanceof Date && !isNaN(date.getTime())
}

function triggerFileInput(): void {
  fileInput.value?.click()
}

function resetFile(): void {
  fileName.value = null
  parsedTransactions.value = []
  error.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

async function handleImport(): Promise<void> {
  if (parsedTransactions.value.length === 0) return
  isLoading.value = true
  error.value = null
  try {
    const success = await props.onImport(parsedTransactions.value)
    if (success) {
      resetFile()
      emit('close')
    } else {
      error.value = "L'import a échoué. Vérifiez vos données et réessayez."
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Erreur inattendue lors de l'import"
  } finally {
    isLoading.value = false
  }
}

function handleClose(): void {
  resetFile()
  emit('close')
}

function downloadTemplate(): void {
  const template = csvTemplate.value + '\n' + csvExample.value
  const blob = new Blob([template], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `template_import_${props.assetType}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <BaseModal :open="props.open" title="Importer des transactions (CSV)" size="lg" @close="handleClose">
    <div class="space-y-6">
      <!-- Instructions -->
      <div class="bg-background-subtle dark:bg-background-dark-subtle p-4 rounded-secondary">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-semibold text-text-main dark:text-text-dark-main">
            Format CSV
          </h3>
          <button
            @click="downloadTemplate"
            class="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-hover transition-colors"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Modèle
          </button>
        </div>
        <code
          class="block text-xs bg-background dark:bg-surface-dark p-2 rounded border border-surface-border dark:border-surface-dark-border overflow-x-auto"
        >
          {{ csvTemplate }}
        </code>
        <p class="mt-2 text-xs text-text-muted dark:text-text-dark-muted">
          Séparateurs et décimales détectés automatiquement.
        </p>
      </div>

      <!-- Error Alert -->
      <BaseAlert v-if="error" variant="danger" dismissible @dismiss="error = null">
        {{ error }}
      </BaseAlert>

      <!-- File Upload -->
      <div>
        <input
          ref="fileInput"
          type="file"
          accept=".csv"
          class="hidden"
          @change="onFileSelect"
        />

        <div v-if="!fileName" class="border-2 border-dashed border-surface-border dark:border-surface-dark-border rounded-card p-8 text-center">
          <svg
            class="w-12 h-12 mx-auto mb-4 text-text-muted dark:text-text-dark-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p class="text-sm text-text-body dark:text-text-dark-body mb-3">
            Glissez un fichier CSV ici ou
          </p>
          <BaseButton variant="outline" @click="triggerFileInput">
            Parcourir
          </BaseButton>
        </div>

        <div v-else class="space-y-3">
          <div class="flex items-center justify-between p-4 bg-background-subtle dark:bg-surface-dark-hover rounded-secondary">
            <div class="flex items-center gap-3">
              <svg class="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <div>
                <p class="font-medium text-text-main dark:text-text-dark-main">
                  {{ fileName }}
                </p>
                <p v-if="parsedTransactions.length > 0" class="text-sm text-success flex items-center gap-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  {{ parsedTransactions.length }} transaction(s) détectée(s)
                </p>
              </div>
            </div>
            <button
              @click="resetFile"
              class="p-2 rounded-secondary text-text-muted dark:text-text-dark-muted hover:bg-surface-active dark:hover:bg-surface-dark-hover transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <BaseButton variant="ghost" @click="handleClose">
          Annuler
        </BaseButton>
        <BaseButton
          :disabled="!hasFile || isLoading"
          :loading="isLoading"
          @click="handleImport"
        >
          Importer {{ parsedTransactions.length }} transaction(s)
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>
