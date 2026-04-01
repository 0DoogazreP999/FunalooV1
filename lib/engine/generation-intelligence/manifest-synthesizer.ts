import { storage } from "@/lib/storage"
import {
  createConfiguredLlmClient,
  createZodJsonVerifier,
  runPrompt,
  runPromptBatch,
  type PromptMessageInput,
  type PromptRunResult,
  type PromptRunTelemetryEvent,
  type PromptTelemetryHook,
} from "@/lib/engine/prompts"
import { GENRE_TEMPLATES } from "@/lib/engine/config"
import type {
  AssetGenerationPlan,
  AssetIntegrationContract,
  AssetProductionPhase,
  AssetGenerationToolchain,
  AssetGeneratorSource,
  CharacterAssetBlueprint,
  EnvironmentAssetKit,
  GenerationCandidateManifest,
  GenerationCandidatePlan,
  GenerationCandidateScoreBreakdown,
  GenerationDiversityPlan,
  GenerationEvolutionContext,
  GenerationEvaluationPlan,
  GenerationEvalDatasetBucket,
  GenerationEvalRubric,
  GenerationInferenceDiff,
  GenerationIntelligenceProfile,
  GenerationLoopCandidateRun,
  GenerationLoopReport,
  GenerationLoopStage,
  GenerationMissingCriteria,
  GenerationOperationalAnalytics,
  GenerationPromptPacket,
  GenerationPromptCouncilPlan,
  GenerationPipelinePlan,
  GenerationProviderFailure,
  GenerationEnginePlan,
  GenerationGraphicsPlan,
  GenerationKnowledgeCoverage,
  GenerationKnowledgeRiskSummary,
  GenerationUsageIntelligence,
  GenerationPromptStageId,
  GenerationReleaseJudgement,
  GenerationReferenceExample,
  GenerationRuntimePlan,
  Genre,
  LevelBeat,
  ProviderLoopAssignment,
  ProviderLoopRoster,
  ProjectPromptConfiguration,
  PromptProviderId,
  PropAssetBlueprint,
  SupplementalGenerationSystem,
} from "@/lib/engine/types"
import type { UserAiSettings } from "@/lib/user-store"
import { formatEvolutionContextForPrompt } from "@/lib/engine/evolution-memory"
import {
  buildGenerationKnowledgeCoverage,
  buildGenerationKnowledgeRiskSummary,
  formatKnowledgeCoverageForPrompt,
  formatKnowledgeRiskForPrompt,
} from "@/lib/engine/knowledge-coverage"
import {
  buildGenerationUsageIntelligence,
  formatUsageIntelligenceForPrompt,
} from "@/lib/engine/usage-intelligence"
import { buildGenerationProviderDiagnosticsSummary } from "@/lib/engine/provider-diagnostics"
import {
  buildRuntimeEncounterDirectorFromProfile,
  formatRuntimeEncounterDirectorForPrompt,
  summarizeRuntimeEncounterDirector,
  type RuntimeEncounterDirector,
} from "@/lib/engine/runtime-encounters"
import { planGenerationAssets } from "./asset-planner"
import { parseGenerationBrief } from "./brief-parser"
import { planGenerationCandidates } from "./candidate-planner"
import { planGenerationDiversity } from "./diversity-planner"
import { planGenerationEngine } from "./engine-planner"
import { planGenerationEvaluation } from "./evaluation-planner"
import { planGenerationGraphics } from "./graphics-planner"
import { planGenerationMechanics } from "./mechanics-planner"
import { planGenerationPipeline } from "./pipeline-planner"
import {
  buildGenerationPromptConfiguration,
  GENERATION_BRIEF_ENHANCEMENT_PROMPT,
  GENERATION_CANDIDATE_CRITIC_PROMPT,
  GENERATION_CANDIDATE_MANIFEST_PROMPT,
  GENERATION_CANDIDATE_REPAIR_PROMPT,
  GENERATION_INTENT_GAP_PROMPT,
  GENERATION_PROFILE_ADVICE_PROMPT,
  GENERATION_PROMPT_SUITE,
  GENERATION_RELEASE_JUDGE_PROMPT,
} from "./prompt-catalog"
import { buildGenerationPromptCouncilPlan } from "./prompt-council-planner"
import { planGenerationReferences } from "./retrieval-planner"
import { planGenerationRuntime } from "./runtime-planner"
import { planGenerationRuntimeVersatility } from "./runtime-versatility-planner"
import {
  generationAdviceSchema,
  generationCandidateCritiqueSchema,
  generationIntentGapSchema,
  generationPreparationSchema,
  generationReleaseJudgeSchema,
  generationRepairSchema,
  type GenerationAdvice,
  type GenerationCandidateCritique,
  type GenerationIntentGap,
  type GenerationPreparation,
  type GenerationReleaseJudge,
  type GenerationRepair,
} from "./schemas"
import {
  applyGenerationAdvice,
  clampAdvisedPlayers,
  type ConfiguredUserProvider,
  getConfiguredUserProvider,
  getConfiguredUserProviderRoster,
  planGenerationScope,
  sanitizeAdvisedFeatures,
} from "./scope-validator"
import { GENERATION_FEATURE_LIBRARY, titleCase, unique } from "./shared"
import { normalizeSelectedFeatures, resolveGenerationTaxonomy } from "./taxonomy-resolver"
import { planWorldStructure } from "./world-planner"

export interface GeneratedProfileResult {
  profile: GenerationIntelligenceProfile
  llmConfiguration: ProjectPromptConfiguration
  loopReport?: GenerationLoopReport
  preparationDiff?: GenerationInferenceDiff[]
  candidateRuns?: GenerationLoopCandidateRun[]
  providerFailures?: GenerationProviderFailure[]
  providerDiagnostics?: ProjectPromptConfiguration["providerDiagnostics"]
  releaseJudgement?: GenerationReleaseJudgement
  preparationRun?: PromptRunResult<GenerationPreparation>
  promptRun?: PromptRunResult<GenerationAdvice>
  knowledgeCoverage?: GenerationKnowledgeCoverage
  knowledgeRisk?: GenerationKnowledgeRiskSummary
  usageIntelligence?: GenerationUsageIntelligence
}

export interface GenerationPromptProviderConfig {
  provider: Exclude<PromptProviderId, "local">
  apiKey: string
  model?: string
}

export interface PromptEnhancedGenerationResult {
  profile: GenerationIntelligenceProfile
  configuration: ProjectPromptConfiguration
  warning?: string
  telemetry?: Parameters<PromptTelemetryHook>[0] | null
}

export interface EnhancedGenerationBriefResult {
  prompt: string
  displayPrompt: string
  genre: Genre
  selectedFeatures: string[]
  multiplayer: boolean
  maxPlayers: number
  intentNotes: string[]
  compilePriorities: string[]
  preparationDiff?: GenerationInferenceDiff[]
  missingCriteria?: GenerationMissingCriteria[]
  providerRoster?: ProviderLoopRoster
  evolutionContext?: GenerationEvolutionContext
  knowledgeCoverage?: GenerationKnowledgeCoverage
  knowledgeRisk?: GenerationKnowledgeRiskSummary
  usageIntelligence?: GenerationUsageIntelligence
  llmConfiguration: ProjectPromptConfiguration
  preparationRun?: PromptRunResult<GenerationPreparation>
}

interface PreparedGenerationInput {
  prompt: string
  displayPrompt: string
  genre: Genre
  selectedFeatures: string[]
  multiplayer: boolean
  maxPlayers: number
  intentNotes: string[]
  compilePriorities: string[]
  preparationDiff: GenerationInferenceDiff[]
  missingCriteria: GenerationMissingCriteria[]
  evolutionContext?: GenerationEvolutionContext
  knowledgeCoverage?: GenerationKnowledgeCoverage
  knowledgeRisk?: GenerationKnowledgeRiskSummary
  usageIntelligence?: GenerationUsageIntelligence
  preparationRun?: PromptRunResult<GenerationPreparation>
}

interface StageRunRecord<T> {
  run: PromptRunResult<T>
  assignment: ProviderLoopAssignment
  stage: GenerationLoopStage
  packet: GenerationPromptPacket
  providerStage: ReturnType<typeof buildProviderStageConfiguration>
  usedFallback: boolean
  providerFailures: GenerationProviderFailure[]
}

interface LocalFidelityAudit {
  score: number
  blockedReasons: string[]
  warnings: string[]
  missingCriteria: GenerationMissingCriteria[]
}

function buildProviderStageConfiguration(input: {
  id: GenerationPromptStageId
  label: string
  version: string
  promptId: string
  promptHash?: string
  provider: Exclude<PromptProviderId, "local">
  model?: string
}) {
  return {
    id: input.id,
    label: input.label,
    version: input.version,
    promptId: input.promptId,
    promptHash: input.promptHash,
    provider: input.provider,
    model: input.model?.trim() || undefined,
  }
}

function buildPromptPacket(input: {
  stageId: GenerationPromptPacket["stageId"]
  provider: PromptProviderId
  model?: string
  hash: string
  summary: string
  includes: string[]
}): GenerationPromptPacket {
  return {
    stageId: input.stageId,
    provider: input.provider,
    model: input.model?.trim() || undefined,
    hash: input.hash,
    summary: input.summary,
    includes: input.includes,
  }
}

function buildLoopStage(input: {
  id: GenerationLoopStage["id"]
  provider: PromptProviderId
  model?: string
  attempt: number
  inputHash: string
  outputSummary: string
  verification: GenerationLoopStage["verification"]
  repairReason?: string
  elapsedMs?: number
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  costUsd?: number
  retriesUsed?: number
  omittedSections?: string[]
  cacheStrategy?: string
  routingStrategy?: string
}): GenerationLoopStage {
  return {
    id: input.id,
    provider: input.provider,
    model: input.model?.trim() || undefined,
    attempt: input.attempt,
    inputHash: input.inputHash,
    outputSummary: input.outputSummary,
    verification: input.verification,
    repairReason: input.repairReason,
    elapsedMs: input.elapsedMs,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    totalTokens: input.totalTokens,
    costUsd: input.costUsd,
    retriesUsed: input.retriesUsed,
    omittedSections: input.omittedSections,
    cacheStrategy: input.cacheStrategy,
    routingStrategy: input.routingStrategy,
  }
}

function getLatestPromptTelemetry<T>(run: PromptRunResult<T>) {
  return run.telemetry[run.telemetry.length - 1]
}

function buildStageCacheStrategy(input: {
  id: GenerationLoopStage["id"]
  run: PromptRunResult<unknown>
}) {
  const trimmed = input.run.omittedSections.length > 0
  const cacheFriendlyStages: GenerationLoopStage["id"][] = [
    "brief_completion",
    "intent_gap_fill",
    "candidate_generation",
    "candidate_critique",
    "candidate_repair",
    "release_judgement",
  ]

  if (!cacheFriendlyStages.includes(input.id)) {
    return trimmed
      ? "Local or non-cacheable stage with trimmed sections due to prompt budget pressure."
      : "Local or non-cacheable stage."
  }

  if (trimmed) {
    return "High prefix reuse candidate, but some sections were trimmed to stay within the prompt budget."
  }

  return "High prefix reuse candidate for prompt caching because the stage repeats stable engine/runtime context."
}

function buildStageRoutingStrategy(input: {
  provider: PromptProviderId
  role?: ProviderLoopAssignment["role"]
  usedFallback?: boolean
}) {
  if (input.provider === "openrouter") {
    if (input.role === "author" || input.role === "repair") {
      return `OpenRouter throughput-biased routing with provider fallbacks ${input.usedFallback ? "engaged" : "available"}.`
    }

    if (input.role === "critic" || input.role === "release_judge") {
      return `OpenRouter price-aware routing with provider fallbacks ${input.usedFallback ? "engaged" : "available"}.`
    }

    return "OpenRouter routed with fallbacks enabled."
  }

  if (input.provider === "gpt") {
    return input.usedFallback
      ? "OpenAI-compatible fallback provider recovered this stage."
      : "OpenAI-compatible direct provider execution."
  }

  if (input.provider === "claude") {
    return input.usedFallback
      ? "Claude fallback provider recovered this stage."
      : "Claude direct structured-output execution."
  }

  return "Local heuristic routing."
}

function buildOperationalAnalytics(input: {
  loopStages: GenerationLoopStage[]
  providerFailures: GenerationProviderFailure[]
  fallbackProvidersUsed: PromptProviderId[]
}): GenerationOperationalAnalytics {
  const totalPromptCalls = input.loopStages.reduce((sum, stage) => sum + 1 + (stage.retriesUsed ?? 0), 0) + input.providerFailures.length
  const totalProviderFallbacks = input.providerFailures.filter((failure) => failure.recovered).length
  const totalRetries = input.loopStages.reduce((sum, stage) => sum + (stage.retriesUsed ?? 0), 0)
  const totalInputTokens = input.loopStages.reduce((sum, stage) => sum + (stage.inputTokens ?? 0), 0)
  const totalOutputTokens = input.loopStages.reduce((sum, stage) => sum + (stage.outputTokens ?? 0), 0)
  const totalTokens = input.loopStages.reduce((sum, stage) => sum + (stage.totalTokens ?? 0), 0)
  const totalCostUsd = Number(input.loopStages.reduce((sum, stage) => sum + (stage.costUsd ?? 0), 0).toFixed(6))
  const slowStages = unique(input.loopStages
    .filter((stage) => (stage.elapsedMs ?? 0) >= 8_000)
    .map((stage) => `${stage.id} (${((stage.elapsedMs ?? 0) / 1000).toFixed(1)}s)`))
  const cacheableStages = unique(input.loopStages
    .filter((stage) => Boolean(stage.cacheStrategy) && /cache|prefix reuse/i.test(stage.cacheStrategy ?? ""))
    .map((stage) => `${stage.id}: ${stage.cacheStrategy}`))
  const routingStrategies = unique(input.loopStages
    .map((stage) => stage.routingStrategy ?? "")
    .filter(Boolean))
  const failureCategories = unique(input.providerFailures
    .map((failure) => failure.category ?? "unknown"))
  const retryStrategies = unique(input.providerFailures
    .map((failure) => failure.retryStrategy ?? "manual_review"))
  const providerHealthSignals = unique(input.providerFailures
    .flatMap((failure) => failure.signals ?? [])
    .map((signal) => `${signal.label}: ${signal.detail}`))
  const failureHotspots = unique(input.providerFailures
    .filter((failure) => !failure.recovered)
    .map((failure) => {
      const details = [
        failure.provider,
        failure.status ? String(failure.status) : "",
        failure.category ? failure.category.replace(/_/g, " ") : "",
        failure.affectedModel ?? failure.model ?? "",
      ].filter(Boolean).join(" · ")
      return `${failure.stageLabel} · ${details}: ${failure.headline ?? failure.reason}`
    }))
  const optimizationNotes = unique([
    ...(cacheableStages.length > 0
      ? ["Repeated prompt prefixes are strong candidates for provider-side prompt caching."]
      : []),
    ...(totalProviderFallbacks > 0
      ? [`${totalProviderFallbacks} provider fallback${totalProviderFallbacks === 1 ? "" : "s"} recovered generation stages without blocking release.`]
      : []),
    ...(input.fallbackProvidersUsed.length > 0
      ? [`Fallback providers used: ${unique(input.fallbackProvidersUsed).join(", ")}.`]
      : []),
    ...(slowStages.length > 0
      ? [`Slow stages detected: ${slowStages.join(", ")}.`]
      : []),
    ...(input.loopStages.some((stage) => (stage.omittedSections?.length ?? 0) > 0)
      ? ["Some stages trimmed optional prompt sections to stay within budget; prompt packet budgeting should be reviewed for larger runs."]
      : []),
    ...(failureHotspots.length > 0
      ? ["Unrecovered provider failures remain visible as hotspots for routing, key validation, or schema hardening."]
      : []),
  ])

  return {
    totalPromptCalls,
    totalProviderFallbacks,
    totalRetries,
    totalInputTokens,
    totalOutputTokens,
    totalTokens,
    totalCostUsd,
    slowStages,
    cacheableStages,
    routingStrategies,
    failureCategories,
    retryStrategies,
    providerHealthSignals,
    failureHotspots,
    optimizationNotes,
  }
}

function buildEvolutionPromptSection(context?: GenerationEvolutionContext) {
  if (!context) return null

  return {
    id: "evolution-context",
    content: [
      "Advisory evolution context:",
      "Use this only as retrieval memory that can widen the result without overriding the creator's explicit brief or locked settings.",
      formatEvolutionContextForPrompt(context),
    ].join("\n"),
    optional: true,
    trimPriority: 2 as const,
  }
}

function buildKnowledgeCoveragePromptSection(coverage?: GenerationKnowledgeCoverage) {
  if (!coverage) return null

  return {
    id: "knowledge-coverage",
    content: [
      "Advisory engine knowledge coverage:",
      "Use only the relevant knowledge signals and gap warnings that strengthen the creator brief and compile discipline.",
      formatKnowledgeCoverageForPrompt(coverage),
    ].join("\n"),
    optional: true,
    trimPriority: 2 as const,
  }
}

