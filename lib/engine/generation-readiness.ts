
import { AGENT_KNOWLEDGE, AGENTS_LIST } from "@/lib/engine/agents"
import { buildFeedbackLearningReport } from "@/lib/engine/feedback-learning"
import { buildGenerationProviderDiagnosticsSummary } from "@/lib/engine/provider-diagnostics"
import { buildRuntimeEncounterDirector } from "@/lib/engine/runtime-encounters"
import type {
  AgentName,
  ProjectWorkspaceFile,
  UserProject,
} from "@/lib/engine/types"
import { pluginRegistry } from "@/lib/engine/plugin"

export interface ProjectSystemAgentAssignment {
  systemName: string
  displayName: string
  agentName: AgentName
  agentDisplayName: string
  rationale: string
}

export interface ProjectAgentBrief {
  agentName: AgentName
  displayName: string
  assignedSystems: string[]
  originalPrompt: string
  promptSummary: string
  engineContext: string[]
  generatedContext: string[]
  evolutionAdvisory: string[]
  verificationChecklist: string[]
  runtimeEncounterContext: string[]
  mission: string
}

export interface ProjectGenerationContext {
  projectName: string
  originalPrompt: string
  promptSummary: string
  generatedPitch: string
  inputBoundary: {
    explicitPrompt: string
    preparationDiff: string[]
    missingCriteria: string[]
    evolutionPolicy: string
  }
  evolutionContext: {
    advisoryOnly: boolean
    cacheLines: string[]
    alphabeticalAdditions: string[]
    insertionBlocks: string[]
    learnings: string[]
  }
  knowledgeCoverage: {
    summary: string
    recommendedContext: string[]
    gapWarnings: string[]
    verificationFocus: string[]
  }
  knowledgeRisk: {
    level: "aligned" | "watch" | "risky"
    summary: string
    blockers: string[]
    warnings: string[]
    releasePressure: string[]
  }
  usageIntelligence: {
    summary: string
    suggestedProviders: string[]
    manifestPressure: string[]
    compilePressure: string[]
    releasePressure: string[]
  }
  providerDiagnostics: {
    summary: string
    highestSeverity: "info" | "warning" | "error" | "critical"
    unresolvedFailures: number
    recoveredFailures: number
    categories: string[]
    retryStrategies: string[]
    actionItems: string[]
    healthSignals: string[]
  }
  engineContext: {
    activeEngine: string
    recommendedEngine: string
    runtimeLabel: string
    graphicsPath: string
    criticalSubsystems: string[]
  }
  runtimeEncounter: {
    scenarioLabel: string
    chainLabel: string
    continuityRules: string[]
    cadenceWindows: string[]
  }
  generatedSystems: Array<{
    name: string
    displayName: string
    linesGenerated: number
    assignedAgent: AgentName
  }>
  existingOutputs: {
    codeFiles: string[]
    assetFiles: string[]
  }
  qualityTargets: string[]
  agentAssignments: ProjectSystemAgentAssignment[]
  agentBriefs: ProjectAgentBrief[]
}

export interface ProjectGenerationAuditCheck {
  id: string
  label: string
  status: "pass" | "warning" | "fail"
  severity: "low" | "medium" | "high"
  detail: string
  fix: string
}

export interface ProjectGenerationAudit {
  checkedAt: string
  releaseDecision: "ready" | "needs_review" | "blocked"
  summary: string
  totals: {
    checks: number
    passing: number
    warnings: number
    failures: number
  }
  checks: ProjectGenerationAuditCheck[]
}

