import type { PromptProviderId } from "@/lib/engine/types"

export type ExternalPromptProvider = Exclude<PromptProviderId, "local">
export type ProviderModelUsage = "generationProfile" | "evaluation" | "candidateRanking" | "assetPlanning"
export type ProviderModelRoutingPolicy = "single-model" | "usage-specific" | "cost-optimized" | "quality-first"

export interface ProviderModelCatalogEntry {
  id: string
  provider: ExternalPromptProvider
  label: string
  group: string
  vendor: string
  description: string
  canonicalSlug?: string
  contextWindow?: number
  maxCompletionTokens?: number
  inputCostPerMillion?: number
  outputCostPerMillion?: number
  cachedInputCostPerMillion?: number
  qualityTier: "flagship" | "balanced" | "economy"
  speedTier: "slow" | "medium" | "fast"
  recommendedFor: ProviderModelUsage[]
  inputModalities?: string[]
  outputModalities?: string[]
  supportedParameters?: string[]
  supportsStructuredOutputs?: boolean
  supportsReasoning?: boolean
  catalogSource?: "static" | "live"
  sourceLabel: string
  sourceUrl: string
  verifiedOn: string
}

export interface ProviderModelRoutingMap extends Record<ProviderModelUsage, string> {}

export interface ProviderModelRoutingPolicyOption {
  id: ProviderModelRoutingPolicy
  label: string
  description: string
}

export interface ProviderModelUsageOption {
  id: ProviderModelUsage
  label: string
  description: string
}

const OPENAI_PRICING_URL = "https://openai.com/api/pricing"
const OPENAI_MODELS_URL = "https://developers.openai.com/api/docs/models"
const ANTHROPIC_MODELS_URL = "https://docs.anthropic.com/en/docs/about-claude/models"
const ANTHROPIC_PRICING_URL = "https://docs.anthropic.com/en/docs/about-claude/pricing"
const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models"
const OPENROUTER_VERIFIED_ON = "2026-03-29"
const ALL_PROVIDER_MODEL_USAGES: ProviderModelUsage[] = [
  "generationProfile",
  "evaluation",
  "candidateRanking",
  "assetPlanning",
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    : []
}

function readPositiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : undefined
}

function readCostPerMillion(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") {
    return undefined
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0
    ? parsed * 1_000_000
    : undefined
}

