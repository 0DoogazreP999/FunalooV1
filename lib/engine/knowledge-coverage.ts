import {
  OPEN_SOURCE_ENGINES,
  RESEARCH_DOMAINS,
  STANDALONE_LIBS,
  TRAINING_DOMAINS,
} from "@/lib/nexus-data"
import type {
  GameDimension,
  GenerationKnowledgeCoverage,
  GenerationKnowledgeGap,
  GenerationKnowledgeRiskSummary,
  GenerationKnowledgeSignal,
  GenerationRuntimeArchetype,
  Genre,
  TargetEngine,
} from "@/lib/engine/types"

interface GenerationKnowledgeCoverageInput {
  prompt: string
  genre: Genre
  selectedFeatures: string[]
  dimension?: GameDimension
  multiplayer?: boolean
  targetEngine?: TargetEngine
  runtimeArchetype?: GenerationRuntimeArchetype
  seed?: string
}

interface GenerationKnowledgeRiskInput {
  coverage?: GenerationKnowledgeCoverage
  knowledgeFit?: "strong" | "balanced" | "risky"
  dimension?: GameDimension
  targetEngine?: TargetEngine
  runtimeArchetype?: GenerationRuntimeArchetype
}

type KnowledgeRule = {
  id: string
  promptPatterns?: RegExp[]
  features?: string[]
  genres?: Genre[]
  dimensions?: GameDimension[]
  engines?: TargetEngine[]
  runtimes?: GenerationRuntimeArchetype[]
}

const RESEARCH_RULES: KnowledgeRule[] = [
  { id: "engine_architecture", genres: ["fps", "rpg", "simulation", "strategy", "survival", "sandbox"], dimensions: ["3d", "hybrid"] },
  { id: "rendering_graphics", promptPatterns: [/3d|lighting|render|visual|camera|cinematic|first-person|third-person|photoreal/i], dimensions: ["3d", "hybrid"] },
  { id: "procedural_generation", promptPatterns: [/procedural|roguelike|sandbox|survival|world|terrain|city|generation/i], features: ["world_gen"] },
  { id: "multiplayer_networking", promptPatterns: [/co-op|coop|multiplayer|online|pvp|mmo|raid|party/i], features: ["networking"], genres: ["mmo"] },
  { id: "ai_game_agents", promptPatterns: [/npc|companion|villager|stealth|social deduction|dialogue|faction|zombie|enemy/i], features: ["ai_npc", "dialogue"] },
  { id: "physics_simulation", promptPatterns: [/vehicle|racing|platformer|destruction|physics|parkour|movement/i], genres: ["racing", "platformer"] },
  { id: "asset_pipeline", promptPatterns: [/character|props|environment|3d|animation|asset/i], features: ["inventory", "world_gen"], dimensions: ["3d", "hybrid"] },
  { id: "audio_engine", promptPatterns: [/audio|music|horror|rhythm|voice|ambient/i], features: ["audio"], genres: ["horror"] },
  { id: "ui_framework", promptPatterns: [/ui|hud|menu|management|sim|strategy|inventory|builder/i], features: ["ui", "inventory"], genres: ["simulation", "strategy"] },
  { id: "optimization", promptPatterns: [/large|massive|open world|60fps|performance|scale|hundreds|thousands/i], dimensions: ["3d", "hybrid"] },
  { id: "llm_finetuning", promptPatterns: [/agent|ai generated|prompt/i] },
  { id: "ai_code_generation", promptPatterns: [/generated|compile|code|agent/i] },
  { id: "unreal_cpp", engines: ["unreal"], dimensions: ["3d", "hybrid"] },
  { id: "unreal_blueprints", engines: ["unreal"] },
]

const ENGINE_PATTERN_RULES: Array<KnowledgeRule & { engineNames: string[] }> = [
  { id: "rendering_graphics", dimensions: ["3d", "hybrid"], engineNames: ["O3DE", "Flax", "Stride"] },
  { id: "ui_framework", genres: ["simulation", "strategy", "platformer"], engineNames: ["Godot", "Fyrox"] },
  { id: "engine_architecture", dimensions: ["3d", "hybrid"], engineNames: ["Bevy", "O3DE"] },
  { id: "procedural_generation", features: ["world_gen"], engineNames: ["Bevy", "Godot"] },
]

