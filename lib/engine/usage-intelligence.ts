import type {
  GameDimension,
  GenerationUsageIntelligence,
  GenerationUsageProviderSnapshot,
  Genre,
  PromptProviderId,
  UserProject,
} from "@/lib/engine/types"

interface GenerationUsageIntelligenceInput {
  prompt: string
  genre: Genre
  dimension?: GameDimension
  selectedFeatures: string[]
  selectedProvider?: PromptProviderId
  selectedModel?: string
  currentUserProjects?: UserProject[]
  allProjects?: UserProject[]
}

type ProviderStatsAccumulator = {
  provider: Exclude<PromptProviderId, "local">
  totalRuns: number
  readyRuns: number
  reviewRuns: number
  blockedRuns: number
  totalPromptCalls: number
  totalCostUsd: number
  modelCounts: Map<string, number>
  failureStageCounts: Map<string, number>
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function tokenize(value: string) {
  return unique(value.toLowerCase().split(/[^a-z0-9]+/i).filter((token) => token.length >= 3))
}

function scoreHistoricalProject(input: {
  project: UserProject
  promptTokens: string[]
  genre: Genre
  dimension?: GameDimension
  selectedFeatures: string[]
  selectedProvider?: PromptProviderId
  selectedModel?: string
}) {
  if (input.project.llmConfiguration.source !== "user-key" || input.project.llmConfiguration.provider === "local") {
    return 0
  }

  let score = 1
  const projectText = [
    input.project.description,
    input.project.design.promptSummary,
    input.project.design.generatedPitch,
    input.project.design.runtimePlan.label,
  ].join(" ").toLowerCase()

  if (input.project.design.resolvedGenre === input.genre) score += 4
  if (input.dimension && input.project.design.dimension === input.dimension) score += 3
  if (input.selectedProvider && input.project.llmConfiguration.provider === input.selectedProvider) score += 2
  if (input.selectedModel && input.project.llmConfiguration.model === input.selectedModel) score += 2

  const overlappingFeatures = input.selectedFeatures.filter((feature) => input.project.design.resolvedFeatures.includes(feature))
  score += overlappingFeatures.length * 2

  for (const token of input.promptTokens) {
    if (projectText.includes(token)) score += 1
  }

  if (input.project.llmConfiguration.releaseStatus === "ready") score += 2
  if (input.project.llmConfiguration.releaseStatus === "blocked") score -= 1

  return score
}

function buildProviderSnapshots(projects: UserProject[]): GenerationUsageProviderSnapshot[] {
  const accumulators = new Map<Exclude<PromptProviderId, "local">, ProviderStatsAccumulator>()

  for (const project of projects) {
    const provider = project.llmConfiguration.provider
    if (provider === "local") continue

    const existing = accumulators.get(provider) ?? {
      provider,
      totalRuns: 0,
      readyRuns: 0,
      reviewRuns: 0,
      blockedRuns: 0,
      totalPromptCalls: 0,
      totalCostUsd: 0,
      modelCounts: new Map<string, number>(),
      failureStageCounts: new Map<string, number>(),
    }

    existing.totalRuns += 1
    if (project.llmConfiguration.releaseStatus === "ready") existing.readyRuns += 1
    else if (project.llmConfiguration.releaseStatus === "blocked") existing.blockedRuns += 1
    else existing.reviewRuns += 1

    const analytics = project.llmConfiguration.operationalAnalytics ?? project.llmConfiguration.loopReport?.operationalAnalytics
    existing.totalPromptCalls += analytics?.totalPromptCalls ?? 0
    existing.totalCostUsd += analytics?.totalCostUsd ?? 0

    if (project.llmConfiguration.model) {
      existing.modelCounts.set(
        project.llmConfiguration.model,
        (existing.modelCounts.get(project.llmConfiguration.model) ?? 0) + 1,
      )
    }

    for (const failure of project.llmConfiguration.providerFailures ?? []) {
      existing.failureStageCounts.set(
        failure.stageLabel,
        (existing.failureStageCounts.get(failure.stageLabel) ?? 0) + 1,
      )
    }

    accumulators.set(provider, existing)
  }

  return [...accumulators.values()]
    .map((entry) => ({
      provider: entry.provider,
      totalRuns: entry.totalRuns,
      readyRuns: entry.readyRuns,
      reviewRuns: entry.reviewRuns,
      blockedRuns: entry.blockedRuns,
      readyRate: entry.totalRuns > 0 ? Number((entry.readyRuns / entry.totalRuns).toFixed(2)) : 0,
      avgPromptCalls: entry.totalRuns > 0 ? Number((entry.totalPromptCalls / entry.totalRuns).toFixed(2)) : 0,
      avgCostUsd: entry.totalRuns > 0 ? Number((entry.totalCostUsd / entry.totalRuns).toFixed(4)) : 0,
      topModels: [...entry.modelCounts.entries()]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, 3)
        .map(([model]) => model),
      topFailureStages: [...entry.failureStageCounts.entries()]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, 3)
        .map(([stage]) => stage),
    }))
    .sort((left, right) => (
      right.readyRate - left.readyRate
      || right.totalRuns - left.totalRuns
      || left.provider.localeCompare(right.provider)
    ))
}

