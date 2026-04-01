import type {
  GenerationPromptStageId,
  ProjectPromptConfiguration,
  ProjectPromptStageConfiguration,
  PromptProviderId,
  PromptProviderSource,
} from "@/lib/engine/types"

export const GENERATION_PROMPT_SUITE = {
  id: "generation_pipeline",
  version: "phase1-2026-03-29",
} as const

export const GENERATION_PROFILE_ADVICE_PROMPT = {
  id: "generation_profile_advice",
  version: GENERATION_PROMPT_SUITE.version,
  stage: "provider_refinement" as GenerationPromptStageId,
  label: "Provider Refinement",
} as const

export const GENERATION_BRIEF_ENHANCEMENT_PROMPT = {
  id: "generation_brief_completion",
  version: GENERATION_PROMPT_SUITE.version,
  stage: "provider_brief_enhancement" as GenerationPromptStageId,
  label: "Brief Completion",
} as const

export const GENERATION_INTENT_GAP_PROMPT = {
  id: "generation_intent_gap_fill",
  version: GENERATION_PROMPT_SUITE.version,
  stage: "intent_gap_fill" as GenerationPromptStageId,
  label: "Intent Gap Fill",
} as const

export const GENERATION_CANDIDATE_MANIFEST_PROMPT = {
  id: "generation_candidate_manifest",
  version: GENERATION_PROMPT_SUITE.version,
  stage: "candidate_generation" as GenerationPromptStageId,
  label: "Candidate Manifest",
} as const

export const GENERATION_CANDIDATE_CRITIC_PROMPT = {
  id: "generation_candidate_critic",
  version: GENERATION_PROMPT_SUITE.version,
  stage: "candidate_critique" as GenerationPromptStageId,
  label: "Candidate Critic",
} as const

export const GENERATION_CANDIDATE_REPAIR_PROMPT = {
  id: "generation_candidate_repair",
  version: GENERATION_PROMPT_SUITE.version,
  stage: "candidate_repair" as GenerationPromptStageId,
  label: "Candidate Repair",
} as const

export const GENERATION_COMPILE_FIX_PROMPT = {
  id: "generation_compile_fix",
  version: GENERATION_PROMPT_SUITE.version,
  stage: "compile_repair" as GenerationPromptStageId,
  label: "Compile Fix",
} as const

export const GENERATION_RELEASE_JUDGE_PROMPT = {
  id: "generation_release_judge",
  version: GENERATION_PROMPT_SUITE.version,
  stage: "release_judgement" as GenerationPromptStageId,
  label: "Release Judge",
} as const

const BASE_GENERATION_STAGES: ProjectPromptStageConfiguration[] = [
  { id: "brief_parser", label: "Brief Parser", version: GENERATION_PROMPT_SUITE.version, mode: "heuristic", provider: "local" },
  { id: "taxonomy_resolver", label: "Taxonomy Resolver", version: GENERATION_PROMPT_SUITE.version, mode: "heuristic", provider: "local" },
  { id: "mechanics_planner", label: "Mechanics Planner", version: GENERATION_PROMPT_SUITE.version, mode: "heuristic", provider: "local" },
  { id: "world_planner", label: "World Planner", version: GENERATION_PROMPT_SUITE.version, mode: "heuristic", provider: "local" },
  { id: "asset_planner", label: "Asset Planner", version: GENERATION_PROMPT_SUITE.version, mode: "heuristic", provider: "local" },
  { id: "graphics_planner", label: "Graphics Planner", version: GENERATION_PROMPT_SUITE.version, mode: "heuristic", provider: "local" },
  { id: "engine_planner", label: "Engine Planner", version: GENERATION_PROMPT_SUITE.version, mode: "heuristic", provider: "local" },
  { id: "runtime_planner", label: "Runtime Planner", version: GENERATION_PROMPT_SUITE.version, mode: "heuristic", provider: "local" },
  { id: "pipeline_planner", label: "Pipeline Planner", version: GENERATION_PROMPT_SUITE.version, mode: "heuristic", provider: "local" },
  { id: "prompt_council", label: "Prompt Council", version: GENERATION_PROMPT_SUITE.version, mode: "heuristic", provider: "local" },
  { id: "retrieval_planner", label: "Retrieval Planner", version: GENERATION_PROMPT_SUITE.version, mode: "heuristic", provider: "local" },
  { id: "candidate_planner", label: "Candidate Planner", version: GENERATION_PROMPT_SUITE.version, mode: "heuristic", provider: "local" },
  { id: "diversity_planner", label: "Diversity Planner", version: GENERATION_PROMPT_SUITE.version, mode: "heuristic", provider: "local" },
  { id: "evaluation_planner", label: "Evaluation Planner", version: GENERATION_PROMPT_SUITE.version, mode: "heuristic", provider: "local" },
  { id: "scope_validator", label: "Scope Validator", version: GENERATION_PROMPT_SUITE.version, mode: "heuristic", provider: "local" },
  { id: "manifest_synthesizer", label: "Manifest Synthesizer", version: GENERATION_PROMPT_SUITE.version, mode: "heuristic", provider: "local" },
]

