import { normalizeUserAiSettings } from "@/lib/validators"
import {
  findProviderModelEntryInCatalog,
  getProviderModelCatalog,
  resolveProviderModelForUsage,
  type ProviderModelUsage,
} from "@/lib/provider-models"
import type { UserAiSettings } from "@/lib/user-store"
import type {
  GameDimension,
  Genre,
  GenerationIntelligenceProfile,
  ProviderLoopAssignment,
  ProviderLoopRoster,
  GenerationRuntimeArchetype,
  PromptProviderId,
  SupplementalGenerationSystem,
} from "@/lib/engine/types"
import { generationFeatureSet, unique } from "./shared"
import type { GenerationAdvice } from "./schemas"

export interface GenerationScopePlan {
  supplementalSystems: SupplementalGenerationSystem[]
}

export interface ConfiguredUserProvider {
  provider: Exclude<PromptProviderId, "local">
  apiKey: string
  model: string
  baseUrl: string
}

export interface ConfiguredUserProviderRoster {
  primary: ConfiguredUserProvider
  supportProviders: ConfiguredUserProvider[]
  roster: ProviderLoopRoster
}

export function buildSupplementalSystems({
  dimension,
  genre,
  resolvedFeatures,
  multiplayer,
  promptSignals,
  scopeScale,
  runtimeArchetype,
}: {
  dimension: GameDimension
  genre: Genre
  resolvedFeatures: string[]
  multiplayer: boolean
  promptSignals: string[]
  scopeScale: GenerationIntelligenceProfile["scopeScale"]
  runtimeArchetype?: GenerationRuntimeArchetype
}): SupplementalGenerationSystem[] {
  const systems: SupplementalGenerationSystem[] = [
    { name: "map_builder", displayName: "Map Builder", rationale: "Builds non-overlapping room, lane, cell, or route layouts from the chosen map archetype.", linesBudget: 1300 },
    { name: "level_flow", displayName: "Level Flow Director", rationale: "Sequences onboarding, escalation, mastery checks, checkpoints, and capstone beats.", linesBudget: 1100 },
    { name: "game_loop", displayName: "Gameplay Loop Controller", rationale: "Owns the moment-to-moment, reward, fail, and progression loops for the genre.", linesBudget: 1050 },
  ]

  if (resolvedFeatures.includes("combat")) {
    systems.push({ name: "encounter_director", displayName: "Encounter Director", rationale: "Controls spawn budgets, threat escalation, and recovery windows.", linesBudget: 1200 })
  }

  switch (runtimeArchetype) {
    case "survival_expedition_3d":
      systems.push(
        { name: "zone_scavenge_graph", displayName: "Zone Scavenge Graph", rationale: "Builds linked scavenging districts, high-value detours, and safehouse return paths for 3D survival runs.", linesBudget: 1240 },
        { name: "safehouse_integrity", displayName: "Safehouse Integrity Model", rationale: "Tracks shelter upgrades, repair breakpoints, generator state, and safe-return value.", linesBudget: 1120 },
        { name: "expedition_pressure", displayName: "Expedition Pressure Director", rationale: "Escalates zombie, infected, and environmental pressure across the 3D route without collapsing into generic wave spam.", linesBudget: 1210 },
      )
      break
    case "action_operation_3d":
      systems.push(
        { name: "operation_route_graph", displayName: "Operation Route Graph", rationale: "Authors breach, flank, recovery, and extraction routes so the mission reads like an operation instead of a flat arena.", linesBudget: 1190 },
        { name: "objective_chain", displayName: "Objective Chain Director", rationale: "Stages mission objectives, interaction gates, and extraction triggers with genre-specific language.", linesBudget: 1080 },
        { name: "combat_space_readability", displayName: "Combat Space Readability", rationale: "Maintains cover, sightlines, approach angles, and recovery pockets for direct-avatar 3D action.", linesBudget: 1140 },
      )
      break
    case "survival_horde":
      systems.push(
        { name: "survival_resources", displayName: "Survival Resource Loop", rationale: "Balances hunger, ammo, salvage, shelter materials, and recovery pacing.", linesBudget: 1120 },
        { name: "day_night_cycle", displayName: "Day Night Threat Cycle", rationale: "Stages safe scavenging windows, rising dread, and night-time escalation.", linesBudget: 980 },
        { name: "horde_director", displayName: "Horde Director", rationale: "Escalates infected, undead, or hostile-swarm pressure without flattening the survival loop.", linesBudget: 1180 },
      )
      break
    case "homestead_life":
      systems.push(
        { name: "crop_cycle", displayName: "Crop and Season Cycle", rationale: "Tracks soil state, watering cadence, growth timing, and seasonal farming payoff.", linesBudget: 1010 },
        { name: "daily_schedule", displayName: "Daily Routine Scheduler", rationale: "Coordinates morning, workday, market, and rest rhythms for a readable life-sim loop.", linesBudget: 930 },
        { name: "village_relationships", displayName: "Village Relationship Graph", rationale: "Keeps villager affinity, requests, and repeat interactions grounded in the daily cycle.", linesBudget: 940 },
      )
      break
    case "strategy_command":
      systems.push(
        { name: "sector_state", displayName: "Sector State Controller", rationale: "Maintains territorial pressure, ownership, and front-line clarity across the board.", linesBudget: 1080 },
        { name: "economy_graph", displayName: "Economy and Supply Graph", rationale: "Connects command spending, supply throughput, and downstream strategic consequences.", linesBudget: 1060 },
        { name: "operation_resolver", displayName: "Operation Resolver", rationale: "Turns player decisions into deterministic, legible battlefield or campaign outcomes.", linesBudget: 980 },
      )
      break
    case "combat_mission":
      systems.push(
        { name: "mission_objective_graph", displayName: "Mission Objective Graph", rationale: "Keeps combat prompts objective-led instead of collapsing into endless room clearing.", linesBudget: 980 },
      )
      if (dimension === "3d") {
        systems.push(
          { name: "sightline_cover", displayName: "Sightline and Cover Planner", rationale: "Shapes firing lanes, safe pushes, and recovery pockets for readable 3D encounters.", linesBudget: 1040 },
        )
      }
      break
    case "journey_route":
      systems.push(
        { name: "route_state", displayName: "Route State Model", rationale: "Tracks route-leg completion, destination progress, and stop-specific state changes.", linesBudget: 920 },
      )
      break
    default:
      break
  }

  if (dimension === "2d" || dimension === "hybrid") {
    systems.push({ name: "tile_streaming", displayName: "Tile and Layer Streaming", rationale: "Streams tile bands, parallax layers, and occupancy-safe traversal surfaces.", linesBudget: 980 })
  } else {
    systems.push({ name: "spatial_navigation", displayName: "Spatial Navigation Mesh", rationale: "Coordinates 3D traversal lanes, clearance, vertical spaces, and path volumes.", linesBudget: 1180 })
  }

  if (resolvedFeatures.includes("world_gen")) {
    systems.push({ name: "progression_director", displayName: "Progression Director", rationale: "Connects world layout to rewards, checkpoints, and player growth pacing.", linesBudget: 1020 })
  }

  if (multiplayer) {
    systems.push({ name: "session_flow", displayName: "Session Flow Orchestrator", rationale: "Aligns lobby, spawn, regroup, and match phase transitions for multiplayer content.", linesBudget: 960 })
  }

  if (promptSignals.includes("progression-heavy") || promptSignals.includes("story-heavy") || genre === "rpg" || genre === "mmo" || genre === "horror" || genre === "adventure") {
    systems.push({ name: "objective_director", displayName: "Objective Director", rationale: "Turns narrative, quest, and mission states into playable level goals.", linesBudget: 930 })
    systems.push({ name: "narrative_state", displayName: "Narrative State Graph", rationale: "Tracks story turns, event continuity, and stateful travel outcomes.", linesBudget: 940 })
  }

  if (promptSignals.includes("travel-heavy")) {
    systems.push({ name: "journey_director", displayName: "Journey Director", rationale: "Owns waypoint pacing, route legs, travel cadence, and arrival states.", linesBudget: 1040 })
    systems.push({ name: "route_planner", displayName: "Route Planner", rationale: "Builds readable travel choices, detours, and safe return paths without spatial overlap.", linesBudget: 980 })
  }

  if (promptSignals.includes("economy-heavy")) {
    systems.push({ name: "resource_economy", displayName: "Resource Economy", rationale: "Balances trade goods, supplies, costs, and payout loops across the journey.", linesBudget: 1080 })
    systems.push({ name: "trade_network", displayName: "Trade Network", rationale: "Connects settlements, merchants, and region-specific supply opportunities.", linesBudget: 990 })
  }

  if (promptSignals.includes("simulation-heavy")) {
    systems.push({ name: "systemic_simulation", displayName: "Systemic Simulation", rationale: "Simulates routines, disruptions, and cascading state changes over longer sessions.", linesBudget: 1150 })
  }

  if (promptSignals.includes("strategy-heavy")) {
    systems.push({ name: "decision_orchestrator", displayName: "Decision Orchestrator", rationale: "Keeps strategic choices meaningful by tracking tempo, costs, and counterplay windows.", linesBudget: 1010 })
  }

  if (promptSignals.includes("colony-heavy")) {
    systems.push({ name: "settlement_governor", displayName: "Settlement Governor", rationale: "Tracks district identity, service coverage, and settlement growth pressures.", linesBudget: 1090 })
    systems.push({ name: "population_model", displayName: "Population Model", rationale: "Connects citizens, crew, or caravan members to morale, labor, and event outcomes.", linesBudget: 970 })
  }

  if (promptSignals.includes("automation-heavy")) {
    systems.push({ name: "production_graph", displayName: "Production Graph", rationale: "Models production chains, bottlenecks, and upgrade routing across the project loop.", linesBudget: 1110 })
  }

  if (promptSignals.includes("vehicle-heavy")) {
    systems.push({ name: "vehicle_state", displayName: "Vehicle and Convoy State", rationale: "Maintains wagon, ship, train, or vehicle condition as part of the playable loop.", linesBudget: 910 })
  }

  if (promptSignals.includes("mystery-heavy")) {
    systems.push({ name: "clue_state_graph", displayName: "Clue State Graph", rationale: "Tracks evidence discovery, clue dependency, and reveal timing without collapsing pacing.", linesBudget: 900 })
  }

  if (promptSignals.includes("survival-heavy")) {
    systems.push({ name: "hazard_pressure", displayName: "Hazard Pressure System", rationale: "Applies weather, scarcity, illness, and journey attrition in readable beats.", linesBudget: 1030 })
    systems.push({ name: "weather_hazard", displayName: "Weather Hazard Director", rationale: "Stages storms, crossings, and environment-driven setbacks without muddying the route.", linesBudget: 920 })
  }

  if (promptSignals.includes("social-heavy")) {
    systems.push({ name: "faction_reputation", displayName: "Faction and Reputation Matrix", rationale: "Tracks relationship states with settlements, crews, and NPC groups.", linesBudget: 940 })
  }

  if (promptSignals.includes("peaceful")) {
    systems.push({ name: "ambient_event_director", displayName: "Ambient Event Director", rationale: "Injects low-violence discoveries, trade stops, and world texture instead of forcing combat.", linesBudget: 860 })
  }

  if (scopeScale === "limitless") {
    systems.push({ name: "content_scaler", displayName: "Content Scaling Director", rationale: "Expands the project with more route legs, supporting systems, and long-tail progression scaffolding.", linesBudget: 1260 })
    systems.push({ name: "lod_streaming", displayName: "LOD and Asset Streaming", rationale: "Manages level-of-detail transitions, texture streaming, and draw-call budgets for production-scale worlds.", linesBudget: 1340 })
    systems.push({ name: "animation_state_machine", displayName: "Animation State Machine", rationale: "Drives blend trees, state transitions, IK solvers, and montage layering for AAA character animation.", linesBudget: 1420 })
    systems.push({ name: "cinematic_director", displayName: "Cinematic Sequence Director", rationale: "Orchestrates in-engine cutscenes, camera rails, dialogue triggers, and scripted set-pieces.", linesBudget: 1180 })
    systems.push({ name: "save_state_manager", displayName: "Save and State Persistence", rationale: "Serializes world state, player progression, inventory, and checkpoint data for session continuity.", linesBudget: 1060 })
    if (resolvedFeatures.includes("rendering")) {
      systems.push({ name: "post_process_stack", displayName: "Post-Process Pipeline", rationale: "Chains bloom, tone mapping, color grading, DoF, motion blur, and ambient occlusion passes.", linesBudget: 1280 })
    }
    if (resolvedFeatures.includes("audio")) {
      systems.push({ name: "adaptive_music_engine", displayName: "Adaptive Music Engine", rationale: "Cross-fades music layers based on threat, exploration state, and narrative beats.", linesBudget: 980 })
    }
  }

  return unique(systems.map((system) => system.name)).map(
    (name) => systems.find((system) => system.name === name)!,
  )
}

