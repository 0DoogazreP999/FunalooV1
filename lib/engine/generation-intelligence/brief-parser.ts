import { GENRE_TEMPLATES } from "@/lib/engine/config"
import { budgetPromptMessages } from "@/lib/engine/prompts"
import type {
  GameDimension,
  Genre,
  GenerationIntelligenceProfile,
} from "@/lib/engine/types"
import {
  DIMENSION_DEFAULTS,
  FEATURE_HINT_LIBRARY,
  GENRE_EXPERIENCE_GOALS,
  GENRE_SIGNAL_LIBRARY,
  HYBRID_KEYWORDS,
  NEGATIVE_CONSTRAINT_RULES,
  PROMPT_SIGNAL_PATTERNS,
  THREE_D_KEYWORDS,
  TWO_D_KEYWORDS,
  type PromptDrivenDefaults,
  unique,
} from "./shared"

export interface GenerationBriefAnalysis extends PromptDrivenDefaults {
  prompt: string
  dimension: GameDimension
}

interface ParsedDesignerDirectives {
  subgenres: string[]
  cameraPreference: string | null
  combatPreference: string | null
  pacingPreference: string | null
  simulationDepth: number | null
  narrativeEmphasis: number | null
  noveltyTarget: number | null
  genreBlend: string | null
}

const DIRECTIVE_CAMERA_DIMENSION: Record<string, GameDimension> = {
  "first-person": "3d",
  "third-person": "3d",
  "top-down": "2d",
  isometric: "2d",
  "side-view": "2d",
  "board-command": "2d",
}

const DIRECTIVE_SUBGENRE_SIGNAL_MAP: Record<string, string[]> = {
  deckbuilder: ["card-heavy", "strategy-heavy"],
  city_builder: ["colony-heavy", "builder-heavy", "simulation-heavy"],
  life_sim: ["simulation-heavy", "social-heavy"],
  social_deduction: ["social-deduction", "social-heavy", "strategy-heavy"],
  sports_rules: ["sports-heavy"],
  rhythm: ["music-rhythm"],
  stealth_ops: ["stealth-heavy", "tension-heavy"],
  colony_sim: ["colony-heavy", "simulation-heavy", "builder-heavy"],
  puzzle_sandbox: ["puzzle-heavy", "physics-driven"],
  tactics: ["strategy-heavy"],
  education: ["education-heavy"],
  party_game: ["multiplayer-aware", "social-heavy"],
  immersive_sim: ["immersive-sim", "stealth-heavy", "systems-heavy"],
  heist: ["heist-heavy", "stealth-heavy", "tension-heavy"],
  extraction_shooter: ["extraction-heavy", "combat-heavy", "mission-led"],
  metroidvania: ["traversal-heavy", "map-heavy", "progression-heavy"],
  archaeology_sim: ["archaeology-heavy", "simulation-heavy", "mystery-heavy"],
  restoration_sim: ["restoration-heavy", "simulation-heavy", "peaceful"],
  detective_mystery: ["investigation-heavy", "mystery-heavy", "story-heavy"],
  political_strategy: ["politics-heavy", "strategy-heavy", "social-heavy"],
  tactics_roguelite: ["strategy-heavy", "roguelike-heavy"],
  colony_politics: ["politics-heavy", "colony-heavy", "simulation-heavy"],
}

const DIRECTIVE_SUBGENRE_FEATURE_MAP: Record<string, string[]> = {
  deckbuilder: ["deckbuilding", "ui"],
  city_builder: ["colony_management", "construction_mode", "world_gen", "ui"],
  life_sim: ["farming", "ai_npc", "dialogue", "ui"],
  social_deduction: ["social_deduction", "ui"],
  sports_rules: ["sports_rules", "physics", "ui", "audio"],
  rhythm: ["rhythm", "audio", "ui"],
  stealth_ops: ["stealth", "ai_npc", "ui"],
  colony_sim: ["colony_management", "construction_mode", "world_gen", "ui"],
  puzzle_sandbox: ["puzzle", "physics_sandbox", "world_gen", "ui"],
  tactics: ["party_tactics", "turn_based_combat", "ui"],
  education: ["education", "ui", "dialogue"],
  party_game: ["networking", "audio", "ui"],
  immersive_sim: ["stealth", "physics_sandbox", "questing", "ui"],
  heist: ["stealth", "questing", "inventory", "ui"],
  extraction_shooter: ["combat", "inventory", "questing", "audio", "ui"],
  metroidvania: ["physics", "world_gen", "ui"],
  archaeology_sim: ["world_gen", "inventory", "dialogue", "ui"],
  restoration_sim: ["construction_mode", "inventory", "ui", "audio"],
  detective_mystery: ["dialogue", "questing", "ui", "ai_npc"],
  political_strategy: ["diplomacy", "faction_reputation", "dialogue", "ui"],
  tactics_roguelite: ["party_tactics", "turn_based_combat", "ui"],
  colony_politics: ["colony_management", "diplomacy", "faction_reputation", "ui"],
}

