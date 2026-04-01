import { GENRE_TEMPLATES } from "@/lib/engine/config"
import type { DashboardPageId } from "@/lib/project-storage"
import type { Email, Genre, GenerationFeedbackScoreBand, ProjectId, PromptProviderId, TargetEngine, UserProject } from "@/lib/engine/types"
import type {
  ExternalPromptProvider,
  ProviderModelRoutingMap,
  ProviderModelRoutingPolicy,
  ProviderModelUsage,
} from "@/lib/provider-models"
import {
  getDefaultProviderBaseUrl,
  getDefaultProviderModel,
  getDefaultProviderModelRouting,
  getDefaultProviderRoutingPolicy,
} from "@/lib/provider-models"
import type { UserAiSettings, UserConnections } from "@/lib/user-store"

export function isGenre(value: unknown): value is Genre {
  return typeof value === "string" && value in GENRE_TEMPLATES
}

export function isTargetEngine(value: unknown): value is TargetEngine {
  return value === "unreal" || value === "godot" || value === "unity" || value === "custom"
}

const PROMPT_PROVIDERS = ["local", "claude", "openrouter", "gpt"] as const

function coercePromptProviderId(value: unknown): PromptProviderId | null {
  if (value === "openai") return "gpt"
  return isPromptProviderId(value) ? value : null
}

export function isPromptProviderId(value: unknown): value is PromptProviderId {
  return PROMPT_PROVIDERS.includes(value as PromptProviderId)
}

export function isProjectStatus(value: unknown): value is UserProject["status"] {
  return value === "creating" || value === "generating" || value === "complete" || value === "failed"
}

export function isGenerationFeedbackScoreBand(value: unknown): value is GenerationFeedbackScoreBand {
  return value === "failed" || value === "1-2" || value === "3-4" || value === "5-6" || value === "7-8" || value === "9-10"
}

export function isDashboardPage(value: unknown): value is DashboardPageId {
  return value === "home" || value === "create" || value === "projects" || value === "game"
}

const USER_ROLES = ["user", "admin"] as const
export function isUserRole(value: unknown): value is (typeof USER_ROLES)[number] {
  return USER_ROLES.includes(value as (typeof USER_ROLES)[number])
}

export function isUserConnections(value: unknown): value is UserConnections {
  if (!value || typeof value !== "object") return false

  const candidate = value as Partial<Record<keyof UserConnections, unknown>>
  return (
    typeof candidate.discord === "string" &&
    typeof candidate.twitter === "string" &&
    typeof candidate.github === "string" &&
    typeof candidate.linkedin === "string" &&
    typeof candidate.website === "string"
  )
}

export function createEmptyConnections(): UserConnections {
  return {
    discord: "",
    twitter: "",
    github: "",
    linkedin: "",
    website: "",
  }
}

export function createEmptyUserAiSettings(): UserAiSettings {
  return {
    defaultProvider: "local",
    apiKeys: {
      claude: "",
      openrouter: "",
      gpt: "",
    },
    models: {
      claude: getDefaultProviderModel("claude"),
      openrouter: getDefaultProviderModel("openrouter"),
      gpt: getDefaultProviderModel("gpt"),
    },
    modelRouting: {
      claude: getDefaultProviderModelRouting("claude"),
      openrouter: getDefaultProviderModelRouting("openrouter"),
      gpt: getDefaultProviderModelRouting("gpt"),
    },
    routingPolicies: {
      claude: getDefaultProviderRoutingPolicy("claude"),
      openrouter: getDefaultProviderRoutingPolicy("openrouter"),
      gpt: getDefaultProviderRoutingPolicy("gpt"),
    },
    baseUrls: {
      claude: getDefaultProviderBaseUrl("claude"),
      openrouter: getDefaultProviderBaseUrl("openrouter"),
      gpt: getDefaultProviderBaseUrl("gpt"),
    },
    updatedAt: {
      claude: null,
      openrouter: null,
      gpt: null,
    },
  }
}