function collectIssueText(projects: UserProject[]) {
  return projects.flatMap((project) => [
    ...(project.llmConfiguration.providerFailures ?? []).map((failure) => [
      failure.stageLabel,
      failure.category ?? "",
      failure.headline ?? "",
      failure.reason,
      failure.suggestedAction ?? "",
      failure.affectedModel ?? failure.model ?? "",
      failure.limitSummary ?? "",
    ].filter(Boolean).join(": ")),
    ...(project.llmConfiguration.releaseJudgement?.blockers ?? []),
    ...(project.llmConfiguration.releaseJudgement?.warnings ?? []),
  ])
}

function summarizeProjectBucket(projects: UserProject[]) {
  if (projects.length === 0) {
    return "No provider-backed generation history is available for this slice yet."
  }

  const ready = projects.filter((project) => project.llmConfiguration.releaseStatus === "ready").length
  const blocked = projects.filter((project) => project.llmConfiguration.releaseStatus === "blocked").length
  const topRuntimes = [...new Map(
    projects.map((project) => [project.design.runtimePlan.label, 0]),
  ).keys()]
  return `${ready}/${projects.length} runs reached ready and ${blocked} were blocked. Recent runtime patterns include ${topRuntimes.slice(0, 2).join(", ") || "mixed runtimes"}.`
}

