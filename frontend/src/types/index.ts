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
  id: number
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
  id: number
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
  id: number
  name: string
  account_type: StockAccountType
  institution_name: string | null
  identifier: string | null
  created_at: string
  updated_at: string
}

export interface StockTransactionCreate {
  account_id: number
  ticker: string
  exchange?: string
  type: StockTransactionType
  amount: number
  price_per_unit: number
  fees?: number
  executed_at: string
  notes?: string
}

export interface StockTransactionBasicResponse {
  id: number
  account_id: number
  ticker: string
  exchange: string | null
  type: StockTransactionType
  amount: number
  price_per_unit: number
  fees: number
  executed_at: string
  notes: string | null
}

export interface StockTransactionUpdate {
  ticker?: string
  exchange?: string
  type?: StockTransactionType
  amount?: number
  price_per_unit?: number
  fees?: number
  executed_at?: string
  notes?: string
}

// ─── Crypto ──────────────────────────────────────────────────

export type CryptoTransactionType = 'BUY' | 'SELL' | 'SWAP'

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
  id: number
  name: string
  platform: string | null
  public_address: string | null
  created_at: string
  updated_at: string
}

export interface CryptoTransactionCreate {
  account_id: number
  ticker: string
  type: CryptoTransactionType
  amount: number
  price_per_unit: number
  fees?: number
  fees_ticker?: string
  executed_at: string
  notes?: string
  tx_hash?: string
}

export interface CryptoTransactionBasicResponse {
  id: number
  account_id: number
  ticker: string
  type: CryptoTransactionType
  amount: number
  price_per_unit: number
  fees: number
  fees_ticker: string | null
  executed_at: string
  notes: string | null
  tx_hash: string | null
}

export interface CryptoTransactionUpdate {
  ticker?: string
  type?: CryptoTransactionType
  amount?: number
  price_per_unit?: number
  fees?: number
  fees_ticker?: string
  executed_at?: string
  notes?: string
  tx_hash?: string
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
  id: number
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

// ─── Shared / Portfolio ──────────────────────────────────────

export interface TransactionResponse {
  id: number
  ticker: string
  type: string
  amount: number
  price_per_unit: number
  fees: number
  executed_at: string
  total_cost: number
  fees_percentage: number
  current_price: number | null
  current_value: number | null
  profit_loss: number | null
  profit_loss_percentage: number | null
}

export interface PositionResponse {
  ticker: string
  name: string | null
  total_amount: number
  average_buy_price: number
  total_invested: number
  total_fees: number
  fees_percentage: number
  current_price: number | null
  current_value: number | null
  profit_loss: number | null
  profit_loss_percentage: number | null
}

export interface AccountSummaryResponse {
  account_id: number
  account_name: string
  account_type: string
  total_invested: number
  total_fees: number
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