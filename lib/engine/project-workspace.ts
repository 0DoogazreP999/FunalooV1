import { generateRealisticCode } from "@/lib/engine/code-generator"
import { buildFeedbackLearningReport } from "@/lib/engine/feedback-learning"
import {
  buildProjectAgentBriefs,
  buildProjectGenerationAudit,
  buildProjectGenerationContext,
  buildProjectSystemAgentAssignments,
} from "@/lib/engine/generation-readiness"
import { buildGenerationProviderDiagnosticsSummary } from "@/lib/engine/provider-diagnostics"
import { buildRuntimeEncounterDirector } from "@/lib/engine/runtime-encounters"
import { buildRuntimePlaybookPlan } from "@/lib/engine/runtime-playbook"
import type { ProjectWorkspaceFile, UserProject } from "@/lib/engine/types"

function toClassStem(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")
}

function createFile(name: string, content: string): ProjectWorkspaceFile {
  return {
    name,
    content,
    lines: countWorkspaceFileLines(content),
  }
}

function toJson(content: unknown) {
  return JSON.stringify(content, null, 2)
}

function normalizeWorkspaceFile(
  file: Partial<ProjectWorkspaceFile> | null | undefined,
  fallbackName: string,
): ProjectWorkspaceFile | null {
  if (!file) return null

  const name = typeof file.name === "string" && file.name.trim() ? file.name : fallbackName
  const content = typeof file.content === "string" ? file.content : ""

  return createFile(name, content)
}

export function countWorkspaceFileLines(content: string) {
  if (!content) return 0
  return content.split(/\r?\n/).length
}

export function normalizeWorkspaceFiles(
  files: Partial<ProjectWorkspaceFile>[] | undefined,
  fallbackFiles: ProjectWorkspaceFile[] = [],
): ProjectWorkspaceFile[] {
  if (!Array.isArray(files) || files.length === 0) {
    return fallbackFiles
  }

  const normalized = files
    .map((file, index) => normalizeWorkspaceFile(file, `WorkspaceFile_${index + 1}.txt`))
    .filter((file): file is ProjectWorkspaceFile => file !== null)

  return normalized.length > 0 ? normalized : fallbackFiles
}

function getCodeFileExtension(engine: string): string {
  switch (engine) {
    case "godot": return ".gd"
    case "unity": return ".cs"
    case "custom": return ".hpp"
    default: return ".cpp"
  }
}

function hasCompileMarkers(content: string, engine: string) {
  switch (engine) {
    case "godot":
      return /extends Node|class_name/i.test(content)
    case "unity":
      return /using UnityEngine;|namespace Nexus\./i.test(content)
    case "custom":
      return /#pragma once|namespace nexus::/i.test(content)
    default:
      return /UCLASS|UPROPERTY|generated\.h|CoreMinimal\.h/i.test(content)
  }
}

export function createGeneratedCodeFiles(
  project: Pick<
    UserProject,
    "name" | "description" | "genre" | "dimension" | "engine" | "features" | "multiplayer" | "maxPlayers" | "llmConfiguration" | "design" | "systems" | "feedback"
  >,
): ProjectWorkspaceFile[] {
  const ext = getCodeFileExtension(project.engine)
  const agentAssignments = buildProjectSystemAgentAssignments({
    ...project,
    codeFiles: [],
    assetFiles: [],
  })
  const agentBriefs = buildProjectAgentBriefs({
    ...project,
    codeFiles: [],
    assetFiles: [],
  })
  const generatedSystems = project.systems.map((system) => system.displayName)

  return project.systems.map((system) => {
    const fileName = `Nexus${toClassStem(system.name)}System${ext}`
    const assignment = agentAssignments.find((entry) => entry.systemName === system.name)
    const agentBrief = agentBriefs.find((entry) => entry.agentName === assignment?.agentName)
    const content = generateRealisticCode(
      system.name,
      project.engine,
      project.genre,
      system.linesGenerated,
      project.design,
      {
        originalPrompt: project.description,
        assignedAgent: assignment?.agentDisplayName,
        assignedAgentSystemPrompt: assignment ? assignment.rationale : undefined,
        generatedSystems,
        verificationChecklist: agentBrief?.verificationChecklist ?? [],
      },
    )

    return createFile(fileName, content)
  })
}

