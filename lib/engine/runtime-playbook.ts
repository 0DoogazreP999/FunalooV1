import type { UserProject } from "@/lib/engine/types"

export interface RuntimePlaybookBeat {
  id: string
  label: string
  summary: string
  category: "objective" | "complication" | "opportunity" | "recovery"
}

export interface RuntimePlaybookPhysicsPlan {
  profileLabel: string
  movementStyle: string
  collisionStyle: string
  tempoStyle: string
  cameraFeel: string
}

export interface RuntimePlaybookUiPlan {
  hudStyle: string
  focusWidgets: string[]
  pinnedWidgets: string[]
  guidanceTone: string
}

export interface RuntimePlaybookTuning {
  mobility: number
  traction: number
  pressure: number
  interactionFrequency: number
  rewardRate: number
  recoveryWindow: number
}

export interface RuntimePlaybookPlan {
  identityLabel: string
  cadenceLabel: string
  physics: RuntimePlaybookPhysicsPlan
  ui: RuntimePlaybookUiPlan
  tuning: RuntimePlaybookTuning
  directives: string[]
  beats: RuntimePlaybookBeat[]
}

type RuntimePlaybookInput = Pick<
  UserProject,
  "name" | "description" | "genre" | "dimension" | "features" | "multiplayer" | "maxPlayers" | "design"
>

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function createBasePlaybook(project: RuntimePlaybookInput): RuntimePlaybookPlan {
  const plan = project.design.runtimeVersatilityPlan
  const uiPresentation = project.design.graphicsPlan.uiPresentation
  const resolvedFeatures = new Set([...project.features, ...project.design.resolvedFeatures])
  const directControl = project.dimension === "3d" || resolvedFeatures.has("physics")

  return {
    identityLabel: `${plan.flavorLabel} Playbook`,
    cadenceLabel: directControl ? "Prompt-led live beats" : "Prompt-led readable beats",
    physics: {
      profileLabel: directControl ? "Responsive readable motion" : "Measured readable interaction",
      movementStyle: directControl
        ? "Favor readable momentum and quick direction changes before simulation-heavy drift."
        : "Favor low-friction cursor, route, or board control over twitch movement.",
      collisionStyle: resolvedFeatures.has("physics") || resolvedFeatures.has("physics_sandbox")
        ? "Keep collisions expressive but predictable so prompt-specific verbs stay readable."
        : "Use forgiving contact rules so objectives remain clearer than impact punishment.",
      tempoStyle: plan.runtimeSubtitle,
      cameraFeel: uiPresentation,
    },
    ui: {
      hudStyle: uiPresentation,
      focusWidgets: uniqueStrings([
        ...plan.uiCallouts,
        ...project.design.runtimePlan.uiFocus,
        ...project.design.uiSurfaces.slice(0, 2),
      ]).slice(0, 4),
      pinnedWidgets: uniqueStrings([
        plan.pressureTracks[0] ?? "",
        plan.resourceLabels.primary,
        plan.resourceLabels.secondary,
        plan.encounterLabels.destination,
      ]).slice(0, 4),
      guidanceTone: project.multiplayer
        ? "Keep co-op or shared-state cues visible before secondary flavor text."
        : "Keep solo objective guidance visible before optional detail.",
    },
    tuning: {
      mobility: directControl ? 1 : 0.9,
      traction: directControl ? 1 : 0.94,
      pressure: 1,
      interactionFrequency: 1,
      rewardRate: 1,
      recoveryWindow: 1,
    },
    directives: uniqueStrings([
      ...plan.objectiveHooks,
      ...plan.eventCues.map((cue) => `Stage a readable ${cue.toLowerCase()} beat.`),
      `Keep ${plan.pressureTracks[0].toLowerCase()} visible in the main play loop.`,
    ]).slice(0, 4),
    beats: [
      {
        id: "read_space",
        label: plan.eventCues[0] ?? "Read the space",
        summary: plan.objectiveHooks[0] ?? "Teach the verb set before escalating the run.",
        category: "objective",
      },
      {
        id: "pressure_shift",
        label: plan.eventCues[1] ?? "Pressure shift",
        summary: plan.objectiveHooks[1] ?? "Raise pressure with a clear prompt-shaped complication.",
        category: "complication",
      },
      {
        id: "payoff_window",
        label: plan.eventCues[2] ?? "Payoff window",
        summary: plan.objectiveHooks[2] ?? "Close on a readable payoff instead of generic score.",
        category: "opportunity",
      },
    ],
  }
}

