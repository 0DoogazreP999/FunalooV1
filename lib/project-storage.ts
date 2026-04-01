"use client"

import { GENRE_TEMPLATES } from "@/lib/engine/config"
import { ensureGenerationProfile, ensureProjectExecution } from "@/lib/engine/generation-intelligence"
import { ensureProjectWorkspace } from "@/lib/engine/project-workspace"
import type { Genre, ProjectGenerationFeedback, ProjectId, TargetEngine, UserProject } from "@/lib/engine/types"
import {
  createProjectId,
  isDashboardPage,
  isGenerationFeedbackScoreBand,
  isGenre,
  isProjectStatus,
  isPromptProviderId,
  isTargetEngine,
} from "@/lib/validators"
import { storage } from "@/lib/storage"

export type DashboardPageId = "home" | "create" | "projects" | "game"

export interface StoredDashboardState {
  activeProjectId: ProjectId | null
  page: DashboardPageId
}

function normalizeProviderFailures(
  failures: Partial<UserProject>["llmConfiguration"] extends infer T
    ? T extends { providerFailures?: infer F } ? F | undefined : undefined
    : never,
): UserProject["llmConfiguration"]["providerFailures"] {
  if (!Array.isArray(failures)) return undefined

  return failures
    .filter((entry): entry is NonNullable<UserProject["llmConfiguration"]["providerFailures"]>[number] => Boolean(entry) && typeof entry === "object")
    .map((entry) => ({
      stageId: typeof entry.stageId === "string" ? entry.stageId : "manifest_lock",
      stageLabel: typeof entry.stageLabel === "string" ? entry.stageLabel : "Generation Stage",
      provider: isPromptProviderId(entry.provider) ? entry.provider : "local",
      model: typeof entry.model === "string" && entry.model.trim() ? entry.model : undefined,
      attempt: typeof entry.attempt === "number" && Number.isFinite(entry.attempt) ? entry.attempt : 1,
      reason: typeof entry.reason === "string" && entry.reason.trim() ? entry.reason : "Provider request failed.",
      code: entry.code === "verification_failed" ? "verification_failed" : "client_error",
      retryable: Boolean(entry.retryable),
      recovered: Boolean(entry.recovered),
      final: Boolean(entry.final),
      status: typeof entry.status === "number" && Number.isFinite(entry.status) ? entry.status : undefined,
      providerErrorType: typeof entry.providerErrorType === "string" && entry.providerErrorType.trim() ? entry.providerErrorType : undefined,
      category: typeof entry.category === "string" ? entry.category as NonNullable<UserProject["llmConfiguration"]["providerFailures"]>[number]["category"] : undefined,
      severity: typeof entry.severity === "string" ? entry.severity as NonNullable<UserProject["llmConfiguration"]["providerFailures"]>[number]["severity"] : undefined,
      retryStrategy: typeof entry.retryStrategy === "string" ? entry.retryStrategy as NonNullable<UserProject["llmConfiguration"]["providerFailures"]>[number]["retryStrategy"] : undefined,
      statusFamily: typeof entry.statusFamily === "string" ? entry.statusFamily as NonNullable<UserProject["llmConfiguration"]["providerFailures"]>[number]["statusFamily"] : undefined,
      headline: typeof entry.headline === "string" && entry.headline.trim() ? entry.headline : undefined,
      suggestedAction: typeof entry.suggestedAction === "string" && entry.suggestedAction.trim() ? entry.suggestedAction : undefined,
      affectedModel: typeof entry.affectedModel === "string" && entry.affectedModel.trim() ? entry.affectedModel : undefined,
      limitSummary: typeof entry.limitSummary === "string" && entry.limitSummary.trim() ? entry.limitSummary : undefined,
      signals: Array.isArray(entry.signals)
        ? entry.signals
          .filter((signal): signal is NonNullable<NonNullable<UserProject["llmConfiguration"]["providerFailures"]>[number]["signals"]>[number] => Boolean(signal) && typeof signal === "object")
          .map((signal, index) => ({
            id: typeof signal.id === "string" && signal.id.trim() ? signal.id : `signal_${index + 1}`,
            label: typeof signal.label === "string" && signal.label.trim() ? signal.label : "Provider Signal",
            severity: typeof signal.severity === "string" ? signal.severity as NonNullable<NonNullable<UserProject["llmConfiguration"]["providerFailures"]>[number]["signals"]>[number]["severity"] : "warning",
            detail: typeof signal.detail === "string" && signal.detail.trim() ? signal.detail : "No provider-signal detail recorded.",
            source: typeof signal.source === "string" ? signal.source as NonNullable<NonNullable<UserProject["llmConfiguration"]["providerFailures"]>[number]["signals"]>[number]["source"] : "response_body",
            action: typeof signal.action === "string" && signal.action.trim() ? signal.action : undefined,
          }))
        : undefined,
      requestId: typeof entry.requestId === "string" && entry.requestId.trim() ? entry.requestId : undefined,
      retryAfterSeconds: typeof entry.retryAfterSeconds === "number" && Number.isFinite(entry.retryAfterSeconds) ? entry.retryAfterSeconds : undefined,
    }))
}