function buildKnowledgeRiskPromptSection(summary?: GenerationKnowledgeRiskSummary) {
  if (!summary) return null

  return {
    id: "knowledge-risk",
    content: [
      "Advisory knowledge risk pressure:",
      "Use this to strengthen critique, repair, and release verification without replacing the creator brief.",
      formatKnowledgeRiskForPrompt(summary),
    ].join("\n"),
    optional: true,
    trimPriority: 2 as const,
  }
}

function buildUsageIntelligencePromptSection(intelligence?: GenerationUsageIntelligence) {
  if (!intelligence) return null

  return {
    id: "usage-intelligence",
    content: [
      "Advisory AI usage intelligence:",
      "Use prior provider-backed generation outcomes only as operational guidance for manifest lock, routing, and repair pressure. Do not let this override the creator brief.",
      formatUsageIntelligenceForPrompt(intelligence),
    ].join("\n"),
    optional: true,
    trimPriority: 2 as const,
  }
}

function buildEncounterPromptSection(director?: RuntimeEncounterDirector) {
  if (!director) return null

  return {
    id: "runtime-encounter-director",
    content: [
      "Advisory runtime encounter continuity:",
      "Use this to keep objective chains, mid-session variation, and scenario cadence aligned between the prompt loop and the eventual playable runtime.",
      formatRuntimeEncounterDirectorForPrompt(director),
    ].join("\n"),
    optional: true,
    trimPriority: 1 as const,
  }
}

function buildAdvisoryPromptSections(input: {
  evolutionContext?: GenerationEvolutionContext
  knowledgeCoverage?: GenerationKnowledgeCoverage
  knowledgeRisk?: GenerationKnowledgeRiskSummary
  usageIntelligence?: GenerationUsageIntelligence
  encounterContext?: RuntimeEncounterDirector
}) {
  return [
    ...(input.evolutionContext ? [buildEvolutionPromptSection(input.evolutionContext)!] : []),
    ...(input.knowledgeCoverage ? [buildKnowledgeCoveragePromptSection(input.knowledgeCoverage)!] : []),
    ...(input.knowledgeRisk ? [buildKnowledgeRiskPromptSection(input.knowledgeRisk)!] : []),
    ...(input.usageIntelligence ? [buildUsageIntelligencePromptSection(input.usageIntelligence)!] : []),
    ...(input.encounterContext ? [buildEncounterPromptSection(input.encounterContext)!] : []),
  ]
}

function buildPacketIncludes(base: string[], input?: {
  evolutionContext?: GenerationEvolutionContext
  knowledgeCoverage?: GenerationKnowledgeCoverage
  knowledgeRisk?: GenerationKnowledgeRiskSummary
  usageIntelligence?: GenerationUsageIntelligence
  encounterContext?: RuntimeEncounterDirector
}) {
  const includes = [...base]

  if (input?.evolutionContext) {
    includes.push("Advisory evolution context", "Cached Nexus anchors", "Alphabetical additions", "Evolution insertion blocks")
  }

  if (input?.knowledgeCoverage) {
    includes.push("Advisory knowledge coverage", "Relevant engine research signals", "Training gap warnings", "Compile guidance")
  }

  if (input?.knowledgeRisk) {
    includes.push("Knowledge risk pressure", "Critique pressure", "Repair pressure", "Release pressure")
  }

  if (input?.usageIntelligence) {
    includes.push("AI usage intelligence", "Provider snapshots", "Routing pressure", "Compile pressure")
  }

  if (input?.encounterContext) {
    includes.push("Runtime encounter continuity", "Scenario chain", "Cadence windows", "Objective chain notes")
  }

  return includes
}

function buildProviderFailure(input: {
  stageId: GenerationLoopStage["id"]
  stageLabel: string
  provider: PromptProviderId
  model?: string
  attempt: number
  run: Extract<PromptRunResult<unknown>, { ok: false }>
  recovered?: boolean
  final?: boolean
}) : GenerationProviderFailure {
  return {
    stageId: input.stageId,
    stageLabel: input.stageLabel,
    provider: input.provider,
    model: input.model?.trim() || undefined,
    attempt: input.attempt,
    reason: input.run.error.issues[0] ?? input.run.error.message,
    code: input.run.error.code,
    retryable: input.run.error.retryable ?? false,
    recovered: input.recovered ?? false,
    final: input.final ?? false,
    status: input.run.error.status,
    providerErrorType: input.run.error.providerErrorType,
    category: input.run.error.category,
    severity: input.run.error.severity,
    retryStrategy: input.run.error.retryStrategy,
    statusFamily: input.run.error.statusFamily,
    headline: input.run.error.headline,
    suggestedAction: input.run.error.suggestedAction,
    affectedModel: input.run.error.affectedModel,
    limitSummary: input.run.error.limitSummary,
    signals: input.run.error.signals,
    requestId: input.run.error.requestId,
    retryAfterSeconds: input.run.error.retryAfterSeconds,
  }
}

function summarizePromptRun<T>(run: PromptRunResult<T>, fallbackSummary: string) {
  if (run.ok) {
    return fallbackSummary
  }

  return run.error.issues[0] ?? run.error.message
}

function getLoopAssignment(
  roster: ProviderLoopRoster | null | undefined,
  role: ProviderLoopAssignment["role"],
  fallbackProvider: ConfiguredUserProvider,
): ProviderLoopAssignment {
  return roster?.assignments.find((assignment) => assignment.role === role) ?? {
    role,
    provider: fallbackProvider.provider,
    model: fallbackProvider.model,
    source: "selected",
    notes: "Fallback to the selected provider because no explicit loop roster was available.",
  }
}

function buildPreparationDiff(input: {
  originalPrompt: string
  enhancedPrompt: string
  genre: Genre
  nextGenre: Genre
  multiplayer: boolean
  nextMultiplayer: boolean
  maxPlayers: number
  nextMaxPlayers: number
  selectedFeatures: string[]
  nextFeatures: string[]
}): GenerationInferenceDiff[] {
  const diffs: GenerationInferenceDiff[] = []

  if (input.originalPrompt.trim() !== input.enhancedPrompt.trim()) {
    diffs.push({
      field: "prompt",
      explicitValue: input.originalPrompt.trim().slice(0, 160),
      inferredValue: input.enhancedPrompt.trim().slice(0, 160),
      rationale: "The brief was expanded so the downstream generation loop had more concrete runtime, system, and compile expectations.",
      applied: true,
    })
  }

  if (input.genre !== input.nextGenre) {
    diffs.push({
      field: "genre",
      explicitValue: input.genre,
      inferredValue: input.nextGenre,
      rationale: "The selected provider resolved the prompt toward a more specific genre fit.",
      applied: true,
    })
  }

  if (input.multiplayer !== input.nextMultiplayer) {
    diffs.push({
      field: "multiplayer",
      explicitValue: input.multiplayer ? "multiplayer" : "solo",
      inferredValue: input.nextMultiplayer ? "multiplayer" : "solo",
      rationale: "The preparation stage clarified the intended session structure.",
      applied: true,
    })
  }

  if (input.maxPlayers !== input.nextMaxPlayers) {
    diffs.push({
      field: "maxPlayers",
      explicitValue: String(input.maxPlayers),
      inferredValue: String(input.nextMaxPlayers),
      rationale: "The preparation stage resolved player count to fit the inferred session model.",
      applied: true,
    })
  }

  const addedFeatures = input.nextFeatures.filter((feature) => !input.selectedFeatures.includes(feature))
  if (addedFeatures.length > 0) {
    diffs.push({
      field: "requiredFeatures",
      explicitValue: input.selectedFeatures.join(", ") || "none",
      inferredValue: addedFeatures.join(", "),
      rationale: "The preparation stage added implied systems to keep the runtime fantasy intact.",
      applied: true,
    })
  }

  return diffs
}

function buildKnowledgeRiskSummaryForProfile(input: {
  profile: GenerationIntelligenceProfile
  knowledgeCoverage?: GenerationKnowledgeCoverage
  knowledgeFit?: "strong" | "balanced" | "risky"
}) {
  return buildGenerationKnowledgeRiskSummary({
    coverage: input.knowledgeCoverage,
    knowledgeFit: input.knowledgeFit,
    dimension: input.profile.dimension,
    targetEngine: input.profile.enginePlan.recommendedEngine,
    runtimeArchetype: input.profile.runtimePlan.archetype,
  })
}

function buildEncounterDirectorForProfile(input: {
  prompt: string
  profile: GenerationIntelligenceProfile
  genre: Genre
  selectedFeatures: string[]
  multiplayer: boolean
  maxPlayers: number
}) {
  return buildRuntimeEncounterDirectorFromProfile({
    prompt: input.prompt,
    profile: input.profile,
    genre: input.genre,
    selectedFeatures: input.selectedFeatures,
    multiplayer: input.multiplayer,
    maxPlayers: input.maxPlayers,
  })
}

function applyKnowledgePressureToCritique(input: {
  critique: GenerationCandidateCritique
  knowledgeRisk: GenerationKnowledgeRiskSummary
}) : GenerationCandidateCritique {
  const warnings = unique([
    ...input.critique.warnings,
    ...input.knowledgeRisk.warnings,
  ]).slice(0, 8)
  const repairInstructions = unique([
    ...input.critique.repairInstructions,
    ...input.knowledgeRisk.critiquePressure,
    ...input.knowledgeRisk.repairPressure,
  ]).slice(0, 8)
  const blockedReasons = input.critique.decision === "blocked"
    ? unique([
        ...input.critique.blockedReasons,
        ...input.knowledgeRisk.blockers,
      ]).slice(0, 8)
    : input.critique.blockedReasons

  let decision = input.critique.decision
  if (input.knowledgeRisk.level === "risky" && decision === "pass") {
    decision = "repair"
  }

  const summary = input.knowledgeRisk.level === "aligned"
    ? input.critique.summary
    : `${input.critique.summary} Knowledge pressure: ${input.knowledgeRisk.summary}`

  return {
    ...input.critique,
    decision,
    summary,
    blockedReasons,
    warnings,
    repairInstructions,
  }
}

function buildLocalFidelityAudit(input: {
  prompt: string
  profile: GenerationIntelligenceProfile
}): LocalFidelityAudit {
  const normalizedPrompt = input.prompt.toLowerCase()
  const blockedReasons: string[] = []
  const warnings: string[] = []
  const missingCriteria: GenerationMissingCriteria[] = []

  const askedFor3d = /\b3d\b|first-person|third-person/.test(normalizedPrompt)
  const askedForFirstPerson = /first-person|first person/.test(normalizedPrompt)
  const askedForThirdPerson = /third-person|third person/.test(normalizedPrompt)
  const askedForNoCombat = /no combat|without combat|peaceful|nonviolent/.test(normalizedPrompt)
  const directAvatarPrompt = /zombie|shooter|black ops|stealth|heist|raid|mission|extraction|survival/.test(normalizedPrompt)
  const farmingPrompt = /farming|stardew|homestead|life sim|village/.test(normalizedPrompt)

  if (askedFor3d && input.profile.dimension !== "3d") {
    blockedReasons.push("Explicit 3D prompt drifted into a non-3D interpretation.")
  }

  if (askedForFirstPerson && !/first/i.test(input.profile.cameraStyle)) {
    blockedReasons.push("Explicit first-person prompt lost its requested camera model.")
  }

  if (askedForThirdPerson && !/third/i.test(input.profile.cameraStyle)) {
    blockedReasons.push("Explicit third-person prompt lost its requested camera model.")
  }

  if (askedForNoCombat && input.profile.resolvedFeatures.includes("combat")) {
    blockedReasons.push("Prompt explicitly removed combat, but the generation profile reintroduced combat systems.")
  }

  if (directAvatarPrompt && ["strategy_command", "journey_route", "homestead_life"].includes(input.profile.runtimePlan.archetype)) {
    blockedReasons.push("Direct-avatar prompt collapsed into a non-avatar runtime archetype.")
  }

  if (farmingPrompt && input.profile.runtimePlan.archetype !== "homestead_life") {
    warnings.push("Farming-style prompt did not resolve to the homestead runtime.")
  }

  if (!/camera|first|third|top-down|isometric/.test(normalizedPrompt)) {
    missingCriteria.push({
      field: "camera_style",
      severity: "medium",
      reason: "The original prompt did not strongly lock a camera model.",
      suggestedFill: input.profile.cameraStyle,
    })
  }

  if (!/solo|single-player|multiplayer|co-op|coop|co op|players?/.test(normalizedPrompt)) {
    missingCriteria.push({
      field: "player_mode",
      severity: "medium",
      reason: "The original prompt did not clearly specify the session structure.",
      suggestedFill: input.profile.resolvedMultiplayer ? `${input.profile.resolvedMaxPlayers} players` : "solo",
    })
  }

  const score = Math.max(0, 100 - blockedReasons.length * 35 - warnings.length * 10)

  return {
    score,
    blockedReasons,
    warnings,
    missingCriteria,
  }
}

function buildLocalReleaseJudgement(input: {
  profile: GenerationIntelligenceProfile
  audit: LocalFidelityAudit
  knowledgeRisk?: GenerationKnowledgeRiskSummary
}): GenerationReleaseJudgement {
  if (input.audit.blockedReasons.length > 0) {
    return {
      decision: "blocked",
      summary: "The generation loop blocked release because the candidate drifted away from explicit prompt constraints.",
      blockers: unique([
        ...input.audit.blockedReasons,
        ...(input.knowledgeRisk?.blockers ?? []),
      ]).slice(0, 8),
      warnings: unique([
        ...input.audit.warnings,
        ...(input.knowledgeRisk?.warnings ?? []),
      ]).slice(0, 8),
    }
  }

  if (input.knowledgeRisk?.level === "risky") {
    return {
      decision: "needs_review",
      summary: `The generation loop kept the project behind an extra review gate because ${input.knowledgeRisk.summary.toLowerCase()}`,
      blockers: [],
      warnings: unique([
        ...input.audit.warnings,
        ...input.knowledgeRisk.warnings,
        ...input.knowledgeRisk.releasePressure,
      ]).slice(0, 8),
    }
  }

  if (input.audit.warnings.length > 0) {
    return {
      decision: "needs_review",
      summary: "The generation loop kept the project but flagged prompt-to-runtime pressure that should be reviewed.",
      blockers: [],
      warnings: unique([
        ...input.audit.warnings,
        ...(input.knowledgeRisk?.warnings ?? []),
      ]).slice(0, 8),
    }
  }

  return {
    decision: "ready",
    summary: input.knowledgeRisk?.level === "watch"
      ? `The generation loop preserved the ${input.profile.runtimePlan.label.toLowerCase()} runtime, but kept knowledge watchpoints active for release review.`
      : `The generation loop preserved the ${input.profile.runtimePlan.label.toLowerCase()} runtime without prompt collapse.`,
    blockers: [],
    warnings: unique([
      ...(input.knowledgeRisk?.level === "watch" ? input.knowledgeRisk.warnings : []),
    ]).slice(0, 8),
  }
}

function applyKnowledgePressureToReleaseJudgement(input: {
  judgement: GenerationReleaseJudgement
  knowledgeRisk: GenerationKnowledgeRiskSummary
}): GenerationReleaseJudgement {
  const decision = input.judgement.decision

  return {
    decision,
    summary: input.knowledgeRisk.level === "aligned"
      ? input.judgement.summary
      : `${input.judgement.summary} Knowledge pressure: ${input.knowledgeRisk.summary}`,
    blockers: decision === "blocked"
      ? unique([
          ...input.judgement.blockers,
          ...input.knowledgeRisk.blockers,
        ]).slice(0, 8)
      : input.judgement.blockers,
    warnings: unique([
      ...input.judgement.warnings,
      ...input.knowledgeRisk.warnings,
      ...input.knowledgeRisk.releasePressure,
    ]).slice(0, 8),
  }
}

function orderProviderIdsByUsageIntelligence(input: {
  providerIds: Array<Exclude<PromptProviderId, "local">>
  usageIntelligence?: GenerationUsageIntelligence
}) {
  const suggested = input.usageIntelligence?.suggestedProviders ?? []
  return [
    ...suggested.filter((providerId) => input.providerIds.includes(providerId)),
    ...input.providerIds,
  ].filter((providerId, index, values) => values.indexOf(providerId) === index)
}

