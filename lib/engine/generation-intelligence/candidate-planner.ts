import type {
  GameDimension,
  GenerationCandidateManifest,
  GenerationCandidatePlan,
  GenerationKnowledgeCoverage,
  GenerationCandidateScoreBreakdown,
  GenerationReferenceExample,
  GenerationRuntimeArchetype,
  Genre,
} from "@/lib/engine/types"
import { titleCase, unique } from "./shared"

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function buildScore(input: {
  fidelity: number
  coherence: number
  novelty: number
  scope: number
  runtimeFit: number
}): GenerationCandidateScoreBreakdown {
  const fidelity = clampScore(input.fidelity)
  const coherence = clampScore(input.coherence)
  const novelty = clampScore(input.novelty)
  const scope = clampScore(input.scope)
  const runtimeFit = clampScore(input.runtimeFit)
  const total = Number(((fidelity * 0.3) + (coherence * 0.2) + (novelty * 0.2) + (scope * 0.15) + (runtimeFit * 0.15)).toFixed(1))

  return {
    fidelity,
    coherence,
    novelty,
    scope,
    runtimeFit,
    total,
  }
}

function clampAdjustment(value: number) {
  return Math.max(-12, Math.min(12, Math.round(value)))
}

function buildKnowledgeAdjustment(input: {
  coverage?: GenerationKnowledgeCoverage
  variant: "locked" | "systems" | "world" | "narrative"
}): {
  fidelity: number
  coherence: number
  novelty: number
  scope: number
  runtimeFit: number
  fit: GenerationCandidateManifest["knowledgeFit"]
  notes: string[]
} {
  const coverage = input.coverage
  if (!coverage) {
    return {
      fidelity: 0,
      coherence: 0,
      novelty: 0,
      scope: 0,
      runtimeFit: 0,
      fit: "balanced" as const,
      notes: ["No explicit knowledge coverage was available, so candidate ranking stayed heuristic-first."],
    }
  }

  const highSignalCount = coverage.relevantSignals.filter((signal) => signal.relevance === "high").length
  const engineSignalCount = coverage.relevantSignals.filter((signal) => signal.category === "engine_pattern" || signal.category === "research_domain").length
  const compilePressure = coverage.compileGuidance.length
  const gapPressure = coverage.gapWarnings.reduce((sum, gap) => (
    sum + (gap.severity === "high" ? 3 : gap.severity === "medium" ? 2 : 1)
  ), 0)
  const worldBias = coverage.relevantSignals.some((signal) => /rendering|graphics|procedural|asset/i.test(signal.label))
  const systemsBias = coverage.relevantSignals.some((signal) => /engine architecture|network|ui|ai|code generation/i.test(signal.label))

  let fidelity = 0
  let coherence = 0
  let novelty = 0
  let scope = 0
  let runtimeFit = 0
  const notes: string[] = []

  if (input.variant === "locked") {
    fidelity += highSignalCount + Math.ceil(gapPressure / 2)
    coherence += systemsBias ? 3 : 1
    scope += compilePressure > 0 ? 4 : 1
    runtimeFit += 3
    notes.push("Locked candidate gains trust when knowledge gaps suggest preserving a safer, more verifiable slice.")
  }

  if (input.variant === "systems") {
    coherence += systemsBias ? 4 : 1
    runtimeFit += systemsBias ? 3 : 1
    fidelity += highSignalCount > 2 ? 2 : 0
    scope -= gapPressure >= 5 ? 2 : 0
    notes.push("Systems-forward candidate benefits when engine architecture and subsystem signals are well covered.")
  }

  if (input.variant === "world") {
    novelty += worldBias ? 4 : 1
    coherence += worldBias ? 2 : 0
    scope -= gapPressure >= 5 ? 4 : 1
    fidelity -= compilePressure > 2 ? 2 : 0
    notes.push("World-forward candidate is penalized when knowledge gaps or compile pressure make atmospheric breadth riskier.")
  }

  if (input.variant === "narrative") {
    fidelity += coverage.verificationFocus.some((entry) => /ai|ui|dialogue|social/i.test(entry)) ? 3 : 0
    coherence += coverage.recommendedContext.some((entry) => /ai|ui|dialogue|social/i.test(entry)) ? 3 : 0
    novelty += 2
    notes.push("Narrative/social candidate benefits when AI, UI, and interaction domains are already covered.")
  }

  const fitScore = (highSignalCount * 2) + engineSignalCount - gapPressure + fidelity + coherence + runtimeFit
  const fit = fitScore >= 8 ? "strong" : fitScore >= 2 ? "balanced" : "risky"

  return {
    fidelity: clampAdjustment(fidelity),
    coherence: clampAdjustment(coherence),
    novelty: clampAdjustment(novelty),
    scope: clampAdjustment(scope),
    runtimeFit: clampAdjustment(runtimeFit),
    fit,
    notes: unique([
      ...notes,
      ...coverage.promptGuidance.slice(0, 2),
      ...coverage.gapWarnings.slice(0, 2).map((gap) => gap.action),
    ]).slice(0, 4),
  }
}

