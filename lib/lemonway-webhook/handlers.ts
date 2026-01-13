import { sql } from "@/lib/db"
import type { LemonwayWebhookPayload, WebhookDelivery } from "@/lib/types/lemonway-webhook"

export interface HandlerResult {
  success: boolean
  message: string
  data?: Record<string, unknown>
}

type WebhookHandler = (payload: LemonwayWebhookPayload, delivery: WebhookDelivery) => Promise<HandlerResult>

// Handler: Blocked Account Status Change (NotifCategory 13)
export async function handleBlockedAccountStatusChange(
  payload: LemonwayWebhookPayload,
  delivery: WebhookDelivery,
): Promise<HandlerResult> {
  const { ExtId, IntId, Blocked, ReasonId, Blocking, BlockingReason, NotifDate } = payload

  // Update wallet status in our payment_accounts table if exists
  if (ExtId) {
    try {
      await sql`
        UPDATE integrations."PaymentAccount"
        SET 
          status = CASE WHEN ${Blocked} = 1 THEN 'BLOCKED' ELSE 'ACTIVE' END,
          updated_at = NOW()
        WHERE external_id = ${ExtId}
      `
    } catch (error) {
      console.log("[WebhookHandler] PaymentAccount not found for ExtId:", ExtId)
    }
  }

  return {
    success: true,
    message: `Account ${ExtId || IntId} ${Blocked === 1 ? "blocked" : "unblocked"}`,
    data: {
      wallet_ext_id: ExtId,
      wallet_int_id: IntId,
      blocked: Blocked === 1,
      reason_id: ReasonId,
      blocking: Blocking === 1,
      blocking_reasons: BlockingReason ? BlockingReason.split(",").map((r) => Number.parseInt(r.trim())) : [],
      notif_date: NotifDate,
    },
  }
}

// Handler: Wallet Status Change (NotifCategory 8)
export async function handleWalletStatusChange(
  payload: LemonwayWebhookPayload,
  delivery: WebhookDelivery,
): Promise<HandlerResult> {
  const { ExtId, IntId, Status, Blocked, NotifDate } = payload

  // Map Lemonway status to our internal status
  const statusMap: Record<number, string> = {
    1: "KYC_INCOMPLETE",
    2: "KYC_INCOMPLETE",
    3: "KYC_INCOMPLETE",
    5: "REGISTERED",
    6: "ACTIVE",
    8: "CLOSED",
    12: "REJECTED",
  }

  const internalStatus = Status !== undefined ? statusMap[Status] || "UNKNOWN" : "UNKNOWN"

  // Update wallet in our system if exists
  if (ExtId) {
    try {
      await sql`
        UPDATE integrations."PaymentAccount"
        SET 
          lw_status = ${Status},
          status = ${Blocked === 1 ? "BLOCKED" : internalStatus},
          updated_at = NOW()
        WHERE external_id = ${ExtId}
      `
    } catch (error) {
      console.log("[WebhookHandler] PaymentAccount not found for ExtId:", ExtId)
    }
  }

  return {
    success: true,
    message: `Wallet ${ExtId || IntId} status changed to ${Status}`,
    data: {
      wallet_ext_id: ExtId,
      wallet_int_id: IntId,
      status: Status,
      internal_status: internalStatus,
      blocked: Blocked === 1,
      notif_date: NotifDate,
    },
  }
}

// Handler: Money-In Creation (NotifCategory 10, 11, 12, 22, 48)
export async function handleMoneyInCreation(
  payload: LemonwayWebhookPayload,
  delivery: WebhookDelivery,
): Promise<HandlerResult> {
  const { ExtId, IntId, IdTransaction, Amount, Status, NotifCategory, SubscriptionId, ScheduledNumber, NotifDate } =
    payload

  // Determine money-in type
  const moneyInType: Record<number, string> = {
    10: "WIRE",
    11: "SDD",
    12: "CHEQUE",
    22: "CARD_SUBSCRIPTION",
    48: "SOFORT",
  }

  const type = NotifCategory ? moneyInType[NotifCategory] || "UNKNOWN" : "UNKNOWN"

  // Status mapping: 0 = success, 4 = pending, 6 = error
  const statusText = Status === 0 ? "SUCCESS" : Status === 4 ? "PENDING" : Status === 6 ? "ERROR" : "UNKNOWN"

  return {
    success: true,
    message: `Money-In ${type} ${IdTransaction}: ${statusText} (${Amount})`,
    data: {
      wallet_ext_id: ExtId,
      wallet_int_id: IntId,
      transaction_id: IdTransaction,
      amount: Amount,
      status: Status,
      status_text: statusText,
      type,
      subscription_id: SubscriptionId,
      scheduled_number: ScheduledNumber,
      notif_date: NotifDate,
    },
  }
}

