// ═══════════════════════════════════════════════════════════════
// FUNALOO ENGINE CORE — Type Definitions
// Ported from NEXUS-116 v3 Python backend
// ═══════════════════════════════════════════════════════════════

export type EngineStatus = "idle" | "running" | "stopping"

export type Phase =
  | "L0_context"
  | "L1_research"
  | "L2_training"
  | "L3_generation"

export type AgentName =
  | "architect"
  | "renderer"
  | "network"
  | "physics"
  | "gameplay"
  | "audio"
  | "procedural"
  | "optimizer"
  | "tooling"

export type Genre =
  | "action"
  | "adventure"
  | "rpg"
  | "strategy"
  | "simulation"
  | "sports"
  | "puzzle"
  | "shooter"
  | "fighting"
  | "racing"
  | "platformer"
  | "stealth"
  | "rhythm"
  | "party"
  | "board_card"
  | "idle_incremental"
  | "visual_novel"
  | "interactive_fiction"
  | "walking_simulator"
  | "moba"
  | "tower_defense"
  | "auto_battler"
  | "sandbox"
  | "fps"
  | "tps"
  | "battle_royale"
  | "mmo"
  | "survival"
  | "horror"
  | "metroidbrainia"
  | "four_x"
  | "soulslike"
  | "deckbuilder"

export type GameplaySystem =
  | "sandbox"
  | "open_world"
  | "survival"
  | "procedural"
  | "roguelike"
  | "roguelite"
  | "metroidvania"
  | "soulslike"
  | "tactical"
  | "immersive_sim"
  | "looter_shooter"
  | "city_builder"
  | "management"
  | "tycoon"
  | "grand_strategy"

export type GameplayMode =
  | "singleplayer"
  | "multiplayer"
  | "mmo"
  | "co_op"
  | "pvp"
  | "battle_royale"

export type TargetEngine = "unreal" | "godot" | "unity" | "custom"
export type GameDimension = "2d" | "3d" | "hybrid"
export type PromptProviderId = "local" | "claude" | "openrouter" | "gpt"
export type PromptProviderSource = "local" | "user-key"
export type GenerationPromptStageId =
  | "brief_parser"
  | "provider_brief_enhancement"
  | "intent_gap_fill"
  | "taxonomy_resolver"
  | "mechanics_planner"
  | "world_planner"
  | "asset_planner"
  | "graphics_planner"
  | "engine_planner"
  | "retrieval_planner"
  | "candidate_planner"
  | "evaluation_planner"
  | "diversity_planner"
  | "scope_validator"
  | "runtime_planner"
  | "pipeline_planner"
  | "prompt_council"
  | "manifest_synthesizer"
  | "candidate_generation"
  | "candidate_critique"
  | "candidate_repair"
  | "compile_repair"
  | "provider_refinement"
  | "release_judgement"
export type GenerationRuntimeArchetype =
  | "combat_mission"
  | "survival_horde"
  | "survival_expedition_3d"
  | "journey_route"
  | "homestead_life"
  | "strategy_command"
  | "action_operation_3d"
export type GenerationFeedbackScoreBand = "failed" | "1-2" | "3-4" | "5-6" | "7-8" | "9-10"

// ── Branded Identity Types ───────────────────────────────────
// Compile-time only — runtime values remain plain strings.
// Prevents accidental mixing of email strings with project IDs.

export type Email = string & { readonly __brand: "Email" }
export type ProjectId = string & { readonly __brand: "ProjectId" }

export type OptLevel = "prototype" | "alpha" | "production"

export type NetworkingType = "none" | "p2p" | "dedicated" | "hybrid"

export type WorkItemCategory =
  | "implement"
  | "fix"
  | "improve"
  | "research"
  | "test"
  | "document"

export type WorkItemStatus =
  | "pending"
  | "running"
  | "done"
  | "failed"
  | "skipped"

// ── Engine State ──────────────────────────────────────────────

