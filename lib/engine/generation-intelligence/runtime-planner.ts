import type {
  GameDimension,
  GenerationRuntimeArchetype,
  GenerationRuntimePlan,
  Genre,
} from "@/lib/engine/types"

function hasPromptMatch(prompt: string, pattern: RegExp) {
  return pattern.test(prompt.toLowerCase())
}

function pickRuntimeReason(input: {
  archetype: GenerationRuntimeArchetype
  genre: Genre
  dimension: GameDimension
  promptSignals: string[]
  prompt: string
}) {
  switch (input.archetype) {
    case "survival_expedition_3d":
      if (hasPromptMatch(input.prompt, /zombie|undead|infected|horde|scavenge|shelter|safehouse|repair|outpost|survival horror/)) {
        return "The brief asks for a direct-avatar 3D survival fantasy, so the runtime must preserve scavenging, shelter upkeep, traversal, and hostile pressure instead of flattening into fortify-only command play."
      }
      return "The design calls for a larger 3D survival slice with exploration, attrition, and recovery loops that stay visible in moment-to-moment play."
    case "action_operation_3d":
      if (hasPromptMatch(input.prompt, /black ops|call of duty|raid|mission|breach|squad|shooter|first person|third person|stealth/)) {
        return "The prompt is direct-avatar 3D action, so the runtime should behave like an authored operation with objectives, traversal, encounter beats, and extraction instead of a flat board-state loop."
      }
      return "The design leans toward authored 3D action and mission pressure, so the playable slice needs spatial objectives, readable combat routes, and objective-led pacing."
    case "survival_horde":
      if (hasPromptMatch(input.prompt, /zombie|undead|infected|horde|apocalypse|survival horror/)) {
        return "The prompt asks for hostile-survival pressure, so the runtime must prioritize scavenging, horde spikes, and defensive recovery instead of route travel."
      }
      return "The design reads as survival under active pressure, so the runtime centers on endurance, scavenging, and hostile escalation."
    case "homestead_life":
      if (hasPromptMatch(input.prompt, /farm|farming|harvest|crop|stardew|life sim|cozy town/)) {
        return "The prompt is cozy-life oriented, so the runtime should revolve around field work, schedules, and relationship loops instead of combat extraction."
      }
      return "The design is simulation-first, so the runtime focuses on routines, growth, and readable daily progression."
    case "strategy_command":
      return "The prompt emphasizes planning and control, so the runtime needs command decisions, resource allocation, and board-state feedback."
    case "journey_route":
      return "The prompt is travel-first without sustained combat pressure, so route pacing and stop resolution should own the playable slice."
    default:
      if (input.dimension === "3d") {
        return "The prompt leans toward direct combat and space control, so the runtime should use a combat-mission slice rather than a flat generic arena."
      }
      return "The design still resolves to direct mission pressure, so the runtime uses encounter-driven combat instead of collapsing into travel or farming."
  }
}

