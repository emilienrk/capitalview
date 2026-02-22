// ─── Authentication ──────────────────────────────────────────

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

export interface User {
  username: string
  email: string
  is_active: boolean
  last_login: string | null
  created_at: string
}

export interface MessageResponse {
  message: string
}

// ─── Bank ────────────────────────────────────────────────────

export type BankAccountType =
  | 'CHECKING'
  | 'SAVINGS'
  | 'LIVRET_A'
  | 'LIVRET_DEVE'
  | 'LEP'
  | 'LDD'
  | 'PEL'
  | 'CEL'

export interface BankAccountCreate {
  name: string
  account_type: BankAccountType
  institution_name?: string
  identifier?: string
  balance?: number
}

export interface BankAccountUpdate {
  name?: string
  institution_name?: string
  identifier?: string
  balance?: number
}

export interface BankAccountResponse {
  id: string
  name: string
  institution_name: string | null
  balance: number
  account_type: BankAccountType
  identifier: string | null
  created_at: string
  updated_at: string
}

export interface BankSummaryResponse {
  total_balance: number
  accounts: BankAccountResponse[]
}

// ─── Cashflow ────────────────────────────────────────────────

export type FlowType = 'INFLOW' | 'OUTFLOW'
export type Frequency = 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'

export interface CashflowCreate {
  name: string
  flow_type: FlowType
  category: string
  amount: number
  frequency: Frequency
  transaction_date: string
}

export interface CashflowUpdate {
  name?: string
  flow_type?: FlowType
  category?: string
  amount?: number
  frequency?: Frequency
  transaction_date?: string
}

export interface CashflowResponse {
  id: string
  name: string
  flow_type: FlowType
  category: string
  amount: number
  frequency: Frequency
  transaction_date: string
  monthly_amount: number
  created_at: string
  updated_at: string
}

export interface CashflowCategoryResponse {
  category: string
  total_amount: number
  monthly_total: number
  count: number
  items: CashflowResponse[]
}

export interface CashflowSummaryResponse {
  flow_type: FlowType
  total_amount: number
  monthly_total: number
  categories: CashflowCategoryResponse[]
}

export interface CashflowBalanceResponse {
  total_inflows: number
  monthly_inflows: number
  total_outflows: number
  monthly_outflows: number
  net_balance: number
  monthly_balance: number
  savings_rate: number | null
  inflows: CashflowSummaryResponse
  outflows: CashflowSummaryResponse
}

// ─── Stocks ──────────────────────────────────────────────────

export type StockAccountType = 'PEA' | 'CTO' | 'PEA_PME'
export type StockTransactionType = 'BUY' | 'SELL' | 'DEPOSIT' | 'DIVIDEND'

export interface StockAccountCreate {
  name: string
  account_type: StockAccountType
  institution_name?: string
  identifier?: string
}

export interface StockAccountUpdate {
  name?: string
  institution_name?: string
  identifier?: string
}

export interface StockAccountBasicResponse {
  id: string
  name: string
  account_type: StockAccountType
  institution_name: string | null
  identifier: string | null
  created_at: string
  updated_at: string
}

export interface StockTransactionCreate {
  account_id: string
  symbol: string
  isin?: string
  name?: string
  exchange?: string
  type: StockTransactionType
  amount: number
  price_per_unit: number
  fees?: number
  executed_at: string
  notes?: string
}

export interface StockTransactionBasicResponse {
  id: string
  account_id: string
  symbol: string
  name: string | null
  exchange: string | null
  type: StockTransactionType
  amount: number
  price_per_unit: number
  fees: number
  executed_at: string
  notes: string | null
}

export interface StockTransactionUpdate {
  symbol?: string
  isin?: string
  name?: string
  exchange?: string
  type?: StockTransactionType
  amount?: number
  price_per_unit?: number
  fees?: number
  executed_at?: string
  notes?: string
}

export interface AssetSearchResult {
  symbol: string
  isin?: string | null
  name: string | null
  exchange: string | null
  type: string | null
  currency: string | null
}

export interface AssetInfoResponse {
  symbol: string
  isin?: string | null
  name: string | null
  price: number | null
  currency: string | null
  exchange: string | null
  type: string | null
  change_percent: number | null
}

export interface StockTransactionBulkCreate {
  isin: string
  type: StockTransactionType
  amount: number
  price_per_unit: number
  fees?: number
  executed_at: string
  notes?: string
}

export interface StockBulkImportRequest {
  account_id: string
  transactions: StockTransactionBulkCreate[]
}

export interface StockBulkImportResponse {
  imported_count: number
  transactions: StockTransactionBasicResponse[]
}

// ─── Crypto ──────────────────────────────────────────────────

export type CryptoTransactionType = 'BUY' | 'SELL' | 'SWAP' | 'STAKING'

export interface CryptoAccountCreate {
  name: string
  platform?: string
  public_address?: string
}

export interface CryptoAccountUpdate {
  name?: string
  platform?: string
  public_address?: string
}

export interface CryptoAccountBasicResponse {
  id: string
  name: string
  platform: string | null
  public_address: string | null
  created_at: string
  updated_at: string
}