function normalizeOperationalAnalytics(
  analytics: UserProject["llmConfiguration"]["operationalAnalytics"] | unknown,
): UserProject["llmConfiguration"]["operationalAnalytics"] {
  if (!analytics || typeof analytics !== "object") return undefined
  const candidate = analytics as NonNullable<UserProject["llmConfiguration"]["operationalAnalytics"]>

  return {
    totalPromptCalls: typeof candidate.totalPromptCalls === "number" && Number.isFinite(candidate.totalPromptCalls) ? candidate.totalPromptCalls : 0,
    totalProviderFallbacks: typeof candidate.totalProviderFallbacks === "number" && Number.isFinite(candidate.totalProviderFallbacks) ? candidate.totalProviderFallbacks : 0,
    totalRetries: typeof candidate.totalRetries === "number" && Number.isFinite(candidate.totalRetries) ? candidate.totalRetries : 0,
    totalInputTokens: typeof candidate.totalInputTokens === "number" && Number.isFinite(candidate.totalInputTokens) ? candidate.totalInputTokens : 0,
    totalOutputTokens: typeof candidate.totalOutputTokens === "number" && Number.isFinite(candidate.totalOutputTokens) ? candidate.totalOutputTokens : 0,
    totalTokens: typeof candidate.totalTokens === "number" && Number.isFinite(candidate.totalTokens) ? candidate.totalTokens : 0,
    totalCostUsd: typeof candidate.totalCostUsd === "number" && Number.isFinite(candidate.totalCostUsd) ? candidate.totalCostUsd : 0,
    slowStages: Array.isArray(candidate.slowStages) ? candidate.slowStages.filter((entry): entry is string => typeof entry === "string") : [],
    cacheableStages: Array.isArray(candidate.cacheableStages) ? candidate.cacheableStages.filter((entry): entry is string => typeof entry === "string") : [],
    routingStrategies: Array.isArray(candidate.routingStrategies) ? candidate.routingStrategies.filter((entry): entry is string => typeof entry === "string") : [],
    failureHotspots: Array.isArray(candidate.failureHotspots) ? candidate.failureHotspots.filter((entry): entry is string => typeof entry === "string") : [],
    failureCategories: Array.isArray(candidate.failureCategories) ? candidate.failureCategories.filter((entry): entry is string => typeof entry === "string") : [],
    retryStrategies: Array.isArray(candidate.retryStrategies) ? candidate.retryStrategies.filter((entry): entry is string => typeof entry === "string") : [],
    providerHealthSignals: Array.isArray(candidate.providerHealthSignals) ? candidate.providerHealthSignals.filter((entry): entry is string => typeof entry === "string") : [],
    optimizationNotes: Array.isArray(candidate.optimizationNotes) ? candidate.optimizationNotes.filter((entry): entry is string => typeof entry === "string") : [],
  }
}

