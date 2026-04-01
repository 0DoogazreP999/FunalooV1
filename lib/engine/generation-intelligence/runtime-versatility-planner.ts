import type {
  GameDimension,
  GenerationRuntimeActionLabels,
  GenerationRuntimeArchetype,
  GenerationRuntimeEncounterLabels,
  GenerationRuntimeResourceLabels,
  GenerationRuntimeVersatilityFlavorId,
  GenerationRuntimeVersatilityPlan,
  Genre,
} from "@/lib/engine/types"
import { titleCase, unique } from "./shared"

interface RuntimeVersatilitySeed {
  flavorId: GenerationRuntimeVersatilityFlavorId
  flavorLabel: string
  runtimeSubtitle: string
  activeModules: string[]
  primaryVerbs: string[]
  pressureTracks: string[]
  resourceLabels: GenerationRuntimeResourceLabels
  encounterLabels: GenerationRuntimeEncounterLabels
  actionLabels: GenerationRuntimeActionLabels
  objectiveHooks: string[]
  uiCallouts: string[]
  eventCues: string[]
}

function hasSignal(signals: string[], signal: string) {
  return signals.includes(signal)
}

function matchesPrompt(prompt: string, pattern: RegExp) {
  return pattern.test(prompt.toLowerCase())
}

function createSeed(input: {
  runtimeArchetype: GenerationRuntimeArchetype
  dimension: GameDimension
}): RuntimeVersatilitySeed {
  switch (input.runtimeArchetype) {
    case "survival_expedition_3d":
    case "survival_horde":
      return {
        flavorId: "baseline",
        flavorLabel: "Survival Pressure",
        runtimeSubtitle: "A survival slice tuned around scavenging, shelter upkeep, and visible escalation.",
        activeModules: ["Scavenge routes", "Shelter upkeep", "Pressure spikes"],
        primaryVerbs: ["scavenge", "repair", "hold", "extract"],
        pressureTracks: ["Shelter integrity", "Night pressure", "Supply drain"],
        resourceLabels: { primary: "Rations", secondary: "Salvage", support: "Ammo", recovery: "Medkits" },
        encounterLabels: {
          hostile: "Infected",
          elite: "Breaker",
          collectible: "Supply Cache",
          support: "Repair Node",
          destination: "Safehouse Route",
        },
        actionLabels: {
          primary: "Push Route",
          secondary: "Secure Shelter",
          recovery: "Ration",
          utility: "Reposition",
        },
        objectiveHooks: [
          "Open with a supply run that proves the survival fantasy immediately.",
          "Force a repair-or-recover beat before the pressure spike lands.",
          "Close on safehouse survival or extraction, not abstract score only.",
        ],
        uiCallouts: ["Vitals", "Threat direction", "Supply ledger"],
        eventCues: ["Scavenge window", "Perimeter breach", "Extraction call"],
      }
    case "journey_route":
      return {
        flavorId: "baseline",
        flavorLabel: "Route Journey",
        runtimeSubtitle: "A route-first runtime built around pace, stop resolution, and endurance.",
        activeModules: ["Route pacing", "Stop resolution", "Endurance management"],
        primaryVerbs: ["travel", "stabilize", "resolve", "arrive"],
        pressureTracks: ["Route risk", "Morale drift", "Supply burn"],
        resourceLabels: { primary: "Supplies", secondary: "Morale", support: "Repair Stock", recovery: "Camp Stores" },
        encounterLabels: {
          hostile: "Hazard",
          elite: "Deadfall",
          collectible: "Trail Pickup",
          support: "Camp",
          destination: "Destination",
        },
        actionLabels: {
          primary: "Resolve Stop",
          secondary: "Push Pace",
          recovery: "Recover",
          utility: "Steer Route",
        },
        objectiveHooks: [
          "Make the opening leg readable so the route fantasy lands immediately.",
          "Use stops to turn the prompt into concrete journey decisions.",
          "Finish on arrival or destination payoff rather than a generic win card.",
        ],
        uiCallouts: ["Pace", "Next stop", "Route condition"],
        eventCues: ["Trail hazard", "Camp stop", "Final arrival"],
      }
    case "homestead_life":
      return {
        flavorId: "baseline",
        flavorLabel: "Routine Growth",
        runtimeSubtitle: "A daily-loop runtime that rewards rhythm, upkeep, and gentle progression.",
        activeModules: ["Daily routine", "Harvest cadence", "Trust growth"],
        primaryVerbs: ["tend", "grow", "harvest", "sell"],
        pressureTracks: ["Daylight", "Village trust", "Energy"],
        resourceLabels: { primary: "Seeds", secondary: "Water", support: "Harvest", recovery: "Trust" },
        encounterLabels: {
          hostile: "Weather Front",
          elite: "Season Crunch",
          collectible: "Harvest Basket",
          support: "Market Stand",
          destination: "Season Goal",
        },
        actionLabels: {
          primary: "Tend Field",
          secondary: "Sell Harvest",
          recovery: "End Day",
          utility: "Field Route",
        },
        objectiveHooks: [
          "Teach the full cozy loop in the first minute with minimal friction.",
          "Make each harvest and cashout feel like visible growth.",
          "Finish on a season or trust milestone rather than combat resolution.",
        ],
        uiCallouts: ["Daily clock", "Crop state", "Trust target"],
        eventCues: ["Field ready", "Market day", "Season turn"],
      }
    case "strategy_command":
      return {
        flavorId: "baseline",
        flavorLabel: "Command Board",
        runtimeSubtitle: "A board-state runtime centered on allocation, pressure, and decisive operations.",
        activeModules: ["Board pressure", "Resource allocation", "Operation timing"],
        primaryVerbs: ["allocate", "fortify", "operate", "stabilize"],
        pressureTracks: ["Front pressure", "Morale", "Control swing"],
        resourceLabels: { primary: "Supply", secondary: "Morale", support: "Intel", recovery: "Command" },
        encounterLabels: {
          hostile: "Threat",
          elite: "Crisis",
          collectible: "Yield",
          support: "Operation",
          destination: "Control Line",
        },
        actionLabels: {
          primary: "Launch Operation",
          secondary: "Allocate Supply",
          recovery: "Fortify Line",
          utility: "Rebalance Front",
        },
        objectiveHooks: [
          "Make the board readable immediately so each turn feels intentional.",
          "Translate the prompt into visible command tradeoffs rather than cosmetic text only.",
          "Win on stabilization, coalition, or control instead of hidden math alone.",
        ],
        uiCallouts: ["Command reserve", "Threat overview", "Sector focus"],
        eventCues: ["Front surge", "Control swing", "Command window"],
      }
    case "action_operation_3d":
    case "combat_mission":
    default:
      return {
        flavorId: "baseline",
        flavorLabel: input.dimension === "3d" ? "Action Operation" : "Combat Mission",
        runtimeSubtitle: "A direct-action slice driven by objectives, threat routing, and extraction.",
        activeModules: ["Objective chain", "Threat routing", "Extraction payoff"],
        primaryVerbs: ["push", "clear", "secure", "extract"],
        pressureTracks: ["Objective heat", "Armor", "Route control"],
        resourceLabels: { primary: "Intel", secondary: "Supplies", support: "Ammo", recovery: "Armor" },
        encounterLabels: {
          hostile: "Responder",
          elite: "Heavy",
          collectible: "Objective Cache",
          support: "Tool Locker",
          destination: "Extract Route",
        },
        actionLabels: {
          primary: "Secure Objective",
          secondary: "Push Lane",
          recovery: "Rearm",
          utility: "Reposition",
        },
        objectiveHooks: [
          "Open on a named objective so the player knows why the route matters.",
          "Keep threat reads and support interactions visible through the middle beat.",
          "Finish on extract or mission lock instead of generic score chasing.",
        ],
        uiCallouts: ["Objective feed", "Threat lane", "Support cache"],
        eventCues: ["Breach point", "Objective room", "Extraction lane"],
      }
  }
}

