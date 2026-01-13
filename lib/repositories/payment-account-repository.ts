import { sql } from "@/lib/db"
import type {
  PaymentAccount,
  PaymentAccountFilters,
  PaymentAccountStats,
  LemonwayAccountResponse,
} from "@/lib/types/payment-account"

export class PaymentAccountRepository {
  /**
   * Map Lemonway API response to our PaymentAccount interface
   * Updated to handle the REAL structure from Lemonway API
   */
  static mapLemonwayToPaymentAccount(lemonwayAccount: LemonwayAccountResponse): PaymentAccount | null {
    if (!lemonwayAccount.id) {
      console.log("[PaymentAccountRepo] Skipping account with null id:", JSON.stringify(lemonwayAccount))
      return null
    }

    // Convert balance from cents to decimal (1802300 -> 18023.00)
    const balance = lemonwayAccount.balance / 100

    // Map status number to status string
    let status: "active" | "blocked" | "closed" = "active"
    if (lemonwayAccount.isblocked) {
      status = "blocked"
    } else if (lemonwayAccount.status === 6) {
      status = "active"
    }

    return {
      accountId: lemonwayAccount.id,
      email: lemonwayAccount.email || undefined,
      status: lemonwayAccount.status != null ? String(lemonwayAccount.status) : "0",
      accountType: lemonwayAccount.accountType != null ? String(lemonwayAccount.accountType) : "0",
      balance,
      currency: "EUR",
      kycStatus: lemonwayAccount.kycStatus != null ? String(lemonwayAccount.kycStatus) : "none",
      firstName: lemonwayAccount.firstname,
      lastName: lemonwayAccount.lastname,
      companyName: lemonwayAccount.company?.name,
      companyWebsite: lemonwayAccount.company?.websiteUrl || undefined,
      companyDescription: lemonwayAccount.company?.description || undefined,
      companyIdentificationNumber: lemonwayAccount.company?.identificationNumber || undefined,
      phoneNumber: lemonwayAccount.phoneNumber,
      mobileNumber: lemonwayAccount.mobileNumber,
      address: lemonwayAccount.adresse?.street,
      city: lemonwayAccount.adresse?.city,
      postalCode: lemonwayAccount.adresse?.postCode,
      country: lemonwayAccount.adresse?.country,
      birthDate: lemonwayAccount.birth?.date || undefined,
      birthCity: lemonwayAccount.birth?.city || undefined,
      birthCountry: lemonwayAccount.birth?.Country || undefined,
      clientTitle: lemonwayAccount.clientTitle || undefined,
      nationality: lemonwayAccount.nationality || undefined,
      internalId: lemonwayAccount.internalId || undefined,
      isDebtor: lemonwayAccount.isDebtor || false,
      isBlocked: lemonwayAccount.isblocked || false,
      payerOrBeneficiary: lemonwayAccount.payerOrBeneficiary,
      isPayer: lemonwayAccount.payerOrBeneficiary === 1,
      canReceiveMoney: true,
      canSendMoney: !lemonwayAccount.isblocked,
      rawData: lemonwayAccount,
      lastSyncAt: new Date(),
    }
  }

  /**
   * Map Lemonway KYC status number to our enum
   */
  private static mapKycStatus(status?: number): "none" | "pending" | "validated" | "refused" {
    switch (status) {
      case 0:
        return "none"
      case 1:
        return "pending"
      case 2:
        return "validated"
      case 3:
        return "refused"
      default:
        return "none"
    }
  }

