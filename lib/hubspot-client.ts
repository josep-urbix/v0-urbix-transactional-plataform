import { sql } from "@/lib/db"

export interface HubSpotEngagementResponse {
  engagement: {
    id: number
    type: string
    timestamp: number
  }
  associations: {
    contactIds: number[]
    companyIds?: number[]
    dealIds?: number[]
  }
  metadata: {
    title?: string | null
    body?: string | null
    startTime?: number | null
    endTime?: number | null
  }
}

export class HubSpotClient {
  private async getAccessToken(): Promise<string> {
    const result = await sql`
      SELECT value FROM "AppConfig"
      WHERE key = 'hubspot_access_token'
      LIMIT 1
    `

    if (result[0]?.value) {
      return result[0].value
    }

    // Fallback to environment variable
    const envToken = process.env.HUBSPOT_ACCESS_TOKEN
    if (envToken) {
      return envToken
    }

    throw new Error("No HubSpot access token configured. Please configure in Settings.")
  }

  async getEngagement(engagementId: string): Promise<HubSpotEngagementResponse> {
    const token = await this.getAccessToken()

    const response = await fetch(`https://api.hubapi.com/engagements/v1/engagements/${engagementId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HubSpot API error: ${response.status} ${errorText}`)
    }

    return await response.json()
  }

  async updateContact(
    contactId: number,
    properties: {
      contacto_link?: string
      contacto_reagendar?: string
      contacto_cancelar?: string
      contacto_date_meet?: string
    },
  ): Promise<void> {
    const token = await this.getAccessToken()

    // Only send properties that are defined
    const filteredProperties: Record<string, string> = {}
    if (properties.contacto_link !== undefined) {
      filteredProperties.contacto_link = properties.contacto_link
    }
    if (properties.contacto_reagendar !== undefined) {
      filteredProperties.contacto_reagendar = properties.contacto_reagendar
    }
    if (properties.contacto_cancelar !== undefined) {
      filteredProperties.contacto_cancelar = properties.contacto_cancelar
    }
    if (properties.contacto_date_meet !== undefined) {
      filteredProperties.contacto_date_meet = properties.contacto_date_meet
    }

    if (Object.keys(filteredProperties).length === 0) {
      return // Nothing to update
    }

    const response = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ properties: filteredProperties }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HubSpot API error: ${response.status} ${errorText}`)
    }
  }

  async searchMeetings(filters: {
    title?: string
    startTime?: number
    endTime?: number
  }): Promise<any[]> {
    const token = await this.getAccessToken()

    const searchFilters: any[] = []

    if (filters.title) {
      searchFilters.push({
        propertyName: "hs_meeting_title",
        operator: "EQ",
        value: filters.title,
      })
    }

    if (filters.startTime) {
      searchFilters.push({
        propertyName: "hs_meeting_start_time",
        operator: "EQ",
        value: filters.startTime,
      })
    }

    const response = await fetch("https://api.hubapi.com/crm/v3/objects/meetings/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filterGroups: [
          {
            filters: searchFilters,
          },
        ],
        properties: ["hs_meeting_title", "hs_meeting_body", "hs_meeting_start_time", "hs_meeting_end_time"],
        associations: ["contacts"],
        limit: 1,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HubSpot API error: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    return data.results || []
  }

  async getMeeting(meetingId: string): Promise<any> {
    const token = await this.getAccessToken()

    const response = await fetch(
      `https://api.hubapi.com/crm/v3/objects/meetings/${meetingId}?properties=hs_meeting_title,hs_meeting_body,hs_meeting_start_time,hs_meeting_end_time&associations=contacts`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HubSpot API error: ${response.status} ${errorText}`)
    }

    return await response.json()
  }

  async getContact(contactId: number): Promise<any> {
    const token = await this.getAccessToken()

    const response = await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}?properties=email,firstname,lastname`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HubSpot API error: ${response.status} ${errorText}`)
    }

    return await response.json()
  }
}

export const hubspotClient = new HubSpotClient()