export function buildGenerationUsageIntelligence(input: GenerationUsageIntelligenceInput): GenerationUsageIntelligence {
  const currentUserProjects = (input.currentUserProjects ?? []).filter((project) => project.llmConfiguration.source === "user-key")
  const allProjects = ((input.allProjects && input.allProjects.length > 0) ? input.allProjects : currentUserProjects)
    .filter((project) => project.llmConfiguration.source === "user-key")
  const promptTokens = tokenize([input.prompt, input.genre, input.dimension ?? "", ...input.selectedFeatures].join(" "))
  const scoredRelevant = allProjects
    .map((project) => ({
      project,
      score: scoreHistoricalProject({
        project,
        promptTokens,
        genre: input.genre,
        dimension: input.dimension,
        selectedFeatures: input.selectedFeatures,
        selectedProvider: input.selectedProvider,
        selectedModel: input.selectedModel,
      }),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || right.project.createdAt.localeCompare(left.project.createdAt))

  const relevantProjects = (scoredRelevant.length > 0 ? scoredRelevant.map((entry) => entry.project) : allProjects)
    .slice(0, 12)
  const providerSnapshots = buildProviderSnapshots(relevantProjects.length > 0 ? relevantProjects : allProjects)
  const issueText = collectIssueText(relevantProjects.length > 0 ? relevantProjects : allProjects).join(" ").toLowerCase()
  const providerFailures = (relevantProjects.length > 0 ? relevantProjects : allProjects)
    .flatMap((project) => project.llmConfiguration.providerFailures ?? [])
  const rateLimitFailures = providerFailures.filter((failure) => failure.category === "rate_limit")
  const authFailures = providerFailures.filter((failure) => failure.category === "authentication")
  const quotaFailures = providerFailures.filter((failure) => failure.category === "quota")

  const suggestedProviders = unique([
    ...(input.selectedProvider && input.selectedProvider !== "local" ? [input.selectedProvider] : []),
    ...providerSnapshots.map((entry) => entry.provider),
  ]) as Array<Exclude<PromptProviderId, "local">>
  const suggestedModels = unique([
    ...(input.selectedModel ? [input.selectedModel] : []),
    ...providerSnapshots.flatMap((entry) => entry.topModels),
  ]).slice(0, 4)
  const manifestPressure = unique([
    ...(relevantProjects.some((project) => project.design.dimension === "3d")
      ? ["Keep explicit dimension, camera, and runtime intent locked through manifest synthesis because similar AI-backed runs often depend on those fields staying concrete."]
      : []),
    ...(issueText.match(/prompt drift|runtime|camera|3d|2d|dimension/) ? [
      "Reassert prompt-to-runtime fidelity before the final manifest lock, especially around camera, dimension, and archetype drift.",
    ] : []),
    ...(relevantProjects.filter((project) => project.llmConfiguration.releaseStatus === "ready").length > 0 ? [
      "Similar successful AI-backed runs should be treated as reference pressure for runtime shape and system depth, not as replacements for the creator brief.",
    ] : []),
  ]).slice(0, 5)
  const routingPressure = unique([
    ...(providerSnapshots.length > 0 ? [
      `Prefer fallback ordering that leans on the strongest recent ready-rate providers: ${suggestedProviders.join(", ")}.`,
    ] : []),
    ...(rateLimitFailures.length > 0 ? [
      "Similar runs hit provider-side rate limits, so fallback ordering should prefer models/providers with healthier recent throughput instead of retrying the same saturated model repeatedly.",
    ] : []),
    ...(authFailures.length > 0 ? [
      "Authentication failures have occurred on similar runs, so key presence and provider/model pairing should be validated before the loop starts.",
    ] : []),
    ...(quotaFailures.length > 0 ? [
      "Billing or credit failures have appeared on similar runs, so provider selection should stay ready to fail over before generation stalls.",
    ] : []),
    ...(issueText.match(/401|429|rate|auth|key|verification/) ? [
      "Keep provider fallback, key validation, and structured-output verification active because similar AI-backed runs hit provider-side failures.",
    ] : []),
    ...(input.selectedProvider && input.selectedProvider !== "local" ? [
      `The selected provider remains primary, but fallback ordering should still respect prior AI-backed stability patterns for ${input.selectedProvider}.`,
    ] : []),
  ]).slice(0, 5)
  const compilePressure = unique([
    ...(issueText.match(/compile|marker|namespace|inherit|generated\.h|class|file extension/) ? [
      "Raise compile repair pressure during manifest synthesis because prior AI-backed runs surfaced compile-surface issues.",
    ] : []),
    ...(relevantProjects.some((project) => project.llmConfiguration.loopReport?.compileGateSummary) ? [
      "Carry compile priorities through to manifest lock so execution has a concrete repair target if build verification fails.",
    ] : []),
  ]).slice(0, 4)
  const releasePressure = unique([
    ...(providerSnapshots.some((entry) => entry.blockedRuns > 0) ? [
      "Do not treat provider-backed manifest completion as enough on its own; keep release judgement pressure active when similar runs have blocked.",
    ] : []),
    ...(providerSnapshots.some((entry) => entry.reviewRuns > 0) ? [
      "Needs-review patterns from similar AI-backed runs should carry into release warnings instead of being silently ignored.",
    ] : []),
  ]).slice(0, 4)
  const failureWatchouts = unique([
    ...providerFailures.map((failure) => [
      failure.provider,
      failure.stageLabel,
      failure.category ? failure.category.replace(/_/g, " ") : "",
      failure.affectedModel ?? failure.model ?? "",
    ].filter(Boolean).join(": ")),
    ...providerFailures.flatMap((failure) => (failure.signals ?? []).map((signal) => `${failure.provider}: ${signal.label}`)),
    ...providerSnapshots.flatMap((entry) => entry.topFailureStages.map((stage) => `${entry.provider}: ${stage}`)),
    ...(issueText.match(/candidate|release|compile|brief/) ? ["Watch the exact stages that have historically failed on similar AI-backed runs before presenting the project."] : []),
  ]).slice(0, 6)

  return {
    summary: relevantProjects.length > 0
      ? `AI-usage memory found ${relevantProjects.length} relevant provider-backed runs that can guide manifest lock, fallback ordering, and release pressure.`
      : "No relevant provider-backed history was found, so this run becomes new AI-usage baseline data.",
    currentUserSummary: summarizeProjectBucket(currentUserProjects),
    globalSummary: summarizeProjectBucket(allProjects),
    relevantRuns: relevantProjects.length,
    suggestedProviders,
    suggestedModels,
    providerSnapshots,
    manifestPressure,
    routingPressure,
    compilePressure,
    releasePressure,
    failureWatchouts,
  }
}

export function formatUsageIntelligenceForPrompt(intelligence: GenerationUsageIntelligence) {
  return [
    `Usage summary: ${intelligence.summary}`,
    `Current user history: ${intelligence.currentUserSummary}`,
    `Global history: ${intelligence.globalSummary}`,
    `Suggested providers: ${intelligence.suggestedProviders.join(" | ") || "none"}`,
    `Suggested models: ${intelligence.suggestedModels.join(" | ") || "none"}`,
    `Manifest pressure: ${intelligence.manifestPressure.join(" | ") || "none"}`,
    `Routing pressure: ${intelligence.routingPressure.join(" | ") || "none"}`,
    `Compile pressure: ${intelligence.compilePressure.join(" | ") || "none"}`,
    `Release pressure: ${intelligence.releasePressure.join(" | ") || "none"}`,
    `Failure watchouts: ${intelligence.failureWatchouts.join(" | ") || "none"}`,
  ].join("\n")
}
