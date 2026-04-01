import type {
  AssetGenerationPlan,
  GameDimension,
  GenerationGraphicsPlan,
  GenerationRuntimeArchetype,
  Genre,
} from "@/lib/engine/types"
import { takeTop, titleCase, unique } from "./shared"

function selectRenderPath(input: {
  dimension: GameDimension
  promptSignals: string[]
  runtimeArchetype: GenerationRuntimeArchetype
}) {
  if (input.dimension === "3d") {
    if (input.promptSignals.includes("heist-heavy") || input.promptSignals.includes("immersive-sim")) return "Systemic infiltration 3D"
    if (input.promptSignals.includes("investigation-heavy")) return "Forensic exploration 3D"
    if (input.promptSignals.includes("archaeology-heavy") || input.promptSignals.includes("restoration-heavy")) return "Curatorial exploration 3D"
    if (input.promptSignals.includes("sports-heavy")) return "Broadcast competitive 3D"
    if (input.promptSignals.includes("puzzle-heavy")) return "Immersive chamber 3D"
    if (input.promptSignals.includes("social-deduction")) return "Readable social 3D"
    if (input.runtimeArchetype === "survival_expedition_3d") return "Expedition survival 3D"
    if (input.runtimeArchetype === "action_operation_3d") return "Cinematic operation 3D"
    if (input.runtimeArchetype === "survival_horde") return "Immersive hazard-lit 3D"
    if (input.runtimeArchetype === "combat_mission") return "Stylized action 3D"
    return "Exploration-forward 3D"
  }

  if (input.promptSignals.includes("card-heavy") || input.promptSignals.includes("social-deduction")) {
    return "Board-first 2D"
  }

  if (input.promptSignals.includes("archaeology-heavy") || input.promptSignals.includes("restoration-heavy")) {
    return "Curatorial simulation 2D"
  }

  if (input.promptSignals.includes("farming-heavy") || input.promptSignals.includes("simulation-heavy")) {
    return "Illustrated simulation 2D"
  }

  if (input.promptSignals.includes("puzzle-heavy")) {
    return "Readable chamber 2D"
  }

  if (input.promptSignals.includes("music-rhythm")) {
    return "Timing-led 2D"
  }

  return input.dimension === "hybrid" ? "Layered hybrid presentation" : "Stylized readable 2D"
}

function selectLightingModel(input: {
  dimension: GameDimension
  promptSignals: string[]
  runtimeArchetype: GenerationRuntimeArchetype
}) {
  if (input.dimension === "3d") {
    if (input.promptSignals.includes("horror") || input.promptSignals.includes("tension-heavy")) {
      return "Directional key lights, fog falloff, and landmark contrast that preserve threat readability before spectacle."
    }

    if (input.promptSignals.includes("sports-heavy")) {
      return "Broadcast arena lighting with bright rule-critical lanes, clean player silhouettes, and readable reset pockets."
    }

    if (input.promptSignals.includes("heist-heavy") || input.promptSignals.includes("immersive-sim")) {
      return "Layered security lighting with readable patrol silhouettes, stealth-safe shadow pockets, and strong contrast between public and secure space."
    }

    if (input.promptSignals.includes("investigation-heavy")) {
      return "Focused clue lighting with neutral search space, evidence accents, and readable reveal hotspots instead of theatrical darkness."
    }

    if (input.runtimeArchetype === "survival_horde") {
      return "Low sun, firelight, and emergency practicals with strong depth cues for pressure spikes and recovery pockets."
    }

    if (input.runtimeArchetype === "survival_expedition_3d") {
      return "Weathered daylight, emergency practicals, and deep landmark contrast that keep scavenging routes and safe-return anchors readable."
    }

    if (input.runtimeArchetype === "action_operation_3d") {
      return "Cinematic mission lighting with strong silhouettes, cover reads, and objective landmarks before spectacle-heavy effects."
    }

    return "Stylized high-contrast lighting with one clear gameplay key light and controlled accent fog."
  }

  if (input.promptSignals.includes("farming-heavy")) {
    return "Soft day-cycle gradients with seasonal color shifts and low-noise shadows."
  }

  if (input.promptSignals.includes("card-heavy") || input.promptSignals.includes("social-deduction")) {
    return "Flat readability-first lighting where board state and shared information stay visible at a glance."
  }

  return "High-clarity 2D lighting with contrast reserved for goals, hazards, and route landmarks."
}

function selectUiPresentation(input: {
  genre: Genre
  promptSignals: string[]
  runtimeArchetype: GenerationRuntimeArchetype
}) {
  if (input.promptSignals.includes("sports-heavy")) {
    return "Broadcast-style UI with score, possession, timing, and formation state always visible."
  }

  if (input.promptSignals.includes("social-deduction")) {
    return "Suspicion-first UI with meeting, task, and reveal states separated clearly."
  }

  if (input.promptSignals.includes("farming-heavy")) {
    return "Ledger-light cozy UI with strong daily rhythm cues and low cognitive overhead."
  }

  if (input.promptSignals.includes("investigation-heavy")) {
    return "Evidence-first UI with clue chains, suspect pressure, and theory state readable without blocking the scene."
  }

  if (input.promptSignals.includes("archaeology-heavy") || input.promptSignals.includes("restoration-heavy")) {
    return "Workshop-friendly UI with artifact condition, tool state, and curation progress surfaced cleanly."
  }

  if (input.runtimeArchetype === "combat_mission" || input.runtimeArchetype === "survival_horde") {
    return "Moment-to-moment HUD that surfaces risk, ammo, stamina, and route cues without drowning the screen."
  }

  if (input.runtimeArchetype === "action_operation_3d" || input.runtimeArchetype === "survival_expedition_3d") {
    return "Mission-grade HUD that keeps objective state, traversal cues, ammo, vitals, and interact prompts visible without hiding the world."
  }

  if (input.genre === "strategy") {
    return "Command-layer UI that favors board state, control values, and predictable action feedback."
  }

  return "Readable genre-fit UI that preserves primary verbs before cosmetic density."
}

