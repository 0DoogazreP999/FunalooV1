import type {
  GameDimension,
  GenerationReferenceExample,
  GenerationRuntimeArchetype,
  Genre,
} from "@/lib/engine/types"
import { titleCase } from "./shared"

interface ReferenceTemplate {
  id: string
  title: string
  genre: Genre
  dimension: GameDimension
  runtimeArchetype: GenerationRuntimeArchetype
  signals: string[]
  features: string[]
  fit: string
  mechanicsToBorrow: string[]
  antiPatterns: string[]
}

const REFERENCE_LIBRARY: ReferenceTemplate[] = [
  {
    id: "survival_outpost_horde",
    title: "Survival Outpost Horde",
    genre: "survival",
    dimension: "3d",
    runtimeArchetype: "survival_horde",
    signals: ["combat-heavy", "survival-pressure", "horror-tone", "repair-heavy"],
    features: ["combat", "inventory", "world_gen", "audio", "crafting"],
    fit: "Pressure-forward 3D survival loop with scavenging, repair, and escalating horde defense.",
    mechanicsToBorrow: ["Day-night tension handoff", "Shelter state upgrades", "Scavenging routes with recovery pockets"],
    antiPatterns: ["Do not flatten into a generic corridor shooter.", "Do not lose the shelter or scavenging loop in favor of pure combat."],
  },
  {
    id: "survival_expedition_cells",
    title: "Survival Expedition Cells",
    genre: "survival",
    dimension: "3d",
    runtimeArchetype: "survival_expedition_3d",
    signals: ["combat-heavy", "survival-heavy", "repair-heavy", "travel-heavy"],
    features: ["combat", "inventory", "world_gen", "audio", "crafting"],
    fit: "A larger 3D survival slice with scavenging districts, safehouse return loops, and extraction-driven escalation.",
    mechanicsToBorrow: ["Zone-to-safehouse pacing", "Scavenge versus extraction risk", "Repair-led long-session recovery"],
    antiPatterns: ["Do not downgrade the run into fortify-only buttons.", "Do not remove direct-avatar traversal from the survival loop."],
  },
  {
    id: "seasonal_homestead_life",
    title: "Seasonal Homestead Life",
    genre: "simulation",
    dimension: "2d",
    runtimeArchetype: "homestead_life",
    signals: ["peaceful", "farming-sim", "social-heavy", "routine-heavy"],
    features: ["farming", "inventory", "ui", "ai_npc", "trading"],
    fit: "Cozy daily-routine structure with seasons, villagers, upgrades, and readable economic loops.",
    mechanicsToBorrow: ["Seasonal crop progression", "Villager schedule readability", "Market and festival payoff beats"],
    antiPatterns: ["Do not inject combat unless the prompt explicitly asks for it.", "Do not reduce the sim to a static postcard scene."],
  },
  {
    id: "social_vote_loop",
    title: "Social Vote Loop",
    genre: "strategy",
    dimension: "2d",
    runtimeArchetype: "strategy_command",
    signals: ["social-deduction", "party-energy", "intense-pacing"],
    features: ["social_deduction", "networking", "ui", "dialogue"],
    fit: "Hidden-role pressure structure built around tasks, meetings, suspicion, and readable social state.",
    mechanicsToBorrow: ["Meeting cadence", "Visible accusation pressure", "Task network that feeds social suspicion"],
    antiPatterns: ["Do not fall back to weapon combat.", "Do not hide vital social state behind unreadable UI."],
  },
  {
    id: "puzzle_chamber_sandbox",
    title: "Puzzle Chamber Sandbox",
    genre: "adventure",
    dimension: "3d",
    runtimeArchetype: "journey_route",
    signals: ["puzzle-heavy", "physics-sandbox", "novelty-high"],
    features: ["puzzle", "physics_sandbox", "ui"],
    fit: "First-person chamber structure where experimentation, rule discovery, and spatial clarity drive the session.",
    mechanicsToBorrow: ["Single-room rule teaching", "Escalating combinatorial puzzle verbs", "Readable reset and retry flow"],
    antiPatterns: ["Do not add combat as filler.", "Do not bury puzzle affordances under prop clutter."],
  },
  {
    id: "deck_command_district",
    title: "Deck Command District",
    genre: "strategy",
    dimension: "2d",
    runtimeArchetype: "strategy_command",
    signals: ["deckbuilder", "city-politics", "economy-heavy", "turn-based"],
    features: ["deckbuilding", "diplomacy", "faction_reputation", "ui"],
    fit: "Card-led district command structure where planning, policy swings, and reputation matter every turn.",
    mechanicsToBorrow: ["Hand-driven macro decisions", "Faction leverage payoffs", "District instability events"],
    antiPatterns: ["Do not collapse the cards into a cosmetic modifier layer.", "Do not substitute direct combat for political pressure."],
  },
  {
    id: "civic_policy_chamber",
    title: "Civic Policy Chamber",
    genre: "strategy",
    dimension: "2d",
    runtimeArchetype: "strategy_command",
    signals: ["politics-heavy", "social-heavy", "economy-heavy"],
    features: ["diplomacy", "faction_reputation", "dialogue", "ui"],
    fit: "Policy-driven command structure where coalitions, public pressure, and civic tradeoffs define every round.",
    mechanicsToBorrow: ["Faction leverage ladders", "Policy timing windows", "Council-state readability"],
    antiPatterns: ["Do not flatten politics into pure flavor text.", "Do not replace leverage and consequences with generic combat tempo."],
  },
  {
    id: "caravan_trade_route",
    title: "Caravan Trade Route",
    genre: "simulation",
    dimension: "2d",
    runtimeArchetype: "journey_route",
    signals: ["travel-heavy", "economy-heavy", "peaceful", "logistics"],
    features: ["trading", "world_gen", "inventory", "ui"],
    fit: "Journey simulation where route choice, weather, cargo, and supply pressure create the drama.",
    mechanicsToBorrow: ["Route risk evaluation", "Cargo and morale balancing", "Event-driven trade swings"],
    antiPatterns: ["Do not add combat if the brief asks for no combat.", "Do not turn travel into a disconnected menu loop."],
  },
  {
    id: "sports_season_command",
    title: "Sports Season Command",
    genre: "simulation",
    dimension: "2d",
    runtimeArchetype: "strategy_command",
    signals: ["sports-rules", "management-heavy", "seasonal"],
    features: ["sports_rules", "ui", "companion_behaviors"],
    fit: "Rules-driven season structure where roster, momentum, and match decisions shape long-form progression.",
    mechanicsToBorrow: ["Season ladder pacing", "Readable tactical calls", "Roster chemistry hooks"],
    antiPatterns: ["Do not reskin combat verbs into sports actions.", "Do not skip the actual ruleset language of the sport."],
  },
  {
    id: "co_op_tactical_quest",
    title: "Co-op Tactical Quest",
    genre: "rpg",
    dimension: "3d",
    runtimeArchetype: "combat_mission",
    signals: ["co-op", "questing", "party-heavy", "tactics"],
    features: ["party_tactics", "questing", "inventory", "combat", "ai_npc"],
    fit: "Mission-led co-op quest structure with role clarity, readable positioning, and progression-driven objectives.",
    mechanicsToBorrow: ["Role-based encounter composition", "Quest hub to mission handoff", "Companion-assisted traversal"],
    antiPatterns: ["Do not reduce the party to solo gunplay.", "Do not lose quest progression inside generic skirmishes."],
  },
  {
    id: "immersive_heist_compound",
    title: "Immersive Heist Compound",
    genre: "fps",
    dimension: "3d",
    runtimeArchetype: "action_operation_3d",
    signals: ["heist-heavy", "immersive-sim", "stealth-heavy", "extraction-heavy"],
    features: ["stealth", "questing", "combat", "ui", "ai_npc"],
    fit: "Systemic 3D infiltration structure with layered routes, reactive security, and extraction-driven payoff.",
    mechanicsToBorrow: ["Multiple valid entry plans", "Security escalation tiers", "Getaway routing with consequence"],
    antiPatterns: ["Do not turn the compound into a single hallway shootout.", "Do not remove the player's ability to improvise through layered systems."],
  },
  {
    id: "special_ops_action_operation",
    title: "Special Ops Action Operation",
    genre: "fps",
    dimension: "3d",
    runtimeArchetype: "action_operation_3d",
    signals: ["combat-heavy", "mission-led", "stealth-heavy", "co-op"],
    features: ["combat", "rendering", "audio", "ui", "questing"],
    fit: "A direct-avatar 3D operation structure with breach objectives, readable combat lanes, and extraction payoff.",
    mechanicsToBorrow: ["Objective chain pacing", "Cover-to-cover pressure", "Mission-room landmarking"],
    antiPatterns: ["Do not collapse into board-state command play.", "Do not strip away mission nouns and squad language."],
  },
  {
    id: "stealth_infiltration_route",
    title: "Stealth Infiltration Route",
    genre: "adventure",
    dimension: "3d",
    runtimeArchetype: "combat_mission",
    signals: ["stealth-heavy", "mission-led", "tension"],
    features: ["stealth", "questing", "ui", "ai_npc"],
    fit: "Objective-led infiltration structure where line-of-sight, timing, and recovery routes matter more than raw combat.",
    mechanicsToBorrow: ["Alert-state staging", "Fallback hide and recover pockets", "Layered objective compounds"],
    antiPatterns: ["Do not collapse stealth into open firefights.", "Do not make mission spaces unreadable."],
  },
  {
    id: "investigation_case_district",
    title: "Investigation Case District",
    genre: "adventure",
    dimension: "3d",
    runtimeArchetype: "journey_route",
    signals: ["investigation-heavy", "mystery-heavy", "story-heavy"],
    features: ["dialogue", "questing", "ui", "ai_npc"],
    fit: "Clue-led district exploration structure where each stop resolves a lead and sharpens the next theory.",
    mechanicsToBorrow: ["Lead-to-location pacing", "Suspect pressure boards", "Evidence synthesis payoffs"],
    antiPatterns: ["Do not replace deduction with combat filler.", "Do not scatter clue state across unreadable scenes."],
  },
  {
    id: "colony_pressure_network",
    title: "Colony Pressure Network",
    genre: "simulation",
    dimension: "hybrid",
    runtimeArchetype: "strategy_command",
    signals: ["colony-sim", "survival-pressure", "economy-heavy"],
    features: ["colony_management", "construction_mode", "farming", "diplomacy"],
    fit: "Settlement command structure where production chains, citizen states, and external pressure all stay visible.",
    mechanicsToBorrow: ["Labor allocation loops", "Production bottleneck visibility", "External pressure escalations"],
    antiPatterns: ["Do not turn colony management into decoration.", "Do not hide state changes from the player."],
  },
  {
    id: "restoration_expedition_campus",
    title: "Restoration Expedition Campus",
    genre: "simulation",
    dimension: "2d",
    runtimeArchetype: "homestead_life",
    signals: ["archaeology-heavy", "restoration-heavy", "peaceful", "simulation-heavy"],
    features: ["inventory", "ui", "world_gen", "dialogue"],
    fit: "A calm-but-rich loop of field recovery, artifact cleaning, restoration, and curated display payoff.",
    mechanicsToBorrow: ["Condition-state workflows", "Workshop-to-exhibit loops", "Expedition prep cadence"],
    antiPatterns: ["Do not turn restoration into a passive timer.", "Do not lose the before-and-after payoff of the work."],
  },
  {
    id: "journey_landmark_route",
    title: "Journey Landmark Route",
    genre: "adventure",
    dimension: "2d",
    runtimeArchetype: "journey_route",
    signals: ["travel-heavy", "narrative-heavy", "peaceful"],
    features: ["dialogue", "questing", "world_gen", "ui"],
    fit: "Route-driven adventure where landmarks, discoveries, and event choices are the primary reward.",
    mechanicsToBorrow: ["Landmark anticipation", "Branching travel events", "Readable stop-to-stop cadence"],
    antiPatterns: ["Do not force combat into a travel prompt.", "Do not flatten the route into disconnected scenes."],
  },
  {
    id: "persistent_hub_raid",
    title: "Persistent Hub Raid",
    genre: "mmo",
    dimension: "3d",
    runtimeArchetype: "combat_mission",
    signals: ["massive-scale", "raid-play", "social-heavy"],
    features: ["networking", "questing", "combat", "ui", "ai_npc"],
    fit: "Shared-world structure with strong hub readability, group roles, and coordinated raid escalation.",
    mechanicsToBorrow: ["Hub-to-activity choreography", "Role readability in crowds", "Persistent progression breadcrumbs"],
    antiPatterns: ["Do not fake MMO scale by only inflating player count.", "Do not make the first playable slice feel like solo combat."],
  },
]

