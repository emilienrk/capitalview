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
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Importer des transactions',
})

const emit = defineEmits<{
  close: []
  import: [transactions: any[]]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const fileName = ref<string | null>(null)
const parsedTransactions = ref<any[]>([])
const error = ref<string | null>(null)
const isLoading = ref(false)

const hasFile = computed(() => parsedTransactions.value.length > 0)

const csvTemplate = computed(() => {
  if (props.assetType === 'stocks') {
    return 'symbol,isin,exchange,type,amount,price_per_unit,fees,executed_at,notes'
  }
  return 'symbol,type,amount,price_per_unit,fees,fees_symbol,executed_at,tx_hash,notes'
})

const csvExample = computed(() => {
  if (props.assetType === 'stocks') {
    return 'AAPL,US0378331005,NASDAQ,BUY,10,150.50,2.99,2026-01-15T10:30:00,Premier achat\nTSLA,US88160R1014,NASDAQ,SELL,5,250.00,1.50,2026-01-20T14:00:00,'
  }
  return 'BTC,BUY,0.5,45000.00,15.00,USDT,2026-01-15T10:30:00,0x123abc...,\nETH,SELL,2,3000.00,8.00,USDT,2026-01-20T14:00:00,0x456def...,'
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
  // Detect delimiter: semicolon (European CSV), comma, or tab
  const firstLine = text.split('\n')[0]
  let delimiter = ','
  if (firstLine?.includes(';')) {
    delimiter = ';'
  } else if (firstLine?.includes('\t')) {
    delimiter = '\t'
  }
  
  console.log('Detected delimiter:', delimiter === ';' ? 'SEMICOLON' : delimiter === '\t' ? 'TAB' : 'COMMA')
  
  // Normalize French decimal format (comma) to international (dot)
  // But only for numbers, not for CSV separators
  let normalizedText = text
  if (delimiter !== ',') {
    // For semicolon or tab delimiters, we can safely replace all commas in numbers
    normalizedText = text.replace(/(\d),(\d)/g, '$1.$2')
  } else {
    // For comma delimiter, only replace decimal commas (tricky)
    normalizedText = text.replace(/(\d),(\d)/g, '$1.$2')
  }
  
  // Also normalize dates from DD/MM/YYYY to YYYY-MM-DD
  const lines = normalizedText.trim().split('\n').map((line, index) => {
    if (index === 0) return line // Skip header
    return line.replace(/(\d{2})\/(\d{2})\/(\d{4})/g, '$3-$2-$1T00:00:00')
  })

  if (lines.length < 2) {
    error.value = 'Le fichier CSV est vide ou invalide'
    return
  }

  const headers = lines[0]?.split(delimiter).map((h) => h.trim()) || []
  console.log('Headers detected:', headers)
  const transactions: any[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line || !line.trim()) continue
    
    const values = line.split(delimiter).map((v) => v.trim())
    console.log(`Ligne ${i + 1} raw values:`, values)

    // Allow missing values for optional trailing columns (pad with empty strings)
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

      // Type conversion
      if (['amount', 'price_per_unit', 'fees'].includes(header)) {
        const numValue = value ? parseFloat(value) : 0
        if (value && isNaN(numValue)) {
          error.value = `Ligne ${i + 1} : valeur numérique invalide pour "${header}" : "${value}"`
          return
        }
        transaction[header] = numValue
      } else {
        transaction[header] = value || ''
      }
    })

    // Debug log
    console.log(`Ligne ${i + 1} parsed:`, { transaction, requiredFields: ['symbol', 'type', 'amount', 'price_per_unit', 'executed_at'] })

    // Validation
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
  // Trim string fields
  if (transaction.symbol) transaction.symbol = String(transaction.symbol).trim()
  if (transaction.isin) transaction.isin = String(transaction.isin).trim()
  if (transaction.type) transaction.type = String(transaction.type).trim()

  const requiredFields = props.assetType === 'stocks'
    ? ['type', 'amount', 'price_per_unit', 'executed_at'] // Symbol checked separately
    : ['symbol', 'type', 'amount', 'price_per_unit', 'executed_at']

  for (const field of requiredFields) {
    if (!transaction[field] || transaction[field] === '') {
      throw new Error(`Champ "${field}" manquant ou vide`)
    }
  }

  // Special handling for Stocks: require Symbol OR ISIN
  if (props.assetType === 'stocks') {
    if ((!transaction.symbol || transaction.symbol === '') && (!transaction.isin || transaction.isin === '')) {
      throw new Error('Vous devez renseigner le Symbole OU l\'ISIN')
    }
    // If symbol is missing but ISIN is present, use ISIN as symbol (backend will try to resolve it)
    if ((!transaction.symbol || transaction.symbol === '') && transaction.isin) {
      transaction.symbol = transaction.isin
    }

    if (transaction.isin && transaction.isin.length !== 12) {
       throw new Error('Format ISIN invalide (doit faire 12 caractères)')
    }
  } else {
    // Crypto: Symbol always required
    if (!transaction.symbol || transaction.symbol === '') {
      throw new Error('Champ "symbol" manquant ou vide')
    }
  }

  // Validate type
  const validTypes = props.assetType === 'stocks'
    ? ['BUY', 'SELL', 'DEPOSIT', 'DIVIDEND']
    : ['BUY', 'SELL', 'SWAP', 'STAKING']

  if (!validTypes.includes(transaction.type)) {
    throw new Error(`Type "${transaction.type}" invalide (valeurs: ${validTypes.join(', ')})`)
  }

  // Validate numbers
  if (isNaN(transaction.amount) || transaction.amount <= 0) {
    throw new Error('Quantité invalide (doit être > 0)')
  }

  if (isNaN(transaction.price_per_unit) || transaction.price_per_unit < 0) {
    throw new Error('Prix invalide (doit être >= 0)')
  }

  if (transaction.fees !== undefined && (isNaN(transaction.fees) || transaction.fees < 0)) {
    throw new Error('Frais invalides')
  }

  // Validate date
  if (!isValidDate(transaction.executed_at)) {
    throw new Error('Date invalide (format accepté: YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss ou DD/MM/YYYY)')
  }
}

function isValidDate(dateString: string): boolean {
  // Try to parse DD/MM/YYYY format
  const ddmmyyyyPattern = /^(\d{2})\/(\d{2})\/(\d{4})$/
  const match = dateString.match(ddmmyyyyPattern)
  
  if (match) {
    const [, day, month, year] = match
    // Convert to ISO format: YYYY-MM-DDTHH:mm:ss
    const isoDate = `${year}-${month}-${day}T00:00:00`
    const date = new Date(isoDate)
    return date instanceof Date && !isNaN(date.getTime())
  }
  
  // Try standard ISO format
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

function handleImport(): void {
  if (parsedTransactions.value.length === 0) return
  emit('import', parsedTransactions.value)
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
          :disabled="!hasFile"
          @click="handleImport"
        >
          Importer {{ parsedTransactions.length }} transaction(s)
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>
