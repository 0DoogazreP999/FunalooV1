"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { FEEDBACK_SCORE_OPTIONS, buildFeedbackLearningReport, buildProjectFeedbackDigest, createProjectFeedback } from "@/lib/engine/feedback-learning"
import { FolderOpen, MessageSquarePlus, Play, Plus, Trash2 } from "lucide-react"
import type { GenerationFeedbackScoreBand, UserProject } from "@/lib/engine/types"

interface ProjectGalleryProps {
  projects: UserProject[]
  onCreateGame: () => void
  onOpenProject: (project: UserProject) => void
  onDeleteProject: (project: UserProject) => void
  onProjectUpdate: (projectId: UserProject["id"], updater: (project: UserProject) => UserProject) => void
}

export function ProjectGallery({
  projects,
  onCreateGame,
  onOpenProject,
  onDeleteProject,
  onProjectUpdate,
}: ProjectGalleryProps) {
  const { toast } = useToast()
  const [feedbackTarget, setFeedbackTarget] = useState<UserProject | null>(null)
  const [selectedBand, setSelectedBand] = useState<GenerationFeedbackScoreBand | null>(null)
  const [feedbackNotes, setFeedbackNotes] = useState("")

  const feedbackDigest = useMemo(
    () => buildProjectFeedbackDigest(feedbackTarget?.feedback),
    [feedbackTarget],
  )
  const feedbackLearningPreview = useMemo(() => {
    if (!feedbackTarget || !selectedBand || feedbackNotes.trim().length < 8) return null

    return buildFeedbackLearningReport({
      ...feedbackTarget,
      feedback: [
        {
          id: "feedback_preview",
          scoreBand: selectedBand,
          notes: feedbackNotes.trim(),
          submittedAt: new Date().toISOString(),
          runtimeArchetype: feedbackTarget.design.runtimePlan.archetype,
          runtimeLabel: feedbackTarget.design.runtimePlan.label,
          promptSummary: feedbackTarget.design.promptSummary,
        },
        ...(feedbackTarget.feedback ?? []),
      ],
    })
  }, [feedbackNotes, feedbackTarget, selectedBand])

  const resetFeedbackDialog = () => {
    setFeedbackTarget(null)
    setSelectedBand(null)
    setFeedbackNotes("")
  }

  const openFeedbackDialog = (project: UserProject) => {
    setFeedbackTarget(project)
    setSelectedBand(null)
    setFeedbackNotes("")
  }

  const submitFeedback = () => {
    if (!feedbackTarget || !selectedBand || feedbackNotes.trim().length < 8) return

    const nextFeedback = createProjectFeedback({
      project: feedbackTarget,
      scoreBand: selectedBand,
      notes: feedbackNotes,
    })

    onProjectUpdate(feedbackTarget.id, (project) => ({
      ...project,
      feedback: [nextFeedback, ...(project.feedback ?? [])],
    }))

    toast({
      title: "Feedback saved",
      description: "This generation report is now attached to the project and available to the learning pipeline.",
    })

    resetFeedbackDialog()
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">{projects.length} projects</p>
        <Button onClick={onCreateGame} size="sm" className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"><Plus className="mr-1 h-3 w-3" /> New Game</Button>
      </div>
      {projects.length === 0 && (
        <div className="text-center py-16"><FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/20 mb-3" /><p className="text-muted-foreground">No projects yet. Create your first game!</p></div>
      )}
      {projects.map(p => (
        <Card key={p.id} className="border-border/50 bg-card/50 hover:border-violet-500/30 transition-colors">
          <CardContent className="p-4">
            {(() => {
              const digest = buildProjectFeedbackDigest(p.feedback)

              return (
            <div className="flex items-start justify-between">
              <button onClick={() => onOpenProject(p)} className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{p.name}</h3>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px]">{p.status}</Badge>
                  {p.multiplayer && <Badge variant="secondary" className="text-[9px]">Multiplayer</Badge>}
                  {digest.latestScoreBand && (
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        digest.failurePressure === "high"
                          ? "border-rose-500/30 text-rose-300"
                          : digest.failurePressure === "medium"
                            ? "border-amber-500/30 text-amber-300"
                            : "border-sky-500/30 text-sky-300"
                      }`}
                    >
                      {digest.latestScoreBand}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{p.description}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="capitalize">{p.genre.replace(/_/g, " ")}</span><span>&middot;</span>
                  <span>{p.dimension.toUpperCase()}</span><span>&middot;</span>
                  <span className="capitalize">{p.engine}</span><span>&middot;</span>
                  <span>{p.multiplayer ? `${p.maxPlayers} players` : "solo"}</span><span>&middot;</span>
                  <span>{p.systems.length} systems</span><span>&middot;</span>
                  <span>{p.systems.reduce((s, sys) => s + sys.linesGenerated, 0).toLocaleString()} lines</span>
                  {digest.totalReports > 0 && (
                    <>
                      <span>&middot;</span>
                      <span>{digest.totalReports} report{digest.totalReports === 1 ? "" : "s"}</span>
                    </>
                  )}
                </div>
                {digest.totalReports > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {digest.recurringThemes.length > 0
                      ? digest.recurringThemes.map((theme) => (
                        <Badge key={theme} variant="outline" className="text-[10px] border-amber-500/20 text-amber-300">
                          {theme}
                        </Badge>
                      ))
                      : <Badge variant="outline" className="text-[10px] border-sky-500/20 text-sky-300">Feedback learning active</Badge>}
                  </div>
                )}
              </button>
              <div className="flex items-center gap-1 flex-shrink-0 mt-1">
                <button
                  onClick={(e) => { e.stopPropagation(); openFeedbackDialog(p) }}
                  className="rounded-md p-1.5 text-sky-400 hover:bg-sky-500/10 transition-colors"
                  title="Rate this generation"
                >
                  <MessageSquarePlus className="h-4 w-4" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDeleteProject(p) }} className="rounded-md p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors" title="Delete project">
                  <Trash2 className="h-4 w-4" />
                </button>
                <button onClick={() => onOpenProject(p)} className="rounded-md p-1.5 text-violet-400 hover:bg-violet-500/10 transition-colors">
                  <Play className="h-5 w-5" />
                </button>
              </div>
            </div>
              )
            })()}
            {p.systems.length > 0 && <div className="flex flex-wrap gap-1 mt-3">{p.systems.map(sys => <Badge key={sys.name} variant="outline" className="text-[10px] border-emerald-500/20 text-emerald-400">{sys.displayName}</Badge>)}</div>}
          </CardContent>
        </Card>
      ))}

      <Dialog open={feedbackTarget !== null} onOpenChange={(open) => { if (!open) resetFeedbackDialog() }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Rate This Generation</DialogTitle>
            <DialogDescription>
              Score the generated game, then describe what should have been better so the learning agent can repair future runs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{feedbackTarget?.name}</p>
              <p className="mt-1">{feedbackTarget?.design.promptSummary}</p>
              <p className="mt-2 text-xs">
                Runtime: {feedbackTarget?.design.runtimePlan.label} {feedbackTarget ? `· ${feedbackTarget.dimension.toUpperCase()} ${feedbackTarget.genre.replace(/_/g, " ")}` : ""}
              </p>
            </div>

            {feedbackDigest.totalReports > 0 && (
              <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Existing Learning Pressure</p>
                <p className="mt-1">
                  {feedbackDigest.totalReports} report{feedbackDigest.totalReports === 1 ? "" : "s"} · latest {feedbackDigest.latestScoreBand} · pressure {feedbackDigest.failurePressure}
                </p>
                {feedbackDigest.improvementPriorities.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {feedbackDigest.improvementPriorities.map((priority) => (
                      <Badge key={priority} variant="outline" className="text-[10px] border-amber-500/20 text-amber-300">
                        {priority}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">Generation Score</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {FEEDBACK_SCORE_OPTIONS.map((option) => (
                  <button
                    key={option.band}
                    type="button"
                    onClick={() => setSelectedBand(option.band)}
                    className={`rounded-lg border px-3 py-3 text-left transition-colors ${
                      selectedBand === option.band
                        ? option.band === "failed"
                          ? "border-rose-500/50 bg-rose-500/10"
                          : "border-sky-500/50 bg-sky-500/10"
                        : "border-border/50 bg-background/40 hover:bg-accent/60"
                    }`}
                  >
                    <p className="text-sm font-medium">{option.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">How Could It Have Been Better?</p>
              <Textarea
                value={feedbackNotes}
                onChange={(event) => setFeedbackNotes(event.target.value)}
                placeholder="Example: I asked for a 3D zombie survival game, but it still felt like a generic top-down shooter. It needed scavenging, shelter repair, and horde-night pressure."
                className="min-h-[160px]"
              />
            </div>

            {feedbackLearningPreview && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Recognition Preview</p>
                <p className="mt-1">
                  {feedbackLearningPreview.recognizedIssues.length > 0
                    ? `Detected ${feedbackLearningPreview.recognizedIssues.length} repair signal${feedbackLearningPreview.recognizedIssues.length === 1 ? "" : "s"}.`
                    : "No strong repair signal detected yet. Add more detail about what felt wrong."}
                </p>
                {feedbackLearningPreview.recognizedIssues.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {feedbackLearningPreview.recognizedIssues.map((issue) => (
                      <Badge key={issue.id} variant="outline" className="text-[10px] border-amber-500/20 text-amber-300">
                        {issue.label} · {issue.severity}
                      </Badge>
                    ))}
                  </div>
                )}
                {feedbackLearningPreview.sourceRepairPlan.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {feedbackLearningPreview.sourceRepairPlan.slice(0, 3).map((target) => (
                      <p key={target.id} className="text-xs text-muted-foreground">
                        {target.label}: {target.files.join(", ")}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={resetFeedbackDialog}>Cancel</Button>
            <Button type="button" onClick={submitFeedback} disabled={!selectedBand || feedbackNotes.trim().length < 8}>
              Save Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
