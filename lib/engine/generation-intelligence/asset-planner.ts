import { buildAssetGenerationPlan } from "@/lib/engine/asset-generation-intelligence"
import type {
  AssetGenerationPlan,
  GameDimension,
  Genre,
} from "@/lib/engine/types"

export interface GenerationAssetPlanningInput {
  prompt: string
  genre: Genre
  dimension: GameDimension
  mapArchetype: string
  worldStructure: string
  environmentThemes: string[]
  promptSignals: string[]
  resolvedFeatures: string[]
  multiplayer: boolean
}

export function planGenerationAssets(input: GenerationAssetPlanningInput): AssetGenerationPlan {
  return buildAssetGenerationPlan({
    prompt: input.prompt,
    genre: input.genre,
    dimension: input.dimension,
    mapArchetype: input.mapArchetype,
    worldStructure: input.worldStructure,
    environmentThemes: input.environmentThemes,
    promptSignals: input.promptSignals,
    resolvedFeatures: input.resolvedFeatures,
    multiplayer: input.multiplayer,
  })
}