export interface EngineState {
  status: EngineStatus
  currentPhase: Phase | ""
  currentTask: string
  cycleCount: number
  levelsEnabled: Record<string, boolean>
  research: {
    domainsDone: number
    domainsTotal: number
    linksFound: number
    current: string
  }
  training: {
    domainsDone: number
    domainsTotal: number
    epoch: string
    lastCheckpoint: string
    current: string
  }
  generation: {
    systemsDone: number
    systemsTotal: number
    current: string
  }
  startedAt: string
  lastActivity: string
}

// ── Brain State (from brain_state.json) ──────────────────────

export interface BrainState {
  cycleCount: number
  totalItemsCompleted: number
  totalItemsFailed: number
  totalLinesWritten: number
  totalFilesCreated: number
  totalFilesModified: number
  lastReflection: string
  running: boolean
  knownGaps: string[]
  recentlyCompleted: string[]
}

// ── Work Queue ────────────────────────────────────────────────

export interface WorkItem {
  id: string
  category: WorkItemCategory
  priority: number // 1 (critical) – 5 (nice to have)
  title: string
  prompt: string
  targetFile: string
  contextFiles: string[]
  status: WorkItemStatus
  result: string
  applied: boolean
  verified: boolean
  error: string
  createdAt: string
  completedAt: string
  cycle: number
}

// ── Agents ────────────────────────────────────────────────────

export interface Agent {
  name: AgentName
  displayName: string
  icon: string
  status: "idle" | "running" | "done"
  description: string
  expertise: string[]
  lastTask: string
  lastDuration: number
  outputChars: number
}

export interface AgentKnowledge {
  name: AgentName
  systemPrompt: string
  expertise: string[]
}

// ── Research ──────────────────────────────────────────────────

export interface ResearchDomain {
  name: string
  displayName: string
  description: string
  links: number
  threshold: number
  status: "pending" | "active" | "complete"
  searchQueries: string[]
}

export interface ResearchLink {
  url: string
  domain: string
  title: string
  description: string
  relevanceScore: number
  qualityScore: number
  vetted: boolean
  vettedBy: string
  tags: string[]
}

// ── Training ──────────────────────────────────────────────────

export interface TrainingDomain {
  name: string
  displayName: string
  epoch: number
  totalEpochs: number
  pairs: number
  quality: number
  status: "pending" | "training" | "complete"
}

export interface TrainingConfig {
  method: string
  baseModel: string
  maxSeqLength: number
  batchSize: number
  epochs: number
  learningRate: number
  outputDir: string
}

// ── Generation ────────────────────────────────────────────────

export interface GameSpec {
  prompt: string
  genre: Genre
  dimension: GameDimension
  engine: TargetEngine
  features: string[]
  multiplayer: boolean
  maxPlayers: number
  artStyle: string
  targetPlatforms: string[]
  optimizationLevel: OptLevel
  networkingType: NetworkingType
}

export interface GenerationSystem {
  name: string
  displayName: string
  status: "pending" | "generating" | "optimizing" | "complete"
  linesGenerated: number
  engine: string
}

export interface LevelBeat {
  title: string
  purpose: string
  challenge: string
  reward: string
}

export interface SupplementalGenerationSystem {
  name: string
  displayName: string
  rationale: string
  linesBudget: number
}

export type AssetReusePolicy = "direct" | "reference-only"

export interface AssetGeneratorSource {
  name: string
  repo: string
  url: string
  license: string
  reusePolicy: AssetReusePolicy
  focus: string
  fit: string
  integrationPatterns: string[]
}

export interface AssetGenerationToolchain {
  id: string
  stage: string
  label: string
  objective: string
  primarySource: string
  supportingSources: string[]
  inputs: string[]
  outputs: string[]
  orchestrationNotes: string[]
  verificationChecks: string[]
}

export interface AssetProductionPhase {
  name: string
  goal: string
  deliverables: string[]
}

export interface AssetIntegrationContract {
  id: string
  focus: string
  targetSystems: string[]
  rules: string[]
}

export interface CharacterAssetBlueprint {
  name: string
  role: string
  silhouette: string
  rigProfile: string
  modules: string[]
  animations: string[]
  stateVariants: string[]
  interactionHooks: string[]
  spawnContexts: string[]
  reuseStrategy: string
  presentationRules: string[]
  notes: string
}