function normalizeDirectiveValue(value: string, separator: "-" | "_") {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, separator).replace(new RegExp(`${separator}+`, "g"), separator).replace(new RegExp(`^${separator}|${separator}$`, "g"), "")
}

function parseDirectiveNumber(section: string, label: string) {
  const match = section.match(new RegExp(`${label}\\s+(\\d)\\/5`, "i"))
  return match ? Math.max(1, Math.min(5, Number.parseInt(match[1], 10))) : null
}

export function parseDesignerDirectives(prompt: string): ParsedDesignerDirectives {
  const section = prompt.match(/designer directives:\s*([\s\S]+)/i)?.[1]

  if (!section) {
    return {
      subgenres: [],
      cameraPreference: null,
      combatPreference: null,
      pacingPreference: null,
      simulationDepth: null,
      narrativeEmphasis: null,
      noveltyTarget: null,
      genreBlend: null,
    }
  }

  const subgenreMatch = section.match(/subgenres:\s*([^.]+?)(?:\.|$)/i)
  const cameraMatch = section.match(/prefer a\s+([^.]+?)\s+camera(?:\.|$)/i)
  const combatMatch = section.match(/combat intensity should be\s+([^.]+?)(?:\.|$)/i)
  const pacingMatch = section.match(/pacing should feel\s+([^.]+?)(?:\.|$)/i)
  const blendMatch = section.match(/genre blending mode:\s*([^.]+?)(?:\.|$)/i)
  const explicitNoCombat = /do not force combat into the design/i.test(section)

  return {
    subgenres: unique(
      (subgenreMatch?.[1] ?? "")
        .split(/,|\band\b/i)
        .map((entry) => normalizeDirectiveValue(entry, "_"))
        .filter(Boolean),
    ),
    cameraPreference: cameraMatch ? normalizeDirectiveValue(cameraMatch[1], "-") : null,
    combatPreference: explicitNoCombat
      ? "none"
      : combatMatch
        ? normalizeDirectiveValue(combatMatch[1], "-")
        : null,
    pacingPreference: pacingMatch ? normalizeDirectiveValue(pacingMatch[1], "-") : null,
    simulationDepth: parseDirectiveNumber(section, "simulation depth"),
    narrativeEmphasis: parseDirectiveNumber(section, "narrative emphasis"),
    noveltyTarget: parseDirectiveNumber(section, "novelty target"),
    genreBlend: blendMatch ? normalizeDirectiveValue(blendMatch[1], "-") : null,
  }
}

export function inferDimension(prompt: string, genre: Genre): GameDimension {
  const directives = parseDesignerDirectives(prompt)
  const directiveDimension = directives.cameraPreference
    ? DIRECTIVE_CAMERA_DIMENSION[directives.cameraPreference]
    : null
  const lowerPrompt = prompt.toLowerCase()
  const explicitThreeD = /\b3d\b|\b3-d\b|three[- ]dimensional|third[- ]person|first[- ]person/.test(lowerPrompt)
  const explicitTwoD = /\b2d\b|\b2-d\b|two[- ]dimensional/.test(lowerPrompt)
  const hybridScore = HYBRID_KEYWORDS.filter((keyword) => lowerPrompt.includes(keyword)).length
  const twoDScore = TWO_D_KEYWORDS.filter((keyword) => lowerPrompt.includes(keyword)).length
  const threeDScore = THREE_D_KEYWORDS.filter((keyword) => lowerPrompt.includes(keyword)).length

  if (directiveDimension) return directiveDimension
  if (hybridScore > 0) return "hybrid"
  if (explicitThreeD && !explicitTwoD) return "3d"
  if (explicitTwoD && !explicitThreeD) return "2d"
  if (twoDScore > threeDScore) return "2d"
  if (threeDScore > twoDScore) return "3d"
  return DIMENSION_DEFAULTS[genre]
}