function inferFlavorId(input: {
  prompt: string
  runtimeArchetype: GenerationRuntimeArchetype
  promptSignals: string[]
}): GenerationRuntimeVersatilityFlavorId {
  const { prompt, promptSignals, runtimeArchetype } = input

  if (hasSignal(promptSignals, "metroidbrainia")) return "metroidbrainia_logic"
  if (hasSignal(promptSignals, "soulslike")) return "soulslike_mastery"
  if (hasSignal(promptSignals, "four_x")) return "four_x_grand_strategy"
  if (hasSignal(promptSignals, "deckbuilder")) return "deckbuilding_synergy"
  if (hasSignal(promptSignals, "sports-heavy")) return "sports_competition"
  if (hasSignal(promptSignals, "puzzle-heavy")) return "puzzle_chambers"
  if (hasSignal(promptSignals, "social-deduction")) return "social_suspicion"
  if (hasSignal(promptSignals, "politics-heavy")) return "political_command"
  if (hasSignal(promptSignals, "farming-heavy")) return "cozy_agriculture"
  if (hasSignal(promptSignals, "economy-heavy") || hasSignal(promptSignals, "travel-heavy")) return "frontier_trade"
  if (hasSignal(promptSignals, "archaeology-heavy") || hasSignal(promptSignals, "restoration-heavy")) return "curation_restoration"
  if (hasSignal(promptSignals, "investigation-heavy") || hasSignal(promptSignals, "mystery-heavy")) return "forensic_investigation"
  if (hasSignal(promptSignals, "immersive-sim")) return "systemic_infiltration"
  if (hasSignal(promptSignals, "heist-heavy")) return "heist_infiltration"
  if (
    runtimeArchetype === "survival_expedition_3d" ||
    runtimeArchetype === "survival_horde" ||
    matchesPrompt(prompt, /zombie|infected|undead|horde|apocalypse|safehouse|night hunter/)
  ) {
    return "zombie_expedition"
  }
  if (
    runtimeArchetype === "action_operation_3d" &&
    (hasSignal(promptSignals, "extraction-heavy") || matchesPrompt(prompt, /extract|raid|mission|breach|squad|operation/))
  ) {
    return "extraction_operation"
  }

  return "baseline"
}

