// Tipos compartidos para solicitudes de creación de cuentas Lemonway
// Trazabilidad: Especificación Sección 8.1

export interface LemonwayAccountRequest {
  id: string
  request_reference: string
  status: "DRAFT" | "SUBMITTED" | "KYC-1 Completo" | "KYC-2 Completo" | "ACTIVE" | "INVALID" | "REJECTED" | "CANCELLED"
  validation_status: "PENDING" | "VALID" | "INVALID"
  validation_errors?: Record<string, string>

  // Fase 1: Datos personales
  first_name: string
  last_name: string
  birth_date: string
  email: string
  phone_number?: string
  birth_country_id: string
  nationality_ids: string[]
  profile_type: "PROJECT_HOLDER" | "DONOR" | "STUDENT" | "JOB_SEEKER" | "PAYER"

  // Fase 1: Datos de dirección
  street?: string
  city?: string
  postal_code?: string
  country_id?: string
  province?: string

  // Fase 2: Datos KYC/AML
  occupation?: string
  annual_income?: string
  estimated_wealth?: string
  pep_status?: "no" | "yes" | "close_to_pep"
  pep_position?: string
  pep_start_date?: string
  pep_end_date?: string
  origin_of_funds?: string[]
  has_ifi_tax?: boolean

  // Linking
  payment_account_id?: string
  lemonway_wallet_id?: string
  virtual_account_id?: string

  // Error tracking
  lemonway_error_message?: string
  retry_count: number

  // Auditoría
  created_by_user_id: string
  created_at: string
  updated_at: string
  submitted_at?: string
  kyc_1_completed_at?: string
  kyc_2_completed_at?: string
}

export interface Country {
  id: string
  code_iso2: string
  code_iso3: string
  name_en: string
  name_es: string
  region: string
  is_eu_member: boolean
  is_restricted: boolean
  default_currency: string
  is_active: boolean
}