const AGENT_ASSIGNMENT_RULES: Array<{
  agentName: AgentName
  patterns: RegExp[]
  rationale: string
}> = [
  {
    agentName: "renderer",
    patterns: [/render/i, /post_process/i, /sightline/i, /tile_streaming/i, /lod_streaming/i, /graphics/i],
    rationale: "Owns rendering fidelity, visibility, and presentation-sensitive runtime systems.",
  },
  {
    agentName: "network",
    patterns: [/network/i, /session_flow/i, /replication/i, /voice/i, /multiplayer/i],
    rationale: "Owns multiplayer choreography, synchronization, and authority-sensitive flows.",
  },
  {
    agentName: "physics",
    patterns: [/physics/i, /vehicle/i, /hazard/i, /navigation/i, /spatial/i],
    rationale: "Owns movement constraints, collision-heavy behaviors, and traversal simulation.",
  },
  {
    agentName: "audio",
    patterns: [/audio/i, /music/i, /voice/i],
    rationale: "Owns audio systems, adaptive feedback, and spatial sound presentation.",
  },
  {
    agentName: "procedural",
    patterns: [/world_gen/i, /map_builder/i, /route_planner/i, /settlement/i, /terrain/i, /content_scaler/i],
    rationale: "Owns world layout, procedural assembly, and large-scale content generation passes.",
  },
  {
    agentName: "optimizer",
    patterns: [/optimizer/i, /streaming/i, /save_state/i, /budget/i, /performance/i],
    rationale: "Owns frame budgets, scaling, state safety, and production-readiness tuning.",
  },
  {
    agentName: "tooling",
    patterns: [/debug/i, /tool/i, /pipeline/i, /validation/i, /asset_integration/i],
    rationale: "Owns pipeline verification, debug surfaces, and integration-readiness checks.",
  },
  {
    agentName: "gameplay",
    patterns: [/combat/i, /inventory/i, /quest/i, /objective/i, /economy/i, /relationship/i, /crop/i, /loop/i, /director/i, /operation/i, /trade/i, /faction/i, /dialogue/i, /puzzle/i],
    rationale: "Owns player verbs, progression, systemic rules, and core gameplay loops.",
  },
]

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function includesNoCombatConstraint(project: UserProject) {
  return project.design.negativeConstraints.some((constraint) => /combat/i.test(constraint))
}

function includesThreeDimensionalSignals(project: UserProject) {
  return /3d|first[- ]person|third[- ]person|immersive/i.test([
    project.design.graphicsPlan.renderPath,
    project.design.runtimePlan.cameraModel,
    project.design.cameraStyle,
  ].join(" "))
}

function findCodeFileForSystem(systemName: string, codeFiles: ProjectWorkspaceFile[]) {
  const token = systemName.replace(/_/g, "").toLowerCase()
  return codeFiles.find((file) => file.name.replace(/[^a-z0-9]/gi, "").toLowerCase().includes(token))
}

function expectedCodeExtension(engine: UserProject["engine"]) {
  switch (engine) {
    case "godot":
      return ".gd"
    case "unity":
      return ".cs"
    case "custom":
      return ".hpp"
    default:
      return ".cpp"
  }
}

function hasEngineCompileMarkers(file: ProjectWorkspaceFile, engine: UserProject["engine"]) {
  switch (engine) {
    case "godot":
      return /extends Node|class_name/i.test(file.content)
    case "unity":
      return /using UnityEngine;|namespace Nexus\./i.test(file.content)
    case "custom":
      return /#pragma once|namespace nexus::/i.test(file.content)
    default:
      return /UCLASS|UPROPERTY|generated\.h|CoreMinimal\.h/i.test(file.content)
  }
}

export function assignAgentToSystem(systemName: string): ProjectSystemAgentAssignment["agentName"] {
  const matchedRule = AGENT_ASSIGNMENT_RULES.find((rule) => rule.patterns.some((pattern) => pattern.test(systemName)))
  return matchedRule?.agentName ?? "architect"
}

export function buildProjectSystemAgentAssignments(project: UserProject): ProjectSystemAgentAssignment[] {
  return project.systems.map((system) => {
    const agentName = assignAgentToSystem(system.name)
    const rule = AGENT_ASSIGNMENT_RULES.find((entry) => entry.agentName === agentName)
    const agent = AGENTS_LIST.find((entry) => entry.name === agentName)

    return {
      systemName: system.name,
      displayName: system.displayName,
      agentName,
      agentDisplayName: agent?.displayName ?? agentName,
      rationale: rule?.rationale ?? "Owns architectural coherence and cross-system integration.",
    }
  })
}

