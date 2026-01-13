// Cliente para interactuar con Lemonway API REST v2
import { sql } from "@/lib/db"
import { getRetryConfig } from "./lemonway-retry-config"
import { LemonwayTypeMapper } from "./lemonway-type-mapper"

export interface LemonwayConfig {
  environment: "sandbox" | "production"
  apiToken: string // API key para OAuth
  environmentName?: string // e.g., 'urbix' for /mb/urbix/directkitrest/v2/
  walletId?: string
  webhookSecret?: string
  companyName?: string
  companyWebsite?: string
  maxConcurrentRequests?: number
  minDelayBetweenRequestsMs?: number
  accountId?: string // Added for account verification in transactions
}

export interface LemonwayTransaction {
  transactionId: string
  walletId: string
  type: "money_in" | "money_out" | "p2p" | "split"
  amount: number
  currency: string
  status: "pending" | "completed" | "failed" | "cancelled"
  direction: "incoming" | "outgoing"
  debitWallet?: string
  creditWallet?: string
  comment?: string
  metadata?: Record<string, any>
}

export class LemonwayClient {
  private config: LemonwayConfig
  private bearerToken?: string
  private tokenExpiresAt?: Date
  private requestQueue: Array<{
    fn: () => Promise<any>
    resolve: (value: any) => void
    reject: (error: any) => void
  }> = []
  private activeRequests = 0
  private lastRequestTime = 0
  private isProcessingQueue = false
  private queueProcessorPromise: Promise<void> | null = null

  constructor(config: LemonwayConfig) {
    this.config = config
  }

  static async getConfig(): Promise<LemonwayConfig | null> {
    const result = await sql`
      SELECT * FROM "LemonwayConfig" 
      ORDER BY "id" DESC 
      LIMIT 1
    `

    console.log("[v0] [Lemonway] getConfig - DB result count:", result.length)
    if (result.length > 0) {
      const config = result[0]
      console.log("[v0] [Lemonway] getConfig - environment:", config.environment)
      console.log("[v0] [Lemonway] getConfig - api_token exists:", !!config.api_token)
      console.log(
        "[v0] [Lemonway] getConfig - api_token value (first 10):",
        config.api_token ? config.api_token.substring(0, 10) + "..." : "NULL/UNDEFINED",
      )
      console.log("[v0] [Lemonway] getConfig - wallet_id:", config.wallet_id)
      console.log("[v0] [Lemonway] getConfig - environment_name:", config.environment_name)
      console.log("[v0] [Lemonway] getConfig - max_concurrent_requests:", config.max_concurrent_requests)
      console.log("[v0] [Lemonway] getConfig - min_delay_between_requests_ms:", config.minDelayBetweenRequestsMs)
      console.log("[v0] [Lemonway] getConfig - account_id:", config.account_id)
    }

    if (result.length === 0) return null

    const config = result[0]

    return {
      environment: config.environment as "sandbox" | "production",
      apiToken: config.api_token,
      environmentName: config.environment_name,
      walletId: config.wallet_id,
      webhookSecret: config.webhook_secret,
      companyName: config.company_name,
      companyWebsite: config.company_website,
      maxConcurrentRequests: config.max_concurrent_requests || 3,
      minDelayBetweenRequestsMs: config.minDelayBetweenRequestsMs || 1000,
      accountId: config.account_id, // Added for account verification in transactions
    }
  }

  private getOAuthUrl(): string {
    return this.config.environment === "production"
      ? "https://api.lemonway.com/oauth/api/v1/oauth/token"
      : "https://sandbox-api.lemonway.fr/oauth/api/v1/oauth/token"
  }

  private getApiBaseUrl(): string {
    const envName = this.config.environmentName || "urbix"
    return this.config.environment === "production"
      ? `https://api.lemonway.fr/mb/${envName}/prod/directkitrest/v2`
      : `https://sandbox-api.lemonway.fr/mb/${envName}/dev/directkitrest/v2`
  }