function normalizeProviderDiagnostics(
  summary: UserProject["llmConfiguration"]["providerDiagnostics"] | unknown,
): UserProject["llmConfiguration"]["providerDiagnostics"] {
  if (!summary || typeof summary !== "object") return undefined
  const candidate = summary as NonNullable<UserProject["llmConfiguration"]["providerDiagnostics"]>

  return {
    summary: typeof candidate.summary === "string" && candidate.summary.trim()
      ? candidate.summary
      : "No provider diagnostics summary recorded.",
    highestSeverity: typeof candidate.highestSeverity === "string"
      ? candidate.highestSeverity
      : "info",
    totalFailures: typeof candidate.totalFailures === "number" && Number.isFinite(candidate.totalFailures) ? candidate.totalFailures : 0,
    unresolvedFailures: typeof candidate.unresolvedFailures === "number" && Number.isFinite(candidate.unresolvedFailures) ? candidate.unresolvedFailures : 0,
    recoveredFailures: typeof candidate.recoveredFailures === "number" && Number.isFinite(candidate.recoveredFailures) ? candidate.recoveredFailures : 0,
    finalFailures: typeof candidate.finalFailures === "number" && Number.isFinite(candidate.finalFailures) ? candidate.finalFailures : 0,
    categories: Array.isArray(candidate.categories) ? candidate.categories.filter((entry): entry is NonNullable<UserProject["llmConfiguration"]["providerDiagnostics"]>["categories"][number] => typeof entry === "string") : [],
    retryStrategies: Array.isArray(candidate.retryStrategies) ? candidate.retryStrategies.filter((entry): entry is NonNullable<UserProject["llmConfiguration"]["providerDiagnostics"]>["retryStrategies"][number] => typeof entry === "string") : [],
    statusFamilies: Array.isArray(candidate.statusFamilies) ? candidate.statusFamilies.filter((entry): entry is NonNullable<UserProject["llmConfiguration"]["providerDiagnostics"]>["statusFamilies"][number] => typeof entry === "string") : [],
    affectedModels: Array.isArray(candidate.affectedModels) ? candidate.affectedModels.filter((entry): entry is string => typeof entry === "string") : [],
    healthSignals: Array.isArray(candidate.healthSignals) ? candidate.healthSignals.filter((entry): entry is string => typeof entry === "string") : [],
    actionItems: Array.isArray(candidate.actionItems) ? candidate.actionItems.filter((entry): entry is string => typeof entry === "string") : [],
    hotspots: Array.isArray(candidate.hotspots) ? candidate.hotspots.filter((entry): entry is string => typeof entry === "string") : [],
  }
}

function getFallbackMaxPlayers(project: Partial<UserProject>) {
  if (typeof project.maxPlayers === "number" && Number.isFinite(project.maxPlayers)) {
    return Math.max(1, Math.floor(project.maxPlayers))
  }

  if (project.multiplayer === false) {
    return 1
  }

  if (isGenre(project.genre)) {
    return GENRE_TEMPLATES[project.genre].defaultPlayers
  }

  return 4
}

