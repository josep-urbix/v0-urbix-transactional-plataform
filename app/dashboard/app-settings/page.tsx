import { getSession, checkPermission } from "@/lib/auth"
import { HubSpotTokenSettings } from "@/components/hubspot-token-settings"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { sql } from "@/lib/db"
import { WebhookApiKeySettings } from "@/components/webhook-api-key-settings"
import { redirect } from "next/navigation"

export const metadata = {
  title: "Configuración de la Aplicación - URBIX",
  description: "Gestionar tokens, secrets y configuración global",
}

export const dynamic = "force-dynamic"

async function getTokenInfo() {
  try {
    const result = await sql`
      SELECT value, "updatedAt" 
      FROM "AppConfig" 
      WHERE key = 'hubspot_access_token'
      LIMIT 1
    `

    const dbToken = result[0]?.value
    const envToken = process.env.HUBSPOT_ACCESS_TOKEN

    const hasToken = !!(dbToken || envToken)
    const token = dbToken || envToken
    const tokenSource = dbToken ? "database" : envToken ? "environment" : null
    const maskedToken = token ? `${"*".repeat(Math.max(0, token.length - 4))}${token.slice(-4)}` : null

    return {
      hasToken,
      maskedToken,
      tokenSource,
      updatedAt: result[0]?.updatedAt || null,
    }
  } catch (error) {
    console.error("Error fetching token info:", error)
    return null
  }
}

async function getWebhookKeyInfo() {
  try {
    const result = await sql`
      SELECT value, "updatedAt" 
      FROM "AppConfig" 
      WHERE key = 'webhook_api_key'
      LIMIT 1
    `

    const dbKey = result[0]?.value
    const envKey = process.env.HUBSPOT_WEBHOOK_SECRET

    const hasKey = !!(dbKey || envKey)
    const key = dbKey || envKey
    const keySource = dbKey ? "database" : envKey ? "environment" : null
    const maskedKey = key
      ? key.length > 8
        ? `${key.slice(0, 4)}${"*".repeat(key.length - 8)}${key.slice(-4)}`
        : "****"
      : null

    return {
      hasKey,
      maskedKey,
      keySource,
      updatedAt: result[0]?.updatedAt || null,
    }
  } catch (error) {
    console.error("Error fetching webhook key info:", error)
    return null
  }
}

export default async function AppSettingsPage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  const canManageSettings = await checkPermission(session.user.role, "settings", "update")
  if (!canManageSettings) {
    redirect("/dashboard/transactions")
  }

  const tokenInfo = await getTokenInfo()
  const webhookKeyInfo = await getWebhookKeyInfo()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configuración de la Aplicación</h2>
        <p className="text-muted-foreground">Gestiona tokens, secrets y configuración global del sistema</p>
      </div>

      {!tokenInfo?.hasToken && (
        <Alert variant="destructive">
          <svg
            className="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <AlertTitle>No hay Token de Acceso de HubSpot Configurado</AlertTitle>
          <AlertDescription>
            Por favor configura un token de acceso de HubSpot para que los webhooks y llamadas API funcionen
            correctamente.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Configuración de HubSpot</CardTitle>
          <CardDescription>
            Gestiona tu token de acceso de HubSpot Private App. Este token se usa para todas las interacciones API con
            HubSpot.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HubSpotTokenSettings initialTokenInfo={tokenInfo} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seguridad de Webhooks</CardTitle>
          <CardDescription>
            Configura la API key para asegurar las peticiones de webhooks de HubSpot (Nombre del secret:{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-xs">agendas</code>)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <WebhookApiKeySettings initialKeyInfo={webhookKeyInfo} />

          <Alert>
            <AlertDescription className="text-xs space-y-2">
              <p className="font-medium">Cómo configurar en HubSpot:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Ve a Settings - Integrations - Private Apps - Webhooks</li>
                <li>Crea o edita un webhook para Engagements - Meeting</li>
                <li>
                  Establece la URL a:{" "}
                  <code className="bg-muted px-1 py-0.5 rounded">
                    https://integrations.urbix.es/api/hubspot/meetings/webhook
                  </code>
                </li>
                <li>
                  Añade un header personalizado:{" "}
                  <code className="bg-muted px-1 py-0.5 rounded">agendas: [tu-api-key]</code>
                </li>
              </ol>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Acerca de HubSpot Private Apps</CardTitle>
          <CardDescription>Cómo crear y gestionar tu token de acceso de HubSpot</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Para crear un token de acceso de HubSpot Private App:</p>
          <ol className="list-decimal list-inside space-y-2 ml-2">
            <li>Ve a la configuración de tu cuenta de HubSpot</li>
            <li>Navega a Integrations - Private Apps</li>
            <li>Haz clic en Create a private app</li>
            <li>
              Otorga los siguientes scopes:
              <ul className="list-disc list-inside ml-6 mt-1">
                <li>crm.objects.contacts.write</li>
                <li>crm.objects.contacts.read</li>
                <li>crm.schemas.contacts.read</li>
                <li>sales-email-read</li>
              </ul>
            </li>
            <li>Copia el token de acceso generado y pégalo arriba</li>
          </ol>
          <p className="pt-2 font-medium text-foreground">Nota de Seguridad:</p>
          <p>
            El token se almacena de forma segura en la base de datos y nunca se registra en los logs de transacciones.
            Solo los últimos 4 caracteres se muestran en la interfaz.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