export interface PropAssetBlueprint {
  name: string
  category: string
  gameplayRole: string
  silhouetteRole: string
  modularity: string
  variants: number
  materials: string[]
  stateVariants: string[]
  interactionHooks: string[]
  spawnContexts: string[]
  reuseStrategy: string
  placementRules: string[]
}

export interface EnvironmentAssetKit {
  name: string
  purpose: string
  modules: string[]
  biomeTags: string[]
  propFamilies: string[]
  characterAnchors: string[]
  traversalAffordances: string[]
  stateVariants: string[]
  assemblyRules: string[]
}

export interface AssetGenerationPlan {
  productionStyle: string
  assetSystemSummary: string
  assetPipelineSummary: string
  modelGenerationSummary: string
  kitArchitecture: string
  assemblyStrategy: string
  orchestrationStrategy: string
  characterStrategy: string
  propStrategy: string
  environmentStrategy: string
  materialPalette: string[]
  animationNeeds: string[]
  reuseDirectives: string[]
  stateModelRules: string[]
  spawnRules: string[]
  productionPhases: AssetProductionPhase[]
  integrationContracts: AssetIntegrationContract[]
  generationRules: string[]
  specialistTracks: string[]
  reviewPasses: string[]
  qualityGates: string[]
  toolchainQualityChecks: string[]
  characterBlueprints: CharacterAssetBlueprint[]
  propBlueprints: PropAssetBlueprint[]
  environmentKits: EnvironmentAssetKit[]
  generationToolchains: AssetGenerationToolchain[]
  sourceInspirations: AssetGeneratorSource[]
}

export interface GenerationRuntimePlan {
  archetype: GenerationRuntimeArchetype
  label: string
  reason: string
  cameraModel: string
  targetSessionMinutes: number
  inputModel: string
  playFocus: string[]
  uiFocus: string[]
  contentStrategy: string[]
  winCondition: string
  failCondition: string
  antiCollapseRules: string[]
}

export type GenerationRuntimeVersatilityFlavorId =
  | "baseline"
  | "extraction_operation"
  | "zombie_expedition"
  | "heist_infiltration"
  | "systemic_infiltration"
  | "forensic_investigation"
  | "curation_restoration"
  | "cozy_agriculture"
  | "frontier_trade"
  | "political_command"
  | "social_suspicion"
  | "puzzle_chambers"
  | "sports_competition"
  | "metroidbrainia_logic"
  | "soulslike_mastery"
  | "four_x_grand_strategy"
  | "deckbuilding_synergy"


export interface GenerationRuntimeResourceLabels {
  primary: string
  secondary: string
  support: string
  recovery: string
}

export interface GenerationRuntimeEncounterLabels {
  hostile: string
  elite: string
  collectible: string
  support: string
  destination: string
}

export interface GenerationRuntimeActionLabels {
  primary: string
  secondary: string
  recovery: string
  utility: string
}

export interface GenerationRuntimeVersatilityPlan {
  flavorId: GenerationRuntimeVersatilityFlavorId
  flavorLabel: string
  runtimeSubtitle: string
  activeModules: string[]
  primaryVerbs: string[]
  pressureTracks: string[]
  resourceLabels: GenerationRuntimeResourceLabels
  encounterLabels: GenerationRuntimeEncounterLabels
  actionLabels: GenerationRuntimeActionLabels
  objectiveHooks: string[]
  uiCallouts: string[]
  eventCues: string[]
}

export interface GenerationGraphicsPlan {
  renderPath: string
  visualIdentity: string
  lightingModel: string
  materialStrategy: string
  postProcessStyle: string
  animationFocus: string
  uiPresentation: string
  runtimePresentation: string
  scalabilityStrategy: string
  lowSpecFallbacks: string[]
  highSpecEnhancements: string[]
  gracefulDegradation: string[]
  frameBudgetPriorities: string[]
}

export interface GenerationEnginePlan {
  recommendedEngine: TargetEngine
  rationale: string
  strengths: string[]
  criticalSubsystems: string[]
  scalingStrategy: string[]
  portabilityNotes: string[]
  fallbackEngines: TargetEngine[]
}

export interface GenerationPipelinePhaseBudget {
  name: string
  minutes: number
  goal: string
  outputs: string[]
}

