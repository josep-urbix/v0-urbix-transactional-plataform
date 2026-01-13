export interface ExtractedUrls {
  googleMeetLink?: string
  rescheduleLink?: string
  cancelLink?: string
}

export function extractUrlsFromMeetingBody(body: string | null | undefined): ExtractedUrls {
  if (!body) {
    return {}
  }

  const urls: ExtractedUrls = {}

  // Extract all URLs from the text
  const urlRegex = /https?:\/\/[^\s<>"]+/g
  const foundUrls = body.match(urlRegex) || []

  // Find Google Meet link
  const googleMeetUrl = foundUrls.find((url) => url.startsWith("https://meet.google.com/"))
  if (googleMeetUrl) {
    urls.googleMeetLink = googleMeetUrl
  }

  // Find reschedule link (contains hubspot.com/meetings and rescheduleId parameter)
  const rescheduleUrl = foundUrls.find((url) => url.includes("hubspot.com/meetings") && url.includes("rescheduleId="))
  if (rescheduleUrl) {
    urls.rescheduleLink = rescheduleUrl
  }

  // Find cancel link (contains hubspot.com/meetings and cancelId parameter)
  const cancelUrl = foundUrls.find((url) => url.includes("hubspot.com/meetings") && url.includes("cancelId="))
  if (cancelUrl) {
    urls.cancelLink = cancelUrl
  }

  return urls
}
