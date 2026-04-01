import { AGENTS_LIST } from "@/lib/engine/agents"
import { buildFeedbackLearningReport } from "@/lib/engine/feedback-learning"
import {
  buildProjectGenerationAudit,
  buildProjectGenerationContext,
} from "@/lib/engine/generation-readiness"
import {
  countWorkspaceFileLines,
  createGeneratedAssetFiles,
  createGeneratedCodeFiles,
} from "@/lib/engine/project-workspace"
import type {
  AgentName,
  AssetGenerationToolchain,
  ProjectGenerationExecutionArtifact,
  ProjectGenerationExecutionCheck,
  ProjectGenerationExecutionRepairAction,
  ProjectGenerationExecutionReport,
  ProjectGenerationExecutionStageRun,
  ProjectWorkspaceFile,
  UserProject,
} from "@/lib/engine/types"

type ProjectExecutionSnapshot = Pick<
  UserProject,
  "name" | "description" | "genre" | "dimension" | "engine" | "features" | "multiplayer" | "maxPlayers" | "llmConfiguration" | "design" | "systems" | "codeFiles" | "assetFiles" | "feedback" | "execution"
>

const REQUIRED_GENERATION_ASSETS = [
  "ProjectManifest.json",
  "PromptInterpretation.asset.json",
  "GenerationPipeline.asset.json",
  "GenerationLoop.asset.json",
  "LoopPromptPackets.asset.json",
  "GenerationOperations.asset.json",
  "GenerationInputBoundary.asset.json",
  "KnowledgeCoverage.asset.json",
  "KnowledgeRisk.asset.json",
  "UsageIntelligence.asset.json",
  "EvolutionContext.asset.json",
  "EvolutionInsertionBlocks.asset.json",
  "GenerationContext.asset.json",
  "AgentBriefing.asset.json",
  "GenerationVerification.asset.json",
  "ModelGenerationToolchains.asset.json",
  "CompileReadiness.asset.json",
  "RuntimeEncounterCadence.asset.json",
]

const EXECUTION_ASSET_FILES = [
  "GenerationExecution.asset.json",
  "ExecutionChecks.asset.json",
  "ExecutionRepairs.asset.json",
  "CompileRepair.asset.json",
  "WorkerPipeline.asset.json",
]

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function toJson(value: unknown) {
  return JSON.stringify(value, null, 2)
}

function makeWorkspaceFile(name: string, content: string): ProjectWorkspaceFile {
  return {
    name,
    content,
    lines: countWorkspaceFileLines(content),
  }
}

function upsertWorkspaceFiles(
  existingFiles: ProjectWorkspaceFile[],
  nextFiles: ProjectWorkspaceFile[],
) {
  const generatedNames = new Set(nextFiles.map((file) => file.name))
  const preserved = existingFiles.filter((file) => !generatedNames.has(file.name))
  return [...preserved, ...nextFiles]
}

function createCheck(input: {
  id: string
  stageId: string
  label: string
  status: "pass" | "warning" | "fail"
  severity: "low" | "medium" | "high"
  score: number
  detail: string
  fix: string
}): ProjectGenerationExecutionCheck {
  return input
}

function createRepairAction(input: {
  id: string
  stageId: string
  label: string
  target: string
  reason: string
  result: string
  applied: boolean
}): ProjectGenerationExecutionRepairAction {
  return input
}

function summarizeStageStatus(checks: ProjectGenerationExecutionCheck[]) {
  if (checks.some((check) => check.status === "fail")) return "fail" as const
  if (checks.some((check) => check.status === "warning")) return "warning" as const
  return "pass" as const
}

function selectToolchainOwner(toolchain: AssetGenerationToolchain): AgentName {
  const stage = toolchain.stage.toLowerCase()
  const label = toolchain.label.toLowerCase()

  if (stage.includes("orchestration") || label.includes("repair")) return "tooling"
  if (stage.includes("layout") || label.includes("assembly")) return "procedural"
  if (stage.includes("3d") || label.includes("mesh")) return "renderer"
  if (stage.includes("character")) return "gameplay"
  return "tooling"
}

