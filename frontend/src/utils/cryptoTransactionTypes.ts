import type { CryptoCompositeTransactionType } from '@/types'

export type CryptoUiTransactionType =
  | 'BUY_FIAT'
  | 'BUY_SPOT'
  | 'REWARD'
  | 'FIAT_DEPOSIT'
  | 'FIAT_WITHDRAW'
  | 'SELL_TO_FIAT'
  | 'CRYPTO_DEPOSIT'
  | 'FEE'
  | 'NON_TAXABLE_EXIT'
  | 'TRANSFER_TO_ACCOUNT'

export const CRYPTO_COMPOSITE_ALLOWED_IMPORT_TYPES: ReadonlyArray<string> = [
  'BUY',
  'REWARD',
  'FIAT_DEPOSIT',
  'CRYPTO_DEPOSIT',
  'TRANSFER',
  'FIAT_WITHDRAW',
  'SELL_TO_FIAT',
  'FEE',
  'NON_TAXABLE_EXIT',
]

export function normalizeCompositeImportType(rawType: string): CryptoCompositeTransactionType | null {
  const normalized = String(rawType || '').trim().toUpperCase()
  if (!normalized) return null

  if (
    normalized === 'BUY' ||
    normalized === 'REWARD' ||
    normalized === 'FIAT_DEPOSIT' ||
    normalized === 'CRYPTO_DEPOSIT' ||
    normalized === 'TRANSFER' ||
    normalized === 'FIAT_WITHDRAW' ||
    normalized === 'SELL_TO_FIAT' ||
    normalized === 'FEE' ||
    normalized === 'NON_TAXABLE_EXIT'
  ) {
    return normalized
  }

  return null
}

export function toCompositeApiType(
  type: CryptoUiTransactionType | CryptoCompositeTransactionType,
): CryptoCompositeTransactionType {
  if (type === 'BUY_FIAT' || type === 'BUY_SPOT') return 'BUY'
  const normalized = normalizeCompositeImportType(type)
  if (normalized) return normalized
  throw new Error(`Type composite invalide pour l'API: ${type}`)
}