function buildCandidatePremise(input: {
  title: string
  promptSummary: string
  mapArchetype: string
  runtimeArchetype: GenerationRuntimeArchetype
  angle: string
}) {
  return `${input.title} keeps ${input.promptSummary.toLowerCase()} anchored to the ${input.mapArchetype.toLowerCase()} structure and ${input.runtimeArchetype.replace(/_/g, " ")} runtime while ${input.angle}.`
}

function buildRiskFlags(input: {
  negativeConstraints: string[]
  promptSignals: string[]
  resolvedFeatures: string[]
  variant: "locked" | "systems" | "world"
}) {
  const risks: string[] = []

  if (input.negativeConstraints.some((constraint) => /combat/i.test(constraint)) && input.resolvedFeatures.includes("combat")) {
    risks.push("Combat pressure must stay subordinate to the prompt constraints.")
  }
  if (input.promptSignals.includes("novelty-high") && input.variant === "locked") {
    risks.push("A safer candidate can undershoot the novelty target if not re-ranked against the experimental option.")
  }
  if (input.promptSignals.includes("hybridized") && input.variant === "systems") {
    risks.push("System layering can drift away from the core fantasy if genre signals are not re-checked.")
  }
  if (
    (input.promptSignals.includes("heist-heavy") || input.promptSignals.includes("immersive-sim"))
    && input.variant === "locked"
  ) {
    risks.push("A locked candidate can miss the layered solution space expected from immersive or heist prompts.")
  }
  if (input.promptSignals.includes("investigation-heavy") && input.variant === "world") {
    risks.push("World-forward candidates can bury clue state under atmosphere unless evidence routing stays explicit.")
  }
  if (
    (input.promptSignals.includes("archaeology-heavy") || input.promptSignals.includes("restoration-heavy"))
    && input.variant === "world"
  ) {
    risks.push("Atmosphere can overpower the restoration workflow unless condition-state loops remain playable.")
  }
  if (input.variant === "world") {
    risks.push("World-forward candidates can overspend scope on space identity unless asset reuse stays disciplined.")
  }

  return risks
}