export function extractPromptSignals(prompt: string, genre: Genre, dimension: GameDimension) {
  const signals: string[] = [genre, dimension]
  const directives = parseDesignerDirectives(prompt)

  PROMPT_SIGNAL_PATTERNS.forEach(({ signal, pattern }) => {
    if (pattern.test(prompt)) {
      signals.push(signal)
    }
  })

  directives.subgenres.forEach((subgenre) => {
    signals.push(subgenre)
    signals.push(...(DIRECTIVE_SUBGENRE_SIGNAL_MAP[subgenre] ?? []))
  })

  if (directives.combatPreference === "none") {
    signals.push("peaceful")
  } else if (directives.combatPreference === "medium" || directives.combatPreference === "high") {
    signals.push("combat-heavy")
  }

  if (directives.pacingPreference === "relaxed") {
    signals.push("relaxed-paced")
  } else if (directives.pacingPreference === "fast") {
    signals.push("fast-paced")
  } else if (directives.pacingPreference === "intense") {
    signals.push("fast-paced", "tension-heavy")
  }

  if ((directives.simulationDepth ?? 0) >= 4) {
    signals.push("simulation-heavy", "systems-heavy")
  }

  if ((directives.narrativeEmphasis ?? 0) >= 4) {
    signals.push("story-heavy", "progression-heavy")
  }

  if ((directives.noveltyTarget ?? 0) >= 4) {
    signals.push("novelty-high")
  }

  if (directives.genreBlend === "hybrid-experimental") {
    signals.push("hybridized")
  } else if (directives.genreBlend === "strict") {
    signals.push("genre-pure")
  }

  return unique(signals)
}

export function scoreGenre(prompt: string, fallbackGenre: Genre) {
  const scored = (Object.keys(GENRE_SIGNAL_LIBRARY) as Genre[]).map((genre) => {
    const baseScore = genre === fallbackGenre ? 1.5 : 0
    const matches = GENRE_SIGNAL_LIBRARY[genre].filter((rule) => rule.pattern.test(prompt))
    const score = baseScore + matches.reduce((sum, rule) => sum + rule.weight, 0)

    return {
      genre,
      score,
      reasons: matches.map((rule) => rule.reason),
    }
  }).sort((left, right) => right.score - left.score)

  const winner = scored[0]
  const runnerUp = scored[1]
  const gap = winner.score - (runnerUp?.score ?? 0)
  const genreConfidence: GenerationIntelligenceProfile["genreConfidence"] =
    winner.score >= 8 || gap >= 4 ? "high" : winner.score >= 4 || gap >= 2 ? "medium" : "low"

  return {
    genre: winner.score > 0 ? winner.genre : fallbackGenre,
    genreConfidence,
    genreReason: winner.reasons[0] ?? "No strong genre markers were detected, so the selected fallback genre remained in place.",
  }
}

export function extractNegativeConstraints(prompt: string) {
  const directives = parseDesignerDirectives(prompt)
  const matchedRules = NEGATIVE_CONSTRAINT_RULES.filter((rule) => rule.pattern.test(prompt))
  const negativeConstraints = matchedRules.map((rule) => rule.label)
  const excludedFeatures = matchedRules.flatMap((rule) => rule.excludedFeatures)

  if (directives.combatPreference === "none") {
    negativeConstraints.push("Avoid direct combat systems unless the prompt clearly reintroduces them.")
    excludedFeatures.push("combat")
  }

  if (directives.genreBlend === "strict") {
    negativeConstraints.push("Avoid genre drift beyond the requested fantasy and subgenre mix.")
  }

  return {
    negativeConstraints: unique(negativeConstraints),
    excludedFeatures: unique(excludedFeatures),
  }
}

export function inferMultiplayerDefaults(
  prompt: string,
  genre: Genre,
  fallbackMultiplayer: boolean,
  fallbackMaxPlayers: number,
) {
  const explicitSolo = /single-player|single player|solo|one player|lone/i.test(prompt)
  const explicitMultiplayer = /co-op|coop|multiplayer|online|raid|pvp|pve|shared world/i.test(prompt)
  const countMatch = prompt.match(/(\d+)\s*[- ]?(player|players|person|people)/i)
  const requestedPlayers = countMatch ? Math.max(1, Number.parseInt(countMatch[1], 10) || 1) : null

  let multiplayer = fallbackMultiplayer
  let maxPlayers = Math.max(1, fallbackMaxPlayers)

  if (explicitSolo) {
    multiplayer = false
    maxPlayers = 1
  } else if (explicitMultiplayer) {
    multiplayer = true
  } else if (!fallbackMultiplayer && (genre === "mmo" || genre === "battle_royale")) {
    multiplayer = true
  } else if (
    !fallbackMultiplayer
    && maxPlayers <= 1
    && ["adventure", "simulation", "strategy", "survival", "rpg", "horror"].includes(genre)
  ) {
    multiplayer = false
    maxPlayers = 1
  }

  if (requestedPlayers) {
    maxPlayers = requestedPlayers
    multiplayer = requestedPlayers > 1
  } else if (multiplayer) {
    maxPlayers = Math.max(
      maxPlayers,
      genre === "battle_royale"
        ? 100
        : genre === "mmo"
          ? 1000
          : genre === "fps"
            ? 16
            : genre === "racing"
              ? 12
              : 4,
    )
  } else {
    maxPlayers = 1
  }

  return { multiplayer, maxPlayers }
}