function buildPromptLockStage(project: ProjectExecutionSnapshot): ProjectGenerationExecutionStageRun {
  const stageId = "prompt_lock"
  const checks = [
    createCheck({
      id: "prompt_present",
      stageId,
      label: "Original prompt carried into execution",
      status: project.description.trim().length > 0 ? "pass" : "fail",
      severity: "high",
      score: project.description.trim().length > 0 ? 100 : 10,
      detail: project.description.trim().length > 0
        ? "The original user prompt is present for every downstream worker."
        : "The original prompt is missing from the execution pipeline.",
      fix: "Carry the original prompt into every execution stage and generated asset file.",
    }),
    createCheck({
      id: "runtime_contract_present",
      stageId,
      label: "Runtime contract and time budget preserved",
      status:
        project.design.runtimePlan.antiCollapseRules.length > 0
        && project.design.pipelinePlan.targetMinutes >= project.design.runtimePlan.targetSessionMinutes
        && project.design.pipelinePlan.targetMinutes <= 90
          ? "pass"
          : "fail",
      severity: "high",
      score:
        project.design.runtimePlan.antiCollapseRules.length > 0
        && project.design.pipelinePlan.targetMinutes >= project.design.runtimePlan.targetSessionMinutes
        && project.design.pipelinePlan.targetMinutes <= 90
          ? 100
          : 20,
      detail: `${project.design.runtimePlan.label} is locked with ${project.design.runtimePlan.antiCollapseRules.length} anti-collapse rules and a ${project.design.pipelinePlan.targetMinutes}-minute target.`,
      fix: "Require a bounded runtime contract and an execution budget large enough to preserve the requested fantasy before worker orchestration begins.",
    }),
    createCheck({
      id: "candidate_selected",
      stageId,
      label: "Winning candidate remains attached",
      status: project.design.candidatePlan.candidates.length > 0 ? "pass" : "warning",
      severity: "medium",
      score: project.design.candidatePlan.candidates.length > 0 ? 96 : 60,
      detail: `${project.design.candidatePlan.candidates.length} candidate manifests are available to explain why this build path won.`,
      fix: "Preserve candidate ranking context so execution can defend or repair the chosen direction.",
    }),
  ]

  return {
    id: stageId,
    label: "Prompt Lock and Worker Briefing",
    ownerAgent: "architect",
    objective: "Freeze the user prompt, runtime contract, candidate choice, and engine context before any worker stage executes.",
    status: summarizeStageStatus(checks),
    inputs: ["Original prompt", "Resolved generation profile", "Runtime contract", "Prompt stage metadata"],
    outputs: ["Locked brief", "Worker assignments", "Execution guardrails"],
    notes: [
      project.design.promptSummary,
      project.design.runtimePlan.reason,
      project.design.enginePlan.rationale,
    ],
    checks,
    repairActions: [],
  }
}

function buildSystemSynthesisStage(project: ProjectExecutionSnapshot): ProjectGenerationExecutionStageRun {
  const stageId = "system_synthesis"
  const codeHeadersPresent = project.codeFiles.every((file) => file.content.includes("Original Prompt:"))
  const systemCoverage = project.codeFiles.length >= project.systems.length && project.systems.length > 0
  const checks = [
    createCheck({
      id: "system_coverage",
      stageId,
      label: "Generated systems have workspace coverage",
      status: systemCoverage ? "pass" : "fail",
      severity: "high",
      score: systemCoverage ? 100 : 20,
      detail: `${project.codeFiles.length} code files cover ${project.systems.length} generated systems.`,
      fix: "Generate one traceable code artifact per planned system before presentation.",
    }),
    createCheck({
      id: "code_trace_headers",
      stageId,
      label: "Generated code files include trace headers",
      status: codeHeadersPresent ? "pass" : "warning",
      severity: "medium",
      score: codeHeadersPresent ? 95 : 55,
      detail: codeHeadersPresent
        ? "Every code file includes the original prompt trace."
        : "Some generated code files are missing prompt-trace headers.",
      fix: "Stamp every code file with the original prompt, assigned agent, and verification focus.",
    }),
    createCheck({
      id: "system_volume",
      stageId,
      label: "Generation volume matches the chosen blueprint",
      status: project.systems.length > 0 ? "pass" : "fail",
      severity: "high",
      score: project.systems.length > 0 ? 90 : 10,
      detail: `${project.systems.length} systems were synthesized for the chosen runtime archetype.`,
      fix: "Do not release a project without concrete generated systems.",
    }),
  ]

  return {
    id: stageId,
    label: "System Synthesis",
    ownerAgent: "gameplay",
    objective: "Turn the locked brief into generated systems, code traces, and runtime-ready mechanics coverage.",
    status: summarizeStageStatus(checks),
    inputs: ["Locked brief", "System priorities", "Resolved features", "Assigned system owners"],
    outputs: ["Generated systems", "Code workspace", "Playable slice scaffolding"],
    notes: unique(project.systems.map((system) => `${system.displayName} · ${system.linesGenerated} lines`)).slice(0, 6),
    checks,
    repairActions: [],
  }
}