export function createGeneratedAssetFiles(
  project: Pick<
    UserProject,
    "name" | "description" | "genre" | "dimension" | "engine" | "features" | "multiplayer" | "maxPlayers" | "llmConfiguration" | "design" | "systems" | "feedback"
  >,
  codeFiles: ProjectWorkspaceFile[] = [],
): ProjectWorkspaceFile[] {
  const feedbackLearning = buildFeedbackLearningReport(project)
  const generationContext = buildProjectGenerationContext({
    ...project,
    codeFiles,
    assetFiles: [],
  })
  const runtimeEncounterDirector = buildRuntimeEncounterDirector(project)
  const runtimePlaybook = buildRuntimePlaybookPlan(project)
  const providerDiagnostics = project.llmConfiguration.providerDiagnostics
    ?? buildGenerationProviderDiagnosticsSummary({
      failures: project.llmConfiguration.providerFailures,
      operationalAnalytics: project.llmConfiguration.operationalAnalytics ?? project.llmConfiguration.loopReport?.operationalAnalytics,
    })
  const expectedExtension = getCodeFileExtension(project.engine)
  const missingCompileFiles = project.systems
    .filter((system) => !codeFiles.some((file) => file.name.toLowerCase().includes(system.name.replace(/_/g, "").toLowerCase())))
    .map((system) => system.displayName)
  const compileWarnings = codeFiles
    .filter((file) => !file.name.endsWith(expectedExtension) || !hasCompileMarkers(file.content, project.engine))
    .map((file) => `${file.name} is missing expected ${project.engine} compile markers or extension alignment.`)
  const compileReadiness = {
    engine: project.engine,
    recommendedEngine: project.design.enginePlan.recommendedEngine,
    expectedExtension,
    buildTargets: [
      `${project.engine} runtime module`,
      `${project.engine} gameplay systems`,
      `${project.engine} asset integration surfaces`,
    ],
    criticalSubsystems: project.design.enginePlan.criticalSubsystems,
    compilePriorities: [
      "Engine-specific compile markers present in every generated code file",
      "One generated source file per planned system",
      "Critical subsystem ownership remains traceable from prompt to code",
      "Compile blockers are surfaced before project presentation",
    ],
    generatedFiles: codeFiles.map((file) => ({
      name: file.name,
      extensionMatch: file.name.endsWith(expectedExtension),
      compileMarkersPresent: hasCompileMarkers(file.content, project.engine),
      lines: file.lines,
    })),
    missingSystemFiles: missingCompileFiles,
    warnings: compileWarnings,
    blockers: [
      ...missingCompileFiles.map((system) => `Missing generated code file for ${system}.`),
      ...compileWarnings,
    ],
    compileReady: missingCompileFiles.length === 0 && compileWarnings.length === 0,
    note: "This is a compile-readiness audit inside Funaloo. External engine compilation still needs the target engine toolchain.",
  }

  const assetFiles: ProjectWorkspaceFile[] = [
    createFile(
      "GenerationContext.asset.json",
      toJson(generationContext),
    ),
    createFile(
      "AgentBriefing.asset.json",
      toJson({
        agentAssignments: generationContext.agentAssignments,
        agentBriefs: generationContext.agentBriefs,
      }),
    ),
    createFile(
      "CompileReadiness.asset.json",
      toJson(compileReadiness),
    ),
  ]

  const coreFiles: ProjectWorkspaceFile[] = [
    createFile(
      "ProjectManifest.json",
      toJson({
        name: project.name,
        description: project.description,
        genre: project.genre,
        resolvedGenre: project.design.resolvedGenre,
        genreConfidence: project.design.genreConfidence,
        promptSummary: project.design.promptSummary,
        generatedPitch: project.design.generatedPitch,
        dimension: project.dimension,
        engine: project.engine,
        players: {
          multiplayer: project.multiplayer,
          maxPlayers: project.maxPlayers,
        },
        llmConfiguration: project.llmConfiguration,
        promptConfiguration: {
          suiteId: project.llmConfiguration.suiteId,
          suiteVersion: project.llmConfiguration.suiteVersion,
          stageCount: project.llmConfiguration.stages?.length ?? 0,
        },
        features: project.features,
        assetPlan: {
          productionStyle: project.design.assetPlan.productionStyle,
          assetSystemSummary: project.design.assetPlan.assetSystemSummary,
          modelGenerationSummary: project.design.assetPlan.modelGenerationSummary,
          characterBlueprints: project.design.assetPlan.characterBlueprints.length,
          propBlueprints: project.design.assetPlan.propBlueprints.length,
          environmentKits: project.design.assetPlan.environmentKits.length,
          generationToolchains: project.design.assetPlan.generationToolchains.length,
        },
        runtimePlan: {
          archetype: project.design.runtimePlan.archetype,
          label: project.design.runtimePlan.label,
          targetSessionMinutes: project.design.runtimePlan.targetSessionMinutes,
        },
        runtimeVersatilityPlan: {
          flavorLabel: project.design.runtimeVersatilityPlan.flavorLabel,
          activeModules: project.design.runtimeVersatilityPlan.activeModules.length,
          pressureTracks: project.design.runtimeVersatilityPlan.pressureTracks.length,
        },
        runtimePlaybook: {
          cadenceLabel: runtimePlaybook.cadenceLabel,
          beatCount: runtimePlaybook.beats.length,
          uiFocus: runtimePlaybook.ui.focusWidgets.length,
        },
        runtimeEncounterDirector: {
          objectiveChain: runtimeEncounterDirector.objectiveChain.length,
          eventDeck: runtimeEncounterDirector.eventDeck.length,
          cadenceWindows: runtimeEncounterDirector.cadenceWindows.length,
          scenarioLabel: runtimeEncounterDirector.scenarioLabel,
        },
        graphicsPlan: {
          renderPath: project.design.graphicsPlan.renderPath,
          runtimePresentation: project.design.graphicsPlan.runtimePresentation,
          lowSpecFallbacks: project.design.graphicsPlan.lowSpecFallbacks.length,
        },
        enginePlan: {
          recommendedEngine: project.design.enginePlan.recommendedEngine,
          fallbackEngines: project.design.enginePlan.fallbackEngines,
        },
        pipelinePlan: {
          targetMinutes: project.design.pipelinePlan.targetMinutes,
          phaseCount: project.design.pipelinePlan.phaseBudgets.length,
        },
        promptCouncilPlan: {
          agentCount: project.design.promptCouncilPlan.agents.length,
          tierCount: project.design.promptCouncilPlan.promptTiers.length,
        },
        candidatePlan: {
          candidateCount: project.design.candidatePlan.candidates.length,
          chosenCandidateId: project.design.candidatePlan.chosenCandidateId,
        },
        evaluationPlan: {
          datasetBuckets: project.design.evaluationPlan.datasetBuckets.length,
          rubrics: project.design.evaluationPlan.rubrics.length,
        },
        diversityPlan: {
          retrievalExamples: project.design.diversityPlan.retrievalExamples.length,
          diversityMemoryKey: project.design.diversityPlan.diversityMemoryKey,
        },
        feedback: {
          reports: feedbackLearning.digest.totalReports,
          latestScoreBand: feedbackLearning.digest.latestScoreBand,
          failurePressure: feedbackLearning.digest.failurePressure,
          recognizedIssues: feedbackLearning.recognizedIssues.length,
          sourceRepairTargets: feedbackLearning.sourceRepairPlan.length,
        },
        generatedSystems: project.systems.map((system) => ({
          name: system.name,
          displayName: system.displayName,
          linesGenerated: system.linesGenerated,
          status: system.status,
        })),
      }),
    ),
    createFile(
      "PromptInterpretation.asset.json",
      toJson({
        resolvedGenre: project.design.resolvedGenre,
        genreReason: project.design.genreReason,
        promptSummary: project.design.promptSummary,
        generatedPitch: project.design.generatedPitch,
        playerFantasy: project.design.playerFantasy,
        sessionFantasy: project.design.sessionFantasy,
        interactionModel: project.design.interactionModel,
        scopeScale: project.design.scopeScale,
        experienceGoals: project.design.experienceGoals,
        contentPillars: project.design.contentPillars,
        progressionArcs: project.design.progressionArcs,
        environmentThemes: project.design.environmentThemes,
        uiSurfaces: project.design.uiSurfaces,
        systemPriorities: project.design.systemPriorities,
        negativeConstraints: project.design.negativeConstraints,
        resolvedMultiplayer: project.design.resolvedMultiplayer,
        resolvedMaxPlayers: project.design.resolvedMaxPlayers,
        promptSignals: project.design.promptSignals,
        runtimePlan: project.design.runtimePlan,
        graphicsPlan: project.design.graphicsPlan,
        enginePlan: project.design.enginePlan,
        pipelinePlan: project.design.pipelinePlan,
        llmConfiguration: project.llmConfiguration,
        candidatePlan: project.design.candidatePlan,
        evaluationPlan: project.design.evaluationPlan,
        diversityPlan: project.design.diversityPlan,
        assetPlan: {
          productionStyle: project.design.assetPlan.productionStyle,
          assetSystemSummary: project.design.assetPlan.assetSystemSummary,
          assetPipelineSummary: project.design.assetPlan.assetPipelineSummary,
          modelGenerationSummary: project.design.assetPlan.modelGenerationSummary,
          kitArchitecture: project.design.assetPlan.kitArchitecture,
          assemblyStrategy: project.design.assetPlan.assemblyStrategy,
          orchestrationStrategy: project.design.assetPlan.orchestrationStrategy,
          characterStrategy: project.design.assetPlan.characterStrategy,
          propStrategy: project.design.assetPlan.propStrategy,
          environmentStrategy: project.design.assetPlan.environmentStrategy,
        },
      }),
    ),
    createFile(
      "MapLayout.asset.json",
      toJson({
        cameraStyle: project.design.cameraStyle,
        worldStructure: project.design.worldStructure,
        mapArchetype: project.design.mapArchetype,
        mapOverview: project.design.mapOverview,
        traversalModel: project.design.traversalModel,
        nonOverlapStrategy: project.design.nonOverlapStrategy,
        layoutRules: project.design.layoutRules,
        levelSequence: project.design.levelSequence,
      }),
    ),
    createFile(
      "GameplayLoops.asset.json",
      toJson({
        summary: project.design.gameplayLoopSummary,
        coreLoop: project.design.coreLoop,
        secondaryLoop: project.design.secondaryLoop,
        progressionLoop: project.design.progressionLoop,
        failStates: project.design.failStates,
        runtimePlan: project.design.runtimePlan,
        runtimeVersatilityPlan: project.design.runtimeVersatilityPlan,
        runtimeEncounterDirector,
        runtimePlaybook,
        graphicsPlan: project.design.graphicsPlan,
        complementarySystems: project.design.complementarySystems,
        knowledgeDomains: project.design.knowledgeDomains,
      }),
    ),
    createFile(
      "SupplementalSystems.asset.json",
      toJson({
        promptSignals: project.design.promptSignals,
        autoIncludedFeatures: project.design.autoIncludedFeatures,
        resolvedFeatures: project.design.resolvedFeatures,
        supplementalSystems: project.design.supplementalSystems,
      }),
    ),
    createFile(
      "GenerationPipeline.asset.json",
      toJson({
        llmConfiguration: project.llmConfiguration,
        runtimePlan: project.design.runtimePlan,
        runtimeVersatilityPlan: project.design.runtimeVersatilityPlan,
        runtimeEncounterDirector,
        runtimePlaybook,
        graphicsPlan: project.design.graphicsPlan,
        enginePlan: project.design.enginePlan,
        pipelinePlan: project.design.pipelinePlan,
        promptCouncilPlan: project.design.promptCouncilPlan,
        candidatePlan: project.design.candidatePlan,
        evaluationPlan: project.design.evaluationPlan,
        diversityPlan: project.design.diversityPlan,
        knowledgeCoverage: project.llmConfiguration.knowledgeCoverage ?? null,
        knowledgeRisk: project.llmConfiguration.knowledgeRisk ?? null,
        usageIntelligence: project.llmConfiguration.usageIntelligence ?? null,
      }),
    ),
    createFile(
      "GenerationLoop.asset.json",
      toJson({
        loopReport: project.llmConfiguration.loopReport ?? null,
        providerRoster: project.llmConfiguration.providerRoster ?? null,
        providerFailures: project.llmConfiguration.providerFailures ?? [],
        providerDiagnostics,
        releaseJudgement: project.llmConfiguration.releaseJudgement ?? null,
        releaseStatus: project.llmConfiguration.releaseStatus ?? null,
        budgetMinutes: project.llmConfiguration.budgetMinutes ?? project.design.pipelinePlan.targetMinutes,
        operationalAnalytics: project.llmConfiguration.operationalAnalytics
          ?? project.llmConfiguration.loopReport?.operationalAnalytics
          ?? null,
        knowledgeRisk: project.llmConfiguration.knowledgeRisk ?? null,
        usageIntelligence: project.llmConfiguration.usageIntelligence ?? null,
      }),
    ),
    createFile(
      "LoopPromptPackets.asset.json",
      toJson({
        promptPackets: project.llmConfiguration.promptPackets ?? [],
        preparationDiff: project.llmConfiguration.preparationDiff ?? [],
        candidateRuns: project.llmConfiguration.candidateRuns ?? [],
        fallbackProvidersUsed: project.llmConfiguration.fallbackProvidersUsed ?? [],
        runtimeEncounterPromptBridge: runtimeEncounterDirector.promptBridge,
      }),
    ),
    createFile(
      "GenerationOperations.asset.json",
      toJson({
        operationalAnalytics: project.llmConfiguration.operationalAnalytics
          ?? project.llmConfiguration.loopReport?.operationalAnalytics
          ?? null,
        loopStages: project.llmConfiguration.loopReport?.attempts.flatMap((attempt) => attempt.stages).map((stage) => ({
          id: stage.id,
          provider: stage.provider,
          model: stage.model,
          elapsedMs: stage.elapsedMs,
          totalTokens: stage.totalTokens,
          costUsd: stage.costUsd,
          verification: stage.verification,
          cacheStrategy: stage.cacheStrategy,
          routingStrategy: stage.routingStrategy,
        })) ?? [],
        providerFailures: project.llmConfiguration.providerFailures ?? [],
        fallbackProvidersUsed: project.llmConfiguration.fallbackProvidersUsed ?? [],
      }),
    ),
    createFile(
      "ProviderDiagnostics.asset.json",
      toJson({
        providerDiagnostics,
        providerFailures: project.llmConfiguration.providerFailures ?? [],
        operationalAnalytics: project.llmConfiguration.operationalAnalytics
          ?? project.llmConfiguration.loopReport?.operationalAnalytics
          ?? null,
      }),
    ),
    createFile(
      "GenerationInputBoundary.asset.json",
      toJson({
        explicitPrompt: project.description,
        promptSummary: project.design.promptSummary,
        preparationDiff: project.llmConfiguration.preparationDiff ?? [],
        missingCriteria: project.llmConfiguration.loopReport?.missingCriteria ?? [],
        evolutionPolicy: "Evolution memory is stored separately and treated as advisory-only pressure during generation.",
        evolutionContextRecorded: Boolean(project.llmConfiguration.evolutionContext),
      }),
    ),
    createFile(
      "KnowledgeCoverage.asset.json",
      toJson({
        knowledgeCoverage: project.llmConfiguration.knowledgeCoverage ?? null,
      }),
    ),
    createFile(
      "KnowledgeRisk.asset.json",
      toJson({
        knowledgeRisk: project.llmConfiguration.knowledgeRisk ?? null,
      }),
    ),
    createFile(
      "UsageIntelligence.asset.json",
      toJson({
        usageIntelligence: project.llmConfiguration.usageIntelligence ?? null,
      }),
    ),
    createFile(
      "EvolutionContext.asset.json",
      toJson({
        evolutionContext: project.llmConfiguration.evolutionContext ?? null,
      }),
    ),
    createFile(
      "EvolutionInsertionBlocks.asset.json",
      toJson({
        insertionBlocks: project.llmConfiguration.evolutionContext?.insertionBlocks ?? [],
        divider: project.llmConfiguration.evolutionContext?.insertionBlocks?.[0]?.divider ?? "-----------------------------------",
      }),
    ),
    createFile(
      "RuntimeVersatility.asset.json",
      toJson({
        runtimeVersatilityPlan: project.design.runtimeVersatilityPlan,
      }),
    ),
    createFile(
      "RuntimePlaybook.asset.json",
      toJson({
        runtimePlaybook,
      }),
    ),
    createFile(
      "RuntimeEncounterDirector.asset.json",
      toJson({
        runtimeEncounterDirector,
      }),
    ),
    createFile(
      "RuntimeEncounterCadence.asset.json",
      toJson({
        scenarioLabel: runtimeEncounterDirector.scenarioLabel,
        chainLabel: runtimeEncounterDirector.chainLabel,
        cadenceWindows: runtimeEncounterDirector.cadenceWindows,
        promptBridge: runtimeEncounterDirector.promptBridge,
      }),
    ),
    createFile(
      "AssetPlan.asset.json",
      toJson({
        productionStyle: project.design.assetPlan.productionStyle,
        assetSystemSummary: project.design.assetPlan.assetSystemSummary,
        assetPipelineSummary: project.design.assetPlan.assetPipelineSummary,
        modelGenerationSummary: project.design.assetPlan.modelGenerationSummary,
        kitArchitecture: project.design.assetPlan.kitArchitecture,
        assemblyStrategy: project.design.assetPlan.assemblyStrategy,
        orchestrationStrategy: project.design.assetPlan.orchestrationStrategy,
        characterStrategy: project.design.assetPlan.characterStrategy,
        propStrategy: project.design.assetPlan.propStrategy,
        environmentStrategy: project.design.assetPlan.environmentStrategy,
        materialPalette: project.design.assetPlan.materialPalette,
        animationNeeds: project.design.assetPlan.animationNeeds,
        reuseDirectives: project.design.assetPlan.reuseDirectives,
        stateModelRules: project.design.assetPlan.stateModelRules,
        spawnRules: project.design.assetPlan.spawnRules,
        productionPhases: project.design.assetPlan.productionPhases,
        integrationContracts: project.design.assetPlan.integrationContracts,
        generationRules: project.design.assetPlan.generationRules,
        specialistTracks: project.design.assetPlan.specialistTracks,
        reviewPasses: project.design.assetPlan.reviewPasses,
        qualityGates: project.design.assetPlan.qualityGates,
        toolchainQualityChecks: project.design.assetPlan.toolchainQualityChecks,
      }),
    ),
    createFile(
      "GraphicsPlan.asset.json",
      toJson(project.design.graphicsPlan),
    ),
    createFile(
      "EnginePlan.asset.json",
      toJson(project.design.enginePlan),
    ),
    createFile(
      "PromptCouncil.asset.json",
      toJson({
        promptCouncilPlan: project.design.promptCouncilPlan,
      }),
    ),
    createFile(
      "GenerationCandidates.asset.json",
      toJson({
        candidatePlan: project.design.candidatePlan,
      }),
    ),
    createFile(
      "GenerationEvaluation.asset.json",
      toJson({
        evaluationPlan: project.design.evaluationPlan,
      }),
    ),
    createFile(
      "GenerationDiversity.asset.json",
      toJson({
        diversityPlan: project.design.diversityPlan,
      }),
    ),
    createFile(
      "FeedbackLearning.asset.json",
      toJson(feedbackLearning),
    ),
    createFile(
      "RepairBlueprint.asset.json",
      toJson({
        recognizedIssues: feedbackLearning.recognizedIssues,
        sourceRepairPlan: feedbackLearning.sourceRepairPlan,
        generationRepairPlan: feedbackLearning.generationRepairPlan,
        learningSignals: feedbackLearning.learningSignals,
      }),
    ),
    createFile(
      "CharacterRoster.asset.json",
      toJson({
        characterBlueprints: project.design.assetPlan.characterBlueprints,
        characterStrategy: project.design.assetPlan.characterStrategy,
        animationNeeds: project.design.assetPlan.animationNeeds,
      }),
    ),
    createFile(
      "PropCatalog.asset.json",
      toJson({
        propBlueprints: project.design.assetPlan.propBlueprints,
        propStrategy: project.design.assetPlan.propStrategy,
        spawnRules: project.design.assetPlan.spawnRules,
      }),
    ),
    createFile(
      "EnvironmentKit.asset.json",
      toJson({
        environmentKits: project.design.assetPlan.environmentKits,
        environmentStrategy: project.design.assetPlan.environmentStrategy,
        kitArchitecture: project.design.assetPlan.kitArchitecture,
      }),
    ),
    createFile(
      "AssetIntegration.asset.json",
      toJson({
        integrationContracts: project.design.assetPlan.integrationContracts,
        productionPhases: project.design.assetPlan.productionPhases,
        reuseDirectives: project.design.assetPlan.reuseDirectives,
        stateModelRules: project.design.assetPlan.stateModelRules,
        orchestrationStrategy: project.design.assetPlan.orchestrationStrategy,
        toolchainQualityChecks: project.design.assetPlan.toolchainQualityChecks,
      }),
    ),
    createFile(
      "ModelGenerationToolchains.asset.json",
      toJson({
        modelGenerationSummary: project.design.assetPlan.modelGenerationSummary,
        orchestrationStrategy: project.design.assetPlan.orchestrationStrategy,
        generationToolchains: project.design.assetPlan.generationToolchains,
        toolchainQualityChecks: project.design.assetPlan.toolchainQualityChecks,
      }),
    ),
    createFile(
      "AssetGeneratorSources.asset.json",
      toJson({
        sourceInspirations: project.design.assetPlan.sourceInspirations,
      }),
    ),
  ]

  const projectedAssetFiles = [
    ...assetFiles,
    ...coreFiles,
    createFile("GenerationVerification.asset.json", "{}"),
  ]
  const generationAudit = buildProjectGenerationAudit({
    ...project,
    codeFiles,
    assetFiles: projectedAssetFiles,
  })

  return [
    ...assetFiles,
    ...coreFiles,
    createFile(
      "GenerationVerification.asset.json",
      toJson(generationAudit),
    ),
  ]
}