export interface GenerationPipelinePlan {
  targetMinutes: number
  parallelTracks: string[]
  methodology: string[]
  phaseBudgets: GenerationPipelinePhaseBudget[]
  qualityGates: string[]
  fallbackStrategy: string[]
}

export interface GenerationCouncilAgent {
  id: string
  displayName: string
  mandate: string
  challengeFocus: string[]
  repairFocus: string[]
}

export interface GenerationPromptTier {
  id: string
  name: string
  objective: string
  ownerAgentId: string
  deliverables: string[]
  escalationRules: string[]
}

export interface GenerationPromptCouncilPlan {
  orchestrationModel: string
  agents: GenerationCouncilAgent[]
  promptTiers: GenerationPromptTier[]
  adjudicationRules: string[]
  repairLoop: string[]
}

export interface GenerationReferenceExample {
  id: string
  title: string
  genre: Genre
  dimension: GameDimension
  runtimeArchetype: GenerationRuntimeArchetype
  fit: string
  retrievalReason: string
  mechanicsToBorrow: string[]
  antiPatterns: string[]
}

export interface GenerationCandidateScoreBreakdown {
  fidelity: number
  coherence: number
  novelty: number
  scope: number
  runtimeFit: number
  total: number
}

export interface GenerationCandidateManifest {
  id: string
  title: string
  premise: string
  runtimeArchetype: GenerationRuntimeArchetype
  differentiators: string[]
  retainedFeatures: string[]
  riskFlags: string[]
  knowledgeFit: "strong" | "balanced" | "risky"
  knowledgeNotes: string[]
  score: GenerationCandidateScoreBreakdown
}

export interface GenerationCandidatePlan {
  selectionStrategy: string
  decisionSummary: string
  chosenCandidateId: string
  rerankTriggers: string[]
  candidates: GenerationCandidateManifest[]
}

export interface GenerationEvalDatasetBucket {
  id: string
  label: string
  samplePrompt: string
  checks: string[]
}

export interface GenerationEvalRubric {
  id: string
  label: string
  weight: number
  passThreshold: number
  guidance: string
}

export interface GenerationEvaluationPlan {
  evaluationStrategy: string
  graderModel: string
  datasetBuckets: GenerationEvalDatasetBucket[]
  rubrics: GenerationEvalRubric[]
  acceptanceRules: string[]
  repairHooks: string[]
}

export interface GenerationDiversityPlan {
  rankingStrategy: string
  retrievalExamples: GenerationReferenceExample[]
  diversityMemoryKey: string
  overusedPatternRisks: string[]
  noveltyPressure: string[]
  antiCollapseChecks: string[]
}

export interface ProjectGenerationFeedback {
  id: string
  scoreBand: GenerationFeedbackScoreBand
  notes: string
  submittedAt: string
  runtimeArchetype: GenerationRuntimeArchetype
  runtimeLabel: string
  promptSummary: string
}

export interface ProjectFeedbackDigest {
  totalReports: number
  latestScoreBand: GenerationFeedbackScoreBand | null
  averageScore: number | null
  failurePressure: "low" | "medium" | "high"
  recurringThemes: string[]
  improvementPriorities: string[]
  promptAdjustments: string[]
}

export interface ProjectFeedbackIssueSignal {
  id: string
  label: string
  severity: "low" | "medium" | "high"
  confidence: "low" | "medium" | "high"
  evidence: string[]
  promptRepair: string
  runtimeRepair: string
  sourceRepair: string
}

export interface ProjectSourceRepairTarget {
  id: string
  label: string
  category: "prompt_stack" | "runtime_component" | "generated_system" | "ui_layer" | "asset_pipeline" | "world_logic" | "tests"
  priority: "low" | "medium" | "high"
  rationale: string
  files: string[]
  actions: string[]
}

export interface ProjectGenerationRepairPlan {
  promptRepairs: string[]
  runtimeRepairs: string[]
  sourceRepairs: string[]
  assetRepairs: string[]
  evalAdditions: string[]
}