async function runProviderStageWithFallback<T>(input: {
  prompt: {
    id: string
    version: string
    stage: GenerationPromptStageId
    label: string
  }
  loopStageId: GenerationLoopStage["id"]
  candidates: Array<{
    assignment: ProviderLoopAssignment
    configuredProvider: ConfiguredUserProvider
  }>
  verifier: ReturnType<typeof createZodJsonVerifier>
  messagesFactory: (assignment: ProviderLoopAssignment) => PromptMessageInput[]
  metadata: Record<string, unknown>
  maxInputTokens: number
  maxOutputTokens: number
  temperature: number
  telemetry?: PromptTelemetryHook
  repairReason?: string
  packetSummary: string
  packetIncludes: string[]
  successSummary: (result: T) => string
}): Promise<StageRunRecord<T>> {
  let lastResult: StageRunRecord<T> | null = null
  const providerFailures: GenerationProviderFailure[] = []

  for (let index = 0; index < input.candidates.length; index += 1) {
    const current = input.candidates[index]!
    const client = createConfiguredLlmClient({
      provider: current.configuredProvider.provider,
      apiKey: current.configuredProvider.apiKey,
      model: current.configuredProvider.model,
      baseUrl: current.configuredProvider.baseUrl,
    })

    const run = await runPrompt<T>({
      name: input.prompt.id,
      promptId: input.prompt.id,
      promptVersion: input.prompt.version,
      promptStage: input.prompt.stage,
      client,
      model: current.assignment.model || current.configuredProvider.model,
      maxInputTokens: input.maxInputTokens,
      maxOutputTokens: input.maxOutputTokens,
      temperature: input.temperature,
      retries: 2,
      telemetry: input.telemetry,
      onIntelligence: (frag) => storage.saveEvolutionFragment(frag),
      metadata: {
        ...input.metadata,
        providerRole: current.assignment.role,
        attempt: index + 1,
      },
      verifier: input.verifier as ReturnType<typeof createZodJsonVerifier>,
      messages: input.messagesFactory(current.assignment),
    })

    const latestTelemetry = getLatestPromptTelemetry(run)
    const stage = buildLoopStage({
      id: input.loopStageId,
      provider: current.assignment.provider,
      model: current.assignment.model,
      attempt: index + 1,
      inputHash: run.hash,
      outputSummary: run.ok ? input.successSummary(run.data as T) : summarizePromptRun(run, `${input.prompt.label} failed verification.`),
      verification: run.ok ? "pass" : index < input.candidates.length - 1 ? "warning" : "fail",
      repairReason: index > 0 ? input.repairReason ?? "Previous provider attempt failed, so the stage fell back to another saved provider." : input.repairReason,
      elapsedMs: latestTelemetry?.elapsedMs,
      inputTokens: run.usage.inputTokens ?? latestTelemetry?.inputTokens,
      outputTokens: run.usage.outputTokens ?? latestTelemetry?.outputTokens,
      totalTokens: run.usage.totalTokens ?? latestTelemetry?.totalTokens,
      costUsd: run.usage.costUsd ?? latestTelemetry?.costUsd,
      retriesUsed: Math.max(0, (run.ok ? run.attempts : run.error.attempts) - 1),
      omittedSections: run.omittedSections,
      cacheStrategy: buildStageCacheStrategy({
        id: input.loopStageId,
        run,
      }),
      routingStrategy: buildStageRoutingStrategy({
        provider: current.assignment.provider,
        role: current.assignment.role,
        usedFallback: index > 0,
      }),
    })

    const record: StageRunRecord<T> = {
      run,
      assignment: current.assignment,
      stage,
      packet: buildPromptPacket({
        stageId: input.loopStageId,
        provider: current.assignment.provider,
        model: current.assignment.model,
        hash: run.hash,
        summary: input.packetSummary,
        includes: input.packetIncludes,
      }),
      providerStage: buildProviderStageConfiguration({
        id: input.prompt.stage,
        label: input.prompt.label,
        version: input.prompt.version,
        promptId: input.prompt.id,
        promptHash: run.hash,
        provider: current.assignment.provider,
        model: current.assignment.model,
      }),
      usedFallback: index > 0,
      providerFailures: [],
    }

    lastResult = record

    if (run.ok) {
      record.providerFailures = providerFailures.map((failure) => ({
        ...failure,
        recovered: true,
        final: false,
      }))
      return record
    }

    providerFailures.push(buildProviderFailure({
      stageId: input.loopStageId,
      stageLabel: input.prompt.label,
      provider: current.assignment.provider,
      model: current.assignment.model,
      attempt: index + 1,
      run,
      recovered: false,
      final: index === input.candidates.length - 1,
    }))
  }

  if (!lastResult) {
    throw new Error(`No provider candidates were available for stage ${input.prompt.id}.`)
  }

  lastResult.providerFailures = providerFailures
  return lastResult
}

function buildProfileFromAdvice(input: {
  prompt: string
  baseProfile: GenerationIntelligenceProfile
  selectedFeatures: string[]
  genre: Genre
  multiplayer: boolean
  maxPlayers: number
  seed?: string
  networkTopology?: NetworkTopology
  tickRate?: number
  advice: GenerationAdvice | GenerationRepair
}) {
  const advisedMultiplayer = input.advice.resolvedMultiplayer ?? input.multiplayer
  const advisedFeatures = unique([
    ...input.selectedFeatures,
    ...sanitizeAdvisedFeatures(input.advice.requiredFeatures),
  ]).filter((feature) => !sanitizeAdvisedFeatures(input.advice.disallowedFeatures).includes(feature))

  const advisedProfile = buildGenerationProfile({
    prompt: input.prompt,
    genre: input.genre,
    selectedFeatures: advisedFeatures,
    multiplayer: advisedMultiplayer,
    maxPlayers: clampAdvisedPlayers(
      advisedMultiplayer,
      input.maxPlayers,
      input.advice.resolvedMaxPlayers,
    ),
    seed: input.seed,
    networkTopology: input.networkTopology,
    tickRate: input.tickRate,
    planningOverrides: {

      dimension: input.advice.resolvedDimension,
      cameraStyle: input.advice.cameraStyle,
      runtimeArchetype: input.advice.runtimeArchetype,
      scopeScale: input.advice.resolvedScopeScale,
    },
  })

  return {
    profile: applyGenerationAdvice(advisedProfile, input.advice),
    selectedFeatures: advisedFeatures,
    multiplayer: advisedMultiplayer,
    maxPlayers: clampAdvisedPlayers(
      advisedMultiplayer,
      input.baseProfile.resolvedMaxPlayers,
      input.advice.resolvedMaxPlayers,
    ),
  }
}

async function prepareGenerationInputWithProvider(input: {
  prompt: string
  genre: Genre
  selectedFeatures: string[]
  multiplayer: boolean
  maxPlayers: number
  seed?: string
  networkTopology?: NetworkTopology
  tickRate?: number
  evolutionContext?: GenerationEvolutionContext
  knowledgeCoverage?: GenerationKnowledgeCoverage
  usageIntelligence?: GenerationUsageIntelligence
  configuredProvider: ConfiguredUserProvider
  telemetry?: PromptTelemetryHook
}) : Promise<PreparedGenerationInput> {
  const client = createConfiguredLlmClient({
    provider: input.configuredProvider.provider,
    apiKey: input.configuredProvider.apiKey,
    model: input.configuredProvider.model,
    baseUrl: input.configuredProvider.baseUrl,
  })
  const preparationKnowledgeRisk = buildGenerationKnowledgeRiskSummary({
    coverage: input.knowledgeCoverage,
  })

  const preparationRun = await runPrompt<GenerationPreparation>({
    name: "generation_brief_enhancement",
    promptId: GENERATION_BRIEF_ENHANCEMENT_PROMPT.id,
    promptVersion: GENERATION_BRIEF_ENHANCEMENT_PROMPT.version,
    promptStage: GENERATION_BRIEF_ENHANCEMENT_PROMPT.stage,
    client,
    model: input.configuredProvider.model,
    maxInputTokens: 2800,
    maxOutputTokens: 1400,
    temperature: 0.3,
    retries: 2,
    telemetry: input.telemetry,
    onIntelligence: (frag) => storage.saveEvolutionFragment(frag),
    metadata: {
      suiteId: GENERATION_PROMPT_SUITE.id,
      suiteVersion: GENERATION_PROMPT_SUITE.version,
      provider: input.configuredProvider.provider,
      selectedFeatures: input.selectedFeatures.join(","),
      multiplayer: String(input.multiplayer),
      stage: "provider_brief_enhancement",
    },
    verifier: createZodJsonVerifier(generationPreparationSchema),
    messages: [
      {
        role: "system",
        content: [
          "You are a senior game-brief expansion specialist.",
          "Use the creator's prompt and current settings to expand the brief before generation.",
          "Preserve explicit constraints like 3D, no combat, camera preference, multiplayer limits, genre blend, and named mechanics.",
          "You may fill in missing detail only when it strengthens the requested fantasy instead of replacing it.",
          "Return only valid JSON with no markdown fences or commentary.",
        ].join("\n"),
      },
      {
        role: "user",
        sections: [
          {
            id: "original-brief",
            content: `Original prompt:\n${input.prompt.trim()}`,
          },
          {
            id: "current-settings",
            content: [
              `Genre hint: ${input.genre}`,
              `Selected features: ${input.selectedFeatures.join(", ") || "none"}`,
              `Multiplayer requested: ${input.multiplayer ? "yes" : "no"}`,
              `Max players requested: ${input.maxPlayers}`,
            ].join("\n"),
          },
          ...buildAdvisoryPromptSections({
            evolutionContext: input.evolutionContext,
            knowledgeCoverage: input.knowledgeCoverage,
            knowledgeRisk: preparationKnowledgeRisk,
            usageIntelligence: input.usageIntelligence,
          }),
          {
            id: "task",
            content: [
              "Rewrite the brief into a richer generation prompt that preserves the user's intent and makes runtime-critical expectations explicit before planning begins.",
              "Fill in missing design detail only when it is strongly implied by the prompt or current settings.",
              "Use the evolution context as additive pressure, not as permission to overwrite explicit prompt constraints.",
              "Add compile priorities that make the generated build easier to verify before presentation.",
            ].join("\n"),
          },
          {
            id: "output-contract",
            content: [
              "Return a JSON object with these keys:",
              "enhancedUserPrompt, enhancedPrompt, resolvedGenre, resolvedMultiplayer, resolvedMaxPlayers, requiredFeatures, disallowedFeatures, intentNotes, compilePriorities.",
              `Use requiredFeatures and disallowedFeatures only from: ${GENERATION_FEATURE_LIBRARY.join(", ")}.`,
              "Make enhancedUserPrompt safe to place back into the creator text box without duplicating settings directives.",
              "Make enhancedPrompt concrete, prompt-faithful, and ready to feed directly into the next generation stage.",
            ].join("\n"),
          },
        ],
      },
    ],
  })

  if (!preparationRun.ok) {
    return {
      prompt: input.prompt,
      displayPrompt: input.prompt,
      genre: input.genre,
      selectedFeatures: input.selectedFeatures,
      multiplayer: input.multiplayer,
      maxPlayers: input.maxPlayers,
      intentNotes: [],
      compilePriorities: [],
      preparationDiff: [],
      missingCriteria: [],
      evolutionContext: input.evolutionContext,
      knowledgeCoverage: input.knowledgeCoverage,
      knowledgeRisk: preparationKnowledgeRisk,
      usageIntelligence: input.usageIntelligence,
      preparationRun,
    }
  }

  const preparation = preparationRun.data
  const preparedMultiplayer = preparation.resolvedMultiplayer ?? input.multiplayer
  const preparedFeatures = unique([
    ...input.selectedFeatures,
    ...sanitizeAdvisedFeatures(preparation.requiredFeatures),
  ]).filter((feature) => !sanitizeAdvisedFeatures(preparation.disallowedFeatures).includes(feature))

  return {
    prompt: preparation.enhancedPrompt.trim() || input.prompt,
    displayPrompt: preparation.enhancedUserPrompt.trim() || input.prompt,
    genre: preparation.resolvedGenre ?? input.genre,
    selectedFeatures: preparedFeatures,
    multiplayer: preparedMultiplayer,
    maxPlayers: clampAdvisedPlayers(
      preparedMultiplayer,
      input.maxPlayers,
      preparation.resolvedMaxPlayers,
    ),
    intentNotes: preparation.intentNotes,
    compilePriorities: preparation.compilePriorities,
    evolutionContext: input.evolutionContext,
    knowledgeCoverage: input.knowledgeCoverage,
    knowledgeRisk: preparationKnowledgeRisk,
    usageIntelligence: input.usageIntelligence,
    preparationDiff: buildPreparationDiff({
      originalPrompt: input.prompt,
      enhancedPrompt: preparation.enhancedPrompt.trim() || input.prompt,
      genre: input.genre,
      nextGenre: preparation.resolvedGenre ?? input.genre,
      multiplayer: input.multiplayer,
      nextMultiplayer: preparedMultiplayer,
      maxPlayers: input.maxPlayers,
      nextMaxPlayers: clampAdvisedPlayers(
        preparedMultiplayer,
        input.maxPlayers,
        preparation.resolvedMaxPlayers,
      ),
      selectedFeatures: input.selectedFeatures,
      nextFeatures: preparedFeatures,
    }),
    missingCriteria: [],
    preparationRun,
  }
}

export async function enhanceGenerationBrief(input: {
  prompt: string
  displayPrompt?: string
  genre: Genre
  selectedFeatures: string[]
  multiplayer: boolean
  maxPlayers: number
  evolutionContext?: GenerationEvolutionContext
  usageIntelligence?: GenerationUsageIntelligence
  aiSettings?: UserAiSettings | null
  telemetry?: PromptTelemetryHook
}): Promise<EnhancedGenerationBriefResult> {
  const selectedFeatures = normalizeSelectedFeatures(input.selectedFeatures)
  const initialKnowledgeCoverage = buildGenerationKnowledgeCoverage({
    prompt: input.prompt,
    genre: input.genre,
    selectedFeatures,
    multiplayer: input.multiplayer,
    seed: input.seed,
  })
  const initialKnowledgeRisk = buildGenerationKnowledgeRiskSummary({
    coverage: initialKnowledgeCoverage,
  })
  const configuredProvider = getConfiguredUserProvider(input.aiSettings, "generationProfile")
  const usageIntelligence = input.usageIntelligence ?? buildGenerationUsageIntelligence({
    prompt: input.prompt,
    genre: input.genre,
    selectedFeatures,
    selectedProvider: configuredProvider?.provider ?? (input.aiSettings?.defaultProvider !== "local" ? input.aiSettings?.defaultProvider : undefined),
    selectedModel: configuredProvider?.model,
    currentUserProjects: [],
    allProjects: [],
  })

  if (!configuredProvider) {
    return {
      prompt: input.prompt,
      displayPrompt: input.displayPrompt ?? input.prompt,
      genre: input.genre,
      selectedFeatures,
      multiplayer: input.multiplayer,
      maxPlayers: input.maxPlayers,
      intentNotes: [],
      compilePriorities: [],
      preparationDiff: [],
      missingCriteria: [],
      providerRoster: undefined,
      evolutionContext: input.evolutionContext,
      knowledgeCoverage: initialKnowledgeCoverage,
      knowledgeRisk: initialKnowledgeRisk,
      usageIntelligence,
      llmConfiguration: buildGenerationPromptConfiguration({
        provider: "local",
        source: "local",
        budgetMinutes: 90,
        releaseStatus: "needs_review",
        evolutionContext: input.evolutionContext,
        knowledgeCoverage: initialKnowledgeCoverage,
        knowledgeRisk: initialKnowledgeRisk,
        usageIntelligence,
      }),
    }
  }

  const preparedInput = await prepareGenerationInputWithProvider({
    prompt: input.prompt,
    genre: input.genre,
    selectedFeatures,
    multiplayer: input.multiplayer,
    maxPlayers: input.maxPlayers,
    seed: input.seed,
    networkTopology: input.networkTopology,
    tickRate: input.tickRate,
    evolutionContext: input.evolutionContext,
    knowledgeCoverage: initialKnowledgeCoverage,
    usageIntelligence,
    configuredProvider,
    telemetry: input.telemetry,
  })
  const providerStages = preparedInput.preparationRun?.ok
    ? [
        buildProviderStageConfiguration({
          id: GENERATION_BRIEF_ENHANCEMENT_PROMPT.stage,
          label: GENERATION_BRIEF_ENHANCEMENT_PROMPT.label,
          version: GENERATION_BRIEF_ENHANCEMENT_PROMPT.version,
          promptId: GENERATION_BRIEF_ENHANCEMENT_PROMPT.id,
          promptHash: preparedInput.preparationRun.hash,
          provider: configuredProvider.provider,
          model: configuredProvider.model,
        }),
      ]
    : []
  const briefProviderFailures = preparedInput.preparationRun && !preparedInput.preparationRun.ok
    ? [
      buildProviderFailure({
        stageId: "brief_completion",
        stageLabel: GENERATION_BRIEF_ENHANCEMENT_PROMPT.label,
        provider: configuredProvider.provider,
        model: configuredProvider.model,
        attempt: 1,
        run: preparedInput.preparationRun,
        recovered: false,
        final: true,
      }),
    ]
    : []
  const providerSource = preparedInput.preparationRun?.ok ? "user-key" : "local"

  return {
    prompt: preparedInput.prompt,
    displayPrompt: preparedInput.displayPrompt || input.displayPrompt || input.prompt,
    genre: preparedInput.genre,
    selectedFeatures: preparedInput.selectedFeatures,
    multiplayer: preparedInput.multiplayer,
    maxPlayers: preparedInput.maxPlayers,
    intentNotes: preparedInput.intentNotes,
    compilePriorities: preparedInput.compilePriorities,
    preparationDiff: preparedInput.preparationDiff,
    missingCriteria: preparedInput.missingCriteria,
    providerRoster: getConfiguredUserProviderRoster(input.aiSettings)?.roster,
    evolutionContext: input.evolutionContext,
    knowledgeCoverage: preparedInput.knowledgeCoverage ?? initialKnowledgeCoverage,
    knowledgeRisk: preparedInput.knowledgeRisk ?? initialKnowledgeRisk,
    usageIntelligence: preparedInput.usageIntelligence ?? usageIntelligence,
    llmConfiguration: buildGenerationPromptConfiguration({
      provider: providerSource === "user-key" ? configuredProvider.provider : "local",
      source: providerSource,
      model: providerSource === "user-key" ? configuredProvider.model : undefined,
      budgetMinutes: 90,
      providerRoster: getConfiguredUserProviderRoster(input.aiSettings)?.roster,
      loopCount: 1,
      fallbackProvidersUsed: [],
      releaseStatus: preparedInput.preparationRun?.ok ? "needs_review" : "blocked",
      preparationDiff: preparedInput.preparationDiff,
      providerFailures: briefProviderFailures,
      evolutionContext: input.evolutionContext,
      knowledgeCoverage: preparedInput.knowledgeCoverage ?? initialKnowledgeCoverage,
      knowledgeRisk: preparedInput.knowledgeRisk ?? initialKnowledgeRisk,
      usageIntelligence: preparedInput.usageIntelligence ?? usageIntelligence,
      providerStages,
    }),
    preparationRun: preparedInput.preparationRun,
  }
}