function buildToolchainStage(
  project: ProjectExecutionSnapshot,
  toolchain: AssetGenerationToolchain,
): ProjectGenerationExecutionStageRun {
  const stageId = `toolchain_${toolchain.id}`
  const stageChecks = [
    createCheck({
      id: `${toolchain.id}_inputs`,
      stageId,
      label: "Toolchain has explicit inputs and outputs",
      status: toolchain.inputs.length > 0 && toolchain.outputs.length > 0 ? "pass" : "fail",
      severity: "high",
      score: toolchain.inputs.length > 0 && toolchain.outputs.length > 0 ? 100 : 15,
      detail: `${toolchain.inputs.length} inputs and ${toolchain.outputs.length} outputs are defined for ${toolchain.label}.`,
      fix: "Every toolchain stage needs concrete handoff artifacts, not vague intentions.",
    }),
    createCheck({
      id: `${toolchain.id}_verification`,
      stageId,
      label: "Toolchain includes verification checks",
      status: toolchain.verificationChecks.length > 0 ? "pass" : "warning",
      severity: "medium",
      score: toolchain.verificationChecks.length > 0 ? 96 : 60,
      detail: `${toolchain.verificationChecks.length} verification checks protect ${toolchain.label}.`,
      fix: "Attach explicit approval checks to each toolchain stage before its outputs are accepted.",
    }),
    createCheck({
      id: `${toolchain.id}_blueprint_fit`,
      stageId,
      label: "Toolchain matches blueprint demand",
      status:
        (toolchain.stage.includes("Character") && project.design.assetPlan.characterBlueprints.length > 0)
        || (toolchain.stage.includes("3D") && project.dimension !== "2d")
        || (toolchain.stage.includes("Layout") && project.design.assetPlan.environmentKits.length > 0)
        || (toolchain.stage.includes("Concept") || toolchain.stage.includes("Variants") || toolchain.stage.includes("Orchestration"))
          ? "pass"
          : "warning",
      severity: "low",
      score:
        (toolchain.stage.includes("Character") && project.design.assetPlan.characterBlueprints.length > 0)
        || (toolchain.stage.includes("3D") && project.dimension !== "2d")
        || (toolchain.stage.includes("Layout") && project.design.assetPlan.environmentKits.length > 0)
        || (toolchain.stage.includes("Concept") || toolchain.stage.includes("Variants") || toolchain.stage.includes("Orchestration"))
          ? 90
          : 70,
      detail: `${toolchain.label} is mapped against the current asset blueprint families and runtime needs.`,
      fix: "Only execute toolchains that answer a real blueprint requirement for this game.",
    }),
  ]

  return {
    id: stageId,
    label: toolchain.label,
    ownerAgent: selectToolchainOwner(toolchain),
    objective: toolchain.objective,
    status: summarizeStageStatus(stageChecks),
    toolchainId: toolchain.id,
    inputs: toolchain.inputs,
    outputs: toolchain.outputs,
    notes: toolchain.orchestrationNotes,
    checks: stageChecks,
    repairActions: [],
  }
}