export function planGenerationScope(input: {
  dimension: GameDimension
  genre: Genre
  resolvedFeatures: string[]
  multiplayer: boolean
  promptSignals: string[]
  scopeScale: GenerationIntelligenceProfile["scopeScale"]
  runtimeArchetype?: GenerationRuntimeArchetype
}): GenerationScopePlan {
  return {
    supplementalSystems: buildSupplementalSystems(input),
  }
}

export function getConfiguredUserProvider(
  settings: UserAiSettings | null | undefined,
  usage: ProviderModelUsage = "generationProfile",
): ConfiguredUserProvider | null {
  if (!settings) return null

  const normalized = normalizeUserAiSettings(settings)
  if (normalized.defaultProvider === "local") {
    return null
  }

  const provider = normalized.defaultProvider
  const apiKey = normalized.apiKeys[provider].trim()

  if (!apiKey) {
    return null
  }

  return {
    provider,
    apiKey,
    model: resolveProviderModelForUsage({
      provider,
      defaultModel: normalized.models[provider].trim(),
      usageModels: normalized.modelRouting[provider],
      routingPolicy: normalized.routingPolicies[provider],
      usage,
    }).trim(),
    baseUrl: normalized.baseUrls[provider].trim(),
  }
}

function scoreProviderAssignment(provider: Exclude<PromptProviderId, "local">, model: string) {
  const entry = findProviderModelEntryInCatalog(getProviderModelCatalog(provider), model)
  if (!entry) return 0

  return [
    entry.supportsStructuredOutputs ? 4 : 0,
    entry.supportsReasoning ? 3 : 0,
    entry.qualityTier === "flagship" ? 3 : entry.qualityTier === "balanced" ? 2 : 1,
    entry.speedTier === "slow" ? 1 : entry.speedTier === "medium" ? 2 : 3,
  ].reduce((total, score) => total + score, 0)
}

