import { buildRuntimePlaybookPlan, type RuntimePlaybookBeat, type RuntimePlaybookPlan } from "@/lib/engine/runtime-playbook"
import { buildRuntimeScaffoldingPlan, type RuntimeScaffoldingPlan } from "@/lib/engine/runtime-scaffolding"
import type { GenerationIntelligenceProfile, Genre, UserProject } from "@/lib/engine/types"

type RuntimeEncounterInput = Pick<
  UserProject,
  "name" | "description" | "genre" | "dimension" | "features" | "multiplayer" | "maxPlayers" | "design"
>

export type RuntimeEncounterEventCategory = "pressure" | "opportunity" | "recovery" | "twist"

export interface RuntimeEncounterModifierSet {
  pressure: number
  reward: number
  recovery: number
  interaction: number
}

export interface RuntimeEncounterObjectiveStep {
  id: string
  label: string
  objective: string
  successSignal: string
  complication: string
  focusTags: string[]
  modifiers: RuntimeEncounterModifierSet
}

export interface RuntimeEncounterEventCard {
  id: string
  label: string
  summary: string
  category: RuntimeEncounterEventCategory
  triggerHint: string
  objectiveShift: string
  rewardHint: string
  modifiers: RuntimeEncounterModifierSet
}

export type RuntimeEncounterCadenceStage = "opening" | "escalation" | "pivot" | "climax"

export interface RuntimeEncounterCadenceWindow {
  id: string
  label: string
  stage: RuntimeEncounterCadenceStage
  directiveId: string
  directiveLabel: string
  eventId: string
  eventLabel: string
  objectiveFocus: string
  complicationFocus: string
  successFocus: string
  triggerWindow: string
  runtimeHook: string
  modifiers: RuntimeEncounterModifierSet
}

export interface RuntimeEncounterPromptBridge {
  summary: string
  continuityRules: string[]
  midSessionVariation: string[]
  objectiveChainNotes: string[]
  runtimeHooks: string[]
}

export interface RuntimeEncounterTickWeights {
  stage: RuntimeEncounterCadenceStage
  pressure: number
  reward: number
  recovery: number
  interaction: number
  hostileSpawn: number
  supportSpawn: number
  hazardRate: number
  eventAdvanceRate: number
  objectiveTempo: number
}

export interface RuntimeEncounterMix {
  aggression: number
  interaction: number
  support: number
  environmental: number
}

