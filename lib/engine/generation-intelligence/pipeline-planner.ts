import type {
  GameDimension,
  GenerationPipelinePhaseBudget,
  GenerationPipelinePlan,
  GenerationRuntimeArchetype,
  Genre,
} from "@/lib/engine/types"

function buildPhase(name: string, minutes: number, goal: string, outputs: string[]): GenerationPipelinePhaseBudget {
  return {
    name,
    minutes,
    goal,
    outputs,
  }
}

function runtimeSpecificTracks(archetype: GenerationRuntimeArchetype) {
  switch (archetype) {
    case "rpg_adventure":
      return ["Quest authoring", "Character progression tuning", "Exploration and discovery tuning"]
    case "racing_sim":
      return ["Track authoring", "Vehicle physics tuning", "AI opponent tuning"]
    case "stealth_infiltration":
      return ["Level authoring", "Guard patrol and AI tuning", "Gadget and ability tuning"]
    case "puzzle_solver":
      return ["Puzzle authoring", "Hint system tuning", "Progression and difficulty tuning"]
    case "survival_expedition_3d":
      return ["3D scavenging district authoring", "Safehouse upgrade and repair tuning", "Zombie pressure and extraction tuning"]
    case "action_operation_3d":
      return ["Objective chain authoring", "3D combat-space readability tuning", "Extraction and recovery pacing"]
    case "survival_horde":
      return ["Scavenge loop authoring", "Threat and wave tuning", "Shelter and repair tuning"]
    case "homestead_life":
      return ["Crop and day-cycle simulation", "Village routine tuning", "Economy and reward balancing"]
    case "strategy_command":
      return ["Board-state authoring", "Economy graph tuning", "Sector consequence tuning"]
    case "journey_route":
      return ["Route leg authoring", "Stop-event tuning", "Resource pacing"]
    default:
      return ["Encounter authoring", "Objective scripting", "Combat-space tuning"]
  }
}

export function planGenerationPipeline(input: {
  genre: Genre
  dimension: GameDimension
  promptSignals: string[]
  resolvedFeatures: string[]
  scopeScale: "focused" | "expanded" | "limitless"
  runtimeArchetype: GenerationRuntimeArchetype
  scope: "small" | "medium" | "large"
}): GenerationPipelinePlan {
  const baseTargetMinutes =
    input.scope === "small"
      ? 30
      : input.scope === "medium"
        ? 60
        : 90

  const runtimePremium =
    input.runtimeArchetype === "survival_expedition_3d" || input.runtimeArchetype === "action_operation_3d"
      ? 5
      : 0
  const featurePremium = input.resolvedFeatures.length >= 6 ? 3 : 0
  const targetMinutes = Math.min(90, baseTargetMinutes + runtimePremium + featurePremium)
  const threeD = input.dimension === "3d"
  const phaseBudgets: GenerationPipelinePhaseBudget[] = [
    buildPhase("intent-lock", 3, "Freeze genre, dimension, runtime archetype, and anti-drift constraints.", [
      "Prompt summary",
      "Runtime archetype",
      "Negative constraints",
    ]),
    buildPhase("taxonomy-and-world", targetMinutes >= 40 ? 6 : 4, "Resolve systems, map shape, and interaction rules before code generation.", [
      "Resolved features",
      "Map archetype",
      "World structure",
    ]),
    buildPhase("loop-and-runtime", threeD ? (targetMinutes >= 40 ? 8 : 6) : (targetMinutes >= 40 ? 6 : 4), "Author the first playable loop around the chosen runtime contract.", [
      "Gameplay loop summary",
      "Objective flow",
      "Input model",
    ]),
    buildPhase("assets-and-kits", threeD ? (targetMinutes >= 40 ? 8 : 6) : (targetMinutes >= 40 ? 6 : 4), "Assemble a reusable asset kit for characters, props, and environments.", [
      "Character blueprints",
      "Prop families",
      "Environment kit",
    ]),
    buildPhase("system-scaffolding", targetMinutes >= 40 ? 10 : 6, "Generate the genre-specific system pack instead of one generic gameplay shell.", [
      "Supplemental systems",
      "Feature modules",
      "Runtime support systems",
    ]),
    buildPhase("assembly-and-playtest", targetMinutes >= 40 ? 8 : 5, "Hook the systems together and tune the first complete playable slice.", [
      "Playable runtime",
      "HUD surfaces",
      "Stability pass",
    ]),
    buildPhase("verification", targetMinutes >= 40 ? 5 : 3, "Run fidelity checks to make sure the build still matches the brief.", [
      "Prompt-fidelity checks",
      "Archetype drift checks",
      "Fallback decisions",
    ]),
  ]

  return {
    targetMinutes,
    parallelTracks: [
      "Prompt interpretation and constraint locking",
      "World layout and runtime loop authoring",
      "Asset kit assembly and UI surface planning",
      ...runtimeSpecificTracks(input.runtimeArchetype),
    ],
    methodology: [
      "Lock a runtime archetype before generating code so the playable target cannot drift back to the generic default.",
      "Generate a narrow but authentic first playable slice that proves the prompt fantasy quickly.",
      "Parallelize world layout, asset kit planning, and UI planning once the runtime contract is frozen.",
      "Prefer reusable archetype-specific system packs over one monolithic universal generator.",
      "For larger prompts, spend more time on runtime fidelity and integration before widening optional content.",
      "Trim breadth before quality whenever the build threatens the time budget.",
      "If the brief asks for a larger or more ambitious game, expand the pipeline budget before downgrading the runtime fantasy.",
    ],
    phaseBudgets,
    qualityGates: [
      "Dimension fidelity: 3D prompts must stay 3D-leaning in camera and interaction.",
      "3D action fidelity: first-person, third-person, shooter, stealth, and survival prompts may not collapse into board-state command loops.",
      "Genre fidelity: cozy, farming, strategy, and survival prompts may not fall back to the combat default.",
      "Runtime fidelity: the playable loop must expose the archetype's core verbs in the first session.",
      "Scope fidelity: first playable slice ships before optional expansion systems.",
      "Pipeline fidelity: every generation stage must have a bounded output and a budgeted runtime.",
    ],
    fallbackStrategy: [
      "If the build overruns the budget, ship fewer levels or content packs before cutting the core loop.",
      "If prompt ambiguity remains, bias toward the runtime archetype with the clearest prompt nouns and strongest anti-collapse rules.",
      "When verification fails, regenerate the runtime contract and system pack instead of reusing the generic shooter shell.",
      "If a 3D prompt loses direct-avatar verbs, rebuild the runtime contract before accepting any playable slice.",
    ],
  }
}