export function buildProjectAgentBriefs(project: UserProject): ProjectAgentBrief[] {
  const assignments = buildProjectSystemAgentAssignments(project)
  const feedbackLearning = buildFeedbackLearningReport(project)
  const runtimeEncounterDirector = buildRuntimeEncounterDirector(project)
  const evolutionContext = project.llmConfiguration.evolutionContext
  const knowledgeCoverage = project.llmConfiguration.knowledgeCoverage
  const knowledgeRisk = project.llmConfiguration.knowledgeRisk
  const usageIntelligence = project.llmConfiguration.usageIntelligence
  const providerDiagnostics = project.llmConfiguration.providerDiagnostics
    ?? buildGenerationProviderDiagnosticsSummary({
      failures: project.llmConfiguration.providerFailures,
      operationalAnalytics: project.llmConfiguration.operationalAnalytics ?? project.llmConfiguration.loopReport?.operationalAnalytics,
    })

  return AGENTS_LIST.map((agent) => {
    const assignedSystems = assignments
      .filter((assignment) => assignment.agentName === agent.name)
      .map((assignment) => assignment.displayName)

    const knowledge = AGENT_KNOWLEDGE[agent.name]
    const evolutionAdvisory = unique([
      ...(evolutionContext?.cacheLines ?? []).map((entry) => entry.label),
      ...(evolutionContext?.alphabeticalAdditions ?? []).flatMap((entry) => entry.additions),
      ...(evolutionContext?.insertionBlocks ?? []).flatMap((block) => [block.startAnchor, block.endAnchor, ...block.promptInsertions]),
      ...(evolutionContext?.userLearnings ?? []),
      ...(evolutionContext?.globalLearnings ?? []),
    ]).slice(0, 8)

    const generatedContext = unique([
      ...assignedSystems,
      ...project.design.knowledgeDomains,
      ...project.design.enginePlan.criticalSubsystems,
      ...project.design.graphicsPlan.frameBudgetPriorities,
      ...project.design.pipelinePlan.qualityGates,
      ...project.design.assetPlan.generationToolchains.map((toolchain) => toolchain.label),
      ...project.design.assetPlan.generationToolchains.flatMap((toolchain) => toolchain.outputs),
      ...project.design.assetPlan.integrationContracts.flatMap((contract) => contract.targetSystems),
      ...(knowledgeCoverage?.recommendedContext ?? []),
      ...(knowledgeRisk?.critiquePressure ?? []),
      ...(usageIntelligence?.manifestPressure ?? []),
      ...(usageIntelligence?.routingPressure ?? []),
      ...providerDiagnostics.actionItems,
      ...providerDiagnostics.healthSignals,
      ...feedbackLearning.generationRepairPlan.promptRepairs,
      ...feedbackLearning.generationRepairPlan.runtimeRepairs,
    ]).slice(0, 10)
    const verificationChecklist = unique([
      ...project.design.evaluationPlan.rubrics.map((rubric) => `${rubric.label} >= ${rubric.passThreshold}`),
      ...project.design.pipelinePlan.qualityGates,
      ...project.design.assetPlan.qualityGates,
      ...(knowledgeCoverage?.verificationFocus ?? []),
      ...(knowledgeRisk?.releasePressure ?? []),
      ...(usageIntelligence?.releasePressure ?? []),
      ...(usageIntelligence?.compilePressure ?? []),
      ...providerDiagnostics.actionItems,
      ...feedbackLearning.generationRepairPlan.evalAdditions,
      project.design.runtimePlan.reason,
    ]).slice(0, 8)

    return {
      agentName: agent.name,
      displayName: agent.displayName,
      assignedSystems,
      originalPrompt: project.description,
      promptSummary: project.design.promptSummary,
      engineContext: unique([
        project.engine,
        project.design.enginePlan.recommendedEngine,
        project.design.graphicsPlan.renderPath,
        project.design.runtimePlan.label,
        ...knowledge.expertise,
      ]).slice(0, 8),
      generatedContext,
      evolutionAdvisory,
      verificationChecklist,
      runtimeEncounterContext: unique([
        runtimeEncounterDirector.scenarioLabel,
        runtimeEncounterDirector.chainLabel,
        ...runtimeEncounterDirector.promptBridge.continuityRules,
        ...runtimeEncounterDirector.cadenceWindows.map((window) => `${window.label}: ${window.runtimeHook}`),
      ]).slice(0, 8),
      mission: assignedSystems.length > 0
        ? `Use the original prompt, the saved generation profile, the encounter cadence, and the existing workspace outputs to keep ${assignedSystems.join(", ")} aligned with the ${project.design.runtimePlan.label.toLowerCase()} runtime. Treat evolution memory as advisory pressure only.`
        : `Stay available as a specialist reviewer so the final project still respects the original prompt, encounter cadence, engine plan, and generated systems. Treat evolution memory as advisory pressure only.`,
    }
  })
}