  /**
   * Create or update a payment account from Lemonway data
   */
  static async upsert(account: PaymentAccount): Promise<PaymentAccount> {
    let birthDateParsed: string | null = null
    if (account.birthDate) {
      // If it's already a Date object or ISO string from DB, convert to ISO date string
      if (account.birthDate instanceof Date) {
        birthDateParsed = account.birthDate.toISOString().split("T")[0]
      } else if (typeof account.birthDate === "string") {
        // Check if it's in DD/MM/YYYY format (from Lemonway)
        if (account.birthDate.includes("/")) {
          const parts = account.birthDate.split("/")
          if (parts.length === 3) {
            birthDateParsed = `${parts[2]}-${parts[1]}-${parts[0]}`
          }
        } else {
          // Already in ISO format or similar
          birthDateParsed = account.birthDate.split("T")[0]
        }
      }
    }

    const result = await sql`
      INSERT INTO payments.payment_accounts (
        account_id, email, status, account_type, balance, currency,
        kyc_status, first_name, last_name, 
        company_name, company_website, company_description, company_identification_number,
        phone_number, mobile_number, address, city, postal_code, country,
        birth_date, birth_city, birth_country,
        client_title, nationality, internal_id,
        is_debtor, is_blocked, payer_or_beneficiary,
        is_payer, can_receive_money, can_send_money,
        raw_data, last_sync_at, metadata
      ) VALUES (
        ${account.accountId}, ${account.email}, ${account.status}, ${account.accountType},
        ${account.balance}, ${account.currency},
        ${account.kycStatus}, ${account.firstName}, ${account.lastName}, 
        ${account.companyName}, ${account.companyWebsite}, ${account.companyDescription}, ${account.companyIdentificationNumber},
        ${account.phoneNumber}, ${account.mobileNumber}, ${account.address}, ${account.city}, ${account.postalCode}, ${account.country},
        ${birthDateParsed}, ${account.birthCity}, ${account.birthCountry},
        ${account.clientTitle}, ${account.nationality}, ${account.internalId},
        ${account.isDebtor || false}, ${account.isBlocked || false}, ${account.payerOrBeneficiary},
        ${account.isPayer || true}, ${account.canReceiveMoney || true}, ${account.canSendMoney || true},
        ${JSON.stringify(account.rawData || {})}, NOW(), ${JSON.stringify(account.metadata || {})}
      )
      ON CONFLICT (account_id) 
      DO UPDATE SET
        email = EXCLUDED.email,
        status = EXCLUDED.status,
        account_type = EXCLUDED.account_type,
        balance = EXCLUDED.balance,
        currency = EXCLUDED.currency,
        kyc_status = EXCLUDED.kyc_status,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        company_name = EXCLUDED.company_name,
        company_website = EXCLUDED.company_website,
        company_description = EXCLUDED.company_description,
        company_identification_number = EXCLUDED.company_identification_number,
        phone_number = EXCLUDED.phone_number,
        mobile_number = EXCLUDED.mobile_number,
        address = EXCLUDED.address,
        city = EXCLUDED.city,
        postal_code = EXCLUDED.postal_code,
        country = EXCLUDED.country,
        birth_date = EXCLUDED.birth_date,
        birth_city = EXCLUDED.birth_city,
        birth_country = EXCLUDED.birth_country,
        client_title = EXCLUDED.client_title,
        nationality = EXCLUDED.nationality,
        internal_id = EXCLUDED.internal_id,
        is_debtor = EXCLUDED.is_debtor,
        is_blocked = EXCLUDED.is_blocked,
        payer_or_beneficiary = EXCLUDED.payer_or_beneficiary,
        is_payer = EXCLUDED.is_payer,
        can_receive_money = EXCLUDED.can_receive_money,
        can_send_money = EXCLUDED.can_send_money,
        raw_data = EXCLUDED.raw_data,
        last_sync_at = EXCLUDED.last_sync_at,
        updated_at = NOW()
      RETURNING *
    `

    return this.mapDbRowToPaymentAccount(result[0])
  }

  /**
   * Get a payment account by account ID
   */
  static async getByAccountId(accountId: string): Promise<PaymentAccount | null> {
    const result = await sql`
      SELECT * FROM payments.payment_accounts
      WHERE account_id = ${accountId}
    `

    return result.length > 0 ? this.mapDbRowToPaymentAccount(result[0]) : null
  }

  /**
   * Get a payment account by email
   */
  static async getByEmail(email: string): Promise<PaymentAccount | null> {
    const result = await sql`
      SELECT * FROM payments.payment_accounts
      WHERE email = ${email}
    `

    return result.length > 0 ? this.mapDbRowToPaymentAccount(result[0]) : null
  }

