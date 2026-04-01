import { budgetPromptMessages } from "@/lib/engine/prompts"
import type {
  GameDimension,
  Genre,
  LevelBeat,
} from "@/lib/engine/types"
import {
  GAMEPLAY_LOOP_LIBRARY,
  GENRE_CONTENT_PILLARS,
  GENRE_INTERACTION_MODEL,
  GENRE_PLAYER_FANTASY,
  GENRE_PROGRESSION_ARCS,
  GENRE_SESSION_FANTASY,
  GENRE_SYSTEM_PRIORITIES,
  GENRE_UI_SURFACES,
  LEVEL_FLOW_LIBRARY,
  SIGNAL_CONTENT_PILLARS,
  takeTop,
} from "./shared"

export interface GenerationMechanicsPlan {
  playerFantasy: string
  sessionFantasy: string
  interactionModel: string
  contentPillars: string[]
  progressionArcs: string[]
  uiSurfaces: string[]
  systemPriorities: string[]
  generatedPitch: string
  gameplayLoopSummary: string
  coreLoop: string[]
  secondaryLoop: string[]
  progressionLoop: string[]
  failStates: string[]
  levelSequence: LevelBeat[]
}

export function inferPlayerFantasy(genre: Genre, promptSignals: string[], prompt: string) {
  if (promptSignals.includes("combat-heavy") && /black ops|call of duty|raid|breach|mission|shooter|first person|third person|extraction/i.test(prompt)) {
    return "Move like a direct-avatar operator, clear objectives under pressure, and feel every push, breach, and extraction beat land cleanly."
  }

  if (promptSignals.includes("survival-heavy") && /zombie|infected|scavenge|safehouse|repair|outpost|shelter/i.test(prompt)) {
    return "Traverse dangerous ground, scavenge what you need, keep the safehouse alive, and survive pressure without losing momentum."
  }

  if (promptSignals.includes("social-deduction")) {
    return "Read people, manage suspicion, and manipulate shared information until the room believes the wrong thing or the right thing at the right time."
  }

  if (promptSignals.includes("heist-heavy") || promptSignals.includes("immersive-sim")) {
    return "Study a layered space, choose an approach, improvise through systemic pressure, and make the extraction feel earned."
  }

  if (promptSignals.includes("investigation-heavy")) {
    return "Read spaces, interrogate leads, connect evidence, and solve the case through attention and synthesis instead of brute force."
  }

  if (promptSignals.includes("archaeology-heavy") || promptSignals.includes("restoration-heavy")) {
    return "Recover meaningful finds, understand their condition, restore them carefully, and turn discovery into lasting progress."
  }

  if (promptSignals.includes("politics-heavy")) {
    return "Build leverage across factions, push policies at the right moment, and turn unstable civic pressure into a winning position."
  }

  if (promptSignals.includes("card-heavy")) {
    return "Build a run-defining hand, exploit synergies, and out-plan the board through smart sequencing."
  }

  if (promptSignals.includes("puzzle-heavy")) {
    return "Understand the rule set faster than the space changes, then turn that understanding into elegant solutions."
  }

  if (promptSignals.includes("sports-heavy")) {
    return "Master the rules, tempo, and positioning of a competitive space until execution feels clean and earned."
  }

  if (promptSignals.includes("education-heavy")) {
    return "Learn through doing, get fast readable feedback, and feel your understanding deepen with each solved challenge."
  }

  if (promptSignals.includes("travel-heavy") && promptSignals.includes("simulation-heavy")) {
    return "Guide a caravan across a living route where supplies, morale, and event choices matter as much as arrival."
  }

  if (promptSignals.includes("economy-heavy")) {
    return "Turn route knowledge, timing, and settlement leverage into a stronger position every leg."
  }

  if (promptSignals.includes("peaceful")) {
    return "Progress through decision-making, travel rhythm, and discovery without the game forcing violence into the loop."
  }

  if (/oregon trail|wagon trail/i.test(prompt)) {
    return "Lead a wagon journey across a dangerous frontier and survive through planning, pacing, and hard choices."
  }

  return GENRE_PLAYER_FANTASY[genre]
}