function titleCaseToken(value: string) {
  return value
    .split(/[-_/\s]+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ")
}

function formatOpenRouterVendorLabel(id: string) {
  const prefix = id.split("/")[0]?.trim().toLowerCase()

  switch (prefix) {
    case "openai":
      return "OpenAI"
    case "anthropic":
      return "Anthropic"
    case "google":
      return "Google"
    case "meta":
    case "meta-llama":
      return "Meta"
    case "mistralai":
      return "Mistral"
    case "deepseek":
      return "DeepSeek"
    case "x-ai":
      return "xAI"
    case "qwen":
      return "Qwen"
    case "moonshotai":
      return "MoonshotAI"
    case "nvidia":
      return "NVIDIA"
    case "reka":
      return "Reka"
    case "microsoft":
      return "Microsoft"
    default:
      return prefix ? titleCaseToken(prefix) : "OpenRouter"
  }
}

function deriveOpenRouterQualityTier(entry: {
  inputCostPerMillion?: number
  outputCostPerMillion?: number
  contextWindow?: number
  supportsReasoning?: boolean
}) {
  const combinedCost = (entry.inputCostPerMillion ?? 0) + (entry.outputCostPerMillion ?? 0)

  if (combinedCost >= 20 || ((entry.contextWindow ?? 0) >= 500_000 && entry.supportsReasoning)) {
    return "flagship" as const
  }

  if (combinedCost <= 1.5 && !entry.supportsReasoning) {
    return "economy" as const
  }

  return "balanced" as const
}

function deriveOpenRouterSpeedTier(entry: {
  inputCostPerMillion?: number
  outputCostPerMillion?: number
  contextWindow?: number
  supportsReasoning?: boolean
}) {
  const combinedCost = (entry.inputCostPerMillion ?? 0) + (entry.outputCostPerMillion ?? 0)

  if (combinedCost <= 2.5 && (entry.contextWindow ?? 0) <= 300_000 && !entry.supportsReasoning) {
    return "fast" as const
  }

  if (combinedCost >= 20 || entry.supportsReasoning) {
    return "slow" as const
  }

  return "medium" as const
}

export function findProviderModelEntryInCatalog(
  catalog: ProviderModelCatalogEntry[],
  modelId: string | null | undefined,
) {
  if (!modelId) return null
  return catalog.find((entry) => entry.id === modelId) ?? null
}

export function mergeProviderModelCatalogs(
  primary: ProviderModelCatalogEntry[],
  fallback: ProviderModelCatalogEntry[],
) {
  const merged = new Map<string, ProviderModelCatalogEntry>()

  fallback.forEach((entry) => {
    merged.set(entry.id, entry)
  })

  primary.forEach((entry) => {
    merged.set(entry.id, {
      ...merged.get(entry.id),
      ...entry,
    })
  })

  return [...merged.values()].sort((left, right) => (
    left.group.localeCompare(right.group)
    || left.label.localeCompare(right.label)
    || left.id.localeCompare(right.id)
  ))
}

export function parseOpenRouterModelCatalog(payload: unknown): ProviderModelCatalogEntry[] {
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    return []
  }

  return payload.data
    .map((entry): ProviderModelCatalogEntry | null => {
      if (!isRecord(entry) || typeof entry.id !== "string" || !entry.id.trim()) {
        return null
      }

      const architecture = isRecord(entry.architecture) ? entry.architecture : {}
      const pricing = isRecord(entry.pricing) ? entry.pricing : {}
      const topProvider = isRecord(entry.top_provider) ? entry.top_provider : {}
      const supportedParameters = readStringArray(entry.supported_parameters)
      const inputModalities = readStringArray(architecture.input_modalities)
      const outputModalities = readStringArray(architecture.output_modalities)
      const supportsStructuredOutputs = supportedParameters.includes("structured_outputs") || supportedParameters.includes("response_format")
      const supportsReasoning = supportedParameters.includes("reasoning") || supportedParameters.includes("include_reasoning")
      const inputCostPerMillion = readCostPerMillion(pricing.prompt)
      const outputCostPerMillion = readCostPerMillion(pricing.completion)
      const cachedInputCostPerMillion = readCostPerMillion(pricing.input_cache_read)
      const contextWindow = readPositiveNumber(topProvider.context_length) ?? readPositiveNumber(entry.context_length)
      const maxCompletionTokens = readPositiveNumber(topProvider.max_completion_tokens)
      const vendorLabel = formatOpenRouterVendorLabel(entry.id)

      return {
        id: entry.id.trim(),
        provider: "openrouter",
        label: typeof entry.name === "string" && entry.name.trim()
          ? entry.name.trim()
          : titleCaseToken(entry.id.trim().split("/").slice(1).join(" ") || entry.id.trim()),
        group: vendorLabel,
        vendor: `${vendorLabel} via OpenRouter`,
        description: typeof entry.description === "string" && entry.description.trim()
          ? entry.description.trim()
          : "Live OpenRouter catalog entry.",
        canonicalSlug: typeof entry.canonical_slug === "string" && entry.canonical_slug.trim()
          ? entry.canonical_slug.trim()
          : undefined,
        contextWindow,
        maxCompletionTokens,
        inputCostPerMillion,
        outputCostPerMillion,
        cachedInputCostPerMillion,
        qualityTier: deriveOpenRouterQualityTier({
          inputCostPerMillion,
          outputCostPerMillion,
          contextWindow,
          supportsReasoning,
        }),
        speedTier: deriveOpenRouterSpeedTier({
          inputCostPerMillion,
          outputCostPerMillion,
          contextWindow,
          supportsReasoning,
        }),
        recommendedFor: [...ALL_PROVIDER_MODEL_USAGES],
        inputModalities,
        outputModalities,
        supportedParameters,
        supportsStructuredOutputs,
        supportsReasoning,
        catalogSource: "live",
        sourceLabel: "OpenRouter models API",
        sourceUrl: OPENROUTER_MODELS_URL,
        verifiedOn: OPENROUTER_VERIFIED_ON,
      }
    })
    .filter((entry): entry is ProviderModelCatalogEntry => entry !== null)
    .sort((left, right) => (
      left.group.localeCompare(right.group)
      || left.label.localeCompare(right.label)
      || left.id.localeCompare(right.id)
    ))
}

