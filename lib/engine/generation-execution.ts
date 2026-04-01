
import { AGENTS_LIST, AGENT_KNOWLEDGE } from "@/lib/engine/agents"
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
import { pluginRegistry } from "@/lib/engine/plugin"
import "@/lib/engine/plugins/prompt-lock"
import "@/lib/engine/plugins/system-synthesis"
import "@/lib/engine/plugins/compile-preflight"
import "@/lib/engine/plugins/compile-repair"
import "@/lib/engine/plugins/verification"
import "@/lib/engine/plugins/repair"
import { createToolchainPlugins } from "@/lib/engine/plugins/toolchain"
import "@/lib/engine/plugins/modular-content"
import "@/lib/engine/plugins/procedural-generation"
import "@/lib/engine/plugins/knowledge-extraction"
import "@/lib/engine/plugins/evolver"

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

function selectToolchainOwner(toolchain: AssetGenerationToolchain): AgentName {
  const stage = toolchain.stage.toLowerCase()
  const label = toolchain.label.toLowerCase()

  if (stage.includes("orchestration") || label.includes("repair")) return "tooling"
  if (stage.includes("layout") || label.includes("assembly")) return "procedural"
  if (stage.includes("3d") || label.includes("mesh")) return "renderer"
  if (stage.includes("character")) return "gameplay"
  return "tooling"
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

export async function buildProjectGenerationExecution(
  project: ProjectExecutionSnapshot,
  options?: {
    repairActions?: ProjectGenerationExecutionRepairAction[]
    startedAt?: string
  },
): Promise<ProjectGenerationExecutionReport> {
  const startedAt = options?.startedAt ?? new Date().toISOString()
  const context = buildProjectGenerationContext(project)
  const inheritedRepairActions = options?.repairActions ?? []
  const knowledgeFile = project.assetFiles.find(file => file.name === 'knowledge.json');
  const knowledgeByAgent = knowledgeFile ? JSON.parse(knowledgeFile.content) : {};
  const promptEvolutionFile = project.assetFiles.find(file => file.name === 'prompt-evolution.json');
  const promptEvolutions = promptEvolutionFile ? JSON.parse(promptEvolutionFile.content) : {};

  // Apply prompt evolutions
  for (const agentName in promptEvolutions) {
      if (AGENT_KNOWLEDGE[agentName]) {
          AGENT_KNOWLEDGE[agentName].systemPrompt = promptEvolutions[agentName];
      }
  }

  const plugins = pluginRegistry.getPlugins()
  const toolchainPlugins = createToolchainPlugins(project as UserProject)

  const allPlugins = [
    ...plugins.filter((p) => p.id !== "toolchain"),
    ...toolchainPlugins,
  ]

  const stageRuns = await Promise.all(
    allPlugins.map((plugin) => {
        const originalExecute = plugin.execute;
        plugin.execute = (project: UserProject, repairActions?: any) => {
            const agentName = plugin.ownerAgent;
            if (agentName && agentName !== 'evolver') {
                const agentKnowledge = AGENT_KNOWLEDGE[agentName];
                if (agentKnowledge) {
                    const contextualKnowledge = {
                        architect: knowledgeByAgent.architect || {},
                        [agentName]: knowledgeByAgent[agentName] || {},
                    };
                    if (!agentKnowledge.systemPrompt.startsWith("LEARNED KNOWLEDGE:")) {
                        agentKnowledge.systemPrompt = `LEARNED KNOWLEDGE:\n${JSON.stringify(contextualKnowledge, null, 2)}\n\n${agentKnowledge.systemPrompt}`;
                    }
                }
            }
            return originalExecute(project, repairActions);
        }
      if (plugin.id === "compile-repair" || plugin.id === "repair") {
        return plugin.execute(project as UserProject, inheritedRepairActions)
      } else {
        return plugin.execute(project as UserProject)
      }
    })
  )

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
      "evolver",
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

async function attachExecutionAssets(
  project: ProjectExecutionSnapshot,
  report: ProjectGenerationExecutionReport,
): Promise<UserProject> {
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
  const codeFiles = createGeneratedCodeFiles(project as UserProject)
  const assetFiles = createGeneratedAssetFiles(project as UserProject, codeFiles)

  return {
    ...project,
    codeFiles,
    assetFiles,
  } as UserProject
}

export async function ensureProjectExecution(
  project: UserProject,
  repairActions: ProjectGenerationExecutionRepairAction[] = [],
): Promise<UserProject> {
  const startedAt = new Date().toISOString()
  const draftReport = await buildProjectGenerationExecution(project, {
    repairActions,
    startedAt,
  })
  const withDraftAssets = await attachExecutionAssets(project, draftReport)
  const finalReport = await buildProjectGenerationExecution(withDraftAssets, {
    repairActions,
    startedAt,
  })

  return await attachExecutionAssets(withDraftAssets, finalReport)
}

export async function runProjectExecutionPipeline(project: UserProject): Promise<UserProject> {
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
    const draftReport = await buildProjectGenerationExecution(workingProject, {
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

  return await ensureProjectExecution(workingProject, repairActions)
}
