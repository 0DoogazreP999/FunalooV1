import { z } from "zod"
import type {
  GenerationProviderFailureCategory,
  GenerationProviderFailureSeverity,
  GenerationProviderRetryStrategy,
  GenerationProviderSignal,
  PromptIntelligenceFragment,
  PromptProviderId,
} from "@/lib/engine/types"
import { getDefaultProviderModel } from "@/lib/provider-models"

export type PromptRole = "system" | "developer" | "user" | "assistant"

export interface PromptTemplateSection {
  id: string
  content?: string
  template?: string
  variables?: Record<string, unknown>
  partials?: Record<string, string>
  optional?: boolean
  trimPriority?: number
  preserveMissing?: boolean
  enabled?: boolean
}

export interface PromptMessageInput {
  role: PromptRole
  content?: string
  template?: string
  sections?: PromptTemplateSection[]
  variables?: Record<string, unknown>
  partials?: Record<string, string>
  preserveMissing?: boolean
}

export interface PromptClientMessage {
  role: PromptRole
  content: string
}

export interface PromptUsage {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  costUsd?: number
}

export interface PromptClientRequest {
  messages: PromptClientMessage[]
  model: string
  temperature?: number
  maxOutputTokens?: number
  metadata?: Record<string, unknown>
  stream?: boolean
}

export interface PromptClientResponse {
  text: string
  usage?: PromptUsage
  raw?: unknown
}

export interface PromptPipelineClient {
  provider: string
  defaultModel?: string
  complete: (request: PromptClientRequest) => Promise<PromptClientResponse>
  completeBatch?: (requests: PromptClientRequest[]) => Promise<PromptClientResponse[]>
  stream?: (request: PromptClientRequest) => AsyncIterable<string>
}

export interface PromptVerifier<T> {
  description: string
  parse: (text: string) => T
}

export interface PromptRunTelemetryEvent {
  event: "prompt_run"
  name: string
  promptId?: string
  promptVersion?: string
  promptStage?: string
  provider: string
  model: string
  attempt: number
  success: boolean
  elapsedMs: number
  hash: string
  inputTokens: number
  outputTokens?: number
  totalTokens?: number
  costUsd?: number
  streamed: boolean
  omittedSections: string[]
  metadata?: Record<string, unknown>
  errorCode?: "client_error" | "verification_failed"
}

export type PromptTelemetryHook = (event: PromptRunTelemetryEvent) => void | Promise<void>
export type PromptIntelligenceHook = (fragment: PromptIntelligenceFragment) => void | Promise<void>

export interface PromptRunInput<T> {
  name: string
  promptId?: string
  promptVersion?: string
  promptStage?: string
  client: PromptPipelineClient
  messages: PromptMessageInput[]
  model?: string
  temperature?: number
  maxInputTokens?: number
  maxOutputTokens?: number
  retries?: number
  metadata?: Record<string, unknown>
  stream?: boolean
  verifier?: PromptVerifier<T>
  telemetry?: PromptTelemetryHook
  onIntelligence?: PromptIntelligenceHook
}

export interface PromptRunSuccess<T> {
  ok: true
  data: T
  text: string
  usage: PromptUsage
  attempts: number
  hash: string
  omittedSections: string[]
  telemetry: PromptRunTelemetryEvent[]
}

export interface PromptRunFailure {
  ok: false
  error: {
    code: "client_error" | "verification_failed"
    message: string
    attempts: number
    issues: string[]
    lastText: string
    status?: number
    providerErrorType?: string
    category?: GenerationProviderFailureCategory
    severity?: GenerationProviderFailureSeverity
    retryStrategy?: GenerationProviderRetryStrategy
    statusFamily?: "1xx" | "2xx" | "3xx" | "4xx" | "5xx"
    headline?: string
    suggestedAction?: string
    affectedModel?: string
    limitSummary?: string
    signals?: GenerationProviderSignal[]
    requestId?: string
    retryable?: boolean
    retryAfterSeconds?: number
  }
  usage: PromptUsage
  hash: string
  omittedSections: string[]
  telemetry: PromptRunTelemetryEvent[]
}

export type PromptRunResult<T> = PromptRunSuccess<T> | PromptRunFailure

export interface BudgetedPromptMessages {
  messages: PromptClientMessage[]
  estimatedTokens: number
  omittedSections: string[]
}

export interface PromptBatchOptions {
  maxBatchSize?: number
  smallPromptTokenThreshold?: number
}

interface RenderTemplateInput {
  template: string
  values?: Record<string, unknown>
  partials?: Record<string, string>
  preserveMissing?: boolean
  depth?: number
}

interface RenderedSection {
  key: string
  role: PromptRole
  messageIndex: number
  optional: boolean
  trimPriority: number
  content: string
  estimatedTokens: number
}

interface PreparedPromptRun<T> {
  input: PromptRunInput<T>
  request: PromptClientRequest
  hash: string
  omittedSections: string[]
  estimatedTokens: number
}

type ExternalPromptProvider = Exclude<PromptProviderId, "local">

class PromptClientError extends Error {
  readonly status?: number
  readonly providerErrorType?: string
  readonly category?: GenerationProviderFailureCategory
  readonly severity?: GenerationProviderFailureSeverity
  readonly retryStrategy?: GenerationProviderRetryStrategy
  readonly statusFamily?: "1xx" | "2xx" | "3xx" | "4xx" | "5xx"
  readonly headline?: string
  readonly suggestedAction?: string
  readonly affectedModel?: string
  readonly limitSummary?: string
  readonly signals?: GenerationProviderSignal[]
  readonly requestId?: string
  readonly retryable: boolean
  readonly retryAfterSeconds?: number

  constructor(input: {
    message: string
    status?: number
    providerErrorType?: string
    category?: GenerationProviderFailureCategory
    severity?: GenerationProviderFailureSeverity
    retryStrategy?: GenerationProviderRetryStrategy
    statusFamily?: "1xx" | "2xx" | "3xx" | "4xx" | "5xx"
    headline?: string
    suggestedAction?: string
    affectedModel?: string
    limitSummary?: string
    signals?: GenerationProviderSignal[]
    requestId?: string
    retryable?: boolean
    retryAfterSeconds?: number
  }) {
    super(input.message)
    this.name = "PromptClientError"
    this.status = input.status
    this.providerErrorType = input.providerErrorType
    this.category = input.category
    this.severity = input.severity
    this.retryStrategy = input.retryStrategy
    this.statusFamily = input.statusFamily
    this.headline = input.headline
    this.suggestedAction = input.suggestedAction
    this.affectedModel = input.affectedModel
    this.limitSummary = input.limitSummary
    this.signals = input.signals
    this.requestId = input.requestId
    this.retryable = input.retryable ?? false
    this.retryAfterSeconds = input.retryAfterSeconds
  }
}

