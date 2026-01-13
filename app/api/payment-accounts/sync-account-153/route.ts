import { sql } from "@/lib/db"

export async function POST() {
  try {
    console.log("Starting manual sync for account 153")
    const payload = {
      accounts: [
        {
          id: "153",
          email: "flaixet+212@gmail.com",
          firstname: "Belen",
          lastname: "Lopez Vazquez",
          balance: 100000,
          status: 6,
          accountType: 0,
          phoneNumber: "",
          mobileNumber: "0612121212",
          isDebtor: false,
          isblocked: false,
          internalId: 34,
          clientTitle: "U",
          nationality: "FRA",
          payerOrBeneficiary: 1,
          adresse: {
            street: "Rue de la sandbox",
            city: "Sandbox city",
            postCode: "99999",
            country: "ESP",
          },
          birth: {
            date: "30/10/2003",
            city: "Rue de la sandbox",
            Country: "ESP",
          },
          company: {
            name: "",
            websiteUrl: "",
            description: "",
            identificationNumber: "",
          },
        },
      ],
    }

    const account = payload.accounts[0]
    console.log("Processing account:", account.id)

    // Convertir fecha de DD/MM/YYYY a YYYY-MM-DD
    let birthDate = null
    if (account.birth?.date) {
      const [day, month, year] = account.birth.date.split("/")
      birthDate = `${year}-${month}-${day}`
      console.log("Converted birth date:", birthDate)
    }

    console.log("Executing SQL upsert...")
    const result = await sql`
      INSERT INTO payments.payment_accounts (
        account_id, email, first_name, last_name, balance, status, account_type,
        phone_number, mobile_number, is_debtor, is_blocked, internal_id, client_title,
        nationality, payer_or_beneficiary, address, city, postal_code, country,
        birth_date, birth_city, birth_country, company_name, company_website,
        company_description, company_identification_number, kyc_status, kyc_level,
        metadata, raw_data, last_sync_at
      ) VALUES (
        ${account.id}, ${account.email}, ${account.firstname}, ${account.lastname},
        ${account.balance / 100}, ${String(account.status)}, ${String(account.accountType)},
        ${account.phoneNumber || null}, ${account.mobileNumber || null}, ${account.isDebtor},
        ${account.isblocked}, ${account.internalId}, ${account.clientTitle || null},
        ${account.nationality || null}, ${account.payerOrBeneficiary},
        ${account.adresse?.street || null}, ${account.adresse?.city || null},
        ${account.adresse?.postCode || null}, ${account.adresse?.country || null},
        ${birthDate}, ${account.birth?.city || null}, ${account.birth?.Country || null},
        ${account.company?.name || null}, ${account.company?.websiteUrl || null},
        ${account.company?.description || null}, ${account.company?.identificationNumber || null},
        ${"none"}, ${0}, ${null}, ${JSON.stringify(account)}, NOW()
      )
      ON CONFLICT (account_id) DO UPDATE SET
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        balance = EXCLUDED.balance,
        status = EXCLUDED.status,
        account_type = EXCLUDED.account_type,
        phone_number = EXCLUDED.phone_number,
        mobile_number = EXCLUDED.mobile_number,
        is_debtor = EXCLUDED.is_debtor,
        is_blocked = EXCLUDED.is_blocked,
        internal_id = EXCLUDED.internal_id,
        client_title = EXCLUDED.client_title,
        nationality = EXCLUDED.nationality,
        payer_or_beneficiary = EXCLUDED.payer_or_beneficiary,
        address = EXCLUDED.address,
        city = EXCLUDED.city,
        postal_code = EXCLUDED.postal_code,
        country = EXCLUDED.country,
        birth_date = EXCLUDED.birth_date,
        birth_city = EXCLUDED.birth_city,
        birth_country = EXCLUDED.birth_country,
        company_name = EXCLUDED.company_name,
        company_website = EXCLUDED.company_website,
        company_description = EXCLUDED.company_description,
        company_identification_number = EXCLUDED.company_identification_number,
        raw_data = EXCLUDED.raw_data,
        last_sync_at = NOW()
    `

    console.log("SQL result:", result)
    console.log("Account 153 synced successfully")

    return Response.json({
      success: true,
      message: "Cuenta 153 sincronizada correctamente",
      account_id: account.id,
    })
  } catch (error) {
    console.error("Error syncing account 153:", error)
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  return POST()
}