export function inferSessionFantasy(genre: Genre, promptSignals: string[], prompt: string) {
  if (promptSignals.includes("combat-heavy") && /black ops|call of duty|raid|breach|mission|shooter|first person|third person|extraction/i.test(prompt)) {
    return "A session should feel like a readable 3D operation with breach, push, recovery, and extraction instead of a generic arena grind."
  }

  if (promptSignals.includes("survival-heavy") && /zombie|infected|scavenge|safehouse|repair|outpost|shelter/i.test(prompt)) {
    return "A session should feel like venturing out, scavenging under pressure, stabilizing a safe return, and surviving the final escalation."
  }

  if (promptSignals.includes("social-deduction")) {
    return "A session should feel like gathering evidence, shaping suspicion, and surviving a tense shared reveal."
  }

  if (promptSignals.includes("heist-heavy") || promptSignals.includes("immersive-sim")) {
    return "A session should feel like casing the target, committing to an approach, adapting under pressure, and escaping with a clear payoff."
  }

  if (promptSignals.includes("investigation-heavy")) {
    return "A session should feel like opening leads, testing theories, and landing one strong reveal that changes what the player knows next."
  }

  if (promptSignals.includes("archaeology-heavy") || promptSignals.includes("restoration-heavy")) {
    return "A session should feel like one meaningful recovery-and-restoration cycle with visible before-and-after progress."
  }

  if (promptSignals.includes("politics-heavy")) {
    return "A session should feel like navigating factions, spending leverage, and closing the turn with the board visibly changed by your policy choices."
  }

  if (promptSignals.includes("puzzle-heavy")) {
    return "A session should feel like learning one clean rule, seeing it remixed, and finishing on a satisfying mastery test."
  }

  if (promptSignals.includes("farming-heavy")) {
    return "A session should feel like one meaningful day cycle of work, care, social visits, and visible seasonal progress."
  }

  if (promptSignals.includes("sports-heavy")) {
    return "A session should feel like one readable competitive arc with clear possession, momentum, and comeback windows."
  }

  if (/oregon trail|wagon trail/i.test(prompt)) {
    return "A session should feel like one readable stretch of frontier travel full of tradeoffs, setbacks, and meaningful arrival."
  }

  if (promptSignals.includes("simulation-heavy") && promptSignals.includes("strategy-heavy")) {
    return "A session should feel like setting a plan, watching the system react, and adapting before the next cycle breaks."
  }

  return GENRE_SESSION_FANTASY[genre]
}

export function inferInteractionModel(genre: Genre, promptSignals: string[], resolvedFeatures: string[]) {
  const parts = [GENRE_INTERACTION_MODEL[genre]]

  if (promptSignals.includes("combat-heavy")) {
    parts.push("Direct-avatar movement, objective pushes, and recovery windows should be explicit instead of implied through abstract command input.")
  }
  if (promptSignals.includes("travel-heavy")) parts.push("Travel legs and stop resolution should be first-class interactions.")
  if (promptSignals.includes("economy-heavy")) parts.push("Trading, resupply, and value comparison should stay readable.")
  if (promptSignals.includes("heist-heavy") || promptSignals.includes("immersive-sim")) parts.push("Approach selection, security response, and systemic improvisation should stay visible as core verbs.")
  if (promptSignals.includes("investigation-heavy")) parts.push("Evidence tracking, suspect pressure, and theory confirmation should drive the interaction model.")
  if (promptSignals.includes("archaeology-heavy") || promptSignals.includes("restoration-heavy")) parts.push("Condition assessment, restoration steps, and curation feedback should be playable rather than cosmetic.")
  if (promptSignals.includes("politics-heavy")) parts.push("Policy timing, faction reactions, and leverage spending should be legible in every major turn.")
  if (promptSignals.includes("card-heavy")) parts.push("Deck shaping, hand sequencing, and tactical card timing should remain explicit.")
  if (promptSignals.includes("social-deduction")) parts.push("Hidden information, accusation flow, and meeting resolution should be first-class interactions.")
  if (promptSignals.includes("puzzle-heavy")) parts.push("Chamber rules, reset clarity, and experimentation should be readable without guessing hidden logic.")
  if (promptSignals.includes("sports-heavy")) parts.push("Rules, possession windows, and tactical formations should stay visible and legible.")
  if (promptSignals.includes("education-heavy")) parts.push("Concept scaffolding and immediate corrective feedback should appear in the core interaction loop.")
  if (promptSignals.includes("peaceful") && !resolvedFeatures.includes("combat")) {
    parts.push("Tension should come from route pressure, scarcity, or events instead of forced combat.")
  }

  return parts.join(" ")
}

export function inferContentPillars(genre: Genre, prompt: string, promptSignals: string[], resolvedFeatures: string[]) {
  const pillars = [...GENRE_CONTENT_PILLARS[genre]]

  SIGNAL_CONTENT_PILLARS.forEach((rule) => {
    if (rule.pattern.test(prompt)) {
      pillars.push(...rule.pillars)
    }
  })

  if (resolvedFeatures.includes("combat")) pillars.push("Threat management")
  if (resolvedFeatures.includes("world_gen")) pillars.push("Map readability")
  if (promptSignals.includes("peaceful")) pillars.push("Low-violence pressure")

  return takeTop(pillars, 5)
}

