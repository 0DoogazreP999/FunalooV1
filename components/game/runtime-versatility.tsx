"use client"

import { Badge } from "@/components/ui/badge"
import { planGenerationRuntimeVersatility } from "@/lib/engine/generation-intelligence/runtime-versatility-planner"
import type { GenerationRuntimeVersatilityPlan, UserProject } from "@/lib/engine/types"

export function getProjectRuntimeVersatilityPlan(project: UserProject): GenerationRuntimeVersatilityPlan {
  return project.design.runtimeVersatilityPlan ?? planGenerationRuntimeVersatility({
    prompt: `${project.name}. ${project.description}`,
    genre: project.design.resolvedGenre ?? project.genre,
    dimension: project.design.dimension ?? project.dimension,
    runtimeArchetype: project.design.runtimePlan.archetype,
    promptSignals: project.design.promptSignals ?? [],
    resolvedFeatures: project.design.resolvedFeatures ?? project.features,
    contentPillars: project.design.contentPillars ?? [],
    coreLoop: project.design.coreLoop ?? [],
    secondaryLoop: project.design.secondaryLoop ?? [],
    progressionLoop: project.design.progressionLoop ?? [],
    uiSurfaces: project.design.uiSurfaces ?? [],
    environmentThemes: project.design.environmentThemes ?? [],
  })
}

export function RuntimeVersatilityPanel({
  plan,
  boardClassName,
}: {
  plan: GenerationRuntimeVersatilityPlan
  boardClassName: string
}) {
  return (
    <div className={boardClassName}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">Runtime Adaptation</p>
        <Badge variant="outline">{plan.flavorLabel}</Badge>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{plan.runtimeSubtitle}</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Active Modules</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {plan.activeModules.map((module) => (
              <Badge key={module} variant="secondary">{module}</Badge>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Pressure Tracks</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {plan.pressureTracks.map((track) => (
              <Badge key={track} variant="outline">{track}</Badge>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Primary Verbs</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {plan.primaryVerbs.join(", ")}
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Objective Hooks</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {plan.objectiveHooks.join(" ")}
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Event Cues</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {plan.eventCues.map((cue) => (
              <Badge key={cue} variant="outline">{cue}</Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