export function buildGenerationProfile({
  prompt,
  genre,
  selectedFeatures,
  multiplayer,
  maxPlayers,
  seed = "default_seed",
  networkTopology = "listen_server",
  tickRate = 30,
  planningOverrides,
}: {
  prompt: string
  genre: Genre
  selectedFeatures: string[]
  multiplayer: boolean
  maxPlayers: number
  seed?: string
  networkTopology?: NetworkTopology
  tickRate?: number
  planningOverrides?: {
    dimension?: GenerationIntelligenceProfile["dimension"]
    cameraStyle?: string
    runtimeArchetype?: GenerationRuntimePlan["archetype"]
    scopeScale?: GenerationIntelligenceProfile["scopeScale"]
  }
}): GenerationIntelligenceProfile {
  const brief = parseGenerationBrief({
    prompt,
    fallbackGenre: genre,
    fallbackMultiplayer: multiplayer,
    fallbackMaxPlayers: maxPlayers,
  })
  const taxonomy = resolveGenerationTaxonomy({
    prompt,
    genre,
    selectedFeatures,
    multiplayer,
    maxPlayers,
    seed,
    networkTopology,
    tickRate,
    brief,
  })
  const effectiveDimension = planningOverrides?.dimension ?? taxonomy.dimension
  const effectiveScopeScale = planningOverrides?.scopeScale ?? brief.scopeScale
  const worldPlan = planWorldStructure({
    prompt,
    genre: taxonomy.resolvedGenre,
    dimension: effectiveDimension,
    promptSignals: taxonomy.promptSignals,
  })
  const mechanicsPlan = planGenerationMechanics({
    prompt,
    genre: taxonomy.resolvedGenre,
    dimension: effectiveDimension,
    promptSignals: taxonomy.promptSignals,
    resolvedFeatures: taxonomy.resolvedFeatures,
    mapArchetype: worldPlan.mapArchetype,
    environmentThemes: worldPlan.environmentThemes,
  })
  const runtimePlan = planGenerationRuntime({
    prompt,
    genre: taxonomy.resolvedGenre,
    dimension: effectiveDimension,
    promptSignals: taxonomy.promptSignals,
    resolvedFeatures: taxonomy.resolvedFeatures,
    forcedArchetype: planningOverrides?.runtimeArchetype,
  })
  const scopePlan = planGenerationScope({
    dimension: effectiveDimension,
    genre: taxonomy.resolvedGenre,
    resolvedFeatures: taxonomy.resolvedFeatures,
    multiplayer: brief.multiplayer,
    promptSignals: taxonomy.promptSignals,
    scopeScale: effectiveScopeScale,
    runtimeArchetype: runtimePlan.archetype,
  })
  const runtimeVersatilityPlan = planGenerationRuntimeVersatility({
    prompt,
    genre: taxonomy.resolvedGenre,
    dimension: effectiveDimension,
    runtimeArchetype: runtimePlan.archetype,
    promptSignals: taxonomy.promptSignals,
    resolvedFeatures: taxonomy.resolvedFeatures,
    contentPillars: mechanicsPlan.contentPillars,
    coreLoop: mechanicsPlan.coreLoop,
    secondaryLoop: mechanicsPlan.secondaryLoop,
    progressionLoop: mechanicsPlan.progressionLoop,
    uiSurfaces: mechanicsPlan.uiSurfaces,
    environmentThemes: worldPlan.environmentThemes,
  })
  const pipelinePlan = planGenerationPipeline({
    genre: taxonomy.resolvedGenre,
    dimension: effectiveDimension,
    promptSignals: taxonomy.promptSignals,
    resolvedFeatures: taxonomy.resolvedFeatures,
    scopeScale: effectiveScopeScale,
    runtimeArchetype: runtimePlan.archetype,
  })
  const promptCouncilPlan = buildGenerationPromptCouncilPlan({
    genre: taxonomy.resolvedGenre,
    dimension: effectiveDimension,
    runtimeArchetype: runtimePlan.archetype,
    promptSignals: taxonomy.promptSignals,
  })
  const assetPlan = planGenerationAssets({
    prompt,
    genre: taxonomy.resolvedGenre,
    dimension: effectiveDimension,
    mapArchetype: worldPlan.mapArchetype,
    worldStructure: worldPlan.worldStructure,
    environmentThemes: worldPlan.environmentThemes,
    promptSignals: taxonomy.promptSignals,
    resolvedFeatures: taxonomy.resolvedFeatures,
    multiplayer: brief.multiplayer,
  })
  const graphicsPlan = planGenerationGraphics({
    genre: taxonomy.resolvedGenre,
    dimension: effectiveDimension,
    promptSignals: taxonomy.promptSignals,
    resolvedFeatures: taxonomy.resolvedFeatures,
    runtimeArchetype: runtimePlan.archetype,
    environmentThemes: worldPlan.environmentThemes,
    assetPlan,
  })
  const enginePlan = planGenerationEngine({
    genre: taxonomy.resolvedGenre,
    dimension: effectiveDimension,
    promptSignals: taxonomy.promptSignals,
    resolvedFeatures: taxonomy.resolvedFeatures,
    multiplayer: brief.multiplayer,
    runtimeArchetype: runtimePlan.archetype,
    graphicsPlan,
  })
  const references = planGenerationReferences({
    genre: taxonomy.resolvedGenre,
    dimension: effectiveDimension,
    runtimeArchetype: runtimePlan.archetype,
    promptSignals: taxonomy.promptSignals,
    resolvedFeatures: taxonomy.resolvedFeatures,
  })
  const knowledgeCoverage = buildGenerationKnowledgeCoverage({
    prompt,
    genre: taxonomy.resolvedGenre,
    selectedFeatures: taxonomy.resolvedFeatures,
    dimension: effectiveDimension,
    multiplayer: brief.multiplayer,
    seed: taxonomy.seed,
  })
  const candidatePlan = planGenerationCandidates({
    genre: taxonomy.resolvedGenre,
    dimension: effectiveDimension,
    runtimeArchetype: runtimePlan.archetype,
    promptSummary: brief.promptSummary,
    generatedPitch: mechanicsPlan.generatedPitch,
    mapArchetype: worldPlan.mapArchetype,
    promptSignals: taxonomy.promptSignals,
    resolvedFeatures: taxonomy.resolvedFeatures,
    negativeConstraints: brief.negativeConstraints,
    scopeScale: brief.scopeScale,
    references,
    knowledgeCoverage,
  })
  const diversityPlan = planGenerationDiversity({
    promptSummary: brief.promptSummary,
    genre: taxonomy.resolvedGenre,
    dimension: effectiveDimension,
    runtimeArchetype: runtimePlan.archetype,
    mapArchetype: worldPlan.mapArchetype,
    promptSignals: taxonomy.promptSignals,
    resolvedFeatures: taxonomy.resolvedFeatures,
    negativeConstraints: brief.negativeConstraints,
    references,
    candidatePlan,
  })
  const evaluationPlan = planGenerationEvaluation({
    genre: taxonomy.resolvedGenre,
    dimension: effectiveDimension,
    runtimeArchetype: runtimePlan.archetype,
    prompt: prompt,
    promptSignals: taxonomy.promptSignals,
    candidatePlan,
    diversityPlan,
  })

  const complementarySystems = unique([
    ...scopePlan.supplementalSystems.map((system) => system.displayName),
    ...brief.experienceGoals,
    ...(taxonomy.resolvedFeatures.includes("world_gen") ? ["Checkpoint and reward cadence"] : []),
    ...(taxonomy.resolvedFeatures.includes("combat") ? ["Threat budgeting"] : []),
    ...(brief.multiplayer
      ? [`${Math.max(1, brief.maxPlayers)}-player session choreography`]
      : ["Solo fail-retry tuning"]),
    ...mechanicsPlan.contentPillars,
    ...mechanicsPlan.systemPriorities,
    ...runtimePlan.playFocus,
    ...runtimeVersatilityPlan.activeModules,
    ...runtimeVersatilityPlan.primaryVerbs.map((verb) => `${titleCase(verb)} runtime beats`),
    ...graphicsPlan.frameBudgetPriorities,
    ...enginePlan.criticalSubsystems,
    ...pipelinePlan.methodology,
    ...promptCouncilPlan.promptTiers.map((tier) => tier.name),
    ...candidatePlan.candidates.map((candidate) => candidate.title),
    ...evaluationPlan.rubrics.map((rubric) => rubric.label),
    ...diversityPlan.retrievalExamples.map((reference) => reference.title),
    ...assetPlan.specialistTracks,
    ...assetPlan.integrationContracts.map((contract) => contract.focus),
    ...assetPlan.productionPhases.map((phase) => phase.name),
    ...assetPlan.generationToolchains.map((toolchain) => toolchain.label),
    "Asset kit reuse",
    "Character and prop readability",
  ])

  return {
    resolvedGenre: taxonomy.resolvedGenre,
    genreConfidence: brief.genreConfidence,
    genreReason: brief.genreReason,
    resolvedSystems: taxonomy.resolvedSystems,
    resolvedModes: taxonomy.resolvedModes,
    promptSummary: brief.promptSummary,
    generatedPitch: mechanicsPlan.generatedPitch,
    playerFantasy: mechanicsPlan.playerFantasy,
    sessionFantasy: mechanicsPlan.sessionFantasy,
    interactionModel: mechanicsPlan.interactionModel,
    experienceGoals: brief.experienceGoals,
    contentPillars: mechanicsPlan.contentPillars,
    progressionArcs: mechanicsPlan.progressionArcs,
    environmentThemes: worldPlan.environmentThemes,
    uiSurfaces: mechanicsPlan.uiSurfaces,
    systemPriorities: mechanicsPlan.systemPriorities,
    negativeConstraints: brief.negativeConstraints,
    scopeScale: effectiveScopeScale,
    resolvedMultiplayer: brief.multiplayer,
    resolvedMaxPlayers: brief.maxPlayers,
    networkTopology,
    tickRate,
    seed,
    dimension: effectiveDimension,
    cameraStyle: planningOverrides?.cameraStyle ?? worldPlan.cameraStyle,
    worldStructure: worldPlan.worldStructure,
    mapArchetype: worldPlan.mapArchetype,
    mapOverview: worldPlan.mapOverview,
    nonOverlapStrategy: worldPlan.nonOverlapStrategy,
    traversalModel: worldPlan.traversalModel,
    layoutRules: worldPlan.layoutRules,
    promptSignals: taxonomy.promptSignals,
    gameplayLoopSummary: mechanicsPlan.gameplayLoopSummary,
    coreLoop: mechanicsPlan.coreLoop,
    secondaryLoop: mechanicsPlan.secondaryLoop,
    progressionLoop: mechanicsPlan.progressionLoop,
    failStates: mechanicsPlan.failStates,
    levelSequence: mechanicsPlan.levelSequence,
    autoIncludedFeatures: taxonomy.autoIncludedFeatures,
    resolvedFeatures: taxonomy.resolvedFeatures,
    supplementalSystems: scopePlan.supplementalSystems,
    complementarySystems,
    knowledgeDomains: unique([
      ...worldPlan.knowledgeDomains,
      ...taxonomy.resolvedFeatures.map((feature) => `${titleCase(feature)} integration`),
      ...GENRE_TEMPLATES[taxonomy.resolvedGenre].features.map((feature) => `${titleCase(feature)} patterns`),
      ...brief.experienceGoals,
      ...mechanicsPlan.contentPillars,
      ...worldPlan.environmentThemes,
      ...mechanicsPlan.systemPriorities,
      ...runtimePlan.playFocus,
      ...runtimePlan.uiFocus,
      ...runtimePlan.contentStrategy,
      ...runtimeVersatilityPlan.activeModules,
      ...runtimeVersatilityPlan.pressureTracks.map((track) => `${track} tracking`),
      ...runtimeVersatilityPlan.uiCallouts.map((callout) => `${callout} readability`),
      ...graphicsPlan.frameBudgetPriorities,
      ...graphicsPlan.lowSpecFallbacks,
      ...enginePlan.criticalSubsystems,
      ...enginePlan.scalingStrategy,
      ...pipelinePlan.parallelTracks,
      ...pipelinePlan.qualityGates,
      ...promptCouncilPlan.agents.flatMap((agent) => agent.challengeFocus),
      ...evaluationPlan.datasetBuckets.map((bucket) => bucket.label),
      ...evaluationPlan.rubrics.map((rubric) => rubric.guidance),
      ...diversityPlan.antiCollapseChecks,
      ...diversityPlan.overusedPatternRisks,
      ...diversityPlan.retrievalExamples.flatMap((reference) => reference.mechanicsToBorrow),
      ...assetPlan.specialistTracks,
      ...assetPlan.qualityGates,
      ...assetPlan.reuseDirectives,
      ...assetPlan.stateModelRules,
      ...assetPlan.spawnRules,
      ...assetPlan.integrationContracts.flatMap((contract) => contract.rules),
      ...assetPlan.productionPhases.flatMap((phase) => phase.deliverables),
      ...assetPlan.materialPalette.map((material) => `${material} material language`),
      ...assetPlan.generationToolchains.map((toolchain) => `${toolchain.label} workflow`),
      ...assetPlan.generationToolchains.flatMap((toolchain) => toolchain.verificationChecks),
      ...assetPlan.sourceInspirations.map((source) => `${source.name} integration patterns`),
    ]),
    runtimePlan,
    runtimeVersatilityPlan,
    graphicsPlan,
    enginePlan,
    pipelinePlan,
    promptCouncilPlan,
    candidatePlan,
    evaluationPlan,
    diversityPlan,
    assetPlan,
  }
}

export async function generateGenerationProfile(input: {
  prompt: string
  genre: Genre
  selectedFeatures: string[]
  multiplayer: boolean
  maxPlayers: number
  seed?: string
  networkTopology?: NetworkTopology
  tickRate?: number
  evolutionContext?: GenerationEvolutionContext
  usageIntelligence?: GenerationUsageIntelligence
  aiSettings?: UserAiSettings | null
  telemetry?: PromptTelemetryHook
}): Promise<GeneratedProfileResult> {
  const selectedFeatures = normalizeSelectedFeatures(input.selectedFeatures)
  const usageIntelligence = input.usageIntelligence ?? buildGenerationUsageIntelligence({
    prompt: input.prompt,
    genre: input.genre,
    selectedFeatures,
    selectedProvider: input.aiSettings?.defaultProvider !== "local" ? input.aiSettings?.defaultProvider : undefined,
    selectedModel: input.aiSettings?.defaultProvider && input.aiSettings.defaultProvider !== "local"
      ? input.aiSettings.models[input.aiSettings.defaultProvider]
      : undefined,
    currentUserProjects: [],
    allProjects: [],
  })
  const knowledgeCoverage = buildGenerationKnowledgeCoverage({
    prompt: input.prompt,
    genre: input.genre,
    selectedFeatures,
    multiplayer: input.multiplayer,
    seed: input.seed,
  })
  const providerRoster = getConfiguredUserProviderRoster(input.aiSettings)

  if (!providerRoster) {
    return buildLocalGeneratedProfileResult({
      prompt: input.prompt,
      genre: input.genre,
      selectedFeatures,
      multiplayer: input.multiplayer,
      maxPlayers: input.maxPlayers,
      seed: input.seed,
      networkTopology: input.networkTopology,
      tickRate: input.tickRate,
      evolutionContext: input.evolutionContext,
      usageIntelligence,
    })
  }

  return runProviderLoopGeneration({
    prompt: input.prompt,
    genre: input.genre,
    selectedFeatures,
    multiplayer: input.multiplayer,
    maxPlayers: input.maxPlayers,
    seed: input.seed,
    networkTopology: input.networkTopology,
    tickRate: input.tickRate,
    evolutionContext: input.evolutionContext,
    knowledgeCoverage,
    usageIntelligence,
    providerRoster,
    telemetry: input.telemetry,
  })
}