export function inferProgressionArcs(genre: Genre, promptSignals: string[], resolvedFeatures: string[]) {
  const arcs = [...GENRE_PROGRESSION_ARCS[genre]]

  if (promptSignals.includes("combat-heavy")) arcs.push("Complete the next operation phase")
  if (promptSignals.includes("travel-heavy")) arcs.push("Open the next route leg")
  if (promptSignals.includes("economy-heavy")) arcs.push("Increase route efficiency")
  if (promptSignals.includes("simulation-heavy")) arcs.push("Stabilize the next cycle")
  if (promptSignals.includes("heist-heavy") || promptSignals.includes("immersive-sim")) arcs.push("Unlock a cleaner infiltration option")
  if (promptSignals.includes("investigation-heavy")) arcs.push("Validate the next lead chain")
  if (promptSignals.includes("archaeology-heavy") || promptSignals.includes("restoration-heavy")) arcs.push("Restore a higher-value artifact or site")
  if (promptSignals.includes("politics-heavy")) arcs.push("Secure the next coalition or policy swing")
  if (promptSignals.includes("card-heavy")) arcs.push("Unlock stronger deck synergies")
  if (promptSignals.includes("farming-heavy")) arcs.push("Deepen the next season and routine")
  if (promptSignals.includes("sports-heavy")) arcs.push("Refine the next formation or playbook")
  if (promptSignals.includes("education-heavy")) arcs.push("Teach the next concept cleanly")
  if (resolvedFeatures.includes("ai_npc")) arcs.push("Deepen world-state reactions")

  return takeTop(arcs, 4)
}

export function inferUiSurfaces(genre: Genre, promptSignals: string[], resolvedFeatures: string[]) {
  const surfaces = [...GENRE_UI_SURFACES[genre]]

  if (promptSignals.includes("combat-heavy")) surfaces.unshift("Objective feed and extraction markers")
  if (promptSignals.includes("travel-heavy")) surfaces.push("Waypoint route strip")
  if (promptSignals.includes("economy-heavy")) surfaces.unshift("Trade and supply ledger")
  if (promptSignals.includes("simulation-heavy")) surfaces.push("Operational status dashboard")
  if (promptSignals.includes("story-heavy")) surfaces.push("Narrative event panels")
  if (promptSignals.includes("heist-heavy") || promptSignals.includes("immersive-sim")) surfaces.push("Security heatmap and route options")
  if (promptSignals.includes("investigation-heavy")) surfaces.push("Evidence board and suspect tracker")
  if (promptSignals.includes("archaeology-heavy") || promptSignals.includes("restoration-heavy")) surfaces.push("Artifact condition log and restoration bench")
  if (promptSignals.includes("politics-heavy")) surfaces.push("Faction leverage and policy board")
  if (promptSignals.includes("card-heavy")) surfaces.push("Deck, hand, and discard surfaces")
  if (promptSignals.includes("social-deduction")) surfaces.push("Suspicion board and meeting log")
  if (promptSignals.includes("puzzle-heavy")) surfaces.push("Rule reminder and chamber reset strip")
  if (promptSignals.includes("farming-heavy")) surfaces.push("Season planner and crop board")
  if (promptSignals.includes("sports-heavy")) surfaces.push("Play clock and formation board")
  if (promptSignals.includes("education-heavy")) surfaces.push("Goal tracker and concept feedback panel")
  if (resolvedFeatures.includes("networking")) surfaces.push("Party and convoy roster")

  return takeTop(surfaces, 5)
}

export function inferSystemPriorities(
  genre: Genre,
  dimension: GameDimension,
  promptSignals: string[],
  resolvedFeatures: string[],
) {
  const priorities = [...GENRE_SYSTEM_PRIORITIES[genre]]

  if (dimension === "3d") priorities.push("Spatial readability")
  if (promptSignals.includes("combat-heavy")) priorities.push("Objective-led combat flow")
  if (resolvedFeatures.includes("world_gen")) priorities.push("Non-overlapping layout ownership")
  if (promptSignals.includes("travel-heavy")) priorities.push("Route leg pacing")
  if (promptSignals.includes("simulation-heavy")) priorities.push("Cause-and-effect readability")
  if (promptSignals.includes("economy-heavy")) priorities.push("Resource flow clarity")
  if (promptSignals.includes("heist-heavy") || promptSignals.includes("immersive-sim")) priorities.push("Solution-space clarity")
  if (promptSignals.includes("investigation-heavy")) priorities.push("Lead-state continuity")
  if (promptSignals.includes("archaeology-heavy") || promptSignals.includes("restoration-heavy")) priorities.push("Condition-state readability")
  if (promptSignals.includes("politics-heavy")) priorities.push("Faction consequence clarity")
  if (promptSignals.includes("card-heavy")) priorities.push("Hand-state readability")
  if (promptSignals.includes("social-deduction")) priorities.push("Information asymmetry clarity")
  if (promptSignals.includes("puzzle-heavy")) priorities.push("Rule teaching clarity")
  if (promptSignals.includes("farming-heavy")) priorities.push("Daily routine readability")
  if (promptSignals.includes("sports-heavy")) priorities.push("Rules and lane clarity")
  if (promptSignals.includes("education-heavy")) priorities.push("Feedback and concept scaffolding")
  if (promptSignals.includes("peaceful") && !resolvedFeatures.includes("combat")) priorities.push("Non-combat tension")

  return takeTop(priorities, 5)
}

