// =====================================================
// HANDLERS INDEX
// Exports all builtin handlers
// =====================================================

export { callInternalApiHandler, CallInternalApiConfigSchema, type CallInternalApiConfig } from "./call-internal-api"
export { callWebhookHandler, CallWebhookConfigSchema, type CallWebhookConfig } from "./call-webhook"
export { sendEmailHandler, SendEmailConfigSchema, type SendEmailConfig } from "./send-email"
export { delayHandler, DelayConfigSchema, type DelayConfig } from "./delay"
export { conditionalHandler, ConditionalConfigSchema, type ConditionalConfig } from "./conditional"
export { setVariableHandler, SetVariableConfigSchema, type SetVariableConfig } from "./set-variable"
export { logHandler, LogConfigSchema, type LogConfig } from "./log"

import { callInternalApiHandler } from "./call-internal-api"
import { callWebhookHandler } from "./call-webhook"
import { sendEmailHandler } from "./send-email"
import { delayHandler } from "./delay"
import { conditionalHandler } from "./conditional"
import { setVariableHandler } from "./set-variable"
import { logHandler } from "./log"

/**
 * All builtin handlers in an array for easy registration
 */
export const builtinHandlers = [
  callInternalApiHandler,
  callWebhookHandler,
  sendEmailHandler,
  delayHandler,
  conditionalHandler,
  setVariableHandler,
  logHandler,
]