export interface RuntimeEncounterDirector {
  scenarioLabel: string
  chainLabel: string
  scenarioHook: string
  objectiveChain: RuntimeEncounterObjectiveStep[]
  eventDeck: RuntimeEncounterEventCard[]
  cadenceWindows: RuntimeEncounterCadenceWindow[]
  encounterMix: RuntimeEncounterMix
  scenarioNotes: string[]
  uiPins: string[]
  promptBridge: RuntimeEncounterPromptBridge
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function normalizeIndex(index: number, length: number) {
  if (length <= 0) return 0
  return ((Math.floor(index) % length) + length) % length
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function roundWeight(value: number) {
  return Number(value.toFixed(2))
}

function makeModifiers(
  pressure = 1,
  reward = 1,
  recovery = 1,
  interaction = 1,
): RuntimeEncounterModifierSet {
  return { pressure, reward, recovery, interaction }
}

function inferScenarioHook(
  project: Pick<RuntimeEncounterInput, "description" | "design">,
  scaffolding: RuntimeScaffoldingPlan,
) {
  return (
    project.design.playerFantasy ||
    project.design.sessionFantasy ||
    scaffolding.objectivePrompts[0] ||
    project.description
  )
}

function buildBaseObjectiveChain(
  project: Pick<RuntimeEncounterInput, "description" | "design">,
  playbook: RuntimePlaybookPlan,
  scaffolding: RuntimeScaffoldingPlan,
): RuntimeEncounterObjectiveStep[] {
  const beats = playbook.beats.length > 0
    ? playbook.beats
    : [
        {
          id: "baseline",
          label: "Prompt Beat",
          summary: "Keep the moment-to-moment loop aligned to the creator prompt.",
          category: "objective" as const,
        },
      ]

  const hooks = project.design.runtimeVersatilityPlan.objectiveHooks
  const levelSequence = project.design.levelSequence ?? []

  return beats.map((beat, index) => {
    const levelBeat = levelSequence[index]
    const label = scaffolding.phaseLabels[index] ?? beat.label
    const objective = hooks[index] ?? levelBeat?.purpose ?? beat.summary
    const complication = levelBeat?.challenge ?? scaffolding.objectivePrompts[index] ?? beat.summary
    const successSignal = levelBeat?.reward ?? hooks[index + 1] ?? `Land the ${label.toLowerCase()} cleanly.`
    const categoryBias = beat.category === "complication"
      ? makeModifiers(1.14, 0.96, 0.92, 1.04)
      : beat.category === "recovery"
        ? makeModifiers(0.9, 1.06, 1.14, 0.96)
        : beat.category === "opportunity"
          ? makeModifiers(1, 1.12, 1, 1.08)
          : makeModifiers(1.02, 1.02, 1, 1.04)

    return {
      id: beat.id,
      label,
      objective,
      successSignal,
      complication,
      focusTags: uniqueStrings([
        beat.label,
        beat.category,
        project.design.runtimeVersatilityPlan.primaryVerbs[index] ?? "",
        project.design.runtimeVersatilityPlan.activeModules[index] ?? "",
      ]).slice(0, 4),
      modifiers: categoryBias,
    }
  })
}

function buildBaseEventDeck(
  project: Pick<RuntimeEncounterInput, "design">,
  playbook: RuntimePlaybookPlan,
  scaffolding: RuntimeScaffoldingPlan,
): RuntimeEncounterEventCard[] {
  const cues = project.design.runtimeVersatilityPlan.eventCues
  const categories: RuntimeEncounterEventCategory[] = ["pressure", "opportunity", "recovery", "twist"]

  return categories.map((category, index) => {
    const cue = cues[index % Math.max(cues.length, 1)] ?? playbook.beats[index % Math.max(playbook.beats.length, 1)]?.label ?? "Prompt shift"
    const objectiveShift = scaffolding.objectivePrompts[index % Math.max(scaffolding.objectivePrompts.length, 1)]
      ?? project.design.runtimeVersatilityPlan.objectiveHooks[index % Math.max(project.design.runtimeVersatilityPlan.objectiveHooks.length, 1)]
      ?? "Keep the current scenario readable."
    const modifiers = category === "pressure"
      ? makeModifiers(1.16, 0.96, 0.92, 1.02)
      : category === "opportunity"
        ? makeModifiers(0.98, 1.16, 1.04, 1.1)
        : category === "recovery"
          ? makeModifiers(0.92, 1.04, 1.18, 0.96)
          : makeModifiers(1.08, 1.08, 1, 1.14)

    return {
      id: `${category}_${index}`,
      label: cue,
      summary: `${cue} should redirect the live objective instead of only reskinning it.`,
      category,
      triggerHint: `Trigger during ${scaffolding.phaseLabels[index % Math.max(scaffolding.phaseLabels.length, 1)] ?? "the current beat"}.`,
      objectiveShift,
      rewardHint: category === "pressure"
        ? "Trade safety for tempo or board position."
        : category === "opportunity"
          ? "Let the player convert a risky opening into a strong payoff."
          : category === "recovery"
            ? "Create a visible reset window before the next spike."
            : "Change the shape of the current goal without breaking prompt fidelity.",
      modifiers,
    }
  })
}

function buildCadenceWindows(input: {
  project: RuntimeEncounterInput
  playbook: RuntimePlaybookPlan
  scaffolding: RuntimeScaffoldingPlan
  objectiveChain: RuntimeEncounterObjectiveStep[]
  eventDeck: RuntimeEncounterEventCard[]
}): RuntimeEncounterCadenceWindow[] {
  const beats = input.playbook.beats.length > 0
    ? input.playbook.beats
    : [{ id: "prompt_cadence", label: "Prompt Cadence", summary: "Keep the objective chain prompt-faithful.", category: "objective" as const }]

  return beats.map((beat, index) => {
    const directive = input.objectiveChain[index % Math.max(input.objectiveChain.length, 1)] ?? input.objectiveChain[0]
    const event = input.eventDeck[index % Math.max(input.eventDeck.length, 1)] ?? input.eventDeck[0]
    const stage: RuntimeEncounterCadenceStage = index === 0
      ? "opening"
      : index >= beats.length - 1
        ? "climax"
        : beat.category === "complication"
          ? "escalation"
          : "pivot"

    return {
      id: `${directive.id}_${event.id}_${index}`,
      label: input.scaffolding.phaseLabels[index] ?? beat.label,
      stage,
      directiveId: directive.id,
      directiveLabel: directive.label,
      eventId: event.id,
      eventLabel: event.label,
      objectiveFocus: directive.objective,
      complicationFocus: `${directive.complication} ${event.objectiveShift}`.trim(),
      successFocus: directive.successSignal,
      triggerWindow: event.triggerHint,
      runtimeHook: input.project.design.runtimeVersatilityPlan.objectiveHooks[index]
        ?? input.project.design.runtimeVersatilityPlan.primaryVerbs[index]
        ?? beat.summary,
      modifiers: {
        pressure: Number((((directive.modifiers.pressure + event.modifiers.pressure) / 2)).toFixed(2)),
        reward: Number((((directive.modifiers.reward + event.modifiers.reward) / 2)).toFixed(2)),
        recovery: Number((((directive.modifiers.recovery + event.modifiers.recovery) / 2)).toFixed(2)),
        interaction: Number((((directive.modifiers.interaction + event.modifiers.interaction) / 2)).toFixed(2)),
      },
    }
  })
}

function buildPromptBridge(input: {
  project: RuntimeEncounterInput
  director: Pick<RuntimeEncounterDirector, "scenarioLabel" | "chainLabel" | "scenarioHook" | "objectiveChain" | "eventDeck" | "cadenceWindows" | "encounterMix">
}): RuntimeEncounterPromptBridge {
  const plan = input.project.design.runtimeVersatilityPlan

  return {
    summary: `${input.director.scenarioLabel} keeps the ${plan.flavorLabel.toLowerCase()} runtime aligned through ${input.director.chainLabel.toLowerCase()} beats instead of flattening into one static loop.`,
    continuityRules: uniqueStrings([
      `Keep ${plan.pressureTracks[0]?.toLowerCase() ?? "pressure"} visible in every objective window.`,
      `Advance from ${input.director.objectiveChain[0]?.label ?? "the opening beat"} into ${input.director.objectiveChain[input.director.objectiveChain.length - 1]?.label ?? "the finish"} with readable mid-session turns.`,
      `Use ${input.director.eventDeck[0]?.label ?? "event cards"} to change the active objective, not only cosmetic text.`,
      `Do not collapse ${plan.encounterLabels.destination.toLowerCase()} play into a generic button-clicker or flat board-state loop.`,
    ]).slice(0, 4),
    midSessionVariation: uniqueStrings([
      ...input.director.cadenceWindows.map((window) => `${window.label}: ${window.complicationFocus}`),
      ...input.director.eventDeck.map((event) => `${event.label}: ${event.rewardHint}`),
    ]).slice(0, 6),
    objectiveChainNotes: uniqueStrings([
      ...input.director.objectiveChain.map((step) => `${step.label}: ${step.objective}`),
      input.director.scenarioHook,
    ]).slice(0, 6),
    runtimeHooks: uniqueStrings([
      ...input.director.cadenceWindows.map((window) => window.runtimeHook),
      ...plan.uiCallouts,
      ...plan.activeModules,
    ]).slice(0, 6),
  }
}

function createBaseDirector(project: RuntimeEncounterInput): RuntimeEncounterDirector {
  const playbook = buildRuntimePlaybookPlan(project)
  const scaffolding = buildRuntimeScaffoldingPlan(project)
  const plan = project.design.runtimeVersatilityPlan
  const objectiveChain = buildBaseObjectiveChain(project, playbook, scaffolding)
  const eventDeck = buildBaseEventDeck(project, playbook, scaffolding)
  const cadenceWindows = buildCadenceWindows({
    project,
    playbook,
    scaffolding,
    objectiveChain,
    eventDeck,
  })
  const scenarioLabel = `${plan.flavorLabel} Scenario Chain`
  const chainLabel = playbook.cadenceLabel
  const scenarioHook = inferScenarioHook(project, scaffolding)
  const encounterMix = {
    aggression: Number((0.4 + Math.max(0, scaffolding.tuning.combatDensity) * 0.28 + Math.max(0, playbook.tuning.pressure - 1) * 0.12).toFixed(2)),
    interaction: Number((0.42 + Math.max(0, scaffolding.tuning.interactionDensity) * 0.26 + Math.max(0, playbook.tuning.interactionFrequency - 1) * 0.12).toFixed(2)),
    support: Number((0.28 + Math.max(0, scaffolding.tuning.recoveryBoost) * 0.18 + Math.max(0, playbook.tuning.recoveryWindow - 1) * 0.12).toFixed(2)),
    environmental: Number((0.34 + Math.max(0, scaffolding.tuning.pressureRate) * 0.22).toFixed(2)),
  }

  return {
    scenarioLabel,
    chainLabel,
    scenarioHook,
    objectiveChain,
    eventDeck,
    cadenceWindows,
    encounterMix,
    scenarioNotes: uniqueStrings([
      scaffolding.objectivePrompts[0] ?? "",
      playbook.directives[0] ?? "",
      `Keep ${plan.pressureTracks[0].toLowerCase()} visible while the scenario shifts.`,
      `Use ${plan.activeModules[0]?.toLowerCase() ?? "prompt-fit systems"} to differentiate the mid-run beats.`,
    ]).slice(0, 4),
    uiPins: uniqueStrings([
      ...playbook.ui.pinnedWidgets,
      ...plan.uiCallouts,
      plan.encounterLabels.destination,
    ]).slice(0, 5),
    promptBridge: buildPromptBridge({
      project,
      director: {
        scenarioLabel,
        chainLabel,
        scenarioHook,
        objectiveChain,
        eventDeck,
        cadenceWindows,
        encounterMix,
      },
    }),
  }
}

function overrideDirector(
  project: RuntimeEncounterInput,
  base: RuntimeEncounterDirector,
): RuntimeEncounterDirector {
  const flavorId = project.design.runtimeVersatilityPlan.flavorId

  switch (flavorId) {
    case "extraction_operation":
      return {
        ...base,
        scenarioLabel: "Extraction Corridor Chain",
        chainLabel: "Breach -> secure -> exfil",
        objectiveChain: [
          {
            id: "breach_entry",
            label: "Pressure the breach",
            objective: "Break the exterior line, isolate the first defenders, and anchor the route before the operation sprawls.",
            successSignal: "The lane is open and the squad can stage the real objective.",
            complication: "Counterpush forces the player to read sightlines and not just burn ammo.",
            focusTags: ["breach", "pressure", "route control"],
            modifiers: makeModifiers(1.14, 1.02, 0.94, 1.04),
          },
          {
            id: "intel_lock",
            label: "Secure the package",
            objective: "Lock down the command space, pull the package, and keep the route readable under retaliation.",
            successSignal: "The package is moving and the op still has tempo.",
            complication: "New threats should bend the route instead of turning the middle into filler combat.",
            focusTags: ["intel", "room control", "objective focus"],
            modifiers: makeModifiers(1.08, 1.1, 0.98, 1.08),
          },
          {
            id: "exfil_lane",
            label: "Close the exfil",
            objective: "Turn extraction into the final skill check by holding lanes, spending recovery well, and leaving cleanly.",
            successSignal: "The run ends on exfil, not on an arbitrary kill quota.",
            complication: "Late pressure should threaten the route and the timer together.",
            focusTags: ["exfil", "timer", "lane hold"],
            modifiers: makeModifiers(1.18, 1.04, 0.96, 1),
          },
        ],
        eventDeck: [
          {
            id: "counter_push",
            label: "Counterpush",
            summary: "Enemy response tightens lanes and punishes overexposed pushes.",
            category: "pressure",
            triggerHint: "Trigger after the player starts winning the lane.",
            objectiveShift: "Re-center the objective on holding route control instead of farming kills.",
            rewardHint: "A clean hold should convert into extra resources for the next room.",
            modifiers: makeModifiers(1.18, 1.02, 0.94, 1.02),
          },
          {
            id: "intel_window",
            label: "Intel Window",
            summary: "A secondary package or route clue opens a faster finish if the player commits.",
            category: "opportunity",
            triggerHint: "Trigger once the player has stabilized the middle beat.",
            objectiveShift: "Offer a risky shortcut that still supports the mission fantasy.",
            rewardHint: "Reward route control, ammo discipline, or clean timing.",
            modifiers: makeModifiers(0.98, 1.18, 1.02, 1.08),
          },
          {
            id: "squad_reset",
            label: "Squad Reset",
            summary: "A short recovery window restores armor or tempo before the last push.",
            category: "recovery",
            triggerHint: "Trigger between the middle objective and exfil.",
            objectiveShift: "Make the player choose whether to spend the reset or push immediately.",
            rewardHint: "Used well, it should set up a confident finish.",
            modifiers: makeModifiers(0.92, 1.04, 1.16, 0.98),
          },
          {
            id: "route_flip",
            label: "Route Flip",
            summary: "Extraction pivots to a new lane or chokepoint so the finish feels earned.",
            category: "twist",
            triggerHint: "Trigger as exfil begins.",
            objectiveShift: "Force a new route read without abandoning the mission structure.",
            rewardHint: "Players who keep spatial awareness should convert the twist into style.",
            modifiers: makeModifiers(1.1, 1.08, 1, 1.12),
          },
        ],
        encounterMix: { aggression: 0.84, interaction: 0.62, support: 0.42, environmental: 0.55 },
        scenarioNotes: [
          "Mid-session shifts should change lanes, not only enemy counts.",
          "The package or exfil state should always be visible.",
          "Recovery windows should exist, but they should feel earned.",
        ],
      }
    case "zombie_expedition":
      return {
        ...base,
        scenarioLabel: "Scavenge And Hold Chain",
        chainLabel: "Sweep -> brace -> outlast",
        scenarioNotes: [
          "Each day beat should make salvage, shelter, and horde pressure talk to each other.",
          "Night spikes should change survival priorities, not only zombie volume.",
          "Recovery events should buy better shelter decisions, not free wins.",
        ],
        eventDeck: [
          {
            id: "quiet_street",
            label: "Quiet Street Cache",
            summary: "A low-pressure salvage pocket offers better loot if the player pushes deeper.",
            category: "opportunity",
            triggerHint: "Trigger during the day sweep.",
            objectiveShift: "Offer a richer cache with slightly longer exposure.",
            rewardHint: "Better salvage, ammo, or repair options.",
            modifiers: makeModifiers(0.96, 1.18, 1.04, 1.1),
          },
          {
            id: "generator_surge",
            label: "Generator Surge",
            summary: "The shelter system needs urgent repair or the perimeter weakens dramatically.",
            category: "pressure",
            triggerHint: "Trigger as night begins.",
            objectiveShift: "Force the player to split attention between holding and repairs.",
            rewardHint: "A stable shelter should reduce the next wave spike.",
            modifiers: makeModifiers(1.22, 0.98, 0.92, 1.02),
          },
          {
            id: "dawn_supply",
            label: "Dawn Supply Drop",
            summary: "A fragile reset window offers food, scrap, or ammo before the next sweep.",
            category: "recovery",
            triggerHint: "Trigger after surviving a night push.",
            objectiveShift: "Make the player choose between immediate restock and staying mobile.",
            rewardHint: "Convert the reset into a stronger next day.",
            modifiers: makeModifiers(0.92, 1.06, 1.22, 1),
          },
          {
            id: "district_breach",
            label: "District Breach",
            summary: "The route or shelter side collapses and changes where the run feels safe.",
            category: "twist",
            triggerHint: "Trigger in the final third of the slice.",
            objectiveShift: "Change the extraction line or the safe approach angle.",
            rewardHint: "Reward players who adapt their route instead of standing still.",
            modifiers: makeModifiers(1.12, 1.04, 1, 1.08),
          },
        ],
        encounterMix: { aggression: 0.92, interaction: 0.52, support: 0.54, environmental: 0.78 },
      }
    case "frontier_trade":
      return {
        ...base,
        scenarioLabel: "Contract Route Chain",
        chainLabel: "Depart -> bargain -> deliver",
        scenarioNotes: [
          "Route stops should feel like distinct contracts, not only mileage markers.",
          "Hazards should threaten cargo rhythm and morale together.",
          "Contract opportunities should alter the best next leg.",
        ],
      }
    case "political_command":
      return {
        ...base,
        scenarioLabel: "Agenda Crisis Chain",
        chainLabel: "Count -> pressure -> secure majority",
        eventDeck: [
          {
            id: "floor_whispers",
            label: "Floor Whispers",
            summary: "Quiet intel makes one bloc briefly easier to flip.",
            category: "opportunity",
            triggerHint: "Trigger early in the agenda cycle.",
            objectiveShift: "Push the player to exploit a temporary coalition opening.",
            rewardHint: "Spend on leverage while the door is open.",
            modifiers: makeModifiers(0.98, 1.16, 1.02, 1.1),
          },
          {
            id: "scandal_break",
            label: "Scandal Break",
            summary: "A public scandal raises threat across fragile sectors.",
            category: "pressure",
            triggerHint: "Trigger when the board looks too stable.",
            objectiveShift: "Redirect attention toward legitimacy and bloc retention.",
            rewardHint: "A fast response should preserve command tempo.",
            modifiers: makeModifiers(1.18, 1, 0.96, 1.02),
          },
          {
            id: "committee_reset",
            label: "Committee Reset",
            summary: "A short calm window lets the player recover morale or rebuild supply.",
            category: "recovery",
            triggerHint: "Trigger after a harsh crisis turn.",
            objectiveShift: "Use the lull to secure sectors before the next whip count.",
            rewardHint: "A disciplined reset should stabilize the board.",
            modifiers: makeModifiers(0.9, 1.04, 1.16, 1),
          },
          {
            id: "vote_deadline",
            label: "Vote Deadline",
            summary: "The active agenda must close now, even if the board is not fully ready.",
            category: "twist",
            triggerHint: "Trigger in the last third of the slice.",
            objectiveShift: "Lock the player into a clearer finish window.",
            rewardHint: "Reward decisive coalition play over endless stalling.",
            modifiers: makeModifiers(1.08, 1.1, 1, 1.12),
          },
        ],
        encounterMix: { aggression: 0.34, interaction: 0.9, support: 0.58, environmental: 0.66 },
      }
    case "cozy_agriculture":
      return {
        ...base,
        scenarioLabel: "Seasonal Routine Chain",
        chainLabel: "Prep -> grow -> cash out",
        eventDeck: [
          {
            id: "clear_weather",
            label: "Clear Weather",
            summary: "A gentle day increases field efficiency and lowers energy friction.",
            category: "recovery",
            triggerHint: "Trigger at the start of a workday.",
            objectiveShift: "Encourage the player to expand the field while the weather holds.",
            rewardHint: "More growth or a cleaner market run.",
            modifiers: makeModifiers(0.92, 1.08, 1.18, 1.04),
          },
          {
            id: "market_surge",
            label: "Market Surge",
            summary: "Town demand spikes for the current crop cycle.",
            category: "opportunity",
            triggerHint: "Trigger when the player has harvest ready.",
            objectiveShift: "Push a sell-or-store decision into the loop.",
            rewardHint: "Bigger coin returns and village hearts.",
            modifiers: makeModifiers(0.98, 1.22, 1.02, 1.06),
          },
          {
            id: "dry_spell",
            label: "Dry Spell",
            summary: "Water and energy costs rise until the player re-stabilizes the routine.",
            category: "pressure",
            triggerHint: "Trigger mid-season.",
            objectiveShift: "Make the player choose which beds to prioritize.",
            rewardHint: "A clean adjustment should protect future growth.",
            modifiers: makeModifiers(1.14, 0.98, 0.94, 1.04),
          },
          {
            id: "festival_call",
            label: "Festival Call",
            summary: "A community beat changes the best end-of-day goal.",
            category: "twist",
            triggerHint: "Trigger after a strong harvest cycle.",
            objectiveShift: "Trade some efficiency for trust and presentation.",
            rewardHint: "Hearts, soft bonuses, and a stronger finish.",
            modifiers: makeModifiers(1.02, 1.12, 1.06, 1.14),
          },
        ],
        encounterMix: { aggression: 0.18, interaction: 0.88, support: 0.74, environmental: 0.52 },
      }
    default:
      return base
  }
}

export function buildRuntimeEncounterDirector(project: RuntimeEncounterInput): RuntimeEncounterDirector {
  const base = createBaseDirector(project)
  const overridden = overrideDirector(project, base)
  const playbook = buildRuntimePlaybookPlan(project)
  const scaffolding = buildRuntimeScaffoldingPlan(project)
  const cadenceWindows = buildCadenceWindows({
    project,
    playbook,
    scaffolding,
    objectiveChain: overridden.objectiveChain.length > 0 ? overridden.objectiveChain : base.objectiveChain,
    eventDeck: overridden.eventDeck.length > 0 ? overridden.eventDeck : base.eventDeck,
  })
  const scenarioNotes = uniqueStrings([
    ...overridden.scenarioNotes,
    ...base.scenarioNotes,
  ]).slice(0, 4)
  const uiPins = uniqueStrings([
    ...overridden.uiPins,
    ...base.uiPins,
  ]).slice(0, 6)
  const encounterMix = overridden.encounterMix
  const objectiveChain = overridden.objectiveChain.length > 0 ? overridden.objectiveChain : base.objectiveChain
  const eventDeck = overridden.eventDeck.length > 0 ? overridden.eventDeck : base.eventDeck

  return {
    ...overridden,
    objectiveChain,
    eventDeck,
    cadenceWindows,
    scenarioNotes,
    uiPins,
    promptBridge: buildPromptBridge({
      project,
      director: {
        scenarioLabel: overridden.scenarioLabel,
        chainLabel: overridden.chainLabel,
        scenarioHook: overridden.scenarioHook,
        objectiveChain,
        eventDeck,
        cadenceWindows,
        encounterMix,
      },
    }),
  }
}

export function buildRuntimeEncounterDirectorFromProfile(input: {
  prompt: string
  profile: GenerationIntelligenceProfile
  genre?: Genre
  selectedFeatures?: string[]
  multiplayer?: boolean
  maxPlayers?: number
  name?: string
}): RuntimeEncounterDirector {
  return buildRuntimeEncounterDirector({
    name: input.name ?? "Generated Runtime",
    description: input.prompt,
    genre: input.genre ?? input.profile.resolvedGenre,
    dimension: input.profile.dimension,
    features: input.selectedFeatures ?? input.profile.resolvedFeatures,
    multiplayer: input.multiplayer ?? input.profile.resolvedMultiplayer,
    maxPlayers: input.maxPlayers ?? input.profile.resolvedMaxPlayers,
    design: input.profile,
  })
}

export function formatRuntimeEncounterDirectorForPrompt(director: RuntimeEncounterDirector) {
  return [
    `Scenario: ${director.scenarioLabel}`,
    `Cadence: ${director.chainLabel}`,
    `Hook: ${director.scenarioHook}`,
    "Continuity rules:",
    ...director.promptBridge.continuityRules.map((rule) => `- ${rule}`),
    "Objective chain:",
    ...director.objectiveChain.map((step) => `- ${step.label}: ${step.objective}`),
    "Cadence windows:",
    ...director.cadenceWindows.map((window) => `- ${window.label} [${window.stage}] -> ${window.eventLabel}: ${window.complicationFocus}`),
    "Live event cards:",
    ...director.eventDeck.map((event) => `- ${event.label} (${event.category}): ${event.objectiveShift}`),
  ].join("\n")
}

export function summarizeRuntimeEncounterDirector(director: RuntimeEncounterDirector) {
  return {
    scenarioLabel: director.scenarioLabel,
    chainLabel: director.chainLabel,
    encounterMix: director.encounterMix,
    objectiveChain: director.objectiveChain.map((step) => ({
      label: step.label,
      objective: step.objective,
      successSignal: step.successSignal,
      focusTags: step.focusTags,
    })),
    cadenceWindows: director.cadenceWindows.map((window) => ({
      label: window.label,
      stage: window.stage,
      directiveLabel: window.directiveLabel,
      eventLabel: window.eventLabel,
      objectiveFocus: window.objectiveFocus,
      runtimeHook: window.runtimeHook,
    })),
    promptBridge: director.promptBridge,
  }
}

export function getRuntimeEncounterCadenceWindow(
  director: RuntimeEncounterDirector,
  index: number,
): RuntimeEncounterCadenceWindow | undefined {
  if (director.cadenceWindows.length === 0) return undefined
  return director.cadenceWindows[normalizeIndex(index, director.cadenceWindows.length)] ?? director.cadenceWindows[0]
}

export function getRuntimeEncounterTickWeights(
  director: RuntimeEncounterDirector,
  directiveIndex: number,
  eventIndex: number,
  progress = 0,
): RuntimeEncounterTickWeights {
  const directive = getRuntimeEncounterDirective(director, directiveIndex)
  const event = getRuntimeEncounterEvent(director, eventIndex)
  const cadenceWindow = getRuntimeEncounterCadenceWindow(director, directiveIndex)
  const stage = cadenceWindow?.stage ?? "pivot"
  const normalizedProgress = clamp01(progress)

  const stageBias = stage === "opening"
    ? { pressure: 0.94, reward: 1.02, recovery: 1.04, interaction: 1.04, hostile: 0.92, support: 1.02, hazard: 0.96, event: 0.94, tempo: 0.96 }
    : stage === "escalation"
      ? { pressure: 1.08, reward: 1.02, recovery: 0.96, interaction: 1, hostile: 1.12, support: 0.94, hazard: 1.06, event: 1.04, tempo: 1.06 }
      : stage === "climax"
        ? { pressure: 1.16, reward: 1.08, recovery: 0.92, interaction: 0.98, hostile: 1.18, support: 0.92, hazard: 1.12, event: 1.12, tempo: 1.1 }
        : { pressure: 1, reward: 1.06, recovery: 1.02, interaction: 1.08, hostile: 1, support: 1.02, hazard: 1.02, event: 1.06, tempo: 1.02 }

  const progressBias = 0.94 + normalizedProgress * (stage === "climax" ? 0.24 : 0.18)

  return {
    stage,
    pressure: roundWeight(directive.modifiers.pressure * event.modifiers.pressure * stageBias.pressure * progressBias),
    reward: roundWeight(directive.modifiers.reward * event.modifiers.reward * stageBias.reward),
    recovery: roundWeight(directive.modifiers.recovery * event.modifiers.recovery * stageBias.recovery),
    interaction: roundWeight(directive.modifiers.interaction * event.modifiers.interaction * stageBias.interaction),
    hostileSpawn: roundWeight(director.encounterMix.aggression * stageBias.hostile * Math.max(0.72, event.modifiers.pressure)),
    supportSpawn: roundWeight(director.encounterMix.support * stageBias.support * Math.max(0.72, event.modifiers.recovery)),
    hazardRate: roundWeight(director.encounterMix.environmental * stageBias.hazard * Math.max(0.78, event.modifiers.pressure)),
    eventAdvanceRate: roundWeight(stageBias.event * (0.92 + normalizedProgress * 0.2)),
    objectiveTempo: roundWeight(stageBias.tempo * (0.9 + normalizedProgress * 0.22)),
  }
}

export function getRuntimeEncounterDirective(
  director: RuntimeEncounterDirector,
  index: number,
): RuntimeEncounterObjectiveStep {
  if (director.objectiveChain.length === 0) {
    return {
      id: "fallback_step",
      label: "Prompt Objective",
      objective: "Keep the live loop aligned to the creator prompt.",
      successSignal: "The runtime still reads like the original brief.",
      complication: "Avoid collapsing back into a generic fallback loop.",
      focusTags: ["prompt", "fidelity"],
      modifiers: makeModifiers(),
    }
  }

  return director.objectiveChain[normalizeIndex(index, director.objectiveChain.length)] ?? director.objectiveChain[0]
}

export function getRuntimeEncounterEvent(
  director: RuntimeEncounterDirector,
  index: number,
): RuntimeEncounterEventCard {
  if (director.eventDeck.length === 0) {
    return {
      id: "fallback_event",
      label: "Prompt Shift",
      summary: "Adjust the objective without breaking prompt fidelity.",
      category: "twist",
      triggerHint: "Trigger when the scenario would otherwise go flat.",
      objectiveShift: "Keep the current verb set fresh and readable.",
      rewardHint: "Reward the player for adapting quickly.",
      modifiers: makeModifiers(),
    }
  }

  return director.eventDeck[normalizeIndex(index, director.eventDeck.length)] ?? director.eventDeck[0]
}

export function getRuntimeEncounterBeat(
  director: RuntimeEncounterDirector,
  directiveIndex: number,
  eventIndex: number,
) {
  const cadenceWindow = getRuntimeEncounterCadenceWindow(director, directiveIndex)

  return {
    directive: getRuntimeEncounterDirective(director, directiveIndex),
    event: getRuntimeEncounterEvent(director, eventIndex),
    cadenceWindow,
  }
}