  async getBearerToken(): Promise<string> {
    if (!(await this.isMethodEnabled("getBearerToken"))) {
      throw new Error("El método getBearerToken está desactivado")
    }

    if (this.bearerToken && this.tokenExpiresAt && this.tokenExpiresAt > new Date()) {
      console.log("[v0] [Lemonway] Using existing bearer token")
      return this.bearerToken
    }

    console.log("[v0] [Lemonway] Obtaining new Bearer token via OAuth 2.0")
    const oauthUrl = this.getOAuthUrl()

    console.log("[v0] [Lemonway] OAuth URL:", oauthUrl)
    if (this.config.apiToken) {
      console.log("[v0] [Lemonway] API Token (first 10 chars):", this.config.apiToken.substring(0, 10) + "...")
      // Changed to "Basic" with capital B for OAuth
      console.log("[v0] [Lemonway] Full Authorization header:", `Basic ${this.config.apiToken}`)
    } else {
      console.error("[v0] [Lemonway] ERROR: API Token is undefined!")
    }

    const response = await fetch(oauthUrl, {
      method: "POST",
      headers: {
        Accept: "application/json;charset=UTF-8",
        Authorization: `Basic ${this.config.apiToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "Grant_type=client_credentials",
    })

    console.log("[v0] [Lemonway] OAuth response status:", response.status)
    console.log(
      "[v0] [Lemonway] OAuth response headers:",
      JSON.stringify(Object.fromEntries(response.headers.entries())),
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] [Lemonway] OAuth error response:", errorText)
      throw new Error(`OAuth failed: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    this.bearerToken = data.access_token

    // El token dura 90 días
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 90)
    this.tokenExpiresAt = expiresAt

    console.log("[v0] [Lemonway] Bearer token obtained, expires at:", expiresAt.toISOString())

    return this.bearerToken!
  }

  private async logApiCall(
    endpoint: string,
    method: string,
    requestPayload: any,
    responsePayload: any,
    responseStatus: number,
    success: boolean,
    errorMessage: string | null,
    durationMs: number,
    requestId?: string,
  ): Promise<number> {
    try {
      const retryConfig = await getRetryConfig()

      const shouldRetry = !success
      const nextRetryAt = shouldRetry ? new Date(Date.now() + retryConfig.retryDelaySeconds * 1000) : null
      const retryStatus = shouldRetry ? "pending" : "none"

      const result = await sql`
        INSERT INTO "LemonwayApiCallLog" (
          endpoint, method, request_payload, response_payload, 
          response_status, success, error_message, duration_ms,
          retry_count, retry_status, next_retry_at, manual_retry_needed, final_failure
        ) VALUES (
          ${endpoint}, ${method}, ${JSON.stringify(requestPayload)}, 
          ${JSON.stringify(responsePayload)}, ${responseStatus}, 
          ${success}, ${errorMessage}, ${durationMs},
          0, ${retryStatus}, ${nextRetryAt ? nextRetryAt.toISOString() : null}, false, false
        )
        RETURNING id
      `

      const insertedId = result[0].id

      const finalRequestId = requestId || String(insertedId)

      await sql`
        UPDATE "LemonwayApiCallLog"
        SET request_id = ${finalRequestId}
        WHERE id = ${insertedId}
      `

      console.log("[v0] [Lemonway] API call logged with ID:", insertedId, "Request ID:", finalRequestId)

      return insertedId
    } catch (error) {
      console.error("Failed to log API call:", error)
      return -1
    }
  }

  private async executeAndUpdateExistingLog(
    logId: number,
    endpoint: string,
    method: "GET" | "POST" = "POST",
    data?: any,
  ): Promise<{ success: boolean; responseStatus: number; errorMessage: string | null }> {
    const startTime = Date.now()
    const sentAt = new Date()
    const bearerToken = await this.getBearerToken()

    const baseUrl = this.getApiBaseUrl()
    const url = `${baseUrl}${endpoint}`

    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "PSU-Accept-Language": "fr",
      "PSU-IP-Address": "1.1.1.1",
      "PSU-User-Agent": "Postman",
      Authorization: `Bearer ${bearerToken}`,
      "User-Agent": "PostmanRuntime/7.51.0",
      "Postman-Token": this.generatePostmanToken(),
      "Accept-Encoding": "gzip, deflate, br",
      Connection: "keep-alive",
    }

    let responseStatus = 0
    let responseData: any = null
    let errorMessage: string | null = null
    let success = false

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      })

      responseStatus = response.status

      const responseText = await response.text()