function summarizeLoopProfile(
  profile: GenerationIntelligenceProfile,
  encounterDirector?: RuntimeEncounterDirector,
) {
  return {
    resolvedGenre: profile.resolvedGenre,
    dimension: profile.dimension,
    cameraStyle: profile.cameraStyle,
    scopeScale: profile.scopeScale,
    runtimePlan: {
      archetype: profile.runtimePlan.archetype,
      label: profile.runtimePlan.label,
      reason: profile.runtimePlan.reason,
    },
    runtimeVersatilityPlan: {
      flavorLabel: profile.runtimeVersatilityPlan.flavorLabel,
      activeModules: profile.runtimeVersatilityPlan.activeModules,
      objectiveHooks: profile.runtimeVersatilityPlan.objectiveHooks,
      eventCues: profile.runtimeVersatilityPlan.eventCues,
    },
    runtimeEncounterDirector: encounterDirector
      ? summarizeRuntimeEncounterDirector(encounterDirector)
      : undefined,
    resolvedFeatures: profile.resolvedFeatures,
    promptSummary: profile.promptSummary,
    generatedPitch: profile.generatedPitch,
    graphicsPlan: {
      renderPath: profile.graphicsPlan.renderPath,
      runtimePresentation: profile.graphicsPlan.runtimePresentation,
    },
    enginePlan: {
      recommendedEngine: profile.enginePlan.recommendedEngine,
      criticalSubsystems: profile.enginePlan.criticalSubsystems,
    },
    assetPlan: {
      productionStyle: profile.assetPlan.productionStyle,
      specialistTracks: profile.assetPlan.specialistTracks,
      generationToolchains: profile.assetPlan.generationToolchains.map((toolchain) => toolchain.label),
    },
  }
}

function buildLocalGeneratedProfileResult(input: {
  prompt: string
  genre: Genre
  selectedFeatures: string[]
  multiplayer: boolean
  maxPlayers: number
  seed?: string
  networkTopology?: NetworkTopology
  tickRate?: number
  evolutionContext?: GenerationEvolutionContext
  usageIntelligence?: GenerationUsageIntelligence
}): GeneratedProfileResult {
  const isRandomized = !input.prompt || input.prompt.length < 10
  const randomSuffix = isRandomized ? ` (Seed: ${Math.random().toString(36).substring(7)})` : ""
  const randomizedPrompt = isRandomized
    ? `A highly unique ${input.genre} game with randomized modifiers: ${["cyberpunk", "fantasy", "sci-fi", "steampunk", "lovecraftian", "post-apocalyptic", "neon-noir", "gothic", "solarpunk"][Math.floor(Math.random() * 9)]} setting, ${["fast-paced", "methodical", "chaotic", "strategic", "stealthy"][Math.floor(Math.random() * 5)]} pacing, and ${["roguelike", "narrative-driven", "sandbox", "survival", "competitive"][Math.floor(Math.random() * 5)]} mechanics.${randomSuffix}`
    : input.prompt

  const profile = buildGenerationProfile({
    genre: input.genre,
    selectedFeatures: input.selectedFeatures,
    multiplayer: input.multiplayer,
    maxPlayers: input.maxPlayers,
    seed: input.seed,
    networkTopology: input.networkTopology,
    tickRate: input.tickRate,
    prompt: randomizedPrompt,
  })

  // Mutate profile heavily with procedural variables to guarantee uniqueness
  if (isRandomized) {
    const cameraAngles = ["First-Person Tactical", "Third-Person Over-the-Shoulder", "Isometric Strategy", "Top-Down Action", "Dynamic Follow Camera"]
    profile.cameraStyle = cameraAngles[Math.floor(Math.random() * cameraAngles.length)]
    
    const uiThemes = ["Minimalist Diegetic HUD", "Neon Cyberpunk Interface", "Parchment and Ink Menus", "Tactical Holographic Overlays"]
    profile.uiSurfaces = [uiThemes[Math.floor(Math.random() * uiThemes.length)], ...profile.uiSurfaces.slice(1)]
    
    profile.generatedPitch = `[PROCEDURAL VARIANT] ${profile.generatedPitch}`
  }

  const audit = buildLocalFidelityAudit({
    prompt: randomizedPrompt,
    profile,
  })
  const knowledgeCoverage = buildGenerationKnowledgeCoverage({
    prompt: randomizedPrompt,
    genre: profile.resolvedGenre,
    selectedFeatures: profile.resolvedFeatures,
    dimension: profile.dimension,
    multiplayer: profile.resolvedMultiplayer,
    seed: profile.seed,
  })
  const knowledgeRisk = buildKnowledgeRiskSummaryForProfile({
    profile,
    knowledgeCoverage,
  })
  const releaseJudgement = buildLocalReleaseJudgement({
    profile,
    audit,
    knowledgeRisk,
  })
  const localManifestStage = buildLoopStage({
    id: "manifest_lock",
    provider: "local",
    attempt: 1,
    inputHash: "local_manifest",
    outputSummary: profile.generatedPitch,
    verification: releaseJudgement.decision === "blocked" ? "fail" : releaseJudgement.decision === "needs_review" ? "warning" : "pass",
    cacheStrategy: "Local heuristic manifest synthesis; no provider-side prompt cache applies.",
    routingStrategy: "Local heuristic routing.",
  })
  const loopReport: GenerationLoopReport = {
    budgetMinutes: 90,
    mode: "quality-first",
    roster: {
      mode: "local_only",
      assignments: [],
      availableProviders: [],
    },
    attempts: [
      {
        attempt: 1,
        stages: [
          localManifestStage,
        ],
        blockedReasons: audit.blockedReasons,
        repaired: false,
      },
    ],
    promptPackets: [
      buildPromptPacket({
        stageId: "manifest_lock",
        provider: "local",
        hash: "local_manifest",
        summary: "Local heuristic generation packet.",
        includes: buildPacketIncludes(["Original prompt", "Designer directives", "Heuristic profile synthesis"], {
          evolutionContext: input.evolutionContext,
          knowledgeCoverage,
          knowledgeRisk,
          usageIntelligence: input.usageIntelligence,
        }),
      }),
    ],
    missingCriteria: audit.missingCriteria,
    preparationDiff: [],
    candidateRuns: [],
    providerFailures: [],
    fallbackProvidersUsed: [],
    compileGateSummary: `Compile preflight and repair checks will run after workspace generation.${input.usageIntelligence?.compilePressure?.[0] ? ` ${input.usageIntelligence.compilePressure[0]}` : ""}`,
    releaseJudgement,
    operationalAnalytics: buildOperationalAnalytics({
      loopStages: [localManifestStage],
      providerFailures: [],
      fallbackProvidersUsed: [],
    }),
  }

  return {
    profile,
    llmConfiguration: buildGenerationPromptConfiguration({
      provider: "local",
      source: "local",
      budgetMinutes: 90,
      providerRoster: loopReport.roster,
      loopCount: 1,
      fallbackProvidersUsed: [],
      releaseStatus: releaseJudgement.decision,
      loopReport,
      promptPackets: loopReport.promptPackets,
      releaseJudgement,
      preparationDiff: [],
      candidateRuns: [],
      providerFailures: [],
      evolutionContext: input.evolutionContext,
      operationalAnalytics: loopReport.operationalAnalytics,
      knowledgeCoverage,
      knowledgeRisk,
      usageIntelligence: input.usageIntelligence,
    }),
    loopReport,
    preparationDiff: [],
    candidateRuns: [],
    providerFailures: [],
    releaseJudgement,
    knowledgeCoverage,
    knowledgeRisk,
    usageIntelligence: input.usageIntelligence,
  }
}

