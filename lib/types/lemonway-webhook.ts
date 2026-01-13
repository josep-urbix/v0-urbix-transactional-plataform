// Types for Lemonway Webhook module

export type ProcessingStatus = "RECEIVED" | "PROCESSING" | "PROCESSED" | "FAILED"

export type EventType =
  | "BLOCKED_ACCOUNT_STATUS_CHANGE"
  | "WALLET_STATUS_CHANGE"
  | "MONEY_IN_WIRE"
  | "MONEY_IN_SDD"
  | "MONEY_IN_CHEQUE"
  | "MONEY_IN_CARD_SUBSCRIPTION"
  | "MONEY_IN_SOFORT"
  | "MONEY_IN_CHARGEBACK"
  | "MONEY_IN_CHEQUE_CANCELED"
  | "MONEY_IN_SDD_CANCELED"
  | "MONEY_OUT_STATUS"
  | "MONEY_OUT_CANCELLED"
  | "DOCUMENT_STATUS_CHANGE"
  | "CHARGEBACK"
  | "UNKNOWN"

export interface WebhookDelivery {
  id: string
  notif_category: number
  event_type: EventType
  wallet_ext_id: string | null
  wallet_int_id: string | null
  transaction_id: string | null
  amount: number | null
  status_code: number | null
  raw_headers: Record<string, string>
  raw_payload: Record<string, unknown>
  processing_status: ProcessingStatus
  received_at: string
  processed_at: string | null
  error_message: string | null
  retry_count: number
  created_at: string
  updated_at: string
}

// Lemonway webhook payload types based on documentation
export interface LemonwayWebhookPayload {
  ExtId?: string
  IntId?: string
  NotifDate?: string
  NotifCategory?: number
  Status?: number
  Blocked?: number
  ReasonId?: number
  Blocking?: number
  BlockingReason?: string
  IdTransaction?: string
  Amount?: number
  SubscriptionId?: string
  ScheduledNumber?: string
  PspTransactionId?: string
  MerchantToken?: string
  Comment?: string
  DocId?: string
  DocType?: number
  PaymentMethod?: number
  IdOriginTransaction?: string
  [key: string]: unknown
}

// NotifCategory to EventType mapping
export const NOTIF_CATEGORY_MAP: Record<number, EventType> = {
  8: "WALLET_STATUS_CHANGE",
  9: "DOCUMENT_STATUS_CHANGE",
  10: "MONEY_IN_WIRE",
  11: "MONEY_IN_SDD",
  12: "MONEY_IN_CHEQUE",
  13: "BLOCKED_ACCOUNT_STATUS_CHANGE",
  14: "CHARGEBACK",
  15: "MONEY_OUT_CANCELLED",
  17: "MONEY_IN_SDD_CANCELED",
  22: "MONEY_IN_CARD_SUBSCRIPTION",
  45: "MONEY_IN_CHEQUE_CANCELED",
  48: "MONEY_IN_SOFORT",
}

// Payment method codes
export const PAYMENT_METHOD_CODES: Record<number, string> = {
  0: "Card",
  1: "Wire",
  3: "BankTransfer",
  4: "Internal",
  14: "DirectDebit",
  15: "Cheque",
  18: "PFSCard",
  19: "Multibanco",
  30: "BNPL",
  35: "PayPal",
}

export interface WebhookStats {
  total_webhooks: number
  pending_count: number
  processing_count: number
  processed_count: number
  failed_count: number
  last_24h_count: number
  failed_24h_count: number
}