const PARTIAL_PATTERN = /{{>\s*([a-zA-Z0-9_.-]+)\s*}}/g
const RAW_VALUE_PATTERN = /{{{\s*([a-zA-Z0-9_.-]+)\s*}}}/g
const ESCAPED_VALUE_PATTERN = /{{\s*([a-zA-Z0-9_.-]+)\s*}}/g
function getValueAtPath(values: Record<string, unknown>, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>((current, segment) => {
      if (!current || typeof current !== "object") return undefined
      return (current as Record<string, unknown>)[segment]
    }, values)
}

function normalizePromptString(value: string) {
  return value
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/```/g, "\\`\\`\\`")
}

function stringifyTemplateValue(value: unknown, raw: boolean) {
  if (value === null || value === undefined) return ""
  if (typeof value === "string") {
    return raw ? value : normalizePromptString(value)
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }

  const serialized = JSON.stringify(value, null, 2)
  return raw ? serialized : normalizePromptString(serialized)
}

function buildMissingToken(path: string, preserveMissing: boolean) {
  return preserveMissing ? `{{${path}}}` : ""
}

function hashPromptPayload(payload: unknown) {
  const input = JSON.stringify(payload)
  let hash = 0x811c9dc5

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  return `prompt_${(hash >>> 0).toString(16).padStart(8, "0")}`
}

function extractJsonCandidate(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) {
    return fenced[1].trim()
  }

  const firstBrace = text.indexOf("{")
  const lastBrace = text.lastIndexOf("}")
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1)
  }

  return text.trim()
}

function describeIssues(error: unknown): string[] {
  if (error instanceof z.ZodError) {
    return error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "root"
      return `${path}: ${issue.message}`
    })
  }

  if (error instanceof Error) {
    return [error.message]
  }

  return ["Unknown verification failure"]
}

function normalizeUsage(usage: PromptUsage | undefined, estimatedInputTokens: number): PromptUsage {
  const inputTokens = usage?.inputTokens ?? estimatedInputTokens
  const outputTokens = usage?.outputTokens
  const totalTokens = usage?.totalTokens ?? (
    typeof outputTokens === "number"
      ? inputTokens + outputTokens
      : undefined
  )

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    costUsd: usage?.costUsd,
  }
}

function buildRetryMessage(verifierDescription: string, issues: string[]) {
  return [
    "The previous response could not be validated.",
    `Validation issues: ${issues.join("; ")}`,
    `Return only output that satisfies this contract: ${verifierDescription}.`,
    "Do not include markdown fences or commentary.",
  ].join("\n")
}

function extractOpenAiText(content: unknown): string {
  if (typeof content === "string") return content
  if (!Array.isArray(content)) return ""

  return content
    .map((part) => {
      if (typeof part === "string") return part
      if (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string") {
        return (part as { text: string }).text
      }
      return ""
    })
    .filter(Boolean)
    .join("\n")
}

function toOpenAiMessages(messages: PromptClientMessage[]) {
  return messages.map((message) => ({
    role: message.role === "developer" ? "system" : message.role,
    content: message.role === "developer"
      ? `Developer instructions:\n${message.content}`
      : message.content,
  }))
}

function toAnthropicRequest(messages: PromptClientMessage[]) {
  const systemLines: string[] = []
  const conversationalMessages: Array<{ role: "user" | "assistant"; content: string }> = []

  messages.forEach((message) => {
    if (message.role === "system") {
      systemLines.push(message.content)
      return
    }

    if (message.role === "developer") {
      systemLines.push(`Developer instructions:\n${message.content}`)
      return
    }

    conversationalMessages.push({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content,
    })
  })

  if (conversationalMessages.length === 0) {
    conversationalMessages.push({
      role: "user",
      content: "Follow the provided system instructions and return the requested output.",
    })
  }

  return {
    system: systemLines.join("\n\n"),
    messages: conversationalMessages,
  }
}

function isRetryableProviderStatus(status?: number) {
  if (typeof status !== "number") return false
  return status === 408
    || status === 409
    || status === 429
    || status === 500
    || status === 502
    || status === 503
    || status === 504
    || status === 529
}

function extractPromptProviderErrorModel(message: string, fallbackModel?: string) {
  const limitPathMatch = message.match(/limit_[a-z_]+\/([^/]+\/[^/\s]+)(?:\/|$)/i)
  if (limitPathMatch?.[1]) return limitPathMatch[1]

  const forMatch = message.match(/for ([a-z0-9._-]+\/[a-z0-9._:-]+)/i)
  if (forMatch?.[1]) return forMatch[1]

  return fallbackModel?.trim() || undefined
}

function extractPromptProviderLimitSummary(message: string) {
  const directMatch = message.match(/limited to ([^.]+)\./i)
  if (directMatch?.[1]) return directMatch[1].trim()

  const requestsPerMinuteMatch = message.match(/(\d+\s+requests?\s+per\s+minute)/i)
  if (requestsPerMinuteMatch?.[1]) return requestsPerMinuteMatch[1].trim()

  return undefined
}

function getStatusFamily(status?: number): PromptClientError["statusFamily"] {
  if (typeof status !== "number") return undefined
  if (status >= 500) return "5xx"
  if (status >= 400) return "4xx"
  if (status >= 300) return "3xx"
  if (status >= 200) return "2xx"
  if (status >= 100) return "1xx"
  return undefined
}