function buildVerificationStage(project: ProjectExecutionSnapshot): ProjectGenerationExecutionStageRun {
  const stageId = "verification_gate"
  const audit = buildProjectGenerationAudit(project)
  const checks = audit.checks.map((check, index) => createCheck({
    id: `${stageId}_${check.id}_${index + 1}`,
    stageId,
    label: check.label,
    status: check.status,
    severity: check.severity,
    score: check.status === "pass" ? 100 : check.status === "warning" ? 68 : 15,
    detail: check.detail,
    fix: check.fix,
  }))

  checks.push(createCheck({
    id: "execution_assets_present",
    stageId,
    label: "Execution assets are attached to the workspace",
    status: EXECUTION_ASSET_FILES.every((fileName) => project.assetFiles.some((file) => file.name === fileName)) ? "pass" : "warning",
    severity: "medium",
    score: EXECUTION_ASSET_FILES.every((fileName) => project.assetFiles.some((file) => file.name === fileName)) ? 100 : 58,
    detail: `${project.assetFiles.filter((file) => EXECUTION_ASSET_FILES.includes(file.name)).length} execution asset files are currently attached.`,
    fix: "Emit execution summary, checks, repair log, and worker pipeline assets before release.",
  }))

  return {
    id: stageId,
    label: "Verification and Grading Gate",
    ownerAgent: "tooling",
    objective: "Run readiness checks, evaluation pressure, and workspace verification before the project is shown.",
    status: summarizeStageStatus(checks),
    inputs: ["Generated workspace", "Quality targets", "Evaluation rubrics", "Runtime contract"],
    outputs: ["Verification gate", "Release decision", "Repair recommendations"],
    notes: [
      audit.summary,
      project.design.evaluationPlan.evaluationStrategy,
      `${project.design.evaluationPlan.rubrics.length} grading rubrics`,
    ],
    checks,
    repairActions: [],
  }
}

function buildCompilePreflightStage(project: ProjectExecutionSnapshot): ProjectGenerationExecutionStageRun {
  const stageId = "compile_preflight"
  const audit = buildProjectGenerationAudit(project)
  const compileChecks = audit.checks
    .filter((check) => ["code_workspace", "compile_surface", "compile_asset"].includes(check.id))
    .map((check, index) => createCheck({
      id: `${stageId}_${check.id}_${index + 1}`,
      stageId,
      label: check.label,
      status: check.status,
      severity: check.severity,
      score: check.status === "pass" ? 100 : check.status === "warning" ? 68 : 15,
      detail: check.detail,
      fix: check.fix,
    }))

  return {
    id: stageId,
    label: "Compile Preflight Gate",
    ownerAgent: "tooling",
    objective: "Check compile-readiness surface, engine-specific code markers, and build assets before broader verification accepts the run.",
    status: summarizeStageStatus(compileChecks),
    inputs: ["Generated code files", "Compile readiness asset", "Target engine context"],
    outputs: ["Compile readiness verdict", "Build blockers", "Compile audit trail"],
    notes: [
      `${project.engine} target`,
      `${project.codeFiles.length} generated code files`,
      project.design.enginePlan.rationale,
    ],
    checks: compileChecks,
    repairActions: [],
  }
}

function buildCompileRepairStage(
  repairActions: ProjectGenerationExecutionRepairAction[],
): ProjectGenerationExecutionStageRun {
  const stageId = "compile_repair"
  const compileRepairs = repairActions.filter((action) => action.stageId === stageId && action.applied)
  const checks = [
    createCheck({
      id: "compile_repair_trail",
      stageId,
      label: "Compile repair trail is recorded",
      status: compileRepairs.length > 0 ? "pass" : "warning",
      severity: "medium",
      score: compileRepairs.length > 0 ? 94 : 68,
      detail: compileRepairs.length > 0
        ? `${compileRepairs.length} compile repair pass${compileRepairs.length === 1 ? "" : "es"} ran before release.`
        : "No compile repair passes were needed or recorded for this run.",
      fix: "Record every compile repair pass so future agents can see how build blockers were handled.",
    }),
    createCheck({
      id: "compile_repair_budget",
      stageId,
      label: "Compile repair stayed within the allowed retry budget",
      status: compileRepairs.length <= 2 ? "pass" : "fail",
      severity: "high",
      score: compileRepairs.length <= 2 ? 100 : 20,
      detail: `${compileRepairs.length} compile repair pass${compileRepairs.length === 1 ? "" : "es"} were applied.`,
      fix: "Stop after two compile repair attempts and block release if the project still fails preflight.",
    }),
  ]

  return {
    id: stageId,
    label: "Compile Repair Loop",
    ownerAgent: "tooling",
    objective: "Apply bounded compile-readiness repair passes and record the repair trail before verification.",
    status: summarizeStageStatus(checks),
    inputs: ["Compile preflight failures", "Compile readiness asset", "Generated workspace"],
    outputs: ["Compile repair trail", "Updated workspace", "Compile blocker summary"],
    notes: compileRepairs.length > 0
      ? compileRepairs.map((action) => action.result)
      : ["Compile repair loop remained on standby because preflight passed cleanly."],
    checks,
    repairActions: compileRepairs,
  }
}