export interface ProjectFeedbackLearningReport {
  project: {
    name: string
    genre: Genre
    dimension: GameDimension
    runtimeArchetype: GenerationRuntimeArchetype
    promptSummary: string
  }
  digest: ProjectFeedbackDigest
  recognizedIssues: ProjectFeedbackIssueSignal[]
  sourceRepairPlan: ProjectSourceRepairTarget[]
  generationRepairPlan: ProjectGenerationRepairPlan
  enhancementAgentBrief: string
  learningSignals: {
    positiveExample: boolean
    retrainRecommended: boolean
    runtimeMismatchRisk: boolean
    sourcePatchRecommended: boolean
  }
}

export interface ProjectGenerationExecutionArtifact {
  id: string
  stageId: string
  label: string
  category: "briefing" | "code" | "asset" | "verification" | "repair" | "runtime"
  status: "generated" | "verified" | "repaired"
  detail: string
}

export interface ProjectGenerationExecutionCheck {
  id: string
  stageId: string
  label: string
  status: "pass" | "warning" | "fail"
  severity: "low" | "medium" | "high"
  score: number
  detail: string
  fix: string
}

export interface ProjectGenerationExecutionRepairAction {
  id: string
  stageId: string
  label: string
  target: string
  reason: string
  result: string
  applied: boolean
}

export interface ProjectGenerationExecutionStageRun {
  id: string
  label: string
  ownerAgent: AgentName
  objective: string
  status: "pass" | "warning" | "fail"
  toolchainId?: string
  inputs: string[]
  outputs: string[]
  notes: string[]
  checks: ProjectGenerationExecutionCheck[]
  repairActions: ProjectGenerationExecutionRepairAction[]
}

export interface ProjectGenerationExecutionReport {
  startedAt: string
  completedAt: string
  releaseDecision: "ready" | "needs_review" | "blocked"
  summary: string
  autoRepairApplied: boolean
  workerSequence: AgentName[]
  stageRuns: ProjectGenerationExecutionStageRun[]
  artifacts: ProjectGenerationExecutionArtifact[]
  checks: ProjectGenerationExecutionCheck[]
  repairActions: ProjectGenerationExecutionRepairAction[]
  totals: {
    stages: number
    checks: number
    passing: number
    warnings: number
    failures: number
    repairsApplied: number
  }
}

export type ProviderLoopRole = "author" | "critic" | "repair" | "release_judge"

export type GenerationLoopStageId =
  | "brief_completion"
  | "intent_gap_fill"
  | "candidate_generation"
  | "candidate_critique"
  | "candidate_repair"
  | "manifest_lock"
  | "workspace_generation"
  | "compile_preflight"
  | "compile_repair"
  | "release_judgement"

export interface GenerationInferenceDiff {
  field: string
  explicitValue: string
  inferredValue: string
  rationale: string
  applied: boolean
}

export interface GenerationMissingCriteria {
  field: string
  severity: "low" | "medium" | "high"
  reason: string
  suggestedFill: string
}

export interface ProviderLoopAssignment {
  role: ProviderLoopRole
  provider: Exclude<PromptProviderId, "local">
  model: string
  source: "selected" | "support"
  notes: string
}

export interface ProviderLoopRoster {
  mode: "local_only" | "single_provider" | "cross_provider"
  assignments: ProviderLoopAssignment[]
  availableProviders: Exclude<PromptProviderId, "local">[]
}

export interface GenerationPromptPacket {
  stageId: GenerationLoopStageId
  provider: PromptProviderId
  model?: string
  hash: string
  summary: string
  includes: string[]
}

export interface GenerationLoopStage {
  id: GenerationLoopStageId
  provider: PromptProviderId
  model?: string
  attempt: number
  inputHash: string
  outputSummary: string
  verification: "pass" | "warning" | "fail"
  repairReason?: string
  elapsedMs?: number
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  costUsd?: number
  retriesUsed?: number
  omittedSections?: string[]
  cacheStrategy?: string
  routingStrategy?: string
}

export interface GenerationLoopAttempt {
  attempt: number
  selectedCandidateId?: string
  stages: GenerationLoopStage[]
  blockedReasons: string[]
  repaired: boolean
}

