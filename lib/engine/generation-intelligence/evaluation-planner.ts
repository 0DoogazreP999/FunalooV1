import type {
  GameDimension,
  GenerationCandidatePlan,
  GenerationDiversityPlan,
  GenerationEvaluationPlan,
  GenerationEvalDatasetBucket,
  GenerationEvalRubric,
  GenerationRuntimeArchetype,
  Genre,
} from "@/lib/engine/types"
import { unique } from "./shared"

const DATASET_BUCKET_LIBRARY: Array<GenerationEvalDatasetBucket & {
  genres?: Genre[]
  dimensions?: GameDimension[]
  signals?: string[]
  runtimeArchetypes?: GenerationRuntimeArchetype[]
}> = [
  {
    id: "straightforward_genre",
    label: "Straightforward Genre Prompts",
    samplePrompt: "A clean genre-forward prompt with one obvious fantasy and no conflicting directives.",
    checks: ["Genre fit remains obvious in the first playable slice.", "The runtime contract matches the prompt language."],
  },
  {
    id: "hybrid_genre",
    label: "Hybrid Genre Prompts",
    samplePrompt: "A tactics deckbuilder with city politics and social pressure.",
    checks: ["Hybrid systems remain present instead of collapsing to one genre.", "The chosen candidate explains how the blend stays coherent."],
    signals: ["hybridized"],
  },
  {
    id: "no_combat",
    label: "No-Combat Prompts",
    samplePrompt: "A cozy archaeology sim with no combat and asynchronous co-op.",
    checks: ["Combat is absent or subordinate to the prompt.", "The first session still has meaningful verbs without violence."],
    signals: ["peaceful"],
  },
  {
    id: "simulation_heavy",
    label: "Simulation-Heavy Prompts",
    samplePrompt: "A farming, trading, and village scheduling sim with seasonal pressure.",
    checks: ["Routine/state changes are readable.", "The plan includes system literacy and cause-and-effect feedback."],
    genres: ["simulation"],
  },
  {
    id: "social_narrative",
    label: "Social And Narrative Prompts",
    samplePrompt: "A social deduction game with card drafting, meetings, and alliance bargaining.",
    checks: ["Social state is visible.", "Dialogue, voting, or narrative pressure is not reduced to flavor text."],
    signals: ["social-deduction", "narrative-heavy"],
  },
  {
    id: "unusual_camera",
    label: "Unusual Camera Prompts",
    samplePrompt: "A board-command tactics game with an isometric macro camera and readable overlays.",
    checks: ["Camera choice is preserved.", "The spatial structure matches the requested interaction model."],
    dimensions: ["2d", "hybrid"],
  },
  {
    id: "family_friendly",
    label: "Family-Friendly Prompts",
    samplePrompt: "A family-friendly sports party game with clear rules and no gore.",
    checks: ["Tone stays safe and readable.", "Complexity remains approachable without flattening the design."],
    signals: ["family-friendly"],
  },
  {
    id: "short_input",
    label: "Short Prompt Inputs",
    samplePrompt: "A strange co-op prototype.",
    checks: ["Intent inference remains conservative.", "The candidate plan preserves ambiguity instead of inventing the wrong fantasy."],
  },
  {
    id: "long_input",
    label: "Long Prompt Inputs",
    samplePrompt: "A highly detailed creator brief with explicit mechanics, pacing, constraints, and tone.",
    checks: ["Priority mechanics survive trimming.", "Breadth reduction happens before genre drift."],
  },
  {
    id: "contradictory_input",
    label: "Contradictory Prompts",
    samplePrompt: "A no-combat stealth game that also asks for constant firefights.",
    checks: ["Conflicts are surfaced and resolved explicitly.", "The system chooses one interpretation rather than silently averaging them."],
    signals: ["contradictory"],
  },
  {
    id: "runtime_fidelity",
    label: "Runtime Fidelity",
    samplePrompt: "A prompt that depends on a very specific first-session verb set and runtime contract.",
    checks: ["First-session verbs appear in the runtime slice.", "The archetype does not collapse during implementation."],
    runtimeArchetypes: ["combat_mission", "survival_horde", "survival_expedition_3d", "journey_route", "homestead_life", "strategy_command", "action_operation_3d"],
  },
]