function buildFeatureModules(features: string[]) {
  return features.flatMap((feature) => {
    switch (feature) {
      case "stealth":
        return ["Stealth routes"]
      case "dialogue":
        return ["Dialogue beats"]
      case "questing":
        return ["Quest beats"]
      case "deckbuilding":
        return ["Card sequencing"]
      case "diplomacy":
      case "faction_reputation":
        return ["Faction leverage"]
      case "physics_sandbox":
        return ["System sandbox"]
      case "construction_mode":
      case "colony_management":
        return ["Base shaping"]
      case "companion_behaviors":
      case "ai_npc":
        return ["Companion support"]
      case "trading":
        return ["Trade windows"]
      case "survival_needs":
        return ["Survival upkeep"]
      case "crafting":
        return ["Craft cadence"]
      default:
        return []
    }
  })
}

function buildLoopVerbs(coreLoop: string[], secondaryLoop: string[], progressionLoop: string[]) {
  return unique(
    [...coreLoop, ...secondaryLoop, ...progressionLoop]
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => entry.split(/[,.]/)[0]?.trim() ?? entry)
      .slice(0, 6),
  )
}

export function planGenerationRuntimeVersatility(input: {
  prompt: string
  genre: Genre
  dimension: GameDimension
  runtimeArchetype: GenerationRuntimeArchetype
  promptSignals: string[]
  resolvedFeatures: string[]
  contentPillars: string[]
  coreLoop: string[]
  secondaryLoop: string[]
  progressionLoop: string[]
  uiSurfaces: string[]
  environmentThemes: string[]
}): GenerationRuntimeVersatilityPlan {
  const flavorId = inferFlavorId({
    prompt: input.prompt,
    runtimeArchetype: input.runtimeArchetype,
    promptSignals: input.promptSignals,
  })
  const base = createSeed({
    runtimeArchetype: input.runtimeArchetype,
    dimension: input.dimension,
  })
  const genreModule = `${titleCase(input.genre.replace(/_/g, " "))} identity`
  const verbs = buildLoopVerbs(input.coreLoop, input.secondaryLoop, input.progressionLoop)
  const modules = buildFeatureModules(input.resolvedFeatures)
  const subtitle = {
    extraction_operation: "A high-pressure operation slice shaped around breach, retrieval, and clean exfiltration.",
    zombie_expedition: "A survival slice shaped around infected pressure, salvage, and safehouse recovery.",
    heist_infiltration: "A stealth-forward action slice shaped around alarms, breach points, and a clean getaway.",
    systemic_infiltration: "A multi-solution slice that rewards route reading, tool use, and layered pressure management.",
    forensic_investigation: "A clue-driven slice that treats evidence, leads, and case pressure as the main gameplay state.",
    curation_restoration: "A recovery-and-catalog slice focused on preserving, restoring, and presenting valuable finds.",
    cozy_agriculture: "A warm routine slice focused on growth cadence, gentle optimization, and community trust.",
    frontier_trade: "A logistics-forward route slice built around cargo, weather, and stop-to-stop pressure.",
    political_command: "A command-board slice centered on blocs, agenda pressure, and legitimacy management.",
    social_suspicion: "A readable social-pressure slice built around trust, suspicion, and vote timing.",
    puzzle_chambers: "A clean systemic slice that rewards constraint reading, sequencing, and chamber flow.",
    sports_competition: "A tempo-forward slice focused on momentum, possession, and readable score pressure.",
    metroidbrainia_logic: "A deductive mystery slice where mechanic literacy and world-reading are the primary keys.",
    soulslike_mastery: "A high-lethality mastery slice built around shortcut discovery, pattern learning, and persistence.",
    four_x_grand_strategy: "A grand-scale strategic slice centered on territory, resource yields, and global dominance.",
    deckbuilding_synergy: "A tactical card-drafting slice shaped around engine building, synergy, and run-to-run variety.",
    baseline: base.runtimeSubtitle,
  }[flavorId]

  const flavorLabel = {
    extraction_operation: "Extraction Operation",
    zombie_expedition: "Zombie Expedition",
    heist_infiltration: "Heist Infiltration",
    systemic_infiltration: "Systemic Infiltration",
    forensic_investigation: "Forensic Investigation",
    curation_restoration: "Restoration Circuit",
    cozy_agriculture: "Cozy Agriculture",
    frontier_trade: "Frontier Trade",
    political_command: "Political Command",
    social_suspicion: "Social Suspicion",
    puzzle_chambers: "Logic Chambers",
    sports_competition: "Broadcast Competition",
    metroidbrainia_logic: "Knowledge Mystery",
    soulslike_mastery: "Pattern Mastery",
    four_x_grand_strategy: "Grand Strategy",
    deckbuilding_synergy: "Synergy Draft",
    baseline: base.flavorLabel,
  }[flavorId]

  const resourceLabels: Record<GenerationRuntimeVersatilityFlavorId, GenerationRuntimeResourceLabels | undefined> = {
    baseline: undefined,
    extraction_operation: { primary: "Objective Intel", secondary: "Breach Kits", support: "Ammo", recovery: "Armor Plates" },
    zombie_expedition: { primary: "Rations", secondary: "Scrap", support: "Ammo", recovery: "Medical Stock" },
    heist_infiltration: { primary: "Vault Intel", secondary: "Bypass Tools", support: "Ammo", recovery: "Disguise Window" },
    systemic_infiltration: { primary: "Tool Charge", secondary: "Leads", support: "Ammo", recovery: "Cover Window" },
    forensic_investigation: { primary: "Evidence", secondary: "Leads", support: "Forensics", recovery: "Composure" },
    curation_restoration: { primary: "Artifacts", secondary: "Restoration Parts", support: "Archive Notes", recovery: "Preservation Kits" },
    cozy_agriculture: { primary: "Seeds", secondary: "Water", support: "Harvest", recovery: "Trust" },
    frontier_trade: { primary: "Cargo", secondary: "Morale", support: "Repair Stock", recovery: "Camp Stores" },
    political_command: { primary: "Influence", secondary: "Legitimacy", support: "Leverage", recovery: "Mandates" },
    social_suspicion: { primary: "Trust", secondary: "Suspicion", support: "Leverage", recovery: "Alibis" },
    puzzle_chambers: { primary: "Charge", secondary: "Resets", support: "Tools", recovery: "Hint Windows" },
    sports_competition: { primary: "Momentum", secondary: "Possession", support: "Tactics", recovery: "Timeouts" },
    metroidbrainia_logic: { primary: "Clues", secondary: "Rules", support: "Tools", recovery: "Clarity" },
    soulslike_mastery: { primary: "Essence", secondary: "Scraps", support: "Stamina", recovery: "Safe Haven" },
    four_x_grand_strategy: { primary: "Credits", secondary: "Yields", support: "Tech", recovery: "Stability" },
    deckbuilding_synergy: { primary: "Cards", secondary: "Relics", support: "Energy", recovery: "Rest" },
  }

  const encounterLabels: Record<GenerationRuntimeVersatilityFlavorId, GenerationRuntimeEncounterLabels | undefined> = {
    baseline: undefined,
    extraction_operation: { hostile: "Response Team", elite: "Anchor Guard", collectible: "Intel Package", support: "Breach Kit", destination: "Exfil Route" },
    zombie_expedition: { hostile: "Infected", elite: "Night Hunter", collectible: "Salvage Crate", support: "Generator Node", destination: "Safehouse Line" },
    heist_infiltration: { hostile: "Security Patrol", elite: "Response Squad", collectible: "Vault Target", support: "Bypass Node", destination: "Getaway Route" },
    systemic_infiltration: { hostile: "Guard", elite: "Lockdown Unit", collectible: "Access Token", support: "System Relay", destination: "Access Route" },
    forensic_investigation: { hostile: "Complication", elite: "Prime Suspect", collectible: "Evidence Case", support: "Field Kit", destination: "Case Board" },
    curation_restoration: { hostile: "Site Hazard", elite: "Collapse Risk", collectible: "Artifact Crate", support: "Workbench", destination: "Archive Hall" },
    cozy_agriculture: { hostile: "Weather Front", elite: "Season Crunch", collectible: "Harvest Basket", support: "Market Stand", destination: "Season Goal" },
    frontier_trade: { hostile: "Road Hazard", elite: "Storm Front", collectible: "Cargo Cache", support: "Trade Post", destination: "Contract Stop" },
    political_command: { hostile: "Opposition", elite: "Scandal", collectible: "Policy Window", support: "Coalition Bloc", destination: "Majority Line" },
    social_suspicion: { hostile: "Accuser", elite: "Ringleader", collectible: "Tell", support: "Alibi Window", destination: "Vote Round" },
    puzzle_chambers: { hostile: "Blocker", elite: "Deadlock", collectible: "Charge Node", support: "Reset Pad", destination: "Exit Gate" },
    sports_competition: { hostile: "Pressure Lane", elite: "Star Play", collectible: "Boost Pickup", support: "Set Piece", destination: "Scoring Window" },
    metroidbrainia_logic: { hostile: "Opaque Rule", elite: "Logic Gate", collectible: "Rosetta Clue", support: "Knowledge Node", destination: "Truth" },
    soulslike_mastery: { hostile: "Stalker", elite: "Pattern Boss", collectible: "Shortcut", support: "Bonfire Hub", destination: "Next Haven" },
    four_x_grand_strategy: { hostile: "Rival Power", elite: "Crisis Node", collectible: "Strategic Resource", support: "Trading Hub", destination: "Dominance" },
    deckbuilding_synergy: { hostile: "Minion Fight", elite: "Synergy Exam", collectible: "Rare Relic", support: "Rest Site", destination: "Boss Node" },
  }

  const actionLabels: Record<GenerationRuntimeVersatilityFlavorId, GenerationRuntimeActionLabels | undefined> = {
    baseline: undefined,
    extraction_operation: { primary: "Breach Target", secondary: "Push Exfil", recovery: "Plate Up", utility: "Shift Lanes" },
    zombie_expedition: { primary: "Secure Salvage", secondary: "Repair Line", recovery: "Patch Up", utility: "Evade Surge" },
    heist_infiltration: { primary: "Crack Target", secondary: "Bypass Security", recovery: "Drop Heat", utility: "Ghost Shift" },
    systemic_infiltration: { primary: "Disable Layer", secondary: "Reroute Access", recovery: "Reset Pressure", utility: "Swap Route" },
    forensic_investigation: { primary: "Confirm Lead", secondary: "Cross-Check", recovery: "Regroup", utility: "Survey Space" },
    curation_restoration: { primary: "Restore Find", secondary: "Catalog Piece", recovery: "Stabilize Site", utility: "Inspect Route" },
    cozy_agriculture: { primary: "Tend Field", secondary: "Sell Harvest", recovery: "End Day", utility: "Field Route" },
    frontier_trade: { primary: "Resolve Contract", secondary: "Push Pace", recovery: "Rebalance Cargo", utility: "Reroute Convoy" },
    political_command: { primary: "Pass Agenda", secondary: "Secure Bloc", recovery: "Stabilize Coalition", utility: "Whip Votes" },
    social_suspicion: { primary: "Resolve Vote", secondary: "Shift Suspicion", recovery: "Reset Trust", utility: "Read Table" },
    puzzle_chambers: { primary: "Resolve Chamber", secondary: "Route Charge", recovery: "Reset Pattern", utility: "Survey Chamber" },
    sports_competition: { primary: "Run Play", secondary: "Control Tempo", recovery: "Reset Shape", utility: "Shift Formation" },
    metroidbrainia_logic: { primary: "Apply Logic", secondary: "Decipher Rule", recovery: "Recenter", utility: "Map Rule" },
    soulslike_mastery: { primary: "Attack Pattern", secondary: "Master Shortcut", recovery: "Rest at Hub", utility: "Recover Essence" },
    four_x_grand_strategy: { primary: "Found City", secondary: "Project Power", recovery: "Build Stabilizer", utility: "Research Tech" },
    deckbuilding_synergy: { primary: "Play Hand", secondary: "Draft Card", recovery: "Thin Deck", utility: "Use Relic" },
  }

  const objectiveHooks: Record<GenerationRuntimeVersatilityFlavorId, string[] | undefined> = {
    baseline: undefined,
    extraction_operation: ["Open on infiltration and target isolation, not generic firefights.", "Make the middle beat about retrieval pressure, not pure elimination count.", "Close on exfil timing and route control so extraction language stays real."],
    zombie_expedition: ["Make salvage and infected pressure visible in the first beat.", "Use the middle run to force repair-or-hold choices under rising horde pressure.", "End on safehouse survival or escape, not on abstract score alone."],
    heist_infiltration: ["Begin with a silent entry beat that proves the heist fantasy immediately.", "Use the middle phase to force bypass-or-push decisions instead of only shooting.", "End on a getaway route and alarm pressure, not a flat room clear."],
    systemic_infiltration: ["Show multiple solutions in the first phase so the prompt does not collapse into pure combat.", "Let support interactions change the route state instead of only granting score.", "End on a controlled access state rather than a generic clear-all objective."],
    forensic_investigation: ["Open on a clue or evidence beat so the investigation fantasy appears immediately.", "Use the middle phase to connect leads rather than only clear threats.", "End on a resolved case state or evidence board instead of extraction alone."],
    curation_restoration: ["Put recovery and preservation verbs on screen right away.", "Let the mid-run focus on catalog or restoration throughput instead of generic pickup.", "End on a preservation or archive milestone that respects the restoration fantasy."],
    cozy_agriculture: ["Teach the full cozy loop in the first minute with very little friction.", "Make each harvest and cashout feel like visible growth, not just numbers moving.", "Finish on a season or trust milestone that feels earned and calm."],
    frontier_trade: ["Open on cargo identity and route stakes, not generic travel alone.", "Use stops to make trade and logistics decisions visible in the middle beat.", "Finish on delivery, contract success, or convoy arrival so the trade fantasy lands cleanly."],
    political_command: ["Make the first turn about coalition identity and visible political leverage.", "Translate the middle beat into agenda pressure and bloc management, not only territory math.", "Close on a majority or legitimacy outcome so the politics prompt feels real."],
    social_suspicion: ["Show suspicion pressure immediately so the slice cannot collapse into generic board play.", "Use the middle beat to force trust or accusation tradeoffs that match the prompt.", "End on a vote or social lock rather than silent score accumulation."],
    puzzle_chambers: ["Make the first puzzle readable immediately instead of hiding the actual constraint.", "Let support interactions alter the solve state in the middle beat.", "End on chamber completion and knowledge carryover rather than generic score reward."],
    sports_competition: ["Start with a possession or momentum beat so the sports fantasy lands immediately.", "Use the middle beat to make tempo and position matter, not only raw speed.", "End on a scoring window or defensive stand that feels like a match beat."],
    metroidbrainia_logic: ["Open on an 'impossible' gate that teaches the first rule through failure.", "Let the mid-beat be a Rosetta Stone moment where a distant clue solves a local block.", "End on a logic exam that proves systemic world-literacy."],
    soulslike_mastery: ["Open on a high-lethality pattern read that proves the mastery fantasy.", "Force a shortcut discovery mid-beat to reward spatial memory.", "End on a pattern-aware boss exam that requires learned persistence."],
    four_x_grand_strategy: ["Start with territory claims and early-game resource parity.", "Translate the mid-beat into strategic exploitation and rival friction.", "Finish on a global dominance milestone or scientific victory."],
    deckbuilding_synergy: ["Begin with a drafted card choice that seeds the first synergistic path.", "Make the mid-beat about deck thinning and relic-to-card combos.", "End on a boss exam that tests the drafted engine's efficiency."],
  }

  const uiCallouts = unique([
    ...base.uiCallouts,
    ...(flavorId === "baseline" ? [] : [titleCase(flavorLabel)]),
    ...input.uiSurfaces.slice(0, 2).map((surface) => titleCase(surface)),
  ]).slice(0, 5)
  const eventCues = unique([
    ...base.eventCues,
    ...input.environmentThemes.slice(0, 2),
    ...(flavorId === "baseline" ? [] : [flavorLabel]),
  ]).slice(0, 5)

  return {
    flavorId,
    flavorLabel,
    runtimeSubtitle: subtitle,
    activeModules: unique([genreModule, ...base.activeModules, ...modules, ...input.contentPillars.slice(0, 2)]).slice(0, 6),
    primaryVerbs: unique([...base.primaryVerbs, ...verbs]).slice(0, 6),
    pressureTracks: unique([
      ...(flavorId === "baseline"
        ? []
        : {
            extraction_operation: ["Heat", "Route control", "Extraction timer"],
            zombie_expedition: ["Safehouse integrity", "Infection pressure", "Night surge"],
            heist_infiltration: ["Alarm heat", "Exposure", "Escape clock"],
            systemic_infiltration: ["Exposure", "System stress", "Control access"],
            forensic_investigation: ["Case clock", "Credibility", "Lead decay"],
            curation_restoration: ["Fragility", "Catalog backlog", "Team energy"],
            cozy_agriculture: ["Daylight", "Community trust", "Energy"],
            frontier_trade: ["Route risk", "Cargo strain", "Crew morale"],
            political_command: ["Legitimacy", "Crisis heat", "Bloc control"],
            social_suspicion: ["Suspicion", "Trust", "Vote clock"],
            puzzle_chambers: ["Logic debt", "Reset cost", "Sequence progress"],
            sports_competition: ["Momentum", "Clock", "Possession"],
            metroidbrainia_logic: ["Knowledge debt", "Rule drift", "Mystery clock"],
            soulslike_mastery: ["Stamina", "Mastery level", "Pattern heat"],
            four_x_grand_strategy: ["Stability", "Yield drift", "Global pressure"],
            deckbuilding_synergy: ["Engine heat", "Draw risk", "Combo window"],
            baseline: [],
          }[flavorId]),
      ...base.pressureTracks,
    ]).slice(0, 4),
    resourceLabels: resourceLabels[flavorId] ?? base.resourceLabels,
    encounterLabels: encounterLabels[flavorId] ?? base.encounterLabels,
    actionLabels: actionLabels[flavorId] ?? base.actionLabels,
    objectiveHooks: unique([...(objectiveHooks[flavorId] ?? []), ...base.objectiveHooks]).slice(0, 3),
    uiCallouts,
    eventCues,
  }
}