      if (responseStatus === 429) {
        errorMessage = "Too Many Requests - Rate limit exceeded"
        success = false
      } else if (responseStatus === 403) {
        errorMessage = "Forbidden - IP not whitelisted or access denied"
        success = false
      } else {
        try {
          responseData = JSON.parse(responseText)
          success = response.ok
          if (!success) {
            errorMessage = responseData?.error?.message || responseData?.message || `HTTP ${responseStatus}`
          }
        } catch {
          if (!response.ok) {
            errorMessage = responseText || `HTTP ${responseStatus}`
            success = false
          } else {
            responseData = responseText
            success = true
          }
        }
      }
    } catch (error: any) {
      errorMessage = error.message || "Network error"
      success = false
    }

    const durationMs = Date.now() - startTime

    if (success) {
      // Éxito: limpiar estado de reintento
      await sql`
        UPDATE "LemonwayApiCallLog"
        SET 
          response_payload = ${JSON.stringify(responseData)},
          response_status = ${responseStatus},
          success = ${success},
          error_message = ${errorMessage},
          duration_ms = ${durationMs},
          sent_at = ${sentAt.toISOString()},
          retry_status = 'none',
          next_retry_at = NULL
        WHERE id = ${logId}
      `
    } else {
      // Fallo: marcar para reintento con próximo intento en 5 segundos
      const retryConfig = await getRetryConfig()
      const nextRetryAt = new Date(Date.now() + retryConfig.retryDelaySeconds * 1000)

      await sql`
        UPDATE "LemonwayApiCallLog"
        SET 
          response_payload = ${JSON.stringify(responseData)},
          response_status = ${responseStatus},
          success = ${success},
          error_message = ${errorMessage},
          duration_ms = ${durationMs},
          sent_at = ${sentAt.toISOString()},
          retry_status = 'pending',
          next_retry_at = ${nextRetryAt.toISOString()}
        WHERE id = ${logId}
      `
      console.log(
        `[v0] [Lemonway] First attempt failed for log ${logId}, scheduled retry at ${nextRetryAt.toISOString()}`,
      )
    }

    return { success, responseStatus, errorMessage }
  }

  async executeAndUpdateLog(
    logId: number,
    endpoint: string,
    method: "GET" | "POST" = "POST",
    data?: any,
  ): Promise<{ success: boolean; responseStatus: number; errorMessage: string | null }> {
    const startTime = Date.now()
    const sentAt = new Date()
    const bearerToken = await this.getBearerToken()

    const baseUrl = this.getApiBaseUrl()

    let url = `${baseUrl}${endpoint}`
    if (method === "GET" && data) {
      const params = new URLSearchParams()
      // Solo añadir startDate y endDate (ya son Unix timestamps string)
      if (data.startDate) params.append("startDate", data.startDate)
      if (data.endDate) params.append("endDate", data.endDate)
      url = `${url}?${params.toString()}`
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "PSU-Accept-Language": "fr",
      "PSU-IP-Address": "1.1.1.1",
      "PSU-User-Agent": "Postman",
      Authorization: `Bearer ${bearerToken}`,
      "User-Agent": "PostmanRuntime/7.51.0",
      "Postman-Token": this.generatePostmanToken(),
      "Accept-Encoding": "gzip, deflate, br",
      Connection: "keep-alive",
    }

    let responseStatus = 0
    let responseData: any = null
    let errorMessage: string | null = null
    let success = false

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: method === "POST" && data ? JSON.stringify(data) : undefined,
      })

      responseStatus = response.status

      const responseText = await response.text()

      if (responseStatus === 429) {
        errorMessage = "Too Many Requests - Rate limit exceeded"
        success = false
      } else if (responseStatus === 403) {
        errorMessage = "Forbidden - IP not whitelisted or access denied"
        success = false
      } else {
        try {
          responseData = JSON.parse(responseText)
          success = response.ok
          if (!success) {
            errorMessage = responseData?.error?.message || responseData?.message || `HTTP ${responseStatus}`
          }
        } catch {
          if (!response.ok) {
            errorMessage = responseText || `HTTP ${responseStatus}`
            success = false
          } else {
            responseData = responseText
            success = true
          }
        }
      }
    } catch (error: any) {
      errorMessage = error.message || "Network error"
      success = false
    }

    const durationMs = Date.now() - startTime

    if (success) {
      if (endpoint.includes("/transactions/") && responseData) {
        console.log(`[v0] Transacciones recibidas para log ${logId}, procesando...`)

        // Obtener el importRunId desde data (que viene del request_payload del log)
        const importRunId = data?.importRunId || "unknown"

        console.log(`[v0] Procesando transacciones del log ${logId} con importRunId: ${importRunId}`)

        const stats = await this.processAndSaveTransactions(logId, importRunId, responseData)
        console.log(
          `[v0] Transacciones procesadas: ${stats.inserted} insertadas, ${stats.duplicated} duplicadas, ${stats.errors} errores`,
        )
      }

      // Éxito: limpiar estado de reintento
      await sql`
        UPDATE "LemonwayApiCallLog"
        SET 
          response_payload = ${JSON.stringify(responseData)},
          response_status = ${responseStatus},
          success = ${success},
          error_message = ${errorMessage},
          duration_ms = ${durationMs},
          retry_status = 'none',
          retry_count = 0,
          final_failure = false
        WHERE id = ${logId}
      `
    } else {
      // Fallo: marcar para reintento con próximo intento en 5 segundos
      const retryCount = await sql`
        SELECT retry_count FROM "LemonwayApiCallLog" WHERE id = ${logId}
      `
      const currentRetryCount = retryCount[0]?.retry_count || 0
      const newRetryCount = currentRetryCount + 1

      await sql`
        UPDATE "LemonwayApiCallLog"
        SET 
          response_payload = ${responseData ? JSON.stringify(responseData) : null},
          response_status = ${responseStatus},
          success = ${success},
          error_message = ${errorMessage},
          duration_ms = ${durationMs},
          retry_count = ${newRetryCount},
          retry_status = ${newRetryCount >= 3 ? "failed" : "pending"},
          final_failure = ${newRetryCount >= 3}
        WHERE id = ${logId}
      `
    }

    return { success, responseStatus, errorMessage }
  }

  async retryFailedCall(logId: number): Promise<{ success: boolean; message: string; newLogId?: number }> {
    try {
      const retryConfig = await getRetryConfig()

      const logs = await sql`
        SELECT * FROM "LemonwayApiCallLog" 
        WHERE id = ${logId}
      `

      if (logs.length === 0) {
        return { success: false, message: "Log no encontrado" }
      }

      const log = logs[0]

      console.log("[v0] [Lemonway] retryFailedCall - Processing log ID:", logId)
      console.log("[v0] [Lemonway] retryFailedCall - Current retry_count:", log.retry_count)
      console.log("[v0] [Lemonway] retryFailedCall - Current retry_status:", log.retry_status)
      console.log("[v0] [Lemonway] retryFailedCall - Max retries allowed:", retryConfig.maxRetryAttempts)

      const currentRetryCount = log.retry_count || 0

      if (currentRetryCount >= retryConfig.maxRetryAttempts && log.final_failure !== true) {
        console.log("[v0] [Lemonway] retryFailedCall - Marking as final failure")
        await sql`
          UPDATE "LemonwayApiCallLog" 
          SET 
            retry_status = 'failed',
            final_failure = true,
            manual_retry_needed = ${retryConfig.manualRetryEnabled}
          WHERE id = ${logId}
        `
        return { success: false, message: "Máximo de reintentos alcanzado - marcado como fallido" }
      }

      const config = await LemonwayClient.getConfig()
      if (!config) {
        return { success: false, message: "No hay configuración de Lemonway" }
      }

      const client = new LemonwayClient(config)

      const hadPreviousAttempt = log.response_status !== null

      if (hadPreviousAttempt && currentRetryCount === 0) {
        const existingHistory = await sql`
          SELECT id FROM "LemonwayApiCallRetryHistory" 
          WHERE api_call_log_id = ${logId} AND attempt_number = 0
        `
        if (existingHistory.length === 0) {
          await client.saveToRetryHistory(
            logId,
            0,
            log.response_status || 0,
            false,
            log.error_message || null,
            log.duration_ms || 0,
            log.response_payload || null,
          )
        }
      }

      await sql`
        UPDATE "LemonwayApiCallLog" 
        SET retry_status = 'processing'
        WHERE id = ${logId}
      `

      const result = await client.executeAndUpdateLog(
        logId,
        log.endpoint,
        log.method as "GET" | "POST",
        log.request_payload,
      )

      console.log("[v0] [Lemonway] retryFailedCall - Execution result success:", result.success)
      console.log("[v0] [Lemonway] retryFailedCall - Response status:", result.responseStatus)

      const newRetryCount = hadPreviousAttempt ? currentRetryCount + 1 : result.success ? 0 : 1
      const finalFailure = !result.success && newRetryCount >= retryConfig.maxRetryAttempts
      const nextRetryAt =
        !result.success && !finalFailure ? new Date(Date.now() + retryConfig.retryDelaySeconds * 1000) : null

      let retryStatus: string
      if (result.success) {
        retryStatus = hadPreviousAttempt ? "success" : "none"
      } else if (finalFailure) {
        retryStatus = "failed"
      } else {
        retryStatus = "pending"
      }

      console.log("[v0] [Lemonway] retryFailedCall - New retry_count:", newRetryCount)
      console.log("[v0] [Lemonway] retryFailedCall - Final failure?", finalFailure)
      console.log("[v0] [Lemonway] retryFailedCall - New retry_status:", retryStatus)
      console.log(
        "[v0] [Lemonway] retryFailedCall - Manual retry needed?",
        finalFailure && retryConfig.manualRetryEnabled,
      )

      await sql`
        UPDATE "LemonwayApiCallLog" 
        SET 
          retry_count = ${newRetryCount},
          retry_status = ${retryStatus},
          manual_retry_needed = ${finalFailure && retryConfig.manualRetryEnabled},
          final_failure = ${finalFailure},
          next_retry_at = ${nextRetryAt ? nextRetryAt.toISOString() : null}
        WHERE id = ${logId}
      `

      await client.saveToRetryHistory(
        logId,
        newRetryCount,
        result.responseStatus || 0,
        result.success,
        result.errorMessage || null,
        result.durationMs || 0,
        result.responsePayload || null,
      )

      const endpointLower = (log.endpoint || "").toLowerCase()
      const isAccountsRetrieve =
        endpointLower.includes("accounts/retrieve") ||
        endpointLower.includes("accounts%2fretrieve") ||
        endpointLower.includes("/accounts/retrieve") ||
        endpointLower === "accounts/retrieve"

      console.log("[v0] [Lemonway] retryFailedCall - Is accounts/retrieve?", isAccountsRetrieve)
      console.log(
        "[v0] [Lemonway] retryFailedCall - Will attempt sync?",
        result.success && isAccountsRetrieve && !!result.responsePayload,
      )

      if (result.success && isAccountsRetrieve && result.responsePayload) {
        console.log("[v0] [Lemonway] ✓ Attempting to sync account data from retry...")
        console.log(
          "[v0] [Lemonway] Response payload preview:",
          JSON.stringify(result.responsePayload).substring(0, 200),
        )

        try {
          await LemonwayClient.syncAccountFromResponse(result.responsePayload, sql)
          console.log("[v0] [Lemonway] ✓ Account data synced successfully from retry")
        } catch (syncError: any) {
          console.error("[v0] [Lemonway] ✗ Error syncing account data after retry:", syncError.message)
          console.error("[v0] [Lemonway] Sync error stack:", syncError.stack)
        }
      } else {
        if (!result.success) {
          console.log("[v0] [Lemonway] Skipping sync - API call failed")
        } else if (!isAccountsRetrieve) {
          console.log("[v0] [Lemonway] Skipping sync - Not an accounts/retrieve endpoint")
        } else if (!result.responsePayload) {
          console.log("[v0] [Lemonway] Skipping sync - No response payload")
        }
      }

      const attemptType = hadPreviousAttempt ? `Reintento #${newRetryCount}` : "Primer envío"
      return {
        success: result.success,
        message: result.success ? `${attemptType} exitoso` : `${attemptType} fallido: ${result.errorMessage}`,
        newLogId: logId,
      }
    } catch (error: any) {
      console.error("[v0] [Lemonway] Error in retryFailedCall:", error)
      return { success: false, message: `Error: ${error.message}` }
    }
  }

  /**
   * Sync account data from API response to database
   * Called after successful accounts/retrieve calls
   */
  static async syncAccountFromResponse(responsePayload: any, sql: any): Promise<void> {
    console.log("[v0] [Lemonway] syncAccountFromResponse called")
    console.log("[v0] [Lemonway] Payload structure:", JSON.stringify(responsePayload).substring(0, 300))

    if (!responsePayload || !responsePayload.accounts || !Array.isArray(responsePayload.accounts)) {
      console.log("[v0] [Lemonway] No accounts in response to sync")
      console.log("[v0] [Lemonway] Payload has accounts?", !!responsePayload?.accounts)
      console.log("[v0] [Lemonway] Accounts is array?", Array.isArray(responsePayload?.accounts))
      return
    }

    console.log("[v0] [Lemonway] Found", responsePayload.accounts.length, "accounts to sync")

    for (const account of responsePayload.accounts) {
      if (!account.id) {
        console.log("[v0] [Lemonway] Skipping account with no ID")
        continue
      }

      console.log("[v0] [Lemonway] Syncing account from response:", account.id)

      let birthDateFormatted: string | null = null
      if (account.birth?.date) {
        try {
          const dateStr = String(account.birth.date).trim()
          const parts = dateStr.split("/")
          if (parts.length === 3) {
            const day = parts[0].padStart(2, "0")
            const month = parts[1].padStart(2, "0")
            const year = parts[2]
            birthDateFormatted = `${year}-${month}-${day}`
            console.log("[v0] [Lemonway] Converted birth date:", dateStr, "->", birthDateFormatted)
          } else {
            console.error("[v0] [Lemonway] Invalid birth date format:", dateStr)
          }
        } catch (err) {
          console.error("[v0] [Lemonway] Error converting birth date:", err)
        }
      }

      await sql`
        INSERT INTO payments.payment_accounts (
          account_id,
          email,
          first_name,
          last_name,
          company_name,
          balance,
          currency,
          status,
          kyc_status,
          account_type,
          phone_number,
          mobile_number,
          address,
          city,
          postal_code,
          country,
          is_debtor,
          nationality,
          client_title,
          birth_date,
          birth_city,
          birth_country,
          internal_id,
          is_blocked,
          payer_or_beneficiary,
          company_description,
          company_website,
          company_identification_number,
          raw_data,
          last_sync_at,
          updated_at
        ) VALUES (
          ${account.id},
          ${account.email || null},
          ${account.firstname || null},
          ${account.lastname || null},
          ${account.company?.name || null},
          ${account.balance != null ? account.balance / 100 : null},
          ${"EUR"},
          ${account.status != null ? String(account.status) : null},
          ${account.kycStatus != null ? String(account.kycStatus) : "none"},
          ${String(account.accountType || 0)},
          ${account.phoneNumber || null},
          ${account.mobileNumber || null},
          ${account.adresse?.street || null},
          ${account.adresse?.city || null},
          ${account.adresse?.postCode || null},
          ${account.adresse?.country || null},
          ${account.isDebtor || false},
          ${account.nationality || null},
          ${account.clientTitle || null},
          ${birthDateFormatted},
          ${account.birth?.city || null},
          ${account.birth?.Country || null},
          ${account.internalId || null},
          ${account.isblocked || false},
          ${account.payerOrBeneficiary != null ? account.payerOrBeneficiary : null},
          ${account.company?.description || null},
          ${account.company?.websiteUrl || null},
          ${account.company?.identificationNumber || null},
          ${JSON.stringify(account)},
          NOW(),
          NOW()
        )
        ON CONFLICT (account_id) DO UPDATE SET
          email = EXCLUDED.email,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          company_name = EXCLUDED.company_name,
          balance = EXCLUDED.balance,
          status = EXCLUDED.status,
          kyc_status = EXCLUDED.kyc_status,
          account_type = EXCLUDED.account_type,
          phone_number = EXCLUDED.phone_number,
          mobile_number = EXCLUDED.mobile_number,
          address = EXCLUDED.address,
          city = EXCLUDED.city,
          postal_code = EXCLUDED.postal_code,
          country = EXCLUDED.country,
          is_debtor = EXCLUDED.is_debtor,
          nationality = EXCLUDED.nationality,
          client_title = EXCLUDED.client_title,
          birth_date = EXCLUDED.birth_date,
          birth_city = EXCLUDED.birth_city,
          birth_country = EXCLUDED.birth_country,
          internal_id = EXCLUDED.internal_id,
          is_blocked = EXCLUDED.is_blocked,
          payer_or_beneficiary = EXCLUDED.payer_or_beneficiary,
          company_description = EXCLUDED.company_description,
          company_website = EXCLUDED.company_website,
          company_identification_number = EXCLUDED.company_identification_number,
          raw_data = EXCLUDED.raw_data,
          last_sync_at = NOW(),
          updated_at = NOW()
      `

      console.log("[v0] [Lemonway] Account synced successfully:", account.id)
    }
  }

  async processAndSaveTransactions(
    logId: number,
    importRunId: string,
    responseData: any,
  ): Promise<{ inserted: number; duplicated: number; errors: number }> {
    console.log(`[v0] processAndSaveTransactions iniciado para log ${logId}`)
    console.log(`[v0] Import Run ID: ${importRunId}`)
    console.log(`[v0] Response data keys:`, Object.keys(responseData || {}))

    let inserted = 0
    let duplicated = 0
    let errors = 0

    if (!responseData?.transactions?.value) {
      console.log(`[v0] No hay transacciones en la respuesta`)
      return { inserted: 0, duplicated: 0, errors: 0 }
    }

    for (const transaction of responseData.transactions.value) {
      try {
        const isP2P = !!transaction.transactionP2P
        const txData = isP2P ? transaction.transactionP2P : transaction.transactionIn

        if (!txData) {
          console.log(`[v0] Transacción sin datos, saltando`)
          continue
        }

        const lemonwayTxId = String(txData.id)
        console.log(`[v0] Procesando transacción Lemonway ID: ${lemonwayTxId}, tipo: ${isP2P ? "P2P" : "In"}`)

        const existing = await sql`
          SELECT id FROM lemonway_temp.movimientos_cuenta 
          WHERE lemonway_transaction_id = ${lemonwayTxId}
        `

        if (existing.length > 0) {
          console.log(`[v0] Transacción ${lemonwayTxId} ya existe, marcando como duplicada`)
          duplicated++
          continue
        }

        // Determinar dirección y monto
        let monto = 0
        let cuentaVirtualId = ""

        if (isP2P) {
          console.log(
            `[v0] P2P: sender=${txData.senderAccountId}, receiver=${txData.receiverAccountId}, config.accountId=${this.config.accountId}`,
          )
          if (txData.senderAccountId === this.config.accountId) {
            monto = -(txData.debitAmount / 100)
            cuentaVirtualId = txData.receiverAccountId
          } else {
            monto = txData.creditAmount / 100
            cuentaVirtualId = txData.senderAccountId
          }
        } else {
          // Para transactionIn: siempre ingreso
          monto = txData.creditAmount / 100
          cuentaVirtualId = txData.receiverAccountId
        }

        const commission = isP2P ? txData.commissionAmount / 100 : (txData.lemonWayCommission?.amount || 0) / 100

        const fechaOperacion = new Date(txData.date * 1000)
        const now = new Date()

        let urbixAccountId: string | null = null
        try {
          const urbixAccountResult = await sql`
            SELECT id FROM virtual_accounts.cuentas_virtuales 
            WHERE lemonway_account_id = ${cuentaVirtualId}
            LIMIT 1
          `
          if (urbixAccountResult.length > 0) {
            urbixAccountId = urbixAccountResult[0].id
            console.log(
              `[v0] Encontrado urbix_account_id: ${urbixAccountId} para lemonway_account_id: ${cuentaVirtualId}`,
            )
          } else {
            console.log(`[v0] No encontrado urbix_account_id para lemonway_account_id: ${cuentaVirtualId}`)
          }
        } catch (lookupError) {
          console.error(`[v0] Error buscando urbix_account_id:`, lookupError)
          // Continuar con urbixAccountId = null
        }

        console.log(
          `[v0] Insertando: monto=${monto}, cuenta=${cuentaVirtualId}, commission=${commission}, urbixAccountId=${urbixAccountId}`,
        )

        const direction = isP2P ? null : monto > 0 ? "money_in" : "money_out"
        const operationCode = await LemonwayTypeMapper.getOperationCode(Number(txData.method), direction)

        if (!operationCode) {
          console.warn(
            `[v0] No se pudo mapear tipo de operación para Lemonway type ${txData.method}, direction ${direction}`,
          )
          errors++
          continue
        }

        // Insertar en movimientos_cuenta
        await sql`
          INSERT INTO lemonway_temp.movimientos_cuenta (
            id,
            lemonway_transaction_id,
            import_run_id,
            cuenta_virtual_id,
            urbix_account_id,
            monto,
            commission,
            tipo_transaccion,
            tipo_operacion_id,
            status,
            descripcion,
            comentario,
            referencia_externa,
            moneda,
            sender,
            receiver,
            payment_method,
            fecha_operacion,
            procesado,
            procesado_at,
            estado_importacion,
            lemonway_raw_data,
            created_at,
            updated_at
          ) VALUES (
            gen_random_uuid(),
            ${lemonwayTxId},
            ${importRunId},
            ${cuentaVirtualId},
            ${urbixAccountId},
            ${monto},
            ${commission},
            ${isP2P ? "transactionP2P" : "transactionIn"},
            ${operationCode},
            ${txData.status},
            ${txData.comment || ""},
            ${txData.comment || ""},
            ${txData.reference || ""},
            ${"EUR"},
            ${isP2P ? txData.senderAccountId : null},
            ${txData.receiverAccountId},
            ${String(txData.method)},
            ${fechaOperacion.toISOString()},
            ${true},
            ${now.toISOString()},
            ${"importado"},
            ${JSON.stringify(txData)},
            ${now.toISOString()},
            ${now.toISOString()}
          )
        `

        console.log(`[v0] Transacción ${lemonwayTxId} insertada exitosamente`)
        inserted++
      } catch (error: any) {
        console.error(`[v0] Error insertando transacción:`, error)
        errors++
      }
    }

    console.log(`[v0] Resumen: ${inserted} insertadas, ${duplicated} duplicadas, ${errors} errores`)
    return { inserted, duplicated, errors }
  }

  private async processQueue(): Promise<void> {
    // Only start one queue processor at a time
    if (this.queueProcessorPromise) {
      return this.queueProcessorPromise
    }

    this.queueProcessorPromise = (async () => {
      console.log("[v0] [Lemonway Queue] Starting queue processor")

      while (this.requestQueue.length > 0) {
        const maxConcurrent = this.config.maxConcurrentRequests || 3
        const minDelay = this.config.minDelayBetweenRequestsMs || 1000

        console.log("[v0] [Lemonway Queue] Queue size:", this.requestQueue.length)
        console.log("[v0] [Lemonway Queue] Active requests:", this.activeRequests)
        console.log("[v0] [Lemonway Queue] Max concurrent:", maxConcurrent)
        console.log("[v0] [Lemonway Queue] Min delay:", minDelay, "ms")

        // Wait until we have capacity
        if (this.activeRequests >= maxConcurrent) {
          console.log("[v0] [Lemonway Queue] At capacity, waiting...")
          await new Promise((resolve) => setTimeout(resolve, 100))
          continue
        }

        // Enforce minimum delay between requests
        const now = Date.now()
        const timeSinceLastRequest = now - this.lastRequestTime
        if (timeSinceLastRequest < minDelay) {
          const waitTime = minDelay - timeSinceLastRequest
          console.log("[v0] [Lemonway Queue] Waiting", waitTime, "ms for rate limit")
          await new Promise((resolve) => setTimeout(resolve, waitTime))
        }

        // Take next item from queue
        const item = this.requestQueue.shift()
        if (!item) break

        this.activeRequests++
        this.lastRequestTime = Date.now()

        console.log("[v0] [Lemonway Queue] Executing request, active:", this.activeRequests)

        // Execute the request (don't await, let it run in background)
        item
          .fn()
          .then((result) => {
            this.activeRequests--
            console.log("[v0] [Lemonway Queue] Request completed, active:", this.activeRequests)
            item.resolve(result)
          })
          .catch((error) => {
            this.activeRequests--
            console.log("[v0] [Lemonway Queue] Request failed, active:", this.activeRequests)
            item.reject(error)
          })
      }

      console.log("[v0] [Lemonway Queue] Queue processor finished")
      this.queueProcessorPromise = null
    })()
  }

  private generatePostmanToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  private async saveToRetryHistory(
    logId: number,
    attemptNumber: number,
    responseStatus: number,
    success: boolean,
    errorMessage: string | null,
    durationMs: number,
    responsePayload: any,
  ): Promise<void> {
    await sql`
      INSERT INTO "LemonwayApiCallRetryHistory" (
        api_call_log_id, attempt_number, response_status, success, error_message, duration_ms, response_payload
      ) VALUES (
        ${logId}, ${attemptNumber}, ${responseStatus}, ${success}, ${errorMessage}, ${durationMs}, ${JSON.stringify(responsePayload)}
      )
    `
  }

  private async isMethodEnabled(methodName: string): Promise<boolean> {
    // Placeholder for method enabling logic
    return true
  }
}

