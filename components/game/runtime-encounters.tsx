"use client"

import { Badge } from "@/components/ui/badge"
import {
  buildRuntimeEncounterDirector,
  getRuntimeEncounterBeat,
  type RuntimeEncounterDirector,
} from "@/lib/engine/runtime-encounters"
import type { UserProject } from "@/lib/engine/types"

export function getProjectRuntimeEncounterDirector(project: UserProject): RuntimeEncounterDirector {
  return buildRuntimeEncounterDirector(project)
}

export function RuntimeEncounterPanel({
  director,
  boardClassName,
  activeDirectiveIndex = 0,
  activeEventIndex = 0,
}: {
  director: RuntimeEncounterDirector
  boardClassName: string
  activeDirectiveIndex?: number
  activeEventIndex?: number
}) {
  const beat = getRuntimeEncounterBeat(director, activeDirectiveIndex, activeEventIndex)
  const nextWindow = director.cadenceWindows[(activeDirectiveIndex + 1) % Math.max(director.cadenceWindows.length, 1)] ?? director.cadenceWindows[0]

  return (
    <div className={boardClassName}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">Encounter Director</p>
        <Badge variant="outline">{director.scenarioLabel}</Badge>
        <Badge variant="secondary">{director.chainLabel}</Badge>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{director.scenarioHook}</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="rounded-lg border border-border/40 bg-background/40 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Active Objective Chain</p>
            <Badge variant="outline">{beat.directive.label}</Badge>
            {beat.cadenceWindow ? <Badge variant="secondary">{beat.cadenceWindow.stage}</Badge> : null}
          </div>
          <p className="mt-2 text-sm font-semibold text-foreground">{beat.directive.objective}</p>
          <p className="mt-2 text-sm text-muted-foreground">{beat.directive.complication}</p>
          <p className="mt-3 text-xs uppercase tracking-[0.22em] text-muted-foreground">Success Signal</p>
          <p className="mt-1 text-sm text-muted-foreground">{beat.directive.successSignal}</p>
          {beat.cadenceWindow ? (
            <>
              <p className="mt-3 text-xs uppercase tracking-[0.22em] text-muted-foreground">Cadence Hook</p>
              <p className="mt-1 text-sm text-muted-foreground">{beat.cadenceWindow.runtimeHook}</p>
            </>
          ) : null}
        </div>
        <div className="rounded-lg border border-border/40 bg-background/40 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Live Event Card</p>
            <Badge variant="outline">{beat.event.category}</Badge>
          </div>
          <p className="mt-2 text-sm font-semibold text-foreground">{beat.event.label}</p>
          <p className="mt-2 text-sm text-muted-foreground">{beat.event.summary}</p>
          <p className="mt-3 text-xs uppercase tracking-[0.22em] text-muted-foreground">Objective Shift</p>
          <p className="mt-1 text-sm text-muted-foreground">{beat.event.objectiveShift}</p>
          <p className="mt-3 text-xs uppercase tracking-[0.22em] text-muted-foreground">Trigger Window</p>
          <p className="mt-1 text-sm text-muted-foreground">{beat.event.triggerHint}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Encounter Mix</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <p>Aggression: <span className="font-mono text-foreground">{director.encounterMix.aggression.toFixed(2)}</span></p>
            <p>Interaction: <span className="font-mono text-foreground">{director.encounterMix.interaction.toFixed(2)}</span></p>
            <p>Support: <span className="font-mono text-foreground">{director.encounterMix.support.toFixed(2)}</span></p>
            <p>Environment: <span className="font-mono text-foreground">{director.encounterMix.environmental.toFixed(2)}</span></p>
          </div>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Focus Tags</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {beat.directive.focusTags.map((tag) => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Pinned Runtime Readouts</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {director.uiPins.map((pin) => (
              <Badge key={pin} variant="outline">{pin}</Badge>
            ))}
          </div>
        </div>
      </div>
      {beat.cadenceWindow ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-lg border border-border/40 bg-background/40 p-3">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Current Cadence Window</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{beat.cadenceWindow.label}</p>
            <p className="mt-2 text-sm text-muted-foreground">{beat.cadenceWindow.complicationFocus}</p>
            <p className="mt-3 text-xs uppercase tracking-[0.22em] text-muted-foreground">Success Focus</p>
            <p className="mt-1 text-sm text-muted-foreground">{beat.cadenceWindow.successFocus}</p>
          </div>
          {nextWindow ? (
            <div className="rounded-lg border border-border/40 bg-background/40 p-3">
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Next Shift</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{nextWindow.label}</p>
                <Badge variant="outline">{nextWindow.stage}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{nextWindow.objectiveFocus}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.22em] text-muted-foreground">Trigger</p>
              <p className="mt-1 text-sm text-muted-foreground">{nextWindow.triggerWindow}</p>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="mt-4 rounded-lg border border-border/40 bg-background/40 p-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Prompt Continuity Rules</p>
        <div className="mt-2 space-y-2 text-sm text-muted-foreground">
          {director.promptBridge.continuityRules.map((rule) => (
            <p key={rule}>{rule}</p>
          ))}
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-border/40 bg-background/40 p-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Mid-Session Variation</p>
        <div className="mt-2 space-y-2 text-sm text-muted-foreground">
          {director.promptBridge.midSessionVariation.map((entry) => (
            <p key={entry}>{entry}</p>
          ))}
        </div>
      </div>
      <div className="mt-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Scenario Notes</p>
        <p className="mt-2 text-sm text-muted-foreground">{director.scenarioNotes.join(" ")}</p>
      </div>
    </div>
  )
}
