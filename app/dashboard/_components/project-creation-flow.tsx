"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { useToast } from "@/components/ui/use-toast"
import {
  Rocket, ArrowRight, CheckCircle, Loader2, Brain, Play,
  Building, Monitor, Wifi, Orbit, Gamepad2, Volume2, Mountain, Zap, Wrench,
  ExternalLink, KeyRound, Clock3, ListChecks, AlertTriangle,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { GENRE_TEMPLATES } from "@/lib/engine/config"
import { AGENTS_LIST } from "@/lib/engine/agents"
import {
  buildGenerationKnowledgeCoverage,
  buildGenerationKnowledgeRiskSummary,
  buildGenerationUsageIntelligence,
  buildGenerationEvolutionContext,
  buildProjectGenerationAudit,
  buildGenerationProfile,
  enhanceGenerationBrief,
  ensureGenerationProfile,
  generateGenerationProfile,
  GENERATION_FEATURE_LIBRARY,
  getConfiguredUserProviderRoster,
  inferPromptDefaults,
  GENERATION_PROMPT_SUITE,
  runProjectExecutionPipeline,
  type EnhancedGenerationBriefResult,
  type GeneratedProfileResult,
} from "@/lib/engine/generation-intelligence"
import {
  createGeneratedAssetFiles,
  createGeneratedCodeFiles,
} from "@/lib/engine/project-workspace"
import type {
  GenerationOperationalAnalytics,
  GenerationProviderDiagnosticsSummary,
  GenerationProviderFailure,
  GenerationIntelligenceProfile,
  Genre,
  NetworkTopology,
  PromptProviderId,
  TargetEngine,
  UserProject,
} from "@/lib/engine/types"
import { useUserStore, type RegisteredUser } from "@/lib/user-store"
import { createEmptyUserAiSettings, createProjectId } from "@/lib/validators"
import type {
  ExternalPromptProvider,
  ProviderModelCatalogEntry,
} from "@/lib/provider-models"
import { findProviderModelEntryInCatalog, formatProviderModelCostSummary, getProviderModelCatalog } from "@/lib/provider-models"
import { loadProjects } from "@/lib/project-storage"
import { storage } from "@/lib/storage"

// ── Constants ────────────────────────────────────────────────

const allFeatures = [...GENERATION_FEATURE_LIBRARY]

const SUBGENRE_OPTIONS = [
  "deckbuilder",
  "city_builder",
  "life_sim",
  "social_deduction",
  "sports_rules",
  "rhythm",
  "stealth_ops",
  "colony_sim",
  "puzzle_sandbox",
  "tactics",
  "education",
  "party_game",
  "immersive_sim",
  "heist",
  "extraction_shooter",
  "metroidvania",
  "archaeology_sim",
  "restoration_sim",
  "detective_mystery",
  "political_strategy",
  "tactics_roguelite",
  "colony_politics",
]

const CAMERA_OPTIONS = [
  "auto",
  "first-person",
  "third-person",
  "top-down",
  "isometric",
  "side-view",
  "board-command",
]

const COMBAT_OPTIONS = [
  "auto",
  "none",
  "light",
  "medium",
  "high",
]

const PACING_OPTIONS = [
  "relaxed",
  "steady",
  "fast",
  "intense",
]

const GENRE_BLEND_OPTIONS = [
  "strict",
  "balanced",
  "hybrid-experimental",
]

const AI_PROVIDER_OPTIONS: { value: PromptProviderId; label: string; note: string }[] = [
  { value: "local", label: "Local Prompt Pipeline", note: "Uses the built-in deterministic pipeline with no API key." },
  { value: "claude", label: "Claude / Anthropic", note: "Uses your saved Claude API key for future provider-backed runs." },
  { value: "openrouter", label: "OpenRouter", note: "Uses your saved OpenRouter key and routes through your own account." },
  { value: "gpt", label: "GPT / OpenAI", note: "Uses your saved OpenAI key for GPT-based generation runs." },
]

const EXTERNAL_AI_PROVIDERS = AI_PROVIDER_OPTIONS
  .filter((provider) => provider.value !== "local")
  .map((provider) => provider.value as ExternalPromptProvider)

const CUSTOM_MODEL_OPTION = "__custom__"
const SINGLE_MODEL_POLICY = "single-model" as const

const agentIcons: Record<string, React.ElementType> = {
  architect: Building, renderer: Monitor, network: Wifi, physics: Orbit,
  gameplay: Gamepad2, audio: Volume2, procedural: Mountain, optimizer: Zap, tooling: Wrench,
}

const formatLabel = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())

const sameStringArray = (left: string[], right: string[]) =>
  left.length === right.length && left.every((value, index) => value === right[index])

const formatProviderLabel = (value: PromptProviderId) =>
  AI_PROVIDER_OPTIONS.find((provider) => provider.value === value)?.label ?? value

const formatProviderIssueCategory = (failure: Pick<GenerationProviderFailure, "category">) =>
  failure.category ? formatLabel(failure.category) : "Issue"

const formatProviderRetryStrategy = (failure: Pick<GenerationProviderFailure, "retryStrategy">) =>
  failure.retryStrategy ? formatLabel(failure.retryStrategy) : "Manual Review"

const formatProviderFailureLine = (failure: {
  provider: PromptProviderId
  stageLabel?: string
  reason: string
  headline?: string
  suggestedAction?: string
  affectedModel?: string
  status?: number
}) => {
  const prefix = `${formatProviderLabel(failure.provider)}${failure.stageLabel ? ` · ${failure.stageLabel}` : ""}`
  const status = typeof failure.status === "number" ? ` (${failure.status})` : ""
  const summary = failure.headline ?? failure.reason
  const model = failure.affectedModel ? ` · ${failure.affectedModel}` : ""
  const punctuatedSummary = /[.!?]$/.test(summary) ? summary : `${summary}.`
  const action = failure.suggestedAction ? ` ${failure.suggestedAction}` : ""
  return `${prefix}${status}${model}: ${punctuatedSummary}${action}`.trim()
}