function normalizePromptConfiguration(
  project: Partial<UserProject>,
): UserProject["llmConfiguration"] {
  const configuration = project.llmConfiguration
  const evolutionContext = configuration?.evolutionContext && typeof configuration.evolutionContext === "object"
    ? {
        ...configuration.evolutionContext,
        insertionBlocks: Array.isArray(configuration.evolutionContext.insertionBlocks)
          ? configuration.evolutionContext.insertionBlocks
          : [],
      }
    : undefined
  const stages = Array.isArray(configuration?.stages)
    ? configuration.stages
      .filter((entry): entry is NonNullable<UserProject["llmConfiguration"]["stages"]>[number] => Boolean(entry) && typeof entry === "object")
      .map((entry) => ({
        id: (
          typeof entry.id === "string"
            ? entry.id
            : "manifest_synthesizer"
        ) as NonNullable<UserProject["llmConfiguration"]["stages"]>[number]["id"],
        label: typeof entry.label === "string" ? entry.label : "Generation Stage",
        version: typeof entry.version === "string" && entry.version.trim() ? entry.version : "unknown",
        mode: (entry.mode === "provider" ? "provider" : "heuristic") as NonNullable<UserProject["llmConfiguration"]["stages"]>[number]["mode"],
        promptId: typeof entry.promptId === "string" && entry.promptId.trim() ? entry.promptId : undefined,
        promptHash: typeof entry.promptHash === "string" && entry.promptHash.trim() ? entry.promptHash : undefined,
        provider: isPromptProviderId(entry.provider) ? entry.provider : undefined,
        model: typeof entry.model === "string" && entry.model.trim() ? entry.model : undefined,
      }))
    : undefined

  return {
    provider: isPromptProviderId(configuration?.provider) ? configuration.provider : "local",
    source: configuration?.source === "user-key" ? "user-key" : "local",
    model: typeof configuration?.model === "string" && configuration.model.trim()
      ? configuration.model
      : undefined,
    budgetMinutes: typeof configuration?.budgetMinutes === "number" && Number.isFinite(configuration.budgetMinutes)
      ? configuration.budgetMinutes
      : undefined,
    providerRoster: configuration?.providerRoster && typeof configuration.providerRoster === "object"
      ? configuration.providerRoster
      : undefined,
    loopCount: typeof configuration?.loopCount === "number" && Number.isFinite(configuration.loopCount)
      ? configuration.loopCount
      : undefined,
    fallbackProvidersUsed: Array.isArray(configuration?.fallbackProvidersUsed)
      ? configuration.fallbackProvidersUsed.filter((provider): provider is UserProject["llmConfiguration"]["provider"] => isPromptProviderId(provider))
      : undefined,
    releaseStatus:
      configuration?.releaseStatus === "ready" || configuration?.releaseStatus === "needs_review" || configuration?.releaseStatus === "blocked"
        ? configuration.releaseStatus
        : undefined,
    loopReport: configuration?.loopReport && typeof configuration.loopReport === "object"
      ? configuration.loopReport
      : undefined,
    promptPackets: Array.isArray(configuration?.promptPackets)
      ? configuration.promptPackets
      : undefined,
    releaseJudgement: configuration?.releaseJudgement && typeof configuration.releaseJudgement === "object"
      ? configuration.releaseJudgement
      : undefined,
    preparationDiff: Array.isArray(configuration?.preparationDiff)
      ? configuration.preparationDiff
      : undefined,
    candidateRuns: Array.isArray(configuration?.candidateRuns)
      ? configuration.candidateRuns
      : undefined,
    providerFailures: normalizeProviderFailures(configuration?.providerFailures),
    providerDiagnostics: normalizeProviderDiagnostics(configuration?.providerDiagnostics),
    evolutionContext,
    operationalAnalytics: normalizeOperationalAnalytics(configuration?.operationalAnalytics),
    knowledgeCoverage: configuration?.knowledgeCoverage && typeof configuration.knowledgeCoverage === "object"
      ? configuration.knowledgeCoverage
      : undefined,
    knowledgeRisk: configuration?.knowledgeRisk && typeof configuration.knowledgeRisk === "object"
      ? configuration.knowledgeRisk
      : undefined,
    usageIntelligence: configuration?.usageIntelligence && typeof configuration.usageIntelligence === "object"
      ? configuration.usageIntelligence
      : undefined,
    suiteId: typeof configuration?.suiteId === "string" && configuration.suiteId.trim()
      ? configuration.suiteId
      : undefined,
    suiteVersion: typeof configuration?.suiteVersion === "string" && configuration.suiteVersion.trim()
      ? configuration.suiteVersion
      : undefined,
    stages: stages && stages.length > 0 ? stages : undefined,
  }
}