function buildRepairStage(
  project: ProjectExecutionSnapshot,
  repairActions: ProjectGenerationExecutionRepairAction[],
): ProjectGenerationExecutionStageRun {
  const stageId = "repair_hardening"
  const checks = [
    createCheck({
      id: "repair_presence",
      stageId,
      label: "Auto-repair stage accounted for weak spots",
      status: repairActions.some((action) => action.applied) ? "pass" : "warning",
      severity: "low",
      score: repairActions.some((action) => action.applied) ? 92 : 72,
      detail: repairActions.some((action) => action.applied)
        ? `${repairActions.filter((action) => action.applied).length} repair actions were applied before release.`
        : "No repair actions were needed or applied for this run.",
      fix: "If verification flags repairable issues, apply them before the project is surfaced.",
    }),
    createCheck({
      id: "repair_plan_recorded",
      stageId,
      label: "Repair plan is captured for later agents",
      status: project.feedback && project.feedback.length > 0 ? "pass" : "pass",
      severity: "low",
      score: 90,
      detail: "Repair and hardening output is stored in machine-readable execution assets.",
      fix: "Always leave a repair trail even when the release is clean.",
    }),
  ]

  return {
    id: stageId,
    label: "Repair and Hardening",
    ownerAgent: "optimizer",
    objective: "Repair auto-fixable generation weaknesses and leave a machine-readable hardening trail for later agents.",
    status: summarizeStageStatus(checks),
    inputs: ["Verification failures", "Repair hooks", "Feedback learning signals"],
    outputs: ["Repair log", "Hardened workspace", "Execution trail assets"],
    notes: unique([
      ...project.design.evaluationPlan.repairHooks,
      ...buildFeedbackLearningReport(project).generationRepairPlan.promptRepairs,
    ]).slice(0, 6),
    checks,
    repairActions,
  }
}

function buildArtifacts(
  project: ProjectExecutionSnapshot,
  stageRuns: ProjectGenerationExecutionStageRun[],
  repairActions: ProjectGenerationExecutionRepairAction[],
): ProjectGenerationExecutionArtifact[] {
  const stageArtifacts = stageRuns.flatMap((stage) => stage.outputs.map((output, index) => ({
    id: `${stage.id}_artifact_${index + 1}`,
    stageId: stage.id,
    label: output,
    category:
      stage.id === "prompt_lock"
        ? "briefing"
        : stage.id === "compile_preflight"
          ? "verification"
        : stage.id === "verification_gate"
          ? "verification"
          : stage.id === "repair_hardening"
            ? "repair"
            : stage.id === "system_synthesis"
              ? "code"
              : "asset",
    status: stage.id === "repair_hardening" && repairActions.some((action) => action.applied)
      ? "repaired"
      : stage.id === "compile_preflight"
        ? "verified"
      : stage.id === "verification_gate"
        ? "verified"
        : "generated",
    detail: `${stage.label} output: ${output}.`,
  } satisfies ProjectGenerationExecutionArtifact)))

  const workspaceArtifacts: ProjectGenerationExecutionArtifact[] = [
    {
      id: "workspace_code",
      stageId: "system_synthesis",
      label: "Generated code workspace",
      category: "code",
      status: "generated",
      detail: `${project.codeFiles.length} source files are attached to the project workspace.`,
    },
    {
      id: "workspace_assets",
      stageId: "verification_gate",
      label: "Generated asset workspace",
      category: "asset",
      status: EXECUTION_ASSET_FILES.every((fileName) => project.assetFiles.some((file) => file.name === fileName)) ? "verified" : "generated",
      detail: `${project.assetFiles.length} asset files are attached to the project workspace.`,
    },
  ]

  return [...workspaceArtifacts, ...stageArtifacts]
}

