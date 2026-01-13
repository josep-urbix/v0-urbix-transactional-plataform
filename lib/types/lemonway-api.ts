export interface LemonwayApiMethod {
  id: string
  name: string
  endpoint: string
  http_method: "GET" | "POST" | "PUT" | "DELETE"
  description: string
  category: "AUTH" | "ACCOUNTS" | "TRANSACTIONS" | "KYC" | "PAYMENTS"
  is_enabled: boolean
  request_schema: Record<string, any>
  response_schema: Record<string, any>
  example_request: Record<string, any>
  example_response: Record<string, any>
  created_at: string
  updated_at: string
}

export interface LemonwayApiCallHistory {
  id: string
  method_id: string
  method_name?: string
  user_id: string
  user_email?: string
  request_payload: Record<string, any>
  response_payload: Record<string, any>
  status_code: number
  duration_ms: number
  success: boolean
  error_message: string | null
  created_at: string
}

export interface LemonwayApiPreset {
  id: string
  method_id: string
  method_name?: string
  user_id: string
  name: string
  description: string | null
  parameters: Record<string, any>
  created_at: string
}

export interface LemonwayApiTestRequest {
  method_id: string
  parameters: Record<string, any>
}

export interface LemonwayApiTestResponse {
  success: boolean
  data?: any
  error?: string
  duration_ms: number
  status_code: number
  history_id: string
}

export interface LemonwayTransactionCard {
  number: string
  type: string
  brand: string
  country: string
}

export interface LemonwayTransactionPSP {
  name: string
  transactionId: string
}

export interface LemonwayTransactionIn {
  id: string
  debitWalletId: string
  creditWalletId: string
  debitAmount: number // en centavos
  creditAmount: number // en centavos
  transactionDate: number // Unix timestamp
  status: string
  type: string
  subtype: string
  message: string
  label: string
  currency: string
  card?: LemonwayTransactionCard
  PSP?: LemonwayTransactionPSP
}

export interface LemonwayTransactionsResponse {
  transactionIn: LemonwayTransactionIn[]
}

export interface LemonwayTransactionProcessed {
  lemonway_transaction_id: string
  cuenta_virtual_id: string
  tipo_operacion_id: string | null
  fecha: string
  concepto: string
  importe: number // ya convertido de centavos
  moneda: string
  saldo_previo: number | null
  saldo_posterior: number | null
  debit_wallet_id: string
  credit_wallet_id: string
  status: string
  type: string
  subtype: string
  raw_data: LemonwayTransactionIn
}