function mergeWorkspaceFiles(
  existingFiles: Partial<ProjectWorkspaceFile>[] | undefined,
  generatedFiles: ProjectWorkspaceFile[],
): ProjectWorkspaceFile[] {
  const normalizedExisting = normalizeWorkspaceFiles(existingFiles, [])
  const existingByName = new Map(normalizedExisting.map((file) => [file.name, file]))
  const generatedNames = new Set(generatedFiles.map((file) => file.name))

  const merged = generatedFiles.map((file) => existingByName.get(file.name) ?? file)

  normalizedExisting.forEach((file) => {
    if (!generatedNames.has(file.name)) {
      merged.push(file)
    }
  })

  return merged.map((file) => createFile(file.name, file.content))
}

export function ensureProjectWorkspace(project: UserProject): UserProject {
  const providerDiagnostics = project.llmConfiguration.providerDiagnostics
    ?? buildGenerationProviderDiagnosticsSummary({
      failures: project.llmConfiguration.providerFailures,
      operationalAnalytics: project.llmConfiguration.operationalAnalytics ?? project.llmConfiguration.loopReport?.operationalAnalytics,
    })
  const generatedCodeFiles = createGeneratedCodeFiles(project)
  const generatedAssetFiles = createGeneratedAssetFiles(project, generatedCodeFiles)

  return {
    ...project,
    llmConfiguration: {
      ...project.llmConfiguration,
      providerDiagnostics,
    },
    codeFiles: normalizeWorkspaceFiles(project.codeFiles, generatedCodeFiles),
    assetFiles: normalizeWorkspaceFiles(project.assetFiles, generatedAssetFiles),
  }
}

export function rebuildProjectWorkspace(project: UserProject): UserProject {
  const providerDiagnostics = project.llmConfiguration.providerDiagnostics
    ?? buildGenerationProviderDiagnosticsSummary({
      failures: project.llmConfiguration.providerFailures,
      operationalAnalytics: project.llmConfiguration.operationalAnalytics ?? project.llmConfiguration.loopReport?.operationalAnalytics,
    })
  const generatedCodeFiles = createGeneratedCodeFiles(project)
  const generatedAssetFiles = createGeneratedAssetFiles(project, generatedCodeFiles)

  return {
    ...project,
    llmConfiguration: {
      ...project.llmConfiguration,
      providerDiagnostics,
    },
    codeFiles: mergeWorkspaceFiles(project.codeFiles, generatedCodeFiles),
    assetFiles: mergeWorkspaceFiles(project.assetFiles, generatedAssetFiles),
  }
}
