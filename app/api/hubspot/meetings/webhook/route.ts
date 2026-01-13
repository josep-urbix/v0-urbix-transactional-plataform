import { type NextRequest, NextResponse } from "next/server"
import { hubspotClient } from "@/lib/hubspot-client"
import {
  logTransaction,
  logTransactionWithId,
  updateTransactionStatus,
  generateCorrelationId,
} from "@/lib/transaction-logger"
import { extractUrlsFromMeetingBody } from "@/lib/url-extractor"
import { addSecurityHeaders, sanitizeError } from "@/lib/api-security"
import { secureLog, secureError } from "@/lib/security"

interface HubSpotWebhookEvent {
  objectId?: string | number
  hs_object_id?: string | number
  id?: string | number
  hs_meeting_title?: string
  hs_meeting_body?: string
  hs_meeting_start_time?: number
  hs_meeting_end_time?: number
  hs_meeting_source?: string
  hs_engagement_id?: string | number
  engagement_id?: string | number
  hs_unique_id?: string | number
  [key: string]: any
}

async function processMeetingEvent(event: HubSpotWebhookEvent, correlationId: string) {
  const possibleIds = [
    event.objectId,
    event.hs_object_id,
    event.id,
    event.hs_engagement_id,
    event.engagement_id,
    event.hs_unique_id,
  ].filter(Boolean)

  const meetingId = possibleIds.length > 0 ? String(possibleIds[0]) : ""

  secureLog("[Webhook] Processing meeting event", { meetingId, correlationId })

  await logTransaction({
    direction: "INCOMING",
    type: "WEBHOOK_MEETING_CREATED",
    status: "SUCCESS",
    meetingId: meetingId || undefined,
    requestPayload: event,
    endpoint: "/api/hubspot/meetings/webhook",
    correlationId,
  })

  const hasObjectId = meetingId && meetingId !== ""
  const hasDirectProperties = event.hs_meeting_title || event.hs_meeting_body

  if (!hasObjectId && !hasDirectProperties) {
    secureError("[Webhook] Event missing required properties", { availableKeys: Object.keys(event) })
    await logTransaction({
      direction: "INCOMING",
      type: "WEBHOOK_MEETING_CREATED",
      status: "ERROR",
      requestPayload: event,
      endpoint: "/api/hubspot/meetings/webhook",
      correlationId,
      responsePayload: {
        error: "Missing both objectId and meeting properties in webhook payload",
        availableKeys: Object.keys(event),
      },
    })
    return
  }

  try {
    let engagement: any
    let meetingBody = ""

    if (hasObjectId) {
      secureLog("[Webhook] Fetching meeting from HubSpot", { meetingId })

      const pendingTransactionId = await logTransactionWithId({
        direction: "OUTGOING",
        type: "HUBSPOT_GET_MEETING",
        status: "PENDING",
        meetingId,
        httpMethod: "GET",
        endpoint: `/crm/v3/objects/meetings/${meetingId}`,
        correlationId,
      })

      try {
        const meeting = await hubspotClient.getMeeting(meetingId)
        secureLog("[Webhook] Meeting data received successfully")

        engagement = {
          metadata: {
            title: meeting.properties?.hs_meeting_title,
            body: meeting.properties?.hs_meeting_body,
            startTime: meeting.properties?.hs_meeting_start_time,
            endTime: meeting.properties?.hs_meeting_end_time,
          },
          associations: {
            contactIds: meeting.associations?.contacts?.results?.map((c: any) => c.id) || [],
          },
        }

        meetingBody = meeting.properties?.hs_meeting_body || ""

        await updateTransactionStatus(pendingTransactionId, "SUCCESS", meeting, 200)
      } catch (crmError) {
        secureError("[Webhook] CRM API failed, trying engagements API")
        await updateTransactionStatus(
          pendingTransactionId,
          "ERROR",
          { error: String(crmError), message: "CRM API failed, trying engagements API" },
          500,
        )

        engagement = await hubspotClient.getEngagement(meetingId)
        meetingBody = engagement.metadata?.body || ""

        await logTransaction({
          direction: "OUTGOING",
          type: "HUBSPOT_GET_ENGAGEMENT_MEETING",
          status: "SUCCESS",
          meetingId,
          httpMethod: "GET",
          endpoint: `/engagements/v1/engagements/${meetingId}`,
          responsePayload: engagement,
          httpStatusCode: 200,
          correlationId,
        })
      }
    } else {
      secureLog("[Webhook] Searching for meeting by properties")
      if (event.hs_meeting_title && event.hs_meeting_start_time) {
        const searchTransactionId = await logTransactionWithId({
          direction: "OUTGOING",
          type: "HUBSPOT_SEARCH_MEETING",
          status: "PENDING",
          httpMethod: "POST",
          endpoint: "/crm/v3/objects/meetings/search",
          requestPayload: {
            title: event.hs_meeting_title,
            startTime: event.hs_meeting_start_time,
          },
          correlationId,
        })

        try {
          const meetings = await hubspotClient.searchMeetings({
            title: event.hs_meeting_title,
            startTime: event.hs_meeting_start_time,
          })

          if (meetings.length > 0) {
            const meeting = meetings[0]
            secureLog("[Webhook] Meeting found via search", { meetingId: meeting.id })

            const fullMeetingId = meeting.id || meeting.properties?.hs_object_id

            if (fullMeetingId) {
              secureLog("[Webhook] Fetching full meeting details", { meetingId: fullMeetingId })

              try {
                const fullMeeting = await hubspotClient.getMeeting(String(fullMeetingId))
                secureLog("[Webhook] Full meeting details received", { meetingId: fullMeetingId })

                engagement = {
                  metadata: {
                    title: fullMeeting.properties?.hs_meeting_title,
                    body: fullMeeting.properties?.hs_meeting_body,
                    startTime: fullMeeting.properties?.hs_meeting_start_time,
                    endTime: fullMeeting.properties?.hs_meeting_end_time,
                  },
                  associations: {
                    contactIds: fullMeeting.associations?.contacts?.results?.map((c: any) => c.id) || [],
                  },
                }

                meetingBody = fullMeeting.properties?.hs_meeting_body || ""
              } catch (getMeetingError) {
                secureError("[Webhook] Failed to get full meeting details", { meetingId: fullMeetingId })
                engagement = {
                  metadata: {
                    title: meeting.properties?.hs_meeting_title,
                    body: meeting.properties?.hs_meeting_body,
                    startTime: meeting.properties?.hs_meeting_start_time,
                    endTime: meeting.properties?.hs_meeting_end_time,
                  },
                  associations: {
                    contactIds: [],
                  },
                }

                meetingBody = meeting.properties?.hs_meeting_body || ""
              }
            } else {
              engagement = {
                metadata: {
                  title: meeting.properties?.hs_meeting_title,
                  body: meeting.properties?.hs_meeting_body,
                  startTime: meeting.properties?.hs_meeting_start_time,
                  endTime: meeting.properties?.hs_meeting_end_time,
                },
                associations: {
                  contactIds: [],
                },
              }

              meetingBody = meeting.properties?.hs_meeting_body || ""
            }

            await updateTransactionStatus(searchTransactionId, "SUCCESS", meetings, 200)
          } else {
            secureLog("[Webhook] No meeting found via search, using webhook properties only")
            meetingBody = event.hs_meeting_body || ""
            engagement = {
              metadata: {
                title: event.hs_meeting_title,
                body: event.hs_meeting_body,
                startTime: event.hs_meeting_start_time,
                endTime: event.hs_meeting_end_time,
              },
              associations: {
                contactIds: [],
              },
            }

            await updateTransactionStatus(
              searchTransactionId,
              "SUCCESS",
              { results: [], message: "No meetings found matching criteria" },
              200,
            )
          }
        } catch (searchError) {
          secureError("[Webhook] Search failed", searchError)
          await updateTransactionStatus(
            searchTransactionId,
            "ERROR",
            {
              error: String(searchError),
              message: searchError instanceof Error ? searchError.message : "Search failed",
            },
            500,
          )
          throw searchError
        }
      } else {
        secureLog("[Webhook] Using meeting properties directly from webhook payload")
        meetingBody = event.hs_meeting_body || ""
        engagement = {
          metadata: {
            title: event.hs_meeting_title,
            body: event.hs_meeting_body,
            startTime: event.hs_meeting_start_time,
            endTime: event.hs_meeting_end_time,
          },
          associations: {
            contactIds: [],
          },
        }
      }

      await logTransaction({
        direction: "INCOMING",
        type: "WEBHOOK_MEETING_PROPERTIES_EXTRACTED",
        status: "SUCCESS",
        meetingId: undefined,
        requestPayload: event,
        responsePayload: engagement,
        correlationId,
      })
    }

    const urls = extractUrlsFromMeetingBody(meetingBody)

    secureLog("[Webhook] URLs extracted", {
      hasGoogleMeet: !!urls.googleMeetLink,
      hasReschedule: !!urls.rescheduleLink,
      hasCancel: !!urls.cancelLink,
    })

    await logTransaction({
      direction: "INCOMING",
      type: "WEBHOOK_URLS_EXTRACTED",
      status: "SUCCESS",
      meetingId,
      correlationId,
      googleMeetLink: urls.googleMeetLink || undefined,
      rescheduleLink: urls.rescheduleLink || undefined,
      cancelLink: urls.cancelLink || undefined,
      requestPayload: { meetingBody },
      responsePayload: urls,
    })

    const contactIds = engagement.associations?.contactIds || []

    if (contactIds.length === 0) {
      secureLog("[Webhook] No contacts associated with meeting")
    }

    for (const contactId of contactIds) {
      try {
        secureLog("[Webhook] Updating contact", { contactId })
        let contactEmail: string | undefined

        try {
          const contact = await hubspotClient.getContact(contactId)
          contactEmail = contact.properties?.email
          secureLog("[Webhook] Retrieved contact email", { contactId, email: contactEmail })
        } catch (emailError) {
          secureError("[Webhook] Could not retrieve email for contact", { contactId })
        }

        let meetingDatetime: string | undefined
        if (engagement.metadata?.startTime) {
          // HubSpot datetime fields expect ISO 8601 format or milliseconds timestamp
          // We'll send it as ISO 8601 string for better readability
          meetingDatetime = new Date(engagement.metadata.startTime).toISOString()
        }

        const updateTransactionId = await logTransactionWithId({
          direction: "OUTGOING",
          type: "HUBSPOT_UPDATE_CONTACT",
          status: "PENDING",
          meetingId,
          httpMethod: "PATCH",
          endpoint: `/crm/v3/objects/contacts/${contactId}`,
          requestPayload: {
            properties: {
              contacto_link: urls.googleMeetLink,
              contacto_reagendar: urls.rescheduleLink,
              contacto_cancelar: urls.cancelLink,
              contacto_date_meet: meetingDatetime,
            },
          },
          correlationId,
          googleMeetLink: urls.googleMeetLink || undefined,
          rescheduleLink: urls.rescheduleLink || undefined,
          cancelLink: urls.cancelLink || undefined,
          contactEmail,
        })

        await hubspotClient.updateContact(contactId, {
          contacto_link: urls.googleMeetLink,
          contacto_reagendar: urls.rescheduleLink,
          contacto_cancelar: urls.cancelLink,
          contacto_date_meet: meetingDatetime,
        })

        await updateTransactionStatus(updateTransactionId, "SUCCESS", { success: true }, 200)
        secureLog("[Webhook] Successfully updated contact", { contactId })
      } catch (contactError) {
        secureError("[Webhook] Failed to update contact", { contactId })
        await logTransaction({
          direction: "OUTGOING",
          type: "HUBSPOT_UPDATE_CONTACT",
          status: "ERROR",
          meetingId,
          httpMethod: "PATCH",
          endpoint: `/crm/v3/objects/contacts/${contactId}`,
          requestPayload: {
            properties: {
              contacto_link: urls.googleMeetLink,
              contacto_reagendar: urls.rescheduleLink,
              contacto_cancelar: urls.cancelLink,
            },
          },
          responsePayload: {
            error: String(contactError),
            message: contactError instanceof Error ? contactError.message : "Unknown error",
            stack: contactError instanceof Error ? contactError.stack : undefined,
          },
          httpStatusCode: 500,
          correlationId,
        })
      }
    }
  } catch (error) {
    secureError("[Webhook] Failed to process meeting", { meetingId })
    await logTransaction({
      direction: "OUTGOING",
      type: "HUBSPOT_GET_ENGAGEMENT_MEETING",
      status: "ERROR",
      meetingId: meetingId || undefined,
      httpMethod: "GET",
      endpoint: `/engagements/v1/engagements/${meetingId}`,
      responsePayload: {
        error: String(error),
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      httpStatusCode: 500,
      correlationId,
    })
  }
}

async function authenticateWebhook(request: NextRequest): Promise<boolean> {
  const apiKey = request.headers.get("agendas")

  if (!apiKey) {
    return false
  }

  try {
    const { getWebhookApiKey } = await import("@/lib/webhook-validator")
    const expectedApiKey = await getWebhookApiKey()

    if (!expectedApiKey) {
      return false
    }

    return apiKey === expectedApiKey
  } catch (error) {
    secureError("[Webhook Auth] Authentication error", error)
    return false
  }
}

export async function POST(request: NextRequest) {
  const correlationId = generateCorrelationId()
  secureLog("[Webhook] Request received", { correlationId })

  try {
    const auditHeaders: Record<string, string> = {}
    const sensitiveHeaders = ["agendas", "authorization", "cookie", "x-api-key"]

    request.headers.forEach((value, key) => {
      if (!sensitiveHeaders.includes(key.toLowerCase())) {
        auditHeaders[key] = value
      } else {
        auditHeaders[key] = "[REDACTED]"
      }
    })

    await logTransaction({
      direction: "INCOMING",
      type: "WEBHOOK_HEADERS_RECEIVED",
      status: "SUCCESS",
      requestPayload: auditHeaders,
      endpoint: "/api/hubspot/meetings/webhook",
      correlationId,
    })
  } catch (headerError) {
    secureError("[Webhook] Failed to log headers", headerError)
  }

  const isAuthenticated = await authenticateWebhook(request)

  if (!isAuthenticated) {
    await logTransaction({
      direction: "INCOMING",
      type: "WEBHOOK_AUTH_FAILED",
      status: "ERROR",
      endpoint: "/api/hubspot/meetings/webhook",
      correlationId,
      responsePayload: { error: "Unauthorized" },
    })
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  secureLog("[Webhook] Authentication successful", { correlationId })

  try {
    const body = await request.json()

    await logTransaction({
      type: "WEBHOOK_REQUEST_RECEIVED",
      metadata: {
        correlationId,
        eventCount: body.length || 0,
      },
    })

    let events: HubSpotWebhookEvent[] = []

    if (Array.isArray(body)) {
      events = body
      secureLog("[Webhook] Processing array payload", { count: body.length })
    } else if (body && Array.isArray(body.events)) {
      events = body.events
      secureLog("[Webhook] Processing events array", { count: body.events.length })
    } else if (body && typeof body === "object" && body.objectId) {
      events = [body]
      secureLog("[Webhook] Processing single event")
    } else if (body && typeof body === "object") {
      const arrayProps = Object.keys(body).filter((key) => Array.isArray(body[key]))
      if (arrayProps.length > 0) {
        events = body[arrayProps[0]]
        secureLog("[Webhook] Found events in property", { property: arrayProps[0] })
      } else {
        events = [body]
        secureLog("[Webhook] Treating payload as single event")
      }
    }

    const promises = events.map((event: HubSpotWebhookEvent) => {
      return processMeetingEvent(event, correlationId).catch((err) => {
        secureError("[Webhook] Error processing event", err)
      })
    })

    await Promise.all(promises)

    secureLog("[Webhook] Completed successfully", { count: events.length })

    const response = NextResponse.json(
      {
        status: "ok",
        processedEvents: events.length,
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    )

    return addSecurityHeaders(response)
  } catch (error) {
    secureError("[Webhook] Processing error", error)
    const response = NextResponse.json(
      {
        status: "error",
        message: sanitizeError(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
    return addSecurityHeaders(response)
  }
}

export async function GET() {
  secureLog("[Webhook] GET request received (verification)")
  const response = NextResponse.json({
    status: "ok",
    message: "HubSpot webhook endpoint is active",
    endpoint: "/api/hubspot/meetings/webhook",
    methods: ["GET", "POST"],
  })

  return addSecurityHeaders(response)
}