const LIBRARY_RULES: Array<KnowledgeRule & { libraryNames: string[] }> = [
  { id: "physics_simulation", libraryNames: ["Jolt Physics", "Rapier", "Bullet3"] },
  { id: "multiplayer_networking", libraryNames: ["GameNetworkingSockets", "ENet", "yojimbo"] },
  { id: "audio_engine", libraryNames: ["Steam Audio", "SoLoud"] },
  { id: "ai_game_agents", libraryNames: ["RecastNavigation", "BehaviorTree.CPP"] },
  { id: "procedural_generation", libraryNames: ["FastNoiseLite"] },
]

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function scoreRule(rule: KnowledgeRule, input: GenerationKnowledgeCoverageInput) {
  let score = 0
  const normalizedPrompt = input.prompt.toLowerCase()

  if (rule.promptPatterns?.some((pattern) => pattern.test(normalizedPrompt))) score += 2
  if (rule.features?.some((feature) => input.selectedFeatures.includes(feature))) score += 2
  if (rule.genres?.includes(input.genre)) score += 1
  if (input.dimension && rule.dimensions?.includes(input.dimension)) score += 2
  if (input.targetEngine && rule.engines?.includes(input.targetEngine)) score += 2
  if (input.runtimeArchetype && rule.runtimes?.includes(input.runtimeArchetype)) score += 2
  if (input.multiplayer && rule.id === "multiplayer_networking") score += 2

  return score
}

function buildResearchSignals(input: GenerationKnowledgeCoverageInput) {
  const signals: GenerationKnowledgeSignal[] = []
  const gaps: GenerationKnowledgeGap[] = []

  RESEARCH_RULES.forEach((rule) => {
    const score = scoreRule(rule, input)
    if (score <= 0) return

    const research = RESEARCH_DOMAINS.find((entry) => entry.name === rule.id)
    const training = TRAINING_DOMAINS.find((entry) => entry.name === rule.id)
    if (!research) return

    signals.push({
      id: `research:${research.name}`,
      label: research.displayName,
      category: "research_domain",
      relevance: score >= 4 ? "high" : "medium",
      reason: `The prompt leans on ${research.displayName.toLowerCase()}.`,
      status: research.status,
      quality: training?.quality,
    })

    if (research.status !== "complete") {
      gaps.push({
        id: `gap:research:${research.name}`,
        label: research.displayName,
        severity: score >= 4 ? "high" : "medium",
        reason: `${research.displayName} research is still ${research.status}, so this generation should carry stronger verification pressure in that area.`,
        action: `Increase prompt specificity, verification focus, and repair pressure around ${research.displayName.toLowerCase()}.`,
      })
    }

    if (training && (training.status !== "complete" || training.quality < 0.86)) {
      gaps.push({
        id: `gap:training:${training.name}`,
        label: training.displayName,
        severity: score >= 4 ? "high" : "medium",
        reason: `${training.displayName} training quality is ${training.quality.toFixed(2)} with status ${training.status}.`,
        action: `Add compile, runtime, and eval checks that specifically defend ${training.displayName.toLowerCase()} behavior.`,
      })
    }
  })

  return {
    signals,
    gaps,
  }
}

function buildEngineSignals(input: GenerationKnowledgeCoverageInput) {
  const signals: GenerationKnowledgeSignal[] = []

  ENGINE_PATTERN_RULES.forEach((rule) => {
    if (scoreRule(rule, input) <= 0) return

    rule.engineNames.forEach((engineName) => {
      const engine = OPEN_SOURCE_ENGINES.find((entry) => entry.name === engineName)
      if (!engine) return

      signals.push({
        id: `engine:${engine.name}`,
        label: engine.name,
        category: "engine_pattern",
        relevance: input.dimension === "3d" && engine.name !== "Godot" ? "high" : "medium",
        reason: `Use ${engine.name} patterns for ${engine.absorbed.slice(0, 2).join(", ").toLowerCase()}.`,
        quality: Number(engine.contributors) > 300 ? 0.9 : 0.84,
      })
    })
  })

  return signals
}

function buildLibrarySignals(input: GenerationKnowledgeCoverageInput) {
  const signals: GenerationKnowledgeSignal[] = []

  LIBRARY_RULES.forEach((rule) => {
    if (scoreRule(rule, input) <= 0) return

    rule.libraryNames.forEach((libraryName) => {
      const library = STANDALONE_LIBS.find((entry) => entry.name === libraryName)
      if (!library) return

      signals.push({
        id: `library:${library.name}`,
        label: library.name,
        category: "library_pattern",
        relevance: rule.id === "multiplayer_networking" || rule.id === "physics_simulation" ? "high" : "medium",
        reason: library.description,
      })
    })
  })

  return signals
}