function buildPromptProviderSignals(input: {
  provider: ExternalPromptProvider
  status?: number
  providerErrorType?: string
  message: string
  model?: string
  retryAfterSeconds?: number
  category: GenerationProviderFailureCategory
  suggestedAction?: string
}) {
  const normalizedType = input.providerErrorType?.toLowerCase() ?? ""
  const normalizedMessage = input.message.toLowerCase()
  const affectedModel = extractPromptProviderErrorModel(input.message, input.model)
  const limitSummary = extractPromptProviderLimitSummary(input.message)
  const signals: GenerationProviderSignal[] = []

  const pushSignal = (
    id: string,
    label: string,
    severity: GenerationProviderFailureSeverity,
    detail: string,
    source: GenerationProviderSignal["source"],
    action?: string,
  ) => {
    if (signals.some((signal) => signal.id === id && signal.detail === detail)) return
    signals.push({ id, label, severity, detail, source, action })
  }

  if (typeof input.status === "number") {
    pushSignal(`http_${input.status}`, `HTTP ${input.status}`, input.status >= 500 ? "critical" : input.status >= 400 ? "error" : "warning", `HTTP status ${input.status} from ${input.provider}.`, "status", input.suggestedAction)
  }

  if (getStatusFamily(input.status)) {
    pushSignal(`status_family_${getStatusFamily(input.status)}`, `${getStatusFamily(input.status)} status`, input.status && input.status >= 500 ? "critical" : "warning", `Status family ${getStatusFamily(input.status)} was returned.`, "status", input.suggestedAction)
  }

  if (normalizedType) {
    pushSignal(`provider_type_${normalizedType.replace(/[^a-z0-9]+/g, "_")}`, "Provider error type", "warning", `Provider reported error type "${normalizedType}".`, "provider_type", input.suggestedAction)
  }

  if (typeof input.retryAfterSeconds === "number") {
    pushSignal("retry_after_header", "Retry window provided", "warning", `Provider requested a ${input.retryAfterSeconds}s wait before retrying.`, "header", input.suggestedAction)
  }

  if (limitSummary) {
    pushSignal("explicit_limit_summary", "Explicit rate or quota limit", "warning", `Provider reported limit summary: ${limitSummary}.`, "provider_message", input.suggestedAction)
  }

  if (affectedModel) {
    pushSignal("affected_model_identified", "Affected model identified", "info", `The failure message identified ${affectedModel} as the affected model.`, "provider_message", input.suggestedAction)
  }

  if (normalizedMessage.includes(":free")) {
    pushSignal("free_model_variant", "Free model variant", "warning", "A :free model variant was involved, which often has tighter rate limits and lower production reliability.", "provider_message", "Use a paid or non-:free variant if you need steadier generation throughput.")
  }

  if (/limit_rpm|rate limit|too many requests|requests per minute|retry shortly|acceleration/i.test(normalizedMessage)) {
    pushSignal("provider_rate_limit_signal", "Rate limit signal", "error", "The provider message indicates request throttling or throughput saturation.", "provider_message", input.suggestedAction)
  }

  if (/insufficient credits|credit balance|billing|quota exceeded|insufficient_quota|payment|negative credit/i.test(normalizedMessage)) {
    pushSignal("billing_or_credit_signal", "Billing or credits issue", "error", "The provider message indicates credits, billing, or quota exhaustion.", "provider_message", input.suggestedAction)
  }

  if (/invalid api key|incorrect api key|authentication|unauthorized|bearer/i.test(normalizedMessage)) {
    pushSignal("authentication_signal", "Authentication signal", "critical", "The provider message indicates the API key, token, or auth headers were rejected.", "provider_message", input.suggestedAction)
  }

  if (/privacy|provider routing|none of the providers match|no providers match|zdr|data collection/i.test(normalizedMessage)) {
    pushSignal("privacy_or_routing_policy_signal", "Privacy or routing mismatch", "error", "The request likely conflicted with provider privacy or routing constraints.", "provider_message", input.suggestedAction)
  }

  if (/unsupported parameter|unsupported params|unrecognized key|unknown field/i.test(normalizedMessage)) {
    pushSignal("unsupported_parameter", "Unsupported request parameter", "error", "The provider rejected one or more request parameters.", "provider_message", input.suggestedAction)
  }

  if (/structured outputs|json schema|response format|tool calling|tools not supported|prefill/i.test(normalizedMessage)) {
    pushSignal("unsupported_capability", "Unsupported capability", "error", "The selected model or provider does not support one of the requested generation features.", "provider_message", input.suggestedAction)
  }

  if (/context length|maximum context|too many tokens|request too large|input too long|max context|max tokens|request_too_large/i.test(normalizedMessage)) {
    pushSignal("context_or_payload_limit", "Context or payload too large", "error", "The request exceeded prompt, context, or payload limits.", "provider_message", input.suggestedAction)
  }

  if (/timeout|timed out|deadline|socket hang up|connection reset/i.test(normalizedMessage)) {
    pushSignal("timeout_signal", "Timeout signal", "error", "The provider or upstream request timed out.", "provider_message", input.suggestedAction)
  }

  if (/network|fetch failed|connection|socket|dns|econnreset|econnrefused|enotfound/i.test(normalizedMessage)) {
    pushSignal("network_connectivity_signal", "Network connectivity issue", "error", "The request failed before the provider returned a normal response.", "network", input.suggestedAction)
  }

  if (/overloaded|warming up|cold start|temporarily unavailable|capacity|upstream|overloaded_error|server overloaded/i.test(normalizedMessage)) {
    pushSignal("provider_capacity_signal", "Provider capacity issue", "warning", "The provider appears overloaded, warming, or temporarily unavailable.", "provider_message", input.suggestedAction)
  }

  if (/moderation|flagged|policy violation|safety/i.test(normalizedMessage)) {
    pushSignal("moderation_signal", "Moderation or safety block", "error", "The request or content was blocked by safety or moderation rules.", "provider_message", input.suggestedAction)
  }

  if (/no content|empty response|empty completion/i.test(normalizedMessage)) {
    pushSignal("empty_response_signal", "No content returned", "warning", "The provider accepted the call but returned no usable content.", "response_body", input.suggestedAction)
  }

  return signals
}