export function buildProjectGenerationContext(project: UserProject): ProjectGenerationContext {
  const assignments = buildProjectSystemAgentAssignments(project)
  const agentBriefs = buildProjectAgentBriefs(project)
  const runtimeEncounterDirector = buildRuntimeEncounterDirector(project)
  const evolutionContext = project.llmConfiguration.evolutionContext
  const knowledgeCoverage = project.llmConfiguration.knowledgeCoverage
  const knowledgeRisk = project.llmConfiguration.knowledgeRisk
  const usageIntelligence = project.llmConfiguration.usageIntelligence
  const providerDiagnostics = project.llmConfiguration.providerDiagnostics
    ?? buildGenerationProviderDiagnosticsSummary({
      failures: project.llmConfiguration.providerFailures,
      operationalAnalytics: project.llmConfiguration.operationalAnalytics ?? project.llmConfiguration.loopReport?.operationalAnalytics,
    })

  return {
    projectName: project.name,
    originalPrompt: project.description,
    promptSummary: project.design.promptSummary,
    generatedPitch: project.design.generatedPitch,
    inputBoundary: {
      explicitPrompt: project.description,
      preparationDiff: (project.llmConfiguration.preparationDiff ?? []).map((entry) => `${entry.field}: ${entry.inferredValue}`),
      missingCriteria: (project.llmConfiguration.loopReport?.missingCriteria ?? []).map((entry) => `${entry.field}: ${entry.suggestedFill}`),
      evolutionPolicy: "Evolution memory stays advisory only and does not replace the user's explicit prompt or locked settings.",
    },
    evolutionContext: {
      advisoryOnly: true,
      cacheLines: (evolutionContext?.cacheLines ?? []).map((entry) => `${entry.label}: ${entry.line}`),
      alphabeticalAdditions: (evolutionContext?.alphabeticalAdditions ?? []).map((entry) => `${entry.start} -> ${entry.additions.join(", ") || "none"} -> ${entry.end}`),
      insertionBlocks: (evolutionContext?.insertionBlocks ?? []).map((block) => `${block.startAnchor} ${block.divider} ${block.promptInsertions.join(" | ") || "none"} ${block.divider} ${block.endAnchor}`),
      learnings: unique([
        ...(evolutionContext?.userLearnings ?? []),
        ...(evolutionContext?.globalLearnings ?? []),
        ...(evolutionContext?.qualitySignals ?? []),
        ...(evolutionContext?.promptExpansionHints ?? []),
      ]).slice(0, 10),
    },
    knowledgeCoverage: {
      summary: knowledgeCoverage?.summary ?? "No explicit knowledge coverage was recorded for this generation.",
      recommendedContext: knowledgeCoverage?.recommendedContext ?? [],
      gapWarnings: (knowledgeCoverage?.gapWarnings ?? []).map((entry) => `${entry.label}: ${entry.reason}`),
      verificationFocus: knowledgeCoverage?.verificationFocus ?? [],
    },
    knowledgeRisk: {
      level: knowledgeRisk?.level ?? "aligned",
      summary: knowledgeRisk?.summary ?? "No elevated knowledge risk was recorded for this generation.",
      blockers: knowledgeRisk?.blockers ?? [],
      warnings: knowledgeRisk?.warnings ?? [],
      releasePressure: knowledgeRisk?.releasePressure ?? [],
    },
    usageIntelligence: {
      summary: usageIntelligence?.summary ?? "No AI-usage intelligence was recorded for this generation.",
      suggestedProviders: usageIntelligence?.suggestedProviders ?? [],
      manifestPressure: usageIntelligence?.manifestPressure ?? [],
      compilePressure: usageIntelligence?.compilePressure ?? [],
      releasePressure: usageIntelligence?.releasePressure ?? [],
    },
    providerDiagnostics: {
      summary: providerDiagnostics.summary,
      highestSeverity: providerDiagnostics.highestSeverity,
      unresolvedFailures: providerDiagnostics.unresolvedFailures,
      recoveredFailures: providerDiagnostics.recoveredFailures,
      categories: providerDiagnostics.categories,
      retryStrategies: providerDiagnostics.retryStrategies,
      actionItems: providerDiagnostics.actionItems,
      healthSignals: providerDiagnostics.healthSignals,
    },
    engineContext: {
      activeEngine: project.engine,
      recommendedEngine: project.design.enginePlan.recommendedEngine,
      runtimeLabel: project.design.runtimePlan.label,
      graphicsPath: project.design.graphicsPlan.renderPath,
      criticalSubsystems: project.design.enginePlan.criticalSubsystems,
    },
    runtimeEncounter: {
      scenarioLabel: runtimeEncounterDirector.scenarioLabel,
      chainLabel: runtimeEncounterDirector.chainLabel,
      continuityRules: runtimeEncounterDirector.promptBridge.continuityRules,
      cadenceWindows: runtimeEncounterDirector.cadenceWindows.map((window) => `${window.label}: ${window.objectiveFocus}`),
    },
    generatedSystems: project.systems.map((system) => ({
      name: system.name,
      displayName: system.displayName,
      linesGenerated: system.linesGenerated,
      assignedAgent: assignments.find((assignment) => assignment.systemName === system.name)?.agentName ?? "architect",
    })),
    existingOutputs: {
      codeFiles: project.codeFiles.map((file) => file.name),
      assetFiles: project.assetFiles.map((file) => file.name),
    },
    qualityTargets: unique([
      ...project.design.pipelinePlan.qualityGates,
      ...project.design.assetPlan.qualityGates,
      ...project.design.assetPlan.toolchainQualityChecks,
      ...project.design.evaluationPlan.rubrics.map((rubric) => rubric.label),
      ...project.design.runtimePlan.antiCollapseRules,
      ...runtimeEncounterDirector.promptBridge.continuityRules,
      ...(knowledgeCoverage?.verificationFocus ?? []),
      ...(knowledgeRisk?.releasePressure ?? []),
      ...(usageIntelligence?.releasePressure ?? []),
      ...(usageIntelligence?.compilePressure ?? []),
      ...providerDiagnostics.actionItems,
      ...providerDiagnostics.healthSignals,
    ]).slice(0, 16),
    agentAssignments: assignments,
    agentBriefs,
  }
}