export function selectRuntimeArchetype(input: {
  prompt: string
  genre: Genre
  dimension: GameDimension
  promptSignals: string[]
  resolvedFeatures: string[]
}): GenerationRuntimeArchetype {
  const prompt = input.prompt.toLowerCase()
  const signals = new Set(input.promptSignals)
  const features = new Set(input.resolvedFeatures)
  const hasCombat = features.has("combat")
  const peaceful = signals.has("peaceful")
  const farmingHeavy = /farm|farming|crop|harvest|watering|seed|homestead|ranch|village sim|life sim|stardew|fishing|cozy town/.test(prompt)
  const strategyHeavy =
    signals.has("strategy-heavy") ||
    signals.has("colony-heavy") ||
    signals.has("automation-heavy") ||
    input.genre === "strategy" ||
    input.genre === "four_x" ||
    input.genre === "deckbuilder" ||
    input.genre === "moba" ||
    input.genre === "tower_defense" ||
    input.genre === "auto_battler" ||
    /strategy|command|colony|city builder|settlement builder|factory|production chain|supply chain|automation|4x|tower defense|moba|deckbuilder|auto battler/.test(prompt)
  const journeyHeavy = signals.has("travel-heavy") || input.genre === "adventure" || input.genre === "rhythm" || /journey|trail|caravan|voyage|expedition|road trip/.test(prompt)
  const zombieHeavy = /zombie|undead|infected|horde|apocalypse|apocalyptic|mutant swarm/.test(prompt)
  const shooterHeavy =
    input.genre === "fps" ||
    input.genre === "shooter" ||
    signals.has("combat-heavy") ||
    /first person|third person|shooter|tactical shooter|black ops|call of duty|mission|raid|breach|loadout|firefight|gunplay|extraction shooter|special ops/.test(prompt)
  const survivalHeavy = input.genre === "survival" || signals.has("survival-heavy")
  const stealthHeavy = signals.has("stealth-heavy") || input.genre === "stealth" || /stealth|infiltration|silent takedown|sneak/.test(prompt)
  const heistHeavy = signals.has("heist-heavy") || /heist|vault|caper|crew job|robbery|getaway|inside job/.test(prompt)
  const immersiveHeavy = signals.has("immersive-sim") || /immersive sim|multiple solutions|systemic stealth|deus ex|dishonored|prey-like/.test(prompt)
  const investigationHeavy =
    signals.has("investigation-heavy") ||
    signals.has("mystery-heavy") ||
    input.genre === "visual_novel" ||
    input.genre === "interactive_fiction" ||
    /detective|investigation|case file|suspect|forensics|crime scene|clue board|whodunit/.test(prompt)
  const restorationHeavy =
    signals.has("restoration-heavy") ||
    signals.has("archaeology-heavy") ||
    /archaeology|excavation|artifact|museum|restoration|renovation|cleanup|repair shop/.test(prompt)
  const politicsHeavy = signals.has("politics-heavy") || /politics|policy|council|senate|election|parliament|coalition/.test(prompt)
  const scavengeHeavy = /scavenge|loot run|shelter|safehouse|repair|fortify|barricade|outpost|crafting bench|generator/.test(prompt)
  const puzzleHeavy = signals.has("puzzle-heavy") || input.genre === "puzzle" || /puzzle|logic|escape room|physics toy|chamber/.test(prompt)
  const threeDDirectAvatar =
    input.dimension === "3d" &&
    (
      shooterHeavy ||
      stealthHeavy ||
      heistHeavy ||
      immersiveHeavy ||
      zombieHeavy ||
      input.genre === "action" ||
      input.genre === "fighting" ||
      input.genre === "soulslike" ||
      /over-the-shoulder|third-person|first-person|avatar|character action|movement shooter|immersive|fighting|souls-like/.test(prompt)
    )

  if (farmingHeavy || (input.genre === "simulation" && peaceful && !hasCombat)) {
    return "homestead_life"
  }

  if (!hasCombat && restorationHeavy && input.genre === "simulation") {
    return "homestead_life"
  }

  if (!hasCombat && (investigationHeavy || restorationHeavy || puzzleHeavy || input.genre === "walking_simulator" || input.genre === "rhythm")) {
    return "journey_route"
  }

  if (!hasCombat && politicsHeavy && (input.genre === "strategy" || input.genre === "simulation")) {
    return "strategy_command"
  }

  if (
    input.dimension === "3d" &&
    (survivalHeavy || input.genre === "horror" || zombieHeavy) &&
    (hasCombat || threeDDirectAvatar || scavengeHeavy)
  ) {
    return "survival_expedition_3d"
  }

  if (
    input.dimension === "3d" &&
    !puzzleHeavy &&
    (threeDDirectAvatar || shooterHeavy || heistHeavy || immersiveHeavy || signals.has("extraction-heavy") || (hasCombat && !peaceful))
  ) {
    return "action_operation_3d"
  }

  if (strategyHeavy && !(input.dimension === "3d" && (threeDDirectAvatar || shooterHeavy))) {
    return "strategy_command"
  }

  if ((survivalHeavy || input.genre === "horror" || zombieHeavy) && (hasCombat || zombieHeavy || shooterHeavy)) {
    return "survival_horde"
  }

  if (journeyHeavy && !hasCombat && !zombieHeavy && !shooterHeavy) {
    return "journey_route"
  }

  if (input.genre === "simulation" && !hasCombat) {
    return peaceful ? "homestead_life" : "strategy_command"
  }

  if (input.genre === "strategy" && input.dimension !== "3d") {
    return "strategy_command"
  }

  if (input.genre === "survival") {
    if (input.dimension === "3d" && (hasCombat || scavengeHeavy || zombieHeavy)) {
      return "survival_expedition_3d"
    }
    return hasCombat ? "survival_horde" : "journey_route"
  }

  if (shooterHeavy || hasCombat || input.genre === "battle_royale" || input.genre === "horror") {
    return input.dimension === "3d" ? "action_operation_3d" : "combat_mission"
  }

  if (input.genre === "adventure" && journeyHeavy) {
    return "journey_route"
  }

  return input.dimension === "3d" ? "action_operation_3d" : "journey_route"
}