export function buildGenerationPromptConfiguration(input: {
  provider: PromptProviderId
  source: PromptProviderSource
  model?: string
  budgetMinutes?: number
  providerRoster?: ProjectPromptConfiguration["providerRoster"]
  loopCount?: number
  fallbackProvidersUsed?: ProjectPromptConfiguration["fallbackProvidersUsed"]
  releaseStatus?: ProjectPromptConfiguration["releaseStatus"]
  loopReport?: ProjectPromptConfiguration["loopReport"]
  promptPackets?: ProjectPromptConfiguration["promptPackets"]
  releaseJudgement?: ProjectPromptConfiguration["releaseJudgement"]
  preparationDiff?: ProjectPromptConfiguration["preparationDiff"]
  candidateRuns?: ProjectPromptConfiguration["candidateRuns"]
  providerFailures?: ProjectPromptConfiguration["providerFailures"]
  providerDiagnostics?: ProjectPromptConfiguration["providerDiagnostics"]
  evolutionContext?: ProjectPromptConfiguration["evolutionContext"]
  operationalAnalytics?: ProjectPromptConfiguration["operationalAnalytics"]
  knowledgeCoverage?: ProjectPromptConfiguration["knowledgeCoverage"]
  knowledgeRisk?: ProjectPromptConfiguration["knowledgeRisk"]
  usageIntelligence?: ProjectPromptConfiguration["usageIntelligence"]
  attemptedProvider?: Exclude<PromptProviderId, "local"> | null
  attemptedModel?: string
  providerPromptHash?: string
  providerStages?: Array<{
    id: GenerationPromptStageId
    label: string
    version: string
    promptId: string
    promptHash?: string
    provider: Exclude<PromptProviderId, "local">
    model?: string
  }>
}): ProjectPromptConfiguration {
  const stages = BASE_GENERATION_STAGES.map((stage) => ({ ...stage }))
  const attemptedProvider = input.attemptedProvider ?? null

  if (Array.isArray(input.providerStages) && input.providerStages.length > 0) {
    input.providerStages.forEach((stage) => {
      stages.push({
        id: stage.id,
        label: stage.label,
        version: stage.version,
        mode: "provider",
        promptId: stage.promptId,
        promptHash: stage.promptHash,
        provider: stage.provider,
        model: stage.model?.trim() || undefined,
      })
    })
  } else if (attemptedProvider) {
    stages.push({
      id: GENERATION_PROFILE_ADVICE_PROMPT.stage,
      label: GENERATION_PROFILE_ADVICE_PROMPT.label,
      version: GENERATION_PROFILE_ADVICE_PROMPT.version,
      mode: "provider",
      promptId: GENERATION_PROFILE_ADVICE_PROMPT.id,
      promptHash: input.providerPromptHash,
      provider: attemptedProvider,
      model: input.attemptedModel?.trim() || undefined,
    })
  }

  return {
    provider: input.provider,
    source: input.source,
    model: input.model?.trim() || undefined,
    suiteId: GENERATION_PROMPT_SUITE.id,
    suiteVersion: GENERATION_PROMPT_SUITE.version,
    budgetMinutes: input.budgetMinutes,
    providerRoster: input.providerRoster,
    loopCount: input.loopCount,
    fallbackProvidersUsed: input.fallbackProvidersUsed,
    releaseStatus: input.releaseStatus,
    loopReport: input.loopReport,
    promptPackets: input.promptPackets,
    releaseJudgement: input.releaseJudgement,
    preparationDiff: input.preparationDiff,
    candidateRuns: input.candidateRuns,
    providerFailures: input.providerFailures,
    providerDiagnostics: input.providerDiagnostics,
    evolutionContext: input.evolutionContext,
    operationalAnalytics: input.operationalAnalytics,
    knowledgeCoverage: input.knowledgeCoverage,
    knowledgeRisk: input.knowledgeRisk,
    usageIntelligence: input.usageIntelligence,
    stages,
  }
}