  /**
   * List payment accounts with filters
   */
  static async list(filters: PaymentAccountFilters = {}, sqlLogger?: any): Promise<PaymentAccount[]> {
    const sqlClient = sqlLogger || sql

    try {
      // Build WHERE clauses
      const whereClauses: string[] = []
      const params: any[] = []
      let paramCount = 1

      if (filters.accountId) {
        whereClauses.push(`account_id = $${paramCount++}`)
        params.push(filters.accountId)
      }

      if (filters.email) {
        whereClauses.push(`email = $${paramCount++}`)
        params.push(filters.email)
      }

      if (filters.status) {
        whereClauses.push(`status = $${paramCount++}`)
        params.push(filters.status)
      }

      if (filters.kycStatus) {
        whereClauses.push(`kyc_status = $${paramCount++}`)
        params.push(filters.kycStatus)
      }

      if (filters.country) {
        whereClauses.push(`country = $${paramCount++}`)
        params.push(filters.country)
      }

      const whereSQL = whereClauses.length > 0 ? whereClauses.join(" AND ") : "1=1"
      const limit = filters.limit || 100
      const offset = filters.offset || 0

      let result
      if (sqlLogger) {
        params.push(limit, offset)
        result = await sqlClient.query(
          `SELECT * FROM payments.payment_accounts WHERE ${whereSQL} ORDER BY created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`,
          params,
        )
      } else {
        let query = sqlClient`SELECT * FROM payments.payment_accounts WHERE 1=1`

        if (filters.accountId) {
          query = sqlClient`${query} AND account_id = ${filters.accountId}`
        }

        if (filters.email) {
          query = sqlClient`${query} AND email = ${filters.email}`
        }

        if (filters.status) {
          query = sqlClient`${query} AND status = ${filters.status}`
        }

        if (filters.kycStatus) {
          query = sqlClient`${query} AND kyc_status = ${filters.kycStatus}`
        }

        if (filters.country) {
          query = sqlClient`${query} AND country = ${filters.country}`
        }

        result = await sqlClient`
          SELECT * FROM payments.payment_accounts
          WHERE 1=1
          ${filters.accountId ? sqlClient`AND account_id = ${filters.accountId}` : sqlClient``}
          ${filters.email ? sqlClient`AND email = ${filters.email}` : sqlClient``}
          ${filters.status ? sqlClient`AND status = ${filters.status}` : sqlClient``}
          ${filters.kycStatus ? sqlClient`AND kyc_status = ${filters.kycStatus}` : sqlClient``}
          ${filters.country ? sqlClient`AND country = ${filters.country}` : sqlClient``}
          ORDER BY created_at DESC
          LIMIT ${limit}
          OFFSET ${offset}
        `
      }

      return result.map((row) => this.mapDbRowToPaymentAccount(row))
    } catch (error) {
      console.error("[PaymentAccountRepo] List error:", error)
      throw error
    }
  }

  /**
   * Get statistics about payment accounts
   */
  static async getStats(sqlLogger?: any): Promise<PaymentAccountStats> {
    const sqlClient = sqlLogger || sql

    let result
    if (sqlLogger) {
      result = await sqlClient.query(`
        SELECT
          COUNT(*) as total_accounts,
          COUNT(*) FILTER (WHERE status = 'active') as active_accounts,
          COUNT(*) FILTER (WHERE status = 'blocked') as blocked_accounts,
          COALESCE(SUM(balance), 0) as total_balance,
          COALESCE(AVG(balance), 0) as average_balance,
          COUNT(*) FILTER (WHERE status = '6') as kyc2_count,
          COUNT(*) FILTER (WHERE status = '5') as kyc1_count,
          COUNT(*) FILTER (WHERE account_type = '0') as persona_fisica_count,
          COUNT(*) FILTER (WHERE account_type = '1') as persona_juridica_count,
          COUNT(*) FILTER (WHERE status = '10') as blocked_status_count,
          COUNT(*) FILTER (WHERE status = '12') as closed_status_count
        FROM payments.payment_accounts
      `)
    } else {
      result = await sqlClient`
        SELECT
          COUNT(*) as total_accounts,
          COUNT(*) FILTER (WHERE status = 'active') as active_accounts,
          COUNT(*) FILTER (WHERE status = 'blocked') as blocked_accounts,
          COALESCE(SUM(balance), 0) as total_balance,
          COALESCE(AVG(balance), 0) as average_balance,
          COUNT(*) FILTER (WHERE status = '6') as kyc2_count,
          COUNT(*) FILTER (WHERE status = '5') as kyc1_count,
          COUNT(*) FILTER (WHERE account_type = '0') as persona_fisica_count,
          COUNT(*) FILTER (WHERE account_type = '1') as persona_juridica_count,
          COUNT(*) FILTER (WHERE status = '10') as blocked_status_count,
          COUNT(*) FILTER (WHERE status = '12') as closed_status_count
        FROM payments.payment_accounts
      `
    }

    const row = result[0]

    return {
      totalAccounts: Number(row.total_accounts),
      activeAccounts: Number(row.active_accounts),
      blockedAccounts: Number(row.blocked_status_count), // Now counts status=10 instead of is_blocked
      totalBalance: Number(row.total_balance),
      averageBalance: Number(row.average_balance),
      byKycStatus: {
        validated: Number(row.kyc2_count), // KYC 2 count (status=6)
        pending: Number(row.kyc1_count), // KYC 1 count (status=5)
        none: 0,
        refused: 0,
      },
      byAccountType: {
        personaFisica: Number(row.persona_fisica_count), // accountType=0
        personaJuridica: Number(row.persona_juridica_count), // accountType=1
      },
      byBlockedStatus: {
        // New field for blocked and closed counts
        blocked: Number(row.blocked_status_count), // status=10
        closed: Number(row.closed_status_count), // status=12
      },
    }
  }

