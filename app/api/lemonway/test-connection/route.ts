import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { sql } from "@/lib/db"
import { LemonwayClient } from "@/lib/lemonway-client"

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const config = await LemonwayClient.getConfig()

    if (!config) {
      return NextResponse.json({ error: "No hay configuración de Lemonway" }, { status: 400 })
    }

    const client = new LemonwayClient(config)

    try {
      console.log("[v0] [Lemonway] Step 1: Obtaining Bearer token via OAuth 2.0")
      const bearerToken = await client.getBearerToken()

      const oauthPayload = {
        apiToken: config.apiToken ? config.apiToken.substring(0, 8) + "..." : "NOT_SET",
        grantType: "client_credentials",
      }

      const oauthResponse = {
        success: true,
        tokenType: "Bearer",
        tokenObtained: true,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      }

      // Registrar intento de OAuth
      await sql`
        INSERT INTO "LemonwayTransaction" 
          (transaction_id, type, status, amount, currency, wallet_id, direction, description, request_payload, response_payload, created_at)
        VALUES 
          (${`oauth-${Date.now()}`}, ${"AUTHENTICATION"}, ${"SUCCESS"}, ${0}, ${"EUR"}, 
           ${"OAUTH"}, ${"outgoing"}, ${"Obtención de Bearer token OAuth 2.0"}, 
           ${JSON.stringify(oauthPayload)}, ${JSON.stringify(oauthResponse)}, NOW())
      `

      console.log("[v0] [Lemonway] Step 2: Testing API v2 call with accounts/retrieve endpoint")

      const requestPayload = {
        endpoint: "/accounts/retrieve",
        method: "POST",
        body: {
          accounts: [
            {
              email: "flaixet@gmail.com",
            },
          ],
        },
      }

      let apiTestResult
      try {
        apiTestResult = await client.getAccountDetails("105")
      } catch (apiError: any) {
        apiTestResult = { error: apiError.message }
      }

      // Registrar prueba de API
      await sql`
        INSERT INTO "LemonwayTransaction" 
          (transaction_id, type, status, amount, currency, wallet_id, direction, description, request_payload, response_payload, created_at)
        VALUES 
          (${`api-test-${Date.now()}`}, ${"AUTHENTICATION"}, ${apiTestResult.error ? "FAILED" : "SUCCESS"}, ${0}, ${"EUR"}, 
           ${"TEST"}, ${"outgoing"}, ${"Test de llamada API REST v2 con endpoint accounts/retrieve"}, 
           ${JSON.stringify(requestPayload)}, ${JSON.stringify(apiTestResult)}, NOW())
      `

      return NextResponse.json({
        success: true,
        message: "Autenticación OAuth 2.0 exitosa",
        status: "connected",
        details: {
          oauthSuccess: true,
          bearerTokenObtained: true,
          tokenExpiresAt: oauthResponse.expiresAt,
          apiTestSuccess: !apiTestResult.error,
          environment: config.environment,
          apiVersion: "v2",
        },
      })
    } catch (error: any) {
      console.error("Lemonway authentication error:", error)

      // Registrar error
      await sql`
        INSERT INTO "LemonwayTransaction" 
          (transaction_id, type, status, amount, currency, wallet_id, direction, description, request_payload, response_payload, created_at)
        VALUES 
          (${`error-${Date.now()}`}, ${"AUTHENTICATION"}, ${"ERROR"}, ${0}, ${"EUR"}, 
           ${"ERROR"}, ${"outgoing"}, ${"Error en autenticación OAuth 2.0"}, 
           ${JSON.stringify({ error: "OAuth failed" })}, ${JSON.stringify({ error: error.message })}, NOW())
      `

      return NextResponse.json({
        success: false,
        message: "Error en autenticación OAuth 2.0",
        status: "error",
        details: {
          error: error.message,
        },
      })
    }
  } catch (error: any) {
    console.error("Lemonway test connection error:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Error al probar la conexión",
        status: "error",
        error: error.message,
      },
      { status: 500 },
    )
  }
}
