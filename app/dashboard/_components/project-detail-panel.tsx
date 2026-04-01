"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import {
  ArrowLeft, Code, CheckCircle, Layers, Play,
  Box, ExternalLink, FileCode, RefreshCw, Trash2,
} from "lucide-react"
import {
  countWorkspaceFileLines,
  rebuildProjectWorkspace,
} from "@/lib/engine/project-workspace"
import {
  buildProjectGenerationAudit,
  buildProjectGenerationContext,
} from "@/lib/engine/generation-readiness"
import { ensureProjectExecution } from "@/lib/engine/generation-intelligence"
import { buildFeedbackLearningReport } from "@/lib/engine/feedback-learning"
import type { ProjectWorkspaceFile, UserProject } from "@/lib/engine/types"
import type { GenerationIntelligenceProfile } from "@/lib/engine/types"
import { PlayableRuntime } from "@/components/game/playable-runtime"

// ── helpers ────────────────────────────────────────────────────

type WorkspaceKind = "code" | "asset"

type WorkspaceFileRecord = ProjectWorkspaceFile & {
  kind: WorkspaceKind
}

const getWorkspaceFileKey = (kind: WorkspaceKind, name: string) => `${kind}:${name}`

const fileTypeLabel = (fileName: string) => {
  const extension = fileName.split(".").pop()?.toUpperCase()
  return extension ?? "FILE"
}

const formatFailureCategory = (value?: string) =>
  value ? value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) : "Issue"

const formatFailureRetryStrategy = (value?: string) =>
  value ? value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) : "Manual Review"

// ── types ──────────────────────────────────────────────────────

export interface ProjectDetailPanelProps {
  project: UserProject & { design: GenerationIntelligenceProfile }
  onBack: () => void
  onDelete: () => void
  onProjectUpdate: (updater: (project: UserProject) => UserProject) => void
}

// ── component ──────────────────────────────────────────────────

