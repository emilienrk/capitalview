// Authentication types
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

// Portfolio types
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

// Bank types
export interface BankAccountResponse {
  id: number
  name: string
  bank_name: string | null
  balance: number
  account_type: string
  updated_at: string
}

export interface BankSummaryResponse {
  total_balance: number
  accounts: BankAccountResponse[]
}

// Cashflow types
export interface CashflowResponse {
  id: number
  name: string
  flow_type: string
  category: string
  amount: number
  frequency: string
  transaction_date: string
  monthly_amount: number
}

export interface CashflowCategoryResponse {
  category: string
  total_amount: number
  monthly_total: number
  count: number
  items: CashflowResponse[]
}

export interface CashflowSummaryResponse {
  flow_type: string
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