export interface GenerationLoopCandidateRun {
  id: string
  label: string
  provider: PromptProviderId
  model?: string
  summary: string
  score: number
  passed: boolean
  blockedReasons: string[]
  profileSnapshot: {
    resolvedGenre: Genre
    dimension: GameDimension
    runtimeArchetype: GenerationRuntimeArchetype
    cameraStyle: string
  }
}

export interface GenerationReleaseJudgement {
  decision: "ready" | "needs_review" | "blocked"
  summary: string
  blockers: string[]
  warnings: string[]
}

export type GenerationProviderFailureCategory =
  | "rate_limit"
  | "quota"
  | "authentication"
  | "permission"
  | "validation"
  | "context_limit"
  | "model_unavailable"
  | "timeout"
  | "overloaded"
  | "moderation"
  | "network"
  | "empty_response"
  | "unsupported_capability"
  | "privacy_policy"
  | "unknown"

export type GenerationProviderFailureSeverity = "info" | "warning" | "error" | "critical"

export type GenerationProviderRetryStrategy =
  | "retry_immediately"
  | "retry_with_backoff"
  | "retry_after_wait"
  | "switch_model"
  | "switch_provider"
  | "fix_key"
  | "fix_billing"
  | "trim_context"
  | "simplify_request"
  | "review_content"
  | "adjust_privacy_or_routing"
  | "contact_support"
  | "manual_review"

export interface GenerationProviderSignal {
  id: string
  label: string
  severity: GenerationProviderFailureSeverity
  detail: string
  source: "status" | "provider_type" | "provider_message" | "header" | "network" | "response_body"
  action?: string
}

export interface GenerationProviderFailure {
  stageId: GenerationLoopStageId
  stageLabel: string
  provider: PromptProviderId
  model?: string
  attempt: number
  reason: string
  code: "client_error" | "verification_failed"
  retryable: boolean
  recovered: boolean
  final: boolean
  status?: number
  providerErrorType?: string
  category?: GenerationProviderFailureCategory
  severity?: GenerationProviderFailureSeverity
  retryStrategy?: GenerationProviderRetryStrategy
  statusFamily?: "1xx" | "2xx" | "3xx" | "4xx" | "5xx"
  headline?: string
  suggestedAction?: string
  affectedModel?: string
  limitSummary?: string
  signals?: GenerationProviderSignal[]
  requestId?: string
  retryAfterSeconds?: number
}

export interface GenerationProviderDiagnosticsSummary {
  summary: string
  highestSeverity: GenerationProviderFailureSeverity
  totalFailures: number
  unresolvedFailures: number
  recoveredFailures: number
  finalFailures: number
  categories: GenerationProviderFailureCategory[]
  retryStrategies: GenerationProviderRetryStrategy[]
  statusFamilies: Array<"1xx" | "2xx" | "3xx" | "4xx" | "5xx">
  affectedModels: string[]
  healthSignals: string[]
  actionItems: string[]
  hotspots: string[]
}

export interface GenerationOperationalAnalytics {
  totalPromptCalls: number
  totalProviderFallbacks: number
  totalRetries: number
  totalInputTokens: number
  totalOutputTokens: number
  totalTokens: number
  totalCostUsd: number
  slowStages: string[]
  cacheableStages: string[]
  routingStrategies: string[]
  failureHotspots: string[]
  failureCategories?: string[]
  retryStrategies?: string[]
  providerHealthSignals?: string[]
  optimizationNotes: string[]
}

export interface GenerationKnowledgeSignal {
  id: string
  label: string
  category: "research_domain" | "training_domain" | "engine_pattern" | "library_pattern"
  relevance: "high" | "medium"
  reason: string
  status?: string
  quality?: number
}

export interface GenerationKnowledgeGap {
  id: string
  label: string
  severity: "low" | "medium" | "high"
  reason: string
  action: string
}

export interface GenerationKnowledgeCoverage {
  summary: string
  coverageScore: number
  relevantSignals: GenerationKnowledgeSignal[]
  gapWarnings: GenerationKnowledgeGap[]
  promptGuidance: string[]
  compileGuidance: string[]
  verificationFocus: string[]
  recommendedContext: string[]
}