export function buildGenerationKnowledgeCoverage(input: GenerationKnowledgeCoverageInput): GenerationKnowledgeCoverage {
  const research = buildResearchSignals(input)
  const engineSignals = buildEngineSignals(input)
  const librarySignals = buildLibrarySignals(input)
  const relevantSignals = [
    ...research.signals,
    ...engineSignals,
    ...librarySignals,
  ]
    .sort((left, right) => {
      const relevanceWeight = (value: GenerationKnowledgeSignal["relevance"]) => value === "high" ? 2 : 1
      return relevanceWeight(right.relevance) - relevanceWeight(left.relevance)
    })
    .slice(0, 10)

  const severityWeight = (value: GenerationKnowledgeGap["severity"]) => value === "high" ? 3 : value === "medium" ? 2 : 1
  const gapWarnings = [...research.gaps]
    .sort((left, right) => {
      const engineBoost = (gap: GenerationKnowledgeGap) => (
        input.targetEngine === "unreal" && /unreal/i.test(gap.id)
      ) ? 2 : 0

      return (severityWeight(right.severity) + engineBoost(right)) - (severityWeight(left.severity) + engineBoost(left))
    })
    .slice(0, 6)
  const coverageScore = Math.max(35, Math.min(96, 84 - gapWarnings.length * 8 + relevantSignals.filter((signal) => signal.relevance === "high").length * 3))
  const promptGuidance = unique([
    ...relevantSignals.map((signal) => `Bring forward ${signal.label} context because ${signal.reason}`),
    ...gapWarnings.map((gap) => `Do not assume ${gap.label} is solved; ${gap.action}`),
  ]).slice(0, 6)
  const compileGuidance = unique([
    ...(input.targetEngine === "unreal" ? [
      "Increase compile marker, namespace, and engine inheritance checks for Unreal-facing files.",
    ] : []),
    ...(input.dimension === "3d" ? [
      "Keep render-path, camera, and runtime-specific asset coverage visible in compile-readiness assets.",
    ] : [
      "Keep UI, interaction, and content-loop coverage visible in compile-readiness assets.",
    ]),
    ...gapWarnings.map((gap) => gap.action),
  ]).slice(0, 5)
  const verificationFocus = unique([
    ...gapWarnings.map((gap) => gap.label),
    ...relevantSignals
      .filter((signal) => signal.relevance === "high")
      .map((signal) => signal.label),
    ...(input.runtimeArchetype ? [input.runtimeArchetype.replace(/_/g, " ")] : []),
  ]).slice(0, 6)
  const recommendedContext = unique([
    ...relevantSignals.map((signal) => signal.label),
    ...promptGuidance,
  ]).slice(0, 8)

  return {
    summary: gapWarnings.length > 0
      ? `Knowledge coverage is strong but still needs extra guardrails around ${gapWarnings.slice(0, 2).map((gap) => gap.label).join(" and ")}.`
      : "Knowledge coverage is aligned with the current prompt and can be passed into the loop as focused advisory context.",
    coverageScore,
    relevantSignals,
    gapWarnings,
    promptGuidance,
    compileGuidance,
    verificationFocus,
    recommendedContext,
  }
}

export function formatKnowledgeCoverageForPrompt(coverage: GenerationKnowledgeCoverage) {
  return [
    `Coverage summary: ${coverage.summary}`,
    `Coverage score: ${coverage.coverageScore}`,
    `Relevant signals: ${coverage.relevantSignals.map((signal) => `${signal.label} (${signal.relevance})`).join(" | ") || "none"}`,
    `Gap warnings: ${coverage.gapWarnings.map((gap) => `${gap.label}: ${gap.reason}`).join(" | ") || "none"}`,
    `Prompt guidance: ${coverage.promptGuidance.join(" | ") || "none"}`,
    `Compile guidance: ${coverage.compileGuidance.join(" | ") || "none"}`,
    `Verification focus: ${coverage.verificationFocus.join(" | ") || "none"}`,
  ].join("\n")
}