// Handler: Money-In Chargeback/Notification (NotifCategory 45)
export async function handleMoneyInChequeCanceled(
  payload: LemonwayWebhookPayload,
  delivery: WebhookDelivery,
): Promise<HandlerResult> {
  const { ExtId, IdTransaction, PspTransactionId, Status, MerchantToken, Comment, NotifDate } = payload

  return {
    success: true,
    message: `Cheque transaction ${IdTransaction} canceled`,
    data: {
      wallet_ext_id: ExtId,
      transaction_id: IdTransaction,
      psp_transaction_id: PspTransactionId,
      status: Status,
      merchant_token: MerchantToken,
      comment: Comment,
      notif_date: NotifDate,
    },
  }
}

// Handler: Money-Out Status (NotifCategory 15)
export async function handleMoneyOutStatus(
  payload: LemonwayWebhookPayload,
  delivery: WebhookDelivery,
): Promise<HandlerResult> {
  const { ExtId, IntId, IdTransaction, Amount, Status, PaymentMethod, IdOriginTransaction, NotifDate } = payload

  const statusText = Status === 0 ? "SUCCESS" : Status === 4 ? "PENDING" : Status === 6 ? "ERROR" : "UNKNOWN"

  return {
    success: true,
    message: `Money-Out ${IdTransaction}: ${statusText} (${Amount})`,
    data: {
      wallet_ext_id: ExtId,
      wallet_int_id: IntId,
      transaction_id: IdTransaction,
      amount: Amount,
      status: Status,
      status_text: statusText,
      payment_method: PaymentMethod,
      origin_transaction_id: IdOriginTransaction,
      notif_date: NotifDate,
    },
  }
}

// Handler: Document Status Change (NotifCategory 9)
export async function handleDocumentStatusChange(
  payload: LemonwayWebhookPayload,
  delivery: WebhookDelivery,
): Promise<HandlerResult> {
  const { ExtId, IntId, DocId, DocType, Status, NotifDate } = payload

  // Document status mapping
  const docStatusText =
    Status === 0
      ? "PENDING"
      : Status === 1
        ? "ACCEPTED"
        : Status === 2
          ? "REJECTED"
          : Status === 3
            ? "PENDING_KYC"
            : "UNKNOWN"

  return {
    success: true,
    message: `Document ${DocId} status: ${docStatusText}`,
    data: {
      wallet_ext_id: ExtId,
      wallet_int_id: IntId,
      doc_id: DocId,
      doc_type: DocType,
      status: Status,
      status_text: docStatusText,
      notif_date: NotifDate,
    },
  }
}

// Handler: Chargeback (NotifCategory 14)
export async function handleChargeback(
  payload: LemonwayWebhookPayload,
  delivery: WebhookDelivery,
): Promise<HandlerResult> {
  const { ExtId, IntId, IdTransaction, Amount, Status, NotifDate } = payload

  const statusText = Status === 0 ? "SUCCESS" : Status === 4 ? "PENDING" : Status === 6 ? "ERROR" : "UNKNOWN"

  return {
    success: true,
    message: `Chargeback ${IdTransaction}: ${statusText} (${Amount})`,
    data: {
      wallet_ext_id: ExtId,
      wallet_int_id: IntId,
      transaction_id: IdTransaction,
      amount: Amount,
      status: Status,
      status_text: statusText,
      notif_date: NotifDate,
    },
  }
}

// Handler: Money-In SDD Canceled (NotifCategory 17)
export async function handleMoneyInSddCanceled(
  payload: LemonwayWebhookPayload,
  delivery: WebhookDelivery,
): Promise<HandlerResult> {
  const { ExtId, IntId, IdTransaction, Amount, Status, NotifDate } = payload

  return {
    success: true,
    message: `SDD transaction ${IdTransaction} canceled`,
    data: {
      wallet_ext_id: ExtId,
      wallet_int_id: IntId,
      transaction_id: IdTransaction,
      amount: Amount,
      status: Status,
      notif_date: NotifDate,
    },
  }
}

// Handler registry mapping NotifCategory to handler functions
export const HANDLER_REGISTRY: Record<number, WebhookHandler> = {
  8: handleWalletStatusChange,
  9: handleDocumentStatusChange,
  10: handleMoneyInCreation,
  11: handleMoneyInCreation,
  12: handleMoneyInCreation,
  13: handleBlockedAccountStatusChange,
  14: handleChargeback,
  15: handleMoneyOutStatus,
  17: handleMoneyInSddCanceled,
  22: handleMoneyInCreation,
  45: handleMoneyInChequeCanceled,
  48: handleMoneyInCreation,
}

// Default handler for unknown NotifCategory
export async function handleUnknown(
  payload: LemonwayWebhookPayload,
  delivery: WebhookDelivery,
): Promise<HandlerResult> {
  return {
    success: true,
    message: `Unknown webhook type received: NotifCategory ${payload.NotifCategory}`,
    data: { raw_payload: payload },
  }
}