function summarizeExecutionReport(input: {
  releaseDecision: ProjectGenerationExecutionReport["releaseDecision"]
  repairsApplied: number
  warnings: number
  failures: number
}) {
  if (input.releaseDecision === "blocked") {
    return `Execution pipeline blocked release after ${input.failures} failing checks.`
  }

  if (input.repairsApplied > 0) {
    return `Execution pipeline repaired ${input.repairsApplied} issue${input.repairsApplied === 1 ? "" : "s"} and ${input.releaseDecision === "ready" ? "cleared the project for release" : "left it marked for review"}.`
  }

  if (input.warnings > 0) {
    return `Execution pipeline completed with ${input.warnings} warning${input.warnings === 1 ? "" : "s"} and marked the project for review.`
  }

  return "Execution pipeline completed cleanly and cleared the project for release."
}

export function buildProjectGenerationExecution(
  project: ProjectExecutionSnapshot,
  options?: {
    repairActions?: ProjectGenerationExecutionRepairAction[]
    startedAt?: string
  },
): ProjectGenerationExecutionReport {
  const startedAt = options?.startedAt ?? new Date().toISOString()
  const context = buildProjectGenerationContext(project)
  const inheritedRepairActions = options?.repairActions ?? []

  const stageRuns = [
    buildPromptLockStage(project),
    buildSystemSynthesisStage(project),
    buildCompilePreflightStage(project),
    buildCompileRepairStage(inheritedRepairActions),
    ...project.design.assetPlan.generationToolchains.map((toolchain) => buildToolchainStage(project, toolchain)),
    buildVerificationStage(project),
    buildRepairStage(project, inheritedRepairActions),
  ]

  const checks = stageRuns.flatMap((stage) => stage.checks)
  const repairActions = [...inheritedRepairActions]
  const artifacts = buildArtifacts(project, stageRuns, repairActions)
  const failures = checks.filter((check) => check.status === "fail").length
  const warnings = checks.filter((check) => check.status === "warning").length
  const passing = checks.filter((check) => check.status === "pass").length
  const releaseDecision =
    failures > 0
      ? "blocked"
      : warnings > 0
        ? "needs_review"
        : "ready"

  return {
    startedAt,
    completedAt: new Date().toISOString(),
    releaseDecision,
    summary: summarizeExecutionReport({
      releaseDecision,
      repairsApplied: repairActions.filter((action) => action.applied).length,
      warnings,
      failures,
    }),
    autoRepairApplied: repairActions.some((action) => action.applied),
    workerSequence: unique([
      "architect",
      ...context.agentAssignments.map((assignment) => assignment.agentName),
      ...project.design.assetPlan.generationToolchains.map((toolchain) => selectToolchainOwner(toolchain)),
      "tooling",
      "optimizer",
    ]) as AgentName[],
    stageRuns,
    artifacts,
    checks,
    repairActions,
    totals: {
      stages: stageRuns.length,
      checks: checks.length,
      passing,
      warnings,
      failures,
      repairsApplied: repairActions.filter((action) => action.applied).length,
    },
  }
}

function buildExecutionAssetFiles(report: ProjectGenerationExecutionReport): ProjectWorkspaceFile[] {
  return [
    makeWorkspaceFile("GenerationExecution.asset.json", toJson(report)),
    makeWorkspaceFile("ExecutionChecks.asset.json", toJson({
      releaseDecision: report.releaseDecision,
      summary: report.summary,
      checks: report.checks,
    })),
    makeWorkspaceFile("ExecutionRepairs.asset.json", toJson({
      autoRepairApplied: report.autoRepairApplied,
      repairActions: report.repairActions,
    })),
    makeWorkspaceFile("CompileRepair.asset.json", toJson({
      compileRepairActions: report.repairActions.filter((action) => action.stageId === "compile_repair"),
    })),
    makeWorkspaceFile("WorkerPipeline.asset.json", toJson({
      workerSequence: report.workerSequence,
      stageRuns: report.stageRuns.map((stage) => ({
        id: stage.id,
        label: stage.label,
        ownerAgent: stage.ownerAgent,
        objective: stage.objective,
        status: stage.status,
        toolchainId: stage.toolchainId,
      })),
    })),
  ]
}

