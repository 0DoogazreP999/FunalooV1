import type {
  GameDimension,
  GenerationCandidatePlan,
  GenerationDiversityPlan,
  GenerationReferenceExample,
  GenerationRuntimeArchetype,
  Genre,
} from "@/lib/engine/types"
import { titleCase, unique } from "./shared"

function buildOverusedPatternRisks(input: {
  genre: Genre
  dimension: GameDimension
  runtimeArchetype: GenerationRuntimeArchetype
  promptSignals: string[]
  resolvedFeatures: string[]
}) {
  const risks: string[] = [
    "Universal fallback loop that ignores the prompt’s first-session verbs.",
    `Overused ${input.runtimeArchetype.replace(/_/g, " ")} shell with only cosmetic genre changes.`,
  ]

  if (input.genre === "fps" || input.promptSignals.includes("combat-heavy")) {
    risks.push("Flat corridor or arena shooter layouts replacing the requested structure.")
  }
  if (input.promptSignals.includes("peaceful")) {
    risks.push("Combat drift sneaking into a non-combat or low-conflict prompt.")
  }
  if (input.promptSignals.includes("social-deduction")) {
    risks.push("Task-and-vote loops losing social clarity and turning into ambient wandering.")
  }
  if (input.promptSignals.includes("investigation-heavy")) {
    risks.push("Mystery prompts drifting into vague exploration without evidence chains, suspect pressure, or reveal cadence.")
  }
  if (input.promptSignals.includes("heist-heavy") || input.promptSignals.includes("immersive-sim")) {
    risks.push("Heist or immersive prompts collapsing into one valid route instead of preserving layered solutions.")
  }
  if (input.promptSignals.includes("archaeology-heavy") || input.promptSignals.includes("restoration-heavy")) {
    risks.push("Restoration and archaeology prompts turning into sightseeing without condition-state or hands-on recovery loops.")
  }
  if (input.promptSignals.includes("politics-heavy")) {
    risks.push("Political prompts reducing to flavor text instead of visible faction leverage and policy consequences.")
  }
  if (input.resolvedFeatures.includes("farming") || input.genre === "simulation") {
    risks.push("Routine-heavy sims becoming decorative spaces with shallow state changes.")
  }
  if (input.resolvedFeatures.includes("crafting")) {
    risks.push("Crafting systems expanding by recipe count instead of changing the core loop.")
  }
  if (input.dimension === "3d") {
    risks.push("3D prompts degrading into flat 2D-feeling interaction shells without spatial payoff.")
  }

  return unique(risks)
}

export function planGenerationDiversity(input: {
  promptSummary: string
  genre: Genre
  dimension: GameDimension
  runtimeArchetype: GenerationRuntimeArchetype
  mapArchetype: string
  promptSignals: string[]
  resolvedFeatures: string[]
  negativeConstraints: string[]
  references: GenerationReferenceExample[]
  candidatePlan: GenerationCandidatePlan
}): GenerationDiversityPlan {
  const chosenCandidate = input.candidatePlan.candidates.find((candidate) => candidate.id === input.candidatePlan.chosenCandidateId)
  const featureKey = [...input.resolvedFeatures].sort().slice(0, 6).join("+") || "core"
  const diversityMemoryKey = [
    input.genre,
    input.dimension,
    input.runtimeArchetype,
    input.mapArchetype.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    featureKey.toLowerCase(),
  ].join(":")

  const noveltyPressure = unique([
    input.promptSignals.includes("novelty-high")
      ? "Permit the winning candidate to differ structurally from recent successful generations if fidelity remains high."
      : "Favor prompt fidelity first, then use novelty as the tie-breaker.",
    input.promptSignals.includes("hybridized")
      ? "Protect hybrid mechanics that are explicitly requested instead of snapping back to one primary genre."
      : "Prefer genre clarity when the prompt does not ask for hybrids.",
    input.promptSignals.includes("peaceful")
      ? "Preserve low-conflict or no-combat identity even if combat-heavy templates are common."
      : "Do not remove pressure systems unless the prompt asks for a softer tone.",
    chosenCandidate
      ? `Keep ${chosenCandidate.title.toLowerCase()} distinct by preserving: ${chosenCandidate.differentiators.slice(0, 2).join("; ")}.`
      : "Keep the winning candidate structurally distinct from the default template bundle.",
  ])

  const antiCollapseChecks = unique([
    `Lock the ${titleCase(input.genre)} fantasy before expanding optional systems.`,
    `Keep ${input.dimension.toUpperCase()} presentation honest to the requested camera and interaction space.`,
    `Use ${input.mapArchetype.toLowerCase()} as a real structural identity, not just a flavor label.`,
    ...input.negativeConstraints.map((constraint) => `Constraint lock: ${constraint}`),
    ...input.references.flatMap((reference) => reference.antiPatterns).slice(0, 4),
  ])

  return {
    rankingStrategy: "Retrieve genre-fit references, score multiple candidates, then down-rank patterns that match recent memory keys or known collapse modes before selecting the final manifest.",
    retrievalExamples: input.references,
    diversityMemoryKey,
    overusedPatternRisks: buildOverusedPatternRisks({
      genre: input.genre,
      dimension: input.dimension,
      runtimeArchetype: input.runtimeArchetype,
      promptSignals: input.promptSignals,
      resolvedFeatures: input.resolvedFeatures,
    }),
    noveltyPressure,
    antiCollapseChecks,
  }
}