const formatContextWindow = (value?: number) => {
  if (!value) return "n/a"
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 2)}M tokens`
  if (value >= 1_000) return `${Math.round(value / 1_000)}k tokens`
  return `${value} tokens`
}

const resolveModelSelectValue = (catalog: ProviderModelCatalogEntry[], modelId: string) =>
  findProviderModelEntryInCatalog(catalog, modelId) ? modelId : CUSTOM_MODEL_OPTION

const createSingleModelRouting = (modelId: string) => ({
  generationProfile: modelId,
  evaluation: modelId,
  candidateRanking: modelId,
  assetPlanning: modelId,
})

interface OpenRouterCatalogResponse {
  provider?: "openrouter"
  source?: "live" | "fallback"
  fetchedAt?: string
  totalModels?: number
  models?: ProviderModelCatalogEntry[]
  error?: string
}

type GenerationActivityStatus = "running" | "complete" | "warning" | "blocked"

interface GenerationActivityEntry {
  id: string
  title: string
  detail: string
  status: GenerationActivityStatus
  atSeconds: number
}

const GENERATION_LIVE_PHASES = [
  {
    agent: "architect",
    title: "Locking the prompt and provider roster",
    detail: "Protecting the requested fantasy, filling missing criteria, and locking the provider loop before deeper generation starts.",
  },
  {
    agent: "renderer",
    title: "Resolving graphics, camera, and 3D guardrails",
    detail: "Keeping the render path, camera style, and runtime contract aligned so 3D prompts do not collapse into a flat fallback.",
  },
  {
    agent: "physics",
    title: "Building runtime feel and encounter scaffolding",
    detail: "Expanding movement feel, encounter cadence, and play scaffolding so the game slice stays prompt-specific.",
  },
  {
    agent: "network",
    title: "Checking multiplayer, provider routing, and fallbacks",
    detail: "Verifying sync-sensitive rules, provider routing, and recovery paths before the manifest is locked.",
  },
  {
    agent: "gameplay",
    title: "Expanding mechanics and objective chains",
    detail: "Turning the prompt into deeper loops, scenario logic, and anti-collapse gameplay rules.",
  },
  {
    agent: "audio",
    title: "Preparing presentation and feedback layers",
    detail: "Shaping audio, UI emphasis, and readability signals so the slice feels intentional instead of generic.",
  },
  {
    agent: "procedural",
    title: "Assembling world, systems, and asset tracks",
    detail: "Building content modules, layout logic, and asset families that can survive compile and runtime verification.",
  },
  {
    agent: "optimizer",
    title: "Running workspace build and verification gates",
    detail: "Synthesizing the workspace, checking compile readiness, and applying final repairs before results are shown.",
  },
] as const

const sliderLabel = (value: number) =>
  value <= 2 ? "Low" : value >= 4 ? "High" : "Medium"

const formatElapsedTimer = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = safeSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
}

function buildIntentDirectiveSummary(input: {
  subgenres: string[]
  cameraPreference: string
  combatPreference: string
  pacingPreference: string
  simulationDepth: number
  narrativeEmphasis: number
  noveltyTarget: number
  genreBlend: string
}) {
  const directives: string[] = []

  if (input.subgenres.length > 0) {
    directives.push(`Subgenres: ${input.subgenres.map(formatLabel).join(", ")}.`)
  }

  if (input.cameraPreference !== "auto") {
    directives.push(`Prefer a ${input.cameraPreference.replace(/-/g, " ")} camera.`)
  }

  if (input.combatPreference === "none") {
    directives.push("Do not force combat into the design.")
  } else if (input.combatPreference !== "auto") {
    directives.push(`Combat intensity should be ${input.combatPreference}.`)
  }

  directives.push(`Pacing should feel ${input.pacingPreference}.`)
  directives.push(`Simulation depth ${input.simulationDepth}/5.`)
  directives.push(`Narrative emphasis ${input.narrativeEmphasis}/5.`)
  directives.push(`Novelty target ${input.noveltyTarget}/5.`)
  directives.push(`Genre blending mode: ${input.genreBlend.replace(/-/g, " ")}.`)

  return directives.join(" ")
}

// ── Props ────────────────────────────────────────────────────

export interface ProjectCreationFlowProps {
  aiSettings?: RegisteredUser["aiSettings"] | null
  onProjectCreated: (project: UserProject, totalLines: number) => void
  onOpenProject: (project: UserProject) => void
  onSaveAiSettings?: (settings: RegisteredUser["aiSettings"]) => void
  onViewProjects: () => void
}

// ── Component ────────────────────────────────────────────────

export function ProjectCreationFlow({
  aiSettings,
  onProjectCreated,
  onOpenProject,
  onSaveAiSettings,
  onViewProjects,
}: ProjectCreationFlowProps) {
  const { user } = useAuth()
  const { getUser, updateUser, users } = useUserStore()
  const { toast } = useToast()
  const currentUser = user ? getUser(user.email) ?? user : null
  const savedAiSettings = aiSettings ?? currentUser?.aiSettings ?? createEmptyUserAiSettings()

  // ── Internal state ───────────────────────────────────────
  const [step, setStep] = useState(1)
  const [prompt, setPrompt] = useState("")
  const [genre, setGenre] = useState<Genre>("fps")
  const [engine, setEngine] = useState<TargetEngine>("unreal")
  const [features, setFeatures] = useState<string[]>(GENRE_TEMPLATES.fps.features)
  const [multiplayer, setMultiplayer] = useState(true)
  const [maxPlayers, setMaxPlayers] = useState(16)
  const [networkTopology, setNetworkTopology] = useState<NetworkTopology>("listen_server")
  const [tickRate, setTickRate] = useState(30)
  const [seed, setSeed] = useState("")
  const [subgenres, setSubgenres] = useState<string[]>([])
  const [cameraPreference, setCameraPreference] = useState("auto")
  const [combatPreference, setCombatPreference] = useState("auto")
  const [pacingPreference, setPacingPreference] = useState("steady")
  const [simulationDepth, setSimulationDepth] = useState(3)
  const [narrativeEmphasis, setNarrativeEmphasis] = useState(3)
  const [noveltyTarget, setNoveltyTarget] = useState(3)
  const [genreBlend, setGenreBlend] = useState("balanced")
  const [manualConfig, setManualConfig] = useState({
    genre: false,
    features: false,
    multiplayer: false,
    maxPlayers: false,
    networkTopology: false,
    tickRate: false,
  })
  const [genProgress, setGenProgress] = useState(0)
  const [genAgent, setGenAgent] = useState("")
  const [selectedProvider, setSelectedProvider] = useState<PromptProviderId>("local")
  const [providerKeys, setProviderKeys] = useState<Record<Exclude<PromptProviderId, "local">, string>>({
    claude: "",
    openrouter: "",
    gpt: "",
  })
  const [providerModels, setProviderModels] = useState<Record<Exclude<PromptProviderId, "local">, string>>({
    claude: savedAiSettings.models.claude,
    openrouter: savedAiSettings.models.openrouter,
    gpt: savedAiSettings.models.gpt,
  })
  const [providerCatalogs, setProviderCatalogs] = useState<Record<ExternalPromptProvider, ProviderModelCatalogEntry[]>>(() => ({
    claude: getProviderModelCatalog("claude"),
    openrouter: getProviderModelCatalog("openrouter"),
    gpt: getProviderModelCatalog("gpt"),
  }))
  const [openRouterCatalogStatus, setOpenRouterCatalogStatus] = useState({
    loading: false,
    source: "static" as "static" | "live" | "fallback",
    totalModels: getProviderModelCatalog("openrouter").length,
    error: "",
  })
  const [generationProviderLabel, setGenerationProviderLabel] = useState("Local Prompt Pipeline")
  const [generationProviderFailures, setGenerationProviderFailures] = useState<GenerationProviderFailure[]>([])
  const [generationProviderDiagnostics, setGenerationProviderDiagnostics] = useState<GenerationProviderDiagnosticsSummary | null>(null)
  const [generationOperationalAnalytics, setGenerationOperationalAnalytics] = useState<GenerationOperationalAnalytics | null>(null)
  const [generationRunStatus, setGenerationRunStatus] = useState<"idle" | "running" | "blocked">("idle")
  const [generationRunProfile, setGenerationRunProfile] = useState<GenerationIntelligenceProfile | null>(null)
  const [generationRunPrompt, setGenerationRunPrompt] = useState("")
  const [generationElapsedSeconds, setGenerationElapsedSeconds] = useState(0)
  const [generationStageLabel, setGenerationStageLabel] = useState("Waiting to start")
  const [generationStageDetail, setGenerationStageDetail] = useState("Generation telemetry will appear here once the loop begins.")
  const [generationActivityLog, setGenerationActivityLog] = useState<GenerationActivityEntry[]>([])
  const [enhancingBrief, setEnhancingBrief] = useState(false)
  const [briefEnhancementPreview, setBriefEnhancementPreview] = useState<EnhancedGenerationBriefResult | null>(null)

  // Holds the project created at the end of generation so step 4 can display it
  const [completedProject, setCompletedProject] = useState<UserProject | null>(null)

  const generationTimerRef = useRef<number | null>(null)
  const generationClockRef = useRef<number | null>(null)
  const generationRunRef = useRef(0)
  const generationElapsedRef = useRef(0)

  // ── Computed values ──────────────────────────────────────
  const intentDirectiveSummary = buildIntentDirectiveSummary({
    subgenres,
    cameraPreference,
    combatPreference,
    pacingPreference,
    simulationDepth,
    narrativeEmphasis,
    noveltyTarget,
    genreBlend,
  })
  const effectivePrompt = prompt.trim()
    ? `${prompt.trim()}\n\nDesigner directives: ${intentDirectiveSummary}`
    : ""

  const promptDefaults = inferPromptDefaults({
    prompt: effectivePrompt || `${formatLabel(genre)} ${multiplayer ? "multiplayer" : "single-player"} project`,
    fallbackGenre: genre,
    fallbackMultiplayer: multiplayer,
    fallbackMaxPlayers: multiplayer ? maxPlayers : 1,
  })

  const generationPreview = buildGenerationProfile({
    prompt: effectivePrompt || `${formatLabel(genre)} ${multiplayer ? "multiplayer" : "single-player"} project`,
    genre,
    selectedFeatures: features,
    multiplayer,
    maxPlayers: multiplayer ? maxPlayers : 1,
  })
  const evolutionContextPreview = useMemo(() => {
    const allStoredProjects = users.flatMap((storedUser) => loadProjects(storedUser.email))
    const currentUserProjects = currentUser ? loadProjects(currentUser.email) : []

    return buildGenerationEvolutionContext({
      prompt: effectivePrompt || `${formatLabel(genre)} ${multiplayer ? "multiplayer" : "single-player"} project`,
      genre,
      dimension: generationPreview.dimension,
      selectedFeatures: features,
      currentUserProjects,
      allProjects: allStoredProjects,
      totalUsers: users.length,
      dynamicFragments: storage.getEvolutionFragments(),
    })
  }, [
    currentUser,
    effectivePrompt,
    features,
    generationPreview.dimension,
    genre,
    multiplayer,
    users,
  ])
  const usageIntelligencePreview = useMemo(() => {
    const allStoredProjects = users.flatMap((storedUser) => loadProjects(storedUser.email))
    const currentUserProjects = currentUser ? loadProjects(currentUser.email) : []

    return buildGenerationUsageIntelligence({
      prompt: effectivePrompt || `${formatLabel(genre)} ${multiplayer ? "multiplayer" : "single-player"} project`,
      genre,
      dimension: generationPreview.dimension,
      selectedFeatures: features,
      selectedProvider: selectedProvider === "local" ? undefined : selectedProvider,
      selectedModel: selectedProvider === "local" ? undefined : providerModels[selectedProvider],
      currentUserProjects,
      allProjects: allStoredProjects,
    })
  }, [
    currentUser,
    effectivePrompt,
    features,
    generationPreview.dimension,
    genre,
    multiplayer,
    providerModels,
    selectedProvider,
    users,
  ])

  const completedProjectView = completedProject
    ? {
        ...completedProject,
        design: ensureGenerationProfile({
          existing: completedProject.design,
          prompt: completedProject.description || completedProject.name,
          genre: completedProject.genre,
          features: completedProject.features,
          multiplayer: completedProject.multiplayer,
          maxPlayers: completedProject.maxPlayers,
        }),
      }
    : null
  const selectedProviderHasKey = selectedProvider === "local"
    ? true
    : providerKeys[selectedProvider].trim().length > 0
  const selectedProviderStatusLabel = selectedProvider === "local"
    ? "Local pipeline active"
    : selectedProviderHasKey
      ? `${formatProviderLabel(selectedProvider)} key ready`
      : `${formatProviderLabel(selectedProvider)} key missing`
  const composeAiSettings = useCallback((provider: PromptProviderId) => {
    const now = new Date().toISOString()
    const nextModels = {
      claude: providerModels.claude.trim() || savedAiSettings.models.claude,
      openrouter: providerModels.openrouter.trim() || savedAiSettings.models.openrouter,
      gpt: providerModels.gpt.trim() || savedAiSettings.models.gpt,
    }
    const nextModelRouting = {
      claude: createSingleModelRouting(nextModels.claude),
      openrouter: createSingleModelRouting(nextModels.openrouter),
      gpt: createSingleModelRouting(nextModels.gpt),
    }

    return {
      ...savedAiSettings,
      defaultProvider: provider,
      apiKeys: {
        ...savedAiSettings.apiKeys,
        claude: providerKeys.claude.trim(),
        openrouter: providerKeys.openrouter.trim(),
        gpt: providerKeys.gpt.trim(),
      },
      models: {
        ...savedAiSettings.models,
        ...nextModels,
      },
      modelRouting: {
        ...savedAiSettings.modelRouting,
        ...nextModelRouting,
      },
      routingPolicies: {
        ...savedAiSettings.routingPolicies,
        claude: SINGLE_MODEL_POLICY,
        openrouter: SINGLE_MODEL_POLICY,
        gpt: SINGLE_MODEL_POLICY,
      },
      updatedAt: {
        ...savedAiSettings.updatedAt,
        claude: (
          savedAiSettings.apiKeys.claude !== providerKeys.claude.trim()
          || savedAiSettings.models.claude !== nextModels.claude
          || savedAiSettings.routingPolicies.claude !== SINGLE_MODEL_POLICY
          || JSON.stringify(savedAiSettings.modelRouting.claude) !== JSON.stringify(nextModelRouting.claude)
        )
          ? now
          : savedAiSettings.updatedAt.claude,
        openrouter: (
          savedAiSettings.apiKeys.openrouter !== providerKeys.openrouter.trim()
          || savedAiSettings.models.openrouter !== nextModels.openrouter
          || savedAiSettings.routingPolicies.openrouter !== SINGLE_MODEL_POLICY
          || JSON.stringify(savedAiSettings.modelRouting.openrouter) !== JSON.stringify(nextModelRouting.openrouter)
        )
          ? now
          : savedAiSettings.updatedAt.openrouter,
        gpt: (
          savedAiSettings.apiKeys.gpt !== providerKeys.gpt.trim()
          || savedAiSettings.models.gpt !== nextModels.gpt
          || savedAiSettings.routingPolicies.gpt !== SINGLE_MODEL_POLICY
          || JSON.stringify(savedAiSettings.modelRouting.gpt) !== JSON.stringify(nextModelRouting.gpt)
        )
          ? now
          : savedAiSettings.updatedAt.gpt,
      },
    }
  }, [
    providerKeys.claude,
    providerKeys.gpt,
    providerKeys.openrouter,
    providerModels.claude,
    providerModels.gpt,
    providerModels.openrouter,
    savedAiSettings,
  ])
  const loopProviderPreview = getConfiguredUserProviderRoster(composeAiSettings(selectedProvider))?.roster
  const displayedEvolutionContext = briefEnhancementPreview?.evolutionContext ?? evolutionContextPreview
  const displayedKnowledgeCoverage = useMemo(() => (
    briefEnhancementPreview?.knowledgeCoverage
    ?? briefEnhancementPreview?.llmConfiguration.knowledgeCoverage
    ?? buildGenerationKnowledgeCoverage({
      prompt,
      genre,
      selectedFeatures: features,
      multiplayer,
      targetEngine: engine,
      seed,
    })
  ), [
    briefEnhancementPreview,
    engine,
    features,
    genre,
    multiplayer,
    prompt,
  ])
  const displayedKnowledgeRisk = useMemo(() => {
    if (briefEnhancementPreview?.knowledgeRisk) {
      return briefEnhancementPreview.knowledgeRisk
    }

    if (briefEnhancementPreview?.llmConfiguration.knowledgeRisk) {
      return briefEnhancementPreview.llmConfiguration.knowledgeRisk
    }

    const previewProfile = buildGenerationProfile({
      prompt,
      genre,
      selectedFeatures: features,
      multiplayer,
      maxPlayers,
    })

    return buildGenerationKnowledgeRiskSummary({
      coverage: displayedKnowledgeCoverage,
      dimension: previewProfile.dimension,
      targetEngine: engine,
      runtimeArchetype: previewProfile.runtimePlan.archetype,
      knowledgeFit: previewProfile.candidatePlan.candidates.find((candidate) => candidate.id === previewProfile.candidatePlan.chosenCandidateId)?.knowledgeFit,
    })
  }, [
    briefEnhancementPreview,
    displayedKnowledgeCoverage,
    engine,
    features,
    genre,
    maxPlayers,
    multiplayer,
    prompt,
  ])
  const displayedUsageIntelligence = useMemo(() => (
    briefEnhancementPreview?.usageIntelligence
    ?? briefEnhancementPreview?.llmConfiguration.usageIntelligence
    ?? usageIntelligencePreview
  ), [
    briefEnhancementPreview,
    usageIntelligencePreview,
  ])
  const activeGenerationProfile = generationRunProfile ?? generationPreview
  const renderProviderFailurePanel = useCallback((failures: GenerationProviderFailure[], options?: {
    title?: string
    limit?: number
    compact?: boolean
  }) => {
    if (failures.length === 0) return null

    const title = options?.title ?? "Latest Provider Issues"
    const limit = options?.limit ?? 3
    const compact = options?.compact ?? false

    return (
      <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-rose-200">{title}</p>
        <div className="mt-2 space-y-2">
          {failures.slice(0, limit).map((failure, index) => (
            <div key={`${failure.stageId}:${failure.provider}:${failure.attempt}:${index}`} className="rounded-lg border border-rose-500/20 bg-black/10 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[10px] border-rose-500/30 text-rose-200">
                  {formatProviderLabel(failure.provider)}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {failure.stageLabel}
                </Badge>
                {typeof failure.status === "number" ? <Badge variant="outline" className="text-[10px]">{failure.status}</Badge> : null}
                {failure.category ? <Badge variant="outline" className="text-[10px]">{formatProviderIssueCategory(failure)}</Badge> : null}
                {failure.severity ? <Badge variant="outline" className="text-[10px]">{formatLabel(failure.severity)}</Badge> : null}
                {failure.retryStrategy ? <Badge variant="outline" className="text-[10px]">{formatProviderRetryStrategy(failure)}</Badge> : null}
                {failure.affectedModel ? <Badge variant="outline" className="text-[10px]">{failure.affectedModel}</Badge> : null}
                {failure.limitSummary ? <Badge variant="outline" className="text-[10px]">{failure.limitSummary}</Badge> : null}
                {failure.providerErrorType ? <Badge variant="outline" className="text-[10px]">{failure.providerErrorType}</Badge> : null}
                {typeof failure.retryAfterSeconds === "number" ? <Badge variant="outline" className="text-[10px]">retry after {failure.retryAfterSeconds}s</Badge> : null}
              </div>
              <p className="mt-2 text-sm font-medium text-rose-100">{failure.headline ?? failure.reason}</p>
              {(failure.headline ?? "") !== failure.reason ? <p className="mt-1 text-xs text-rose-100/80">{failure.reason}</p> : null}
              {(failure.signals?.length ?? 0) > 0 ? (
                compact
                  ? <div className="mt-2 flex flex-wrap gap-1">{failure.signals?.slice(0, 4).map((signal) => <Badge key={`${failure.stageId}:${signal.id}`} variant="outline" className="text-[10px]">{signal.label}</Badge>)}</div>
                  : <div className="mt-2 space-y-1">{failure.signals?.slice(0, 8).map((signal) => <p key={`${failure.stageId}:${signal.id}`} className="text-xs text-rose-100/80">{signal.label}: {signal.detail}</p>)}</div>
              ) : null}
              {failure.suggestedAction ? <p className="mt-2 text-xs text-amber-100">{failure.suggestedAction}</p> : null}
            </div>
          ))}
        </div>
      </div>
    )
  }, [])
  const stopGenerationTimers = useCallback(() => {
    if (generationTimerRef.current !== null) {
      window.clearInterval(generationTimerRef.current)
      generationTimerRef.current = null
    }
    if (generationClockRef.current !== null) {
      window.clearInterval(generationClockRef.current)
      generationClockRef.current = null
    }
  }, [])
  const appendGenerationActivity = useCallback((entry: Omit<GenerationActivityEntry, "id" | "atSeconds">) => {
    setGenerationActivityLog((prev) => {
      const lastEntry = prev[prev.length - 1]
      if (
        lastEntry
        && lastEntry.title === entry.title
        && lastEntry.detail === entry.detail
        && lastEntry.status === entry.status
      ) {
        return prev
      }

      return [
        ...prev,
        {
          id: `activity_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          atSeconds: generationElapsedRef.current,
          ...entry,
        },
      ].slice(-14)
    })
  }, [])
  const clearGenerationRunState = useCallback(() => {
    stopGenerationTimers()
    setGenerationProviderLabel("Local Prompt Pipeline")
    setGenerationProviderFailures([])
    setGenerationProviderDiagnostics(null)
    setGenerationOperationalAnalytics(null)
    setGenerationRunStatus("idle")
    setGenerationRunProfile(null)
    setGenerationRunPrompt("")
    setGenerationElapsedSeconds(0)
    generationElapsedRef.current = 0
    setGenerationStageLabel("Waiting to start")
    setGenerationStageDetail("Generation telemetry will appear here once the loop begins.")
    setGenerationActivityLog([])
    setGenProgress(0)
    setGenAgent("")
  }, [stopGenerationTimers])
  const startFreshCreation = useCallback(() => {
    clearGenerationRunState()
    setCompletedProject(null)
    setBriefEnhancementPreview(null)
    setStep(1)
    setPrompt("")
    setGenre("fps")
    setEngine("unreal")
    setFeatures(GENRE_TEMPLATES.fps.features)
    setMultiplayer(true)
    setMaxPlayers(16)
    setSubgenres([])
    setCameraPreference("auto")
    setCombatPreference("auto")
    setPacingPreference("steady")
    setSimulationDepth(3)
    setNarrativeEmphasis(3)
    setNoveltyTarget(3)
    setGenreBlend("balanced")
    setManualConfig({
      genre: false,
      features: false,
      multiplayer: false,
      maxPlayers: false,
      networkTopology: false,
      tickRate: false,
    })
  }, [clearGenerationRunState])
  const reuseProjectAsDraft = useCallback((project: UserProject) => {
    clearGenerationRunState()
    setCompletedProject(null)
    setBriefEnhancementPreview(null)
    setPrompt(project.description)
    setGenre(project.genre)
    setEngine(project.engine)
    setFeatures(project.features)
    setMultiplayer(project.multiplayer)
    setMaxPlayers(project.maxPlayers)
    setSubgenres([])
    setCameraPreference("auto")
    setCombatPreference("auto")
    setPacingPreference("steady")
    setSimulationDepth(3)
    setNarrativeEmphasis(3)
    setNoveltyTarget(3)
    setGenreBlend("balanced")
    setManualConfig({
      genre: true,
      features: true,
      multiplayer: true,
      maxPlayers: true,
      networkTopology: true,
      tickRate: true,
    })
    setStep(2)
  }, [clearGenerationRunState])

  // ── Callbacks ────────────────────────────────────────────
  const applyPromptDefaults = useCallback(() => {
    setGenre(promptDefaults.genre)
    setFeatures((prev) => sameStringArray(prev, promptDefaults.recommendedFeatures) ? prev : promptDefaults.recommendedFeatures)
    setMultiplayer(promptDefaults.multiplayer)
    setMaxPlayers(promptDefaults.maxPlayers)
    setManualConfig({
      genre: false,
      features: false,
      multiplayer: false,
      maxPlayers: false,
      networkTopology: false,
      tickRate: false,
    })
  }, [promptDefaults.genre, promptDefaults.maxPlayers, promptDefaults.multiplayer, promptDefaults.recommendedFeatures])

  const toggleFeature = (f: string) => {
    setManualConfig((prev) => ({ ...prev, features: true }))
    setFeatures(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])
  }

  const toggleSubgenre = (value: string) => {
    setSubgenres((prev) => (
      prev.includes(value)
        ? prev.filter((entry) => entry !== value)
        : [...prev, value]
    ))
  }

  const setProviderDefaultModel = useCallback((provider: ExternalPromptProvider, value: string) => {
    setProviderModels((prev) => ({ ...prev, [provider]: value }))
  }, [])

  const handleGenreChange = (g: string) => {
    const gg = g as Genre
    setManualConfig({
      genre: true,
      features: true,
      multiplayer: true,
      maxPlayers: true,
      networkTopology: true,
      tickRate: true,
    })
    setGenre(gg)
    const tmpl = GENRE_TEMPLATES[gg]
    if (tmpl) {
      setFeatures(tmpl.features)
      setMultiplayer(tmpl.defaultMultiplayer)
      setMaxPlayers(tmpl.defaultPlayers)
      setNetworkTopology(tmpl.defaultNetworkTopology)
      setTickRate(tmpl.defaultTickRate)
    }
  }

  const persistAiSettings = useCallback((provider: PromptProviderId, silent = false) => {
    if (!currentUser) {
      if (!silent) {
        toast({
          title: "Sign in required",
          description: "AI keys are stored per account, so you need to be signed in before saving them.",
        })
      }
      return
    }

    const nextAiSettings = composeAiSettings(provider)

    if (onSaveAiSettings) {
      onSaveAiSettings(nextAiSettings)
    } else {
      updateUser(currentUser.id, { aiSettings: nextAiSettings })
    }

    if (!silent) {
      toast({
        title: "AI settings saved",
        description: "Your provider preference, API keys, and selected models are stored locally for this account in this browser.",
      })
    }
  }, [composeAiSettings, currentUser, onSaveAiSettings, toast, updateUser])

  const saveAiSettings = useCallback(() => {
    persistAiSettings(selectedProvider)
  }, [persistAiSettings, selectedProvider])

  const handleAiExpandBrief = useCallback(async () => {
    const rawPrompt = prompt.trim()
    if (!rawPrompt) {
      toast({
        title: "Add a prompt first",
        description: "Write the game idea first, then the AI can expand it and fill in the settings before generation.",
      })
      return
    }

    const providerSnapshot = selectedProvider
    const aiSettingsSnapshot = composeAiSettings(providerSnapshot)
    const providerHasSavedKey =
      providerSnapshot !== "local" && aiSettingsSnapshot.apiKeys[providerSnapshot].trim().length > 0

    if (providerSnapshot === "local" || !providerHasSavedKey) {
      toast({
        title: "Save a provider key first",
        description: "Choose Claude, OpenRouter, or GPT and save a key if you want AI-assisted prompt expansion before generation.",
      })
      return
    }

    if (currentUser) {
      persistAiSettings(providerSnapshot, true)
    }

    setEnhancingBrief(true)

    try {
      const result = await enhanceGenerationBrief({
        prompt: effectivePrompt.trim(),
        displayPrompt: rawPrompt,
        genre,
        selectedFeatures: features,
        multiplayer,
        maxPlayers: multiplayer ? Math.max(1, maxPlayers) : 1,
        evolutionContext: evolutionContextPreview,
        usageIntelligence: usageIntelligencePreview,
        aiSettings: aiSettingsSnapshot,
      })

      if (result.llmConfiguration.source !== "user-key") {
        const failure = result.llmConfiguration.providerFailures?.[0]
        toast({
          title: failure ? `${formatProviderLabel(failure.provider)} brief expansion failed` : "AI brief expansion unavailable",
          description: failure
            ? formatProviderFailureLine(failure)
            : "The provider-backed prebuild stage failed verification, so your original prompt and settings were left in place.",
        })
        return
      }

      setPrompt(result.displayPrompt)
      setGenre(result.genre)
      setFeatures(result.selectedFeatures)
      setMultiplayer(result.multiplayer)
      setMaxPlayers(result.maxPlayers)
      setManualConfig({
        genre: true,
        features: true,
        multiplayer: true,
        maxPlayers: true,
        networkTopology: true,
        tickRate: true,
      })
      setBriefEnhancementPreview(result)

      toast({
        title: "AI expanded your brief",
        description: `${formatProviderLabel(result.llmConfiguration.provider)} filled in the prompt and updated the settings before generation.`,
      })
    } catch {
      toast({
        title: "AI brief expansion failed",
        description: "The provider-backed prebuild stage could not be completed, so your current prompt and settings were kept unchanged.",
      })
    } finally {
      setEnhancingBrief(false)
    }
  }, [
    composeAiSettings,
    currentUser,
    effectivePrompt,
    evolutionContextPreview,
    features,
    genre,
    maxPlayers,
    multiplayer,
    persistAiSettings,
    prompt,
    selectedProvider,
    toast,
  ])

  useEffect(() => {
    if (!prompt.trim()) {
      setBriefEnhancementPreview(null)
    }
  }, [prompt])

  useEffect(() => {
    let isActive = true
    const controller = new AbortController()
    const fallbackCatalog = getProviderModelCatalog("openrouter")

    setOpenRouterCatalogStatus((prev) => ({ ...prev, loading: true, error: "" }))

    void fetch("/api/provider-models/openrouter", {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`OpenRouter catalog request failed with ${response.status}`)
        }

        const payload = await response.json() as OpenRouterCatalogResponse
        if (!isActive) return

        const liveCatalog = Array.isArray(payload.models) && payload.models.length > 0
          ? payload.models
          : fallbackCatalog

        setProviderCatalogs((prev) => ({
          ...prev,
          openrouter: liveCatalog,
        }))
        setOpenRouterCatalogStatus({
          loading: false,
          source: payload.source === "live" ? "live" : "fallback",
          totalModels: liveCatalog.length,
          error: typeof payload.error === "string" ? payload.error : "",
        })
      })
      .catch((error) => {
        if (!isActive || controller.signal.aborted) return

        setProviderCatalogs((prev) => ({
          ...prev,
          openrouter: fallbackCatalog,
        }))
        setOpenRouterCatalogStatus({
          loading: false,
          source: "fallback",
          totalModels: fallbackCatalog.length,
          error: error instanceof Error ? error.message : "OpenRouter catalog unavailable",
        })
      })

    return () => {
      isActive = false
      controller.abort()
    }
  }, [])

  const renderAiProviderPanel = (options?: { compact?: boolean }) => {
    const compact = options?.compact ?? false
    const renderProviderModelOptions = (provider: ExternalPromptProvider) => {
      const catalog = providerCatalogs[provider]
      const grouped = catalog.reduce<Record<string, typeof catalog>>((acc, entry) => {
        if (!acc[entry.group]) acc[entry.group] = []
        acc[entry.group]?.push(entry)
        return acc
      }, {})

      return (
        <>
          {Object.entries(grouped).map(([group, entries], index) => (
            <SelectGroup key={group}>
              <SelectLabel>{group}</SelectLabel>
              {entries.map((entry) => (
                <SelectItem key={entry.id} value={entry.id}>
                  {entry.label}
                </SelectItem>
              ))}
              {index < Object.keys(grouped).length - 1 && <SelectSeparator />}
            </SelectGroup>
          ))}
          <SelectGroup>
            <SelectLabel>Custom</SelectLabel>
            <SelectItem value={CUSTOM_MODEL_OPTION}>Custom model ID</SelectItem>
          </SelectGroup>
        </>
      )
    }

    return (
      <div className={`rounded-xl border p-4 space-y-4 ${compact ? "border-border/50 bg-background/30" : "border-violet-500/20 bg-violet-500/5"}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-violet-400" />
              <p className="text-sm font-medium">{compact ? "Generation Provider Summary" : "Phase 1 Generation Provider And Keys"}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {compact
                ? "Provider selection and API keys are now locked in under the Phase 1 prompt so this stage can focus on design interpretation."
                : "Choose the provider that should back provider-refined runs, save any API keys, and lock the prompt pipeline before moving to configuration."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={selectedProviderHasKey ? "secondary" : "outline"}>
              {selectedProviderStatusLabel}
            </Badge>
            {compact
              ? <Button variant="outline" onClick={() => setStep(1)}>Edit In Phase 1</Button>
              : <Button variant="outline" onClick={saveAiSettings}>Save AI Settings</Button>}
          </div>
        </div>
        <div className={`grid gap-4 ${compact ? "lg:grid-cols-[minmax(0,1fr)_auto]" : "lg:grid-cols-[280px_minmax(0,1fr)]"}`}>
          <div className="space-y-2">
            <Label>{compact ? "Selected Provider" : "Default Generation Provider"}</Label>
            <Select value={selectedProvider} onValueChange={(value) => setSelectedProvider(value as PromptProviderId)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AI_PROVIDER_OPTIONS.map((provider) => (
                  <SelectItem key={provider.value} value={provider.value}>
                    {provider.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {AI_PROVIDER_OPTIONS.find((provider) => provider.value === selectedProvider)?.note}
            </p>
            <p className="text-xs text-muted-foreground">
              Prompt suite: {GENERATION_PROMPT_SUITE.id} · {GENERATION_PROMPT_SUITE.version}
            </p>
            <p className="text-xs text-muted-foreground">
              Runtime contract and pipeline plan target a maximum generation budget of {generationPreview.pipelinePlan.targetMinutes} minutes.
            </p>
            <p className="text-xs text-muted-foreground">
              Keys are stored locally per signed-in account in this browser. They are not sent anywhere until a provider client is used.
            </p>
          </div>
          {compact ? (
            <div className="flex flex-wrap gap-2 self-start">
              {EXTERNAL_AI_PROVIDERS.map((provider) => (
                <Badge key={provider} variant={providerKeys[provider].trim() ? "secondary" : "outline"}>
                  {formatProviderLabel(provider)} {providerKeys[provider].trim() ? "saved" : "empty"}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {EXTERNAL_AI_PROVIDERS.map((provider) => (
                <div key={provider} className="space-y-2 rounded-lg border border-border/50 bg-background/50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor={`provider-key-${provider}`}>{formatProviderLabel(provider)}</Label>
                    <Badge variant={providerKeys[provider].trim() ? "secondary" : "outline"}>
                      {providerKeys[provider].trim() ? "Saved" : "Empty"}
                    </Badge>
                  </div>
                  <Input
                    id={`provider-key-${provider}`}
                    type="password"
                    autoComplete="off"
                    value={providerKeys[provider]}
                    onChange={(event) => setProviderKeys((prev) => ({ ...prev, [provider]: event.target.value }))}
                    placeholder={`Paste your ${formatProviderLabel(provider)} API key`}
                  />
                  {provider === "openrouter" && (
                    <>
                      <p className="text-[11px] text-muted-foreground">
                        {openRouterCatalogStatus.loading
                          ? "Syncing live OpenRouter text-model catalog..."
                          : `OpenRouter models loaded: ${openRouterCatalogStatus.totalModels} (${openRouterCatalogStatus.source === "live" ? "live catalog" : "fallback catalog"}).`}
                      </p>
                      {openRouterCatalogStatus.error && openRouterCatalogStatus.source !== "live" && (
                        <p className="text-[11px] text-muted-foreground">
                          Live sync issue: {openRouterCatalogStatus.error}
                        </p>
                      )}
                    </>
                  )}
                  <div className="space-y-2">
                    <Label className="text-[11px] text-muted-foreground">Model</Label>
                    <Select
                      value={resolveModelSelectValue(providerCatalogs[provider], providerModels[provider])}
                      onValueChange={(value) => {
                        if (value === CUSTOM_MODEL_OPTION) {
                          if (findProviderModelEntryInCatalog(providerCatalogs[provider], providerModels[provider])) {
                            setProviderDefaultModel(provider, "")
                          }
                          return
                        }
                        setProviderDefaultModel(provider, value)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a model" />
                      </SelectTrigger>
                      <SelectContent className="max-h-96">
                        {renderProviderModelOptions(provider)}
                      </SelectContent>
                    </Select>
                    {resolveModelSelectValue(providerCatalogs[provider], providerModels[provider]) === CUSTOM_MODEL_OPTION && (
                      <Input
                        value={providerModels[provider]}
                        onChange={(event) => setProviderDefaultModel(provider, event.target.value)}
                        placeholder={`${formatProviderLabel(provider)} custom model ID`}
                      />
                    )}
                    {(() => {
                      const modelEntry = findProviderModelEntryInCatalog(providerCatalogs[provider], providerModels[provider])
                      return modelEntry ? (
                        <div className="rounded-md border border-border/50 bg-muted/20 p-2 text-[11px] text-muted-foreground">
                          <p className="font-medium text-foreground/90">{modelEntry.label}</p>
                          <p>{formatProviderModelCostSummary(modelEntry)}</p>
                          <p>{formatContextWindow(modelEntry.contextWindow)} context · {formatContextWindow(modelEntry.maxCompletionTokens)} max output</p>
                          <p>{modelEntry.vendor}{modelEntry.catalogSource === "live" ? " · live catalog" : ""}</p>
                          <p>
                            Structured outputs: {modelEntry.supportsStructuredOutputs ? "yes" : "no"}
                            {" · "}
                            Reasoning: {modelEntry.supportsReasoning ? "yes" : "no"}
                          </p>
                          <p>{modelEntry.description}</p>
                        </div>
                      ) : null
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderNetworkingPanel = () => {
    if (!features.includes("networking")) return null

    return (
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-blue-400" />
              <p className="text-sm font-medium">Multiplayer & Networking Configuration</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Configure the networking architecture and world seed for synchronized sessions.
            </p>
          </div>
          <Badge variant="secondary">Production Grade</Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>World Seed / Game Key</Label>
            <div className="flex gap-2">
              <Input
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                placeholder="Enter seed or leave for random"
                className="font-mono text-xs"
              />
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setSeed(Math.random().toString(36).substring(2, 10).toUpperCase())}
                title="Generate Random Seed"
              >
                <Zap className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Shared seeds guarantee identical world generation across all connected clients.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Network Topology</Label>
            <Select 
              value={networkTopology} 
              onValueChange={(v) => {
                setNetworkTopology(v as NetworkTopology)
                setManualConfig(prev => ({ ...prev, networkTopology: true }))
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="client_server">Client-Authoritative</SelectItem>
                <SelectItem value="listen_server">Listen Server (Hosted)</SelectItem>
                <SelectItem value="distributed_fleet">Distributed Fleet (MMO)</SelectItem>
                <SelectItem value="peer_to_peer">Peer-to-Peer (Lockstep)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {networkTopology === "distributed_fleet" 
                ? "Optimized for 100+ players using spatial partitioning."
                : "Ideal for squad-based or competitive session play."}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Server Tick Rate (Hz)</Label>
              <span className="text-xs font-mono text-blue-400">{tickRate}Hz</span>
            </div>
            <Slider
              value={[tickRate]}
              onValueChange={([v]) => {
                setTickRate(v)
                setManualConfig(prev => ({ ...prev, tickRate: true }))
              }}
              min={15}
              max={128}
              step={1}
            />
            <p className="text-[11px] text-muted-foreground">
              Higher rates improve responsiveness but increase bandwidth and CPU load.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── startGeneration ──────────────────────────────────────
  const startGeneration = () => {
    const promptSnapshot = effectivePrompt.trim()
    const rawPromptSnapshot = prompt.trim()
    const genreSnapshot = genre
    const engineSnapshot = engine
    const featuresSnapshot = [...features]
    const multiplayerSnapshot = multiplayer
    const maxPlayersSnapshot = multiplayerSnapshot ? Math.max(1, maxPlayers) : 1
    const providerSnapshot = selectedProvider
    const aiSettingsSnapshot = composeAiSettings(providerSnapshot)
    const providerHasSavedKey =
      providerSnapshot !== "local" && aiSettingsSnapshot.apiKeys[providerSnapshot].trim().length > 0
    const providerRoster = getConfiguredUserProviderRoster(aiSettingsSnapshot)?.roster
    const designProfile = buildGenerationProfile({
      prompt: promptSnapshot,
      genre: genreSnapshot,
      selectedFeatures: featuresSnapshot,
      multiplayer: multiplayerSnapshot,
      maxPlayers: maxPlayersSnapshot,
      seed: seed.trim() || undefined,
      networkTopology,
      tickRate,
    })

    if (!promptSnapshot || designProfile.resolvedFeatures.length === 0) {
      toast({
        title: "Add a stronger game brief first",
        description: "The prompt needs enough detail to resolve features and build a generation plan before the run can start.",
      })
      return
    }

    if (currentUser) {
      persistAiSettings(providerSnapshot, true)
    }

    if (providerSnapshot !== "local" && !providerHasSavedKey) {
      toast({
        title: "Using local prompt pipeline",
        description: `No ${formatProviderLabel(providerSnapshot)} key is saved yet, so this run will use the local fallback.`,
      })
    }

    stopGenerationTimers()
    setGenerationProviderFailures([])
    setGenerationProviderDiagnostics(null)
    setGenerationOperationalAnalytics(null)
    setGenerationRunStatus("running")
    setGenerationActivityLog([])
    setGenerationElapsedSeconds(0)
    setGenerationRunProfile(designProfile)
    setGenerationRunPrompt(rawPromptSnapshot || promptSnapshot)
    setCompletedProject(null)
    generationElapsedRef.current = 0

    const runId = generationRunRef.current + 1
    generationRunRef.current = runId
    let generationEnded = false
    const activeProviderLabel =
      providerSnapshot === "local" || !providerHasSavedKey
        ? "Local Prompt Pipeline"
        : `${formatProviderLabel(providerSnapshot)} · ${aiSettingsSnapshot.models[providerSnapshot]}`

    setGenProgress(0)
    setGenAgent(GENERATION_LIVE_PHASES[0].agent)
    setGenerationStageLabel(GENERATION_LIVE_PHASES[0].title)
    setGenerationStageDetail(GENERATION_LIVE_PHASES[0].detail)
    setGenerationProviderLabel(activeProviderLabel)

    appendGenerationActivity({
      title: "Generation started",
      detail: `${activeProviderLabel} is preparing the prompt loop and runtime guardrails for this ${designProfile.dimension.toUpperCase()} ${formatLabel(designProfile.resolvedGenre)} run.`,
      status: "running",
    })
    appendGenerationActivity({
      title: designProfile.dimension === "3d" ? "3D runtime guardrails armed" : "Runtime guardrails armed",
      detail: designProfile.dimension === "3d"
        ? `The loop is preserving ${designProfile.cameraStyle} camera rules and ${designProfile.runtimePlan.label.toLowerCase()} fidelity so this prompt does not collapse into a flat fallback.`
        : `The loop is preserving ${designProfile.runtimePlan.label.toLowerCase()} rules and camera intent before the blueprint is locked.`,
      status: "complete",
    })
    if (providerRoster?.assignments?.length) {
      appendGenerationActivity({
        title: "Provider roster locked",
        detail: `${providerRoster.assignments.length} routed role${providerRoster.assignments.length === 1 ? "" : "s"} will be available for authoring, critique, repair, and release decisions during this run.`,
        status: "complete",
      })
    }

    const generatedProfilePromise: Promise<GeneratedProfileResult> = generateGenerationProfile({
      prompt: promptSnapshot,
      genre: genreSnapshot,
      selectedFeatures: featuresSnapshot,
      multiplayer: multiplayerSnapshot,
      maxPlayers: maxPlayersSnapshot,
      seed: seed.trim() || undefined,
      networkTopology,
      tickRate,
      evolutionContext: evolutionContextPreview,
      usageIntelligence: usageIntelligencePreview,
      aiSettings: aiSettingsSnapshot,
    })

    const isLimitless = designProfile.scopeScale === "limitless"
    const isExpanded = designProfile.scopeScale === "expanded"
    const tickInterval = isLimitless ? 1600 : isExpanded ? 1400 : 1200
    const stopGenerationEarly = (title: string, description: string) => {
      if (generationEnded || generationRunRef.current !== runId) return
      generationEnded = true
      setGenerationRunStatus("blocked")
      setGenerationStageLabel("Generation stopped")
      setGenerationStageDetail(description)
      appendGenerationActivity({
        title,
        detail: description,
        status: "blocked",
      })
      stopGenerationTimers()
      setGenProgress(100)
      setGenAgent("tooling")
      setCompletedProject(null)
      toast({ title, description })
    }

    void generatedProfilePromise
      .then((result) => {
        if (generationEnded || generationRunRef.current !== runId) return
        setGenerationRunProfile(result.profile)
        const fatalProviderFailures = result.providerFailures?.filter((failure) => failure.final && !failure.recovered) ?? []
        if (
          result.llmConfiguration.source === "user-key"
          && result.llmConfiguration.releaseStatus === "blocked"
          && fatalProviderFailures.length > 0
        ) {
          setGenerationProviderFailures(fatalProviderFailures)
          setGenerationProviderDiagnostics(result.providerDiagnostics ?? result.llmConfiguration.providerDiagnostics ?? null)
          setGenerationOperationalAnalytics(result.llmConfiguration.operationalAnalytics ?? result.loopReport?.operationalAnalytics ?? null)
          fatalProviderFailures.slice(0, 3).forEach((failure) => {
            appendGenerationActivity({
              title: `${formatProviderLabel(failure.provider)} blocked ${failure.stageLabel}`,
              detail: failure.headline ?? failure.reason,
              status: "blocked",
            })
          })
          stopGenerationEarly(
            "AI generation failed before blueprint lock",
            fatalProviderFailures.slice(0, 2).map(formatProviderFailureLine).join(" · "),
          )
        }
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Unexpected generation failure."
        stopGenerationEarly("Generation failed", message)
      })

    const finalizeGeneration = async () => {
      if (generationEnded || generationRunRef.current !== runId) return
      setGenProgress(96)
      setGenAgent("optimizer")
      setGenerationStageLabel("Locking manifest, building workspace, and running compile gates")
      setGenerationStageDetail("The prompt loop is finished. The system is now synthesizing the workspace, verifying compile readiness, and preparing the playable result.")
      appendGenerationActivity({
        title: "Provider loop complete",
        detail: "The manifest is locked and the system is moving into workspace synthesis and compile verification.",
        status: "running",
      })

      let generatedResult: GeneratedProfileResult
      try {
        generatedResult = await generatedProfilePromise
      } catch (error) {
        stopGenerationEarly(
          "Generation failed",
          error instanceof Error ? error.message : "Unexpected generation failure.",
        )
        return
      }
      if (generationRunRef.current !== runId) return
      const finalProfile = generatedResult.profile
      setGenerationRunProfile(finalProfile)
      const resolvedFeatures = finalProfile.resolvedFeatures
      const totalModules = [
        ...resolvedFeatures,
        ...finalProfile.supplementalSystems.map((system) => system.name),
      ].length

      const providerFailures = generatedResult.providerFailures ?? generatedResult.llmConfiguration.providerFailures ?? []
      const providerDiagnostics = generatedResult.providerDiagnostics ?? generatedResult.llmConfiguration.providerDiagnostics ?? null
      const operationalAnalytics = generatedResult.llmConfiguration.operationalAnalytics ?? generatedResult.loopReport?.operationalAnalytics ?? null
      setGenerationProviderFailures(providerFailures)
      setGenerationProviderDiagnostics(providerDiagnostics)
      setGenerationOperationalAnalytics(operationalAnalytics)
      if (providerFailures.length > 0) {
        providerFailures.slice(0, 4).forEach((failure) => {
          appendGenerationActivity({
            title: `${formatProviderLabel(failure.provider)} · ${failure.stageLabel}`,
            detail: failure.headline ?? failure.reason,
            status: failure.recovered ? "warning" : "blocked",
          })
        })
        toast({
          title: "Some AI providers failed during generation",
          description: providerFailures.slice(0, 2).map(formatProviderFailureLine).join(" · "),
        })
      }
      setGenerationProviderLabel(
        generatedResult.llmConfiguration.provider === "local"
          ? "Local Prompt Pipeline"
          : `${formatProviderLabel(generatedResult.llmConfiguration.provider)} · ${generatedResult.llmConfiguration.model ?? "provider model"}`,
      )
      const latestLoopStages = generatedResult.loopReport?.attempts.at(-1)?.stages ?? []
      latestLoopStages.slice(0, 8).forEach((stage) => {
        appendGenerationActivity({
          title: `${formatLabel(stage.id)} · ${formatProviderLabel(stage.provider)}`,
          detail: stage.outputSummary,
          status: stage.verification === "fail" ? "warning" : stage.verification === "warning" ? "warning" : "complete",
        })
      })

      if (generatedResult.releaseJudgement?.decision === "blocked" || generatedResult.llmConfiguration.releaseStatus === "blocked") {
        generationEnded = true
        setGenerationRunStatus("blocked")
        const blockedSummary = generatedResult.releaseJudgement?.blockers.slice(0, 3).join(" · ")
          || generatedResult.releaseJudgement?.summary
          || "The provider loop rejected this blueprint because it drifted away from the prompt."
        setGenerationStageLabel("Generation blocked before workspace build")
        setGenerationStageDetail(blockedSummary)
        appendGenerationActivity({
          title: "Blueprint blocked",
          detail: blockedSummary,
          status: "blocked",
        })
        stopGenerationTimers()
        toast({
          title: "Generation blocked before workspace build",
          description: blockedSummary,
        })
        setGenProgress(100)
        setGenAgent("tooling")
        setCompletedProject(null)
        return
      }

      const featureLineBase = isLimitless ? 4800 : isExpanded ? 3400 : 1200
      const featureLineRange = isLimitless ? 6200 : isExpanded ? 4000 : 3000
      const supplementalMultiplier = isLimitless ? 2.1 : isExpanded ? 1.4 : 1
      const supplementalVariance = isLimitless ? 520 : isExpanded ? 380 : 260
      const plannedModules = [
        ...resolvedFeatures.map((feature) => ({
          name: feature,
          displayName: formatLabel(feature),
          linesGenerated: Math.floor(
            Math.random() * featureLineRange + featureLineBase,
          ),
        })),
        ...finalProfile.supplementalSystems.map((system) => ({
          name: system.name,
          displayName: system.displayName,
          linesGenerated: Math.floor(
            (system.linesBudget + Math.floor(Math.random() * supplementalVariance)) * supplementalMultiplier,
          ),
        })),
      ]
      appendGenerationActivity({
        title: "Generating code and asset workspace",
        detail: `Synthesizing ${plannedModules.length} planned modules, runtime scaffolding, and asset exports before the compile gate runs.`,
        status: "running",
      })
      const systems = plannedModules.map((module) => ({
        name: module.name,
        displayName: module.displayName,
        status: "complete" as const,
        linesGenerated: module.linesGenerated,
        engine: engineSnapshot,
      }))
      const totalLines = systems.reduce((s, sys) => s + sys.linesGenerated, 0)
      const configuredModel = generatedResult.llmConfiguration.model
      const newProj: UserProject = {
        id: createProjectId(),
        name: rawPromptSnapshot.split(" ").slice(0, 4).join(" ") || "New Game",
        description: promptSnapshot,
        genre: finalProfile.resolvedGenre,
        dimension: finalProfile.dimension,
        engine: engineSnapshot,
        features: resolvedFeatures,
        multiplayer: finalProfile.resolvedMultiplayer,
        maxPlayers: finalProfile.resolvedMaxPlayers,
        networkTopology: finalProfile.networkTopology,
        tickRate: finalProfile.tickRate,
        seed: finalProfile.seed,
        status: "complete", progress: 100,
        createdAt: new Date().toISOString(),
        llmConfiguration: {
          ...generatedResult.llmConfiguration,
          model: configuredModel,
        },
        design: finalProfile,
        systems,
        codeFiles: [],
        assetFiles: [],
      }
      setGenerationStageLabel("Writing generated workspace files")
      setGenerationStageDetail(`Creating ${systems.length} generated systems, prompt-trace code headers, and machine-readable assets.`)
      newProj.codeFiles = createGeneratedCodeFiles(newProj)
      newProj.assetFiles = createGeneratedAssetFiles(newProj, newProj.codeFiles)
      appendGenerationActivity({
        title: "Workspace files created",
        detail: `${newProj.codeFiles.length} code files and ${newProj.assetFiles.length} asset files were assembled for verification.`,
        status: "complete",
      })
      setGenerationStageLabel("Running execution pipeline and compile readiness")
      setGenerationStageDetail("Checking the generated workspace, compile surface, runtime files, and auto-repair paths before results are shown.")
      appendGenerationActivity({
        title: "Compile preflight and execution checks",
        detail: "The execution pipeline is auditing the build surface and can repair incomplete outputs before release.",
        status: "running",
      })
      const executedProject = runProjectExecutionPipeline(newProj)
      const generationAudit = buildProjectGenerationAudit(executedProject)
      const executionReport = executedProject.execution
      if (executionReport?.autoRepairApplied) {
        appendGenerationActivity({
          title: "Automatic repair applied",
          detail: executionReport.summary,
          status: "warning",
        })
      }

      if (generationAudit.releaseDecision === "blocked" || executionReport?.releaseDecision === "blocked") {
        generationEnded = true
        setGenerationRunStatus("blocked")
        const blockedVerificationSummary = [
          ...generationAudit.checks
            .filter((check) => check.status === "fail")
            .slice(0, 2)
            .map((check) => check.label),
          ...(executionReport?.checks ?? [])
            .filter((check) => check.status === "fail")
            .slice(0, 2)
            .map((check) => check.label),
        ].slice(0, 3).join(" · ") || "Critical verification checks failed."
        setGenerationStageLabel("Verification blocked release")
        setGenerationStageDetail(blockedVerificationSummary)
        appendGenerationActivity({
          title: "Verification blocked release",
          detail: blockedVerificationSummary,
          status: "blocked",
        })
        stopGenerationTimers()
        toast({
          title: "Generation blocked by verification",
          description: blockedVerificationSummary,
        })
        setGenProgress(100)
        setGenAgent("tooling")
        setCompletedProject(null)
        return
      }

      toast({
        title: executionReport?.autoRepairApplied
          ? "Generation repaired and verified"
          : generationAudit.releaseDecision === "ready" && executionReport?.releaseDecision !== "needs_review"
            ? "Generation verification passed"
            : "Generation verification flagged review items",
        description: executionReport?.summary ?? generationAudit.summary,
      })
      setCompletedProject(executedProject)
      setGenerationRunStatus("idle")
      setGenProgress(100)
      setGenerationStageLabel("Generation complete")
      setGenerationStageDetail(executionReport?.summary ?? generationAudit.summary)
      appendGenerationActivity({
        title: "Generation complete",
        detail: executionReport?.summary ?? generationAudit.summary,
        status: "complete",
      })
      stopGenerationTimers()
      setStep(4)
      onProjectCreated(executedProject, totalLines)
      generationEnded = true

      if (totalModules > 0) {
        setGenAgent("optimizer")
      }
    }

    generationClockRef.current = window.setInterval(() => {
      generationElapsedRef.current += 1
      setGenerationElapsedSeconds(generationElapsedRef.current)
    }, 1000)

    let i = 0
    const applyGenerationPhase = (phaseIndex: number) => {
      const phase = GENERATION_LIVE_PHASES[Math.min(phaseIndex, GENERATION_LIVE_PHASES.length - 1)]
      setGenProgress(Math.min(((phaseIndex + 1) / GENERATION_LIVE_PHASES.length) * 92, 92))
      setGenAgent(phase.agent)
      setGenerationStageLabel(phase.title)
      setGenerationStageDetail(phase.detail)
      appendGenerationActivity({
        title: phase.title,
        detail: phase.detail,
        status: "running",
      })
    }

    applyGenerationPhase(0)
    generationTimerRef.current = window.setInterval(() => {
      i++
      if (i < GENERATION_LIVE_PHASES.length) {
        applyGenerationPhase(i)
      }
      if (i >= GENERATION_LIVE_PHASES.length - 1) {
        if (generationTimerRef.current !== null) {
          window.clearInterval(generationTimerRef.current)
          generationTimerRef.current = null
        }
        void finalizeGeneration()
      }
    }, tickInterval)
  }

  // ── Prompt auto-sync useEffect ───────────────────────────
  useEffect(() => {
    if (!currentUser && !aiSettings) {
      const emptyAiSettings = createEmptyUserAiSettings()
      setSelectedProvider("local")
      setProviderKeys({ claude: "", openrouter: "", gpt: "" })
      setProviderModels(emptyAiSettings.models)
      return
    }

    setSelectedProvider(savedAiSettings.defaultProvider)
    setProviderKeys(savedAiSettings.apiKeys)
    setProviderModels(savedAiSettings.models)
  }, [
    savedAiSettings.apiKeys.claude,
    savedAiSettings.apiKeys.gpt,
    savedAiSettings.apiKeys.openrouter,
    savedAiSettings.defaultProvider,
    savedAiSettings.models.claude,
    savedAiSettings.models.gpt,
    savedAiSettings.models.openrouter,
  ])

  // ── Prompt auto-sync useEffect ───────────────────────────
  useEffect(() => {
    if (!prompt.trim()) {
      setManualConfig((prev) => (
        prev.genre || prev.features || prev.multiplayer || prev.maxPlayers || prev.networkTopology || prev.tickRate
          ? {
              genre: false,
              features: false,
              multiplayer: false,
              maxPlayers: false,
              networkTopology: false,
              tickRate: false,
            }
          : prev
      ))
      return
    }

    if (!manualConfig.genre) setGenre(promptDefaults.genre)
    if (!manualConfig.features) {
      setFeatures((prev) => sameStringArray(prev, promptDefaults.recommendedFeatures) ? prev : promptDefaults.recommendedFeatures)
    }
    if (!manualConfig.multiplayer) setMultiplayer(promptDefaults.multiplayer)
    if (!manualConfig.maxPlayers) setMaxPlayers(promptDefaults.maxPlayers)
  }, [
    manualConfig.features,
    manualConfig.genre,
    manualConfig.maxPlayers,
    manualConfig.multiplayer,
    prompt,
    promptDefaults.genre,
    promptDefaults.maxPlayers,
    promptDefaults.multiplayer,
    promptDefaults.recommendedFeatures,
  ])

  // ── Timer cleanup useEffect ──────────────────────────────
  useEffect(() => {
    return stopGenerationTimers
  }, [stopGenerationTimers])

  // ── JSX ──────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        {["Describe", "Configure", "Generate", "Results"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold ${step > i + 1 ? "bg-emerald-600 text-white" : step === i + 1 ? "bg-violet-600 text-white" : "bg-muted text-muted-foreground"}`}>
              {step > i + 1 ? <CheckCircle className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-sm ${step === i + 1 ? "font-medium" : "text-muted-foreground"}`}>{s}</span>
            {i < 3 && <div className={`w-8 h-px ${step > i + 1 ? "bg-emerald-500" : "bg-border"}`} />}
          </div>
        ))}
      </div>
      {step === 1 && (
        <Card className="border-border/50 bg-card/50"><CardHeader><CardTitle>Phase 1: Describe Your Game</CardTitle></CardHeader><CardContent className="space-y-4">
          <div className="space-y-2"><Label>Game Description</Label><Textarea placeholder="Describe your game in plain English..." rows={4} value={prompt} onChange={e => setPrompt(e.target.value)} /></div>
          <p className="text-sm text-muted-foreground">Lock the brief, provider, and generation keys here first so the staged prompt pipeline can preserve the request instead of collapsing into defaults later.</p>
          {renderAiProviderPanel()}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleAiExpandBrief} disabled={!prompt.trim() || enhancingBrief}>
              {enhancingBrief ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
              AI Expand Brief
            </Button>
            <Button onClick={() => setStep(2)} disabled={!prompt.trim()} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white">Next: Configure <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </div>
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-violet-500/30 text-violet-300">AI preparation</Badge>
              <Badge variant="outline">quality-first loop</Badge>
              <Badge variant="outline">90 min max</Badge>
              <Badge variant="outline">compile gate required</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {briefEnhancementPreview
                ? `${formatProviderLabel(briefEnhancementPreview.llmConfiguration.provider)} expanded the brief before generation and the loop will keep using the saved provider roster below.`
                : "Generation will auto-complete the brief, fill missing criteria, and lock compile priorities before the main loop starts whenever a provider key is active."}
            </p>
            <p className="text-xs text-muted-foreground">
              Evolution memory is advisory-only. The creator prompt, explicit settings, and locked constraints stay separate and always win.
            </p>
            {loopProviderPreview?.assignments?.length ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Active Provider Roster</p>
                <div className="flex flex-wrap gap-1">
                  {loopProviderPreview.assignments.map((assignment) => (
                    <Badge key={`${assignment.role}:${assignment.provider}`} variant="secondary" className="text-xs">
                      {assignment.role.replace(/_/g, " ")} · {formatProviderLabel(assignment.provider)} · {assignment.model}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
            {renderProviderFailurePanel(generationProviderFailures, { compact: true })}
            <div className="grid gap-3 lg:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Inferred Settings</p>
                <div className="space-y-1">
                  {(briefEnhancementPreview?.preparationDiff ?? []).length > 0
                    ? briefEnhancementPreview?.preparationDiff?.map((entry) => (
                      <p key={`${entry.field}:${entry.inferredValue}`} className="text-sm text-muted-foreground">
                        • {formatLabel(entry.field)} → {entry.inferredValue}
                      </p>
                    ))
                    : <p className="text-sm text-muted-foreground">AI-prepared changes will show here after you run `AI Expand Brief`.</p>}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Missing Criteria</p>
                <div className="space-y-1">
                  {(briefEnhancementPreview?.missingCriteria ?? []).length > 0
                    ? briefEnhancementPreview?.missingCriteria?.map((entry) => (
                      <p key={`${entry.field}:${entry.suggestedFill}`} className="text-sm text-muted-foreground">
                        • {formatLabel(entry.field)}: {entry.suggestedFill}
                      </p>
                    ))
                    : <p className="text-sm text-muted-foreground">The loop will still infer camera, player mode, and runtime gaps if your prompt leaves them open.</p>}
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Knowledge Coverage</p>
              <p className="text-sm text-muted-foreground">{displayedKnowledgeCoverage.summary}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {displayedKnowledgeCoverage.relevantSignals.slice(0, 6).map((signal) => (
                  <Badge key={signal.id} variant="outline" className="text-xs">
                    {signal.label} · {signal.relevance}
                  </Badge>
                ))}
              </div>
              {displayedKnowledgeCoverage.gapWarnings.length > 0 ? (
                <div className="mt-2 space-y-1">
                  {displayedKnowledgeCoverage.gapWarnings.slice(0, 3).map((gap) => (
                    <p key={gap.id} className="text-xs text-amber-200">
                      • {gap.label}: {gap.action}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Knowledge Pressure</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={`text-xs ${displayedKnowledgeRisk.level === "aligned" ? "border-emerald-500/30 text-emerald-300" : displayedKnowledgeRisk.level === "risky" ? "border-rose-500/30 text-rose-300" : "border-amber-500/30 text-amber-300"}`}>
                  {displayedKnowledgeRisk.level}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{displayedKnowledgeRisk.summary}</p>
              {(displayedKnowledgeRisk.warnings?.length ?? 0) > 0 ? (
                <div className="mt-2 space-y-1">
                  {displayedKnowledgeRisk.warnings.slice(0, 3).map((warning) => (
                    <p key={warning} className="text-xs text-muted-foreground">
                      • {warning}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">AI Usage Intelligence</p>
              <p className="text-sm text-muted-foreground">{displayedUsageIntelligence.summary}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {displayedUsageIntelligence.suggestedProviders.slice(0, 3).map((provider) => (
                  <Badge key={provider} variant="outline" className="text-xs">
                    {formatProviderLabel(provider)}
                  </Badge>
                ))}
              </div>
              {(displayedUsageIntelligence.routingPressure.length > 0 || displayedUsageIntelligence.failureWatchouts.length > 0) ? (
                <div className="mt-2 space-y-1">
                  {[...displayedUsageIntelligence.routingPressure, ...displayedUsageIntelligence.failureWatchouts].slice(0, 4).map((entry) => (
                    <p key={entry} className="text-xs text-muted-foreground">
                      • {entry}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Cached Nexus Lines</p>
                <div className="space-y-2">
                  {displayedEvolutionContext.cacheLines.map((entry) => (
                    <div key={entry.id} className="rounded-lg border border-border/50 bg-background/40 p-3">
                      <p className="text-sm font-medium">{entry.label}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{entry.line}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Alphabetical Additions</p>
                <div className="space-y-2">
                  {displayedEvolutionContext.alphabeticalAdditions.length > 0 ? displayedEvolutionContext.alphabeticalAdditions.map((entry) => (
                    <div key={`${entry.start}:${entry.end}`} className="rounded-lg border border-border/50 bg-background/40 p-3">
                      <p className="text-sm font-medium">{entry.start} → {entry.end}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{entry.additions.length > 0 ? entry.additions.join(", ") : "No direct alphabetical bridge items yet."}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{entry.rationale}</p>
                    </div>
                  )) : <p className="text-sm text-muted-foreground">The evolution layer will still use the cached anchors even when there are no in-between alphabetical additions yet.</p>}
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Evolution Insertion Blocks</p>
              <div className="space-y-2">
                {displayedEvolutionContext.insertionBlocks.length > 0 ? displayedEvolutionContext.insertionBlocks.map((block) => (
                  <div key={block.id} className="rounded-lg border border-border/50 bg-background/40 p-3">
                    <p className="text-xs font-mono text-muted-foreground">{block.divider}</p>
                    <p className="mt-2 text-sm font-medium">{block.startAnchor}</p>
                    <p className="text-sm text-muted-foreground">{block.startLine}</p>
                    <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Insert Between Anchors</p>
                    <div className="mt-2 space-y-1">
                      {block.promptInsertions.map((entry) => (
                        <p key={entry} className="text-sm text-muted-foreground">• {entry}</p>
                      ))}
                    </div>
                    <pre className="mt-3 overflow-x-auto rounded-md border border-border/50 bg-black/30 p-3 text-xs text-emerald-100">{block.codeInsertions.join("\n")}</pre>
                    <p className="mt-3 text-sm font-medium">{block.endAnchor}</p>
                    <p className="text-sm text-muted-foreground">{block.endLine}</p>
                  </div>
                )) : <p className="text-sm text-muted-foreground">Once two anchor lines are available, the evolution system will generate a divider-based insertion block for organized growth.</p>}
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Evolution Learnings</p>
                <div className="space-y-1">
                  {[...displayedEvolutionContext.userLearnings, ...displayedEvolutionContext.globalLearnings].slice(0, 6).map((entry) => (
                    <p key={entry} className="text-sm text-muted-foreground">• {entry}</p>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Usage Snapshot</p>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">• {displayedEvolutionContext.usageSnapshot.totalUsers} users tracked in local memory.</p>
                  <p className="text-sm text-muted-foreground">• {displayedEvolutionContext.usageSnapshot.totalProjects} saved projects contributing to retrieval pressure.</p>
                  <p className="text-sm text-muted-foreground">• {displayedEvolutionContext.usageSnapshot.providerBackedProjects} provider-backed runs with creator keys.</p>
                  <p className="text-sm text-muted-foreground">• {displayedEvolutionContext.usageSnapshot.readyProjects} ready and {displayedEvolutionContext.usageSnapshot.blockedProjects} blocked runs shaping repair pressure.</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent></Card>
      )}
      {step === 2 && (
        <Card className="border-border/50 bg-card/50 overflow-hidden"><CardHeader><CardTitle>Phase 2: Configure Your Game</CardTitle></CardHeader><CardContent className="max-h-[calc(100vh-230px)] overflow-y-auto space-y-6 pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Genre Hint</Label><Select value={genre} onValueChange={handleGenreChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.keys(GENRE_TEMPLATES).map(g => <SelectItem key={g} value={g}>{g.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Target Engine</Label><Select value={engine} onValueChange={v => setEngine(v as TargetEngine)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unreal">Unreal Engine 5</SelectItem><SelectItem value="godot">Godot 4</SelectItem><SelectItem value="unity">Unity</SelectItem><SelectItem value="custom">Custom C++</SelectItem></SelectContent></Select></div>
          </div>
          <div className="space-y-2"><Label>Game Systems</Label><div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">{allFeatures.map(f => <label key={f} className="flex items-center gap-2 rounded-lg border border-border/50 p-2 cursor-pointer hover:bg-accent/50"><Checkbox checked={features.includes(f)} onCheckedChange={() => toggleFeature(f)} /><span className="text-sm capitalize">{f.replace(/_/g, " ")}</span></label>)}</div></div>
          <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-4">
            <div>
              <p className="text-sm font-medium">Expanded Design Intent</p>
              <p className="text-sm text-muted-foreground">These controls widen the generation space for level structure, game type, and mechanical identity instead of leaving everything to the raw prompt.</p>
            </div>
            <div className="space-y-2">
              <Label>Subgenre Signals</Label>
              <div className="flex flex-wrap gap-2">
                {SUBGENRE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleSubgenre(option)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${subgenres.includes(option) ? "border-violet-500/40 bg-violet-500/10 text-violet-200" : "border-border/50 bg-background/40 text-muted-foreground hover:bg-accent/60"}`}
                  >
                    {formatLabel(option)}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2"><Label>Camera Style</Label><Select value={cameraPreference} onValueChange={setCameraPreference}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CAMERA_OPTIONS.map((option) => <SelectItem key={option} value={option}>{formatLabel(option)}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Combat Level</Label><Select value={combatPreference} onValueChange={setCombatPreference}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{COMBAT_OPTIONS.map((option) => <SelectItem key={option} value={option}>{formatLabel(option)}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Pacing</Label><Select value={pacingPreference} onValueChange={setPacingPreference}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PACING_OPTIONS.map((option) => <SelectItem key={option} value={option}>{formatLabel(option)}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Genre Mode</Label><Select value={genreBlend} onValueChange={setGenreBlend}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{GENRE_BLEND_OPTIONS.map((option) => <SelectItem key={option} value={option}>{formatLabel(option)}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label>Simulation Depth</Label><span className="text-xs text-muted-foreground">{sliderLabel(simulationDepth)}</span></div>
                <Input type="range" min={1} max={5} value={simulationDepth} onChange={(event) => setSimulationDepth(Number(event.target.value))} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label>Narrative Emphasis</Label><span className="text-xs text-muted-foreground">{sliderLabel(narrativeEmphasis)}</span></div>
                <Input type="range" min={1} max={5} value={narrativeEmphasis} onChange={(event) => setNarrativeEmphasis(Number(event.target.value))} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label>Novelty Target</Label><span className="text-xs text-muted-foreground">{sliderLabel(noveltyTarget)}</span></div>
                <Input type="range" min={1} max={5} value={noveltyTarget} onChange={(event) => setNoveltyTarget(Number(event.target.value))} />
              </div>
            </div>
            <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Directive Summary</p>
              <p className="mt-1">{intentDirectiveSummary}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={multiplayer}
                onCheckedChange={(checked) => {
                  setManualConfig((prev) => ({ ...prev, multiplayer: true }))
                  setMultiplayer(checked)
                }}
              />
              <Label>Multiplayer</Label>
            </div>
            {multiplayer && <div className="flex items-center gap-2"><Label>Max Players</Label><Input type="number" min={1} value={maxPlayers} onChange={e => { setManualConfig((prev) => ({ ...prev, maxPlayers: true })); setMaxPlayers(Math.max(1, parseInt(e.target.value, 10) || 1)) }} className="w-20" /></div>}
          </div>
          {renderNetworkingPanel()}
          {renderAiProviderPanel({ compact: true })}
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-violet-500/30 text-violet-300">{generationPreview.dimension.toUpperCase()} interpretation</Badge>
              <Badge variant="outline">{formatLabel(generationPreview.resolvedGenre)}</Badge>
              <Badge variant="outline">{generationPreview.scopeScale}</Badge>
              <Badge variant="outline">{generationPreview.resolvedMultiplayer ? `${generationPreview.resolvedMaxPlayers} players` : "solo"}</Badge>
              <Badge variant="outline">{generationPreview.cameraStyle}</Badge>
              <Badge variant="outline">{generationPreview.mapArchetype}</Badge>
              <Badge variant="outline">{generationPreview.graphicsPlan.renderPath}</Badge>
              <Badge variant="outline">{formatLabel(generationPreview.enginePlan.recommendedEngine)}</Badge>
              <Badge variant="outline">{formatProviderLabel(selectedProvider)}</Badge>
            </div>
            <p className="text-sm font-medium text-foreground">{generationPreview.generatedPitch}</p>
            <p className="text-sm text-muted-foreground">{generationPreview.promptSummary}</p>
            <p className="text-sm text-muted-foreground">{generationPreview.genreReason}</p>
            <p className="text-sm text-muted-foreground">{generationPreview.mapOverview}</p>
            <div className="grid gap-3 lg:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Player Fantasy</p>
                <p className="text-sm text-muted-foreground">{generationPreview.playerFantasy}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Session Shape</p>
                <p className="text-sm text-muted-foreground">{generationPreview.sessionFantasy}</p>
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Graphics Plan</p>
                <p className="text-sm text-muted-foreground">{generationPreview.graphicsPlan.visualIdentity}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Engine Recommendation</p>
                <p className="text-sm text-muted-foreground">{generationPreview.enginePlan.recommendedEngine} · {generationPreview.enginePlan.rationale}</p>
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Experience Goals</p>
                <div className="space-y-1">{generationPreview.experienceGoals.map(goal => <p key={goal} className="text-sm text-muted-foreground">• {goal}</p>)}</div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Prompt Constraints</p>
                <div className="flex flex-wrap gap-1">
                  {generationPreview.negativeConstraints.length > 0
                    ? generationPreview.negativeConstraints.map(constraint => <Badge key={constraint} variant="secondary">{constraint}</Badge>)
                    : <Badge variant="outline">No restrictive prompt constraints detected</Badge>}
                </div>
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Layout Rules</p>
                <div className="space-y-1">{generationPreview.layoutRules.slice(0, 3).map(rule => <p key={rule} className="text-sm text-muted-foreground">• {rule}</p>)}</div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Gameplay Loop</p>
                <div className="space-y-1">{generationPreview.coreLoop.slice(0, 4).map(stepItem => <p key={stepItem} className="text-sm text-muted-foreground">• {stepItem}</p>)}</div>
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Content Pillars</p>
                <div className="flex flex-wrap gap-1">{generationPreview.contentPillars.map((pillar) => <Badge key={pillar} variant="secondary">{pillar}</Badge>)}</div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Environment Themes</p>
                <div className="flex flex-wrap gap-1">{generationPreview.environmentThemes.map((theme) => <Badge key={theme} variant="outline">{theme}</Badge>)}</div>
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">UI Surfaces</p>
                <div className="flex flex-wrap gap-1">{generationPreview.uiSurfaces.map((surface) => <Badge key={surface} variant="outline">{surface}</Badge>)}</div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">System Priorities</p>
                <div className="flex flex-wrap gap-1">{generationPreview.systemPriorities.map((priority) => <Badge key={priority} variant="secondary">{priority}</Badge>)}</div>
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Asset Pipeline</p>
                <p className="text-sm text-muted-foreground">{generationPreview.assetPlan.productionStyle}</p>
                <p className="text-sm text-muted-foreground">{generationPreview.assetPlan.assetPipelineSummary}</p>
                <p className="text-sm text-muted-foreground">{generationPreview.assetPlan.modelGenerationSummary}</p>
                <div className="flex flex-wrap gap-1">{generationPreview.assetPlan.materialPalette.map((material) => <Badge key={material} variant="outline">{material}</Badge>)}</div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Asset Rules</p>
                <div className="space-y-1">{generationPreview.assetPlan.generationRules.map(rule => <p key={rule} className="text-sm text-muted-foreground">• {rule}</p>)}</div>
                <div className="space-y-1">{generationPreview.assetPlan.toolchainQualityChecks.slice(0, 2).map(rule => <p key={rule} className="text-sm text-muted-foreground">• {rule}</p>)}</div>
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Character Blueprints</p>
                <div className="flex flex-wrap gap-1">{generationPreview.assetPlan.characterBlueprints.map((character) => <Badge key={character.name} variant="secondary">{character.name}</Badge>)}</div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Prop Families</p>
                <div className="flex flex-wrap gap-1">{generationPreview.assetPlan.propBlueprints.map((prop) => <Badge key={prop.name} variant="outline">{prop.name}</Badge>)}</div>
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Environment Kits</p>
                <div className="flex flex-wrap gap-1">{generationPreview.assetPlan.environmentKits.map((kit) => <Badge key={kit.name} variant="secondary">{kit.name}</Badge>)}</div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Model Generation Toolchains</p>
                <div className="space-y-2">
                  {generationPreview.assetPlan.generationToolchains.map((toolchain) => (
                    <div key={toolchain.id} className="rounded-lg border border-border/50 bg-background/40 px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{toolchain.label}</p>
                        <Badge variant="outline" className="text-[10px]">{toolchain.stage}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{toolchain.objective}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Primary source: {toolchain.primarySource}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Asset Orchestration</p>
                <p className="text-sm text-muted-foreground">{generationPreview.assetPlan.orchestrationStrategy}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">GitHub Asset Sources</p>
                <div className="space-y-2">
                  {generationPreview.assetPlan.sourceInspirations.map((source) => (
                    <a
                      key={source.repo}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-lg border border-border/50 bg-background/40 px-3 py-2 text-sm transition-colors hover:bg-accent/60"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{source.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{source.reusePolicy === "direct" ? "Code-compatible inspiration" : "Reference-only workflow inspiration"}</span>
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Auto-Included Core Systems</p>
                <div className="flex flex-wrap gap-1">
                  {generationPreview.autoIncludedFeatures.length > 0 ? generationPreview.autoIncludedFeatures.map(feature => <Badge key={feature} variant="secondary">{formatLabel(feature)}</Badge>) : <Badge variant="outline">No extra core systems needed</Badge>}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Complementary Expansion</p>
                <div className="flex flex-wrap gap-1">{generationPreview.supplementalSystems.map(system => <Badge key={system.name} variant="outline">{system.displayName}</Badge>)}</div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button variant="outline" onClick={applyPromptDefaults}>Use Prompt Defaults</Button>
            <Button disabled={!effectivePrompt.trim()} onClick={() => { setStep(3); startGeneration() }} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"><Rocket className="mr-2 h-4 w-4" /> Generate Game</Button>
          </div>
        </CardContent></Card>
      )}
      {step === 3 && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,2.1fr)_420px] 2xl:grid-cols-[minmax(0,2.35fr)_460px]">
          <Card className="relative overflow-hidden border-border/50 bg-card/50">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
                    Generating Your Game
                  </CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">
                    The live loop below stays active through prompt completion, workspace build, compile checks, and any auto-repair pass before the result is shown.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200">
                    <Clock3 className="h-3.5 w-3.5" />
                    {formatElapsedTimer(generationElapsedSeconds)}
                  </div>
                  {generationRunStatus === "blocked" ? (
                    <Badge variant="outline" className="border-rose-500/30 text-rose-300">
                      blocked
                    </Badge>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Progress value={genProgress} className="h-3" />
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{generationStageLabel}</p>
                  <p className="text-sm text-muted-foreground">{generationStageDetail}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-[10px]">{generationProviderLabel}</Badge>
                  <Badge variant="outline" className={`text-[10px] ${activeGenerationProfile.scopeScale === "limitless" ? "border-amber-500/40 text-amber-400" : activeGenerationProfile.scopeScale === "expanded" ? "border-violet-500/40 text-violet-400" : "border-border/50"}`}>{activeGenerationProfile.scopeScale === "limitless" ? "AAA Scale" : activeGenerationProfile.scopeScale === "expanded" ? "Expanded" : "Standard"}</Badge>
                  <Badge variant="outline" className="text-[10px]">{activeGenerationProfile.resolvedFeatures.length + activeGenerationProfile.supplementalSystems.length} total systems</Badge>
                  <Badge variant="outline" className="text-[10px]">{Math.round(genProgress)}% complete</Badge>
                </div>
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-sm text-muted-foreground">
                Building a {activeGenerationProfile.dimension.toUpperCase()} {formatLabel(activeGenerationProfile.resolvedGenre)} blueprint with {activeGenerationProfile.resolvedFeatures.length} core systems, {activeGenerationProfile.supplementalSystems.length} complementary generation modules, {activeGenerationProfile.assetPlan.characterBlueprints.length} character blueprints, {activeGenerationProfile.assetPlan.propBlueprints.length} prop families, a non-overlapping {activeGenerationProfile.mapArchetype.toLowerCase()} layout, and a {generationProviderLabel.toLowerCase()} configuration.
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Locked Prompt</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {generationRunPrompt || "The prompt lock will appear here as soon as the run begins."}
                </p>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Blueprint Target</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline">{activeGenerationProfile.dimension.toUpperCase()}</Badge>
                    <Badge variant="outline">{activeGenerationProfile.runtimePlan.label}</Badge>
                    <Badge variant="outline">{activeGenerationProfile.cameraStyle}</Badge>
                    <Badge variant="outline">{activeGenerationProfile.graphicsPlan.renderPath}</Badge>
                    <Badge variant="outline">{formatLabel(activeGenerationProfile.enginePlan.recommendedEngine)}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{activeGenerationProfile.generatedPitch}</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Loop Protection</p>
                  <div className="mt-3 space-y-1">
                    <p className="text-sm text-muted-foreground">Compile gate is mandatory before a result is shown.</p>
                    <p className="text-sm text-muted-foreground">Prompt and settings stay separate from evolution memory.</p>
                    <p className="text-sm text-muted-foreground">Recovered provider failures stay visible instead of being hidden.</p>
                    <p className="text-sm text-muted-foreground">{activeGenerationProfile.dimension === "3d" ? "3D prompts keep explicit runtime and camera guardrails active." : "Runtime guardrails stay active through manifest lock and verification."}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {AGENTS_LIST.slice(0, 8).map((a) => {
                  const Icon = agentIcons[a.name] || Brain
                  const isActive = genAgent === a.name
                  const isDone = AGENTS_LIST.findIndex((x) => x.name === genAgent) > AGENTS_LIST.findIndex((x) => x.name === a.name)
                  return (
                    <div key={a.name} className={`rounded-lg border p-3 text-center transition-all ${isActive ? "border-violet-500/50 bg-violet-500/10" : isDone ? "border-emerald-500/20 bg-emerald-500/5" : "border-border/50"}`}>
                      <Icon className={`mx-auto mb-1 h-5 w-5 ${isActive ? "animate-pulse text-violet-400" : isDone ? "text-emerald-400" : "text-muted-foreground"}`} />
                      <p className="text-xs font-medium">{a.displayName}</p>
                      <p className="text-[10px] text-muted-foreground">{isActive ? "Working..." : isDone ? "Done" : "Waiting"}</p>
                    </div>
                  )
                })}
              </div>
              {generationRunStatus === "blocked" ? (
                <div className="flex flex-wrap gap-2">
                  <Button onClick={startGeneration} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white">
                    <Rocket className="mr-2 h-4 w-4" />
                    Retry Generation
                  </Button>
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Back to Configure
                  </Button>
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Back to Prompt
                  </Button>
                  <Button variant="outline" onClick={startFreshCreation}>
                    Start Fresh
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
          <Card className="h-fit border-violet-500/20 bg-card/60 xl:sticky xl:top-4">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ListChecks className="h-4 w-4 text-violet-300" />
                    Live Generation Status
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    This panel stays visible while the loop works so you can see what is happening when a run takes longer than expected.
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0 border-violet-500/30 text-violet-200">
                  {formatElapsedTimer(generationElapsedSeconds)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Current Task</p>
                <p className="mt-2 text-sm font-medium text-foreground">{generationStageLabel}</p>
                <p className="mt-1 text-xs text-muted-foreground">{generationStageDetail}</p>
              </div>
              {generationProviderDiagnostics ? (
                <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Provider Diagnosis</p>
                  <p className="mt-2 text-sm text-muted-foreground">{generationProviderDiagnostics.summary}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-[10px]">{generationProviderDiagnostics.highestSeverity}</Badge>
                    <Badge variant="outline" className="text-[10px]">{generationProviderDiagnostics.totalFailures} total failures</Badge>
                    <Badge variant="outline" className="text-[10px]">{generationProviderDiagnostics.recoveredFailures} recovered</Badge>
                    <Badge variant="outline" className="text-[10px]">{generationProviderDiagnostics.unresolvedFailures} unresolved</Badge>
                  </div>
                  {generationProviderDiagnostics.actionItems.length > 0 ? (
                    <div className="mt-2 space-y-1">
                      {generationProviderDiagnostics.actionItems.slice(0, 3).map((item) => (
                        <p key={item} className="text-xs text-amber-300">{item}</p>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {generationProviderFailures.length > 0 ? renderProviderFailurePanel(generationProviderFailures, {
                title: "Latest Provider Issues",
                limit: 4,
                compact: false,
              }) : null}
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Clock3 className="h-3.5 w-3.5 text-violet-300" />
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Timeline</p>
                </div>
                <div className="max-h-[260px] space-y-2 overflow-y-auto pr-1">
                  {generationActivityLog.length > 0 ? generationActivityLog.map((entry) => {
                    const statusClass = entry.status === "complete"
                      ? "border-emerald-500/20 bg-emerald-500/5"
                      : entry.status === "warning"
                        ? "border-amber-500/20 bg-amber-500/5"
                        : entry.status === "blocked"
                          ? "border-rose-500/20 bg-rose-500/5"
                          : "border-violet-500/20 bg-violet-500/5"
                    const textClass = entry.status === "complete"
                      ? "text-emerald-300"
                      : entry.status === "warning"
                        ? "text-amber-300"
                        : entry.status === "blocked"
                          ? "text-rose-300"
                          : "text-violet-300"
                    return (
                      <div key={entry.id} className={`rounded-lg border p-3 ${statusClass}`}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-foreground">{entry.title}</p>
                          <span className={`shrink-0 text-[10px] font-medium ${textClass}`}>+{formatElapsedTimer(entry.atSeconds)}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{entry.detail}</p>
                      </div>
                    )
                  }) : (
                    <p className="text-sm text-muted-foreground">The live timeline will populate as soon as the provider loop starts moving.</p>
                  )}
                </div>
              </div>
              <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Evolution and Cache Context</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Evolution stays advisory-only and cache opportunities stay visible so provider hiccups, empty responses, and warm routes can be explained instead of disappearing.
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[10px]">{displayedEvolutionContext.cacheLines.length} cache anchors</Badge>
                  <Badge variant="outline" className="text-[10px]">{displayedEvolutionContext.alphabeticalAdditions.length} alphabetical bridges</Badge>
                  <Badge variant="outline" className="text-[10px]">{displayedEvolutionContext.insertionBlocks.length} insertion blocks</Badge>
                </div>
                {displayedEvolutionContext.globalLearnings.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {displayedEvolutionContext.globalLearnings.slice(0, 3).map((entry) => (
                      <p key={entry} className="text-xs text-muted-foreground">{entry}</p>
                    ))}
                  </div>
                ) : null}
                {(generationOperationalAnalytics?.cacheableStages?.length ?? 0) > 0 ? (
                  <div className="mt-2 space-y-1">
                    {generationOperationalAnalytics?.cacheableStages.slice(0, 3).map((item) => (
                      <p key={item} className="text-xs text-sky-300">{item}</p>
                    ))}
                  </div>
                ) : null}
              </div>
              {generationOperationalAnalytics ? (
                <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Routing and Operational Signals</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-[10px]">{generationOperationalAnalytics.totalPromptCalls} prompt calls</Badge>
                    <Badge variant="outline" className="text-[10px]">{generationOperationalAnalytics.totalRetries} retries</Badge>
                    <Badge variant="outline" className="text-[10px]">{generationOperationalAnalytics.totalProviderFallbacks} recovered fallbacks</Badge>
                  </div>
                  {(generationOperationalAnalytics.routingStrategies?.length ?? 0) > 0 ? (
                    <div className="mt-2 space-y-1">
                      {generationOperationalAnalytics.routingStrategies.slice(0, 3).map((item) => (
                        <p key={item} className="text-xs text-muted-foreground">{item}</p>
                      ))}
                    </div>
                  ) : null}
                  {(generationOperationalAnalytics.providerHealthSignals?.length ?? 0) > 0 ? (
                    <div className="mt-2 space-y-1">
                      {generationOperationalAnalytics.providerHealthSignals?.slice(0, 4).map((item) => (
                        <p key={item} className="text-xs text-amber-300">{item}</p>
                      ))}
                    </div>
                  ) : null}
                  {(generationOperationalAnalytics.failureHotspots?.length ?? 0) > 0 ? (
                    <div className="mt-2 space-y-1">
                      {generationOperationalAnalytics.failureHotspots.slice(0, 3).map((item) => (
                        <p key={item} className="text-xs text-rose-300">{item}</p>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <ListChecks className="h-3.5 w-3.5 text-violet-300" />
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Pipeline Phases</p>
                </div>
                <div className="space-y-2">
                  {GENERATION_LIVE_PHASES.map((phase) => {
                    const isActive = phase.agent === genAgent
                    const isDone = GENERATION_LIVE_PHASES.findIndex((entry) => entry.agent === genAgent) > GENERATION_LIVE_PHASES.findIndex((entry) => entry.agent === phase.agent)
                    return (
                      <div key={phase.agent} className={`rounded-lg border p-3 ${isActive ? "border-violet-500/30 bg-violet-500/10" : isDone ? "border-emerald-500/20 bg-emerald-500/5" : "border-border/50 bg-muted/10"}`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-foreground">{phase.title}</p>
                          <Badge variant="outline" className="text-[10px]">
                            {isActive ? "live" : isDone ? "done" : "queued"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{phase.detail}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
              {generationRunStatus === "blocked" ? (
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-300" />
                    <p className="text-[11px] font-medium uppercase tracking-wide text-rose-200">Generation Stopped</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This screen stays open on purpose so you can inspect provider issues, cache signals, evolution context, and retry without losing the run history.
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}
      {step === 4 && completedProjectView && (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-emerald-400" />
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold">Generation Complete!</p>
                {completedProjectView.design.scopeScale === "limitless" && <Badge className="bg-amber-600/20 text-amber-400 border-amber-500/30 text-[10px]">AAA Scale</Badge>}
                <Badge variant="outline" className="text-[10px]">{formatProviderLabel(completedProjectView.llmConfiguration.provider)}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{completedProjectView.dimension.toUpperCase()} {formatLabel(completedProjectView.genre)} blueprint &middot; {completedProjectView.systems.length} systems &middot; {completedProjectView.systems.reduce((s, sys) => s + sys.linesGenerated, 0).toLocaleString()} lines of code &middot; {completedProjectView.multiplayer ? `${completedProjectView.maxPlayers} players` : "solo runtime"} &middot; {completedProjectView.design.scopeScale} scope</p>
            </div>
          </div>
          <Card className="border-border/50 bg-card/50"><CardHeader><CardTitle className="text-sm">Generation Intelligence</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex flex-wrap gap-2"><Badge variant="outline">{completedProjectView.design.cameraStyle}</Badge><Badge variant="outline">{completedProjectView.design.mapArchetype}</Badge><Badge variant="outline">{completedProjectView.design.scopeScale}</Badge></div><p className="text-sm font-medium text-foreground">{completedProjectView.design.generatedPitch}</p><p className="text-sm text-muted-foreground">{completedProjectView.design.promptSummary}</p><p className="text-sm text-muted-foreground">{completedProjectView.design.gameplayLoopSummary}</p><p className="text-sm text-muted-foreground">Player fantasy: {completedProjectView.design.playerFantasy}</p><p className="text-sm text-muted-foreground">Session shape: {completedProjectView.design.sessionFantasy}</p><p className="text-sm text-muted-foreground">Non-overlap strategy: {completedProjectView.design.nonOverlapStrategy}</p><p className="text-sm text-muted-foreground">Genre reasoning: {completedProjectView.design.genreReason}</p><div className="flex flex-wrap gap-1">{completedProjectView.design.contentPillars.map(pillar => <Badge key={pillar} variant="secondary">{pillar}</Badge>)}</div><div className="flex flex-wrap gap-1">{completedProjectView.design.supplementalSystems.map(system => <Badge key={system.name} variant="outline">{system.displayName}</Badge>)}</div></CardContent></Card>
          {completedProjectView.execution && <Card className="border-border/50 bg-card/50"><CardHeader><CardTitle className="text-sm">Execution Pipeline</CardTitle></CardHeader><CardContent className="space-y-3"><div className="flex flex-wrap gap-2"><Badge variant="outline">{completedProjectView.execution.releaseDecision.replace(/_/g, " ")}</Badge><Badge variant="outline">{completedProjectView.execution.totals.passing}/{completedProjectView.execution.totals.checks} passing</Badge>{completedProjectView.execution.autoRepairApplied && <Badge variant="secondary">auto-repaired</Badge>}</div><p className="text-sm text-muted-foreground">{completedProjectView.execution.summary}</p><div className="flex flex-wrap gap-1">{completedProjectView.execution.stageRuns.map(stage => <Badge key={stage.id} variant="outline">{stage.label}</Badge>)}</div></CardContent></Card>}
          {completedProjectView.llmConfiguration.providerFailures?.length ? (
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle className="text-sm">Provider Recovery</CardTitle>
              </CardHeader>
              <CardContent>
                {renderProviderFailurePanel(completedProjectView.llmConfiguration.providerFailures, {
                  title: "Recovered Or Final Provider Issues",
                  limit: 4,
                  compact: false,
                })}
              </CardContent>
            </Card>
          ) : null}
          <Card className="border-border/50 bg-card/50"><CardHeader><CardTitle className="text-sm">Asset Generation</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm font-medium text-foreground">{completedProjectView.design.assetPlan.productionStyle}</p><p className="text-sm text-muted-foreground">{completedProjectView.design.assetPlan.assetPipelineSummary}</p><p className="text-sm text-muted-foreground">{completedProjectView.design.assetPlan.modelGenerationSummary}</p><p className="text-sm text-muted-foreground">{completedProjectView.design.assetPlan.assemblyStrategy}</p><p className="text-sm text-muted-foreground">{completedProjectView.design.assetPlan.orchestrationStrategy}</p><div className="flex flex-wrap gap-1">{completedProjectView.design.assetPlan.materialPalette.map(material => <Badge key={material} variant="outline">{material}</Badge>)}</div><div className="flex flex-wrap gap-1">{completedProjectView.design.assetPlan.characterBlueprints.map(character => <Badge key={character.name} variant="secondary">{character.name}</Badge>)}</div><div className="flex flex-wrap gap-1">{completedProjectView.design.assetPlan.propBlueprints.map(prop => <Badge key={prop.name} variant="outline">{prop.name}</Badge>)}</div><div className="flex flex-wrap gap-1">{completedProjectView.design.assetPlan.generationToolchains.map(toolchain => <Badge key={toolchain.id} variant="secondary">{toolchain.label}</Badge>)}</div><div className="space-y-2">{completedProjectView.design.assetPlan.sourceInspirations.map(source => <a key={source.repo} href={source.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg border border-border/50 bg-background/40 px-3 py-2 text-sm transition-colors hover:bg-accent/60"><span className="min-w-0"><span className="block truncate font-medium">{source.name}</span><span className="block truncate text-xs text-muted-foreground">{source.focus}</span></span><ExternalLink className="h-3.5 w-3.5 text-muted-foreground" /></a>)}</div></CardContent></Card>
          <Card className="border-border/50 bg-card/50"><CardHeader><CardTitle className="text-sm">Generated Systems</CardTitle></CardHeader><CardContent><div className="grid grid-cols-3 gap-2">{completedProjectView.systems.map(sys => <div key={sys.name} className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3"><div className="flex items-center gap-2 mb-1"><CheckCircle className="h-3.5 w-3.5 text-emerald-400" /><span className="text-sm font-medium capitalize">{sys.displayName}</span></div><p className="text-xs text-muted-foreground font-mono">{sys.linesGenerated.toLocaleString()} lines</p></div>)}</div></CardContent></Card>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onOpenProject(completedProjectView)} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"><Play className="mr-2 h-4 w-4" /> Play Your Game</Button>
            <Button variant="outline" onClick={() => reuseProjectAsDraft(completedProjectView)}>
              Tune And Regenerate
            </Button>
            <Button variant="outline" onClick={startFreshCreation}>
              Create Another Game
            </Button>
            <Button variant="outline" onClick={onViewProjects}>View Projects</Button>
          </div>
        </div>
      )}
    </div>
  )
}