export interface GenerationKnowledgeRiskSummary {
  level: "aligned" | "watch" | "risky"
  summary: string
  blockers: string[]
  warnings: string[]
  critiquePressure: string[]
  repairPressure: string[]
  releasePressure: string[]
}

export interface GenerationUsageProviderSnapshot {
  provider: Exclude<PromptProviderId, "local">
  totalRuns: number
  readyRuns: number
  reviewRuns: number
  blockedRuns: number
  readyRate: number
  avgPromptCalls: number
  avgCostUsd: number
  topModels: string[]
  topFailureStages: string[]
}

export interface GenerationUsageIntelligence {
  summary: string
  currentUserSummary: string
  globalSummary: string
  relevantRuns: number
  suggestedProviders: Array<Exclude<PromptProviderId, "local">>
  suggestedModels: string[]
  providerSnapshots: GenerationUsageProviderSnapshot[]
  manifestPressure: string[]
  routingPressure: string[]
  compilePressure: string[]
  releasePressure: string[]
  failureWatchouts: string[]
}

export interface GenerationLoopReport {
  budgetMinutes: number
  mode: "quality-first"
  roster: ProviderLoopRoster
  attempts: GenerationLoopAttempt[]
  promptPackets: GenerationPromptPacket[]
  missingCriteria: GenerationMissingCriteria[]
  preparationDiff: GenerationInferenceDiff[]
  candidateRuns: GenerationLoopCandidateRun[]
  providerFailures: GenerationProviderFailure[]
  fallbackProvidersUsed: PromptProviderId[]
  selectedCandidateId?: string
  compileGateSummary: string
  releaseJudgement: GenerationReleaseJudgement
  operationalAnalytics: GenerationOperationalAnalytics
}

export interface NexusCacheLine {
  id: string
  label: string
  category: "agent" | "research_domain" | "training_domain" | "generation_system" | "open_source_engine" | "standalone_library"
  line: string
  tags: string[]
}

export interface GenerationAlphabeticalAddition {
  start: string
  end: string
  additions: string[]
  rationale: string
}

export interface GenerationEvolutionInsertionBlock {
  id: string
  divider: string
  startAnchor: string
  startLine: string
  endAnchor: string
  endLine: string
  promptInsertions: string[]
  codeInsertions: string[]
  rationale: string
}

export interface GenerationEvolutionUsageSnapshot {
  totalUsers: number
  totalProjects: number
  providerBackedProjects: number
  readyProjects: number
  blockedProjects: number
  positiveExamples: number
}

export interface PromptIntelligenceFragment {
  id: string
  category: "architectural" | "behavioral" | "code_pattern" | "ui_layout" | "mechanic_logic"
  fragment: string
  rationale: string
  tags: string[]
  metadata?: Record<string, unknown>
}

export interface GenerationEvolutionContext {
  cacheLines: NexusCacheLine[]
  alphabeticalAdditions: GenerationAlphabeticalAddition[]
  insertionBlocks: GenerationEvolutionInsertionBlock[]
  userLearnings: string[]
  globalLearnings: string[]
  qualitySignals: string[]
  promptExpansionHints: string[]
  usageSnapshot: GenerationEvolutionUsageSnapshot
}

export type NetworkTopology = "client_server" | "peer_to_peer" | "listen_server" | "distributed_fleet"