function classifyPromptProviderError(input: {
  provider: ExternalPromptProvider
  status?: number
  providerErrorType?: string
  message: string
  model?: string
  retryAfterSeconds?: number
}) {
  const normalizedType = input.providerErrorType?.toLowerCase() ?? ""
  const normalizedMessage = input.message.toLowerCase()
  const affectedModel = extractPromptProviderErrorModel(input.message, input.model)
  const limitSummary = extractPromptProviderLimitSummary(input.message)
  const retryWindow = typeof input.retryAfterSeconds === "number"
    ? `Wait ${input.retryAfterSeconds}s and retry`
    : "Wait briefly and retry"

  let category: GenerationProviderFailureCategory = "unknown"
  let headline = "Provider request failed"
  let suggestedAction = "Retry with the current provider or switch models if the issue keeps repeating."

  if (
    input.status === undefined
    && /network|fetch failed|connection|socket|dns|econnreset|econnrefused|enotfound|timed out/i.test(normalizedMessage)
  ) {
    category = "network"
    headline = "Network or connectivity issue"
    suggestedAction = "Check network access and provider base URL, then retry the request."
  } else if (
    input.status === 401
    || normalizedType.includes("authentication")
    || /invalid api key|incorrect api key|authentication|unauthorized|bearer/i.test(normalizedMessage)
  ) {
    category = "authentication"
    headline = "API key rejected"
    suggestedAction = `Check the saved ${input.provider === "gpt" ? "OpenAI" : input.provider === "claude" ? "Anthropic" : "OpenRouter"} key and base URL, then retry.`
  } else if (
    input.status === 402
    || normalizedType.includes("billing")
    || /insufficient credits|credit balance|billing|quota exceeded|insufficient_quota|payment/i.test(normalizedMessage)
  ) {
    category = "quota"
    headline = input.provider === "openrouter" ? "Credits or quota exhausted" : "Billing or quota issue"
    suggestedAction = input.provider === "openrouter"
      ? "Add OpenRouter credits or check the key balance before retrying. Free models can still fail when the account balance is negative."
      : "Check billing, quota, or organization limits for this provider before retrying."
  } else if (
    input.status === 429
    || normalizedType.includes("rate_limit")
    || /rate limit|limit_rpm|too many requests|requests per minute|retry shortly|acceleration/i.test(normalizedMessage)
  ) {
    const freeModelLimited = Boolean(affectedModel && affectedModel.includes(":free")) || normalizedMessage.includes(":free")
    category = "rate_limit"
    headline = freeModelLimited ? "Free-model rate limit reached" : "Provider rate limit reached"
    suggestedAction = input.provider === "openrouter"
      ? `${retryWindow}, switch to a different model${freeModelLimited ? " or a paid/non-:free variant" : ""}, or let another provider/model take the stage. OpenRouter rate limits vary by model.`
      : `${retryWindow}, lower concurrency, or switch to another saved model/provider for this stage.`
  } else if (
    input.status === 403
    || /moderation|flagged|policy violation|safety|forbidden/i.test(normalizedMessage)
  ) {
    if (/privacy|provider routing|none of the providers match|no providers match|zdr|data collection/i.test(normalizedMessage)) {
      category = "privacy_policy"
      headline = "Privacy or routing policy blocked the request"
      suggestedAction = "Adjust provider privacy settings or routing constraints so at least one provider can satisfy the request."
    } else {
      const moderation = /moderation|flagged|policy violation|safety/i.test(normalizedMessage)
      category = moderation ? "moderation" : "permission"
      headline = moderation ? "Content policy blocked the request" : "Provider denied the request"
      suggestedAction = moderation
        ? "Adjust the prompt content or generation instructions, then retry."
        : "Check provider permissions, privacy settings, and model access before retrying."
    }
  } else if (
    input.status === 404
    || /model.*not found|unknown model|no such model|not found|deprecated|retired/i.test(normalizedMessage)
  ) {
    category = "model_unavailable"
    headline = "Model unavailable"
    suggestedAction = "Choose a different model ID or refresh the provider model selection before retrying."
  } else if (
    input.status === 408
    || /timeout|timed out|deadline|socket hang up|connection reset/i.test(normalizedMessage)
  ) {
    category = "timeout"
    headline = "Provider request timed out"
    suggestedAction = `${retryWindow}, reduce prompt size, or switch to a faster model/provider for this stage.`
  } else if (
    input.status === 413
    || /context length|maximum context|too many tokens|request too large|input too long|max context|max tokens|request_too_large/i.test(normalizedMessage)
  ) {
    category = "context_limit"
    headline = "Context or token limit reached"
    suggestedAction = "Reduce prompt size, trim retrieved context, or choose a larger-context model before retrying."
  } else if (
    /no content|empty response|empty completion/i.test(normalizedMessage)
  ) {
    category = "empty_response"
    headline = "Provider returned no content"
    suggestedAction = `${retryWindow}, or switch to another provider/model if the selected route is warming up or unstable.`
  } else if (
    /structured outputs|json schema|response format|tool calling|tools not supported|prefill/i.test(normalizedMessage)
  ) {
    category = "unsupported_capability"
    headline = "Selected model lacks a required capability"
    suggestedAction = "Switch to a model that supports the required feature set or simplify the stage request."
  } else if (
    input.status === 400
    || normalizedType.includes("invalid_request")
    || /unsupported parameter|unsupported params|unrecognized key|unknown field|invalid schema|invalid_request_error|validation/i.test(normalizedMessage)
  ) {
    category = "validation"
    headline = "Provider rejected the request shape"
    suggestedAction = "Retry with a simpler request or a different model/provider. Unsupported routing or parameter settings may need to be removed for this stage."
  } else if (
    [500, 502, 503, 504, 529].includes(input.status ?? -1)
    || /overloaded|warming up|cold start|temporarily unavailable|capacity|upstream/i.test(normalizedMessage)
  ) {
    category = "overloaded"
    headline = "Provider temporarily overloaded"
    suggestedAction = `${retryWindow}, or fall back to another provider/model if one is available.`
  }

  const severity: GenerationProviderFailureSeverity = category === "authentication" || category === "quota"
    ? "critical"
    : category === "moderation" || category === "validation" || category === "context_limit" || category === "model_unavailable" || category === "privacy_policy"
      ? "error"
      : category === "rate_limit" || category === "timeout" || category === "network" || category === "unsupported_capability" || category === "empty_response" || category === "overloaded"
        ? "warning"
        : "error"

  const retryStrategy: GenerationProviderRetryStrategy = category === "authentication"
    ? "fix_key"
    : category === "quota"
      ? "fix_billing"
      : category === "rate_limit"
        ? (typeof input.retryAfterSeconds === "number" ? "retry_after_wait" : "retry_with_backoff")
        : category === "context_limit"
          ? "trim_context"
          : category === "validation" || category === "unsupported_capability"
            ? "simplify_request"
            : category === "permission" || category === "privacy_policy"
              ? "adjust_privacy_or_routing"
              : category === "model_unavailable"
                ? "switch_model"
                : category === "moderation"
                  ? "review_content"
                  : category === "overloaded" || category === "network" || category === "empty_response" || category === "timeout"
                    ? "switch_provider"
                    : "manual_review"

  const signals = buildPromptProviderSignals({
    ...input,
    category,
    suggestedAction,
  })

  return {
    category,
    severity,
    retryStrategy,
    statusFamily: getStatusFamily(input.status),
    headline,
    suggestedAction,
    affectedModel,
    limitSummary,
    signals,
  }
}

function buildPromptClientError(input: {
  provider: ExternalPromptProvider
  message: string
  status?: number
  providerErrorType?: string
  model?: string
  requestId?: string
  retryable?: boolean
  retryAfterSeconds?: number
}) {
  const classified = classifyPromptProviderError(input)
  return {
    message: input.message,
    status: input.status,
    providerErrorType: input.providerErrorType,
    category: classified.category,
    severity: classified.severity,
    retryStrategy: classified.retryStrategy,
    statusFamily: classified.statusFamily,
    headline: classified.headline,
    suggestedAction: classified.suggestedAction,
    affectedModel: classified.affectedModel,
    limitSummary: classified.limitSummary,
    signals: classified.signals,
    requestId: input.requestId,
    retryable: input.retryable ?? isRetryableProviderStatus(input.status),
    retryAfterSeconds: input.retryAfterSeconds,
  }
}

