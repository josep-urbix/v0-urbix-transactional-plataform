/**
 * Payment Account interface matching the Lemonway DirectKit API response
 * and our payments.payment_accounts table structure
 */
export interface PaymentAccount {
  id?: number

  // Lemonway identifiers
  accountId: string
  email?: string
  internalId?: number

  // Status and type
  status: "active" | "blocked" | "closed"
  accountType?: string
  clientTitle?: string

  // Balance
  balance: number
  currency: string

  // KYC
  kycStatus?: "none" | "pending" | "validated" | "refused"

  // Owner information
  firstName?: string
  lastName?: string
  nationality?: string

  // Birth information
  birthDate?: string
  birthCity?: string
  birthCountry?: string

  // Company information
  companyName?: string
  companyWebsite?: string
  companyDescription?: string
  companyIdentificationNumber?: string

  // Contact
  phoneNumber?: string
  mobileNumber?: string
  address?: string
  city?: string
  postalCode?: string
  country?: string

  // Permissions
  isDebtor?: boolean
  isBlocked?: boolean
  payerOrBeneficiary?: number
  isPayer?: boolean
  canReceiveMoney?: boolean
  canSendMoney?: boolean

  // Technical
  rawData?: any
  lastSyncAt?: Date
  createdAt?: Date
  updatedAt?: Date
  metadata?: Record<string, any>
}

/**
 * Lemonway API response structure for accounts/retrieve endpoint
 */
export interface LemonwayAccountResponse {
  id: string | null
  internalId: number
  clientTitle?: string
  firstname?: string
  lastname?: string
  balance: number // In cents (e.g., 1802300 = 18023.00 EUR)
  email: string | null
  status: number // Status code
  isblocked: boolean
  accountType: number
  company?: {
    name: string
    description: string
    websiteUrl: string
    identificationNumber: string
  }
  adresse?: {
    street: string
    postCode: string
    city: string
    country: string
  } | null
  birth?: {
    date: string
    city: string
    Country: string
  } | null
  nationality?: string
  phoneNumber?: string
  mobileNumber?: string
  isDebtor: boolean
  payerOrBeneficiary: number
  [key: string]: any
}

/**
 * Filter options for querying payment accounts
 */
export interface PaymentAccountFilters {
  accountId?: string
  email?: string
  status?: string
  kycStatus?: string
  minBalance?: number
  maxBalance?: number
  country?: string
  limit?: number
  offset?: number
}

/**
 * Statistics for payment accounts
 */
export interface PaymentAccountStats {
  totalAccounts: number
  activeAccounts: number
  blockedAccounts: number
  totalBalance: number
  averageBalance: number
  byKycStatus: {
    none: number
    pending: number
    validated: number
    refused: number
  }
  byAccountType?: {
    personaFisica: number
    personaJuridica: number
  }
  byBlockedStatus?: {
    blocked: number
    closed: number
  }
}
