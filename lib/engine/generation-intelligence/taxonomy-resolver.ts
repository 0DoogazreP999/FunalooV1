import { GENRE_TEMPLATES } from "@/lib/engine/config"
import type {
  GameDimension,
  Genre,
  GameplaySystem,
  GameplayMode,
} from "@/lib/engine/types"
import {
  generationFeatureSet,
  unique,
} from "./shared"
import {
  extractPromptSignals,
  parseGenerationBrief,
  type GenerationBriefAnalysis,
} from "./brief-parser"

export interface GenerationTaxonomyResolution {
  brief: GenerationBriefAnalysis
  resolvedGenre: Genre
  resolvedSystems: GameplaySystem[]
  resolvedModes: GameplayMode[]
  dimension: GameDimension
  seed: string
  networkTopology: NetworkTopology
  tickRate: number
  promptSignals: string[]
  selectedFeatureSeed: string[]
  resolvedFeatures: string[]
  autoIncludedFeatures: string[]
}

export function normalizeSelectedFeatures(selectedFeatures: string[]) {
  return unique(selectedFeatures.filter((feature) => generationFeatureSet.has(feature)))
}

export function matchesTemplateSelection(selectedFeatures: string[], genre: Genre) {
  const templateFeatures = [...GENRE_TEMPLATES[genre].features].sort()
  const normalizedSelection = [...selectedFeatures].sort()

  if (templateFeatures.length !== normalizedSelection.length) return false

  return templateFeatures.every((feature, index) => feature === normalizedSelection[index])
}

export function resolveFeatures(input: {
  prompt: string
  genre: Genre
  dimension: GameDimension
  selectedFeatures: string[]
  multiplayer: boolean
  recommendedFeatures: string[]
  negativeConstraints: string[]
}) {
  const resolved = new Set([
    ...GENRE_TEMPLATES[input.genre].features,
    ...input.selectedFeatures,
    ...input.recommendedFeatures,
  ])
  const isTravelSimulationPrompt =
    /oregon trail|wagon trail|travel|journey|route|trail|frontier|caravan|merchant|trading|management|logistics|simulation|settlement/i.test(input.prompt)
  const hasExplicitCombatIntent = /combat|fight|shooter|weapon|enemy|battle|war|attack|boss/i.test(input.prompt)

  if (input.dimension === "3d") resolved.add("rendering")
  if (/peaceful|cozy|nonviolent|traveling game|travelling game/i.test(input.prompt)) resolved.delete("combat")
  if (
    ["adventure", "simulation", "strategy", "survival"].includes(input.genre) &&
    isTravelSimulationPrompt &&
    !hasExplicitCombatIntent
  ) {
    resolved.delete("combat")
  }
  if (/story|quest|npc|dialogue|companion|faction/i.test(input.prompt)) resolved.add("ai_npc")
  if (/audio|music|sound|horror|atmosphere|campfire|weather/i.test(input.prompt)) resolved.add("audio")
  if (/travel|journey|route|trail|frontier|settlement|map|logbook/i.test(input.prompt)) resolved.add("ui")
  if (/vehicle|track|lap|racing|driving/i.test(input.prompt)) resolved.add("physics")

  if (input.multiplayer) {
    resolved.add("networking")
    resolved.add("ui")
  } else {
    resolved.delete("networking")
  }

  input.negativeConstraints.forEach((constraint) => {
    if (/combat/i.test(constraint)) resolved.delete("combat")
    if (/solo/i.test(constraint)) resolved.delete("networking")
  })

  const resolvedFeatures = [...resolved]
  const autoIncludedFeatures = resolvedFeatures.filter((feature) => !input.selectedFeatures.includes(feature))

  return { resolvedFeatures, autoIncludedFeatures }
}

export function resolveGenerationTaxonomy(input: {
  prompt: string
  genre: Genre
  selectedFeatures: string[]
  multiplayer: boolean
  maxPlayers: number
  seed?: string
  networkTopology?: NetworkTopology
  tickRate?: number
  brief?: GenerationBriefAnalysis
}): GenerationTaxonomyResolution {
  const brief = input.brief ?? parseGenerationBrief({
    prompt: input.prompt,
    fallbackGenre: input.genre,
    fallbackMultiplayer: input.multiplayer,
    fallbackMaxPlayers: input.maxPlayers,
  })
  const resolvedGenre = brief.genre
  const sanitizedSelectedFeatures = normalizeSelectedFeatures(input.selectedFeatures)
  const selectedFeatureSeed =
    resolvedGenre !== input.genre && matchesTemplateSelection(sanitizedSelectedFeatures, input.genre)
      ? []
      : sanitizedSelectedFeatures
  const promptSignals = unique([
    ...brief.promptSignals,
    ...extractPromptSignals(input.prompt, resolvedGenre, brief.dimension),
  ])
  const { resolvedFeatures, autoIncludedFeatures } = resolveFeatures({
    prompt: input.prompt,
    genre: resolvedGenre,
    dimension: brief.dimension,
    selectedFeatures: selectedFeatureSeed,
    multiplayer: brief.multiplayer,
    recommendedFeatures: brief.recommendedFeatures,
    negativeConstraints: brief.negativeConstraints,
  })

  return {
    brief,
    resolvedGenre,
    resolvedSystems: brief.resolvedSystems,
    resolvedModes: brief.resolvedModes,
    dimension: brief.dimension,
    seed: input.seed ?? "default_seed",
    networkTopology: input.networkTopology ?? GENRE_TEMPLATES[resolvedGenre].defaultNetworkTopology,
    tickRate: input.tickRate ?? GENRE_TEMPLATES[resolvedGenre].defaultTickRate,
    promptSignals,
    selectedFeatureSeed,
    resolvedFeatures,
    autoIncludedFeatures,
  }
}