export function buildPromptFeatureRecommendations(
  prompt: string,
  genre: Genre,
  dimension: GameDimension,
  multiplayer: boolean,
  excludedFeatures: string[],
) {
  const recommended = new Set(GENRE_TEMPLATES[genre].features)
  const directives = parseDesignerDirectives(prompt)

  Object.entries(FEATURE_HINT_LIBRARY).forEach(([feature, pattern]) => {
    if (pattern.test(prompt)) {
      recommended.add(feature)
    }
  })

  directives.subgenres.forEach((subgenre) => {
    ;(DIRECTIVE_SUBGENRE_FEATURE_MAP[subgenre] ?? []).forEach((feature) => recommended.add(feature))
  })

  if (dimension === "3d") recommended.add("rendering")
  if (genre === "platformer" || /jump|dash|grapple|platform/i.test(prompt)) recommended.add("physics")
  if (multiplayer) {
    recommended.add("networking")
    recommended.add("ui")
  }

  if (directives.cameraPreference && DIRECTIVE_CAMERA_DIMENSION[directives.cameraPreference] === "3d") {
    recommended.add("rendering")
  }

  if ((directives.simulationDepth ?? 0) >= 4) {
    recommended.add("ui")
    if (["simulation", "strategy", "sandbox", "survival"].includes(genre)) {
      recommended.add("world_gen")
    }
  }

  if ((directives.narrativeEmphasis ?? 0) >= 4) {
    recommended.add("ai_npc")
    recommended.add("dialogue")
    recommended.add("questing")
    recommended.add("ui")
  }

  if (directives.combatPreference === "none") {
    recommended.delete("combat")
  } else if (directives.combatPreference === "medium" || directives.combatPreference === "high") {
    recommended.add("combat")
  }

  if (/peaceful|cozy|nonviolent|traveling game|travelling game/i.test(prompt)) {
    recommended.add("audio")
    recommended.add("ui")
    recommended.add("world_gen")
  }

  excludedFeatures.forEach((feature) => recommended.delete(feature))

  if (!multiplayer) {
    recommended.delete("networking")
  }

  return [...recommended]
}

export function inferScopeScale(prompt: string, promptSignals: string[], recommendedFeatures: string[]) {
  const longPrompt = prompt.trim().split(/\s+/).length >= 14
  const veryDensePrompt = promptSignals.length >= 7 || recommendedFeatures.length >= 6
  const hasAAASignal = /\baaa\b|triple[- ]?a|production[- ]?ready|production[- ]?quality|studio[- ]?quality|full[- ]?scale|aaa[- ]?level|professional|flagship|blockbuster|next[- ]?gen|cutting[- ]?edge|state[- ]of[- ]the[- ]art|high[- ]?fidelity|photorealistic|unreal[- ]?quality/i.test(prompt)

  if (
    hasAAASignal ||
    /persistent|open world|open-world|campaign|simulation|colony|mmo|sandbox|limitless|massive|deep/i.test(prompt) ||
    veryDensePrompt
  ) {
    return "limitless"
  }

  if (longPrompt || promptSignals.length >= 5 || recommendedFeatures.length >= 5) {
    return "expanded"
  }

  return "focused"
}