export function planGenerationRuntime(input: {
  prompt: string
  genre: Genre
  dimension: GameDimension
  promptSignals: string[]
  resolvedFeatures: string[]
  forcedArchetype?: GenerationRuntimeArchetype
}): GenerationRuntimePlan {
  const archetype = input.forcedArchetype ?? selectRuntimeArchetype(input)
  const threeD = input.dimension === "3d"

  switch (archetype) {
    case "survival_expedition_3d":
      return {
        archetype,
        label: "3D Survival Expedition Runtime",
        reason: pickRuntimeReason({ ...input, archetype }),
        cameraModel: "Over-the-shoulder or first-person survival camera with readable objective landmarks and safehouse return anchors",
        targetSessionMinutes: 26,
        inputModel: "Move through linked 3D survival zones, scavenge under pressure, repair a fallback base, and survive escalation before extraction.",
        playFocus: ["Scavenge and salvage", "Safehouse upkeep", "3D traversal pressure", "Hostile escalation"],
        uiFocus: ["Objective tracker", "Vitals and ammo", "Repair materials", "Threat lane and extraction feed"],
        contentStrategy: [
          "Build one dense 3D scavenging district and one safehouse loop before widening the world.",
          "Treat zombies, infected, or hostile pressure as a systemic layer tied to scavenging and recovery, not just enemy reskins.",
          "Keep repair, scavenging, and extraction verbs playable in the first session before optional expansion systems.",
        ],
        winCondition: "Secure the required resources, survive the escalation window, and extract or return to the safehouse alive.",
        failCondition: "The player dies, loses the safehouse, or burns through vital supplies before stabilizing the route.",
        antiCollapseRules: [
          "Never downgrade 3D survival prompts into a command-board fortify loop.",
          "Never replace scavenging, shelter repair, or extraction verbs with generic button-clicker progression.",
          "If the brief names zombies, infection, safehouses, or scavenging, those nouns must appear in the first playable slice.",
        ],
      }
    case "action_operation_3d":
      return {
        archetype,
        label: "3D Action Operation Runtime",
        reason: pickRuntimeReason({ ...input, archetype }),
        cameraModel: "Shoulder-cam or first-person mission camera with authored combat lanes, cover reads, and extraction framing",
        targetSessionMinutes: 24,
        inputModel: "Advance through a 3D mission space, clear objectives, manage ammo and pressure, and extract through a readable end-state.",
        playFocus: ["Mission objectives", "3D movement and cover", "Threat routing", "Extraction payoff"],
        uiFocus: ["Objective feed", "Health, ammo, and armor", "Squad or support status", "Threat direction and interact prompts"],
        contentStrategy: [
          "Ship one polished operation with breach, push, recover, and extract beats before adding extra missions.",
          "Use prompt-specific nouns to name threats, rooms, and objectives so the slice does not feel generic.",
          "Prioritize readable encounter lanes, landmarking, and objective scripting before spectacle-only expansion.",
        ],
        winCondition: "Finish the objective chain, secure the target state, and extract from the operation zone.",
        failCondition: "The player is eliminated, the objective collapses, or mission pressure overruns the available recovery windows.",
        antiCollapseRules: [
          "Never reroute 3D shooter, raid, or stealth-operation prompts into strategy_command.",
          "Do not collapse direct-avatar prompts into fortify cards, idle loops, or flat shard collection.",
          "Honor first-person, third-person, squad, raid, and mission language as hard runtime constraints.",
        ],
      }
    case "survival_horde":
      return {
        archetype,
        label: "Survival Horde Runtime",
        reason: pickRuntimeReason({ ...input, archetype }),
        cameraModel: threeD ? "Over-the-shoulder survival combat camera" : "Top-down survival pressure camera",
        targetSessionMinutes: threeD ? 18 : 16,
        inputModel: "Move, scavenge, fortify, fire, repair, and survive night spikes without losing the base.",
        playFocus: ["Scavenge routes", "Day-night pressure", "Defensive repairs", "Wave survival"],
        uiFocus: ["Status vitals", "Threat meter", "Resource pack", "Night countdown"],
        contentStrategy: [
          "Generate one safehouse and one surrounding scavenging loop before adding late-game content.",
          "Treat zombies or hostile swarms as a named pressure layer, not generic red enemies.",
          "Keep recovery windows, shelter repair, and extraction goals visible in the first playable slice.",
        ],
        winCondition: "Survive the required nights or secure extraction after meeting the supply threshold.",
        failCondition: "The player dies, the base collapses, or attrition empties vital resources.",
        antiCollapseRules: [
          "Never downgrade survival prompts into a shard-collection shooter.",
          "If the brief includes zombies, undead, infection, or apocalypse language, preserve hostile survival pressure.",
          "Always expose scavenging, shelter, or endurance systems before scoring the run as playable.",
        ],
      }
    case "homestead_life":
      return {
        archetype,
        label: "Homestead Life Runtime",
        reason: pickRuntimeReason({ ...input, archetype }),
        cameraModel: "Readable top-down homestead camera with field-grid interaction",
        targetSessionMinutes: 16,
        inputModel: "Navigate a compact farm, manage energy and time, tend crops, and build a stronger day cycle.",
        playFocus: ["Crop care", "Daily routines", "Village economy", "Relationship cadence"],
        uiFocus: ["Day clock", "Energy bar", "Seed and crop tray", "Village goals"],
        contentStrategy: [
          "Ship one high-clarity farm loop before layering romance, mining, or festivals.",
          "Turn farming words into actionable crop states instead of abstract simulation text.",
          "Prefer dense, legible daily progression over broad but shallow sandbox sprawl.",
        ],
        winCondition: "Hit the seasonal income or harvest target while maintaining enough energy and morale to continue.",
        failCondition: "The farm stalls from poor planning, wasted days, or missed upkeep.",
        antiCollapseRules: [
          "Never route cozy or farming briefs into a combat template.",
          "Expose till, plant, water, harvest, and sell loops in the first playable slice.",
          "Use village, crop, and routine language as hard content constraints, not optional flavor.",
        ],
      }
    case "strategy_command":
      return {
        archetype,
        label: "Command Strategy Runtime",
        reason: pickRuntimeReason({ ...input, archetype }),
        cameraModel: threeD ? "Tactical command overview with battlefield zoom" : "Board-state strategy camera",
        targetSessionMinutes: 18,
        inputModel: "Read the sectors, allocate command resources, fortify weak points, and resolve turns with leverage.",
        playFocus: ["Sector control", "Resource allocation", "Threat forecasting", "Operation timing"],
        uiFocus: ["Command points", "Sector cards", "Threat forecast", "Morale and supply"],
        contentStrategy: [
          "Represent strategy as decisions with visible consequences, not hidden shooter math.",
          "Keep one command layer, one economy layer, and one threat layer visible at all times.",
          "Constrain the first slice to a handful of sectors so planning quality stays readable.",
        ],
        winCondition: "Secure enough sectors or campaign leverage before morale or supply collapses.",
        failCondition: "Sector loss chains into a command collapse, resource bankruptcy, or zero morale.",
        antiCollapseRules: [
          "Never flatten strategy prompts into direct-avatar combat unless the prompt explicitly asks for it.",
          "Expose board-state consequences on every turn.",
          "Keep command readability ahead of spectacle in the first playable.",
        ],
      }
    case "journey_route":
      return {
        archetype,
        label: "Journey Route Runtime",
        reason: pickRuntimeReason({ ...input, archetype }),
        cameraModel: threeD ? "Forward-travel route camera with roadside events" : "Route-strip journey camera",
        targetSessionMinutes: 14,
        inputModel: "Maintain pace, route between stops, spend supplies carefully, and resolve travel events cleanly.",
        playFocus: ["Travel pacing", "Stop decisions", "Supply discipline", "Arrival payoff"],
        uiFocus: ["Distance strip", "Convoy health", "Supplies", "Next-stop panel"],
        contentStrategy: [
          "Keep route legs short enough to feel readable and meaningful.",
          "Resolve each stop with one strong event rather than many shallow popups.",
          "Use movement and scarcity to create tension before adding combat.",
        ],
        winCondition: "Reach the destination with the caravan, crew, or expedition intact.",
        failCondition: "Distance stalls out or route pressure empties supplies, morale, or vehicle integrity.",
        antiCollapseRules: [
          "Do not inject shooter loops into travel-first prompts unless the brief explicitly demands it.",
          "Preserve route choice, pacing, and logistics as first-class interactions.",
          "Keep the player advancing toward a destination, not circling in a generic arena.",
        ],
      }
    default:
      return {
        archetype,
        label: "Combat Mission Runtime",
        reason: pickRuntimeReason({ ...input, archetype }),
        cameraModel: threeD ? "Over-the-shoulder mission combat camera" : "Top-down mission combat camera",
        targetSessionMinutes: threeD ? 15 : 12,
        inputModel: "Move through a mission space, manage combat pressure, hit objectives, and extract cleanly.",
        playFocus: ["Encounter routing", "Objective pressure", "Weapon readiness", "Recovery pockets"],
        uiFocus: ["Mission objective", "Health and ammo", "Enemy pressure", "Ability cooldowns"],
        contentStrategy: [
          "Make combat prompts mission-led and objective-led instead of endlessly wave-based.",
          "Use genre-specific nouns from the prompt to name objectives and threats.",
          "Stage one polished combat route before expanding content breadth.",
        ],
        winCondition: "Complete the objective chain and leave the combat space alive.",
        failCondition: "The squad wipes, the objective fails, or pressure spikes without recovery.",
        antiCollapseRules: [
          "Do not turn every combat brief into the same 2D arena extraction.",
          "Honor 3D prompts with a 3D-leaning camera model and mission pacing.",
          "Carry forward the prompt's tone, enemy type, and objective nouns into the playable slice.",
        ],
      }
  }
}
