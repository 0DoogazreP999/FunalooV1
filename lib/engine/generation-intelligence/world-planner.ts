import type {
  GameDimension,
  Genre,
} from "@/lib/engine/types"
import {
  MAP_LAYOUT_DATASETS,
  SIGNAL_ENVIRONMENT_THEMES,
  takeTop,
  type MapLayoutDataset,
} from "./shared"

export interface GenerationWorldPlan {
  mapDataset: MapLayoutDataset
  environmentThemes: string[]
  cameraStyle: string
  worldStructure: string
  mapArchetype: string
  mapOverview: string
  nonOverlapStrategy: string
  traversalModel: string
  layoutRules: string[]
  knowledgeDomains: string[]
}

export function inferEnvironmentThemes(prompt: string, genre: Genre, dimension: GameDimension) {
  const themes = [
    ...(dimension === "3d"
      ? ["Depth-first landmarks", "Readable horizon anchors"]
      : dimension === "2d"
        ? ["Readable plane composition", "Layered route silhouettes"]
        : ["Hybrid board depth", "Layered landmark stacks"]),
  ]

  SIGNAL_ENVIRONMENT_THEMES.forEach((rule) => {
    if (rule.pattern.test(prompt)) {
      themes.push(...rule.themes)
    }
  })

  if (/social deduction|hidden role|traitor|accusation|vote out/i.test(prompt)) {
    themes.push("Meeting circles", "Task rooms", "Reveal spaces")
  }

  if (/puzzle|logic|escape room|brain teaser/i.test(prompt)) {
    themes.push("Readable problem rooms", "Reset-safe chambers")
  }

  if (/sports|soccer|football|basketball|tennis|golf|boxing|skate/i.test(prompt)) {
    themes.push("Rules-first arenas", "Coach and reset pockets")
  }

  if (themes.length <= 2) {
    if (genre === "simulation" || genre === "strategy") {
      themes.push("Service hubs", "Operational route networks")
    } else if (genre === "survival" || genre === "adventure") {
      themes.push("Recovery camps", "Hazard-lined travel legs")
    } else if (genre === "fps" || genre === "battle_royale") {
      themes.push("High-pressure arenas", "Rotation lanes")
    } else {
      themes.push("Readable macro landmarks", "Distinct zone identities")
    }
  }

  return takeTop(themes, 4)
}

