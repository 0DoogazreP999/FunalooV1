export {
  buildPromptFeatureRecommendations,
  buildPromptSummary,
  extractNegativeConstraints,
  extractPromptSignals,
  inferDimension,
  inferMultiplayerDefaults,
  inferPromptDefaults,
  inferPromptDrivenDefaults,
  inferScopeScale,
  parseGenerationBrief,
  scoreGenre,
  type GenerationBriefAnalysis,
} from "@/lib/engine/generation-intelligence/brief-parser"
export {
  buildGeneratedPitch,
  inferContentPillars,
  inferInteractionModel,
  inferPlayerFantasy,
  inferProgressionArcs,
  inferSessionFantasy,
  inferSystemPriorities,
  inferUiSurfaces,
  planGenerationMechanics,
  type GenerationMechanicsPlan,
} from "@/lib/engine/generation-intelligence/mechanics-planner"
export {
  buildGenerationProfile,
  createFallbackGenerationProfile,
  enhanceGenerationBrief,
  ensureGenerationProfile,
  generateGenerationProfile,
  type EnhancedGenerationBriefResult,
  type GeneratedProfileResult,
  type GenerationPromptProviderConfig,
  type PromptEnhancedGenerationResult,
} from "@/lib/engine/generation-intelligence/manifest-synthesizer"
export {
  generationAdviceSchema,
  generationCandidateCritiqueSchema,
  generationGuidanceSchema,
  generationIntentGapSchema,
  generationReleaseJudgeSchema,
  generationRepairSchema,
  type GenerationAdvice,
  type GenerationCandidateCritique,
  type GenerationIntentGap,
  type GenerationPromptGuidance,
  type GenerationReleaseJudge,
  type GenerationRepair,
} from "@/lib/engine/generation-intelligence/schemas"
export {
  applyGenerationAdvice,
  buildSupplementalSystems,
  clampAdvisedPlayers,
  getConfiguredUserProvider,
  getConfiguredUserProviderRoster,
  planGenerationScope,
  preferAdvisedList,
  sanitizeAdvisedFeatures,
  type ConfiguredUserProvider,
  type ConfiguredUserProviderRoster,
  type GenerationScopePlan,
} from "@/lib/engine/generation-intelligence/scope-validator"
export {
  planGenerationRuntime,
  selectRuntimeArchetype,
} from "@/lib/engine/generation-intelligence/runtime-planner"
export {
  planGenerationRuntimeVersatility,
} from "@/lib/engine/generation-intelligence/runtime-versatility-planner"
export {
  buildRuntimePlaybookPlan,
  getRuntimePlaybookBeat,
  type RuntimePlaybookBeat,
  type RuntimePlaybookPhysicsPlan,
  type RuntimePlaybookPlan,
  type RuntimePlaybookTuning,
  type RuntimePlaybookUiPlan,
} from "@/lib/engine/runtime-playbook"
export {
  buildRuntimeEncounterDirector,
  buildRuntimeEncounterDirectorFromProfile,
  formatRuntimeEncounterDirectorForPrompt,
  getRuntimeEncounterCadenceWindow,
  getRuntimeEncounterBeat,
  summarizeRuntimeEncounterDirector,
  getRuntimeEncounterTickWeights,
  getRuntimeEncounterDirective,
  getRuntimeEncounterEvent,
  type RuntimeEncounterCadenceStage,
  type RuntimeEncounterCadenceWindow,
  type RuntimeEncounterDirector,
  type RuntimeEncounterEventCard,
  type RuntimeEncounterEventCategory,
  type RuntimeEncounterMix,
  type RuntimeEncounterModifierSet,
  type RuntimeEncounterObjectiveStep,
  type RuntimeEncounterPromptBridge,
  type RuntimeEncounterTickWeights,
} from "@/lib/engine/runtime-encounters"
export {
  planGenerationPipeline,
} from "@/lib/engine/generation-intelligence/pipeline-planner"
export {
  planGenerationGraphics,
} from "@/lib/engine/generation-intelligence/graphics-planner"
export {
  planGenerationEngine,
} from "@/lib/engine/generation-intelligence/engine-planner"
export {
  buildGenerationPromptCouncilPlan,
} from "@/lib/engine/generation-intelligence/prompt-council-planner"
export {
  planGenerationReferences,
} from "@/lib/engine/generation-intelligence/retrieval-planner"
export {
  planGenerationCandidates,
} from "@/lib/engine/generation-intelligence/candidate-planner"
export {
  planGenerationDiversity,
} from "@/lib/engine/generation-intelligence/diversity-planner"
export {
  planGenerationEvaluation,
} from "@/lib/engine/generation-intelligence/evaluation-planner"
export {
  buildGenerationPromptConfiguration,
  GENERATION_BRIEF_ENHANCEMENT_PROMPT,
  GENERATION_CANDIDATE_CRITIC_PROMPT,
  GENERATION_CANDIDATE_MANIFEST_PROMPT,
  GENERATION_CANDIDATE_REPAIR_PROMPT,
  GENERATION_COMPILE_FIX_PROMPT,
  GENERATION_INTENT_GAP_PROMPT,
  GENERATION_PROFILE_ADVICE_PROMPT,
  GENERATION_PROMPT_SUITE,
  GENERATION_RELEASE_JUDGE_PROMPT,
} from "@/lib/engine/generation-intelligence/prompt-catalog"
export {
  DIMENSION_DEFAULTS,
  FEATURE_HINT_LIBRARY,
  GAMEPLAY_LOOP_LIBRARY,
  GENERATION_FEATURE_LIBRARY,
  GENRE_CONTENT_PILLARS,
  GENRE_EXPERIENCE_GOALS,
  GENRE_INTERACTION_MODEL,
  GENRE_PLAYER_FANTASY,
  GENRE_PROGRESSION_ARCS,
  GENRE_SESSION_FANTASY,
  GENRE_SIGNAL_LIBRARY,
  GENRE_SYSTEM_PRIORITIES,
  GENRE_UI_SURFACES,
  HYBRID_KEYWORDS,
  LEVEL_FLOW_LIBRARY,
  MAP_LAYOUT_DATASETS,
  NEGATIVE_CONSTRAINT_RULES,
  PROMPT_SIGNAL_PATTERNS,
  SIGNAL_CONTENT_PILLARS,
  SIGNAL_ENVIRONMENT_THEMES,
  THREE_D_KEYWORDS,
  TWO_D_KEYWORDS,
  generationFeatureSet,
  takeTop,
  titleCase,
  unique,
  type GameplayLoopDataset,
  type GenreKeywordRule,
  type GenerationFeatureKey,
  type MapLayoutDataset,
  type NegativeConstraintRule,
  type PromptDrivenDefaults,
} from "@/lib/engine/generation-intelligence/shared"
export {
  matchesTemplateSelection,
  normalizeSelectedFeatures,
  resolveFeatures,
  resolveGenerationTaxonomy,
  type GenerationTaxonomyResolution,
} from "@/lib/engine/generation-intelligence/taxonomy-resolver"
export {
  inferEnvironmentThemes,
  planWorldStructure,
  selectMapDataset,
  type GenerationWorldPlan,
} from "@/lib/engine/generation-intelligence/world-planner"
export {
  planGenerationAssets,
  type GenerationAssetPlanningInput,
} from "@/lib/engine/generation-intelligence/asset-planner"
export {
  EVOLUTION_INSERT_DIVIDER,
  NEXUS_CACHE_CORPUS,
  buildGenerationEvolutionContext,
  formatEvolutionContextForPrompt,
  summarizeEvolutionContext,
  summarizeProjectHistoryForEvolution,
} from "@/lib/engine/evolution-memory"
export {
  buildGenerationKnowledgeCoverage,
  buildGenerationKnowledgeRiskSummary,
  formatKnowledgeCoverageForPrompt,
  formatKnowledgeRiskForPrompt,
} from "@/lib/engine/knowledge-coverage"
export {
  buildGenerationProviderDiagnosticsSummary,
} from "@/lib/engine/provider-diagnostics"
export {
  buildGenerationUsageIntelligence,
  formatUsageIntelligenceForPrompt,
} from "@/lib/engine/usage-intelligence"
export {
  buildProjectGenerationExecution,
  ensureProjectExecution,
  runProjectExecutionPipeline,
} from "@/lib/engine/generation-execution"
export {
  assignAgentToSystem,
  buildProjectAgentBriefs,
  buildProjectGenerationAudit,
  buildProjectGenerationContext,
  buildProjectSystemAgentAssignments,
  type ProjectAgentBrief,
  type ProjectGenerationAudit,
  type ProjectGenerationAuditCheck,
  type ProjectGenerationContext,
  type ProjectSystemAgentAssignment,
} from "@/lib/engine/generation-readiness"
