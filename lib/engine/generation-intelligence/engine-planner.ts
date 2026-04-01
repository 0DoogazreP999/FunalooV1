import type {
  GameDimension,
  GenerationEnginePlan,
  GenerationGraphicsPlan,
  GenerationRuntimeArchetype,
  Genre,
  TargetEngine,
} from "@/lib/engine/types"
import { takeTop, titleCase, unique } from "./shared"

function selectRecommendedEngine(input: {
  genre: Genre
  dimension: GameDimension
  promptSignals: string[]
  resolvedFeatures: string[]
  multiplayer: boolean
  runtimeArchetype: GenerationRuntimeArchetype
}) {
  if (
    input.dimension === "3d"
    && (
      input.resolvedFeatures.includes("rendering")
      || input.runtimeArchetype === "combat_mission"
      || input.runtimeArchetype === "survival_horde"
      || input.runtimeArchetype === "survival_expedition_3d"
      || input.runtimeArchetype === "action_operation_3d"
      || input.promptSignals.includes("aaa-production")
    )
  ) {
    return "unreal" as const
  }

  if (
    input.dimension !== "3d"
    && (
      ["platformer", "simulation", "strategy", "adventure"].includes(input.genre)
      || input.promptSignals.includes("farming-heavy")
      || input.promptSignals.includes("social-deduction")
      || input.promptSignals.includes("card-heavy")
      || input.promptSignals.includes("puzzle-heavy")
    )
  ) {
    return "godot" as const
  }

  if (
    input.promptSignals.includes("education-heavy")
    || input.promptSignals.includes("sports-heavy")
    || input.resolvedFeatures.includes("modding")
    || input.dimension === "hybrid"
  ) {
    return "unity" as const
  }

  if (!input.multiplayer && input.dimension !== "3d" && input.resolvedFeatures.length <= 4) {
    return "custom" as const
  }

  return input.dimension === "3d" ? "unreal" : "godot"
}

function engineStrengths(engine: TargetEngine) {
  switch (engine) {
    case "unreal":
      return [
        "High-end 3D rendering and material workflows",
        "Large combat and survival spaces with strong lighting control",
        "Fast path to cinematic presentation without abandoning gameplay readability",
      ]
    case "godot":
      return [
        "Best-in-class 2D and readable hybrid workflows",
        "Fast iteration for systemic, cozy, puzzle, and strategy-heavy games",
        "Lean scene composition that keeps UI and simulation state easy to reason about",
      ]
    case "unity":
      return [
        "Cross-platform flexibility for unusual blends and broad device targets",
        "Strong tooling for systems-heavy gameplay and plugin-driven iteration",
        "Good fit for sports, education, and mod-friendly content surfaces",
      ]
    default:
      return [
        "Maximum control over performance and determinism",
        "Good fit for specialized rulesets or stripped-down first playable slices",
        "Lets the team optimize only the systems the project actually needs",
      ]
  }
}

function engineFallbacks(engine: TargetEngine) {
  switch (engine) {
    case "unreal": return ["unity", "godot"] satisfies TargetEngine[]
    case "godot": return ["unity", "custom"] satisfies TargetEngine[]
    case "unity": return ["godot", "unreal"] satisfies TargetEngine[]
    default: return ["godot", "unity"] satisfies TargetEngine[]
  }
}

function engineRationale(input: {
  recommendedEngine: TargetEngine
  genre: Genre
  dimension: GameDimension
  graphicsPlan: GenerationGraphicsPlan
  runtimeArchetype: GenerationRuntimeArchetype
}) {
  const genreLabel = input.genre.replace(/_/g, " ")

  if (input.recommendedEngine === "unreal") {
    return `Recommended for this ${input.dimension.toUpperCase()} ${genreLabel} plan because ${input.graphicsPlan.renderPath.toLowerCase()} and the ${input.runtimeArchetype.replace(/_/g, " ")} slice benefit from stronger built-in rendering, lighting, and large-space presentation support.`
  }

  if (input.recommendedEngine === "godot") {
    return `Recommended for this ${input.dimension.toUpperCase()} ${genreLabel} plan because the project leans on readable mechanics, fast iteration, and a cleaner 2D or hybrid presentation rather than expensive visual overhead.`
  }

  if (input.recommendedEngine === "unity") {
    return `Recommended for this ${input.dimension.toUpperCase()} ${genreLabel} plan because the project needs broad content flexibility, tool/plugin friendliness, and a runtime that can support hybrid presentation styles gracefully.`
  }

  return `Recommended for this ${input.dimension.toUpperCase()} ${genreLabel} plan because the first playable slice is narrow enough to benefit from a specialized, low-overhead runtime with tight control over performance.`
}

export function planGenerationEngine(input: {
  genre: Genre
  dimension: GameDimension
  promptSignals: string[]
  resolvedFeatures: string[]
  multiplayer: boolean
  runtimeArchetype: GenerationRuntimeArchetype
  graphicsPlan: GenerationGraphicsPlan
}): GenerationEnginePlan {
  const recommendedEngine = selectRecommendedEngine(input)

  return {
    recommendedEngine,
    rationale: engineRationale({
      recommendedEngine,
      genre: input.genre,
      dimension: input.dimension,
      graphicsPlan: input.graphicsPlan,
      runtimeArchetype: input.runtimeArchetype,
    }),
    strengths: engineStrengths(recommendedEngine),
    criticalSubsystems: unique([
      ...takeTop(input.resolvedFeatures.map((feature) => titleCase(feature)), 5),
      input.dimension === "3d" ? "Scalable rendering" : "Readable 2D presentation",
      input.multiplayer ? "Session orchestration" : "Solo pacing stability",
    ]),
    scalingStrategy: unique([
      "Keep the runtime slice vertical and coherent before widening content breadth.",
      input.multiplayer
        ? "Scale session complexity after input, UI, and state sync remain stable."
        : "Scale simulation and content density only after frame pacing stays predictable.",
      "Prefer engine-native strengths for the first playable slice instead of forcing every subsystem at once.",
    ]),
    portabilityNotes: unique([
      `Fallback engines: ${engineFallbacks(recommendedEngine).map((engine) => titleCase(engine)).join(", ")}.`,
      input.graphicsPlan.scalabilityStrategy,
      "Keep gameplay data, content kits, and prompt-stage metadata engine-agnostic so the generation stack can pivot without losing intent.",
    ]),
    fallbackEngines: engineFallbacks(recommendedEngine),
  }
}
