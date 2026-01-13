import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { LemonwayClient } from "@/lib/lemonway-client"

export async function GET() {
  const results = {
    step1_lemonway_connection: null as any,
    step2_account_data: null as any,
    step3_database_insert: null as any,
    step4_database_read: null as any,
    errors: [] as string[],
  }

  try {
    // PASO 1: Obtener configuración y probar conexión con Lemonway
    const config = await LemonwayClient.getConfig()

    if (!config) {
      results.errors.push("No Lemonway configuration found in database")
      return NextResponse.json(
        {
          success: false,
          message: "❌ No hay configuración de Lemonway",
          results,
        },
        { status: 500 },
      )
    }

    const client = new LemonwayClient(config)

    // Test with account ID 104 (from your successful test)
    const lemonwayData = await client.getAccountDetails("104", "kenton_test@lemonway.fr")

    results.step1_lemonway_connection = {
      success: true,
      data: lemonwayData,
    }

    // PASO 2: Extraer datos de la cuenta
    const accounts = lemonwayData.accounts || []
    if (accounts.length === 0) {
      results.errors.push("No accounts found in Lemonway response")
      return NextResponse.json(
        {
          success: false,
          message: "❌ No se encontraron cuentas en Lemonway",
          results,
        },
        { status: 500 },
      )
    }

    const account = accounts.find((acc: any) => acc.id !== null)
    if (!account) {
      results.errors.push("No valid account with non-null ID found")
      results.step2_account_data = { allAccounts: accounts }
      return NextResponse.json(
        {
          success: false,
          message: "❌ Todas las cuentas tienen ID null",
          results,
        },
        { status: 500 },
      )
    }

    results.step2_account_data = account

    // PASO 3: Insertar en la base de datos
    const countryCode = account.adresse?.country || null

    const insertResult = await sql`
      INSERT INTO payments.payment_accounts (
        account_id,
        email,
        balance,
        status,
        kyc_status,
        kyc_level,
        account_type,
        first_name,
        last_name,
        company_name,
        phone_number,
        mobile_number,
        address,
        city,
        postal_code,
        country,
        is_debtor,
        is_payer,
        raw_data,
        last_sync_at
      ) VALUES (
        ${account.id},
        ${account.email || null},
        ${Number.parseFloat(account.balance || "0") / 100},
        ${String(account.status || 0)},
        ${String(account.kycStatus || 0)},
        ${account.kycLevel || 0},
        ${String(account.accountType || 0)},
        ${account.firstname || null},
        ${account.lastname || null},
        ${account.company?.name || null},
        ${account.phoneNumber || null},
        ${account.mobileNumber || null},
        ${account.adresse?.street || null},
        ${account.adresse?.city || null},
        ${account.adresse?.postCode || null},
        ${countryCode},
        ${account.isDebtor || false},
        ${account.payerOrBeneficiary === 1},
        ${JSON.stringify(account)},
        NOW()
      )
      ON CONFLICT (account_id) 
      DO UPDATE SET
        email = EXCLUDED.email,
        balance = EXCLUDED.balance,
        status = EXCLUDED.status,
        kyc_status = EXCLUDED.kyc_status,
        kyc_level = EXCLUDED.kyc_level,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        raw_data = EXCLUDED.raw_data,
        last_sync_at = EXCLUDED.last_sync_at,
        updated_at = NOW()
      RETURNING *
    `

    results.step3_database_insert = insertResult[0]

    // PASO 4: Leer de la base de datos para confirmar
    const readResult = await sql`
      SELECT * FROM payments.payment_accounts 
      WHERE account_id = ${account.id}
    `

    results.step4_database_read = readResult[0]

    return NextResponse.json({
      success: true,
      message: "✅ Todo funciona correctamente",
      results,
    })
  } catch (error: any) {
    console.error("Error in full sync test:", error)
    results.errors.push(error.message)
    return NextResponse.json(
      {
        success: false,
        message: "❌ Error en el proceso",
        results,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