function normalizeProjectFeedback(feedback: unknown): ProjectGenerationFeedback[] {
  if (!Array.isArray(feedback)) return []

  return feedback
    .filter((entry): entry is Partial<ProjectGenerationFeedback> => Boolean(entry) && typeof entry === "object")
    .map((entry, index) => ({
      id: typeof entry.id === "string" && entry.id.trim() ? entry.id : `feedback_${index + 1}`,
      scoreBand: isGenerationFeedbackScoreBand(entry.scoreBand) ? entry.scoreBand : "failed",
      notes: typeof entry.notes === "string" ? entry.notes : "",
      submittedAt: typeof entry.submittedAt === "string" ? entry.submittedAt : new Date().toISOString(),
      runtimeArchetype:
        typeof entry.runtimeArchetype === "string"
          ? entry.runtimeArchetype as ProjectGenerationFeedback["runtimeArchetype"]
          : "combat_mission",
      runtimeLabel: typeof entry.runtimeLabel === "string" ? entry.runtimeLabel : "Playable Runtime",
      promptSummary: typeof entry.promptSummary === "string" ? entry.promptSummary : "",
    }))
    .sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime())
}

function normalizeProject(project: Partial<UserProject>): UserProject {
  const genre: Genre = isGenre(project.genre) ? project.genre : "fps"
  const engine: TargetEngine = isTargetEngine(project.engine) ? project.engine : "unreal"
  const features = Array.isArray(project.features)
    ? project.features.filter((feature): feature is string => typeof feature === "string")
    : []

  const maxPlayers = getFallbackMaxPlayers(project)
  const design = ensureGenerationProfile({
    existing: project.design,
    prompt:
      typeof project.description === "string" && project.description.trim()
        ? project.description
        : typeof project.name === "string"
          ? project.name
          : "Generated game",
    genre,
    features,
    multiplayer: Boolean(project.multiplayer),
    maxPlayers,
  })

  return ensureProjectExecution(ensureProjectWorkspace({
    id: createProjectId(typeof project.id === "string" ? project.id : undefined),
    name: typeof project.name === "string" && project.name.trim() ? project.name : "Untitled Game",
    description: typeof project.description === "string" ? project.description : "",
    genre,
    dimension: typeof project.dimension === "string" ? project.dimension : design.dimension,
    engine,
    features: features.length > 0 ? features : design.resolvedFeatures,
    multiplayer: Boolean(project.multiplayer),
    maxPlayers,
    seed: typeof project.seed === "string" ? project.seed : design.seed,
    status: isProjectStatus(project.status) ? project.status : "complete",
    progress: typeof project.progress === "number" ? project.progress : 100,
    createdAt: typeof project.createdAt === "string" ? project.createdAt : new Date().toISOString(),
    llmConfiguration: normalizePromptConfiguration(project),
    design,
    systems: Array.isArray(project.systems) ? project.systems : [],
    codeFiles: Array.isArray(project.codeFiles) ? project.codeFiles : [],
    assetFiles: Array.isArray(project.assetFiles) ? project.assetFiles : [],
    feedback: normalizeProjectFeedback(project.feedback),
    execution: project.execution,
  }))
}

export function loadProjects(email?: string | null): UserProject[] {
  if (!email) return []

  try {
    return storage.getProjects(email)
      .map((project) => normalizeProject(project))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } catch {
    return []
  }
}

export function saveProjects(email: string | null | undefined, projects: UserProject[]) {
  if (!email) return
  storage.saveProjects(email, projects.map((project) => normalizeProject(project)))
}

export function loadDashboardState(email?: string | null): StoredDashboardState | null {
  if (!email) return null

  try {
    const parsed = storage.getDashboardState(email)
    if (!parsed) return null

    return {
      activeProjectId:
        typeof parsed?.activeProjectId === "string" && (parsed.activeProjectId as string).trim()
          ? parsed.activeProjectId
          : null,
      page: isDashboardPage(parsed?.page) ? parsed.page : "home",
    }
  } catch {
    return null
  }
}

export function saveDashboardState(
  email: string | null | undefined,
  state: StoredDashboardState,
) {
  if (!email) return
  storage.saveDashboardState(email, {
    activeProjectId: state.activeProjectId,
    page: state.page,
  })
}

export function deleteProject(
  email: string | null | undefined,
  projectId: ProjectId,
): { deleted: boolean; totalLinesRemoved: number } {
  if (!email) return { deleted: false, totalLinesRemoved: 0 }
  return storage.deleteProject(email, projectId)
}