export interface CryptoTransactionCreate {
  account_id: string
  symbol: string
  name?: string
  type: CryptoTransactionType
  amount: number
  price_per_unit: number
  fees?: number
  fees_symbol?: string
  executed_at: string
  notes?: string
  tx_hash?: string
}

export interface CryptoTransactionBasicResponse {
  id: string
  account_id: string
  symbol: string
  type: CryptoTransactionType
  amount: number
  price_per_unit: number
  fees: number
  fees_symbol: string | null
  executed_at: string
  notes: string | null
  tx_hash: string | null
}

export interface CryptoTransactionUpdate {
  symbol?: string
  name?: string
  type?: CryptoTransactionType
  amount?: number
  price_per_unit?: number
  fees?: number
  fees_symbol?: string
  executed_at?: string
  notes?: string
  tx_hash?: string
}

export interface CryptoTransactionBulkCreate {
  symbol: string
  type: CryptoTransactionType
  amount: number
  price_per_unit: number
  fees?: number
  fees_symbol?: string
  executed_at: string
  notes?: string
  tx_hash?: string
}

export interface CryptoBulkImportRequest {
  account_id: string
  transactions: CryptoTransactionBulkCreate[]
}

export interface CryptoBulkImportResponse {
  imported_count: number
  transactions: CryptoTransactionBasicResponse[]
}

// ─── Notes ───────────────────────────────────────────────────

export interface NoteCreate {
  name: string
  description?: string
}

export interface NoteUpdate {
  name?: string
  description?: string
}

export interface NoteResponse {
  id: string
  name: string
  description: string | null
  position: number
  created_at: string
  updated_at: string
}

// ─── Shared / Portfolio ──────────────────────────────────────

export interface TransactionResponse {
  id: string
  name: string | null
  symbol: string
  isin: string | null
  exchange: string | null
  type: string
  amount: number
  price_per_unit: number
  fees: number
  executed_at: string
  currency: string
  total_cost: number
  fees_percentage: number
  current_price: number | null
  current_value: number | null
  profit_loss: number | null
  profit_loss_percentage: number | null
}

export interface PositionResponse {
  symbol: string
  exchange: string | null
  name: string | null
  total_amount: number
  average_buy_price: number
  total_invested: number
  total_fees: number
  fees_percentage: number
  currency: string
  current_price: number | null
  current_value: number | null
  profit_loss: number | null
  profit_loss_percentage: number | null
}

export interface AccountSummaryResponse {
  account_id: string
  account_name: string
  account_type: string
  total_invested: number
  total_fees: number
  currency: string
  current_value: number | null
  profit_loss: number | null
  profit_loss_percentage: number | null
  positions: PositionResponse[]
}

export interface PortfolioResponse {
  total_invested: number
  total_fees: number
  current_value: number | null
  profit_loss: number | null
  profit_loss_percentage: number | null
  accounts: AccountSummaryResponse[]
}

// ── Settings ─────────────────────────────────────────────

export interface UserSettingsUpdate {
  objectives?: string | null
  theme?: string
  flat_tax_rate?: number
  tax_pea_rate?: number
  yield_expectation?: number
  inflation_rate?: number
}

export interface UserSettingsResponse {
  objectives: string | null
  theme: string
  flat_tax_rate: number
  tax_pea_rate: number
  yield_expectation: number
  inflation_rate: number
  created_at: string
  updated_at: string
}

// ─── Assets (Personal Possessions) ──────────────────────────

export interface AssetCreate {
  name: string
  description?: string | null
  category: string
  purchase_price?: number | null
  estimated_value?: number | null
  currency?: string
  acquisition_date?: string | null
}

export interface AssetUpdate {
  name?: string
  description?: string | null
  category?: string
  purchase_price?: number | null
  estimated_value?: number
  currency?: string
  acquisition_date?: string | null
}

export interface AssetSell {
  sold_price: number
  sold_at: string
}

export interface AssetResponse {
  id: string
  name: string
  description: string | null
  category: string
  purchase_price: number | null
  estimated_value: number
  currency: string
  acquisition_date: string | null
  profit_loss: number | null
  sold_price: number | null
  sold_at: string | null
  created_at: string
  updated_at: string
}

export interface AssetValuationCreate {
  estimated_value: number
  note?: string | null
  valued_at: string
}

export interface AssetValuationResponse {
  id: string
  asset_id: string
  estimated_value: number
  note: string | null
  valued_at: string
  created_at: string
}

export interface AssetCategorySummary {
  category: string
  count: number
  total_estimated_value: number
}

export interface AssetSummaryResponse {
  total_estimated_value: number
  total_purchase_price: number
  total_profit_loss: number | null
  asset_count: number
  categories: AssetCategorySummary[]
  assets: AssetResponse[]
}

// ─── Dashboard Statistics ────────────────────────────────────

export interface InvestmentDistribution {
  stock_invested: number
  stock_current_value: number | null
  stock_percentage: number | null
  crypto_invested: number
  crypto_current_value: number | null
  crypto_percentage: number | null
}

export interface WealthBreakdown {
  cash: number
  cash_percentage: number | null
  investments: number
  investments_percentage: number | null
  assets: number
  assets_percentage: number | null
  total_wealth: number
}

export interface DashboardStatisticsResponse {
  distribution: InvestmentDistribution
  wealth: WealthBreakdown
}
