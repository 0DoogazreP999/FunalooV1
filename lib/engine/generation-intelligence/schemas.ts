import { z } from "zod"

const generationGenreSchema = z.enum([
  "battle_royale",
  "fps",
  "rpg",
  "mmo",
  "racing",
  "platformer",
  "sandbox",
  "adventure",
  "simulation",
  "strategy",
  "survival",
  "horror",
])

export const generationPreparationSchema = z.object({
  enhancedUserPrompt: z.string().min(1).max(1800),
  enhancedPrompt: z.string().min(1).max(2400),
  resolvedGenre: generationGenreSchema.optional(),
  resolvedMultiplayer: z.boolean().optional(),
  resolvedMaxPlayers: z.number().int().min(1).max(64).optional(),
  requiredFeatures: z.array(z.string()).max(8).default([]),
  disallowedFeatures: z.array(z.string()).max(8).default([]),
  intentNotes: z.array(z.string().min(1).max(120)).max(6).default([]),
  compilePriorities: z.array(z.string().min(1).max(120)).max(6).default([]),
})

export type GenerationPreparation = z.infer<typeof generationPreparationSchema>

const generationInferenceDiffSchema = z.object({
  field: z.string().min(1).max(80),
  explicitValue: z.string().max(160).default(""),
  inferredValue: z.string().min(1).max(160),
  rationale: z.string().min(1).max(200),
  applied: z.boolean().default(true),
})

const generationMissingCriteriaSchema = z.object({
  field: z.string().min(1).max(80),
  severity: z.enum(["low", "medium", "high"]).default("medium"),
  reason: z.string().min(1).max(200),
  suggestedFill: z.string().min(1).max(200),
})

export const generationIntentGapSchema = z.object({
  summary: z.string().min(1).max(240),
  missingCriteria: z.array(generationMissingCriteriaSchema).max(8).default([]),
  inferenceDiff: z.array(generationInferenceDiffSchema).max(8).default([]),
  antiCollapseRules: z.array(z.string().min(1).max(160)).max(8).default([]),
  engineExpectations: z.array(z.string().min(1).max(160)).max(6).default([]),
  compilePriorities: z.array(z.string().min(1).max(160)).max(8).default([]),
})

export type GenerationIntentGap = z.infer<typeof generationIntentGapSchema>

export const generationAdviceSchema = z.object({
  resolvedGenre: generationGenreSchema.optional(),
  resolvedDimension: z.enum(["2d", "3d", "hybrid"]).optional(),
  resolvedMultiplayer: z.boolean().optional(),
  resolvedMaxPlayers: z.number().int().min(1).max(64).optional(),
  resolvedScopeScale: z.enum(["focused", "expanded", "limitless"]).optional(),
  runtimeArchetype: z.enum([
    "combat_mission",
    "survival_horde",
    "survival_expedition_3d",
    "journey_route",
    "homestead_life",
    "strategy_command",
    "action_operation_3d",
  ]).optional(),
  cameraStyle: z.string().min(1).max(140).optional(),
  requiredFeatures: z.array(z.string()).max(6).default([]),
  disallowedFeatures: z.array(z.string()).max(6).default([]),
  promptSummary: z.string().min(1).max(280),
  generatedPitch: z.string().min(1).max(320),
  genreReason: z.string().min(1).max(240),
  playerFantasy: z.string().min(1).max(240),
  sessionFantasy: z.string().min(1).max(240),
  interactionModel: z.string().min(1).max(280),
  experienceGoals: z.array(z.string().min(1).max(120)).min(3).max(6),
  contentPillars: z.array(z.string().min(1).max(120)).min(3).max(6),
  progressionArcs: z.array(z.string().min(1).max(120)).min(2).max(5),
  environmentThemes: z.array(z.string().min(1).max(120)).min(3).max(6),
  uiSurfaces: z.array(z.string().min(1).max(120)).min(2).max(6),
  systemPriorities: z.array(z.string().min(1).max(120)).min(3).max(6),
  negativeConstraints: z.array(z.string().min(1).max(120)).max(6).default([]),
})

export type GenerationAdvice = z.infer<typeof generationAdviceSchema>

export const generationCandidateCritiqueSchema = z.object({
  decision: z.enum(["pass", "repair", "blocked"]),
  summary: z.string().min(1).max(260),
  blockedReasons: z.array(z.string().min(1).max(160)).max(8).default([]),
  warnings: z.array(z.string().min(1).max(160)).max(8).default([]),
  missingCriteria: z.array(generationMissingCriteriaSchema).max(8).default([]),
  inferenceDiff: z.array(generationInferenceDiffSchema).max(8).default([]),
  repairInstructions: z.array(z.string().min(1).max(180)).max(8).default([]),
})

export type GenerationCandidateCritique = z.infer<typeof generationCandidateCritiqueSchema>

export const generationRepairSchema = generationAdviceSchema.extend({
  repairSummary: z.string().min(1).max(260),
})

export type GenerationRepair = z.infer<typeof generationRepairSchema>

export const generationReleaseJudgeSchema = z.object({
  decision: z.enum(["ready", "needs_review", "blocked"]),
  summary: z.string().min(1).max(260),
  blockers: z.array(z.string().min(1).max(180)).max(8).default([]),
  warnings: z.array(z.string().min(1).max(180)).max(8).default([]),
})

export type GenerationReleaseJudge = z.infer<typeof generationReleaseJudgeSchema>

export const generationGuidanceSchema = z.object({
  promptSummary: z.string().min(1).max(260),
  genreReason: z.string().min(1).max(260).optional(),
  playerFantasy: z.string().min(1).max(260).optional(),
  sessionFantasy: z.string().min(1).max(260).optional(),
  featureAdditions: z.array(z.string().min(1).max(48)).max(6).default([]),
  contentPillars: z.array(z.string().min(1).max(64)).max(6).default([]),
  environmentThemes: z.array(z.string().min(1).max(64)).max(6).default([]),
  uiSurfaces: z.array(z.string().min(1).max(64)).max(6).default([]),
  systemPriorities: z.array(z.string().min(1).max(64)).max(6).default([]),
  experienceGoals: z.array(z.string().min(1).max(64)).max(6).default([]),
  negativeConstraints: z.array(z.string().min(1).max(64)).max(6).default([]),
})

export type GenerationPromptGuidance = z.infer<typeof generationGuidanceSchema>
