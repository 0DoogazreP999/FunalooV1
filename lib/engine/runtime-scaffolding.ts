import type { UserProject } from "@/lib/engine/types"

type RuntimeScaffoldingInput = Pick<
  UserProject,
  "name" | "description" | "genre" | "dimension" | "features" | "multiplayer" | "maxPlayers" | "design"
>

export interface RuntimeScaffoldingTuning {
  combatDensity: number
  interactionDensity: number
  pressureRate: number
  recoveryBoost: number
  resourceBonus: number
}

export interface RuntimeScaffoldingPlan {
  scenarioTitle: string
  phaseLabels: string[]
  objectivePrompts: string[]
  sectorNames: string[]
  boardStatuses: string[]
  stopTypeLabels: {
    camp: string
    settlement: string
    hazard: string
    landmark: string
    destination: string
  }
  tuning: RuntimeScaffoldingTuning
}

function firstTheme(project: RuntimeScaffoldingInput) {
  return project.design.environmentThemes?.[0] ?? project.design.mapArchetype ?? project.genre.replace(/_/g, " ")
}

function buildBasePlan(project: RuntimeScaffoldingInput): RuntimeScaffoldingPlan {
  const flavor = project.design.runtimeVersatilityPlan
  return {
    scenarioTitle: `${flavor.flavorLabel}: ${firstTheme(project)}`,
    phaseLabels: flavor.eventCues.slice(0, 3),
    objectivePrompts: flavor.objectiveHooks.slice(0, 3),
    sectorNames: ["North Line", "River Gate", "Market Core", "Relay Ridge"],
    boardStatuses: ["contested", "holding", "at risk", "stabilizing"],
    stopTypeLabels: {
      camp: "Camp",
      settlement: "Settlement",
      hazard: "Hazard",
      landmark: "Landmark",
      destination: "Destination",
    },
    tuning: {
      combatDensity: 1,
      interactionDensity: 1,
      pressureRate: 1,
      recoveryBoost: 1,
      resourceBonus: 0,
    },
  }
}

