"use client"

import { Badge } from "@/components/ui/badge"
import {
  buildRuntimePlaybookPlan,
  getRuntimePlaybookBeat,
  type RuntimePlaybookPlan,
} from "@/lib/engine/runtime-playbook"
import type { UserProject } from "@/lib/engine/types"

export function getProjectRuntimePlaybookPlan(project: UserProject): RuntimePlaybookPlan {
  return buildRuntimePlaybookPlan(project)
}

export function RuntimePlaybookPanel({
  plan,
  boardClassName,
  activeIndex = 0,
}: {
  plan: RuntimePlaybookPlan
  boardClassName: string
  activeIndex?: number
}) {
  const activeBeat = getRuntimePlaybookBeat(plan, activeIndex)

  return (
    <div className={boardClassName}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">Live Playbook</p>
        <Badge variant="outline">{plan.identityLabel}</Badge>
        <Badge variant="secondary">{plan.cadenceLabel}</Badge>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="rounded-lg border border-border/40 bg-background/40 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Active Beat</p>
            <Badge variant="outline">{activeBeat.category}</Badge>
          </div>
          <p className="mt-2 text-sm font-semibold text-foreground">{activeBeat.label}</p>
          <p className="mt-2 text-sm text-muted-foreground">{activeBeat.summary}</p>
        </div>
        <div className="rounded-lg border border-border/40 bg-background/40 p-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Play Feel</p>
          <p className="mt-2 text-sm font-semibold text-foreground">{plan.physics.profileLabel}</p>
          <p className="mt-2 text-sm text-muted-foreground">{plan.physics.movementStyle}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Physics + Tempo</p>
          <div className="mt-2 space-y-2 text-sm text-muted-foreground">
            <p>{plan.physics.collisionStyle}</p>
            <p>{plan.physics.tempoStyle}</p>
          </div>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">UI Emphasis</p>
          <p className="mt-2 text-sm text-muted-foreground">{plan.ui.hudStyle}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {plan.ui.focusWidgets.map((widget) => (
              <Badge key={widget} variant="secondary">{widget}</Badge>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Pinned Readouts</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {plan.ui.pinnedWidgets.map((widget) => (
              <Badge key={widget} variant="outline">{widget}</Badge>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Directives</p>
        <p className="mt-2 text-sm text-muted-foreground">{plan.directives.join(" ")}</p>
      </div>
    </div>
  )
}
