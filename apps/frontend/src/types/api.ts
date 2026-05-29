// FinGuard AI — Personal Finance API Types

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserResponse {
  id: string;
  email: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// Plaid
export interface PlaidItemOut {
  id: string;
  institution: string;
  created_at: string;
  last_synced: string | null;
}

// Accounts
export interface AccountOut {
  id: string;
  name: string;
  type: "checking" | "savings" | "credit" | "investment" | "loan" | "cash";
  balance: number;
  currency: string;
  is_manual: boolean;
  is_active: boolean;
  last_synced: string | null;
}

// Categories
export interface CategoryOut {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  type: "income" | "expense" | "transfer";
}

// Transactions
export interface TransactionOut {
  id: string;
  account_id: string;
  category_id: string | null;
  amount: number;
  date: string;
  description: string;
  merchant: string | null;
  pending: boolean;
  notes: string | null;
  created_at: string;
}

// Budgets
export interface BudgetOut {
  budget_id: string;
  category_id: string;
  category_name: string;
  category_icon: string | null;
  category_color: string | null;
  budget_amount: number;
  spent: number;
  remaining: number;
  pct: number;
  month: string;
}

// Goals
export interface GoalOut {
  id: string;
  name: string;
  emoji: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  account_id: string | null;
  pct: number;
  days_left: number | null;
  created_at: string;
}

// Net Worth
export interface NetWorthCurrent {
  assets: number;
  liabilities: number;
  net_worth: number;
  accounts: Array<{
    id: string;
    name: string;
    type: string;
    balance: number;
    is_asset: boolean;
  }>;
}

export interface NetWorthHistory {
  date: string;
  assets: number;
  liabilities: number;
  net_worth: number;
}

// AI
export interface TextToSQLResponse {
  query: string;
  sql: string;
  results: Record<string, unknown>[];
  row_count: number;
}

export interface InsightFlag {
  flag_type: string;
  description: string;
}

export interface InsightsResponse {
  risk_score: number;
  risk_level: "low" | "medium" | "high";
  flags: InsightFlag[];
  summary: string;
  tips: string[];
  transactions_analyzed: number;
}

export interface MonthlyReportResponse {
  month: string;
  report_markdown: string;
  summary: Record<string, unknown>;
  generated_at: string;
}

// Spending summary
export interface SpendingSummaryItem {
  category_id: string;
  name: string;
  icon: string | null;
  color: string | null;
  type: string;
  total: number;
  count: number;
}