export function buildPromptSummary(input: {
  genre: Genre
  dimension: GameDimension
  promptSignals: string[]
  multiplayer: boolean
  negativeConstraints: string[]
}) {
  const mode = input.multiplayer ? "multiplayer" : "solo"
  const tags = []

  if (input.promptSignals.includes("travel-heavy")) tags.push("travel-first")
  if (input.promptSignals.includes("economy-heavy")) tags.push("resource-aware")
  if (input.promptSignals.includes("peaceful")) tags.push("low-violence")
  if (input.promptSignals.includes("story-heavy")) tags.push("story-led")
  if (input.promptSignals.includes("simulation-heavy")) tags.push("systemic")
  if (input.promptSignals.includes("strategy-heavy")) tags.push("decision-heavy")
  if (input.promptSignals.includes("survival-heavy")) tags.push("attrition-driven")
  if (input.promptSignals.includes("investigation-heavy")) tags.push("investigation-led")
  if (input.promptSignals.includes("heist-heavy")) tags.push("heist-driven")
  if (input.promptSignals.includes("restoration-heavy")) tags.push("restoration-led")
  if (input.promptSignals.includes("politics-heavy")) tags.push("politics-heavy")
  if (input.promptSignals.includes("fast-paced")) tags.push("fast-paced")
  if (input.promptSignals.includes("relaxed-paced")) tags.push("relaxed")
  if (input.promptSignals.includes("hybridized")) tags.push("hybrid")
  if (input.promptSignals.includes("novelty-high")) tags.push("novelty-seeking")

  const summaryPrompt = budgetPromptMessages([
    {
      role: "user",
      sections: [
        { id: "summary-prefix", content: "Prompt interpreted as a" },
        { id: "summary-mode", content: mode },
        {
          id: "summary-descriptor",
          content: tags.slice(0, 3).join(", "),
          optional: true,
          trimPriority: 2,
        },
        {
          id: "summary-project",
          content: `${input.dimension.toUpperCase()} ${input.genre.replace(/_/g, " ")} project`,
        },
        {
          id: "summary-constraint",
          content: input.negativeConstraints[0]
            ? `while respecting ${input.negativeConstraints[0].toLowerCase()}`
            : "",
          optional: true,
          trimPriority: 1,
        },
      ],
    },
  ], 24)

  return `${summaryPrompt.messages[0]?.content.replace(/\s+/g, " ").trim() ?? `Prompt interpreted as a ${mode} ${input.dimension.toUpperCase()} ${input.genre.replace(/_/g, " ")} project`}.`
}

export function inferPromptDrivenDefaults({
  prompt,
  fallbackGenre,
  fallbackMultiplayer,
  fallbackMaxPlayers,
}: {
  prompt: string
  fallbackGenre: Genre
  fallbackMultiplayer: boolean
  fallbackMaxPlayers: number
}): PromptDrivenDefaults {
  const { genre, genreConfidence, genreReason } = scoreGenre(prompt, fallbackGenre)
  const dimension = inferDimension(prompt, genre)
  const promptSignals = extractPromptSignals(prompt, genre, dimension)
  const { negativeConstraints, excludedFeatures } = extractNegativeConstraints(prompt)
  const { multiplayer, maxPlayers } = inferMultiplayerDefaults(
    prompt,
    genre,
    fallbackMultiplayer,
    fallbackMaxPlayers,
  )
  const recommendedFeatures = buildPromptFeatureRecommendations(
    prompt,
    genre,
    dimension,
    multiplayer,
    excludedFeatures,
  )
  const scopeScale = inferScopeScale(prompt, promptSignals, recommendedFeatures)
  const promptSummary = buildPromptSummary({
    genre,
    dimension,
    promptSignals,
    multiplayer,
    negativeConstraints,
  })

  return {
    genre,
    genreConfidence,
    genreReason,
    resolvedSystems: [],
    resolvedModes: [],
    recommendedFeatures,
    excludedFeatures,
    multiplayer,
    maxPlayers,
    promptSignals,
    experienceGoals: GENRE_EXPERIENCE_GOALS[genre],
    negativeConstraints,
    scopeScale,
    promptSummary,
  }
}

export function parseGenerationBrief(input: {
  prompt: string
  fallbackGenre: Genre
  fallbackMultiplayer: boolean
  fallbackMaxPlayers: number
}): GenerationBriefAnalysis {
  const defaults = inferPromptDrivenDefaults(input)
  return {
    prompt: input.prompt,
    dimension: inferDimension(input.prompt, defaults.genre),
    ...defaults,
  }
}

export function inferPromptDefaults(input: {
  prompt: string
  fallbackGenre: Genre
  fallbackMultiplayer?: boolean
  fallbackMaxPlayers?: number
}) {
  return inferPromptDrivenDefaults({
    prompt: input.prompt,
    fallbackGenre: input.fallbackGenre,
    fallbackMultiplayer: input.fallbackMultiplayer ?? GENRE_TEMPLATES[input.fallbackGenre].defaultMultiplayer,
    fallbackMaxPlayers: input.fallbackMaxPlayers ?? GENRE_TEMPLATES[input.fallbackGenre].defaultPlayers,
  })
}