const RUBRIC_LIBRARY: GenerationEvalRubric[] = [
  { id: "intent_fidelity", label: "Intent Fidelity", weight: 0.24, passThreshold: 82, guidance: "Check whether the chosen candidate still reflects the prompt’s primary fantasy, constraints, and requested verbs." },
  { id: "genre_correctness", label: "Genre And Subgenre Correctness", weight: 0.16, passThreshold: 78, guidance: "Verify that the plan still reads like the requested genre or blend instead of a nearby but wrong archetype." },
  { id: "mechanical_differentiation", label: "Mechanical Differentiation", weight: 0.16, passThreshold: 76, guidance: "Ensure the design does not only rename common systems, but actually changes the loop structure." },
  { id: "internal_consistency", label: "Internal Consistency", weight: 0.16, passThreshold: 80, guidance: "Check that runtime, mechanics, layout, assets, and pacing reinforce each other." },
  { id: "scope_realism", label: "Scope Realism", weight: 0.14, passThreshold: 74, guidance: "Confirm that the adaptive generation budget keeps the first playable slice achievable without sacrificing the core fantasy." },
  { id: "runtime_fidelity", label: "Runtime Fidelity", weight: 0.14, passThreshold: 80, guidance: "Confirm that the runtime contract and first-session verbs survive synthesis instead of collapsing to the generic fallback." },
]

export function planGenerationEvaluation(input: {
  genre: Genre
  dimension: GameDimension
  runtimeArchetype: GenerationRuntimeArchetype
  prompt: string
  promptSignals: string[]
  candidatePlan: GenerationCandidatePlan
  diversityPlan: GenerationDiversityPlan
}): GenerationEvaluationPlan {
  const promptLengthBucket = input.prompt.trim().length > 240 ? "long_input" : "short_input"
  const datasetBuckets = DATASET_BUCKET_LIBRARY.filter((bucket) => {
    if (bucket.id === promptLengthBucket) return true
    if (bucket.id === "straightforward_genre" && !input.promptSignals.includes("hybridized")) return true
    if (bucket.genres?.includes(input.genre)) return true
    if (bucket.dimensions?.includes(input.dimension)) return true
    if (bucket.signals?.some((signal) => input.promptSignals.includes(signal))) return true
    if (bucket.runtimeArchetypes?.includes(input.runtimeArchetype)) return true
    return false
  }).slice(0, 5)

  const chosenCandidate = input.candidatePlan.candidates.find((candidate) => candidate.id === input.candidatePlan.chosenCandidateId)
  const acceptanceRules = unique([
    `Chosen candidate score must remain at or above ${chosenCandidate ? Math.floor(chosenCandidate.score.total) : 80}.`,
    "Dimension choice and camera style must stay aligned through the first playable slice.",
    "Reduce breadth before removing required mechanics or violating prompt constraints.",
    ...input.diversityPlan.antiCollapseChecks.slice(0, 3),
  ])

  return {
    evaluationStrategy: "Run a bounded eval set that mixes prompt-shape buckets with runtime-fidelity checks, then use rubric-weighted grading to decide whether to keep, repair, or re-rank the winning candidate.",
    graderModel: "Provider-native structured grader when available, with local rubric fallback for deterministic offline checks.",
    datasetBuckets,
    rubrics: RUBRIC_LIBRARY,
    acceptanceRules,
    repairHooks: unique([
      "If intent fidelity fails, reopen the prompt council and increase intent_architect authority.",
      "If runtime fidelity fails, raise runtime_guard objections and rerank candidates by runtime fit.",
      "If novelty is low across successful outputs, raise diversity penalties for repeated memory keys.",
      ...input.candidatePlan.rerankTriggers,
    ]),
  }
}