async function readProviderError(provider: ExternalPromptProvider, response: Response, model?: string) {
  const raw = await response.text()
  const requestId = response.headers.get("x-request-id")
    ?? response.headers.get("request-id")
    ?? response.headers.get("anthropic-request-id")
    ?? undefined
  const retryAfterHeader = response.headers.get("retry-after")
  const retryAfterSeconds = retryAfterHeader && Number.isFinite(Number(retryAfterHeader))
    ? Number(retryAfterHeader)
    : undefined

  try {
    const parsed = JSON.parse(raw) as {
      error?: { message?: string; type?: string; code?: string | number; request_id?: string }
      message?: string
      request_id?: string
    }
    const providerErrorType = (
      typeof parsed.error?.type === "string" && parsed.error.type.trim()
        ? parsed.error.type
        : parsed.error?.code !== undefined
          ? String(parsed.error.code)
          : undefined
    )
    const message = parsed.error?.message || parsed.message || raw || `${response.status} ${response.statusText}`
    return buildPromptClientError({
      provider,
      message,
      status: response.status,
      providerErrorType,
      model,
      requestId: requestId ?? parsed.error?.request_id ?? parsed.request_id,
      retryAfterSeconds,
    })
  } catch {
    return buildPromptClientError({
      provider,
      message: raw || `${response.status} ${response.statusText}`,
      status: response.status,
      model,
      requestId,
      retryAfterSeconds,
    })
  }
}

function buildOpenRouterProviderPreference(request: PromptClientRequest) {
  const role = typeof request.metadata?.providerRole === "string" ? request.metadata.providerRole : ""
  if (role === "author" || role === "repair") {
    return {
      sort: "throughput",
      allow_fallbacks: true,
    }
  }

  if (role === "critic" || role === "release_judge") {
    return {
      sort: "price",
      allow_fallbacks: true,
    }
  }

  return {
    allow_fallbacks: true,
  }
}

async function emitTelemetry(
  telemetry: PromptTelemetryHook | undefined,
  event: PromptRunTelemetryEvent,
  bucket: PromptRunTelemetryEvent[],
) {
  bucket.push(event)
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new CustomEvent("prompt_run", { detail: event }))
  }
  if (telemetry) {
    await telemetry(event)
  }
}