export async function retryFailedCall(
  logId: number,
): Promise<{ success: boolean; message: string; newLogId?: number }> {
  const config = await LemonwayClient.getConfig()
  if (!config) {
    return { success: false, message: "No hay configuración de Lemonway" }
  }

  const client = new LemonwayClient(config)
  return client.retryFailedCall(logId)
}

export async function processRetryQueue(): Promise<{ processed: number; succeeded: number; failed: number }> {
  const config = await LemonwayClient.getConfig()
  if (!config) {
    return { processed: 0, succeeded: 0, failed: 0 }
  }

  const client = new LemonwayClient(config)
  const retryConfig = await getRetryConfig()

  // Buscar logs pendientes de reintento
  const pendingLogs = await sql`
    SELECT id, endpoint, method, request_payload, retry_count
    FROM "LemonwayApiCallLog"
    WHERE retry_status = 'pending'
      AND (next_retry_at IS NULL OR next_retry_at <= NOW())
      AND (final_failure = false OR final_failure IS NULL)
    ORDER BY created_at ASC
    LIMIT 50
  `

  let succeeded = 0
  let failed = 0

  for (const log of pendingLogs) {
    const result = await client.retryFailedCall(log.id)
    if (result.success) {
      succeeded++
    } else {
      failed++
    }
  }

  return {
    processed: pendingLogs.length,
    succeeded,
    failed,
  }
}