async function runProviderLoopGeneration(input: {
  prompt: string
  genre: Genre
  selectedFeatures: string[]
  multiplayer: boolean
  maxPlayers: number
  seed?: string
  networkTopology?: NetworkTopology
  tickRate?: number
  evolutionContext?: GenerationEvolutionContext
  knowledgeCoverage?: GenerationKnowledgeCoverage
  usageIntelligence?: GenerationUsageIntelligence
  providerRoster: NonNullable<ReturnType<typeof getConfiguredUserProviderRoster>>
  telemetry?: PromptTelemetryHook
}): Promise<GeneratedProfileResult> {
  const configuredProvider = input.providerRoster.primary
  const providerById = new Map<Exclude<PromptProviderId, "local">, ConfiguredUserProvider>([
    [configuredProvider.provider, configuredProvider],
    ...input.providerRoster.supportProviders.map((provider) => [provider.provider, provider] as const),
  ])
  const providerStages: Array<ReturnType<typeof buildProviderStageConfiguration>> = []
  const promptPackets: GenerationPromptPacket[] = []
  const loopStages: GenerationLoopStage[] = []
  const providerFailures: GenerationProviderFailure[] = []
  const fallbackProvidersUsed = new Set<PromptProviderId>()
  const initialKnowledgeRisk = buildGenerationKnowledgeRiskSummary({
    coverage: input.knowledgeCoverage,
  })

  const buildStageCandidates = (role: ProviderLoopAssignment["role"]) => {
    const preferred = getLoopAssignment(input.providerRoster.roster, role, configuredProvider)
    const orderedProviderIds = orderProviderIdsByUsageIntelligence({
      providerIds: [
        configuredProvider.provider,
        ...input.providerRoster.supportProviders.map((provider) => provider.provider),
      ].filter((providerId, index, values) => values.indexOf(providerId) === index),
      usageIntelligence: input.usageIntelligence,
    })

    return unique([
      preferred.provider,
      ...orderedProviderIds,
    ])
      .map((providerId) => {
        const configured = providerById.get(providerId as Exclude<PromptProviderId, "local">)
        if (!configured) return null
        const assignment = input.providerRoster.roster.assignments.find(
          (entry) => entry.role === role && entry.provider === configured.provider,
        ) ?? {
          role,
          provider: configured.provider,
          model: configured.model,
          source: configured.provider === configuredProvider.provider ? "selected" : "support",
          notes: `Fallback ${role.replace(/_/g, " ")} provider.`,
        }

        return {
          assignment,
          configuredProvider: configured,
        }
      })
      .filter((entry): entry is {
        assignment: ProviderLoopAssignment
        configuredProvider: ConfiguredUserProvider
      } => entry !== null)
  }

  const briefCompletionRecord = await runProviderStageWithFallback<GenerationPreparation>({
    prompt: GENERATION_BRIEF_ENHANCEMENT_PROMPT,
    loopStageId: "brief_completion",
    candidates: buildStageCandidates("author"),
    verifier: createZodJsonVerifier(generationPreparationSchema),
    messagesFactory: () => [
      {
        role: "system",
        content: [
          "You are a senior game-brief expansion specialist.",
          "Use the creator's prompt and current settings to expand the brief before generation.",
          "Preserve explicit constraints like 3D, no combat, camera preference, multiplayer limits, genre blend, and named mechanics.",
          "You may fill in missing detail only when it strengthens the requested fantasy instead of replacing it.",
          "Return only valid JSON with no markdown fences or commentary.",
        ].join("\n"),
      },
      {
        role: "user",
        sections: [
          {
            id: "original-brief",
            content: `Original prompt:\n${input.prompt.trim()}`,
          },
          {
            id: "current-settings",
            content: [
              `Genre hint: ${input.genre}`,
              `Selected features: ${input.selectedFeatures.join(", ") || "none"}`,
              `Multiplayer requested: ${input.multiplayer ? "yes" : "no"}`,
              `Max players requested: ${input.maxPlayers}`,
            ].join("\n"),
          },
          ...buildAdvisoryPromptSections({
            evolutionContext: input.evolutionContext,
            knowledgeCoverage: input.knowledgeCoverage,
            knowledgeRisk: initialKnowledgeRisk,
            usageIntelligence: input.usageIntelligence,
          }),
          {
            id: "task",
            content: [
              "Rewrite the brief into a richer generation prompt that preserves the user's intent and makes runtime-critical expectations explicit before planning begins.",
              "Fill in missing design detail only when it is strongly implied by the prompt or current settings.",
              "Use the evolution context as additive pressure, not as permission to overwrite explicit prompt constraints.",
              "Add compile priorities that make the generated build easier to verify before presentation.",
            ].join("\n"),
          },
          {
            id: "output-contract",
            content: [
              "Return a JSON object with these keys:",
              "enhancedUserPrompt, enhancedPrompt, resolvedGenre, resolvedMultiplayer, resolvedMaxPlayers, requiredFeatures, disallowedFeatures, intentNotes, compilePriorities.",
              `Use requiredFeatures and disallowedFeatures only from: ${GENERATION_FEATURE_LIBRARY.join(", ")}.`,
              "Make enhancedUserPrompt safe to place back into the creator text box without duplicating settings directives.",
              "Make enhancedPrompt concrete, prompt-faithful, and ready to feed directly into the next generation stage.",
            ].join("\n"),
          },
        ],
      },
    ],
    metadata: {
      suiteId: GENERATION_PROMPT_SUITE.id,
      suiteVersion: GENERATION_PROMPT_SUITE.version,
      selectedFeatures: input.selectedFeatures.join(","),
      multiplayer: String(input.multiplayer),
      stage: "provider_brief_enhancement",
    },
    maxInputTokens: 2800,
    maxOutputTokens: 1400,
    temperature: 0.3,
    telemetry: input.telemetry,
    packetSummary: "Brief completion packet for provider-backed prompt expansion.",
    packetIncludes: buildPacketIncludes(["Original prompt", "Selected features", "Multiplayer settings"], {
      evolutionContext: input.evolutionContext,
      knowledgeCoverage: input.knowledgeCoverage,
      knowledgeRisk: initialKnowledgeRisk,
      usageIntelligence: input.usageIntelligence,
    }),
    successSummary: () => "Provider completed and expanded the prompt before generation.",
  })

  providerStages.push(briefCompletionRecord.providerStage)
  promptPackets.push(briefCompletionRecord.packet)
  loopStages.push(briefCompletionRecord.stage)
  providerFailures.push(...briefCompletionRecord.providerFailures)
  if (briefCompletionRecord.usedFallback) {
    fallbackProvidersUsed.add(briefCompletionRecord.assignment.provider)
  }

  const preparedInput = briefCompletionRecord.run.ok
    ? (() => {
      const preparation = briefCompletionRecord.run.data
      const preparedMultiplayer = preparation.resolvedMultiplayer ?? input.multiplayer
      const preparedFeatures = unique([
        ...input.selectedFeatures,
        ...sanitizeAdvisedFeatures(preparation.requiredFeatures),
      ]).filter((feature) => !sanitizeAdvisedFeatures(preparation.disallowedFeatures).includes(feature))

      return {
        prompt: preparation.enhancedPrompt.trim() || input.prompt,
        displayPrompt: preparation.enhancedUserPrompt.trim() || input.prompt,
        genre: preparation.resolvedGenre ?? input.genre,
        selectedFeatures: preparedFeatures,
        multiplayer: preparedMultiplayer,
        maxPlayers: clampAdvisedPlayers(
          preparedMultiplayer,
          input.maxPlayers,
          preparation.resolvedMaxPlayers,
        ),
        intentNotes: preparation.intentNotes,
        compilePriorities: preparation.compilePriorities,
        preparationDiff: buildPreparationDiff({
          originalPrompt: input.prompt,
          enhancedPrompt: preparation.enhancedPrompt.trim() || input.prompt,
          genre: input.genre,
          nextGenre: preparation.resolvedGenre ?? input.genre,
          multiplayer: input.multiplayer,
          nextMultiplayer: preparedMultiplayer,
          maxPlayers: input.maxPlayers,
          nextMaxPlayers: clampAdvisedPlayers(
            preparedMultiplayer,
            input.maxPlayers,
            preparation.resolvedMaxPlayers,
          ),
          selectedFeatures: input.selectedFeatures,
          nextFeatures: preparedFeatures,
        }),
        missingCriteria: [],
        evolutionContext: input.evolutionContext,
        knowledgeCoverage: input.knowledgeCoverage,
        usageIntelligence: input.usageIntelligence,
        preparationRun: briefCompletionRecord.run,
      } satisfies PreparedGenerationInput
    })()
    : {
      prompt: input.prompt,
      displayPrompt: input.prompt,
      genre: input.genre,
      selectedFeatures: input.selectedFeatures,
      multiplayer: input.multiplayer,
      maxPlayers: input.maxPlayers,
      intentNotes: [],
      compilePriorities: [],
      preparationDiff: [],
      missingCriteria: [],
      evolutionContext: input.evolutionContext,
      knowledgeCoverage: input.knowledgeCoverage,
      usageIntelligence: input.usageIntelligence,
      preparationRun: briefCompletionRecord.run,
    }
  const preparedKnowledgeRisk = buildGenerationKnowledgeRiskSummary({
    coverage: preparedInput.knowledgeCoverage,
  })
  const baseProfile = buildGenerationProfile({
    prompt: preparedInput.prompt,
    genre: preparedInput.genre,
    selectedFeatures: preparedInput.selectedFeatures,
    multiplayer: preparedInput.multiplayer,
    maxPlayers: preparedInput.maxPlayers,
  })
  const baseEncounterContext = buildEncounterDirectorForProfile({
    prompt: preparedInput.prompt,
    profile: baseProfile,
    genre: preparedInput.genre,
    selectedFeatures: preparedInput.selectedFeatures,
    multiplayer: preparedInput.multiplayer,
    maxPlayers: preparedInput.maxPlayers,
  })

  const intentGapRecord = await runProviderStageWithFallback<GenerationIntentGap>({
    prompt: GENERATION_INTENT_GAP_PROMPT,
    loopStageId: "intent_gap_fill",
    candidates: buildStageCandidates("author"),
    verifier: createZodJsonVerifier(generationIntentGapSchema),
    messagesFactory: () => [
      {
        role: "system",
        content: [
          "You are locking missing criteria for a game generation loop.",
          "Preserve explicit user constraints and call out anything still missing or inferred.",
          "Return only valid JSON.",
        ].join("\n"),
      },
      {
        role: "user",
        sections: [
          { id: "brief", content: `Original brief:\n${input.prompt.trim()}` },
          { id: "expanded-brief", content: `Expanded generation brief:\n${preparedInput.prompt.trim()}` },
          {
            id: "selection",
            content: [
              `Genre hint: ${preparedInput.genre}`,
              `Selected features: ${preparedInput.selectedFeatures.join(", ") || "none"}`,
              `Multiplayer: ${preparedInput.multiplayer ? "yes" : "no"}`,
              `Max players: ${preparedInput.maxPlayers}`,
            ].join("\n"),
          },
          ...buildAdvisoryPromptSections({
            evolutionContext: input.evolutionContext,
            knowledgeCoverage: preparedInput.knowledgeCoverage,
            knowledgeRisk: preparedKnowledgeRisk,
            usageIntelligence: preparedInput.usageIntelligence,
            encounterContext: baseEncounterContext,
          }),
          {
            id: "prep-diff",
            content: `Preparation diff:\n${JSON.stringify(preparedInput.preparationDiff, null, 2)}`,
            optional: true,
            trimPriority: 1,
          },
          {
            id: "output-contract",
            content: "Return JSON with summary, missingCriteria, inferenceDiff, antiCollapseRules, engineExpectations, compilePriorities.",
          },
        ],
      },
    ],
    metadata: {
      suiteId: GENERATION_PROMPT_SUITE.id,
      suiteVersion: GENERATION_PROMPT_SUITE.version,
      stage: "intent_gap_fill",
    },
    maxInputTokens: 2600,
    maxOutputTokens: 900,
    temperature: 0.15,
    telemetry: input.telemetry,
    packetSummary: "Intent gap packet for missing criteria and anti-collapse rules.",
    packetIncludes: buildPacketIncludes(["Original prompt", "Expanded brief", "Preparation diff"], {
      evolutionContext: input.evolutionContext,
      knowledgeCoverage: preparedInput.knowledgeCoverage,
      knowledgeRisk: preparedKnowledgeRisk,
      usageIntelligence: preparedInput.usageIntelligence,
      encounterContext: baseEncounterContext,
    }),
    successSummary: (result) => result.summary,
  })

  providerStages.push(intentGapRecord.providerStage)
  promptPackets.push(intentGapRecord.packet)
  loopStages.push(intentGapRecord.stage)
  providerFailures.push(...intentGapRecord.providerFailures)
  if (intentGapRecord.usedFallback) {
    fallbackProvidersUsed.add(intentGapRecord.assignment.provider)
  }

  const intentGap = intentGapRecord.run.ok
    ? intentGapRecord.run.data
    : {
        summary: "Local heuristics supplied the remaining criteria after the intent-gap pass failed.",
        missingCriteria: preparedInput.missingCriteria,
        inferenceDiff: preparedInput.preparationDiff,
        antiCollapseRules: [],
        engineExpectations: [],
        compilePriorities: preparedInput.compilePriorities,
      }
  const preparedPromptForProfile = preparedInput.prompt
  const candidateRecords = await Promise.all([
    runProviderStageWithFallback<GenerationAdvice>({
      prompt: GENERATION_CANDIDATE_MANIFEST_PROMPT,
      loopStageId: "candidate_generation",
      candidates: buildStageCandidates("author"),
      verifier: createZodJsonVerifier(generationAdviceSchema),
      messagesFactory: () => [
        { role: "system", content: "Generate a strict-fidelity candidate manifest that preserves explicit user constraints. Return only valid JSON." },
        {
          role: "user",
          sections: [
            { id: "brief", content: `Original brief:\n${input.prompt.trim()}` },
            { id: "expanded-brief", content: `Expanded generation brief:\n${preparedInput.prompt.trim()}` },
            { id: "gap-fill", content: `Gap analysis:\n${JSON.stringify(intentGap, null, 2)}` },
            { id: "heuristic-profile", content: `Current heuristic profile:\n${JSON.stringify(summarizeLoopProfile(baseProfile, baseEncounterContext), null, 2)}` },
            ...buildAdvisoryPromptSections({
              evolutionContext: input.evolutionContext,
              knowledgeCoverage: preparedInput.knowledgeCoverage,
              knowledgeRisk: preparedKnowledgeRisk,
              usageIntelligence: preparedInput.usageIntelligence,
              encounterContext: baseEncounterContext,
            }),
            {
              id: "output-contract",
              content: [
                "Return a JSON object with these keys:",
                "resolvedGenre, resolvedDimension, resolvedScopeScale, runtimeArchetype, cameraStyle, resolvedMultiplayer, resolvedMaxPlayers, requiredFeatures, disallowedFeatures, promptSummary, generatedPitch, genreReason, playerFantasy, sessionFantasy, interactionModel, experienceGoals, contentPillars, progressionArcs, environmentThemes, uiSurfaces, systemPriorities, negativeConstraints.",
                `Use requiredFeatures and disallowedFeatures only for these systems: ${GENERATION_FEATURE_LIBRARY.join(", ")}.`,
              ].join("\n"),
            },
          ],
        },
      ],
      metadata: { suiteId: GENERATION_PROMPT_SUITE.id, suiteVersion: GENERATION_PROMPT_SUITE.version, stage: "candidate_generation", variant: "strict_fidelity" },
      maxInputTokens: 3400,
      maxOutputTokens: 1400,
      temperature: 0.2,
      telemetry: input.telemetry,
      packetSummary: "Strict-fidelity candidate packet.",
      packetIncludes: buildPacketIncludes(["Original prompt", "Expanded brief", "Gap analysis", "Heuristic profile"], {
        evolutionContext: input.evolutionContext,
        knowledgeCoverage: preparedInput.knowledgeCoverage,
        knowledgeRisk: preparedKnowledgeRisk,
        usageIntelligence: preparedInput.usageIntelligence,
        encounterContext: baseEncounterContext,
      }),
      successSummary: (result) => result.generatedPitch,
    }),
    runProviderStageWithFallback<GenerationAdvice>({
      prompt: GENERATION_CANDIDATE_MANIFEST_PROMPT,
      loopStageId: "candidate_generation",
      candidates: buildStageCandidates("author"),
      verifier: createZodJsonVerifier(generationAdviceSchema),
      messagesFactory: () => [
        { role: "system", content: "Generate a bolder but faithful candidate manifest. Do not break explicit prompt constraints. Return only valid JSON." },
        {
          role: "user",
          sections: [
            { id: "brief", content: `Original brief:\n${input.prompt.trim()}` },
            { id: "expanded-brief", content: `Expanded generation brief:\n${preparedInput.prompt.trim()}` },
            { id: "gap-fill", content: `Gap analysis:\n${JSON.stringify(intentGap, null, 2)}` },
            { id: "heuristic-profile", content: `Current heuristic profile:\n${JSON.stringify(summarizeLoopProfile(baseProfile, baseEncounterContext), null, 2)}` },
            ...buildAdvisoryPromptSections({
              evolutionContext: input.evolutionContext,
              knowledgeCoverage: preparedInput.knowledgeCoverage,
              knowledgeRisk: preparedKnowledgeRisk,
              usageIntelligence: preparedInput.usageIntelligence,
              encounterContext: baseEncounterContext,
            }),
            {
              id: "output-contract",
              content: [
                "Return a JSON object with these keys:",
                "resolvedGenre, resolvedDimension, resolvedScopeScale, runtimeArchetype, cameraStyle, resolvedMultiplayer, resolvedMaxPlayers, requiredFeatures, disallowedFeatures, promptSummary, generatedPitch, genreReason, playerFantasy, sessionFantasy, interactionModel, experienceGoals, contentPillars, progressionArcs, environmentThemes, uiSurfaces, systemPriorities, negativeConstraints.",
                `Use requiredFeatures and disallowedFeatures only for these systems: ${GENERATION_FEATURE_LIBRARY.join(", ")}.`,
              ].join("\n"),
            },
          ],
        },
      ],
      metadata: { suiteId: GENERATION_PROMPT_SUITE.id, suiteVersion: GENERATION_PROMPT_SUITE.version, stage: "candidate_generation", variant: "bold_but_faithful" },
      maxInputTokens: 3400,
      maxOutputTokens: 1400,
      temperature: 0.35,
      telemetry: input.telemetry,
      packetSummary: "Bold-but-faithful candidate packet.",
      packetIncludes: buildPacketIncludes(["Original prompt", "Expanded brief", "Gap analysis", "Heuristic profile"], {
        evolutionContext: input.evolutionContext,
        knowledgeCoverage: preparedInput.knowledgeCoverage,
        knowledgeRisk: preparedKnowledgeRisk,
        usageIntelligence: preparedInput.usageIntelligence,
        encounterContext: baseEncounterContext,
      }),
      successSummary: (result) => result.generatedPitch,
    }),
  ])
  const candidateRuns: GenerationLoopCandidateRun[] = []
  const candidateProfiles = candidateRecords
    .map((record, index) => {
      providerStages.push(record.providerStage)
      promptPackets.push(record.packet)
      loopStages.push(record.stage)
      providerFailures.push(...record.providerFailures)
      if (record.usedFallback) {
        fallbackProvidersUsed.add(record.assignment.provider)
      }
      if (!record.run.ok) return null
      const built = buildProfileFromAdvice({
        prompt: preparedPromptForProfile,
        baseProfile,
        selectedFeatures: preparedInput.selectedFeatures,
        genre: preparedInput.genre,
        multiplayer: preparedInput.multiplayer,
        maxPlayers: preparedInput.maxPlayers,
        advice: record.run.data,
      })
      const audit = buildLocalFidelityAudit({ prompt: input.prompt, profile: built.profile })
      candidateRuns.push({
        id: `candidate_${index + 1}`,
        label: index === 0 ? "Strict Fidelity Candidate" : "Bold Candidate",
        provider: record.assignment.provider,
        model: record.assignment.model,
        summary: built.profile.generatedPitch,
        score: audit.score,
        passed: audit.blockedReasons.length === 0,
        blockedReasons: audit.blockedReasons,
        profileSnapshot: {
          resolvedGenre: built.profile.resolvedGenre,
          dimension: built.profile.dimension,
          runtimeArchetype: built.profile.runtimePlan.archetype,
          cameraStyle: built.profile.cameraStyle,
        },
      })
      return { id: `candidate_${index + 1}`, profile: built.profile, audit }
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
  const chosenCandidate = [...candidateProfiles].sort((left, right) => right.audit.score - left.audit.score)[0] ?? {
    id: "heuristic_fallback",
    profile: baseProfile,
    audit: buildLocalFidelityAudit({ prompt: input.prompt, profile: baseProfile }),
  }
  const chosenEncounterContext = buildEncounterDirectorForProfile({
    prompt: preparedPromptForProfile,
    profile: chosenCandidate.profile,
    genre: preparedInput.genre,
    selectedFeatures: preparedInput.selectedFeatures,
    multiplayer: preparedInput.multiplayer,
    maxPlayers: preparedInput.maxPlayers,
  })
  const critiqueKnowledgeRisk = buildKnowledgeRiskSummaryForProfile({
    profile: chosenCandidate.profile,
    knowledgeCoverage: preparedInput.knowledgeCoverage,
  })

  const critiqueRecord = await runProviderStageWithFallback<GenerationCandidateCritique>({
    prompt: GENERATION_CANDIDATE_CRITIC_PROMPT,
    loopStageId: "candidate_critique",
    candidates: buildStageCandidates("critic"),
    verifier: createZodJsonVerifier(generationCandidateCritiqueSchema),
    messagesFactory: () => [
      { role: "system", content: "Critique the chosen candidate. Block prompt collapse and explicit intent drift. Return only valid JSON." },
      {
        role: "user",
        sections: [
          { id: "brief", content: `Original brief:\n${input.prompt.trim()}` },
          { id: "candidate", content: `Chosen candidate profile:\n${JSON.stringify(summarizeLoopProfile(chosenCandidate.profile, chosenEncounterContext), null, 2)}` },
          { id: "local-audit", content: `Local fidelity audit:\n${JSON.stringify(chosenCandidate.audit, null, 2)}` },
          ...buildAdvisoryPromptSections({
            evolutionContext: input.evolutionContext,
            knowledgeCoverage: preparedInput.knowledgeCoverage,
            knowledgeRisk: critiqueKnowledgeRisk,
            usageIntelligence: preparedInput.usageIntelligence,
            encounterContext: chosenEncounterContext,
          }),
          { id: "output-contract", content: "Return JSON with decision, summary, blockedReasons, warnings, missingCriteria, inferenceDiff, repairInstructions." },
        ],
      },
    ],
    metadata: { suiteId: GENERATION_PROMPT_SUITE.id, suiteVersion: GENERATION_PROMPT_SUITE.version, stage: "candidate_critique" },
    maxInputTokens: 2800,
    maxOutputTokens: 900,
    temperature: 0.1,
    telemetry: input.telemetry,
    packetSummary: "Candidate critique packet.",
    packetIncludes: buildPacketIncludes(["Original prompt", "Chosen candidate", "Local fidelity audit"], {
      evolutionContext: input.evolutionContext,
      knowledgeCoverage: preparedInput.knowledgeCoverage,
      knowledgeRisk: critiqueKnowledgeRisk,
      usageIntelligence: preparedInput.usageIntelligence,
      encounterContext: chosenEncounterContext,
    }),
    successSummary: (result) => result.summary,
  })
  providerStages.push(critiqueRecord.providerStage)
  promptPackets.push(critiqueRecord.packet)
  loopStages.push(critiqueRecord.stage)
  providerFailures.push(...critiqueRecord.providerFailures)
  if (critiqueRecord.usedFallback) fallbackProvidersUsed.add(critiqueRecord.assignment.provider)
  const critique = applyKnowledgePressureToCritique({
    critique: critiqueRecord.run.ok
      ? critiqueRecord.run.data
      : { decision: chosenCandidate.audit.blockedReasons.length > 0 ? "blocked" : "repair", summary: "Local fidelity audit supplied the critique fallback.", blockedReasons: chosenCandidate.audit.blockedReasons, warnings: chosenCandidate.audit.warnings, missingCriteria: chosenCandidate.audit.missingCriteria, inferenceDiff: intentGap.inferenceDiff, repairInstructions: ["Reassert explicit dimension, camera, and runtime requirements."] },
    knowledgeRisk: critiqueKnowledgeRisk,
  })

  let workingProfile = chosenCandidate.profile
  let repaired = false
  if (critique.decision !== "pass") {
    const repairRecord = await runProviderStageWithFallback<GenerationRepair>({
      prompt: GENERATION_CANDIDATE_REPAIR_PROMPT,
      loopStageId: "candidate_repair",
      candidates: buildStageCandidates("repair"),
      verifier: createZodJsonVerifier(generationRepairSchema),
      messagesFactory: () => [
        { role: "system", content: "Repair the chosen candidate without violating explicit prompt constraints. Return only valid JSON." },
        {
          role: "user",
          sections: [
            { id: "brief", content: `Original brief:\n${input.prompt.trim()}` },
            { id: "candidate", content: `Chosen candidate profile:\n${JSON.stringify(summarizeLoopProfile(chosenCandidate.profile, chosenEncounterContext), null, 2)}` },
            { id: "critique", content: `Critique:\n${JSON.stringify(critique, null, 2)}` },
            ...buildAdvisoryPromptSections({
              evolutionContext: input.evolutionContext,
              knowledgeCoverage: preparedInput.knowledgeCoverage,
              knowledgeRisk: critiqueKnowledgeRisk,
              usageIntelligence: preparedInput.usageIntelligence,
              encounterContext: chosenEncounterContext,
            }),
            { id: "output-contract", content: "Return the final repaired manifest JSON plus repairSummary." },
          ],
        },
      ],
      metadata: { suiteId: GENERATION_PROMPT_SUITE.id, suiteVersion: GENERATION_PROMPT_SUITE.version, stage: "candidate_repair" },
      maxInputTokens: 3000,
      maxOutputTokens: 1400,
      temperature: 0.2,
      telemetry: input.telemetry,
      repairReason: critique.summary,
      packetSummary: "Candidate repair packet.",
      packetIncludes: buildPacketIncludes(["Original prompt", "Chosen candidate", "Critique"], {
        evolutionContext: input.evolutionContext,
        knowledgeCoverage: preparedInput.knowledgeCoverage,
        knowledgeRisk: critiqueKnowledgeRisk,
        usageIntelligence: preparedInput.usageIntelligence,
        encounterContext: chosenEncounterContext,
      }),
      successSummary: (result) => result.repairSummary,
    })
    providerStages.push(repairRecord.providerStage)
    promptPackets.push(repairRecord.packet)
    loopStages.push(repairRecord.stage)
    providerFailures.push(...repairRecord.providerFailures)
    if (repairRecord.usedFallback) fallbackProvidersUsed.add(repairRecord.assignment.provider)
    if (repairRecord.run.ok) {
      repaired = true
      workingProfile = buildProfileFromAdvice({
        prompt: preparedPromptForProfile,
        baseProfile: workingProfile,
        selectedFeatures: preparedInput.selectedFeatures,
        genre: preparedInput.genre,
        multiplayer: preparedInput.multiplayer,
        maxPlayers: preparedInput.maxPlayers,
        advice: repairRecord.run.data,
      }).profile
    }
  }
  const workingKnowledgeRisk = buildKnowledgeRiskSummaryForProfile({
    profile: workingProfile,
    knowledgeCoverage: preparedInput.knowledgeCoverage,
  })
  const workingEncounterContext = buildEncounterDirectorForProfile({
    prompt: preparedPromptForProfile,
    profile: workingProfile,
    genre: preparedInput.genre,
    selectedFeatures: preparedInput.selectedFeatures,
    multiplayer: preparedInput.multiplayer,
    maxPlayers: preparedInput.maxPlayers,
  })

  const promptRunRecord = await runProviderStageWithFallback<GenerationAdvice>({
    prompt: GENERATION_PROFILE_ADVICE_PROMPT,
    loopStageId: "manifest_lock",
    candidates: buildStageCandidates("author"),
    verifier: createZodJsonVerifier(generationAdviceSchema),
    messagesFactory: () => [
      { role: "system", content: "Lock the final generation manifest while preserving prompt fidelity. Return only valid JSON." },
      {
        role: "user",
        sections: [
          { id: "brief", content: `Original brief:\n${input.prompt.trim()}` },
          { id: "expanded-brief", content: `Expanded generation brief:\n${preparedInput.prompt.trim()}` },
          { id: "gap-fill", content: `Gap analysis:\n${JSON.stringify(intentGap, null, 2)}` },
          { id: "working-profile", content: `Working profile:\n${JSON.stringify(summarizeLoopProfile(workingProfile, workingEncounterContext), null, 2)}` },
          { id: "critique", content: `Critique:\n${JSON.stringify(critique, null, 2)}` },
          ...buildAdvisoryPromptSections({
            evolutionContext: input.evolutionContext,
            knowledgeCoverage: preparedInput.knowledgeCoverage,
            knowledgeRisk: workingKnowledgeRisk,
            usageIntelligence: preparedInput.usageIntelligence,
            encounterContext: workingEncounterContext,
          }),
          {
            id: "intent-notes",
            content: [
              `Intent notes: ${preparedInput.intentNotes.join(" | ") || "none"}`,
              `Compile priorities: ${[...preparedInput.compilePriorities, ...intentGap.compilePriorities].join(" | ") || "none"}`,
            ].join("\n"),
            optional: true,
            trimPriority: 1,
          },
          {
            id: "output-contract",
            content: [
              "Return a JSON object with these keys:",
              "resolvedGenre, resolvedDimension, resolvedScopeScale, runtimeArchetype, cameraStyle, resolvedMultiplayer, resolvedMaxPlayers, requiredFeatures, disallowedFeatures, promptSummary, generatedPitch, genreReason, playerFantasy, sessionFantasy, interactionModel, experienceGoals, contentPillars, progressionArcs, environmentThemes, uiSurfaces, systemPriorities, negativeConstraints.",
              `Use requiredFeatures and disallowedFeatures only for these systems: ${GENERATION_FEATURE_LIBRARY.join(", ")}.`,
            ].join("\n"),
          },
        ],
      },
    ],
    metadata: { suiteId: GENERATION_PROMPT_SUITE.id, suiteVersion: GENERATION_PROMPT_SUITE.version, stage: "provider_refinement" },
    maxInputTokens: 3600,
    maxOutputTokens: 1500,
    temperature: 0.2,
    telemetry: input.telemetry,
    packetSummary: "Manifest lock packet.",
    packetIncludes: buildPacketIncludes(["Original prompt", "Expanded brief", "Gap analysis", "Working profile", "Critique"], {
      evolutionContext: input.evolutionContext,
      knowledgeCoverage: preparedInput.knowledgeCoverage,
      knowledgeRisk: workingKnowledgeRisk,
      usageIntelligence: preparedInput.usageIntelligence,
      encounterContext: workingEncounterContext,
    }),
    successSummary: (result) => result.generatedPitch,
  })
  providerStages.push(promptRunRecord.providerStage)
  promptPackets.push(promptRunRecord.packet)
  loopStages.push(promptRunRecord.stage)
  providerFailures.push(...promptRunRecord.providerFailures)
  if (promptRunRecord.usedFallback) fallbackProvidersUsed.add(promptRunRecord.assignment.provider)

  let finalProfile = workingProfile
  if (promptRunRecord.run.ok) {
    finalProfile = buildProfileFromAdvice({
      prompt: preparedPromptForProfile,
      baseProfile: workingProfile,
      selectedFeatures: preparedInput.selectedFeatures,
      genre: preparedInput.genre,
      multiplayer: preparedInput.multiplayer,
      maxPlayers: preparedInput.maxPlayers,
      seed: preparedInput.seed,
      networkTopology: preparedInput.networkTopology,
      tickRate: preparedInput.tickRate,
      advice: promptRunRecord.run.data,
    }).profile
  }

  const finalAudit = buildLocalFidelityAudit({
    prompt: input.prompt,
    profile: finalProfile,
  })
  const finalKnowledgeCoverage = buildGenerationKnowledgeCoverage({
    prompt: preparedInput.prompt,
    genre: finalProfile.resolvedGenre,
    selectedFeatures: finalProfile.resolvedFeatures,
    dimension: finalProfile.dimension,
    multiplayer: finalProfile.resolvedMultiplayer,
    seed: finalProfile.seed,
  })
  const finalKnowledgeRisk = buildKnowledgeRiskSummaryForProfile({
    profile: finalProfile,
    knowledgeCoverage: finalKnowledgeCoverage,
    knowledgeFit: finalProfile.candidatePlan.candidates.find((candidate) => candidate.id === finalProfile.candidatePlan.chosenCandidateId)?.knowledgeFit,
  })
  const finalEncounterContext = buildEncounterDirectorForProfile({
    prompt: preparedPromptForProfile,
    profile: finalProfile,
    genre: preparedInput.genre,
    selectedFeatures: preparedInput.selectedFeatures,
    multiplayer: preparedInput.multiplayer,
    maxPlayers: preparedInput.maxPlayers,
  })
  const releaseJudgeRecord = await runProviderStageWithFallback<GenerationReleaseJudge>({
    prompt: GENERATION_RELEASE_JUDGE_PROMPT,
    loopStageId: "release_judgement",
    candidates: buildStageCandidates("release_judge"),
    verifier: createZodJsonVerifier(generationReleaseJudgeSchema),
    messagesFactory: () => [
      { role: "system", content: "Judge whether this generation is ready for release. Block prompt drift. Return only valid JSON." },
      {
        role: "user",
        sections: [
          { id: "brief", content: `Original brief:\n${input.prompt.trim()}` },
          { id: "final-profile", content: `Final profile:\n${JSON.stringify(summarizeLoopProfile(finalProfile, finalEncounterContext), null, 2)}` },
          { id: "fidelity-audit", content: `Local fidelity audit:\n${JSON.stringify(finalAudit, null, 2)}` },
          ...buildAdvisoryPromptSections({
            evolutionContext: input.evolutionContext,
            knowledgeCoverage: finalKnowledgeCoverage,
            knowledgeRisk: finalKnowledgeRisk,
            usageIntelligence: preparedInput.usageIntelligence,
            encounterContext: finalEncounterContext,
          }),
          { id: "output-contract", content: "Return JSON with decision, summary, blockers, warnings." },
        ],
      },
    ],
    metadata: { suiteId: GENERATION_PROMPT_SUITE.id, suiteVersion: GENERATION_PROMPT_SUITE.version, stage: "release_judgement" },
    maxInputTokens: 2600,
    maxOutputTokens: 800,
    temperature: 0.1,
    telemetry: input.telemetry,
    packetSummary: "Release judgement packet.",
    packetIncludes: buildPacketIncludes(["Original prompt", "Final profile", "Local fidelity audit"], {
      evolutionContext: input.evolutionContext,
      knowledgeCoverage: finalKnowledgeCoverage,
      knowledgeRisk: finalKnowledgeRisk,
      usageIntelligence: preparedInput.usageIntelligence,
      encounterContext: finalEncounterContext,
    }),
    successSummary: (result) => result.summary,
  })
  providerStages.push(releaseJudgeRecord.providerStage)
  promptPackets.push(releaseJudgeRecord.packet)
  loopStages.push(releaseJudgeRecord.stage)
  providerFailures.push(...releaseJudgeRecord.providerFailures)
  if (releaseJudgeRecord.usedFallback) fallbackProvidersUsed.add(releaseJudgeRecord.assignment.provider)

  const releaseJudgement = applyKnowledgePressureToReleaseJudgement({
    judgement: releaseJudgeRecord.run.ok
      ? releaseJudgeRecord.run.data
      : buildLocalReleaseJudgement({ profile: finalProfile, audit: finalAudit, knowledgeRisk: finalKnowledgeRisk }),
    knowledgeRisk: finalKnowledgeRisk,
  })
  const successfulProviderStages = loopStages.filter((stage) => (
    stage.provider !== "local"
    && stage.verification === "pass"
    && (
      stage.id === "brief_completion"
      || stage.id === "intent_gap_fill"
      || stage.id === "candidate_generation"
      || stage.id === "candidate_repair"
      || stage.id === "manifest_lock"
    )
  ))
  const unresolvedProviderFailures = providerFailures.filter((failure) => !failure.recovered)
  const aiPipelineUnavailable = successfulProviderStages.length === 0 && unresolvedProviderFailures.length > 0
  const effectiveReleaseJudgement = aiPipelineUnavailable
    ? {
      decision: "blocked" as const,
      summary: "AI provider generation could not start because every saved provider attempt failed before the game blueprint could be locked.",
      blockers: unresolvedProviderFailures.slice(0, 4).map((failure) => `${failure.provider} ${failure.stageLabel}: ${failure.reason}`),
      warnings: [],
    }
    : releaseJudgement
  const knowledgeCoverage = finalKnowledgeCoverage
  const operationalAnalytics = buildOperationalAnalytics({
    loopStages,
    providerFailures,
    fallbackProvidersUsed: [...fallbackProvidersUsed],
  })
  const providerDiagnostics = buildGenerationProviderDiagnosticsSummary({
    failures: providerFailures,
    operationalAnalytics,
  })

  const loopReport: GenerationLoopReport = {
    budgetMinutes: 90,
    mode: "quality-first",
    roster: input.providerRoster.roster,
    attempts: [
      {
        attempt: 1,
        selectedCandidateId: repaired ? "candidate_repair" : chosenCandidate.id,
        stages: loopStages,
        blockedReasons: unique([...critique.blockedReasons, ...finalAudit.blockedReasons, ...effectiveReleaseJudgement.blockers, ...finalKnowledgeRisk.blockers]),
        repaired,
      },
    ],
    promptPackets,
    missingCriteria: unique([
      ...preparedInput.missingCriteria.map((entry) => JSON.stringify(entry)),
      ...intentGap.missingCriteria.map((entry) => JSON.stringify(entry)),
      ...critique.missingCriteria.map((entry) => JSON.stringify(entry)),
      ...finalAudit.missingCriteria.map((entry) => JSON.stringify(entry)),
    ]).map((entry) => JSON.parse(entry) as GenerationMissingCriteria),
    preparationDiff: unique([
      ...preparedInput.preparationDiff.map((entry) => JSON.stringify(entry)),
      ...intentGap.inferenceDiff.map((entry) => JSON.stringify(entry)),
      ...critique.inferenceDiff.map((entry) => JSON.stringify(entry)),
    ]).map((entry) => JSON.parse(entry) as GenerationInferenceDiff),
    candidateRuns,
    providerFailures,
    fallbackProvidersUsed: [...fallbackProvidersUsed],
    selectedCandidateId: repaired ? "candidate_repair" : chosenCandidate.id,
    compileGateSummary: `Workspace generation will run compile preflight and up to two repair passes before release while preserving the ${finalEncounterContext.scenarioLabel.toLowerCase()}. ${finalKnowledgeRisk.summary}${input.usageIntelligence?.compilePressure?.[0] ? ` ${input.usageIntelligence.compilePressure[0]}` : ""}`,
    releaseJudgement: effectiveReleaseJudgement,
    operationalAnalytics,
  }

  return {
    profile: finalProfile,
    llmConfiguration: buildGenerationPromptConfiguration({
      provider: configuredProvider.provider,
      source: "user-key",
      model: configuredProvider.model,
      budgetMinutes: 90,
      providerRoster: input.providerRoster.roster,
      loopCount: loopReport.attempts.length,
      fallbackProvidersUsed: [...fallbackProvidersUsed],
      releaseStatus: effectiveReleaseJudgement.decision,
      loopReport,
      promptPackets,
      releaseJudgement: effectiveReleaseJudgement,
      preparationDiff: loopReport.preparationDiff,
      candidateRuns,
      providerFailures,
      providerDiagnostics,
      evolutionContext: input.evolutionContext,
      operationalAnalytics,
      knowledgeCoverage,
      knowledgeRisk: finalKnowledgeRisk,
      usageIntelligence: input.usageIntelligence,
      providerStages,
    }),
    loopReport,
    preparationDiff: loopReport.preparationDiff,
    candidateRuns,
    providerFailures,
    providerDiagnostics,
    releaseJudgement: effectiveReleaseJudgement,
    preparationRun: preparedInput.preparationRun,
    promptRun: promptRunRecord.run,
    knowledgeCoverage,
    knowledgeRisk: finalKnowledgeRisk,
    usageIntelligence: input.usageIntelligence,
  }
}

function isLevelBeatArray(value: unknown): value is LevelBeat[] {
  return Array.isArray(value) && value.every((beat) =>
    beat &&
    typeof beat === "object" &&
    typeof beat.title === "string" &&
    typeof beat.purpose === "string" &&
    typeof beat.challenge === "string" &&
    typeof beat.reward === "string",
  )
}

function isSupplementalSystemArray(value: unknown): value is SupplementalGenerationSystem[] {
  return Array.isArray(value) && value.every((system) =>
    system &&
    typeof system === "object" &&
    typeof system.name === "string" &&
    typeof system.displayName === "string" &&
    typeof system.rationale === "string" &&
    typeof system.linesBudget === "number",
  )
}

function isCharacterBlueprintArray(value: unknown): value is CharacterAssetBlueprint[] {
  return Array.isArray(value) && value.every((blueprint) =>
    blueprint &&
    typeof blueprint === "object" &&
    typeof blueprint.name === "string" &&
    typeof blueprint.role === "string" &&
    typeof blueprint.silhouette === "string" &&
    typeof blueprint.rigProfile === "string" &&
    Array.isArray(blueprint.modules) &&
    Array.isArray(blueprint.animations) &&
    Array.isArray(blueprint.stateVariants) &&
    Array.isArray(blueprint.interactionHooks) &&
    Array.isArray(blueprint.spawnContexts) &&
    typeof blueprint.reuseStrategy === "string" &&
    Array.isArray(blueprint.presentationRules) &&
    typeof blueprint.notes === "string",
  )
}

function isPropBlueprintArray(value: unknown): value is PropAssetBlueprint[] {
  return Array.isArray(value) && value.every((blueprint) =>
    blueprint &&
    typeof blueprint === "object" &&
    typeof blueprint.name === "string" &&
    typeof blueprint.category === "string" &&
    typeof blueprint.gameplayRole === "string" &&
    typeof blueprint.silhouetteRole === "string" &&
    typeof blueprint.modularity === "string" &&
    typeof blueprint.variants === "number" &&
    Array.isArray(blueprint.materials) &&
    Array.isArray(blueprint.stateVariants) &&
    Array.isArray(blueprint.interactionHooks) &&
    Array.isArray(blueprint.spawnContexts) &&
    typeof blueprint.reuseStrategy === "string" &&
    Array.isArray(blueprint.placementRules),
  )
}

function isEnvironmentAssetKitArray(value: unknown): value is EnvironmentAssetKit[] {
  return Array.isArray(value) && value.every((kit) =>
    kit &&
    typeof kit === "object" &&
    typeof kit.name === "string" &&
    typeof kit.purpose === "string" &&
    Array.isArray(kit.modules) &&
    Array.isArray(kit.biomeTags) &&
    Array.isArray(kit.propFamilies) &&
    Array.isArray(kit.characterAnchors) &&
    Array.isArray(kit.traversalAffordances) &&
    Array.isArray(kit.stateVariants) &&
    Array.isArray(kit.assemblyRules),
  )
}

function isAssetProductionPhaseArray(value: unknown): value is AssetProductionPhase[] {
  return Array.isArray(value) && value.every((phase) =>
    phase &&
    typeof phase === "object" &&
    typeof phase.name === "string" &&
    typeof phase.goal === "string" &&
    Array.isArray(phase.deliverables),
  )
}

function isAssetIntegrationContractArray(value: unknown): value is AssetIntegrationContract[] {
  return Array.isArray(value) && value.every((contract) =>
    contract &&
    typeof contract === "object" &&
    typeof contract.id === "string" &&
    typeof contract.focus === "string" &&
    Array.isArray(contract.targetSystems) &&
    Array.isArray(contract.rules),
  )
}

function isAssetGeneratorSourceArray(value: unknown): value is AssetGeneratorSource[] {
  return Array.isArray(value) && value.every((source) =>
    source &&
    typeof source === "object" &&
    typeof source.name === "string" &&
    typeof source.repo === "string" &&
    typeof source.url === "string" &&
    typeof source.license === "string" &&
    (source.reusePolicy === "direct" || source.reusePolicy === "reference-only") &&
    typeof source.focus === "string" &&
    typeof source.fit === "string" &&
    Array.isArray(source.integrationPatterns),
  )
}

function isAssetGenerationToolchainArray(value: unknown): value is AssetGenerationToolchain[] {
  return Array.isArray(value) && value.every((toolchain) =>
    toolchain &&
    typeof toolchain === "object" &&
    typeof toolchain.id === "string" &&
    typeof toolchain.stage === "string" &&
    typeof toolchain.label === "string" &&
    typeof toolchain.objective === "string" &&
    typeof toolchain.primarySource === "string" &&
    Array.isArray(toolchain.supportingSources) &&
    Array.isArray(toolchain.inputs) &&
    Array.isArray(toolchain.outputs) &&
    Array.isArray(toolchain.orchestrationNotes) &&
    Array.isArray(toolchain.verificationChecks),
  )
}

function isAssetGenerationPlan(value: unknown): value is AssetGenerationPlan {
  if (!value || typeof value !== "object") return false

  const plan = value as Partial<AssetGenerationPlan>

  return (
    typeof plan.productionStyle === "string" &&
    typeof plan.assetSystemSummary === "string" &&
    typeof plan.assetPipelineSummary === "string" &&
    typeof plan.modelGenerationSummary === "string" &&
    typeof plan.kitArchitecture === "string" &&
    typeof plan.assemblyStrategy === "string" &&
    typeof plan.orchestrationStrategy === "string" &&
    typeof plan.characterStrategy === "string" &&
    typeof plan.propStrategy === "string" &&
    typeof plan.environmentStrategy === "string" &&
    Array.isArray(plan.materialPalette) &&
    Array.isArray(plan.animationNeeds) &&
    Array.isArray(plan.reuseDirectives) &&
    Array.isArray(plan.stateModelRules) &&
    Array.isArray(plan.spawnRules) &&
    isAssetProductionPhaseArray(plan.productionPhases) &&
    isAssetIntegrationContractArray(plan.integrationContracts) &&
    Array.isArray(plan.generationRules) &&
    Array.isArray(plan.specialistTracks) &&
    Array.isArray(plan.reviewPasses) &&
    Array.isArray(plan.qualityGates) &&
    Array.isArray(plan.toolchainQualityChecks) &&
    isCharacterBlueprintArray(plan.characterBlueprints) &&
    isPropBlueprintArray(plan.propBlueprints) &&
    isEnvironmentAssetKitArray(plan.environmentKits) &&
    isAssetGenerationToolchainArray(plan.generationToolchains) &&
    isAssetGeneratorSourceArray(plan.sourceInspirations)
  )
}

function isGenerationRuntimePlan(value: unknown): value is GenerationRuntimePlan {
  if (!value || typeof value !== "object") return false

  const plan = value as Partial<GenerationRuntimePlan>

  return (
    typeof plan.archetype === "string" &&
    typeof plan.label === "string" &&
    typeof plan.reason === "string" &&
    typeof plan.cameraModel === "string" &&
    typeof plan.targetSessionMinutes === "number" &&
    typeof plan.inputModel === "string" &&
    Array.isArray(plan.playFocus) &&
    Array.isArray(plan.uiFocus) &&
    Array.isArray(plan.contentStrategy) &&
    typeof plan.winCondition === "string" &&
    typeof plan.failCondition === "string" &&
    Array.isArray(plan.antiCollapseRules)
  )
}

function isGenerationGraphicsPlan(value: unknown): value is GenerationGraphicsPlan {
  if (!value || typeof value !== "object") return false

  const plan = value as Partial<GenerationGraphicsPlan>

  return (
    typeof plan.renderPath === "string" &&
    typeof plan.visualIdentity === "string" &&
    typeof plan.lightingModel === "string" &&
    typeof plan.materialStrategy === "string" &&
    typeof plan.postProcessStyle === "string" &&
    typeof plan.animationFocus === "string" &&
    typeof plan.uiPresentation === "string" &&
    typeof plan.runtimePresentation === "string" &&
    typeof plan.scalabilityStrategy === "string" &&
    Array.isArray(plan.lowSpecFallbacks) &&
    Array.isArray(plan.highSpecEnhancements) &&
    Array.isArray(plan.gracefulDegradation) &&
    Array.isArray(plan.frameBudgetPriorities)
  )
}

function isGenerationEnginePlan(value: unknown): value is GenerationEnginePlan {
  if (!value || typeof value !== "object") return false

  const plan = value as Partial<GenerationEnginePlan>

  return (
    typeof plan.recommendedEngine === "string" &&
    typeof plan.rationale === "string" &&
    Array.isArray(plan.strengths) &&
    Array.isArray(plan.criticalSubsystems) &&
    Array.isArray(plan.scalingStrategy) &&
    Array.isArray(plan.portabilityNotes) &&
    Array.isArray(plan.fallbackEngines)
  )
}

function isGenerationPipelinePlan(value: unknown): value is GenerationPipelinePlan {
  if (!value || typeof value !== "object") return false

  const plan = value as Partial<GenerationPipelinePlan>

  return (
    typeof plan.targetMinutes === "number" &&
    Array.isArray(plan.parallelTracks) &&
    Array.isArray(plan.methodology) &&
    Array.isArray(plan.phaseBudgets) &&
    Array.isArray(plan.qualityGates) &&
    Array.isArray(plan.fallbackStrategy)
  )
}

function isGenerationPromptCouncilPlan(value: unknown): value is GenerationPromptCouncilPlan {
  if (!value || typeof value !== "object") return false

  const plan = value as Partial<GenerationPromptCouncilPlan>

  return (
    typeof plan.orchestrationModel === "string" &&
    Array.isArray(plan.agents) &&
    Array.isArray(plan.promptTiers) &&
    Array.isArray(plan.adjudicationRules) &&
    Array.isArray(plan.repairLoop)
  )
}

function isGenerationReferenceExampleArray(value: unknown): value is GenerationReferenceExample[] {
  return Array.isArray(value) && value.every((reference) =>
    reference &&
    typeof reference === "object" &&
    typeof reference.id === "string" &&
    typeof reference.title === "string" &&
    typeof reference.genre === "string" &&
    typeof reference.dimension === "string" &&
    typeof reference.runtimeArchetype === "string" &&
    typeof reference.fit === "string" &&
    typeof reference.retrievalReason === "string" &&
    Array.isArray(reference.mechanicsToBorrow) &&
    Array.isArray(reference.antiPatterns),
  )
}

function isGenerationCandidateScoreBreakdown(value: unknown): value is GenerationCandidateScoreBreakdown {
  if (!value || typeof value !== "object") return false

  const score = value as Partial<GenerationCandidateScoreBreakdown>

  return (
    typeof score.fidelity === "number" &&
    typeof score.coherence === "number" &&
    typeof score.novelty === "number" &&
    typeof score.scope === "number" &&
    typeof score.runtimeFit === "number" &&
    typeof score.total === "number"
  )
}

function isGenerationCandidateManifestArray(value: unknown): value is GenerationCandidateManifest[] {
  return Array.isArray(value) && value.every((candidate) =>
    candidate &&
    typeof candidate === "object" &&
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.premise === "string" &&
    typeof candidate.runtimeArchetype === "string" &&
    Array.isArray(candidate.differentiators) &&
    Array.isArray(candidate.retainedFeatures) &&
    Array.isArray(candidate.riskFlags) &&
    (candidate.knowledgeFit === undefined || typeof candidate.knowledgeFit === "string") &&
    (candidate.knowledgeNotes === undefined || Array.isArray(candidate.knowledgeNotes)) &&
    isGenerationCandidateScoreBreakdown(candidate.score),
  )
}

function isGenerationCandidatePlan(value: unknown): value is GenerationCandidatePlan {
  if (!value || typeof value !== "object") return false

  const plan = value as Partial<GenerationCandidatePlan>

  return (
    typeof plan.selectionStrategy === "string" &&
    typeof plan.decisionSummary === "string" &&
    typeof plan.chosenCandidateId === "string" &&
    Array.isArray(plan.rerankTriggers) &&
    isGenerationCandidateManifestArray(plan.candidates)
  )
}

function isGenerationEvalDatasetBucketArray(value: unknown): value is GenerationEvalDatasetBucket[] {
  return Array.isArray(value) && value.every((bucket) =>
    bucket &&
    typeof bucket === "object" &&
    typeof bucket.id === "string" &&
    typeof bucket.label === "string" &&
    typeof bucket.samplePrompt === "string" &&
    Array.isArray(bucket.checks),
  )
}

function isGenerationEvalRubricArray(value: unknown): value is GenerationEvalRubric[] {
  return Array.isArray(value) && value.every((rubric) =>
    rubric &&
    typeof rubric === "object" &&
    typeof rubric.id === "string" &&
    typeof rubric.label === "string" &&
    typeof rubric.weight === "number" &&
    typeof rubric.passThreshold === "number" &&
    typeof rubric.guidance === "string",
  )
}

function isGenerationEvaluationPlan(value: unknown): value is GenerationEvaluationPlan {
  if (!value || typeof value !== "object") return false

  const plan = value as Partial<GenerationEvaluationPlan>

  return (
    typeof plan.evaluationStrategy === "string" &&
    typeof plan.graderModel === "string" &&
    isGenerationEvalDatasetBucketArray(plan.datasetBuckets) &&
    isGenerationEvalRubricArray(plan.rubrics) &&
    Array.isArray(plan.acceptanceRules) &&
    Array.isArray(plan.repairHooks)
  )
}

function isGenerationDiversityPlan(value: unknown): value is GenerationDiversityPlan {
  if (!value || typeof value !== "object") return false

  const plan = value as Partial<GenerationDiversityPlan>

  return (
    typeof plan.rankingStrategy === "string" &&
    isGenerationReferenceExampleArray(plan.retrievalExamples) &&
    typeof plan.diversityMemoryKey === "string" &&
    Array.isArray(plan.overusedPatternRisks) &&
    Array.isArray(plan.noveltyPressure) &&
    Array.isArray(plan.antiCollapseChecks)
  )
}

function isGenerationProfile(value: unknown): value is GenerationIntelligenceProfile {
  if (!value || typeof value !== "object") return false

  const profile = value as Partial<GenerationIntelligenceProfile>

  return (
    typeof profile.resolvedGenre === "string" &&
    typeof profile.genreConfidence === "string" &&
    typeof profile.genreReason === "string" &&
    typeof profile.promptSummary === "string" &&
    typeof profile.generatedPitch === "string" &&
    typeof profile.playerFantasy === "string" &&
    typeof profile.sessionFantasy === "string" &&
    typeof profile.interactionModel === "string" &&
    Array.isArray(profile.experienceGoals) &&
    Array.isArray(profile.contentPillars) &&
    Array.isArray(profile.progressionArcs) &&
    Array.isArray(profile.environmentThemes) &&
    Array.isArray(profile.uiSurfaces) &&
    Array.isArray(profile.systemPriorities) &&
    Array.isArray(profile.negativeConstraints) &&
    typeof profile.scopeScale === "string" &&
    typeof profile.resolvedMultiplayer === "boolean" &&
    typeof profile.resolvedMaxPlayers === "number" &&
    typeof profile.dimension === "string" &&
    typeof profile.cameraStyle === "string" &&
    typeof profile.worldStructure === "string" &&
    typeof profile.mapArchetype === "string" &&
    typeof profile.mapOverview === "string" &&
    typeof profile.nonOverlapStrategy === "string" &&
    typeof profile.traversalModel === "string" &&
    Array.isArray(profile.layoutRules) &&
    Array.isArray(profile.promptSignals) &&
    typeof profile.gameplayLoopSummary === "string" &&
    Array.isArray(profile.coreLoop) &&
    Array.isArray(profile.secondaryLoop) &&
    Array.isArray(profile.progressionLoop) &&
    Array.isArray(profile.failStates) &&
    isLevelBeatArray(profile.levelSequence) &&
    Array.isArray(profile.autoIncludedFeatures) &&
    Array.isArray(profile.resolvedFeatures) &&
    isSupplementalSystemArray(profile.supplementalSystems) &&
    Array.isArray(profile.complementarySystems) &&
    Array.isArray(profile.knowledgeDomains) &&
    isGenerationRuntimePlan(profile.runtimePlan) &&
    isGenerationGraphicsPlan(profile.graphicsPlan) &&
    isGenerationEnginePlan(profile.enginePlan) &&
    isGenerationPipelinePlan(profile.pipelinePlan) &&
    isGenerationPromptCouncilPlan(profile.promptCouncilPlan) &&
    isGenerationCandidatePlan(profile.candidatePlan) &&
    isGenerationEvaluationPlan(profile.evaluationPlan) &&
    isGenerationDiversityPlan(profile.diversityPlan) &&
    isAssetGenerationPlan(profile.assetPlan)
  )
}

function isGenerationRuntimeVersatilityPlan(
  value: unknown,
): value is GenerationIntelligenceProfile["runtimeVersatilityPlan"] {
  if (!value || typeof value !== "object") return false

  const plan = value as Partial<GenerationIntelligenceProfile["runtimeVersatilityPlan"]>

  return (
    typeof plan.flavorId === "string" &&
    typeof plan.flavorLabel === "string" &&
    typeof plan.runtimeSubtitle === "string" &&
    Array.isArray(plan.activeModules) &&
    Array.isArray(plan.primaryVerbs) &&
    Array.isArray(plan.pressureTracks) &&
    Boolean(plan.resourceLabels) &&
    Boolean(plan.encounterLabels) &&
    Boolean(plan.actionLabels) &&
    Array.isArray(plan.objectiveHooks) &&
    Array.isArray(plan.uiCallouts) &&
    Array.isArray(plan.eventCues)
  )
}

export function ensureGenerationProfile(input: {
  existing?: Partial<GenerationIntelligenceProfile> | null
  prompt: string
  genre: Genre
  features: string[]
  multiplayer: boolean
  maxPlayers: number
}) {
  if (isGenerationProfile(input.existing)) {
    if (isGenerationRuntimeVersatilityPlan(input.existing.runtimeVersatilityPlan)) {
      return input.existing
    }

    return {
      ...input.existing,
      runtimeVersatilityPlan: planGenerationRuntimeVersatility({
        prompt: input.prompt,
        genre: input.existing.resolvedGenre,
        dimension: input.existing.dimension,
        runtimeArchetype: input.existing.runtimePlan.archetype,
        promptSignals: input.existing.promptSignals,
        resolvedFeatures: input.existing.resolvedFeatures,
        contentPillars: input.existing.contentPillars,
        coreLoop: input.existing.coreLoop,
        secondaryLoop: input.existing.secondaryLoop,
        progressionLoop: input.existing.progressionLoop,
        uiSurfaces: input.existing.uiSurfaces,
        environmentThemes: input.existing.environmentThemes,
      }),
    }
  }

  return buildGenerationProfile({
    prompt: input.prompt,
    genre: input.genre,
    selectedFeatures: input.features,
    multiplayer: input.multiplayer,
    maxPlayers: input.maxPlayers,
  })
}

export function createFallbackGenerationProfile(input: {
  prompt: string
  genre: Genre
  features: string[]
  multiplayer: boolean
  maxPlayers: number
}) {
  return buildGenerationProfile({
    prompt: input.prompt,
    genre: input.genre,
    selectedFeatures: input.features,
    multiplayer: input.multiplayer,
    maxPlayers: input.maxPlayers,
  })
}