export function planGenerationCandidates(input: {
  genre: Genre
  dimension: GameDimension
  runtimeArchetype: GenerationRuntimeArchetype
  promptSummary: string
  generatedPitch: string
  mapArchetype: string
  promptSignals: string[]
  resolvedFeatures: string[]
  negativeConstraints: string[]
  scopeScale: "focused" | "expanded" | "limitless"
  references: GenerationReferenceExample[]
  knowledgeCoverage?: GenerationKnowledgeCoverage
}): GenerationCandidatePlan {
  const referenceStrengths = input.references.flatMap((reference) => reference.mechanicsToBorrow)
  const safeFeatureSlice = unique(input.resolvedFeatures.slice(0, 6).map((feature) => titleCase(feature)))
  const noveltyBias = input.promptSignals.includes("novelty-high") ? 7 : 0
  const hybridBias = input.promptSignals.includes("hybridized") ? 5 : 0
  const peacefulBias = input.promptSignals.includes("peaceful") ? 4 : 0
  const tightScopeBias = input.scopeScale === "focused" ? 6 : input.scopeScale === "expanded" ? 0 : -8
  const narrativePressure =
    input.promptSignals.some((signal) => ["story-heavy", "social-heavy", "politics-heavy", "investigation-heavy"].includes(signal))
  const systemicPressure =
    input.promptSignals.some((signal) => ["simulation-heavy", "heist-heavy", "immersive-sim", "archaeology-heavy", "restoration-heavy", "extraction-heavy"].includes(signal))

  const candidates: GenerationCandidateManifest[] = [
    (() => {
      const knowledge = buildKnowledgeAdjustment({
        coverage: input.knowledgeCoverage,
        variant: "locked",
      })
      return {
      id: "candidate_locked_core",
      title: "Locked Core Candidate",
      premise: buildCandidatePremise({
        title: "Locked Core Candidate",
        promptSummary: input.promptSummary,
        mapArchetype: input.mapArchetype,
        runtimeArchetype: input.runtimeArchetype,
        angle: "prioritizing prompt fidelity before optional breadth",
      }),
      runtimeArchetype: input.runtimeArchetype,
      differentiators: unique([
        "Locks first-session verbs before broadening content.",
        ...referenceStrengths.slice(0, 2),
        input.dimension === "3d" ? "Preserves 3D camera and traversal fidelity." : "Preserves readable screen-space control.",
      ]),
      retainedFeatures: safeFeatureSlice,
      riskFlags: buildRiskFlags({
        negativeConstraints: input.negativeConstraints,
        promptSignals: input.promptSignals,
        resolvedFeatures: input.resolvedFeatures,
        variant: "locked",
      }),
      knowledgeFit: knowledge.fit,
      knowledgeNotes: knowledge.notes,
      score: buildScore({
        fidelity: 92 + peacefulBias + knowledge.fidelity,
        coherence: 90 + knowledge.coherence,
        novelty: 72 + noveltyBias + knowledge.novelty,
        scope: 88 + tightScopeBias + knowledge.scope,
        runtimeFit: 92 + knowledge.runtimeFit,
      }),
      }
    })(),
    (() => {
      const knowledge = buildKnowledgeAdjustment({
        coverage: input.knowledgeCoverage,
        variant: "systems",
      })
      return {
      id: "candidate_systems_forward",
      title: "Systems Forward Candidate",
      premise: buildCandidatePremise({
        title: "Systems Forward Candidate",
        promptSummary: input.promptSummary,
        mapArchetype: input.mapArchetype,
        runtimeArchetype: input.runtimeArchetype,
        angle: "deepening the interlock between progression, economy, and specialist systems",
      }),
      runtimeArchetype: input.runtimeArchetype,
      differentiators: unique([
        "Pushes deeper interplay between the top mechanics instead of widening content packs.",
        ...referenceStrengths.slice(1, 3),
        `Turns ${titleCase(input.genre)} identity into explicit mid-session decision pressure.`,
      ]),
      retainedFeatures: unique([
        ...safeFeatureSlice,
        ...input.resolvedFeatures.slice(0, 3).map((feature) => titleCase(feature)),
      ]).slice(0, 7),
      riskFlags: buildRiskFlags({
        negativeConstraints: input.negativeConstraints,
        promptSignals: input.promptSignals,
        resolvedFeatures: input.resolvedFeatures,
        variant: "systems",
      }),
      knowledgeFit: knowledge.fit,
      knowledgeNotes: knowledge.notes,
      score: buildScore({
        fidelity: 86 + knowledge.fidelity,
        coherence: 88 + knowledge.coherence,
        novelty: 79 + noveltyBias + hybridBias + knowledge.novelty,
        scope: 82 + tightScopeBias + knowledge.scope,
        runtimeFit: 89 + knowledge.runtimeFit,
      }),
      }
    })(),
    (() => {
      const knowledge = buildKnowledgeAdjustment({
        coverage: input.knowledgeCoverage,
        variant: "world",
      })
      return {
      id: "candidate_world_forward",
      title: "World Forward Candidate",
      premise: buildCandidatePremise({
        title: "World Forward Candidate",
        promptSummary: input.promptSummary,
        mapArchetype: input.mapArchetype,
        runtimeArchetype: input.runtimeArchetype,
        angle: "using landmark identity, layout clarity, and stronger environmental storytelling to differentiate the experience",
      }),
      runtimeArchetype: input.runtimeArchetype,
      differentiators: unique([
        "Leans harder on map identity, route teaching, and environmental state shifts.",
        ...input.references.flatMap((reference) => reference.antiPatterns).slice(0, 2),
        `Uses ${input.mapArchetype.toLowerCase()} as a signature structure instead of a backdrop.`,
      ]),
      retainedFeatures: unique([
        ...safeFeatureSlice,
        ...input.resolvedFeatures.filter((feature) => ["world_gen", "ui", "dialogue", "questing"].includes(feature)).map((feature) => titleCase(feature)),
      ]).slice(0, 7),
      riskFlags: buildRiskFlags({
        negativeConstraints: input.negativeConstraints,
        promptSignals: input.promptSignals,
        resolvedFeatures: input.resolvedFeatures,
        variant: "world",
      }),
      knowledgeFit: knowledge.fit,
      knowledgeNotes: knowledge.notes,
      score: buildScore({
        fidelity: 84 + knowledge.fidelity,
        coherence: 87 + knowledge.coherence,
        novelty: 82 + noveltyBias + knowledge.novelty,
        scope: 80 + tightScopeBias + knowledge.scope,
        runtimeFit: 86 + knowledge.runtimeFit,
      }),
      }
    })(),
    ...(
      narrativePressure
        ? [(() => {
            const knowledge = buildKnowledgeAdjustment({
              coverage: input.knowledgeCoverage,
              variant: "narrative",
            })
            return {
            id: "candidate_narrative_social",
            title: "Narrative and Social Candidate",
            premise: buildCandidatePremise({
              title: "Narrative and Social Candidate",
              promptSummary: input.promptSummary,
              mapArchetype: input.mapArchetype,
              runtimeArchetype: input.runtimeArchetype,
              angle: "strengthening faction pressure, character reactions, case continuity, and social consequences without breaking the core loop",
            }),
            runtimeArchetype: input.runtimeArchetype,
            differentiators: unique([
              "Elevates clue chains, faction reactions, and social consequence into first-class gameplay pressure.",
              ...referenceStrengths.slice(0, 2),
              `Turns ${titleCase(input.genre)} progression into explicit relationship, leverage, or reveal beats.`,
            ]),
            retainedFeatures: unique([
              ...safeFeatureSlice,
              ...input.resolvedFeatures.filter((feature) => ["dialogue", "questing", "faction_reputation", "diplomacy", "ai_npc", "ui"].includes(feature)).map((feature) => titleCase(feature)),
            ]).slice(0, 7),
            riskFlags: buildRiskFlags({
              negativeConstraints: input.negativeConstraints,
              promptSignals: input.promptSignals,
              resolvedFeatures: input.resolvedFeatures,
              variant: "systems",
            }),
            knowledgeFit: knowledge.fit,
            knowledgeNotes: knowledge.notes,
            score: buildScore({
              fidelity: 88 + peacefulBias + knowledge.fidelity,
              coherence: 87 + knowledge.coherence,
              novelty: 80 + noveltyBias + hybridBias + knowledge.novelty,
              scope: 83 + tightScopeBias + knowledge.scope,
              runtimeFit: 85 + knowledge.runtimeFit,
            }),
            }
          })()] satisfies GenerationCandidateManifest[]
        : []
    ),
    ...(
      systemicPressure
        ? [(() => {
            const knowledge = buildKnowledgeAdjustment({
              coverage: input.knowledgeCoverage,
              variant: "world",
            })
            return {
            id: "candidate_systemic_space",
            title: "Systemic Space Candidate",
            premise: buildCandidatePremise({
              title: "Systemic Space Candidate",
              promptSummary: input.promptSummary,
              mapArchetype: input.mapArchetype,
              runtimeArchetype: input.runtimeArchetype,
              angle: "focusing on layered verbs, reusable systemic spaces, and stronger cause-and-effect between the player's choices and the world",
            }),
            runtimeArchetype: input.runtimeArchetype,
            differentiators: unique([
              "Builds deeper interaction between spaces, state changes, and specialist verbs before widening content breadth.",
              ...referenceStrengths.slice(1, 3),
              `Treats ${input.mapArchetype.toLowerCase()} as a living problem space instead of a themed wrapper.`,
            ]),
            retainedFeatures: unique([
              ...safeFeatureSlice,
              ...input.resolvedFeatures.filter((feature) => ["world_gen", "stealth", "physics_sandbox", "inventory", "construction_mode", "colony_management"].includes(feature)).map((feature) => titleCase(feature)),
            ]).slice(0, 7),
            riskFlags: buildRiskFlags({
              negativeConstraints: input.negativeConstraints,
              promptSignals: input.promptSignals,
              resolvedFeatures: input.resolvedFeatures,
              variant: "world",
            }),
            knowledgeFit: knowledge.fit,
            knowledgeNotes: knowledge.notes,
            score: buildScore({
              fidelity: 87 + knowledge.fidelity,
              coherence: 89 + knowledge.coherence,
              novelty: 84 + noveltyBias + hybridBias + knowledge.novelty,
              scope: 81 + tightScopeBias + knowledge.scope,
              runtimeFit: 88 + knowledge.runtimeFit,
            }),
            }
          })()] satisfies GenerationCandidateManifest[]
        : []
    ),
  ]

  const sortedCandidates = [...candidates].sort((left, right) => right.score.total - left.score.total)
  const experimentalCandidate = sortedCandidates.find((candidate) => candidate.id === "candidate_world_forward")
  const lockedCore = sortedCandidates.find((candidate) => candidate.id === "candidate_locked_core") ?? sortedCandidates[0]
  const chosenCandidate =
    input.promptSignals.includes("novelty-high") &&
    experimentalCandidate &&
    lockedCore &&
    experimentalCandidate.score.total >= lockedCore.score.total - 3
      ? experimentalCandidate
      : sortedCandidates[0]

  return {
    selectionStrategy: "Generate bounded plan candidates, score them for fidelity/coherence/novelty/scope/runtime fit, then re-rank them with knowledge-coverage pressure so weakly covered domains do not outrun safer prompt-faithful options.",
    decisionSummary: `${chosenCandidate.title} won because it kept ${titleCase(input.genre)} intent intact while outperforming the other candidates on the weighted ranking for this ${input.dimension.toUpperCase()} brief${input.knowledgeCoverage ? ` and matched the strongest covered engine/runtime knowledge with a ${chosenCandidate.knowledgeFit} knowledge fit.` : "."}`,
    chosenCandidateId: chosenCandidate.id,
    rerankTriggers: [
      "If evals flag genre drift, re-rank with fidelity weighted above novelty.",
      "If runtime verbs disappear from the first session, re-rank with runtime fit as the top criterion.",
      "If prompt constraints are violated, discard the offending candidate before any score comparison.",
      "If knowledge coverage reports high-severity gaps in the chosen candidate's emphasis, re-rank toward the safer covered option.",
    ],
    candidates: sortedCandidates,
  }
}