function withFlavorOverrides(project: RuntimePlaybookInput, base: RuntimePlaybookPlan): RuntimePlaybookPlan {
  const flavorId = project.design.runtimeVersatilityPlan.flavorId

  switch (flavorId) {
    case "extraction_operation":
      return {
        ...base,
        cadenceLabel: "Insertion -> pressure -> exfil",
        physics: {
          ...base.physics,
          profileLabel: "Crisp breach motion",
          movementStyle: "Favor quick lane changes, readable recoil recovery, and assertive objective pushes.",
          collisionStyle: "Contact should punish overextension without turning the route into a grind.",
        },
        tuning: {
          mobility: 1.08,
          traction: 1.08,
          pressure: 1.14,
          interactionFrequency: 1.04,
          rewardRate: 1.02,
          recoveryWindow: 0.96,
        },
        beats: [
          { id: "breach", label: "Breach Window", summary: "Open on an entry beat that sells momentum and objective focus.", category: "objective" },
          { id: "counterpush", label: "Counterpush", summary: "Escalate with a clean retaliation beat instead of random attrition.", category: "complication" },
          { id: "exfil", label: "Exfil Push", summary: "Reward route control and fast extraction over flat room clearing.", category: "opportunity" },
        ],
      }
    case "zombie_expedition":
      return {
        ...base,
        cadenceLabel: "Salvage -> hold -> survive",
        physics: {
          ...base.physics,
          profileLabel: "Heavy survival drag",
          movementStyle: "Add a little drag and commitment so scavenging, sprinting, and retreat feel costly.",
          collisionStyle: "Crowd contact should push survival routing decisions instead of one-shot failure.",
        },
        tuning: {
          mobility: 0.96,
          traction: 0.92,
          pressure: 1.2,
          interactionFrequency: 0.9,
          rewardRate: 1,
          recoveryWindow: 1.02,
        },
        beats: [
          { id: "salvage", label: "Salvage Window", summary: "Give the player a readable daytime scavenging beat.", category: "objective" },
          { id: "breach", label: "Perimeter Breach", summary: "Escalate through shelter pressure, not only more bodies.", category: "complication" },
          { id: "dawn", label: "Dawn Reset", summary: "Reward clean repair and resupply windows between night pushes.", category: "recovery" },
        ],
      }
    case "heist_infiltration":
      return {
        ...base,
        cadenceLabel: "Infiltrate -> crack -> escape",
        physics: {
          ...base.physics,
          profileLabel: "Precise infiltration",
          movementStyle: "Favor quick correction, stealthy repositioning, and readable non-combat interactions.",
          collisionStyle: "Treat contact as alarm pressure and exposure risk before raw damage.",
        },
        tuning: {
          mobility: 1.06,
          traction: 1.12,
          pressure: 0.96,
          interactionFrequency: 1.34,
          rewardRate: 1.08,
          recoveryWindow: 0.94,
        },
        beats: [
          { id: "entry", label: "Silent Entry", summary: "Lead with silence, sightlines, and tool use before direct confrontation.", category: "objective" },
          { id: "alarm", label: "Alarm Ripple", summary: "Escalate through suspicion, timer pressure, and route compromise.", category: "complication" },
          { id: "getaway", label: "Getaway Lane", summary: "Pay off the heist through a clean escape window.", category: "opportunity" },
        ],
      }
    case "systemic_infiltration":
      return {
        ...base,
        cadenceLabel: "Observe -> reroute -> improvise",
        physics: {
          ...base.physics,
          profileLabel: "Systemic traversal",
          movementStyle: "Favor readable route changes and tool-assisted mobility over brute-force speed.",
          collisionStyle: "Let contact expose state changes and cascading consequences.",
        },
        tuning: {
          mobility: 1.02,
          traction: 1.08,
          pressure: 0.98,
          interactionFrequency: 1.38,
          rewardRate: 1.06,
          recoveryWindow: 1,
        },
        beats: [
          { id: "observe", label: "Observe Layout", summary: "Start by teaching the space and interactive systems.", category: "objective" },
          { id: "reroute", label: "Reroute Systems", summary: "Escalate through tool use and cascading state changes.", category: "complication" },
          { id: "adapt", label: "Adapted Exit", summary: "Reward players for improvising a route through the new state.", category: "opportunity" },
        ],
      }
    case "forensic_investigation":
      return {
        ...base,
        cadenceLabel: "Observe -> connect -> resolve",
        physics: {
          ...base.physics,
          profileLabel: "Controlled investigation",
          movementStyle: "Keep movement measured so clue reading beats input chaos.",
          collisionStyle: "Use forgiving contact so evidence and lead chaining stay central.",
        },
        tuning: {
          mobility: 0.82,
          traction: 1.04,
          pressure: 0.76,
          interactionFrequency: 1.42,
          rewardRate: 1.12,
          recoveryWindow: 1.18,
        },
        beats: [
          { id: "scene", label: "Secure Scene", summary: "Teach the search pattern and the first clue chain immediately.", category: "objective" },
          { id: "crosscheck", label: "Cross-Check Leads", summary: "Escalate through conflicting evidence and suspect pressure.", category: "complication" },
          { id: "lock_case", label: "Lock Case", summary: "Pay off the run through a confident theory or case resolution.", category: "opportunity" },
        ],
      }
    case "curation_restoration":
      return {
        ...base,
        cadenceLabel: "Recover -> restore -> present",
        physics: {
          ...base.physics,
          profileLabel: "Deliberate restoration",
          movementStyle: "Favor gentle placement, careful handling, and low-panic traversal.",
          collisionStyle: "Use soft failure that threatens condition and workflow rather than combat loss.",
        },
        tuning: {
          mobility: 0.78,
          traction: 1.02,
          pressure: 0.7,
          interactionFrequency: 1.36,
          rewardRate: 1.18,
          recoveryWindow: 1.22,
        },
        beats: [
          { id: "recover", label: "Recovery Pass", summary: "Open on artifact recovery and condition-aware handling.", category: "objective" },
          { id: "restore", label: "Bench Restore", summary: "Escalate through tool choice and preservation tradeoffs.", category: "complication" },
          { id: "archive", label: "Archive Hand-off", summary: "Pay off the run through presentation and preservation quality.", category: "opportunity" },
        ],
      }
    case "cozy_agriculture":
      return {
        ...base,
        cadenceLabel: "Routine -> growth -> market",
        physics: {
          ...base.physics,
          profileLabel: "Gentle routine flow",
          movementStyle: "Keep movement simple and low-stress so the daily rhythm stays readable.",
          collisionStyle: "Avoid harsh punishment; the loop should reward cadence and consistency.",
        },
        tuning: {
          mobility: 0.84,
          traction: 1.02,
          pressure: 0.74,
          interactionFrequency: 1.12,
          rewardRate: 1.22,
          recoveryWindow: 1.26,
        },
        beats: [
          { id: "morning", label: "Morning Chores", summary: "Start with easy upkeep that teaches the loop cleanly.", category: "objective" },
          { id: "harvest", label: "Harvest Push", summary: "Escalate through gentle time pressure and crop readiness.", category: "complication" },
          { id: "market", label: "Market Close", summary: "Pay off the day through cashout and trust growth.", category: "recovery" },
        ],
      }
    case "frontier_trade":
      return {
        ...base,
        cadenceLabel: "Route -> contract -> delivery",
        physics: {
          ...base.physics,
          profileLabel: "Measured convoy motion",
          movementStyle: "Make pace, drift, and route choice matter more than twitch input.",
          collisionStyle: "Let terrain and weather pressure the route instead of blunt failure spikes.",
        },
        tuning: {
          mobility: 0.92,
          traction: 0.96,
          pressure: 1.04,
          interactionFrequency: 1.22,
          rewardRate: 1.14,
          recoveryWindow: 1.08,
        },
        beats: [
          { id: "departure", label: "Departure Leg", summary: "Teach the route and loadout rhythm in the first stretch.", category: "objective" },
          { id: "contract", label: "Contract Stop", summary: "Escalate through delivery pressure and resource strain.", category: "complication" },
          { id: "delivery", label: "Delivery Window", summary: "Reward clean logistics and recovery pacing.", category: "opportunity" },
        ],
      }
    case "political_command":
      return {
        ...base,
        cadenceLabel: "Count -> bargain -> lock majority",
        physics: {
          ...base.physics,
          profileLabel: "Crisp board response",
          movementStyle: "Keep input snappy while treating momentum as agenda pressure, not avatar speed.",
          collisionStyle: "Use soft state shifts and bloc pressure instead of physical punishment.",
        },
        tuning: {
          mobility: 0.76,
          traction: 1.08,
          pressure: 1.04,
          interactionFrequency: 1.34,
          rewardRate: 1.04,
          recoveryWindow: 1.08,
        },
        beats: [
          { id: "count", label: "Whip Count", summary: "Open on coalition math and visible leverage.", category: "objective" },
          { id: "crisis", label: "Crisis Vote", summary: "Escalate through scandals, pressure, and wavering blocs.", category: "complication" },
          { id: "majority", label: "Majority Lock", summary: "Pay off the run through a readable governing coalition.", category: "opportunity" },
        ],
      }
    case "social_suspicion":
      return {
        ...base,
        cadenceLabel: "Read -> accuse -> reveal",
        physics: {
          ...base.physics,
          profileLabel: "Quick social pacing",
          movementStyle: "Favor fast information reads and light movement over heavy physical pressure.",
          collisionStyle: "Translate contact into suspicion and reveal tempo rather than damage.",
        },
        tuning: {
          mobility: 0.8,
          traction: 1.1,
          pressure: 1.08,
          interactionFrequency: 1.4,
          rewardRate: 1.02,
          recoveryWindow: 1.04,
        },
        beats: [
          { id: "read", label: "Read the Room", summary: "Open with strong information cues and social texture.", category: "objective" },
          { id: "spiral", label: "Accusation Spiral", summary: "Escalate through pressure, uncertainty, and vote tension.", category: "complication" },
          { id: "reveal", label: "Reveal Window", summary: "Pay off the loop with a readable reveal or vote swing.", category: "opportunity" },
        ],
      }
    case "puzzle_chambers":
      return {
        ...base,
        cadenceLabel: "Read -> sequence -> unlock",
        physics: {
          ...base.physics,
          profileLabel: "Constraint-first interaction",
          movementStyle: "Keep motion controlled so chamber logic stays legible.",
          collisionStyle: "Make collisions communicate rules and sequencing instead of random disruption.",
        },
        tuning: {
          mobility: 0.88,
          traction: 1.04,
          pressure: 0.84,
          interactionFrequency: 1.46,
          rewardRate: 1.06,
          recoveryWindow: 1.12,
        },
        beats: [
          { id: "read", label: "Read Constraints", summary: "Teach the governing rule before stacking complexity.", category: "objective" },
          { id: "sequence", label: "Align Sequence", summary: "Escalate through ordering, timing, or resource logic.", category: "complication" },
          { id: "unlock", label: "Exit Unlock", summary: "Pay off the chamber with a clear unlock or reveal.", category: "opportunity" },
        ],
      }
    case "sports_competition":
      return {
        ...base,
        cadenceLabel: "Possession -> swing -> finish",
        physics: {
          ...base.physics,
          profileLabel: "Snappy competitive response",
          movementStyle: "Favor fast input response, readable momentum shifts, and clear scoring windows.",
          collisionStyle: "Keep contact readable and rules-first instead of muddy chaos.",
        },
        tuning: {
          mobility: 1.16,
          traction: 1.14,
          pressure: 1.16,
          interactionFrequency: 1.16,
          rewardRate: 1.04,
          recoveryWindow: 0.96,
        },
        beats: [
          { id: "opening", label: "Opening Possession", summary: "Open with a clean teaching moment for the core rule set.", category: "objective" },
          { id: "swing", label: "Momentum Swing", summary: "Escalate through streaks, pressure, and counterplay.", category: "complication" },
          { id: "finish", label: "Scoring Window", summary: "Reward decisive execution inside a visible finish window.", category: "opportunity" },
        ],
      }
    case "baseline":
    default:
      return base
  }
}