function isProviderModelRoutingPolicy(value: unknown): value is ProviderModelRoutingPolicy {
  return value === "single-model"
    || value === "usage-specific"
    || value === "cost-optimized"
    || value === "quality-first"
}

function normalizeProviderModelRouting(
  provider: ExternalPromptProvider,
  value: unknown,
  defaults: ProviderModelRoutingMap,
): ProviderModelRoutingMap {
  const candidate = value && typeof value === "object" ? value as Partial<Record<ProviderModelUsage, unknown>> : {}

  return {
    generationProfile:
      typeof candidate.generationProfile === "string" && candidate.generationProfile.trim()
        ? candidate.generationProfile.trim()
        : defaults.generationProfile,
    evaluation:
      typeof candidate.evaluation === "string" && candidate.evaluation.trim()
        ? candidate.evaluation.trim()
        : defaults.evaluation,
    candidateRanking:
      typeof candidate.candidateRanking === "string" && candidate.candidateRanking.trim()
        ? candidate.candidateRanking.trim()
        : defaults.candidateRanking,
    assetPlanning:
      typeof candidate.assetPlanning === "string" && candidate.assetPlanning.trim()
        ? candidate.assetPlanning.trim()
        : defaults.assetPlanning,
  }
}

export function normalizeUserConnections(value: unknown): UserConnections {
  if (!value || typeof value !== "object") {
    return createEmptyConnections()
  }

  const record = value as Partial<Record<keyof UserConnections, unknown>>

  return {
    discord: typeof record.discord === "string" ? record.discord : "",
    twitter: typeof record.twitter === "string" ? record.twitter : "",
    github: typeof record.github === "string" ? record.github : "",
    linkedin: typeof record.linkedin === "string" ? record.linkedin : "",
    website: typeof record.website === "string" ? record.website : "",
  }
}