export const PROVIDER_MODEL_ROUTING_POLICY_OPTIONS: ProviderModelRoutingPolicyOption[] = [
  {
    id: "single-model",
    label: "Single Model",
    description: "Use the provider's default model for every usage path.",
  },
  {
    id: "usage-specific",
    label: "Usage Specific",
    description: "Use the dedicated model selected for each usage path below.",
  },
  {
    id: "cost-optimized",
    label: "Cost Optimized",
    description: "Automatically choose the lowest-cost catalog model that fits each usage.",
  },
  {
    id: "quality-first",
    label: "Quality First",
    description: "Automatically choose the strongest catalog model that fits each usage.",
  },
]

export const PROVIDER_MODEL_USAGE_OPTIONS: ProviderModelUsageOption[] = [
  {
    id: "generationProfile",
    label: "Generation Refinement",
    description: "Used for provider-backed prompt refinement during generation.",
  },
  {
    id: "evaluation",
    label: "Evaluation / Graders",
    description: "Reserved for grader and eval-style checks as those stages go provider-backed.",
  },
  {
    id: "candidateRanking",
    label: "Candidate Ranking",
    description: "Reserved for candidate comparison, reranking, and debate synthesis.",
  },
  {
    id: "assetPlanning",
    label: "Asset Planning",
    description: "Reserved for deeper asset-planning or specialist prompt passes.",
  },
]