function selectRuntimePresentation(input: {
  dimension: GameDimension
  promptSignals: string[]
  runtimeArchetype: GenerationRuntimeArchetype
}) {
  if (input.promptSignals.includes("sports-heavy")) return "clean_competitive"
  if (input.promptSignals.includes("farming-heavy")) return "warm_simulation"
  if (input.promptSignals.includes("social-deduction")) return "social_readability"
  if (input.promptSignals.includes("puzzle-heavy")) return "logic_chambers"
  if (input.runtimeArchetype === "survival_expedition_3d") return "expedition_survival"
  if (input.runtimeArchetype === "action_operation_3d") return "cinematic_assault"
  if (input.runtimeArchetype === "survival_horde") return "hazard_pressure"
  if (input.runtimeArchetype === "combat_mission") return "kinetic_action"
  return input.dimension === "3d" ? "cinematic_playable" : "stylized_readable"
}

export function planGenerationGraphics(input: {
  genre: Genre
  dimension: GameDimension
  promptSignals: string[]
  resolvedFeatures: string[]
  runtimeArchetype: GenerationRuntimeArchetype
  environmentThemes: string[]
  assetPlan: AssetGenerationPlan
}): GenerationGraphicsPlan {
  const renderPath = selectRenderPath(input)
  const lightingModel = selectLightingModel(input)
  const uiPresentation = selectUiPresentation(input)
  const runtimePresentation = selectRuntimePresentation(input)
  const visualIdentity = `Anchor the look around ${input.environmentThemes.slice(0, 2).join(" and ").toLowerCase()} with ${input.assetPlan.productionStyle.toLowerCase()}.`
  const materialStrategy = `Favor ${takeTop(input.assetPlan.materialPalette, 3).join(", ").toLowerCase()} materials and keep silhouette readability ahead of surface noise.`
  const postProcessStyle =
    input.dimension === "3d"
      ? "Keep post-processing restrained: depth, atmosphere, and camera response should clarify space before adding cinematic treatment."
      : "Use post-processing sparingly so UI, board state, and interaction lanes remain crisp."
  const animationFocus =
    input.assetPlan.animationNeeds.length > 0
      ? `Prioritize ${takeTop(input.assetPlan.animationNeeds, 3).join(", ").toLowerCase()} so the first playable slice communicates state changes immediately.`
      : "Prioritize state readability, anticipation, and quick recovery beats over dense flourish animation."

  return {
    renderPath,
    visualIdentity,
    lightingModel,
    materialStrategy,
    postProcessStyle,
    animationFocus,
    uiPresentation,
    runtimePresentation,
    scalabilityStrategy: "Scale effects, particles, and shadow complexity down before sacrificing silhouettes, UI clarity, or input response.",
    lowSpecFallbacks: unique([
      "Reduce particle counts and expensive screen-wide overlays first.",
      input.dimension === "3d" ? "Prefer baked or simplified lighting over dynamic full-scene effects on low-spec runs." : "Remove parallax and background animation layers before touching primary gameplay planes.",
      "Lower decoration density and ambient animation before touching landmarks or interactables.",
      input.resolvedFeatures.includes("rendering") ? "Keep camera readability and landmark contrast even when material complexity is reduced." : "Keep UI refresh and primary gameplay state updates responsive under load.",
    ]),
    highSpecEnhancements: unique([
      input.dimension === "3d" ? "Add higher-quality atmosphere, shadow detail, and material response in hero spaces." : "Add richer background motion, palette shifts, and celebratory feedback in payoff moments.",
      "Increase environmental storytelling props only after route clarity is already stable.",
      "Allow premium animation blending and polish passes in hubs, reveals, and capstone moments.",
    ]),
    gracefulDegradation: unique([
      "Preserve readable input-to-response timing across all quality levels.",
      "Keep objective state, threat state, and interactables visible before cosmetic detail.",
      input.promptSignals.includes("social-deduction")
        ? "Meeting, vote, and suspicion information must remain legible even when the scene is simplified."
        : "Primary genre verbs must remain readable even when visual density is reduced.",
      "Reduce breadth of visual dressing before reducing the clarity of mechanics or navigation.",
    ]),
    frameBudgetPriorities: unique([
      "Input latency",
      "Player and objective readability",
      "Animation state clarity",
      ...input.resolvedFeatures.slice(0, 2).map((feature) => `${titleCase(feature)} feedback`),
      "Post-processing last",
    ]),
  }
}