export function buildGenerationKnowledgeRiskSummary(input: GenerationKnowledgeRiskInput): GenerationKnowledgeRiskSummary {
  const coverage = input.coverage
  if (!coverage) {
    return {
      level: "aligned",
      summary: "No explicit knowledge-risk summary was needed because no focused knowledge coverage was recorded for this run.",
      blockers: [],
      warnings: [],
      critiquePressure: [],
      repairPressure: [],
      releasePressure: [],
    }
  }

  const highGaps = coverage.gapWarnings.filter((gap) => gap.severity === "high")
  const mediumGaps = coverage.gapWarnings.filter((gap) => gap.severity === "medium")
  const unrealPressure = input.targetEngine === "unreal" && coverage.gapWarnings.some((gap) => /unreal/i.test(gap.id) || /unreal/i.test(gap.label))
  const threeDimensionalPressure = input.dimension === "3d" && coverage.gapWarnings.some((gap) => /render|graphics|asset|architecture/i.test(gap.id) || /render|graphics|asset|architecture/i.test(gap.label))

  let riskScore = 0
  if (input.knowledgeFit === "balanced") riskScore += 1
  if (input.knowledgeFit === "risky") riskScore += 3
  riskScore += Math.min(4, highGaps.length * 2 + mediumGaps.length)
  if (unrealPressure) riskScore += 1
  if (threeDimensionalPressure) riskScore += 1

  const level: GenerationKnowledgeRiskSummary["level"] = riskScore >= 6
    ? "risky"
    : riskScore >= 3
      ? "watch"
      : "aligned"

  const warnings = unique([
    ...coverage.gapWarnings.slice(0, 4).map((gap) => `${gap.label}: ${gap.reason}`),
    ...(input.knowledgeFit === "balanced" ? ["The chosen direction is only moderately aligned with the strongest covered engine/runtime patterns."] : []),
    ...(input.knowledgeFit === "risky" ? ["The chosen direction leans on weaker-covered domains and should trigger stronger critique, repair, and release review."] : []),
  ]).slice(0, 6)

  const blockers = level === "risky"
    ? unique([
        ...highGaps.slice(0, 3).map((gap) => `${gap.label} still needs explicit guardrails before release.`),
        ...(input.knowledgeFit === "risky" ? ["Do not release a risky-fit candidate without extra repair pressure and verification focus."] : []),
      ]).slice(0, 4)
    : []

  const critiquePressure = unique([
    ...coverage.promptGuidance,
    ...coverage.gapWarnings.slice(0, 4).map((gap) => `Challenge any design move that hand-waves ${gap.label.toLowerCase()}; ${gap.action}`),
    ...(input.knowledgeFit === "balanced" ? ["Push for a tighter mapping between the chosen runtime and the strongest covered engine/library signals."] : []),
    ...(input.knowledgeFit === "risky" ? ["Assume the current choice is fragile until the runtime, compile surface, and system coverage are defended explicitly."] : []),
  ]).slice(0, 8)

  const repairPressure = unique([
    ...coverage.compileGuidance,
    ...coverage.gapWarnings.slice(0, 4).map((gap) => gap.action),
    ...(input.runtimeArchetype ? [`Keep the ${input.runtimeArchetype.replace(/_/g, " ")} runtime concrete in files, systems, and verification assets.`] : []),
    ...(input.knowledgeFit === "risky" ? ["Prefer the strongest covered engine/runtime patterns instead of adding speculative subsystems that increase drift."] : []),
  ]).slice(0, 8)

  const releasePressure = unique([
    ...coverage.verificationFocus.map((focus) => `Release review should explicitly verify ${focus}.`),
    ...(blockers.length > 0 ? blockers : []),
    ...(input.dimension === "3d" ? ["3D generations must keep render path, camera fidelity, and runtime-specific compile markers visible before release."] : []),
  ]).slice(0, 8)

  const summary = level === "risky"
    ? `Knowledge pressure is high${input.runtimeArchetype ? ` for the ${input.runtimeArchetype.replace(/_/g, " ")} runtime` : ""}; critique and repair should stay aggressive before release.`
    : level === "watch"
      ? "Knowledge pressure is elevated enough to keep extra critique and repair guardrails active."
      : "Knowledge pressure is aligned with the covered engine/runtime patterns and can stay advisory."

  return {
    level,
    summary,
    blockers,
    warnings,
    critiquePressure,
    repairPressure,
    releasePressure,
  }
}

export function formatKnowledgeRiskForPrompt(summary: GenerationKnowledgeRiskSummary) {
  return [
    `Knowledge risk level: ${summary.level}`,
    `Summary: ${summary.summary}`,
    `Blockers: ${summary.blockers.join(" | ") || "none"}`,
    `Warnings: ${summary.warnings.join(" | ") || "none"}`,
    `Critique pressure: ${summary.critiquePressure.join(" | ") || "none"}`,
    `Repair pressure: ${summary.repairPressure.join(" | ") || "none"}`,
    `Release pressure: ${summary.releasePressure.join(" | ") || "none"}`,
  ].join("\n")
}