export function buildGeneratedPitch(input: {
  genre: Genre
  dimension: GameDimension
  promptSignals: string[]
  mapArchetype: string
  playerFantasy: string
  environmentThemes: string[]
}) {
  const mode = input.promptSignals.includes("peaceful")
    ? "non-combat"
    : input.promptSignals.includes("social-deduction")
      ? "social-deduction"
      : input.promptSignals.includes("puzzle-heavy")
        ? "puzzle-led"
        : input.promptSignals.includes("sports-heavy")
          ? "rules-driven"
      : input.promptSignals.includes("combat-heavy")
          ? "combat-driven"
          : "prompt-led"
  const environmentNote = input.environmentThemes.slice(0, 2).join(" and ").toLowerCase()

  const pitchPrompt = budgetPromptMessages([
    {
      role: "user",
      sections: [
        { id: "pitch-prefix", content: "A" },
        { id: "pitch-mode", content: mode },
        { id: "pitch-dimension", content: input.dimension.toUpperCase() },
        { id: "pitch-genre", content: input.genre.replace(/_/g, " ") },
        { id: "pitch-map", content: `experience built around ${input.mapArchetype.toLowerCase()}.` },
        { id: "pitch-fantasy", content: `Player fantasy: ${input.playerFantasy}` },
        {
          id: "pitch-environment",
          content: environmentNote ? `The world leans on ${environmentNote}.` : "",
          optional: true,
          trimPriority: 1,
        },
      ],
    },
  ], 32)

  return pitchPrompt.messages[0]?.content.replace(/\s+/g, " ").trim()
    ?? `A ${mode} ${input.dimension.toUpperCase()} ${input.genre.replace(/_/g, " ")} experience built around ${input.mapArchetype.toLowerCase()}.`
}

export function planGenerationMechanics(input: {
  prompt: string
  genre: Genre
  dimension: GameDimension
  promptSignals: string[]
  resolvedFeatures: string[]
  mapArchetype: string
  environmentThemes: string[]
}): GenerationMechanicsPlan {
  const playerFantasy = inferPlayerFantasy(input.genre, input.promptSignals, input.prompt)
  const sessionFantasy = inferSessionFantasy(input.genre, input.promptSignals, input.prompt)
  const interactionModel = inferInteractionModel(input.genre, input.promptSignals, input.resolvedFeatures)
  const contentPillars = inferContentPillars(input.genre, input.prompt, input.promptSignals, input.resolvedFeatures)
  const progressionArcs = inferProgressionArcs(input.genre, input.promptSignals, input.resolvedFeatures)
  const uiSurfaces = inferUiSurfaces(input.genre, input.promptSignals, input.resolvedFeatures)
  const systemPriorities = inferSystemPriorities(input.genre, input.dimension, input.promptSignals, input.resolvedFeatures)
  const gameplayLoop = GAMEPLAY_LOOP_LIBRARY[input.genre]

  return {
    playerFantasy,
    sessionFantasy,
    interactionModel,
    contentPillars,
    progressionArcs,
    uiSurfaces,
    systemPriorities,
    generatedPitch: buildGeneratedPitch({
      genre: input.genre,
      dimension: input.dimension,
      promptSignals: input.promptSignals,
      mapArchetype: input.mapArchetype,
      playerFantasy,
      environmentThemes: input.environmentThemes,
    }),
    gameplayLoopSummary: gameplayLoop.summary,
    coreLoop: gameplayLoop.core,
    secondaryLoop: gameplayLoop.secondary,
    progressionLoop: gameplayLoop.progression,
    failStates: gameplayLoop.failStates,
    levelSequence: LEVEL_FLOW_LIBRARY[input.genre],
  }
}