export function buildRuntimeScaffoldingPlan(project: RuntimeScaffoldingInput): RuntimeScaffoldingPlan {
  const plan = buildBasePlan(project)
  const flavorId = project.design.runtimeVersatilityPlan.flavorId

  switch (flavorId) {
    case "extraction_operation":
      return {
        ...plan,
        phaseLabels: ["Insertion Breach", "Package Retrieval", "Exfil Corridor"],
        objectivePrompts: [
          "Open on infiltration and target isolation, not generic firefights.",
          "Make the middle beat about retrieval pressure, not pure elimination count.",
          "Close on exfil timing and route control so extraction language stays real.",
        ],
        tuning: { combatDensity: 1.15, interactionDensity: 1.1, pressureRate: 1.1, recoveryBoost: 0.95, resourceBonus: 1 },
      }
    case "zombie_expedition":
      return {
        ...plan,
        phaseLabels: ["Salvage Sweep", "Generator Hold", "Night Escape"],
        objectivePrompts: [
          "Make salvage and infected pressure visible in the first beat.",
          "Use the middle run to force repair-or-hold choices under rising horde pressure.",
          "End on safehouse survival or escape, not on abstract score alone.",
        ],
        tuning: { combatDensity: 1.2, interactionDensity: 0.9, pressureRate: 1.18, recoveryBoost: 1, resourceBonus: 0 },
      }
    case "heist_infiltration":
      return {
        ...plan,
        phaseLabels: ["Silent Entry", "Vault Crack", "Getaway Window"],
        objectivePrompts: [
          "Begin with a silent entry beat that proves the heist fantasy immediately.",
          "Use the middle phase to force bypass-or-push decisions instead of only shooting.",
          "End on a getaway route and alarm pressure, not a flat room clear.",
        ],
        tuning: { combatDensity: 0.88, interactionDensity: 1.35, pressureRate: 1.08, recoveryBoost: 0.92, resourceBonus: 1 },
      }
    case "systemic_infiltration":
      return {
        ...plan,
        phaseLabels: ["Observe Layout", "Reroute Systems", "Access Escape"],
        tuning: { combatDensity: 0.82, interactionDensity: 1.4, pressureRate: 1.04, recoveryBoost: 0.96, resourceBonus: 1 },
      }
    case "forensic_investigation":
      return {
        ...plan,
        phaseLabels: ["Secure Scene", "Cross-Check Leads", "Lock Case"],
        stopTypeLabels: {
          camp: "Field Office",
          settlement: "Witness Hub",
          hazard: "Complication",
          landmark: "Clue Site",
          destination: "Case Board",
        },
        tuning: { combatDensity: 0.55, interactionDensity: 1.45, pressureRate: 1.02, recoveryBoost: 1.08, resourceBonus: 2 },
      }
    case "curation_restoration":
      return {
        ...plan,
        phaseLabels: ["Site Recovery", "Bench Restoration", "Archive Delivery"],
        stopTypeLabels: {
          camp: "Field Camp",
          settlement: "Restoration Hub",
          hazard: "Collapse Risk",
          landmark: "Discovery Site",
          destination: "Archive Hall",
        },
        tuning: { combatDensity: 0.48, interactionDensity: 1.35, pressureRate: 0.94, recoveryBoost: 1.18, resourceBonus: 2 },
      }
    case "cozy_agriculture":
      return {
        ...plan,
        phaseLabels: ["Morning Chores", "Harvest Push", "Market Close"],
        tuning: { combatDensity: 0.25, interactionDensity: 1.15, pressureRate: 0.9, recoveryBoost: 1.2, resourceBonus: 2 },
      }
    case "frontier_trade":
      return {
        ...plan,
        phaseLabels: ["Departure Leg", "Contract Stop", "Final Delivery"],
        sectorNames: ["North Freight", "River Port", "Trade Core", "Relay Ridge"],
        boardStatuses: ["delivering", "strained", "overdue", "recovering"],
        stopTypeLabels: {
          camp: "Camp",
          settlement: "Trade Post",
          hazard: "Storm Front",
          landmark: "Contract Marker",
          destination: "Delivery Gate",
        },
        tuning: { combatDensity: 0.72, interactionDensity: 1.25, pressureRate: 1.08, recoveryBoost: 1.05, resourceBonus: 2 },
      }
    case "political_command":
      return {
        ...plan,
        phaseLabels: ["Whip Count", "Crisis Vote", "Majority Lock"],
        sectorNames: ["Council Floor", "Harbor Bloc", "Press Hall", "Committee Ring"],
        boardStatuses: ["hung vote", "coalition holding", "volatile", "negotiating"],
        tuning: { combatDensity: 0.32, interactionDensity: 1.38, pressureRate: 1.06, recoveryBoost: 1.04, resourceBonus: 1 },
      }
    case "social_suspicion":
      return {
        ...plan,
        phaseLabels: ["Read the Room", "Accusation Spiral", "Vote Reveal"],
        sectorNames: ["Commons", "Whisper Wing", "Archive Table", "Vote Hall"],
        boardStatuses: ["suspicious", "composed", "under pressure", "fracturing"],
        tuning: { combatDensity: 0.28, interactionDensity: 1.42, pressureRate: 1.04, recoveryBoost: 1.02, resourceBonus: 1 },
      }
    case "puzzle_chambers":
      return {
        ...plan,
        phaseLabels: ["Read Constraints", "Align Sequence", "Exit Unlock"],
        tuning: { combatDensity: 0.22, interactionDensity: 1.5, pressureRate: 0.98, recoveryBoost: 1.1, resourceBonus: 1 },
      }
    case "sports_competition":
      return {
        ...plan,
        phaseLabels: ["Opening Possession", "Momentum Swing", "Scoring Window"],
        tuning: { combatDensity: 0.5, interactionDensity: 1.18, pressureRate: 1.14, recoveryBoost: 0.98, resourceBonus: 1 },
      }
    case "baseline":
    default:
      return plan
  }
}
