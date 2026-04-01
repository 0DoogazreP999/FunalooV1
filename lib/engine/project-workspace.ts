
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
import { pluginRegistry } from "@/lib/engine/plugin"

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

export function createPluginAssetFiles(project: UserProject): ProjectWorkspaceFile[] {
  const plugins = pluginRegistry.getPlugins()
  const assetFiles: ProjectWorkspaceFile[] = []

  plugins.forEach(async (plugin) => {
    const result = await plugin.execute(project)
    result.outputs.forEach((output) => {
      assetFiles.push(createFile(`${output}.asset.json`, toJson(result)))
    })
  })

  return assetFiles
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
  const generatedAssetFiles = createPluginAssetFiles(project)

  return {
    ...project,
    llmConfiguration: {
      ...project.llmConfiguration,
      providerDiagnostics,
    },
    assetFiles: normalizeWorkspaceFiles(project.assetFiles, generatedAssetFiles),
  }
}

export function rebuildProjectWorkspace(project: UserProject): UserProject {
  const providerDiagnostics = project.llmConfiguration.providerDiagnostics
    ?? buildGenerationProviderDiagnosticsSummary({
      failures: project.llmConfiguration.providerFailures,
      operationalAnalytics: project.llmConfiguration.operationalAnalytics ?? project.llmConfiguration.loopReport?.operationalAnalytics,
    })
  const generatedAssetFiles = createPluginAssetFiles(project)

  return {
    ...project,
    llmConfiguration: {
      ...project.llmConfiguration,
      providerDiagnostics,
    },
    assetFiles: mergeWorkspaceFiles(project.assetFiles, generatedAssetFiles),
  }
}