export function ProjectDetailPanel({
  project,
  onBack,
  onDelete,
  onProjectUpdate,
}: ProjectDetailPanelProps) {
  const { toast } = useToast()
  const [selectedWorkspaceFileKey, setSelectedWorkspaceFileKey] = useState<string | null>(null)
  const feedbackLearning = buildFeedbackLearningReport(project)
  const feedbackDigest = feedbackLearning.digest
  const generationAudit = buildProjectGenerationAudit(project)
  const generationContext = buildProjectGenerationContext(project)
  const executionReport = project.execution
  const loopReport = project.llmConfiguration.loopReport
  const releaseJudgement = project.llmConfiguration.releaseJudgement
  const evolutionContext = project.llmConfiguration.evolutionContext
  const knowledgeCoverage = project.llmConfiguration.knowledgeCoverage
  const knowledgeRisk = project.llmConfiguration.knowledgeRisk
  const usageIntelligence = project.llmConfiguration.usageIntelligence
  const providerFailures = project.llmConfiguration.providerFailures ?? []
  const operationalAnalytics = project.llmConfiguration.operationalAnalytics ?? loopReport?.operationalAnalytics
  const chosenGenerationCandidate = project.design.candidatePlan.candidates.find(
    (candidate) => candidate.id === project.design.candidatePlan.chosenCandidateId,
  ) ?? project.design.candidatePlan.candidates[0] ?? null

  // Compute workspace files from project
  const workspaceFiles: WorkspaceFileRecord[] = [
    ...project.codeFiles.map((file) => ({ ...file, kind: "code" as const })),
    ...project.assetFiles.map((file) => ({ ...file, kind: "asset" as const })),
  ]

  const selectedWorkspaceFile = workspaceFiles.find(
    (file) => getWorkspaceFileKey(file.kind, file.name) === selectedWorkspaceFileKey,
  ) ?? workspaceFiles[0] ?? null

  // Auto-select first workspace file when project changes
  useEffect(() => {
    const firstFile = [
      ...project.codeFiles.map((file) => getWorkspaceFileKey("code", file.name)),
      ...project.assetFiles.map((file) => getWorkspaceFileKey("asset", file.name)),
    ][0] ?? null

    const hasSelection = firstFile !== null && [
      ...project.codeFiles.map((file) => getWorkspaceFileKey("code", file.name)),
      ...project.assetFiles.map((file) => getWorkspaceFileKey("asset", file.name)),
    ].includes(selectedWorkspaceFileKey ?? "")

    setSelectedWorkspaceFileKey(hasSelection ? selectedWorkspaceFileKey : firstFile)
  }, [project, selectedWorkspaceFileKey])

  const updateWorkspaceFile = useCallback((
    kind: WorkspaceKind,
    fileName: string,
    content: string,
  ) => {
    const fileKey = kind === "code" ? "codeFiles" : "assetFiles"

    onProjectUpdate((prev) => ({
      ...prev,
      [fileKey]: prev[fileKey].map((file) => (
        file.name === fileName
          ? { ...file, content, lines: countWorkspaceFileLines(content) }
          : file
      )),
    }))
  }, [onProjectUpdate])

  const handleRebuildProject = useCallback(() => {
    onProjectUpdate((prev) => {
      const rebuilt = ensureProjectExecution(rebuildProjectWorkspace({
        ...prev,
        design: project.design,
      }))
      toast({
        title: "Workspace rebuilt",
        description: `${rebuilt.codeFiles.length} source files, ${rebuilt.assetFiles.length} assets, and a refreshed execution report are ready to edit.`,
      })
      return rebuilt
    })
  }, [onProjectUpdate, project.design, toast])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground"><ArrowLeft className="mr-1 h-3 w-3" /> Back to Projects</Button>
        <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-400 hover:text-red-300 hover:bg-red-500/10"><Trash2 className="mr-1 h-3 w-3" /> Delete</Button>
      </div>

      <Tabs defaultValue="play">
        <div className="overflow-x-auto pb-1">
          <TabsList className="inline-flex min-w-max">
            <TabsTrigger value="play" className="gap-1"><Play className="h-3 w-3" /> Play</TabsTrigger>
            <TabsTrigger value="systems" className="gap-1"><Layers className="h-3 w-3" /> Systems</TabsTrigger>
            <TabsTrigger value="code" className="gap-1"><Code className="h-3 w-3" /> Code</TabsTrigger>
            <TabsTrigger value="info" className="gap-1"><Box className="h-3 w-3" /> Info</TabsTrigger>
          </TabsList>
        </div>

        {/* PLAY TAB */}
        <TabsContent value="play" className="space-y-4 mt-4">
          {project.dimension === "3d" ? (
            <div className="overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-950/80 shadow-[0_20px_80px_rgba(8,145,178,0.16)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/20 bg-cyan-950/30 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-cyan-50">3D Game Window</p>
                    <p className="text-xs text-cyan-100/70">Dedicated viewport for generated 3D playables</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-100">{project.design.graphicsPlan.renderPath}</Badge>
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-100">{project.design.cameraStyle}</Badge>
                  <Badge variant="outline" className="border-cyan-500/30 text-cyan-100 capitalize">{project.engine}</Badge>
                </div>
              </div>
              <div className="p-4">
                <PlayableRuntime key={project.id} project={project} />
              </div>
            </div>
          ) : (
            <Card className="border-border/50 bg-card/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2"><Play className="h-4 w-4 text-violet-400" /> Playable Runtime &mdash; {project.name}</CardTitle>
                  <Badge variant="outline" className="text-[10px] font-mono">Playable After Generation</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <PlayableRuntime key={project.id} project={project} />
              </CardContent>
            </Card>
          )}
          <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 text-sm text-muted-foreground">
            {project.design.generatedPitch} This runtime is generated from your {project.dimension.toUpperCase()} project configuration and kept playable after generation. It is locked to the {project.design.runtimePlan.label.toLowerCase()}, uses the {project.design.mapArchetype.toLowerCase()} blueprint, follows {project.design.gameplayLoopSummary.toLowerCase()}, and applies {project.design.nonOverlapStrategy.toLowerCase()} so layout, pacing, and progression stay coherent instead of overlapping or collapsing into noise. The generation pipeline is budgeted to finish in {project.design.pipelinePlan.targetMinutes} minutes or less by trimming breadth before prompt fidelity.
          </div>
        </TabsContent>

        {/* SYSTEMS TAB */}
        <TabsContent value="systems" className="mt-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {project.systems.map(sys => (
              <Card key={sys.name} className="border-emerald-500/20 bg-emerald-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2"><CheckCircle className="h-4 w-4 text-emerald-400" /><span className="font-medium capitalize">{sys.displayName}</span></div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p className="font-mono">{sys.linesGenerated.toLocaleString()} lines {project.engine === "godot" ? "GDScript" : project.engine === "unity" ? "C#" : "C++"}</p>
                    <p>Engine: {sys.engine}</p>
                    <p>Status: {sys.status}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* CODE TAB */}
        <TabsContent value="code" className="mt-4">
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileCode className="h-4 w-4" />
                    Generated Source Files
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Scroll through the workspace, edit source or asset files, and rebuild without losing your custom changes, including character, prop, and environment blueprints.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="self-start border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
                  onClick={handleRebuildProject}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Rebuild
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
                <div className="rounded-lg border border-border/50 bg-muted/20 overflow-hidden">
                  <ScrollArea className="h-[620px]">
                    <div className="space-y-4 p-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Source</p>
                          <Badge variant="outline" className="text-[10px] font-mono">{project.codeFiles.length}</Badge>
                        </div>
                        {project.codeFiles.map((file) => {
                          const fileKey = getWorkspaceFileKey("code", file.name)
                          const isSelected = selectedWorkspaceFileKey === fileKey

                          return (
                            <button
                              key={fileKey}
                              type="button"
                              onClick={() => setSelectedWorkspaceFileKey(fileKey)}
                              className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                                isSelected
                                  ? "border-violet-500/40 bg-violet-500/10"
                                  : "border-border/50 bg-background/40 hover:bg-accent/60"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate text-sm font-mono">{file.name}</span>
                                <Badge variant="secondary" className="text-[10px]">{fileTypeLabel(file.name)}</Badge>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">{file.lines} lines</p>
                            </button>
                          )
                        })}
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Assets</p>
                          <Badge variant="outline" className="text-[10px] font-mono">{project.assetFiles.length}</Badge>
                        </div>
                        {project.assetFiles.map((file) => {
                          const fileKey = getWorkspaceFileKey("asset", file.name)
                          const isSelected = selectedWorkspaceFileKey === fileKey

                          return (
                            <button
                              key={fileKey}
                              type="button"
                              onClick={() => setSelectedWorkspaceFileKey(fileKey)}
                              className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                                isSelected
                                  ? "border-emerald-500/40 bg-emerald-500/10"
                                  : "border-border/50 bg-background/40 hover:bg-accent/60"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate text-sm font-mono">{file.name}</span>
                                <Badge variant="secondary" className="text-[10px]">{fileTypeLabel(file.name)}</Badge>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">{file.lines} lines</p>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </ScrollArea>
                </div>

                <div className="min-w-0 overflow-hidden rounded-lg border border-border/50 bg-card/70">
                  {selectedWorkspaceFile ? (
                    <>
                      <div className="flex flex-col gap-3 border-b border-border/50 bg-muted/20 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {selectedWorkspaceFile.kind === "code" ? (
                              <FileCode className="h-4 w-4 text-violet-400" />
                            ) : (
                              <Box className="h-4 w-4 text-emerald-400" />
                            )}
                            <span className="truncate text-sm font-mono">{selectedWorkspaceFile.name}</span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Edits are saved directly to this game project, so you can tune systems and assets in place.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-[10px] uppercase tracking-[0.2em]">
                            {selectedWorkspaceFile.kind === "code" ? "Source" : "Asset"}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] font-mono">
                            {fileTypeLabel(selectedWorkspaceFile.name)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{selectedWorkspaceFile.lines} lines</span>
                        </div>
                      </div>
                      <div className="p-4">
                        <Textarea
                          value={selectedWorkspaceFile.content}
                          onChange={(event) => updateWorkspaceFile(
                            selectedWorkspaceFile.kind,
                            selectedWorkspaceFile.name,
                            event.target.value,
                          )}
                          spellCheck={false}
                          wrap="off"
                          className="h-[620px] resize-none overflow-auto border-border/50 bg-black/40 font-mono text-xs leading-6 text-emerald-100"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="flex h-[620px] items-center justify-center px-6 text-center text-sm text-muted-foreground">
                      Generate a project to unlock editable source files, asset blueprints, and rebuild controls.
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INFO TAB */}
        <TabsContent value="info" className="mt-4">
          <Card className="border-border/50 bg-card/50">
            <CardContent className="p-6 space-y-4">
              <div><p className="text-xs text-muted-foreground">Project Name</p><p className="font-semibold text-lg">{project.name}</p></div>
              <div><p className="text-xs text-muted-foreground">Description</p><p className="text-sm text-muted-foreground">{project.description}</p></div>
              <Separator />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div><p className="text-xs text-muted-foreground">Genre</p><p className="font-mono capitalize">{project.genre.replace(/_/g, " ")}</p></div>
                <div><p className="text-xs text-muted-foreground">Dimension</p><p className="font-mono uppercase">{project.dimension}</p></div>
                <div><p className="text-xs text-muted-foreground">Engine</p><p className="font-mono capitalize">{project.engine}</p></div>
                <div><p className="text-xs text-muted-foreground">Players</p><p className="font-mono">{project.multiplayer ? project.maxPlayers : 1}</p></div>
                <div><p className="text-xs text-muted-foreground">Total Lines</p><p className="font-mono">{project.systems.reduce((s, sys) => s + sys.linesGenerated, 0).toLocaleString()}</p></div>
              </div>
              <Separator />
              <div><p className="text-xs text-muted-foreground">Features</p><div className="flex flex-wrap gap-1 mt-1">{project.features.map(f => <Badge key={f} variant="outline" className="text-xs capitalize">{f.replace(/_/g, " ")}</Badge>)}</div></div>
              <div><p className="text-xs text-muted-foreground">Prompt Interpretation</p><p className="text-sm text-muted-foreground">{project.design.promptSummary}</p></div>
              <div><p className="text-xs text-muted-foreground">Generated Pitch</p><p className="text-sm text-muted-foreground">{project.design.generatedPitch}</p></div>
              <div><p className="text-xs text-muted-foreground">Player Fantasy</p><p className="text-sm text-muted-foreground">{project.design.playerFantasy}</p></div>
              <div><p className="text-xs text-muted-foreground">Session Fantasy</p><p className="text-sm text-muted-foreground">{project.design.sessionFantasy}</p></div>
              <div><p className="text-xs text-muted-foreground">Interaction Model</p><p className="text-sm text-muted-foreground">{project.design.interactionModel}</p></div>
              <div><p className="text-xs text-muted-foreground">Prompt Constraints</p><div className="flex flex-wrap gap-1 mt-1">{project.design.negativeConstraints.length > 0 ? project.design.negativeConstraints.map(constraint => <Badge key={constraint} variant="secondary" className="text-xs">{constraint}</Badge>) : <Badge variant="outline" className="text-xs">No restrictive prompt constraints detected</Badge>}</div></div>
              <div><p className="text-xs text-muted-foreground">Experience Goals</p><div className="flex flex-wrap gap-1 mt-1">{project.design.experienceGoals.map(goal => <Badge key={goal} variant="outline" className="text-xs">{goal}</Badge>)}</div></div>
              <div><p className="text-xs text-muted-foreground">Content Pillars</p><div className="flex flex-wrap gap-1 mt-1">{project.design.contentPillars.map(pillar => <Badge key={pillar} variant="secondary" className="text-xs">{pillar}</Badge>)}</div></div>
              <div><p className="text-xs text-muted-foreground">Progression Arcs</p><div className="flex flex-wrap gap-1 mt-1">{project.design.progressionArcs.map(arc => <Badge key={arc} variant="outline" className="text-xs">{arc}</Badge>)}</div></div>
              <div><p className="text-xs text-muted-foreground">Environment Themes</p><div className="flex flex-wrap gap-1 mt-1">{project.design.environmentThemes.map(theme => <Badge key={theme} variant="outline" className="text-xs">{theme}</Badge>)}</div></div>
              <div><p className="text-xs text-muted-foreground">UI Surfaces</p><div className="flex flex-wrap gap-1 mt-1">{project.design.uiSurfaces.map(surface => <Badge key={surface} variant="secondary" className="text-xs">{surface}</Badge>)}</div></div>
              <div><p className="text-xs text-muted-foreground">System Priorities</p><div className="flex flex-wrap gap-1 mt-1">{project.design.systemPriorities.map(priority => <Badge key={priority} variant="outline" className="text-xs">{priority}</Badge>)}</div></div>
              <div><p className="text-xs text-muted-foreground">Prompt Suite</p><p className="text-sm text-muted-foreground">{project.llmConfiguration.suiteId && project.llmConfiguration.suiteVersion ? `${project.llmConfiguration.suiteId} · ${project.llmConfiguration.suiteVersion}` : "Legacy project without prompt suite metadata."}</p></div>
              <div><p className="text-xs text-muted-foreground">Prompt Council</p><div className="flex flex-wrap gap-1 mt-1">{project.design.promptCouncilPlan.agents.map(agent => <Badge key={agent.id} variant="secondary" className="text-xs">{agent.displayName}</Badge>)}</div><p className="mt-2 text-sm text-muted-foreground">{project.design.promptCouncilPlan.orchestrationModel}</p></div>
              <div><p className="text-xs text-muted-foreground">Prompt Tiers</p><div className="space-y-1 mt-1">{project.design.promptCouncilPlan.promptTiers.map(tier => <p key={tier.id} className="text-sm text-muted-foreground">{tier.name}: {tier.objective}</p>)}</div></div>
              <div><p className="text-xs text-muted-foreground">Prompt Stages</p><div className="space-y-1 mt-1">{project.llmConfiguration.stages?.length ? project.llmConfiguration.stages.map(stage => <p key={`${stage.id}:${stage.version}`} className="text-sm text-muted-foreground">{stage.label} · {stage.version} · {stage.mode}{stage.promptId ? ` · ${stage.promptId}` : ""}{stage.provider ? ` · ${stage.provider}` : ""}</p>) : <p className="text-sm text-muted-foreground">No stage metadata recorded.</p>}</div></div>
              <div><p className="text-xs text-muted-foreground">Loop Mode</p><p className="text-sm text-muted-foreground">{project.llmConfiguration.loopReport ? `${project.llmConfiguration.loopReport.mode} · ${project.llmConfiguration.budgetMinutes ?? project.llmConfiguration.loopReport.budgetMinutes} minute budget` : "Legacy run without loop metadata."}</p></div>
              <div><p className="text-xs text-muted-foreground">Provider Roster</p>{project.llmConfiguration.providerRoster?.assignments?.length ? <div className="flex flex-wrap gap-1 mt-1">{project.llmConfiguration.providerRoster.assignments.map(assignment => <Badge key={`${assignment.role}:${assignment.provider}`} variant="outline" className="text-xs">{assignment.role.replace(/_/g, " ")} · {assignment.provider} · {assignment.model}</Badge>)}</div> : <p className="text-sm text-muted-foreground">No provider roster recorded.</p>}</div>
              <div><p className="text-xs text-muted-foreground">Provider Failures</p>{providerFailures.length ? <div className="space-y-2 mt-1">{providerFailures.map((failure, index) => <div key={`${failure.stageId}:${failure.provider}:${failure.attempt}:${index}`} className="rounded-lg border border-border/50 bg-muted/20 p-3"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{failure.provider} · {failure.stageLabel}</p><Badge variant="outline" className={`text-[10px] ${failure.final && !failure.recovered ? "border-rose-500/30 text-rose-300" : "border-amber-500/30 text-amber-300"}`}>{failure.final && !failure.recovered ? "final failure" : "recovered"}</Badge>{typeof failure.status === "number" ? <Badge variant="outline" className="text-[10px]">{failure.status}</Badge> : null}{failure.category ? <Badge variant="outline" className="text-[10px]">{formatFailureCategory(failure.category)}</Badge> : null}{failure.severity ? <Badge variant="outline" className="text-[10px]">{formatFailureCategory(failure.severity)}</Badge> : null}{failure.retryStrategy ? <Badge variant="outline" className="text-[10px]">{formatFailureRetryStrategy(failure.retryStrategy)}</Badge> : null}{failure.affectedModel ? <Badge variant="outline" className="text-[10px]">{failure.affectedModel}</Badge> : null}{failure.limitSummary ? <Badge variant="outline" className="text-[10px]">{failure.limitSummary}</Badge> : null}{failure.providerErrorType ? <Badge variant="outline" className="text-[10px]">{failure.providerErrorType}</Badge> : null}{failure.requestId ? <Badge variant="outline" className="text-[10px]">{failure.requestId}</Badge> : null}{typeof failure.retryAfterSeconds === "number" ? <Badge variant="outline" className="text-[10px]">retry after {failure.retryAfterSeconds}s</Badge> : null}</div><p className="mt-2 text-sm font-medium text-foreground">{failure.headline ?? failure.reason}</p>{(failure.headline ?? "") !== failure.reason ? <p className="mt-1 text-xs text-muted-foreground">{failure.reason}</p> : null}{(failure.signals?.length ?? 0) > 0 ? <div className="mt-2 flex flex-wrap gap-1">{failure.signals?.slice(0, 6).map((signal) => <Badge key={`${failure.stageId}:${signal.id}`} variant="outline" className="text-[10px]">{signal.label}</Badge>)}</div> : null}{failure.suggestedAction ? <p className="mt-2 text-xs text-amber-300">{failure.suggestedAction}</p> : null}</div>)}</div> : <p className="text-sm text-muted-foreground">No provider failures recorded.</p>}</div>
              <div><p className="text-xs text-muted-foreground">Preparation Diff</p>{project.llmConfiguration.preparationDiff?.length ? <div className="space-y-1 mt-1">{project.llmConfiguration.preparationDiff.map(entry => <p key={`${entry.field}:${entry.inferredValue}`} className="text-sm text-muted-foreground">{entry.field}: {entry.inferredValue}</p>)}</div> : <p className="text-sm text-muted-foreground">No AI preparation diff recorded.</p>}</div>
              <div><p className="text-xs text-muted-foreground">Input Boundaries</p><p className="text-sm text-muted-foreground">The creator prompt and preparation diff stay in the main generation path. Evolution memory is stored separately as advisory-only context and cannot replace explicit prompt constraints.</p>{generationContext.inputBoundary.preparationDiff.length > 0 ? <div className="space-y-1 mt-2">{generationContext.inputBoundary.preparationDiff.map(entry => <p key={entry} className="text-xs text-muted-foreground">{entry}</p>)}</div> : null}{generationContext.inputBoundary.missingCriteria.length > 0 ? <div className="space-y-1 mt-2">{generationContext.inputBoundary.missingCriteria.map(entry => <p key={entry} className="text-xs text-muted-foreground">{entry}</p>)}</div> : null}</div>
              <div><p className="text-xs text-muted-foreground">Knowledge Coverage</p>{knowledgeCoverage ? <div className="space-y-2 mt-1"><p className="text-sm text-muted-foreground">{knowledgeCoverage.summary}</p><div className="flex flex-wrap gap-1">{(knowledgeCoverage.relevantSignals ?? []).map(signal => <Badge key={signal.id} variant="outline" className="text-xs">{signal.label} · {signal.relevance}</Badge>)}</div>{(knowledgeCoverage.gapWarnings?.length ?? 0) > 0 ? <div className="space-y-1">{knowledgeCoverage.gapWarnings.map(gap => <p key={gap.id} className="text-xs text-amber-300">{gap.label}: {gap.action}</p>)}</div> : null}</div> : <p className="text-sm text-muted-foreground">No knowledge coverage recorded.</p>}</div>
              <div><p className="text-xs text-muted-foreground">Knowledge Pressure</p>{knowledgeRisk ? <div className="space-y-2 mt-1"><div className="flex flex-wrap gap-1"><Badge variant="outline" className={`text-[10px] ${knowledgeRisk.level === "aligned" ? "border-emerald-500/30 text-emerald-300" : knowledgeRisk.level === "risky" ? "border-rose-500/30 text-rose-300" : "border-amber-500/30 text-amber-300"}`}>{knowledgeRisk.level}</Badge></div><p className="text-sm text-muted-foreground">{knowledgeRisk.summary}</p>{(knowledgeRisk.warnings?.length ?? 0) > 0 ? <div className="space-y-1">{knowledgeRisk.warnings.map(item => <p key={item} className="text-xs text-muted-foreground">{item}</p>)}</div> : null}{(knowledgeRisk.releasePressure?.length ?? 0) > 0 ? <div className="space-y-1">{knowledgeRisk.releasePressure.map(item => <p key={item} className="text-xs text-amber-300">{item}</p>)}</div> : null}</div> : <p className="text-sm text-muted-foreground">No knowledge pressure recorded.</p>}</div>
              <div><p className="text-xs text-muted-foreground">AI Usage Intelligence</p>{usageIntelligence ? <div className="space-y-2 mt-1"><p className="text-sm text-muted-foreground">{usageIntelligence.summary}</p><div className="flex flex-wrap gap-1">{(usageIntelligence.suggestedProviders ?? []).map(provider => <Badge key={provider} variant="outline" className="text-xs">{provider}</Badge>)}</div>{(usageIntelligence.failureWatchouts?.length ?? 0) > 0 ? <div className="space-y-1">{usageIntelligence.failureWatchouts.map(item => <p key={item} className="text-xs text-muted-foreground">{item}</p>)}</div> : null}{(usageIntelligence.routingPressure?.length ?? 0) > 0 ? <div className="space-y-1">{usageIntelligence.routingPressure.map(item => <p key={item} className="text-xs text-amber-300">{item}</p>)}</div> : null}</div> : <p className="text-sm text-muted-foreground">No AI usage intelligence recorded.</p>}</div>
              <div><p className="text-xs text-muted-foreground">Evolution Memory</p>{evolutionContext ? <div className="space-y-2 mt-1"><p className="text-xs text-muted-foreground">Advisory only. These cached lines and learnings can widen options, but they do not override the explicit brief or locked settings.</p><div className="space-y-2">{evolutionContext.cacheLines.map(entry => <div key={entry.id} className="rounded-lg border border-border/50 bg-muted/20 p-3"><p className="text-sm font-medium">{entry.label}</p><p className="mt-1 text-sm text-muted-foreground">{entry.line}</p></div>)}</div>{evolutionContext.alphabeticalAdditions.length > 0 ? <div className="space-y-2">{evolutionContext.alphabeticalAdditions.map(entry => <div key={`${entry.start}:${entry.end}`} className="rounded-lg border border-border/50 bg-muted/20 p-3"><p className="text-sm font-medium">{entry.start} → {entry.end}</p><p className="mt-1 text-xs text-muted-foreground">{entry.additions.join(", ") || "No direct additions recorded."}</p><p className="mt-1 text-xs text-muted-foreground">{entry.rationale}</p></div>)}</div> : null}{evolutionContext.insertionBlocks.length > 0 ? <div className="space-y-2">{evolutionContext.insertionBlocks.map(block => <div key={block.id} className="rounded-lg border border-border/50 bg-muted/20 p-3"><p className="text-xs font-mono text-muted-foreground">{block.divider}</p><p className="mt-2 text-sm font-medium">{block.startAnchor}</p><p className="text-sm text-muted-foreground">{block.startLine}</p><div className="mt-2 space-y-1">{block.promptInsertions.map(entry => <p key={entry} className="text-xs text-muted-foreground">{entry}</p>)}</div><pre className="mt-2 overflow-x-auto rounded-md border border-border/50 bg-black/30 p-3 text-xs text-emerald-100">{block.codeInsertions.join("\n")}</pre><p className="mt-2 text-sm font-medium">{block.endAnchor}</p><p className="text-sm text-muted-foreground">{block.endLine}</p></div>)}</div> : null}<div className="space-y-1">{[...evolutionContext.userLearnings, ...evolutionContext.globalLearnings].slice(0, 6).map(entry => <p key={entry} className="text-sm text-muted-foreground">{entry}</p>)}</div></div> : <p className="text-sm text-muted-foreground">No evolution memory recorded.</p>}</div>
              <div><p className="text-xs text-muted-foreground">Loop Timeline</p>{loopReport?.attempts?.length ? <div className="space-y-2 mt-1">{loopReport.attempts.flatMap(attempt => attempt.stages.map(stage => <div key={`${attempt.attempt}:${stage.id}:${stage.attempt}`} className="rounded-lg border border-border/50 bg-muted/20 p-3"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{stage.id.replace(/_/g, " ")}</p><Badge variant="outline" className="text-[10px]">attempt {stage.attempt}</Badge><Badge variant="outline" className={`text-[10px] ${stage.verification === "pass" ? "border-emerald-500/30 text-emerald-300" : stage.verification === "fail" ? "border-rose-500/30 text-rose-300" : "border-amber-500/30 text-amber-300"}`}>{stage.verification}</Badge><Badge variant="outline" className="text-[10px]">{stage.provider}{stage.model ? ` · ${stage.model}` : ""}</Badge>{typeof stage.elapsedMs === "number" ? <Badge variant="outline" className="text-[10px]">{(stage.elapsedMs / 1000).toFixed(1)}s</Badge> : null}{typeof stage.totalTokens === "number" ? <Badge variant="outline" className="text-[10px]">{stage.totalTokens.toLocaleString()} tokens</Badge> : null}</div><p className="mt-2 text-sm text-muted-foreground">{stage.outputSummary}</p>{stage.repairReason && <p className="mt-2 text-xs text-muted-foreground">{stage.repairReason}</p>}</div>))}</div> : <p className="text-sm text-muted-foreground">No loop timeline recorded.</p>}</div>
              <div><p className="text-xs text-muted-foreground">Operational Analytics</p>{operationalAnalytics ? <div className="mt-1 space-y-2"><div className="flex flex-wrap gap-1"><Badge variant="outline" className="text-[10px]">{operationalAnalytics.totalPromptCalls ?? 0} prompt calls</Badge><Badge variant="outline" className="text-[10px]">{operationalAnalytics.totalRetries ?? 0} retries</Badge><Badge variant="outline" className="text-[10px]">{operationalAnalytics.totalProviderFallbacks ?? 0} recovered fallbacks</Badge><Badge variant="outline" className="text-[10px]">{(operationalAnalytics.totalTokens ?? 0).toLocaleString()} tokens</Badge><Badge variant="outline" className="text-[10px]">${(operationalAnalytics.totalCostUsd ?? 0).toFixed(4)} est. cost</Badge></div>{(operationalAnalytics.slowStages?.length ?? 0) > 0 ? <div className="space-y-1">{operationalAnalytics.slowStages.map(item => <p key={item} className="text-xs text-muted-foreground">{item}</p>)}</div> : <p className="text-sm text-muted-foreground">No unusually slow stages recorded.</p>}{(operationalAnalytics.cacheableStages?.length ?? 0) > 0 ? <div className="space-y-1">{operationalAnalytics.cacheableStages.map(item => <p key={item} className="text-xs text-muted-foreground">{item}</p>)}</div> : null}{(operationalAnalytics.routingStrategies?.length ?? 0) > 0 ? <div className="space-y-1">{operationalAnalytics.routingStrategies.map(item => <p key={item} className="text-xs text-muted-foreground">{item}</p>)}</div> : null}{((operationalAnalytics.failureCategories ?? []).length > 0) ? <div className="flex flex-wrap gap-1">{(operationalAnalytics.failureCategories ?? []).map(item => <Badge key={item} variant="outline" className="text-[10px] border-amber-500/30 text-amber-300">{item.replace(/_/g, " ")}</Badge>)}</div> : null}{((operationalAnalytics.retryStrategies ?? []).length > 0) ? <div className="flex flex-wrap gap-1">{(operationalAnalytics.retryStrategies ?? []).map(item => <Badge key={item} variant="outline" className="text-[10px]">{item.replace(/_/g, " ")}</Badge>)}</div> : null}{((operationalAnalytics.providerHealthSignals ?? []).length > 0) ? <div className="space-y-1">{(operationalAnalytics.providerHealthSignals ?? []).slice(0, 6).map(item => <p key={item} className="text-xs text-muted-foreground">{item}</p>)}</div> : null}{(operationalAnalytics.failureHotspots?.length ?? 0) > 0 ? <div className="space-y-1">{operationalAnalytics.failureHotspots.map(item => <p key={item} className="text-xs text-rose-300">{item}</p>)}</div> : null}{(operationalAnalytics.optimizationNotes?.length ?? 0) > 0 ? <div className="space-y-1">{operationalAnalytics.optimizationNotes.map(item => <p key={item} className="text-xs text-muted-foreground">{item}</p>)}</div> : null}</div> : <p className="text-sm text-muted-foreground">No operational analytics recorded.</p>}</div>
              <div><p className="text-xs text-muted-foreground">Loop Candidate Runs</p>{project.llmConfiguration.candidateRuns?.length ? <div className="space-y-2 mt-1">{project.llmConfiguration.candidateRuns.map(candidate => <div key={candidate.id} className="rounded-lg border border-border/50 bg-muted/20 p-3"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{candidate.label}</p><Badge variant="outline" className="text-[10px]">score {candidate.score}</Badge><Badge variant="outline" className={`text-[10px] ${candidate.passed ? "border-emerald-500/30 text-emerald-300" : "border-rose-500/30 text-rose-300"}`}>{candidate.passed ? "passed" : "blocked"}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{candidate.summary}</p></div>)}</div> : <p className="text-sm text-muted-foreground">No loop candidate metadata recorded.</p>}</div>
              <div><p className="text-xs text-muted-foreground">Release Judgement</p>{releaseJudgement ? <div className="mt-1 rounded-lg border border-border/50 bg-muted/20 p-3"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className={`text-[10px] ${releaseJudgement.decision === "ready" ? "border-emerald-500/30 text-emerald-300" : releaseJudgement.decision === "blocked" ? "border-rose-500/30 text-rose-300" : "border-amber-500/30 text-amber-300"}`}>{releaseJudgement.decision.replace(/_/g, " ")}</Badge>{project.llmConfiguration.fallbackProvidersUsed?.length ? <Badge variant="secondary" className="text-[10px]">fallbacks {project.llmConfiguration.fallbackProvidersUsed.join(", ")}</Badge> : null}</div><p className="mt-2 text-sm text-muted-foreground">{releaseJudgement.summary}</p>{releaseJudgement.blockers.length > 0 && <div className="mt-2 space-y-1">{releaseJudgement.blockers.map(blocker => <p key={blocker} className="text-xs text-rose-300">{blocker}</p>)}</div>}{releaseJudgement.warnings.length > 0 && <div className="mt-2 space-y-1">{releaseJudgement.warnings.map(warning => <p key={warning} className="text-xs text-muted-foreground">{warning}</p>)}</div>}</div> : <p className="text-sm text-muted-foreground">No release judgement recorded.</p>}</div>
              <div><p className="text-xs text-muted-foreground">Generation Readiness</p><p className="text-sm text-muted-foreground">{generationAudit.summary}</p><div className="flex flex-wrap gap-1 mt-2"><Badge variant="outline" className={`text-[10px] ${generationAudit.releaseDecision === "ready" ? "border-emerald-500/30 text-emerald-300" : generationAudit.releaseDecision === "blocked" ? "border-rose-500/30 text-rose-300" : "border-amber-500/30 text-amber-300"}`}>{generationAudit.releaseDecision.replace(/_/g, " ")}</Badge><Badge variant="outline" className="text-[10px]">{generationAudit.totals.passing}/{generationAudit.totals.checks} passing</Badge>{generationAudit.totals.failures > 0 && <Badge variant="outline" className="text-[10px] border-rose-500/30 text-rose-300">{generationAudit.totals.failures} failures</Badge>}{generationAudit.totals.warnings > 0 && <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-300">{generationAudit.totals.warnings} warnings</Badge>}</div></div>
              {executionReport && <div><p className="text-xs text-muted-foreground">Execution Pipeline</p><p className="text-sm text-muted-foreground">{executionReport.summary}</p><div className="flex flex-wrap gap-1 mt-2"><Badge variant="outline" className={`text-[10px] ${executionReport.releaseDecision === "ready" ? "border-emerald-500/30 text-emerald-300" : executionReport.releaseDecision === "blocked" ? "border-rose-500/30 text-rose-300" : "border-amber-500/30 text-amber-300"}`}>{executionReport.releaseDecision.replace(/_/g, " ")}</Badge><Badge variant="outline" className="text-[10px]">{executionReport.totals.passing}/{executionReport.totals.checks} passing</Badge>{executionReport.autoRepairApplied && <Badge variant="secondary" className="text-[10px]">auto-repaired</Badge>}</div><div className="flex flex-wrap gap-1 mt-2">{executionReport.workerSequence.map(agentName => <Badge key={agentName} variant="outline" className="text-xs">{agentName}</Badge>)}</div></div>}
              <div><p className="text-xs text-muted-foreground">Agent Briefing Coverage</p><div className="flex flex-wrap gap-1 mt-1">{generationContext.agentBriefs.map(brief => <Badge key={brief.agentName} variant="outline" className="text-xs">{brief.displayName} · {brief.assignedSystems.length}</Badge>)}</div></div>
              <div><p className="text-xs text-muted-foreground">Chosen Generation Candidate</p>{chosenGenerationCandidate ? <div className="mt-1 rounded-lg border border-border/50 bg-muted/20 p-3"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{chosenGenerationCandidate.title}</p><Badge variant="outline" className="text-[10px]">score {chosenGenerationCandidate.score.total}</Badge><Badge variant="outline" className="text-[10px]">{chosenGenerationCandidate.runtimeArchetype.replace(/_/g, " ")}</Badge><Badge variant="outline" className="text-[10px]">knowledge {chosenGenerationCandidate.knowledgeFit ?? "balanced"}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{chosenGenerationCandidate.premise}</p><div className="mt-2 flex flex-wrap gap-1">{chosenGenerationCandidate.differentiators.map(item => <Badge key={item} variant="secondary" className="text-xs">{item}</Badge>)}</div>{(chosenGenerationCandidate.knowledgeNotes?.length ?? 0) > 0 ? <div className="mt-2 space-y-1">{chosenGenerationCandidate.knowledgeNotes.map(item => <p key={item} className="text-xs text-muted-foreground">{item}</p>)}</div> : null}</div> : <p className="text-sm text-muted-foreground">No candidate ranking data recorded.</p>}</div>
              <div><p className="text-xs text-muted-foreground">Candidate Ranking</p><div className="space-y-2 mt-1">{project.design.candidatePlan.candidates.map(candidate => <div key={candidate.id} className="rounded-lg border border-border/50 bg-muted/20 p-3"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{candidate.title}</p>{candidate.id === project.design.candidatePlan.chosenCandidateId && <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-300">selected</Badge>}<Badge variant="outline" className="text-[10px]">fidelity {candidate.score.fidelity}</Badge><Badge variant="outline" className="text-[10px]">novelty {candidate.score.novelty}</Badge><Badge variant="outline" className="text-[10px]">total {candidate.score.total}</Badge><Badge variant="outline" className="text-[10px]">knowledge {candidate.knowledgeFit ?? "balanced"}</Badge></div><p className="mt-2 text-xs text-muted-foreground">{candidate.premise}</p>{(candidate.knowledgeNotes?.length ?? 0) > 0 ? <div className="mt-2 space-y-1">{candidate.knowledgeNotes.map(note => <p key={note} className="text-xs text-muted-foreground">{note}</p>)}</div> : null}{candidate.riskFlags.length > 0 && <div className="mt-2 space-y-1">{candidate.riskFlags.map(flag => <p key={flag} className="text-xs text-muted-foreground">{flag}</p>)}</div>}</div>)}</div></div>
              <div><p className="text-xs text-muted-foreground">Reference Retrieval</p><div className="space-y-2 mt-1">{project.design.diversityPlan.retrievalExamples.map(reference => <div key={reference.id} className="rounded-lg border border-border/50 bg-muted/20 p-3"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{reference.title}</p><Badge variant="outline" className="text-[10px]">{reference.genre.replace(/_/g, " ")}</Badge><Badge variant="outline" className="text-[10px] uppercase">{reference.dimension}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{reference.fit}</p><p className="mt-2 text-xs text-muted-foreground">{reference.retrievalReason}</p></div>)}</div></div>
              <div><p className="text-xs text-muted-foreground">Evaluation Plan</p><p className="text-sm text-muted-foreground">{project.design.evaluationPlan.evaluationStrategy}</p><div className="space-y-1 mt-2">{project.design.evaluationPlan.datasetBuckets.map(bucket => <p key={bucket.id} className="text-sm text-muted-foreground">{bucket.label}: {bucket.checks.join(" ")}</p>)}</div><div className="flex flex-wrap gap-1 mt-2">{project.design.evaluationPlan.rubrics.map(rubric => <Badge key={rubric.id} variant="outline" className="text-xs">{rubric.label} · pass {rubric.passThreshold}</Badge>)}</div></div>
              <div><p className="text-xs text-muted-foreground">Diversity Memory</p><p className="text-sm text-muted-foreground">{project.design.diversityPlan.rankingStrategy}</p><p className="mt-1 text-xs text-muted-foreground font-mono">{project.design.diversityPlan.diversityMemoryKey}</p><div className="flex flex-wrap gap-1 mt-2">{project.design.diversityPlan.overusedPatternRisks.map(item => <Badge key={item} variant="outline" className="text-xs border-amber-500/20 text-amber-300">{item}</Badge>)}</div><div className="space-y-1 mt-2">{project.design.diversityPlan.antiCollapseChecks.map(item => <p key={item} className="text-sm text-muted-foreground">{item}</p>)}</div></div>
              <div><p className="text-xs text-muted-foreground">Map Construction</p><p className="text-sm text-muted-foreground">{project.design.mapArchetype} &middot; {project.design.mapOverview}</p></div>
              <div><p className="text-xs text-muted-foreground">Gameplay Loop</p><div className="flex flex-wrap gap-1 mt-1">{project.design.coreLoop.map(stepItem => <Badge key={stepItem} variant="secondary" className="text-xs">{stepItem}</Badge>)}</div></div>
              <div><p className="text-xs text-muted-foreground">Level Beats</p><div className="space-y-1 mt-1">{project.design.levelSequence.map(beat => <p key={beat.title} className="text-sm text-muted-foreground">{beat.title}: {beat.purpose}</p>)}</div></div>
              <div><p className="text-xs text-muted-foreground">Complementary Systems</p><div className="flex flex-wrap gap-1 mt-1">{project.design.supplementalSystems.map(system => <Badge key={system.name} variant="outline" className="text-xs">{system.displayName}</Badge>)}</div></div>
              <div><p className="text-xs text-muted-foreground">Graphics Render Path</p><p className="text-sm text-muted-foreground">{project.design.graphicsPlan.renderPath}</p></div>
              <div><p className="text-xs text-muted-foreground">Visual Identity</p><p className="text-sm text-muted-foreground">{project.design.graphicsPlan.visualIdentity}</p></div>
              <div><p className="text-xs text-muted-foreground">Lighting Model</p><p className="text-sm text-muted-foreground">{project.design.graphicsPlan.lightingModel}</p></div>
              <div><p className="text-xs text-muted-foreground">Graphics Scaling</p><p className="text-sm text-muted-foreground">{project.design.graphicsPlan.scalabilityStrategy}</p><div className="flex flex-wrap gap-1 mt-2">{project.design.graphicsPlan.lowSpecFallbacks.map(item => <Badge key={item} variant="outline" className="text-xs border-sky-500/20 text-sky-300">{item}</Badge>)}</div></div>
              <div><p className="text-xs text-muted-foreground">Engine Recommendation</p><p className="text-sm text-muted-foreground">{project.design.enginePlan.recommendedEngine} · {project.design.enginePlan.rationale}</p></div>
              <div><p className="text-xs text-muted-foreground">Engine Strengths</p><div className="flex flex-wrap gap-1 mt-1">{project.design.enginePlan.strengths.map(item => <Badge key={item} variant="secondary" className="text-xs">{item}</Badge>)}</div></div>
              <div><p className="text-xs text-muted-foreground">Critical Engine Subsystems</p><div className="flex flex-wrap gap-1 mt-1">{project.design.enginePlan.criticalSubsystems.map(item => <Badge key={item} variant="outline" className="text-xs">{item}</Badge>)}</div></div>
              <div><p className="text-xs text-muted-foreground">Generation Feedback</p><p className="text-sm text-muted-foreground">{feedbackDigest.totalReports > 0 ? `${feedbackDigest.totalReports} report${feedbackDigest.totalReports === 1 ? "" : "s"} · latest ${feedbackDigest.latestScoreBand} · failure pressure ${feedbackDigest.failurePressure}` : "No player feedback captured yet."}</p>{feedbackDigest.improvementPriorities.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{feedbackDigest.improvementPriorities.map(priority => <Badge key={priority} variant="outline" className="text-xs border-amber-500/20 text-amber-300">{priority}</Badge>)}</div>}</div>
              <div><p className="text-xs text-muted-foreground">Recognized Feedback Issues</p>{feedbackLearning.recognizedIssues.length > 0 ? <div className="space-y-2 mt-1">{feedbackLearning.recognizedIssues.map(issue => <div key={issue.id} className="rounded-lg border border-border/50 bg-muted/20 p-3"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{issue.label}</p><Badge variant="outline" className={`text-[10px] ${issue.severity === "high" ? "border-rose-500/30 text-rose-300" : issue.severity === "medium" ? "border-amber-500/30 text-amber-300" : "border-sky-500/30 text-sky-300"}`}>{issue.severity}</Badge><Badge variant="outline" className="text-[10px]">{issue.confidence} confidence</Badge></div><div className="mt-2 space-y-1">{issue.evidence.map(evidence => <p key={evidence} className="text-xs text-muted-foreground">{evidence}</p>)}</div></div>)}</div> : <p className="text-sm text-muted-foreground">No repair signals recognized yet.</p>}</div>
              <div><p className="text-xs text-muted-foreground">Source Repair Targets</p>{feedbackLearning.sourceRepairPlan.length > 0 ? <div className="space-y-2 mt-1">{feedbackLearning.sourceRepairPlan.map(target => <div key={target.id} className="rounded-lg border border-border/50 bg-muted/20 p-3"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{target.label}</p><Badge variant="outline" className={`text-[10px] ${target.priority === "high" ? "border-rose-500/30 text-rose-300" : target.priority === "medium" ? "border-amber-500/30 text-amber-300" : "border-sky-500/30 text-sky-300"}`}>{target.priority}</Badge><Badge variant="outline" className="text-[10px]">{target.category.replace(/_/g, " ")}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{target.rationale}</p><p className="mt-2 text-xs text-muted-foreground">Files: {target.files.join(", ")}</p><div className="mt-2 space-y-1">{target.actions.map(action => <p key={action} className="text-xs text-muted-foreground">{action}</p>)}</div></div>)}</div> : <p className="text-sm text-muted-foreground">No source repair targets yet.</p>}</div>
              <div><p className="text-xs text-muted-foreground">Generation Repair Plan</p>{feedbackLearning.generationRepairPlan.promptRepairs.length > 0 || feedbackLearning.generationRepairPlan.runtimeRepairs.length > 0 ? <div className="flex flex-wrap gap-1 mt-1">{[...feedbackLearning.generationRepairPlan.promptRepairs, ...feedbackLearning.generationRepairPlan.runtimeRepairs, ...feedbackLearning.generationRepairPlan.evalAdditions].slice(0, 8).map(item => <Badge key={item} variant="outline" className="text-xs border-sky-500/20 text-sky-300">{item}</Badge>)}</div> : <p className="text-sm text-muted-foreground">No generation repair plan yet.</p>}</div>
              <Separator />
              <div><p className="text-xs text-muted-foreground">Asset Production Style</p><p className="text-sm text-muted-foreground">{project.design.assetPlan.productionStyle}</p></div>
              <div><p className="text-xs text-muted-foreground">Asset System Summary</p><p className="text-sm text-muted-foreground">{project.design.assetPlan.assetSystemSummary}</p></div>
              <div><p className="text-xs text-muted-foreground">Asset Pipeline Summary</p><p className="text-sm text-muted-foreground">{project.design.assetPlan.assetPipelineSummary}</p></div>
              <div><p className="text-xs text-muted-foreground">Model Generation Summary</p><p className="text-sm text-muted-foreground">{project.design.assetPlan.modelGenerationSummary}</p></div>
              <div><p className="text-xs text-muted-foreground">Kit Architecture</p><p className="text-sm text-muted-foreground">{project.design.assetPlan.kitArchitecture}</p></div>
              <div><p className="text-xs text-muted-foreground">Assembly Strategy</p><p className="text-sm text-muted-foreground">{project.design.assetPlan.assemblyStrategy}</p></div>
              <div><p className="text-xs text-muted-foreground">Asset Orchestration</p><p className="text-sm text-muted-foreground">{project.design.assetPlan.orchestrationStrategy}</p></div>
              <div><p className="text-xs text-muted-foreground">Character Strategy</p><p className="text-sm text-muted-foreground">{project.design.assetPlan.characterStrategy}</p></div>
              <div><p className="text-xs text-muted-foreground">Prop Strategy</p><p className="text-sm text-muted-foreground">{project.design.assetPlan.propStrategy}</p></div>
              <div><p className="text-xs text-muted-foreground">Environment Strategy</p><p className="text-sm text-muted-foreground">{project.design.assetPlan.environmentStrategy}</p></div>
              <div><p className="text-xs text-muted-foreground">Reuse Directives</p><div className="space-y-1 mt-1">{project.design.assetPlan.reuseDirectives.map(rule => <p key={rule} className="text-sm text-muted-foreground">{rule}</p>)}</div></div>
              <div><p className="text-xs text-muted-foreground">State Model Rules</p><div className="space-y-1 mt-1">{project.design.assetPlan.stateModelRules.map(rule => <p key={rule} className="text-sm text-muted-foreground">{rule}</p>)}</div></div>
              <div><p className="text-xs text-muted-foreground">Spawn Rules</p><div className="space-y-1 mt-1">{project.design.assetPlan.spawnRules.map(rule => <p key={rule} className="text-sm text-muted-foreground">{rule}</p>)}</div></div>
              <div><p className="text-xs text-muted-foreground">Production Phases</p><div className="space-y-2 mt-1">{project.design.assetPlan.productionPhases.map(phase => <div key={phase.name} className="rounded-lg border border-border/50 bg-muted/20 p-3"><p className="text-sm font-medium">{phase.name}</p><p className="text-xs text-muted-foreground mt-1">{phase.goal}</p><p className="mt-2 text-xs text-muted-foreground">Deliverables: {phase.deliverables.join(", ")}</p></div>)}</div></div>
              <div><p className="text-xs text-muted-foreground">Integration Contracts</p><div className="space-y-2 mt-1">{project.design.assetPlan.integrationContracts.map(contract => <div key={contract.id} className="rounded-lg border border-border/50 bg-muted/20 p-3"><p className="text-sm font-medium">{contract.focus}</p><p className="text-xs text-muted-foreground mt-1">Targets: {contract.targetSystems.join(", ")}</p><div className="mt-2 space-y-1">{contract.rules.map(rule => <p key={rule} className="text-xs text-muted-foreground">{rule}</p>)}</div></div>)}</div></div>
              <div><p className="text-xs text-muted-foreground">Asset Specialist Tracks</p><div className="flex flex-wrap gap-1 mt-1">{project.design.assetPlan.specialistTracks.map(track => <Badge key={track} variant="outline" className="text-xs">{track}</Badge>)}</div></div>
              <div><p className="text-xs text-muted-foreground">Asset Review Passes</p><div className="space-y-1 mt-1">{project.design.assetPlan.reviewPasses.map(pass => <p key={pass} className="text-sm text-muted-foreground">{pass}</p>)}</div></div>
              <div><p className="text-xs text-muted-foreground">Asset Quality Gates</p><div className="space-y-1 mt-1">{project.design.assetPlan.qualityGates.map(gate => <p key={gate} className="text-sm text-muted-foreground">{gate}</p>)}</div></div>
              <div><p className="text-xs text-muted-foreground">Toolchain Quality Checks</p><div className="space-y-1 mt-1">{project.design.assetPlan.toolchainQualityChecks.map(check => <p key={check} className="text-sm text-muted-foreground">{check}</p>)}</div></div>
              <div><p className="text-xs text-muted-foreground">Material Palette</p><div className="flex flex-wrap gap-1 mt-1">{project.design.assetPlan.materialPalette.map(material => <Badge key={material} variant="outline" className="text-xs">{material}</Badge>)}</div></div>
              <div><p className="text-xs text-muted-foreground">Animation Needs</p><div className="flex flex-wrap gap-1 mt-1">{project.design.assetPlan.animationNeeds.map(animation => <Badge key={animation} variant="secondary" className="text-xs">{animation}</Badge>)}</div></div>
              <div><p className="text-xs text-muted-foreground">Asset Rules</p><div className="space-y-1 mt-1">{project.design.assetPlan.generationRules.map(rule => <p key={rule} className="text-sm text-muted-foreground">{rule}</p>)}</div></div>
              <div><p className="text-xs text-muted-foreground">Model Generation Toolchains</p><div className="space-y-2 mt-1">{project.design.assetPlan.generationToolchains.map(toolchain => <div key={toolchain.id} className="rounded-lg border border-border/50 bg-muted/20 p-3"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{toolchain.label}</p><Badge variant="outline" className="text-[10px]">{toolchain.stage}</Badge></div><p className="mt-2 text-xs text-muted-foreground">{toolchain.objective}</p><p className="mt-2 text-xs text-muted-foreground">Primary: {toolchain.primarySource}</p><p className="text-xs text-muted-foreground">Support: {toolchain.supportingSources.join(", ")}</p><div className="mt-2 space-y-1">{toolchain.verificationChecks.map(check => <p key={check} className="text-xs text-muted-foreground">{check}</p>)}</div></div>)}</div></div>
              <div><p className="text-xs text-muted-foreground">Character Blueprints</p><div className="space-y-2 mt-1">{project.design.assetPlan.characterBlueprints.map(character => <div key={character.name} className="rounded-lg border border-border/50 bg-muted/20 p-3"><p className="text-sm font-medium">{character.name}</p><p className="text-xs text-muted-foreground">{character.role}</p><p className="mt-2 text-xs text-muted-foreground">Rig: {character.rigProfile}</p><p className="text-xs text-muted-foreground">Modules: {character.modules.join(", ")}</p><p className="text-xs text-muted-foreground">Animations: {character.animations.join(", ")}</p><p className="text-xs text-muted-foreground">State Variants: {character.stateVariants.join(", ")}</p><p className="text-xs text-muted-foreground">Hooks: {character.interactionHooks.join(", ")}</p><p className="text-xs text-muted-foreground">Spawn Contexts: {character.spawnContexts.join(", ")}</p></div>)}</div></div>
              <div><p className="text-xs text-muted-foreground">Prop Blueprints</p><div className="space-y-2 mt-1">{project.design.assetPlan.propBlueprints.map(prop => <div key={prop.name} className="rounded-lg border border-border/50 bg-muted/20 p-3"><p className="text-sm font-medium">{prop.name}</p><p className="text-xs text-muted-foreground">{prop.gameplayRole}</p><p className="mt-2 text-xs text-muted-foreground">Silhouette Role: {prop.silhouetteRole}</p><p className="text-xs text-muted-foreground">Modularity: {prop.modularity}</p><p className="text-xs text-muted-foreground">Materials: {prop.materials.join(", ")}</p><p className="text-xs text-muted-foreground">State Variants: {prop.stateVariants.join(", ")}</p><p className="text-xs text-muted-foreground">Hooks: {prop.interactionHooks.join(", ")}</p><p className="text-xs text-muted-foreground">Spawn Contexts: {prop.spawnContexts.join(", ")}</p></div>)}</div></div>
              <div><p className="text-xs text-muted-foreground">Environment Kits</p><div className="space-y-2 mt-1">{project.design.assetPlan.environmentKits.map(kit => <div key={kit.name} className="rounded-lg border border-border/50 bg-muted/20 p-3"><p className="text-sm font-medium">{kit.name}</p><p className="text-xs text-muted-foreground">{kit.purpose}</p><p className="mt-2 text-xs text-muted-foreground">Modules: {kit.modules.join(", ")}</p><p className="text-xs text-muted-foreground">Prop Families: {kit.propFamilies.join(", ")}</p><p className="text-xs text-muted-foreground">Character Anchors: {kit.characterAnchors.join(", ")}</p><p className="text-xs text-muted-foreground">Traversal: {kit.traversalAffordances.join(", ")}</p><p className="text-xs text-muted-foreground">State Variants: {kit.stateVariants.join(", ")}</p></div>)}</div></div>
              <div><p className="text-xs text-muted-foreground">GitHub Source Inspirations</p><div className="space-y-2 mt-1">{project.design.assetPlan.sourceInspirations.map(source => <a key={source.repo} href={source.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-3 py-3 text-sm transition-colors hover:bg-accent/60"><span className="min-w-0"><span className="block truncate font-medium">{source.name}</span><span className="block truncate text-xs text-muted-foreground">{source.repo} • {source.license} • {source.reusePolicy === "direct" ? "code-compatible" : "reference-only"}</span></span><ExternalLink className="h-3.5 w-3.5 text-muted-foreground" /></a>)}</div></div>
              <div><p className="text-xs text-muted-foreground">Created</p><p className="text-sm font-mono">{new Date(project.createdAt).toLocaleString()}</p></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