const PROVIDER_MODEL_CATALOG: Record<ExternalPromptProvider, ProviderModelCatalogEntry[]> = {
  gpt: [
    {
      id: "gpt-5.4",
      provider: "gpt",
      label: "GPT-5.4",
      group: "GPT-5.4",
      vendor: "OpenAI",
      description: "Flagship professional model for complex reasoning, coding, and long-form agentic work.",
      contextWindow: 1_000_000,
      inputCostPerMillion: 2.5,
      outputCostPerMillion: 15,
      cachedInputCostPerMillion: 0.25,
      qualityTier: "flagship",
      speedTier: "medium",
      recommendedFor: ["generationProfile", "evaluation", "candidateRanking", "assetPlanning"],
      supportsStructuredOutputs: true,
      supportsReasoning: true,
      sourceLabel: "OpenAI pricing and models docs",
      sourceUrl: OPENAI_MODELS_URL,
      verifiedOn: "2026-03-29",
    },
    {
      id: "gpt-5-mini",
      provider: "gpt",
      label: "GPT-5 mini",
      group: "GPT-5",
      vendor: "OpenAI",
      description: "Fast, cost-efficient GPT-5 variant for high-volume and well-defined tasks.",
      contextWindow: 400_000,
      inputCostPerMillion: 0.25,
      outputCostPerMillion: 2,
      cachedInputCostPerMillion: 0.025,
      qualityTier: "balanced",
      speedTier: "fast",
      recommendedFor: ["generationProfile", "evaluation", "candidateRanking", "assetPlanning"],
      supportsStructuredOutputs: true,
      supportsReasoning: true,
      sourceLabel: "OpenAI pricing and models docs",
      sourceUrl: OPENAI_PRICING_URL,
      verifiedOn: "2026-03-29",
    },
    {
      id: "gpt-5-nano",
      provider: "gpt",
      label: "GPT-5 nano",
      group: "GPT-5",
      vendor: "OpenAI",
      description: "Lowest-cost GPT-5 family option for lightweight classification and routing work.",
      contextWindow: 400_000,
      inputCostPerMillion: 0.05,
      outputCostPerMillion: 0.4,
      cachedInputCostPerMillion: 0.005,
      qualityTier: "economy",
      speedTier: "fast",
      recommendedFor: ["evaluation", "candidateRanking"],
      supportsStructuredOutputs: true,
      supportsReasoning: true,
      sourceLabel: "OpenAI pricing and models docs",
      sourceUrl: OPENAI_PRICING_URL,
      verifiedOn: "2026-03-29",
    },
    {
      id: "gpt-5-pro",
      provider: "gpt",
      label: "GPT-5 pro",
      group: "GPT-5",
      vendor: "OpenAI",
      description: "Most precise and expensive GPT-5 family model for maximum answer quality.",
      inputCostPerMillion: 15,
      outputCostPerMillion: 120,
      qualityTier: "flagship",
      speedTier: "slow",
      recommendedFor: ["generationProfile", "evaluation"],
      supportsStructuredOutputs: true,
      supportsReasoning: true,
      sourceLabel: "OpenAI pricing page",
      sourceUrl: OPENAI_PRICING_URL,
      verifiedOn: "2026-03-29",
    },
    {
      id: "gpt-4.1",
      provider: "gpt",
      label: "GPT-4.1",
      group: "GPT-4.1",
      vendor: "OpenAI",
      description: "Reliable prior-generation frontier model for strong general text and tool tasks.",
      inputCostPerMillion: 2,
      outputCostPerMillion: 8,
      cachedInputCostPerMillion: 0.5,
      qualityTier: "balanced",
      speedTier: "medium",
      recommendedFor: ["generationProfile", "assetPlanning"],
      supportsStructuredOutputs: true,
      sourceLabel: "OpenAI platform pricing docs",
      sourceUrl: "https://platform.openai.com/docs/pricing/",
      verifiedOn: "2026-03-29",
    },
    {
      id: "gpt-4.1-mini",
      provider: "gpt",
      label: "GPT-4.1 mini",
      group: "GPT-4.1",
      vendor: "OpenAI",
      description: "Lower-cost GPT-4.1 variant suited to compact eval and routing tasks.",
      inputCostPerMillion: 0.4,
      outputCostPerMillion: 1.6,
      cachedInputCostPerMillion: 0.1,
      qualityTier: "economy",
      speedTier: "fast",
      recommendedFor: ["evaluation", "candidateRanking", "assetPlanning"],
      supportsStructuredOutputs: true,
      sourceLabel: "OpenAI platform pricing docs",
      sourceUrl: "https://platform.openai.com/docs/pricing/",
      verifiedOn: "2026-03-29",
    },
  ],
  claude: [
    {
      id: "claude-opus-4-20250514",
      provider: "claude",
      label: "Claude Opus 4",
      group: "Claude 4",
      vendor: "Anthropic",
      description: "Highest-capability Claude 4 model for difficult coding, long-running, and agentic tasks.",
      inputCostPerMillion: 15,
      outputCostPerMillion: 75,
      cachedInputCostPerMillion: 1.5,
      qualityTier: "flagship",
      speedTier: "slow",
      recommendedFor: ["generationProfile", "evaluation"],
      supportsReasoning: true,
      sourceLabel: "Anthropic model overview and pricing docs",
      sourceUrl: ANTHROPIC_MODELS_URL,
      verifiedOn: "2026-03-29",
    },
    {
      id: "claude-sonnet-4-20250514",
      provider: "claude",
      label: "Claude Sonnet 4",
      group: "Claude 4",
      vendor: "Anthropic",
      description: "Balanced Claude 4 model for strong coding, reasoning, and everyday agent workflows.",
      inputCostPerMillion: 3,
      outputCostPerMillion: 15,
      cachedInputCostPerMillion: 0.3,
      qualityTier: "balanced",
      speedTier: "medium",
      recommendedFor: ["generationProfile", "evaluation", "candidateRanking", "assetPlanning"],
      supportsReasoning: true,
      sourceLabel: "Anthropic model overview and pricing docs",
      sourceUrl: ANTHROPIC_PRICING_URL,
      verifiedOn: "2026-03-29",
    },
    {
      id: "claude-3-5-haiku-latest",
      provider: "claude",
      label: "Claude Haiku 3.5",
      group: "Claude Haiku",
      vendor: "Anthropic",
      description: "Fast, economical Claude option for lighter eval, routing, and short-form specialist passes.",
      inputCostPerMillion: 0.8,
      outputCostPerMillion: 4,
      cachedInputCostPerMillion: 0.08,
      qualityTier: "economy",
      speedTier: "fast",
      recommendedFor: ["evaluation", "candidateRanking", "assetPlanning"],
      sourceLabel: "Anthropic pricing docs",
      sourceUrl: ANTHROPIC_PRICING_URL,
      verifiedOn: "2026-03-29",
    },
  ],
  openrouter: [
    {
      id: "openai/gpt-5.4",
      provider: "openrouter",
      label: "OpenAI GPT-5.4",
      group: "OpenAI",
      vendor: "OpenAI via OpenRouter",
      description: "OpenRouter access to GPT-5.4 for strong reasoning and coding.",
      contextWindow: 1_050_000,
      inputCostPerMillion: 2.5,
      outputCostPerMillion: 15,
      qualityTier: "flagship",
      speedTier: "medium",
      recommendedFor: ["generationProfile", "evaluation", "candidateRanking", "assetPlanning"],
      supportsStructuredOutputs: true,
      supportsReasoning: true,
      sourceLabel: "OpenRouter models API",
      sourceUrl: OPENROUTER_MODELS_URL,
      verifiedOn: "2026-03-29",
    },
    {
      id: "openai/gpt-5.4-mini",
      provider: "openrouter",
      label: "OpenAI GPT-5.4 Mini",
      group: "OpenAI",
      vendor: "OpenAI via OpenRouter",
      description: "Balanced OpenRouter option for cost-aware generation and eval work.",
      contextWindow: 400_000,
      inputCostPerMillion: 0.75,
      outputCostPerMillion: 4.5,
      qualityTier: "balanced",
      speedTier: "fast",
      recommendedFor: ["generationProfile", "evaluation", "candidateRanking", "assetPlanning"],
      supportsStructuredOutputs: true,
      supportsReasoning: true,
      sourceLabel: "OpenRouter models API",
      sourceUrl: OPENROUTER_MODELS_URL,
      verifiedOn: "2026-03-29",
    },
    {
      id: "openai/gpt-5.4-nano",
      provider: "openrouter",
      label: "OpenAI GPT-5.4 Nano",
      group: "OpenAI",
      vendor: "OpenAI via OpenRouter",
      description: "Economy GPT-5.4 route for very cheap routing or grader tasks.",
      contextWindow: 400_000,
      inputCostPerMillion: 0.2,
      outputCostPerMillion: 1.25,
      qualityTier: "economy",
      speedTier: "fast",
      recommendedFor: ["evaluation", "candidateRanking"],
      supportsStructuredOutputs: true,
      sourceLabel: "OpenRouter models API",
      sourceUrl: OPENROUTER_MODELS_URL,
      verifiedOn: "2026-03-29",
    },
    {
      id: "anthropic/claude-sonnet-4",
      provider: "openrouter",
      label: "Claude Sonnet 4",
      group: "Anthropic",
      vendor: "Anthropic via OpenRouter",
      description: "Balanced Claude route on OpenRouter for strong instruction following and coding.",
      contextWindow: 200_000,
      inputCostPerMillion: 3,
      outputCostPerMillion: 15,
      qualityTier: "balanced",
      speedTier: "medium",
      recommendedFor: ["generationProfile", "evaluation", "assetPlanning"],
      supportsReasoning: true,
      sourceLabel: "OpenRouter models API",
      sourceUrl: OPENROUTER_MODELS_URL,
      verifiedOn: "2026-03-29",
    },
    {
      id: "anthropic/claude-opus-4",
      provider: "openrouter",
      label: "Claude Opus 4",
      group: "Anthropic",
      vendor: "Anthropic via OpenRouter",
      description: "Most expensive Claude route on OpenRouter for maximum quality.",
      contextWindow: 200_000,
      inputCostPerMillion: 15,
      outputCostPerMillion: 75,
      qualityTier: "flagship",
      speedTier: "slow",
      recommendedFor: ["generationProfile", "evaluation"],
      supportsReasoning: true,
      sourceLabel: "OpenRouter models API",
      sourceUrl: OPENROUTER_MODELS_URL,
      verifiedOn: "2026-03-29",
    },
    {
      id: "google/gemini-2.5-pro",
      provider: "openrouter",
      label: "Gemini 2.5 Pro",
      group: "Google",
      vendor: "Google via OpenRouter",
      description: "High-context OpenRouter option for reasoning-heavy, multimodal, and long-context tasks.",
      contextWindow: 1_048_576,
      inputCostPerMillion: 1.25,
      outputCostPerMillion: 10,
      qualityTier: "flagship",
      speedTier: "medium",
      recommendedFor: ["generationProfile", "evaluation", "assetPlanning"],
      supportsStructuredOutputs: true,
      supportsReasoning: true,
      sourceLabel: "OpenRouter models API",
      sourceUrl: OPENROUTER_MODELS_URL,
      verifiedOn: "2026-03-29",
    },
    {
      id: "google/gemini-2.5-flash",
      provider: "openrouter",
      label: "Gemini 2.5 Flash",
      group: "Google",
      vendor: "Google via OpenRouter",
      description: "Low-latency, high-context OpenRouter option for speed-sensitive routes.",
      contextWindow: 1_048_576,
      inputCostPerMillion: 0.3,
      outputCostPerMillion: 2.5,
      qualityTier: "balanced",
      speedTier: "fast",
      recommendedFor: ["evaluation", "candidateRanking", "assetPlanning"],
      supportsStructuredOutputs: true,
      supportsReasoning: true,
      sourceLabel: "OpenRouter models API",
      sourceUrl: OPENROUTER_MODELS_URL,
      verifiedOn: "2026-03-29",
    },
    {
      id: "deepseek/deepseek-r1-0528",
      provider: "openrouter",
      label: "DeepSeek R1 0528",
      group: "DeepSeek",
      vendor: "DeepSeek via OpenRouter",
      description: "Reasoning-oriented open model route with lower token costs than many proprietary options.",
      contextWindow: 163_840,
      inputCostPerMillion: 0.45,
      outputCostPerMillion: 2.15,
      qualityTier: "balanced",
      speedTier: "medium",
      recommendedFor: ["evaluation", "candidateRanking", "assetPlanning"],
      supportsStructuredOutputs: true,
      supportsReasoning: true,
      sourceLabel: "OpenRouter models API",
      sourceUrl: OPENROUTER_MODELS_URL,
      verifiedOn: "2026-03-29",
    },
    {
      id: "meta-llama/llama-4-maverick",
      provider: "openrouter",
      label: "Llama 4 Maverick",
      group: "Meta",
      vendor: "Meta via OpenRouter",
      description: "Cheap long-context OpenRouter route for experimental and lower-stakes generation passes.",
      contextWindow: 1_048_576,
      inputCostPerMillion: 0.15,
      outputCostPerMillion: 0.6,
      qualityTier: "economy",
      speedTier: "fast",
      recommendedFor: ["evaluation", "candidateRanking", "assetPlanning"],
      supportsStructuredOutputs: true,
      sourceLabel: "OpenRouter models API",
      sourceUrl: OPENROUTER_MODELS_URL,
      verifiedOn: "2026-03-29",
    },
  ],
}

