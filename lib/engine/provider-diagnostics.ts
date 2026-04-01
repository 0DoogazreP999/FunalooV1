import type {
  GenerationOperationalAnalytics,
  GenerationProviderDiagnosticsSummary,
  GenerationProviderFailure,
  GenerationProviderFailureSeverity,
} from "@/lib/engine/types"

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function severityRank(severity: GenerationProviderFailureSeverity) {
  switch (severity) {
    case "critical":
      return 4
    case "error":
      return 3
    case "warning":
      return 2
    default:
      return 1
  }
}

function getHighestSeverity(failures: GenerationProviderFailure[]): GenerationProviderFailureSeverity {
  if (failures.length === 0) return "info"
  return failures.reduce<GenerationProviderFailureSeverity>((highest, failure) => (
    severityRank(failure.severity ?? "error") > severityRank(highest)
      ? (failure.severity ?? "error")
      : highest
  ), "info")
}

function buildSummarySentence(input: {
  totalFailures: number
  unresolvedFailures: number
  recoveredFailures: number
  categories: string[]
  highestSeverity: GenerationProviderFailureSeverity
}) {
  if (input.totalFailures === 0) {
    return "No provider failures were recorded for this generation."
  }

  const categoryText = input.categories.length > 0
    ? input.categories.slice(0, 3).map((value) => value.replace(/_/g, " ")).join(", ")
    : "uncategorized issues"

  return `${input.totalFailures} provider failure${input.totalFailures === 1 ? "" : "s"} were recorded. ${input.unresolvedFailures} remain unresolved, ${input.recoveredFailures} recovered through retries or fallback routing, and the highest severity is ${input.highestSeverity}. Main categories: ${categoryText}.`
}

export function buildGenerationProviderDiagnosticsSummary(input: {
  failures?: GenerationProviderFailure[]
  operationalAnalytics?: GenerationOperationalAnalytics | null
}): GenerationProviderDiagnosticsSummary {
  const failures = input.failures ?? []
  const totalFailures = failures.length
  const unresolvedFailures = failures.filter((failure) => !failure.recovered).length
  const recoveredFailures = failures.filter((failure) => failure.recovered).length
  const finalFailures = failures.filter((failure) => failure.final && !failure.recovered).length
  const categories = unique(failures.map((failure) => failure.category ?? "unknown")) as GenerationProviderDiagnosticsSummary["categories"]
  const retryStrategies = unique(failures.map((failure) => failure.retryStrategy ?? "manual_review")) as GenerationProviderDiagnosticsSummary["retryStrategies"]
  const statusFamilies = unique(failures.map((failure) => failure.statusFamily ?? "4xx")) as GenerationProviderDiagnosticsSummary["statusFamilies"]
  const affectedModels = unique(failures.map((failure) => failure.affectedModel ?? failure.model ?? ""))
  const healthSignals = unique([
    ...failures.flatMap((failure) => (failure.signals ?? []).map((signal) => `${signal.label}: ${signal.detail}`)),
    ...(input.operationalAnalytics?.providerHealthSignals ?? []),
  ])
  const actionItems = unique([
    ...failures.map((failure) => failure.suggestedAction ?? ""),
    ...failures.flatMap((failure) => (failure.signals ?? []).map((signal) => signal.action ?? "")),
  ])
  const hotspots = unique([
    ...failures
      .filter((failure) => !failure.recovered)
      .map((failure) => `${failure.stageLabel} · ${failure.provider}${failure.affectedModel ? ` · ${failure.affectedModel}` : ""}: ${failure.headline ?? failure.reason}`),
    ...(input.operationalAnalytics?.failureHotspots ?? []),
  ])

  const highestSeverity = getHighestSeverity(failures)

  return {
    summary: buildSummarySentence({
      totalFailures,
      unresolvedFailures,
      recoveredFailures,
      categories,
      highestSeverity,
    }),
    highestSeverity,
    totalFailures,
    unresolvedFailures,
    recoveredFailures,
    finalFailures,
    categories,
    retryStrategies,
    statusFamilies,
    affectedModels,
    healthSignals,
    actionItems,
    hotspots,
  }
}