function buildLoopAssignment(input: {
  role: ProviderLoopAssignment["role"]
  provider: Exclude<PromptProviderId, "local">
  model: string
  source: ProviderLoopAssignment["source"]
  notes: string
}): ProviderLoopAssignment {
  return {
    role: input.role,
    provider: input.provider,
    model: input.model,
    source: input.source,
    notes: input.notes,
  }
}

export function getConfiguredUserProviderRoster(
  settings: UserAiSettings | null | undefined,
): ConfiguredUserProviderRoster | null {
  if (!settings) return null

  const normalized = normalizeUserAiSettings(settings)
  if (normalized.defaultProvider === "local") {
    return null
  }

  const primaryProvider = normalized.defaultProvider
  const primaryApiKey = normalized.apiKeys[primaryProvider].trim()

  if (!primaryApiKey) {
    return null
  }

  const primary: ConfiguredUserProvider = {
    provider: primaryProvider,
    apiKey: primaryApiKey,
    model: resolveProviderModelForUsage({
      provider: primaryProvider,
      defaultModel: normalized.models[primaryProvider].trim(),
      usageModels: normalized.modelRouting[primaryProvider],
      routingPolicy: normalized.routingPolicies[primaryProvider],
      usage: "generationProfile",
    }).trim(),
    baseUrl: normalized.baseUrls[primaryProvider].trim(),
  }

  const supportProviders = (["claude", "openrouter", "gpt"] as const)
    .filter((provider) => provider !== primaryProvider && normalized.apiKeys[provider].trim())
    .map((provider) => ({
      provider,
      apiKey: normalized.apiKeys[provider].trim(),
      model: resolveProviderModelForUsage({
        provider,
        defaultModel: normalized.models[provider].trim(),
        usageModels: normalized.modelRouting[provider],
        routingPolicy: normalized.routingPolicies[provider],
        usage: "evaluation",
      }).trim(),
      baseUrl: normalized.baseUrls[provider].trim(),
    }))
    .sort((left, right) => scoreProviderAssignment(right.provider, right.model) - scoreProviderAssignment(left.provider, left.model))

  const criticSource = supportProviders[0] ?? primary
  const repairSource = supportProviders[1] ?? supportProviders[0] ?? primary
  const judgeSource = supportProviders[2] ?? supportProviders[1] ?? supportProviders[0] ?? primary

  const roster: ProviderLoopRoster = {
    mode: supportProviders.length === 0 ? "single_provider" : "cross_provider",
    availableProviders: [primary.provider, ...supportProviders.map((provider) => provider.provider)],
    assignments: [
      buildLoopAssignment({
        role: "author",
        provider: primary.provider,
        model: primary.model,
        source: "selected",
        notes: "Primary authoring provider for brief completion, candidate generation, and manifest lock.",
      }),
      buildLoopAssignment({
        role: "critic",
        provider: criticSource.provider,
        model: resolveProviderModelForUsage({
          provider: criticSource.provider,
          defaultModel: normalized.models[criticSource.provider].trim(),
          usageModels: normalized.modelRouting[criticSource.provider],
          routingPolicy: normalized.routingPolicies[criticSource.provider],
          usage: "candidateRanking",
        }).trim(),
        source: criticSource.provider === primary.provider ? "selected" : "support",
        notes: "Critiques candidate fidelity, anti-collapse risk, and runtime fit.",
      }),
      buildLoopAssignment({
        role: "repair",
        provider: repairSource.provider,
        model: resolveProviderModelForUsage({
          provider: repairSource.provider,
          defaultModel: normalized.models[repairSource.provider].trim(),
          usageModels: normalized.modelRouting[repairSource.provider],
          routingPolicy: normalized.routingPolicies[repairSource.provider],
          usage: "generationProfile",
        }).trim(),
        source: repairSource.provider === primary.provider ? "selected" : "support",
        notes: "Repairs weak candidate outputs and reasserts engine/runtime constraints.",
      }),
      buildLoopAssignment({
        role: "release_judge",
        provider: judgeSource.provider,
        model: resolveProviderModelForUsage({
          provider: judgeSource.provider,
          defaultModel: normalized.models[judgeSource.provider].trim(),
          usageModels: normalized.modelRouting[judgeSource.provider],
          routingPolicy: normalized.routingPolicies[judgeSource.provider],
          usage: "evaluation",
        }).trim(),
        source: judgeSource.provider === primary.provider ? "selected" : "support",
        notes: "Judges readiness, blockers, and release risk after the loop converges.",
      }),
    ],
  }

  return {
    primary,
    supportProviders,
    roster,
  }
}