export function normalizeUserAiSettings(value: unknown): UserAiSettings {
  if (!value || typeof value !== "object") {
    return createEmptyUserAiSettings()
  }

  const candidate = value as Partial<UserAiSettings> & {
    defaultProvider?: unknown
    preferredProvider?: unknown
    apiKeys?: Partial<Record<Exclude<PromptProviderId, "local"> | "openai", unknown>>
    models?: Partial<Record<Exclude<PromptProviderId, "local"> | "openai", unknown>>
    modelRouting?: Partial<Record<Exclude<PromptProviderId, "local"> | "openai", unknown>>
    routingPolicies?: Partial<Record<Exclude<PromptProviderId, "local"> | "openai", unknown>>
    baseUrls?: Partial<Record<Exclude<PromptProviderId, "local"> | "openai", unknown>>
    updatedAt?: Partial<Record<Exclude<PromptProviderId, "local"> | "openai", unknown>>
    providers?: Partial<
      Record<
        Exclude<PromptProviderId, "local"> | "openai",
        {
          apiKey?: unknown
          model?: unknown
          modelRouting?: unknown
          routingPolicy?: unknown
          baseUrl?: unknown
          updatedAt?: unknown
        }
      >
    >
  }
  const defaults = createEmptyUserAiSettings()
  const apiKeys: Partial<Record<Exclude<PromptProviderId, "local"> | "openai", unknown>> = candidate.apiKeys ?? {}
  const models: Partial<Record<Exclude<PromptProviderId, "local"> | "openai", unknown>> = candidate.models ?? {}
  const modelRouting: Partial<Record<Exclude<PromptProviderId, "local"> | "openai", unknown>> = candidate.modelRouting ?? {}
  const routingPolicies: Partial<Record<Exclude<PromptProviderId, "local"> | "openai", unknown>> = candidate.routingPolicies ?? {}
  const baseUrls: Partial<Record<Exclude<PromptProviderId, "local"> | "openai", unknown>> = candidate.baseUrls ?? {}
  const updatedAt: Partial<Record<Exclude<PromptProviderId, "local"> | "openai", unknown>> = candidate.updatedAt ?? {}
  const providers: Partial<
    Record<
      Exclude<PromptProviderId, "local"> | "openai",
        {
          apiKey?: unknown
          model?: unknown
          modelRouting?: unknown
          routingPolicy?: unknown
          baseUrl?: unknown
          updatedAt?: unknown
        }
    >
  > = candidate.providers ?? {}

  const readProviderValue = (
    provider: Exclude<PromptProviderId, "local">,
    field: "apiKey" | "model" | "baseUrl" | "updatedAt",
  ) => {
    const legacyProvider = provider === "gpt" ? "openai" : provider
    const providerRecord = providers[provider] ?? providers[legacyProvider]
    if (providerRecord && typeof providerRecord === "object") {
      return providerRecord[field]
    }
    return undefined
  }

  const readProviderRoutingValue = (
    provider: ExternalPromptProvider,
    field: "modelRouting" | "routingPolicy",
  ) => {
    const legacyProvider = provider === "gpt" ? "openai" : provider
    const providerRecord = providers[provider] ?? providers[legacyProvider]
    if (providerRecord && typeof providerRecord === "object") {
      return providerRecord[field]
    }
    return undefined
  }

  return {
    defaultProvider:
      coercePromptProviderId(candidate.defaultProvider ?? candidate.preferredProvider) ?? "local",
    apiKeys: {
      claude: typeof (apiKeys.claude ?? readProviderValue("claude", "apiKey")) === "string"
        ? String(apiKeys.claude ?? readProviderValue("claude", "apiKey")).trim()
        : defaults.apiKeys.claude,
      openrouter: typeof (apiKeys.openrouter ?? readProviderValue("openrouter", "apiKey")) === "string"
        ? String(apiKeys.openrouter ?? readProviderValue("openrouter", "apiKey")).trim()
        : defaults.apiKeys.openrouter,
      gpt: typeof (apiKeys.gpt ?? apiKeys.openai ?? readProviderValue("gpt", "apiKey")) === "string"
        ? String(apiKeys.gpt ?? apiKeys.openai ?? readProviderValue("gpt", "apiKey")).trim()
        : defaults.apiKeys.gpt,
    },
    models: {
      claude: typeof (models.claude ?? readProviderValue("claude", "model")) === "string" &&
        String(models.claude ?? readProviderValue("claude", "model")).trim()
        ? String(models.claude ?? readProviderValue("claude", "model")).trim()
        : defaults.models.claude,
      openrouter: typeof (models.openrouter ?? readProviderValue("openrouter", "model")) === "string" &&
        String(models.openrouter ?? readProviderValue("openrouter", "model")).trim()
        ? String(models.openrouter ?? readProviderValue("openrouter", "model")).trim()
        : defaults.models.openrouter,
      gpt: typeof (models.gpt ?? models.openai ?? readProviderValue("gpt", "model")) === "string" &&
        String(models.gpt ?? models.openai ?? readProviderValue("gpt", "model")).trim()
        ? String(models.gpt ?? models.openai ?? readProviderValue("gpt", "model")).trim()
        : defaults.models.gpt,
    },
    modelRouting: {
      claude: normalizeProviderModelRouting(
        "claude",
        modelRouting.claude ?? readProviderRoutingValue("claude", "modelRouting"),
        defaults.modelRouting.claude,
      ),
      openrouter: normalizeProviderModelRouting(
        "openrouter",
        modelRouting.openrouter ?? readProviderRoutingValue("openrouter", "modelRouting"),
        defaults.modelRouting.openrouter,
      ),
      gpt: normalizeProviderModelRouting(
        "gpt",
        modelRouting.gpt ?? modelRouting.openai ?? readProviderRoutingValue("gpt", "modelRouting"),
        defaults.modelRouting.gpt,
      ),
    },
    routingPolicies: {
      claude: isProviderModelRoutingPolicy(routingPolicies.claude ?? readProviderRoutingValue("claude", "routingPolicy"))
        ? routingPolicies.claude as ProviderModelRoutingPolicy
        : isProviderModelRoutingPolicy(readProviderRoutingValue("claude", "routingPolicy"))
          ? readProviderRoutingValue("claude", "routingPolicy") as ProviderModelRoutingPolicy
          : defaults.routingPolicies.claude,
      openrouter: isProviderModelRoutingPolicy(routingPolicies.openrouter ?? readProviderRoutingValue("openrouter", "routingPolicy"))
        ? routingPolicies.openrouter as ProviderModelRoutingPolicy
        : isProviderModelRoutingPolicy(readProviderRoutingValue("openrouter", "routingPolicy"))
          ? readProviderRoutingValue("openrouter", "routingPolicy") as ProviderModelRoutingPolicy
          : defaults.routingPolicies.openrouter,
      gpt: isProviderModelRoutingPolicy(routingPolicies.gpt ?? routingPolicies.openai ?? readProviderRoutingValue("gpt", "routingPolicy"))
        ? (routingPolicies.gpt ?? routingPolicies.openai) as ProviderModelRoutingPolicy
        : isProviderModelRoutingPolicy(readProviderRoutingValue("gpt", "routingPolicy"))
          ? readProviderRoutingValue("gpt", "routingPolicy") as ProviderModelRoutingPolicy
          : defaults.routingPolicies.gpt,
    },
    baseUrls: {
      claude: typeof (baseUrls.claude ?? readProviderValue("claude", "baseUrl")) === "string" &&
        String(baseUrls.claude ?? readProviderValue("claude", "baseUrl")).trim()
        ? String(baseUrls.claude ?? readProviderValue("claude", "baseUrl")).trim()
        : defaults.baseUrls.claude,
      openrouter: typeof (baseUrls.openrouter ?? readProviderValue("openrouter", "baseUrl")) === "string" &&
        String(baseUrls.openrouter ?? readProviderValue("openrouter", "baseUrl")).trim()
        ? String(baseUrls.openrouter ?? readProviderValue("openrouter", "baseUrl")).trim()
        : defaults.baseUrls.openrouter,
      gpt: typeof (baseUrls.gpt ?? baseUrls.openai ?? readProviderValue("gpt", "baseUrl")) === "string" &&
        String(baseUrls.gpt ?? baseUrls.openai ?? readProviderValue("gpt", "baseUrl")).trim()
        ? String(baseUrls.gpt ?? baseUrls.openai ?? readProviderValue("gpt", "baseUrl")).trim()
        : defaults.baseUrls.gpt,
    },
    updatedAt: {
      claude:
        typeof (updatedAt.claude ?? readProviderValue("claude", "updatedAt")) === "string"
          ? String(updatedAt.claude ?? readProviderValue("claude", "updatedAt"))
          : defaults.updatedAt.claude,
      openrouter:
        typeof (updatedAt.openrouter ?? readProviderValue("openrouter", "updatedAt")) === "string"
          ? String(updatedAt.openrouter ?? readProviderValue("openrouter", "updatedAt"))
          : defaults.updatedAt.openrouter,
      gpt:
        typeof (updatedAt.gpt ?? updatedAt.openai ?? readProviderValue("gpt", "updatedAt")) === "string"
          ? String(updatedAt.gpt ?? updatedAt.openai ?? readProviderValue("gpt", "updatedAt"))
          : defaults.updatedAt.gpt,
    },
  }
}

export function normalizeEmail(email: unknown): string {
  if (typeof email !== "string") return ""
  return email.trim().toLowerCase()
}

export function createEmail(raw: string): Email {
  return raw.trim().toLowerCase() as Email
}

export function createProjectId(raw?: string): ProjectId {
  if (raw && raw.trim()) return raw.trim() as ProjectId
  return `proj_${Math.random().toString(36).slice(2, 8)}` as ProjectId
}