const DEFAULT_PROVIDER_MODELS: Record<ExternalPromptProvider, string> = {
  claude: "claude-sonnet-4-20250514",
  openrouter: "openai/gpt-5.4-mini",
  gpt: "gpt-5-mini",
}

const DEFAULT_PROVIDER_BASE_URLS: Record<ExternalPromptProvider, string> = {
  claude: "https://api.anthropic.com",
  openrouter: "https://openrouter.ai/api/v1",
  gpt: "https://api.openai.com/v1",
}

const DEFAULT_PROVIDER_ROUTING_POLICIES: Record<ExternalPromptProvider, ProviderModelRoutingPolicy> = {
  claude: "single-model",
  openrouter: "single-model",
  gpt: "single-model",
}

const DEFAULT_PROVIDER_MODEL_ROUTING: Record<ExternalPromptProvider, ProviderModelRoutingMap> = {
  claude: {
    generationProfile: "claude-sonnet-4-20250514",
    evaluation: "claude-3-5-haiku-latest",
    candidateRanking: "claude-sonnet-4-20250514",
    assetPlanning: "claude-sonnet-4-20250514",
  },
  openrouter: {
    generationProfile: "openai/gpt-5.4",
    evaluation: "openai/gpt-5.4-mini",
    candidateRanking: "google/gemini-2.5-flash",
    assetPlanning: "anthropic/claude-sonnet-4",
  },
  gpt: {
    generationProfile: "gpt-5.4",
    evaluation: "gpt-5-mini",
    candidateRanking: "gpt-5-mini",
    assetPlanning: "gpt-5-mini",
  },
}