export function sanitizeAdvisedFeatures(values: string[]) {
  return unique(values.filter((value) => generationFeatureSet.has(value)))
}

export function preferAdvisedList(advised: string[], fallback: string[], maxItems: number) {
  const cleaned = unique(advised.map((value) => value.trim()).filter(Boolean))
  return cleaned.length > 0 ? cleaned.slice(0, maxItems) : fallback.slice(0, maxItems)
}

export function clampAdvisedPlayers(multiplayer: boolean, fallbackPlayers: number, advisedPlayers?: number) {
  if (!multiplayer) return 1
  const nextValue = typeof advisedPlayers === "number" && Number.isFinite(advisedPlayers)
    ? advisedPlayers
    : fallbackPlayers
  return Math.max(2, Math.min(64, Math.floor(nextValue)))
}

export function applyGenerationAdvice(
  profile: GenerationIntelligenceProfile,
  advice: GenerationAdvice,
): GenerationIntelligenceProfile {
  return {
    ...profile,
    cameraStyle: advice.cameraStyle || profile.cameraStyle,
    promptSummary: advice.promptSummary || profile.promptSummary,
    generatedPitch: advice.generatedPitch || profile.generatedPitch,
    genreReason: advice.genreReason || profile.genreReason,
    playerFantasy: advice.playerFantasy || profile.playerFantasy,
    sessionFantasy: advice.sessionFantasy || profile.sessionFantasy,
    interactionModel: advice.interactionModel || profile.interactionModel,
    experienceGoals: preferAdvisedList(advice.experienceGoals, profile.experienceGoals, 6),
    contentPillars: preferAdvisedList(advice.contentPillars, profile.contentPillars, 6),
    progressionArcs: preferAdvisedList(advice.progressionArcs, profile.progressionArcs, 5),
    environmentThemes: preferAdvisedList(advice.environmentThemes, profile.environmentThemes, 6),
    uiSurfaces: preferAdvisedList(advice.uiSurfaces, profile.uiSurfaces, 6),
    systemPriorities: preferAdvisedList(advice.systemPriorities, profile.systemPriorities, 6),
    negativeConstraints: unique([
      ...profile.negativeConstraints,
      ...advice.negativeConstraints.map((value) => value.trim()).filter(Boolean),
    ]).slice(0, 8),
  }
}