async function capturePromptIntelligence(
  text: string,
  onIntelligence: PromptIntelligenceHook | undefined,
  metadata?: Record<string, unknown>,
) {
  if (!onIntelligence) return

  // Fragment Extraction: Look for structural decisions in the response
  const patterns: Array<{ category: PromptIntelligenceFragment["category"]; regex: RegExp }> = [
    { category: "architectural", regex: /ARCHITECTURE_DECISION:\s*(.*)/i },
    { category: "behavioral", regex: /PLAYER_BEHAVIOR_RULE:\s*(.*)/i },
    { category: "code_pattern", regex: /REUSABLE_CODE_PATTERN:\s*(.*)/i },
    { category: "ui_layout", regex: /UI_LAYOUT_PATTERN:\s*(.*)/i },
    { category: "mechanic_logic", regex: /CORE_MECHANIC_LOGIC:\s*(.*)/i },
  ]

  for (const { category, regex } of patterns) {
    const match = text.match(regex)
    if (match?.[1]) {
      const fragment: PromptIntelligenceFragment = {
        id: `frag_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        category,
        fragment: match[1].trim(),
        rationale: "Automatically extracted during prompt execution to evolve the engine's core knowledge.",
        tags: ["auto-extracted", ...(metadata?.genre ? [String(metadata.genre)] : [])],
        metadata,
      }
      // Fire and forget to not block the user, though we await in this internal loop for reliability
      await onIntelligence(fragment)
    }
  }
}

export function escapePromptValue(value: unknown) {
  return stringifyTemplateValue(value, false)
}

export function renderPromptTemplate({
  template,
  values = {},
  partials = {},
  preserveMissing = false,
  depth = 0,
}: RenderTemplateInput): string {
  if (depth > 8) {
    throw new Error("Prompt partial recursion exceeded the supported depth.")
  }

  let rendered = template

  rendered = rendered.replace(PARTIAL_PATTERN, (_match, partialName: string) => {
    const partial = partials[partialName]
    if (!partial) return buildMissingToken(`>${partialName}`, preserveMissing)

    return renderPromptTemplate({
      template: partial,
      values,
      partials,
      preserveMissing,
      depth: depth + 1,
    })
  })

  rendered = rendered.replace(RAW_VALUE_PATTERN, (_match, path: string) => {
    const value = getValueAtPath(values, path)
    if (value === undefined) return buildMissingToken(path, preserveMissing)
    return stringifyTemplateValue(value, true)
  })

  rendered = rendered.replace(ESCAPED_VALUE_PATTERN, (_match, path: string) => {
    const value = getValueAtPath(values, path)
    if (value === undefined) return buildMissingToken(path, preserveMissing)
    return stringifyTemplateValue(value, false)
  })

  return rendered
}

export function estimateTokens(text: string) {
  const normalized = text.trim()
  if (!normalized) return 0

  const newlineWeight = (normalized.match(/\n/g)?.length ?? 0) * 0.5
  return Math.max(1, Math.ceil((normalized.length / 4) + newlineWeight))
}

function renderMessageSections(messages: PromptMessageInput[]) {
  const renderedSections: RenderedSection[] = []

  messages.forEach((message, messageIndex) => {
    const sections = message.sections?.length
      ? message.sections
      : [{
          id: `${message.role}_${messageIndex}`,
          content: message.content,
          template: message.template,
          variables: message.variables,
          partials: message.partials,
          preserveMissing: message.preserveMissing,
        }]

    sections
      .filter((section) => section.enabled !== false)
      .forEach((section, sectionIndex) => {
        const key = `${message.role}:${section.id || `${messageIndex}_${sectionIndex}`}`
        const content = section.content ?? renderPromptTemplate({
          template: section.template ?? "",
          values: section.variables ?? message.variables ?? {},
          partials: section.partials ?? message.partials,
          preserveMissing: section.preserveMissing ?? message.preserveMissing ?? false,
        })
        const trimmedContent = content.trim()

        renderedSections.push({
          key,
          role: message.role,
          messageIndex,
          optional: section.optional ?? false,
          trimPriority: section.trimPriority ?? (section.optional ? 1 : Number.MAX_SAFE_INTEGER),
          content: trimmedContent,
          estimatedTokens: estimateTokens(trimmedContent),
        })
      })
  })

  return renderedSections
}

export function budgetPromptMessages(
  messages: PromptMessageInput[],
  maxInputTokens?: number,
): BudgetedPromptMessages {
  const sections = renderMessageSections(messages)
  const included = new Set(sections.map((section) => section.key))
  const omittedSections: string[] = []

  const totalTokens = () => {
    const messageCount = new Set(
      sections
        .filter((section) => included.has(section.key) && section.content)
        .map((section) => section.messageIndex),
    ).size

    return sections.reduce((sum, section) => {
      if (!included.has(section.key) || !section.content) return sum
      return sum + section.estimatedTokens
    }, messageCount * 4)
  }

  if (maxInputTokens && totalTokens() > maxInputTokens) {
    const optionalSections = [...sections]
      .filter((section) => section.optional)
      .sort((left, right) => {
        if (left.trimPriority !== right.trimPriority) {
          return left.trimPriority - right.trimPriority
        }
        return right.estimatedTokens - left.estimatedTokens
      })

    for (const section of optionalSections) {
      if (totalTokens() <= maxInputTokens) break
      included.delete(section.key)
      omittedSections.push(section.key)
    }
  }

  const roleMap = new Map<number, PromptRole>(messages.map((message, index) => [index, message.role]))
  const contentByMessage = new Map<number, string[]>()

  sections.forEach((section) => {
    if (!included.has(section.key) || !section.content) return
    const existing = contentByMessage.get(section.messageIndex) ?? []
    existing.push(section.content)
    contentByMessage.set(section.messageIndex, existing)
  })

  const budgetedMessages = [...contentByMessage.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([messageIndex, contentParts]) => ({
      role: roleMap.get(messageIndex) ?? "user",
      content: contentParts.join("\n\n"),
    }))
    .filter((message) => message.content.trim())

  return {
    messages: budgetedMessages,
    estimatedTokens: totalTokens(),
    omittedSections,
  }
}

function createVerificationFailure(
  prepared: PreparedPromptRun<unknown>,
  attempts: number,
  lastText: string,
  issues: string[],
  telemetry: PromptRunTelemetryEvent[],
  usage: PromptUsage,
): PromptRunFailure {
  return {
    ok: false,
    error: {
      code: "verification_failed",
      message: issues[0] ?? "Prompt output could not be verified.",
      attempts,
      issues,
      lastText,
    },
    usage,
    hash: prepared.hash,
    omittedSections: prepared.omittedSections,
    telemetry,
  }
}

function preparePromptRun<T>(input: PromptRunInput<T>): PreparedPromptRun<T> {
  const model = input.model ?? input.client.defaultModel
  if (!model) {
    throw new Error(`No model was configured for prompt run "${input.name}".`)
  }

  const budgeted = budgetPromptMessages(input.messages, input.maxInputTokens)
  const metadata = {
    ...input.metadata,
    ...(input.promptId ? { promptId: input.promptId } : {}),
    ...(input.promptVersion ? { promptVersion: input.promptVersion } : {}),
    ...(input.promptStage ? { promptStage: input.promptStage } : {}),
  }
  const request: PromptClientRequest = {
    messages: budgeted.messages,
    model,
    temperature: input.temperature,
    maxOutputTokens: input.maxOutputTokens,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    stream: input.stream,
  }

  const hash = hashPromptPayload({
    name: input.name,
    promptId: input.promptId,
    promptVersion: input.promptVersion,
    promptStage: input.promptStage,
    provider: input.client.provider,
    model,
    messages: request.messages,
  })

  return {
    input,
    request,
    hash,
    omittedSections: budgeted.omittedSections,
    estimatedTokens: budgeted.estimatedTokens,
  }
}

async function executePreparedPrompt<T>(
  prepared: PreparedPromptRun<T>,
  initialResponse?: PromptClientResponse,
): Promise<PromptRunResult<T>> {
  const telemetryEvents: PromptRunTelemetryEvent[] = []
  const retries = Math.max(0, prepared.input.retries ?? 0)
  const streamed = prepared.input.stream ?? false

  let usage: PromptUsage = {
    inputTokens: prepared.estimatedTokens,
  }
  let lastText = ""
  let verifierIssues: string[] = []

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const requestMessages = [...prepared.request.messages]

    if (attempt > 0 && prepared.input.verifier) {
      requestMessages.push({
        role: "user",
        content: buildRetryMessage(prepared.input.verifier.description, verifierIssues),
      })
    }

    const request: PromptClientRequest = {
      ...prepared.request,
      messages: requestMessages,
    }

    const startedAt = Date.now()

    try {
      const response = attempt === 0 && initialResponse
        ? initialResponse
        : await prepared.input.client.complete(request)
      const elapsedMs = Date.now() - startedAt
      lastText = response.text
      usage = normalizeUsage(response.usage, estimateTokens(requestMessages.map((message) => message.content).join("\n")))

      if (prepared.input.verifier) {
        try {
          const data = prepared.input.verifier.parse(response.text)

          await emitTelemetry(prepared.input.telemetry, {
            event: "prompt_run",
            name: prepared.input.name,
            promptId: prepared.input.promptId,
            promptVersion: prepared.input.promptVersion,
            promptStage: prepared.input.promptStage,
            provider: prepared.input.client.provider,
            model: request.model,
            attempt: attempt + 1,
            success: true,
            elapsedMs,
            hash: prepared.hash,
            inputTokens: usage.inputTokens ?? prepared.estimatedTokens,
            outputTokens: usage.outputTokens,
            totalTokens: usage.totalTokens,
            costUsd: usage.costUsd,
            streamed,
            omittedSections: prepared.omittedSections,
            metadata: prepared.input.metadata,
          }, telemetryEvents)

          // 🧠 Passive Intelligence Gathering (Phase 0)
          await capturePromptIntelligence(response.text, prepared.input.onIntelligence, prepared.input.metadata)

          return {
            ok: true,
            data,
            text: response.text,
            usage,
            attempts: attempt + 1,
            hash: prepared.hash,
            omittedSections: prepared.omittedSections,
            telemetry: telemetryEvents,
          }
        } catch (error) {
          verifierIssues = describeIssues(error)

          await emitTelemetry(prepared.input.telemetry, {
            event: "prompt_run",
            name: prepared.input.name,
            promptId: prepared.input.promptId,
            promptVersion: prepared.input.promptVersion,
            promptStage: prepared.input.promptStage,
            provider: prepared.input.client.provider,
            model: request.model,
            attempt: attempt + 1,
            success: false,
            elapsedMs,
            hash: prepared.hash,
            inputTokens: usage.inputTokens ?? prepared.estimatedTokens,
            outputTokens: usage.outputTokens,
            totalTokens: usage.totalTokens,
            costUsd: usage.costUsd,
            streamed,
            omittedSections: prepared.omittedSections,
            metadata: prepared.input.metadata,
            errorCode: "verification_failed",
          }, telemetryEvents)

          if (attempt === retries) {
            return createVerificationFailure(
              prepared as PreparedPromptRun<unknown>,
              attempt + 1,
              response.text,
              verifierIssues,
              telemetryEvents,
              usage,
            )
          }

          continue
        }
      }

      await emitTelemetry(prepared.input.telemetry, {
        event: "prompt_run",
        name: prepared.input.name,
        promptId: prepared.input.promptId,
        promptVersion: prepared.input.promptVersion,
        promptStage: prepared.input.promptStage,
        provider: prepared.input.client.provider,
        model: request.model,
        attempt: attempt + 1,
        success: true,
        elapsedMs,
        hash: prepared.hash,
        inputTokens: usage.inputTokens ?? prepared.estimatedTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        costUsd: usage.costUsd,
        streamed,
        omittedSections: prepared.omittedSections,
        metadata: prepared.input.metadata,
      }, telemetryEvents)

      // 🧠 Passive Intelligence Gathering (Phase 0)
      await capturePromptIntelligence(response.text, prepared.input.onIntelligence, prepared.input.metadata)

      return {
        ok: true,
        data: response.text as T,
        text: response.text,
        usage,
        attempts: attempt + 1,
        hash: prepared.hash,
        omittedSections: prepared.omittedSections,
        telemetry: telemetryEvents,
      }
    } catch (error) {
      const elapsedMs = Date.now() - startedAt
      const issues = describeIssues(error)
      const clientError = error instanceof PromptClientError ? error : null

      await emitTelemetry(prepared.input.telemetry, {
        event: "prompt_run",
        name: prepared.input.name,
        promptId: prepared.input.promptId,
        promptVersion: prepared.input.promptVersion,
        promptStage: prepared.input.promptStage,
        provider: prepared.input.client.provider,
        model: request.model,
        attempt: attempt + 1,
        success: false,
        elapsedMs,
        hash: prepared.hash,
        inputTokens: prepared.estimatedTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        costUsd: usage.costUsd,
        streamed,
        omittedSections: prepared.omittedSections,
        metadata: prepared.input.metadata,
        errorCode: "client_error",
      }, telemetryEvents)

        if (attempt === retries) {
        return {
          ok: false,
          error: {
            code: "client_error",
            message: issues[0] ?? "Prompt call failed.",
            attempts: attempt + 1,
            issues,
            lastText,
            status: clientError?.status,
            providerErrorType: clientError?.providerErrorType,
            category: clientError?.category,
            severity: clientError?.severity,
            retryStrategy: clientError?.retryStrategy,
            statusFamily: clientError?.statusFamily,
            headline: clientError?.headline,
            suggestedAction: clientError?.suggestedAction,
            affectedModel: clientError?.affectedModel,
            limitSummary: clientError?.limitSummary,
            signals: clientError?.signals,
            requestId: clientError?.requestId,
            retryable: clientError?.retryable,
            retryAfterSeconds: clientError?.retryAfterSeconds,
          },
          usage,
          hash: prepared.hash,
          omittedSections: prepared.omittedSections,
          telemetry: telemetryEvents,
        }
      }
    }
  }

  return createVerificationFailure(
    prepared as PreparedPromptRun<unknown>,
    retries + 1,
    lastText,
    verifierIssues,
    telemetryEvents,
    usage,
  )
}

export function createZodJsonVerifier<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
): PromptVerifier<z.output<TSchema>> {
  return {
    description: "valid JSON matching the provided schema",
    parse: (text) => {
      const parsed = JSON.parse(extractJsonCandidate(text))
      return schema.parse(parsed)
    },
  }
}

export async function runPrompt<T>(input: PromptRunInput<T>): Promise<PromptRunResult<T>> {
  const prepared = preparePromptRun(input)
  return executePreparedPrompt(prepared)
}

export async function* streamPromptText(input: Omit<PromptRunInput<unknown>, "verifier" | "retries" | "telemetry">) {
  const prepared = preparePromptRun({
    ...input,
    retries: 0,
  })

  if (prepared.input.client.stream) {
    yield* prepared.input.client.stream(prepared.request)
    return
  }

  const response = await prepared.input.client.complete(prepared.request)
  yield response.text
}

export async function runPromptBatch<T>(
  calls: PromptRunInput<T>[],
  options: PromptBatchOptions = {},
): Promise<Array<PromptRunResult<T>>> {
  const preparedRuns = calls.map((call) => preparePromptRun(call))
  const results = new Array<PromptRunResult<T>>(calls.length)
  const maxBatchSize = options.maxBatchSize ?? 4
  const smallPromptTokenThreshold = options.smallPromptTokenThreshold ?? 700

  const visited = new Set<number>()

  for (let index = 0; index < preparedRuns.length; index += 1) {
    if (visited.has(index)) continue

    const current = preparedRuns[index]
    const batchableIndices = [index]

    for (let candidateIndex = index + 1; candidateIndex < preparedRuns.length; candidateIndex += 1) {
      if (visited.has(candidateIndex)) continue
      const candidate = preparedRuns[candidateIndex]
      const sameClient = candidate.input.client === current.input.client
      const sameModel = candidate.request.model === current.request.model
      const batchable = sameClient
        && sameModel
        && typeof current.input.client.completeBatch === "function"
        && current.estimatedTokens <= smallPromptTokenThreshold
        && candidate.estimatedTokens <= smallPromptTokenThreshold

      if (!batchable) continue

      batchableIndices.push(candidateIndex)
      if (batchableIndices.length >= maxBatchSize) break
    }

    batchableIndices.forEach((batchIndex) => visited.add(batchIndex))

    if (batchableIndices.length > 1 && current.input.client.completeBatch) {
      const batchResponses = await current.input.client.completeBatch(
        batchableIndices.map((batchIndex) => preparedRuns[batchIndex].request),
      )

      for (let responseIndex = 0; responseIndex < batchResponses.length; responseIndex += 1) {
        const batchIndex = batchableIndices[responseIndex]
        results[batchIndex] = await executePreparedPrompt(
          preparedRuns[batchIndex],
          batchResponses[responseIndex],
        )
      }

      continue
    }

    results[index] = await executePreparedPrompt(current)
  }

  return results
}

export class PromptBatchManager {
  constructor(private readonly options: PromptBatchOptions = {}) {}

  async run<T>(calls: PromptRunInput<T>[]) {
    return runPromptBatch(calls, this.options)
  }
}

export interface ProviderClientConfig {
  provider: ExternalPromptProvider
  apiKey: string
  model?: string
  baseUrl?: string
}

function getOpenRouterAttributionHeaders() {
  const siteUrl = (
    (typeof window !== "undefined" && typeof window.location?.origin === "string" && window.location.origin.trim())
      ? window.location.origin.trim()
      : process.env.NEXT_PUBLIC_SITE_URL?.trim()
  ) || undefined

  return {
    ...(siteUrl ? { "HTTP-Referer": siteUrl } : {}),
    "X-Title": "Funaloo",
    "X-OpenRouter-Title": "Funaloo",
  }
}

function buildOpenAiCompatibleRequestBody(
  provider: "openrouter" | "gpt",
  request: PromptClientRequest,
  options?: {
    omitTemperature?: boolean
    omitMaxTokens?: boolean
    omitProviderPreferences?: boolean
  },
) {
  return {
    model: request.model,
    messages: toOpenAiMessages(request.messages),
    ...(!options?.omitTemperature && typeof request.temperature === "number"
      ? { temperature: request.temperature }
      : {}),
    ...(provider === "openrouter"
      ? (!options?.omitMaxTokens && typeof request.maxOutputTokens === "number"
        ? { max_tokens: request.maxOutputTokens }
        : {})
      : (typeof request.maxOutputTokens === "number"
        ? { max_completion_tokens: request.maxOutputTokens }
        : {})),
    ...(provider === "openrouter"
      ? (!options?.omitProviderPreferences
        ? { provider: buildOpenRouterProviderPreference(request) }
        : {})
      : {}),
    stream: false,
  }
}

function shouldRetryOpenRouterRequest(errorMessage: string) {
  const normalized = errorMessage.toLowerCase()
  return normalized.includes("unsupported parameter")
    || normalized.includes("unsupported params")
    || normalized.includes("unrecognized key")
    || normalized.includes("unknown field")
    || normalized.includes("temperature")
    || normalized.includes("max_tokens")
    || normalized.includes("max tokens")
    || normalized.includes("max_completion_tokens")
}

function createOpenAiCompatibleClient(
  provider: "openrouter" | "gpt",
  apiKey: string,
  model?: string,
  baseUrl?: string,
): PromptPipelineClient {
  const endpoint = provider === "openrouter"
    ? `${(baseUrl?.trim() || "https://openrouter.ai/api/v1").replace(/\/$/, "")}/chat/completions`
    : `${(baseUrl?.trim() || "https://api.openai.com/v1").replace(/\/$/, "")}/chat/completions`

  return {
    provider,
    defaultModel: model?.trim() || getDefaultProviderModel(provider),
    complete: async (request) => {
      const headers = {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(provider === "openrouter" ? getOpenRouterAttributionHeaders() : {}),
      }
      const sendRequest = async (body: Record<string, unknown>) => {
        try {
          return await fetch(endpoint, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
            cache: "no-store",
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : "Network request failed."
          throw new PromptClientError(buildPromptClientError({
            provider,
            message,
            model: request.model,
            retryable: true,
          }))
        }
      }
      const requestBody = buildOpenAiCompatibleRequestBody(provider, request)
      let response = await sendRequest(requestBody)
      let responseError = response.ok ? null : await readProviderError(provider, response.clone(), request.model)

      if (!response.ok) {
        if (provider === "openrouter" && responseError && shouldRetryOpenRouterRequest(responseError.message)) {
          const retryBodies = [
            buildOpenAiCompatibleRequestBody(provider, request, {
              omitTemperature: true,
              omitMaxTokens: true,
            }),
            buildOpenAiCompatibleRequestBody(provider, request, {
              omitProviderPreferences: true,
            }),
            buildOpenAiCompatibleRequestBody(provider, request, {
              omitTemperature: true,
              omitMaxTokens: true,
              omitProviderPreferences: true,
            }),
          ]

          const triedBodies = new Set([JSON.stringify(requestBody)])
          for (const retryBody of retryBodies) {
            const serialized = JSON.stringify(retryBody)
            if (triedBodies.has(serialized)) continue
            triedBodies.add(serialized)

            response = await sendRequest(retryBody)
            responseError = response.ok ? null : await readProviderError(provider, response.clone(), request.model)
            if (response.ok) {
              break
            }
          }
        }

        if (!response.ok) {
          throw new PromptClientError(responseError ?? buildPromptClientError({
            provider,
            message: `${provider} request failed with status ${response.status}`,
            status: response.status,
            model: request.model,
          }))
        }
      }

      const json = await response.json() as {
        choices?: Array<{ message?: { content?: unknown } }>
        usage?: {
          prompt_tokens?: number
          completion_tokens?: number
          total_tokens?: number
          cost?: number
        }
        cost?: number
      }
      const text = extractOpenAiText(json.choices?.[0]?.message?.content)
      if (!text.trim()) {
        throw new PromptClientError(buildPromptClientError({
          provider,
          message: "Provider returned no content. The route may be warming up, overloaded, or otherwise unavailable.",
          status: response.status,
          model: request.model,
          retryable: true,
        }))
      }

      return {
        text,
        usage: {
          inputTokens: json.usage?.prompt_tokens,
          outputTokens: json.usage?.completion_tokens,
          totalTokens: json.usage?.total_tokens,
          costUsd: typeof json.usage?.cost === "number"
            ? json.usage.cost
            : typeof json.cost === "number"
              ? json.cost
              : undefined,
        },
        raw: json,
      }
    },
  }
}

function createClaudeClient(apiKey: string, model?: string, baseUrl?: string): PromptPipelineClient {
  const endpoint = `${(baseUrl?.trim() || "https://api.anthropic.com").replace(/\/$/, "")}/v1/messages`

  return {
    provider: "claude",
    defaultModel: model?.trim() || getDefaultProviderModel("claude"),
    complete: async (request) => {
      const anthropicPayload = toAnthropicRequest(request.messages)
      let response: Response
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: request.model,
            max_tokens: request.maxOutputTokens ?? 700,
            temperature: request.temperature,
            system: anthropicPayload.system,
            messages: anthropicPayload.messages,
          }),
          cache: "no-store",
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : "Network request failed."
        throw new PromptClientError(buildPromptClientError({
          provider: "claude",
          message,
          model: request.model,
          retryable: true,
        }))
      }

      if (!response.ok) {
        const errorDetails = await readProviderError("claude", response, request.model)
        throw new PromptClientError(errorDetails)
      }

      const json = await response.json() as {
        content?: Array<{ type?: string; text?: string }>
        usage?: {
          input_tokens?: number
          output_tokens?: number
        }
      }
      const text = (json.content ?? [])
        .filter((block) => block?.type === "text" && typeof block.text === "string")
        .map((block) => block.text)
        .join("\n")
      if (!text.trim()) {
        throw new PromptClientError(buildPromptClientError({
          provider: "claude",
          message: "Provider returned no content. The route may be warming up, overloaded, or otherwise unavailable.",
          status: response.status,
          model: request.model,
          retryable: true,
        }))
      }

      return {
        text,
        usage: {
          inputTokens: json.usage?.input_tokens,
          outputTokens: json.usage?.output_tokens,
          totalTokens: (
            typeof json.usage?.input_tokens === "number" &&
            typeof json.usage?.output_tokens === "number"
          )
            ? json.usage.input_tokens + json.usage.output_tokens
            : undefined,
        },
        raw: json,
      }
    },
  }
}

export function createConfiguredLlmClient(config: ProviderClientConfig): PromptPipelineClient {
  if (config.provider === "claude") {
    return createClaudeClient(config.apiKey, config.model, config.baseUrl)
  }

  return createOpenAiCompatibleClient(config.provider, config.apiKey, config.model, config.baseUrl)
}