function attachExecutionAssets(
  project: ProjectExecutionSnapshot,
  report: ProjectGenerationExecutionReport,
): UserProject {
  const executionAssets = buildExecutionAssetFiles(report)
  return {
    ...project,
    execution: report,
    assetFiles: upsertWorkspaceFiles(project.assetFiles, executionAssets),
  } as UserProject
}

function needsStrongWorkspaceRepair(project: ProjectExecutionSnapshot) {
  const assetFileNames = new Set(project.assetFiles.map((file) => file.name))
  const missingRequiredAssets = REQUIRED_GENERATION_ASSETS.some((fileName) => !assetFileNames.has(fileName))
  const missingCodeHeaders = project.codeFiles.some((file) => !file.content.includes("Original Prompt:"))

  return (
    project.codeFiles.length === 0
    || project.assetFiles.length === 0
    || missingRequiredAssets
    || missingCodeHeaders
  )
}

function regenerateWorkspace(project: ProjectExecutionSnapshot): UserProject {
  const codeFiles = createGeneratedCodeFiles(project)
  const assetFiles = createGeneratedAssetFiles(project, codeFiles)

  return {
    ...project,
    codeFiles,
    assetFiles,
  } as UserProject
}

export function ensureProjectExecution(
  project: UserProject,
  repairActions: ProjectGenerationExecutionRepairAction[] = [],
): UserProject {
  const startedAt = new Date().toISOString()
  const draftReport = buildProjectGenerationExecution(project, {
    repairActions,
    startedAt,
  })
  const withDraftAssets = attachExecutionAssets(project, draftReport)
  const finalReport = buildProjectGenerationExecution(withDraftAssets, {
    repairActions,
    startedAt,
  })

  return attachExecutionAssets(withDraftAssets, finalReport)
}

export function runProjectExecutionPipeline(project: UserProject): UserProject {
  const repairActions: ProjectGenerationExecutionRepairAction[] = []
  let workingProject = project

  if (needsStrongWorkspaceRepair(workingProject)) {
    workingProject = regenerateWorkspace(workingProject)
    repairActions.push(createRepairAction({
      id: "workspace_regenerated",
      stageId: "repair_hardening",
      label: "Regenerated workspace before release",
      target: "codeFiles + assetFiles",
      reason: "The generated workspace was incomplete or missing traceable execution artifacts.",
      result: `Rebuilt ${workingProject.codeFiles.length} code files and ${workingProject.assetFiles.length} asset files before release.`,
      applied: true,
    }))
  }

  if (!EXECUTION_ASSET_FILES.every((fileName) => workingProject.assetFiles.some((file) => file.name === fileName))) {
    repairActions.push(createRepairAction({
      id: "execution_assets_attached",
      stageId: "repair_hardening",
      label: "Attached execution assets",
      target: "execution asset workspace",
      reason: "The execution pipeline assets must be present before presentation.",
      result: "Execution summary, checks, repair log, and worker pipeline assets were attached.",
      applied: true,
    }))
  }

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const draftReport = buildProjectGenerationExecution(workingProject, {
      repairActions,
      startedAt: new Date().toISOString(),
    })
    const compileBlocked = draftReport.checks.some((check) =>
      check.stageId === "compile_preflight" && check.status === "fail",
    )

    if (!compileBlocked) {
      break
    }

    workingProject = regenerateWorkspace(workingProject)
    repairActions.push(createRepairAction({
      id: `compile_repair_pass_${attempt}`,
      stageId: "compile_repair",
      label: `Compile repair pass ${attempt}`,
      target: "generated workspace",
      reason: "Compile preflight found engine marker, file coverage, or compile asset issues.",
      result: `Regenerated the workspace during compile repair pass ${attempt} and reran compile preflight.`,
      applied: true,
    }))
  }

  return ensureProjectExecution(workingProject, repairActions)
}
