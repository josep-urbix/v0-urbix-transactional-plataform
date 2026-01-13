import { sql } from "@/lib/db"
import { queueProcessor } from "@/lib/lemonway-queue-processor"
import { emitEvent } from "@/lib/workflow-engine/engine"
import type { LemonwayAccountRequest } from "@/lib/types/lemonway-account-request"

export class LemonwayAccountWorkflow {
  /**
   * Create account in Lemonway via queue (URGENT priority)
   * Orchestrates: DB insertion → queue enqueue → workflow dispatch
   */
  static async createAccountPhase1(request: LemonwayAccountRequest, userId: string) {
    try {
      // 1. Insert request into queue
      const queueId = await queueProcessor.enqueue({
        priority: "URGENT",
        endpoint: "/api/lemonway/accounts/create-onboarding-session",
        http_method: "POST",
        request_payload: {
          individual: {
            firstName: request.first_name,
            lastName: request.last_name,
            birthDate: request.birth_date,
            email: request.email,
            birthCountry: request.birth_country,
            nationalities: request.nationalities,
            phoneNumber: request.phone,
          },
          profile: request.profile_type,
          walletId: request.id, // payment_accounts.id as wallet_id
        },
        wallet_id: request.id,
        account_id: request.id,
        operation_type: "ACCOUNT_CREATION_PHASE1",
        created_by: userId,
      })

      // 2. Update request status
      await sql`
        UPDATE investors.lemonway_account_requests
        SET 
          status = 'SUBMITTED',
          submitted_at = NOW(),
          queue_item_id = $1,
          kyc_1_status = 'IN_PROGRESS'
        WHERE id = $2
      `

      // 3. Dispatch workflow event
      await emitEvent("LEMONWAY_ACCOUNT_CREATION_STARTED", {
        request_id: request.id,
        queue_id: queueId,
        wallet_id: request.id,
        user_id: userId,
        timestamp: new Date().toISOString(),
      })

      return { success: true, queueId, message: "Account creation queued (URGENT)" }
    } catch (error) {
      console.error("[LemonwayAccountWorkflow] createAccountPhase1 error:", error)
      throw error
    }
  }

  /**
   * Initiate KYC verification in Lemonway via queue (NORMAL priority)
   * Orchestrates: KYC data persistence → queue enqueue → workflow dispatch
   */
  static async initiateKYCPhase2(request: LemonwayAccountRequest, userId: string) {
    try {
      // 1. Validate account is in KYC-1 Completo state
      if (request.kyc_1_status !== "KYC-1 Completo") {
        throw new Error(`Cannot initiate KYC: Account not in KYC-1 Completo state (current: ${request.kyc_1_status})`)
      }

      // 2. Insert to queue with NORMAL priority (not critical)
      const queueId = await queueProcessor.enqueue({
        priority: "NORMAL",
        endpoint: "/api/lemonway/onboardings/create-session",
        http_method: "POST",
        request_payload: {
          accountId: request.lemonway_wallet_id,
          individual: {
            firstName: request.first_name,
            lastName: request.last_name,
            birthDate: request.birth_date,
            email: request.email,
            birthCity: request.birth_city,
            birthCountry: request.birth_country,
            phoneNumber: request.phone,
            nationalities: request.nationalities,
            address: {
              street: request.street,
              city: request.city,
              postalCode: request.postal_code,
              country: request.country_residence,
              province: request.province,
            },
            taxCode: request.tax_code,
          },
          politicalExposure: request.pep_status
            ? {
                status: request.pep_status,
                position: request.pep_position,
                startDate: request.pep_start_date,
                endDate: request.pep_end_date,
              }
            : undefined,
          financialSituation: {
            professionalSituation: request.professional_situation,
            annualRevenue: request.annual_revenue,
            estimatedWealth: request.estimated_wealth,
            hasIFItax: request.has_ifi_tax,
          },
          originOfFunds: {
            sources: request.origin_of_funds,
            other: request.origin_of_funds_other,
          },
        },
        wallet_id: request.id,
        account_id: request.lemonway_wallet_id,
        operation_type: "ACCOUNT_KYC_PHASE2",
        created_by: userId,
      })

      // 3. Update request status
      await sql`
        UPDATE investors.lemonway_account_requests
        SET 
          status = 'PENDING_KYC',
          kyc_initiated_at = NOW(),
          queue_item_id = $1,
          kyc_2_status = 'IN_PROGRESS'
        WHERE id = $2
      `

      // 4. Dispatch workflow event
      await emitEvent("LEMONWAY_KYC_VERIFICATION_STARTED", {
        request_id: request.id,
        queue_id: queueId,
        wallet_id: request.id,
        lemonway_wallet_id: request.lemonway_wallet_id,
        user_id: userId,
        timestamp: new Date().toISOString(),
      })

      return { success: true, queueId, message: "KYC verification queued (NORMAL)" }
    } catch (error) {
      console.error("[LemonwayAccountWorkflow] initiateKYCPhase2 error:", error)
      throw error
    }
  }

  /**
   * Handle successful account creation from queue callback
   */
  static async handleAccountCreationSuccess(request: LemonwayAccountRequest, response: any) {
    try {
      const walletId = response.walletId || response.id

      // Update request with Lemonway wallet ID
      await sql`
        UPDATE investors.lemonway_account_requests
        SET 
          lemonway_wallet_id = $1,
          kyc_1_status = 'KYC-1 Completo',
          kyc_1_completed_at = NOW(),
          lemonway_response = $2::jsonb
        WHERE id = $3
      `

      // Emit workflow event for downstream processing
      await emitEvent("LEMONWAY_ACCOUNT_CREATED_SUCCESS", {
        request_id: request.id,
        wallet_id: walletId,
        response_data: response,
        timestamp: new Date().toISOString(),
      })

      return { success: true, walletId }
    } catch (error) {
      console.error("[LemonwayAccountWorkflow] handleAccountCreationSuccess error:", error)
      throw error
    }
  }

  /**
   * Handle KYC verification success from webhook/queue
   */
  static async handleKYCSuccess(request: LemonwayAccountRequest, event: any) {
    try {
      // Update request to KYC-2 Completo
      await sql`
        UPDATE investors.lemonway_account_requests
        SET 
          kyc_2_status = 'KYC-2 Completo',
          kyc_2_completed_at = NOW(),
          lemonway_event = $1::jsonb
        WHERE id = $2
      `

      // Emit workflow event for final processing
      await emitEvent("LEMONWAY_KYC_VERIFIED_SUCCESS", {
        request_id: request.id,
        wallet_id: request.lemonway_wallet_id,
        event_data: event,
        timestamp: new Date().toISOString(),
      })

      return { success: true }
    } catch (error) {
      console.error("[LemonwayAccountWorkflow] handleKYCSuccess error:", error)
      throw error
    }
  }
}

export const accountWorkflow = new LemonwayAccountWorkflow()