export function buildRuntimePlaybookPlan(project: RuntimePlaybookInput): RuntimePlaybookPlan {
  const base = createBasePlaybook(project)
  const flavored = withFlavorOverrides(project, base)
  const resolvedFeatures = new Set([...project.features, ...project.design.resolvedFeatures])
  const physicsBias = resolvedFeatures.has("physics") || resolvedFeatures.has("physics_sandbox")
  const uiBias = resolvedFeatures.has("ui")

  return {
    ...flavored,
    physics: {
      ...flavored.physics,
      collisionStyle: physicsBias
        ? `${flavored.physics.collisionStyle} Keep feedback deterministic enough that prompt-specific physics feel intentional.`
        : flavored.physics.collisionStyle,
    },
    ui: {
      ...flavored.ui,
      pinnedWidgets: uniqueStrings([
        ...flavored.ui.pinnedWidgets,
        ...(uiBias ? project.design.runtimeVersatilityPlan.uiCallouts.slice(0, 2) : []),
      ]).slice(0, 4),
    },
    directives: uniqueStrings([
      ...flavored.directives,
      ...(project.design.levelSequence[0]?.purpose ? [`Teach the first beat through ${project.design.levelSequence[0].purpose.toLowerCase()}.`] : []),
      ...(project.design.levelSequence[1]?.challenge ? [`Escalate through ${project.design.levelSequence[1].challenge.toLowerCase()}.`] : []),
    ]).slice(0, 5),
  }
}

export function getRuntimePlaybookBeat(plan: RuntimePlaybookPlan, index: number) {
  if (plan.beats.length === 0) {
    return {
      id: "default",
      label: "Prompt Beat",
      summary: "Keep the live loop aligned to the creator prompt.",
      category: "objective" as const,
    }
  }

  const safeIndex = ((Math.floor(index) % plan.beats.length) + plan.beats.length) % plan.beats.length
  return plan.beats[safeIndex] ?? plan.beats[0]
}
