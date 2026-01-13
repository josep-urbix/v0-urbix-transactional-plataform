import { sql } from "@/lib/db"

interface LogTransactionParams {
  direction: "INCOMING" | "OUTGOING"
  type: string
  status: "SUCCESS" | "ERROR" | "PENDING" // Added PENDING status
  meetingId?: string
  httpMethod?: string
  endpoint?: string
  requestPayload?: any
  responsePayload?: any
  httpStatusCode?: number
  correlationId?: string
  googleMeetLink?: string
  rescheduleLink?: string
  cancelLink?: string
  contactEmail?: string // Added contactEmail field
}

export async function logTransaction(params: LogTransactionParams) {
  try {
    await sql`
      INSERT INTO "Transaction" (
        direction,
        type,
        status,
        "meetingId",
        "httpMethod",
        endpoint,
        "requestPayload",
        "responsePayload",
        "httpStatusCode",
        "correlationId",
        "googleMeetLink",
        "rescheduleLink",
        "cancelLink",
        "contactEmail",
        "createdAt"
      ) VALUES (
        ${params.direction},
        ${params.type},
        ${params.status},
        ${params.meetingId || null},
        ${params.httpMethod || null},
        ${params.endpoint || null},
        ${params.requestPayload ? JSON.stringify(params.requestPayload, null, 2) : null},
        ${params.responsePayload ? JSON.stringify(params.responsePayload, null, 2) : null},
        ${params.httpStatusCode || null},
        ${params.correlationId || null},
        ${params.googleMeetLink || null},
        ${params.rescheduleLink || null},
        ${params.cancelLink || null},
        ${params.contactEmail || null},
        NOW()
      )
    `
  } catch (error) {
    console.error("[Transaction Logger] Failed to log transaction:", error)
  }
}

export async function updateTransactionStatus(
  transactionId: string,
  status: "SUCCESS" | "ERROR",
  responsePayload?: any,
  httpStatusCode?: number,
) {
  try {
    await sql`
      UPDATE "Transaction"
      SET 
        status = ${status},
        "responsePayload" = ${responsePayload ? JSON.stringify(responsePayload, null, 2) : null},
        "httpStatusCode" = ${httpStatusCode || null}
      WHERE id = ${transactionId}
    `
  } catch (error) {
    console.error("[Transaction Logger] Failed to update transaction:", error)
  }
}

export async function logTransactionWithId(params: LogTransactionParams): Promise<string> {
  try {
    const result = await sql`
      INSERT INTO "Transaction" (
        direction,
        type,
        status,
        "meetingId",
        "httpMethod",
        endpoint,
        "requestPayload",
        "responsePayload",
        "httpStatusCode",
        "correlationId",
        "googleMeetLink",
        "rescheduleLink",
        "cancelLink",
        "contactEmail",
        "createdAt"
      ) VALUES (
        ${params.direction},
        ${params.type},
        ${params.status},
        ${params.meetingId || null},
        ${params.httpMethod || null},
        ${params.endpoint || null},
        ${params.requestPayload ? JSON.stringify(params.requestPayload, null, 2) : null},
        ${params.responsePayload ? JSON.stringify(params.responsePayload, null, 2) : null},
        ${params.httpStatusCode || null},
        ${params.correlationId || null},
        ${params.googleMeetLink || null},
        ${params.rescheduleLink || null},
        ${params.cancelLink || null},
        ${params.contactEmail || null},
        NOW()
      )
      RETURNING id
    `

    return result[0]?.id as string
  } catch (error) {
    console.error("[Transaction Logger] Failed to log transaction:", error)
    throw error
  }
}

export function generateCorrelationId(): string {
  return `corr-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}