function qualityRank(entry: ProviderModelCatalogEntry) {
  switch (entry.qualityTier) {
    case "flagship":
      return 3
    case "balanced":
      return 2
    default:
      return 1
  }
}

function speedRank(entry: ProviderModelCatalogEntry) {
  switch (entry.speedTier) {
    case "fast":
      return 3
    case "medium":
      return 2
    default:
      return 1
  }
}

export function getProviderModelCatalog(provider: ExternalPromptProvider) {
  return PROVIDER_MODEL_CATALOG[provider]
}

export function getProviderModelEntry(
  provider: ExternalPromptProvider,
  modelId: string | null | undefined,
) {
  return findProviderModelEntryInCatalog(getProviderModelCatalog(provider), modelId)
}

export function getDefaultProviderModel(provider: ExternalPromptProvider) {
  return DEFAULT_PROVIDER_MODELS[provider]
}

export function getDefaultProviderBaseUrl(provider: ExternalPromptProvider) {
  return DEFAULT_PROVIDER_BASE_URLS[provider]
}

export function getDefaultProviderRoutingPolicy(provider: ExternalPromptProvider) {
  return DEFAULT_PROVIDER_ROUTING_POLICIES[provider]
}

export function getDefaultProviderModelRouting(provider: ExternalPromptProvider): ProviderModelRoutingMap {
  return { ...DEFAULT_PROVIDER_MODEL_ROUTING[provider] }
}