export function selectMapDataset(dimension: GameDimension, genre: Genre, promptSignals: string[]) {
  const matchingByGenre = MAP_LAYOUT_DATASETS.filter(
    (dataset) => dataset.dimensions.includes(dimension) && dataset.genres.includes(genre),
  )

  if (promptSignals.includes("social-deduction")) {
    return matchingByGenre.find((dataset) => dataset.id === "social-hub-vote-loop")
      ?? MAP_LAYOUT_DATASETS.find((dataset) => dataset.id === "social-hub-vote-loop")
      ?? matchingByGenre[0]
  }

  if (promptSignals.includes("investigation-heavy") || promptSignals.includes("mystery-heavy")) {
    return matchingByGenre.find((dataset) => dataset.id === "investigation-district-grid")
      ?? MAP_LAYOUT_DATASETS.find((dataset) => dataset.id === "investigation-district-grid")
      ?? matchingByGenre[0]
  }

  if (promptSignals.includes("puzzle-heavy")) {
    return matchingByGenre.find((dataset) => dataset.id === "puzzle-chamber-network")
      ?? MAP_LAYOUT_DATASETS.find((dataset) => dataset.id === "puzzle-chamber-network")
      ?? matchingByGenre[0]
  }

  if (promptSignals.includes("archaeology-heavy") || promptSignals.includes("restoration-heavy")) {
    return matchingByGenre.find((dataset) => dataset.id === "restoration-campus-loop")
      ?? MAP_LAYOUT_DATASETS.find((dataset) => dataset.id === "restoration-campus-loop")
      ?? matchingByGenre[0]
  }

  if (promptSignals.includes("farming-heavy")) {
    return matchingByGenre.find((dataset) => dataset.id === "homestead-districts")
      ?? MAP_LAYOUT_DATASETS.find((dataset) => dataset.id === "homestead-districts")
      ?? matchingByGenre[0]
  }

  if (promptSignals.includes("stealth-heavy")) {
    return matchingByGenre.find((dataset) => dataset.id === "stealth-route-web")
      ?? MAP_LAYOUT_DATASETS.find((dataset) => dataset.id === "stealth-route-web")
      ?? matchingByGenre[0]
  }

  if (promptSignals.includes("card-heavy")) {
    return matchingByGenre.find((dataset) => dataset.id === "tactics-board-sectors")
      ?? MAP_LAYOUT_DATASETS.find((dataset) => dataset.id === "tactics-board-sectors")
      ?? matchingByGenre[0]
  }

  if (promptSignals.includes("sports-heavy")) {
    return matchingByGenre.find((dataset) => dataset.id === "sports-arena-circuit")
      ?? MAP_LAYOUT_DATASETS.find((dataset) => dataset.id === "sports-arena-circuit")
      ?? matchingByGenre[0]
  }

  if (
    dimension === "3d" &&
    (
      promptSignals.includes("immersive-sim")
      || promptSignals.includes("heist-heavy")
      || promptSignals.includes("extraction-heavy")
    )
  ) {
    return matchingByGenre.find((dataset) => dataset.id === "immersive-stronghold-layers")
      ?? MAP_LAYOUT_DATASETS.find((dataset) => dataset.id === "immersive-stronghold-layers")
      ?? matchingByGenre.find((dataset) => dataset.id === "mission-corridor")
      ?? MAP_LAYOUT_DATASETS.find((dataset) => dataset.id === "mission-corridor")
      ?? matchingByGenre[0]
  }

  if (dimension === "3d" && promptSignals.includes("survival-heavy")) {
    return matchingByGenre.find((dataset) => dataset.id === "open-world-cells")
      ?? matchingByGenre.find((dataset) => dataset.id === "mission-corridor")
      ?? MAP_LAYOUT_DATASETS.find((dataset) => dataset.id === "open-world-cells")
      ?? MAP_LAYOUT_DATASETS.find((dataset) => dataset.id === "mission-corridor")
      ?? matchingByGenre[0]
  }

  if (dimension === "3d" && (promptSignals.includes("combat-heavy") || promptSignals.includes("stealth-heavy"))) {
    return matchingByGenre.find((dataset) => dataset.id === "mission-corridor")
      ?? matchingByGenre.find((dataset) => dataset.id === "raid-wings")
      ?? MAP_LAYOUT_DATASETS.find((dataset) => dataset.id === "mission-corridor")
      ?? MAP_LAYOUT_DATASETS.find((dataset) => dataset.id === "raid-wings")
      ?? matchingByGenre[0]
  }

  if (promptSignals.includes("travel-heavy")) {
    return matchingByGenre.find((dataset) => dataset.id === "overland-trail-network")
      ?? MAP_LAYOUT_DATASETS.find((dataset) => dataset.id === "overland-trail-network")
      ?? matchingByGenre[0]
  }

  if (promptSignals.includes("economy-heavy") || promptSignals.includes("simulation-heavy")) {
    return matchingByGenre.find((dataset) => dataset.id === "homestead-districts")
      ?? matchingByGenre.find((dataset) => dataset.id === "settlement-web")
      ?? MAP_LAYOUT_DATASETS.find((dataset) => dataset.id === "homestead-districts")
      ?? MAP_LAYOUT_DATASETS.find((dataset) => dataset.id === "settlement-web")
      ?? matchingByGenre[0]
  }

  if (promptSignals.includes("politics-heavy")) {
    return matchingByGenre.find((dataset) => dataset.id === "tactics-board-sectors")
      ?? matchingByGenre.find((dataset) => dataset.id === "settlement-web")
      ?? MAP_LAYOUT_DATASETS.find((dataset) => dataset.id === "tactics-board-sectors")
      ?? MAP_LAYOUT_DATASETS.find((dataset) => dataset.id === "settlement-web")
      ?? matchingByGenre[0]
  }

  if (promptSignals.includes("velocity-heavy")) {
    return matchingByGenre.find((dataset) => dataset.id === "track-sectors")
      ?? MAP_LAYOUT_DATASETS.find((dataset) => dataset.id === "track-sectors")
      ?? matchingByGenre[0]
  }

  if (matchingByGenre.length > 0) return matchingByGenre[0]

  const matchingByDimension = MAP_LAYOUT_DATASETS.filter((dataset) => dataset.dimensions.includes(dimension))
  if (promptSignals.includes("map-heavy")) {
    return matchingByDimension.find((dataset) => dataset.id === "dungeon-room-graph") ?? matchingByDimension[0]
  }

  return matchingByDimension[0]
}

export function planWorldStructure(input: {
  prompt: string
  genre: Genre
  dimension: GameDimension
  promptSignals: string[]
}): GenerationWorldPlan {
  const environmentThemes = inferEnvironmentThemes(input.prompt, input.genre, input.dimension)
  const mapDataset = selectMapDataset(input.dimension, input.genre, input.promptSignals)
  const cameraStyle =
    mapDataset.cameraByDimension[input.dimension]
    ?? (input.dimension === "2d" ? "Orthographic gameplay camera" : "Exploration follow camera")

  return {
    mapDataset,
    environmentThemes,
    cameraStyle,
    worldStructure: mapDataset.worldStructure,
    mapArchetype: mapDataset.name,
    mapOverview: mapDataset.mapOverview,
    nonOverlapStrategy: mapDataset.nonOverlapStrategy,
    traversalModel: mapDataset.traversalModel,
    layoutRules: mapDataset.layoutRules,
    knowledgeDomains: mapDataset.knowledgeDomains,
  }
}
