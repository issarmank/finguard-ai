// Auto-generated from FastAPI OpenAPI schema.
// Run: npx openapi-typescript http://localhost:8000/openapi.json -o src/types/api.ts

export interface RegisterRequest {
  tenant_name: string;
  tenant_slug: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserResponse {
  id: string;
  email: string;
  role: string;
  tenant_id: string;
  created_at: string;
}

export interface TenantResponse {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
}

export interface AccountCreate {
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "income" | "expense";
  normal_side: "debit" | "credit";
}

export interface AccountResponse {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "income" | "expense";
  normal_side: "debit" | "credit";
  is_active: boolean;
}

export interface AccountBalanceResponse {
  account_id: string;
  account_name: string;
  account_code: string;
  normal_side: "debit" | "credit";
  debit_total: string;
  credit_total: string;
  balance: string;
}

export interface LedgerLineIn {
  account_id: string;
  side: "debit" | "credit";
  amount: string;
  memo?: string | null;
}

export interface JournalEntryCreate {
  entry_date: string;
  description: string;
  reference?: string | null;
  lines: LedgerLineIn[];
}

export interface LedgerLineResponse {
  id: string;
  account_id: string;
  side: "debit" | "credit";
  amount: string;
  memo: string | null;
}

export interface JournalEntryResponse {
  id: string;
  tenant_id: string;
  entry_date: string;
  description: string;
  reference: string | null;
  status: "draft" | "posted" | "voided";
  is_locked: boolean;
  created_by: string | null;
  created_at: string;
  lines: LedgerLineResponse[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface TextToSQLRequest {
  query: string;
}

export interface TextToSQLResponse {
  query: string;
  sql: string;
  results: Record<string, unknown>[];
  row_count: number;
}

export interface FraudScanRequest {
  days_back: number;
}

export interface FraudFlag {
  flag_type: string;
  description: string;
}

export interface FraudScanResponse {
  risk_score: number;
  risk_level: "low" | "medium" | "high" | "critical";
  flags: FraudFlag[];
  explanation: string;
  recommended_action: string;
  entries_analyzed: number;
}

export interface AuditReportRequest {
  date_from: string;
  date_to: string;
  include_voided: boolean;
}

export interface AuditReportResponse {
  date_from: string;
  date_to: string;
  report_markdown: string;
  summary: Record<string, unknown>;
  generated_at: string;
}