  /**
   * Sync multiple accounts from Lemonway API response
   */
  static async syncFromLemonway(lemonwayAccounts: LemonwayAccountResponse[]): Promise<PaymentAccount[]> {
    const results: PaymentAccount[] = []

    for (const lemonwayAccount of lemonwayAccounts) {
      const account = this.mapLemonwayToPaymentAccount(lemonwayAccount)
      if (!account) {
        console.log("[PaymentAccountRepo] Skipped account with null ID")
        continue
      }

      const saved = await PaymentAccountRepository.upsert(account)
      results.push(saved)
    }

    return results
  }

  /**
   * Delete a payment account (soft delete by marking as closed)
   */
  static async delete(accountId: string): Promise<boolean> {
    const result = await sql`
      UPDATE payments.payment_accounts
      SET status = 'closed', updated_at = NOW()
      WHERE account_id = ${accountId}
    `

    return result.count > 0
  }

  /**
   * Map database row to PaymentAccount interface
   */
  private static mapDbRowToPaymentAccount(row: any): PaymentAccount {
    return {
      id: row.id,
      accountId: row.account_id,
      email: row.email,
      status: row.status,
      accountType: row.account_type,
      balance: Number(row.balance),
      currency: row.currency,
      kycStatus: row.kyc_status,
      firstName: row.first_name,
      lastName: row.last_name,
      companyName: row.company_name,
      companyWebsite: row.company_website,
      companyDescription: row.company_description,
      companyIdentificationNumber: row.company_identification_number,
      phoneNumber: row.phone_number,
      mobileNumber: row.mobile_number,
      address: row.address,
      city: row.city,
      postalCode: row.postal_code,
      country: row.country,
      birthDate: row.birth_date,
      birthCity: row.birth_city,
      birthCountry: row.birth_country,
      clientTitle: row.client_title,
      nationality: row.nationality,
      internalId: row.internal_id,
      isDebtor: row.is_debtor,
      isBlocked: row.is_blocked,
      payerOrBeneficiary: row.payer_or_beneficiary,
      isPayer: row.is_payer,
      canReceiveMoney: row.can_receive_money,
      canSendMoney: row.can_send_money,
      rawData: row.raw_data,
      lastSyncAt: row.last_sync_at ? new Date(row.last_sync_at) : undefined,
      createdAt: row.created_at ? new Date(row.created_at) : undefined,
      updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
      metadata: row.metadata || {},
    }
  }

  /**
   * Create or update a payment account from Lemonway data
   * Using instance method instead of static
   */
  async upsertFromLemonway(lemonwayAccount: LemonwayAccountResponse): Promise<PaymentAccount | null> {
    const mapped = PaymentAccountRepository.mapLemonwayToPaymentAccount(lemonwayAccount)
    if (!mapped) {
      console.log("[PaymentAccountRepo] Skipping account with null ID")
      return null
    }
    return await PaymentAccountRepository.upsert(mapped)
  }
}