export function formatCostPerMillion(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "n/a"
  return `$${value.toFixed(value >= 10 ? 0 : value >= 1 ? 2 : 3)}`
}

export function formatProviderModelCostSummary(entry: ProviderModelCatalogEntry | null | undefined) {
  if (!entry) {
    return "Custom model ID"
  }

  const input = formatCostPerMillion(entry.inputCostPerMillion)
  const output = formatCostPerMillion(entry.outputCostPerMillion)
  const cached = typeof entry.cachedInputCostPerMillion === "number"
    ? ` · cached ${formatCostPerMillion(entry.cachedInputCostPerMillion)}`
    : ""

  return `${input} in · ${output} out${cached}`
}

function getEntriesForUsage(provider: ExternalPromptProvider, usage: ProviderModelUsage) {
  const matching = getProviderModelCatalog(provider).filter((entry) => entry.recommendedFor.includes(usage))
  return matching.length > 0 ? matching : getProviderModelCatalog(provider)
}

function chooseCostOptimizedModel(provider: ExternalPromptProvider, usage: ProviderModelUsage) {
  return [...getEntriesForUsage(provider, usage)]
    .filter((entry) => typeof entry.inputCostPerMillion === "number")
    .sort((left, right) => {
      const leftCost = (left.inputCostPerMillion ?? Number.MAX_SAFE_INTEGER) + (left.outputCostPerMillion ?? 0)
      const rightCost = (right.inputCostPerMillion ?? Number.MAX_SAFE_INTEGER) + (right.outputCostPerMillion ?? 0)
      return leftCost - rightCost || speedRank(right) - speedRank(left)
    })[0] ?? getProviderModelCatalog(provider)[0]
}

function chooseQualityFirstModel(provider: ExternalPromptProvider, usage: ProviderModelUsage) {
  return [...getEntriesForUsage(provider, usage)]
    .sort((left, right) => (
      qualityRank(right) - qualityRank(left)
      || speedRank(right) - speedRank(left)
      || (left.inputCostPerMillion ?? 0) - (right.inputCostPerMillion ?? 0)
    ))[0] ?? getProviderModelCatalog(provider)[0]
}

export function resolveProviderModelForUsage(input: {
  provider: ExternalPromptProvider
  defaultModel: string
  usageModels: ProviderModelRoutingMap
  routingPolicy: ProviderModelRoutingPolicy
  usage: ProviderModelUsage
}) {
  const defaultModel = input.defaultModel.trim() || getDefaultProviderModel(input.provider)
  const usageModel = input.usageModels[input.usage]?.trim()

  switch (input.routingPolicy) {
    case "usage-specific":
      return usageModel || defaultModel
    case "cost-optimized":
      return chooseCostOptimizedModel(input.provider, input.usage).id
    case "quality-first":
      return chooseQualityFirstModel(input.provider, input.usage).id
    default:
      return defaultModel
  }
}