function buildCheck(input: {
  id: string
  label: string
  pass: boolean
  severity?: "low" | "medium" | "high"
  detail: string
  fix: string
}): ProjectGenerationAuditCheck {
  return {
    id: input.id,
    label: input.label,
    status: input.pass ? "pass" : input.severity === "low" ? "warning" : "fail",
    severity: input.severity ?? "medium",
    detail: input.detail,
    fix: input.fix,
  }
}

export function buildProjectGenerationAudit(project: UserProject): ProjectGenerationAudit {
  const context = buildProjectGenerationContext(project)
  const checks: ProjectGenerationAuditCheck[] = []
  const codeFiles = project.codeFiles
  const assetFileNames = new Set(project.assetFiles.map((file) => file.name))
  const feedbackLearning = buildFeedbackLearningReport(project)
  const requiredAssetFiles = pluginRegistry.getPlugins().flatMap((plugin) =>
    plugin.execute(project).then((result) => result.outputs)
  ) ?? []

  checks.push(buildCheck({
    id: "prompt_trace",
    label: "Prompt trace recorded",
    pass: project.description.trim().length > 0 && project.design.promptSummary.trim().length > 0,
    severity: "high",
    detail: project.description.trim().length > 0
      ? `Original prompt and prompt summary are present for ${project.name}.`
      : "Original prompt is missing from the generated project context.",
    fix: "Always carry the creator prompt into the generation context and workspace assets before release.",
  }))

  checks.push(buildCheck({
    id: "runtime_contract",
    label: "Runtime contract is complete",
    pass: project.design.runtimePlan.playFocus.length > 0
      && project.design.runtimePlan.antiCollapseRules.length > 0
      && project.design.pipelinePlan.targetMinutes >= project.design.runtimePlan.targetSessionMinutes
      && project.design.pipelinePlan.targetMinutes <= 90,
    severity: "high",
    detail: `Runtime ${project.design.runtimePlan.label} targets ${project.design.pipelinePlan.targetMinutes} minutes with ${project.design.runtimePlan.antiCollapseRules.length} anti-collapse rules.`,
    fix: "Require runtime reasons, anti-collapse rules, and a bounded generation budget that is large enough to preserve the requested fantasy before surfacing the project.",
  }))

  checks.push(buildCheck({
    id: "usage_intelligence",
    label: "AI usage intelligence is attached",
    pass: Boolean(project.llmConfiguration.usageIntelligence) || project.llmConfiguration.source !== "user-key",
    severity: "low",
    detail: project.llmConfiguration.usageIntelligence?.summary ?? (
      project.llmConfiguration.source === "user-key"
        ? "No AI-usage advisory layer was recorded for this provider-backed generation."
        : "This local generation does not require provider-usage intelligence to pass readiness."
    ),
    fix: "Attach provider/model usage intelligence so manifest synthesis can reuse prior provider-backed success and failure patterns without overriding the prompt.",
  }))

  checks.push(buildCheck({
    id: "provider_diagnostics",
    label: "Provider diagnostics are classified and actionable",
    pass: context.providerDiagnostics.unresolvedFailures === 0
      || (
        context.providerDiagnostics.categories.length > 0
        && context.providerDiagnostics.retryStrategies.length > 0
        && context.providerDiagnostics.actionItems.length > 0
      ),
    severity: context.providerDiagnostics.highestSeverity === "critical" ? "high" : context.providerDiagnostics.highestSeverity === "error" ? "medium" : "low",
    detail: context.providerDiagnostics.summary,
    fix: context.providerDiagnostics.actionItems[0]
      ?? "Classify every provider failure with a category, retry strategy, and action item before release so issue feeds and operators know what to do next.",
  }))

  checks.push(buildCheck({
    id: "provider_signal_coverage",
    label: "Provider health signals are preserved",
    pass: (context.providerDiagnostics.healthSignals.length > 0)
      || (project.llmConfiguration.providerFailures?.length ?? 0) === 0,
    severity: (project.llmConfiguration.providerFailures?.length ?? 0) > 0 ? "medium" : "low",
    detail: context.providerDiagnostics.healthSignals.length > 0
      ? `${context.providerDiagnostics.healthSignals.length} provider health signals are attached to this generation context.`
      : "No provider health signals were recorded for this generation.",
    fix: "Preserve low-level provider signals like retry windows, free-model limits, unsupported parameters, empty responses, and privacy mismatches so debugging stays specific.",
  }))

  checks.push(buildCheck({
    id: "runtime_encounter_continuity",
    label: "Runtime encounter continuity is locked",
    pass: context.runtimeEncounter.continuityRules.length > 0
      && context.runtimeEncounter.cadenceWindows.length > 0,
    severity: "high",
    detail: `${context.runtimeEncounter.scenarioLabel} carries ${context.runtimeEncounter.cadenceWindows.length} cadence windows and ${context.runtimeEncounter.continuityRules.length} continuity rules.`,
    fix: "Persist the scenario chain, cadence windows, and continuity rules so provider loops and runtime playback stay aligned.",
  }))

  checks.push(buildCheck({
    id: "knowledge_risk",
    label: "Knowledge risk is bounded",
    pass: context.knowledgeRisk.level === "aligned",
    severity: context.knowledgeRisk.level === "risky" ? "medium" : "low",
    detail: context.knowledgeRisk.summary,
    fix: context.knowledgeRisk.releasePressure[0]
      ?? "Use the saved knowledge-risk pressure to strengthen critique, repair, and release verification before surfacing the project.",
  }))

  checks.push(buildCheck({
    id: "engine_context",
    label: "Engine and graphics context is attached",
    pass: project.design.enginePlan.criticalSubsystems.length > 0
      && project.design.graphicsPlan.frameBudgetPriorities.length > 0,
    severity: "high",
    detail: `${project.design.enginePlan.recommendedEngine} planning includes ${project.design.enginePlan.criticalSubsystems.length} critical subsystems and ${project.design.graphicsPlan.frameBudgetPriorities.length} frame priorities.`,
    fix: "Attach the engine plan, graphics plan, and frame-budget priorities to every generated project.",
  }))

  checks.push(buildCheck({
    id: "model_generation_context",
    label: "Model-generation toolchains are specified",
    pass: project.design.assetPlan.generationToolchains.length > 0
      && project.design.assetPlan.toolchainQualityChecks.length > 0,
    severity: "medium",
    detail: `${project.design.assetPlan.generationToolchains.length} toolchains and ${project.design.assetPlan.toolchainQualityChecks.length} toolchain checks are attached to the asset plan.`,
    fix: "Specify the open-source generation workflow, stage handoffs, and quality gates before presenting generated assets.",
  }))

  checks.push(buildCheck({
    id: "agent_briefs",
    label: "Agent briefs were built from prompt plus engine context",
    pass: context.agentBriefs.length === AGENTS_LIST.length,
    severity: "high",
    detail: `${context.agentBriefs.length} specialist briefs were created for the current project.`,
    fix: "Build a project-specific brief for every specialist agent before code and assets are accepted.",
  }))

  checks.push(buildCheck({
    id: "system_assignments",
    label: "Every generated system has an owning agent",
    pass: context.agentAssignments.length === project.systems.length,
    severity: "medium",
    detail: `${context.agentAssignments.length} agent assignments cover ${project.systems.length} generated systems.`,
    fix: "Assign every generated system to a specialist owner so debugging and repair prompts stay targeted.",
  }))

  checks.push(buildCheck({
    id: "code_workspace",
    label: "Code workspace is populated and traceable",
    pass: codeFiles.length >= project.systems.length
      && project.systems.every((system) => {
        const codeFile = findCodeFileForSystem(system.name, codeFiles)
        if (!codeFile) return false
        return codeFile.content.includes("Original Prompt:")
      }),
    severity: "high",
    detail: `${codeFiles.length} source files were generated, and each system should carry prompt-trace headers.`,
    fix: "Require every generated source file to include the original prompt, assigned agent, and verification focus in the header.",
  }))

  checks.push(buildCheck({
    id: "compile_surface",
    label: "Compile-readiness surface is present for the target engine",
    pass: codeFiles.length > 0
      && codeFiles.every((file) =>
        file.name.endsWith(expectedCodeExtension(project.engine))
        && hasEngineCompileMarkers(file, project.engine)
      ),
    severity: "high",
    detail: `${project.engine} build surface expects ${expectedCodeExtension(project.engine)} files with engine-specific compile markers across ${codeFiles.length} generated files.`,
    fix: "Before release, require every generated source file to match the target engine extension and include engine-specific compile markers so the build surface is testable.",
  }))

  checks.push(buildCheck({
    id: "asset_workspace",
    label: "Context and verification assets are present",
    pass: requiredAssetFiles.every((fileName) => assetFileNames.has(fileName as string)),
    severity: "high",
    detail: `${[...assetFileNames].length} asset files are present in the generated workspace.`,
    fix: "Emit manifest, context, agent briefing, pipeline, and verification assets before the project is shown.",
  }))

  checks.push(buildCheck({
    id: "compile_asset",
    label: "Compile-readiness audit is attached",
    pass: assetFileNames.has("CompileReadiness.asset.json"),
    severity: "high",
    detail: assetFileNames.has("CompileReadiness.asset.json")
      ? "CompileReadiness.asset.json is attached to the workspace."
      : "The compile-readiness asset is missing from the workspace.",
    fix: "Emit a machine-readable compile readiness asset before a generated project is presented.",
  }))

  checks.push(buildCheck({
    id: "candidate_eval_diversity",
    label: "Selection, eval, and diversity context is preserved",
    pass: project.design.candidatePlan.candidates.length > 0
      && project.design.evaluationPlan.rubrics.length > 0
      && project.design.diversityPlan.antiCollapseChecks.length > 0,
    severity: "medium",
    detail: `${project.design.candidatePlan.candidates.length} candidates, ${project.design.evaluationPlan.rubrics.length} rubrics, and ${project.design.diversityPlan.antiCollapseChecks.length} anti-collapse checks are available.`,
    fix: "Preserve candidate ranking, graders, and diversity memory so later prompts can repair or extend the project intelligently.",
  }))

  checks.push(buildCheck({
    id: "constraint_consistency",
    label: "Prompt constraints still match the generated profile",
    pass: !includesNoCombatConstraint(project) || !project.design.resolvedFeatures.includes("combat"),
    severity: includesNoCombatConstraint(project) ? "high" : "low",
    detail: includesNoCombatConstraint(project)
      ? `No-combat constraint is ${project.design.resolvedFeatures.includes("combat") ? "violated" : "preserved"} in the resolved feature set.`
      : "No hard no-combat constraint was detected for this project.",
    fix: "Run a final constraint sweep before presentation and block release if the runtime drifts from explicit prompt constraints.",
  }))

  checks.push(buildCheck({
    id: "multiplayer_consistency",
    label: "Multiplayer state is internally consistent",
    pass: project.multiplayer ? project.maxPlayers >= 2 : project.maxPlayers === 1,
    severity: "medium",
    detail: `Project is marked ${project.multiplayer ? `multiplayer (${project.maxPlayers})` : "solo"} in both prompt and profile state.`,
    fix: "Normalize max players against the resolved multiplayer mode before saving the project.",
  }))

  checks.push(buildCheck({
    id: "provider_trace",
    label: "Prompt provider configuration is traceable",
    pass: project.llmConfiguration.provider === "local"
      || typeof project.llmConfiguration.model === "string",
    severity: "medium",
    detail: project.llmConfiguration.provider === "local"
      ? "Local pipeline run is clearly recorded."
      : `Provider-backed run records ${project.llmConfiguration.provider} with model ${project.llmConfiguration.model ?? "unknown"}.`,
    fix: "Persist provider, model, and prompt stage metadata for every provider-backed generation run.",
  }))

  checks.push(buildCheck({
    id: "three_d_fidelity",
    label: "3D prompts stay 3D in presentation planning",
    pass: project.dimension !== "3d" || includesThreeDimensionalSignals(project),
    severity: project.dimension === "3d" ? "high" : "low",
    detail: project.dimension === "3d"
      ? `${project.design.graphicsPlan.renderPath} and ${project.design.runtimePlan.cameraModel} are enforcing 3D presentation.`
      : "Project is not 3D, so no 3D-specific validation was required.",
    fix: "Block fallback runtimes that strip 3D camera, render-path, or traversal assumptions from 3D prompts.",
  }))

  checks.push(buildCheck({
    id: "feedback_repair_loop",
    label: "Repair loop is ready for debugging and improvement",
    pass: feedbackLearning.generationRepairPlan.evalAdditions.length > 0
      || feedbackLearning.digest.totalReports === 0,
    severity: "low",
    detail: feedbackLearning.digest.totalReports > 0
      ? `${feedbackLearning.generationRepairPlan.evalAdditions.length} eval additions and ${feedbackLearning.sourceRepairPlan.length} source repair targets are available.`
      : "No player feedback exists yet, so the repair loop is idle but ready.",
    fix: "Feed player failures back into prompt repairs, runtime repairs, and regression checks for the next generation pass.",
  }))

  const failures = checks.filter((check) => check.status === "fail")
  const warnings = checks.filter((check) => check.status === "warning")
  const passing = checks.filter((check) => check.status === "pass")
  const releaseDecision = failures.some((check) => check.severity === "high")
    ? "blocked"
    : failures.length > 0 || warnings.length > 0
      ? "needs_review"
      : "ready"

  return {
    checkedAt: new Date().toISOString(),
    releaseDecision,
    summary: releaseDecision === "ready"
      ? "All generation context, agent briefing, and verification gates passed."
      : releaseDecision === "blocked"
        ? "Critical generation verification failures blocked release."
        : "Generation completed with non-critical issues that should be reviewed.",
    totals: {
      checks: checks.length,
      passing: passing.length,
      warnings: warnings.length,
      failures: failures.length,
    },
    checks,
  }
}