export interface GenerationIntelligenceProfile {
  resolvedGenre: Genre
  genreConfidence: "low" | "medium" | "high"
  genreReason: string
  resolvedSystems: GameplaySystem[]
  resolvedModes: GameplayMode[]
  promptSummary: string
  generatedPitch: string
  playerFantasy: string
  sessionFantasy: string
  interactionModel: string
  experienceGoals: string[]
  contentPillars: string[]
  progressionArcs: string[]
  environmentThemes: string[]
  uiSurfaces: string[]
  systemPriorities: string[]
  negativeConstraints: string[]
  scopeScale: "focused" | "expanded" | "limitless"
  resolvedMultiplayer: boolean
  resolvedMaxPlayers: number
  networkTopology: NetworkTopology
  tickRate: number
  seed: string
  dimension: GameDimension
  cameraStyle: string
  worldStructure: string
  mapArchetype: string
  mapOverview: string
  nonOverlapStrategy: string
  traversalModel: string
  layoutRules: string[]
  promptSignals: string[]
  gameplayLoopSummary: string
  coreLoop: string[]
  secondaryLoop: string[]
  progressionLoop: string[]
  failStates: string[]
  levelSequence: LevelBeat[]
  autoIncludedFeatures: string[]
  resolvedFeatures: string[]
  supplementalSystems: SupplementalGenerationSystem[]
  complementarySystems: string[]
  knowledgeDomains: string[]
  runtimePlan: GenerationRuntimePlan
  runtimeVersatilityPlan: GenerationRuntimeVersatilityPlan
  graphicsPlan: GenerationGraphicsPlan
  enginePlan: GenerationEnginePlan
  pipelinePlan: GenerationPipelinePlan
  promptCouncilPlan: GenerationPromptCouncilPlan
  candidatePlan: GenerationCandidatePlan
  evaluationPlan: GenerationEvaluationPlan
  diversityPlan: GenerationDiversityPlan
  assetPlan: AssetGenerationPlan
}

export interface ProjectWorkspaceFile {
  name: string
  content: string
  lines: number
}

export interface ProjectPromptStageConfiguration {
  id: GenerationPromptStageId
  label: string
  version: string
  mode: "heuristic" | "provider"
  promptId?: string
  promptHash?: string
  provider?: PromptProviderId
  model?: string
}

export interface ProjectPromptConfiguration {
  provider: PromptProviderId
  source: PromptProviderSource
  model?: string
  suiteId?: string
  suiteVersion?: string
  budgetMinutes?: number
  providerRoster?: ProviderLoopRoster
  loopCount?: number
  fallbackProvidersUsed?: PromptProviderId[]
  releaseStatus?: GenerationReleaseJudgement["decision"]
  loopReport?: GenerationLoopReport
  promptPackets?: GenerationPromptPacket[]
  releaseJudgement?: GenerationReleaseJudgement
  preparationDiff?: GenerationInferenceDiff[]
  candidateRuns?: GenerationLoopCandidateRun[]
  providerFailures?: GenerationProviderFailure[]
  providerDiagnostics?: GenerationProviderDiagnosticsSummary
  evolutionContext?: GenerationEvolutionContext
  operationalAnalytics?: GenerationOperationalAnalytics
  knowledgeCoverage?: GenerationKnowledgeCoverage
  knowledgeRisk?: GenerationKnowledgeRiskSummary
  usageIntelligence?: GenerationUsageIntelligence
  stages?: ProjectPromptStageConfiguration[]
}

// ── Engine Intelligence ───────────────────────────────────────

export interface OpenSourceEngine {
  name: string
  tier: number
  stars: string
  contributors: number
  language: string
  absorbed: string[]
  subsystems: string[]
}

export interface StandaloneLibrary {
  name: string
  category: string
  description: string
  absorbed: string[]
}

// ── Scene Tree ────────────────────────────────────────────────

export interface SceneNode {
  id: string
  name: string
  type: "root" | "node" | "entity" | "component" | "system"
  children: SceneNode[]
}

// ── User Project ──────────────────────────────────────────────

export interface UserProject {
  id: ProjectId
  name: string
  description: string
  genre: Genre
  dimension: GameDimension
  engine: TargetEngine
  features: string[]
  multiplayer: boolean
  maxPlayers: number
  networkTopology?: NetworkTopology
  tickRate?: number
  seed: string
  status: "creating" | "generating" | "complete" | "failed"
  progress: number
  createdAt: string
  llmConfiguration: ProjectPromptConfiguration
  design: GenerationIntelligenceProfile
  systems: GenerationSystem[]
  execution?: ProjectGenerationExecutionReport
  codeFiles: ProjectWorkspaceFile[]
  assetFiles: ProjectWorkspaceFile[]
  feedback?: ProjectGenerationFeedback[]
}

export interface GenreTemplateDefinition {
  features: string[]
  description: string
  defaultMultiplayer: boolean
  defaultPlayers: number
  defaultNetworkTopology: NetworkTopology
  defaultTickRate: number
  designPriorities: string[]
  assetPriorities: string[]
  failureWatchouts: string[]
  councilDebateFocus: string[]
}