function scoreReference(input: {
  template: ReferenceTemplate
  genre: Genre
  dimension: GameDimension
  runtimeArchetype: GenerationRuntimeArchetype
  promptSignals: string[]
  resolvedFeatures: string[]
}) {
  const signalMatches = input.template.signals.filter((signal) => input.promptSignals.includes(signal)).length
  const featureMatches = input.template.features.filter((feature) => input.resolvedFeatures.includes(feature)).length

  return (
    (input.template.genre === input.genre ? 6 : 0) +
    (input.template.dimension === input.dimension ? 4 : 0) +
    (input.template.runtimeArchetype === input.runtimeArchetype ? 5 : 0) +
    signalMatches * 3 +
    featureMatches * 2
  )
}

export function planGenerationReferences(input: {
  genre: Genre
  dimension: GameDimension
  runtimeArchetype: GenerationRuntimeArchetype
  promptSignals: string[]
  resolvedFeatures: string[]
}): GenerationReferenceExample[] {
  const ranked = REFERENCE_LIBRARY
    .map((template) => ({
      template,
      score: scoreReference({
        template,
        genre: input.genre,
        dimension: input.dimension,
        runtimeArchetype: input.runtimeArchetype,
        promptSignals: input.promptSignals,
        resolvedFeatures: input.resolvedFeatures,
      }),
    }))
    .sort((left, right) => right.score - left.score || left.template.title.localeCompare(right.template.title))

  const selected = ranked
    .filter((entry) => entry.score > 0)
    .slice(0, 3)
    .map(({ template, score }) => ({
      id: template.id,
      title: template.title,
      genre: template.genre,
      dimension: template.dimension,
      runtimeArchetype: template.runtimeArchetype,
      fit: template.fit,
      retrievalReason: [
        `${titleCase(input.genre)} prompt matched ${score} reference signals.`,
        template.genre === input.genre ? "Genre alignment held." : `Cross-genre adjacency from ${titleCase(template.genre)} patterns.`,
        template.dimension === input.dimension ? "Dimension fit stayed intact." : `Borrow selectively from ${template.dimension.toUpperCase()} structure.`,
      ].join(" "),
      mechanicsToBorrow: template.mechanicsToBorrow,
      antiPatterns: template.antiPatterns,
    }))

  if (selected.length > 0) {
    return selected
  }

  return [
    {
      id: `fallback_${input.genre}`,
      title: `${titleCase(input.genre)} Core Reference`,
      genre: input.genre,
      dimension: input.dimension,
      runtimeArchetype: input.runtimeArchetype,
      fit: `Fallback ${titleCase(input.genre)} reference tuned to preserve runtime and dimension fidelity.`,
      retrievalReason: "No closer reference matched the prompt, so the planner preserved the genre core and runtime contract as the retrieval baseline.",
      mechanicsToBorrow: [
        `${titleCase(input.genre)} loop readability`,
        `${input.dimension.toUpperCase()} runtime fidelity`,
        "Prompt-faithful first-session verbs",
      ],
      antiPatterns: [
        "Do not collapse into the generic fallback loop.",
        "Do not erase prompt-specific constraints when broadening scope.",
      ],
    },
  ]
}
