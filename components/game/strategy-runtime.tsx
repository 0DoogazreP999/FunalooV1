"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getProjectRuntimeEncounterDirector, RuntimeEncounterPanel } from "@/components/game/runtime-encounters"
import { getRuntimeGraphicsPresentation } from "@/components/game/runtime-graphics"
import { getProjectRuntimePlaybookPlan, RuntimePlaybookPanel } from "@/components/game/runtime-playbook"
import { getProjectRuntimeVersatilityPlan, RuntimeVersatilityPanel } from "@/components/game/runtime-versatility"
import { getRuntimeEncounterTickWeights } from "@/lib/engine/runtime-encounters"
import { buildRuntimeScaffoldingPlan } from "@/lib/engine/runtime-scaffolding"
import { Coins, Flag, Pause, Play, Radar, RotateCcw, Shield, Swords } from "lucide-react"
import type { UserProject } from "@/lib/engine/types"

interface SectorState {
  id: string
  name: string
  control: number
  threat: number
  fortification: number
  yield: number
  status: string
}

interface CommandState {
  turn: number
  commandPoints: number
  supply: number
  morale: number
  intel: number
  activeDirectiveIndex: number
  activeEventIndex: number
  eventLog: string[]
  selectedSectorId: string
  sectors: SectorState[]
  paused: boolean
  won: boolean
  failed: boolean
  objective: string
}

function createInitialSectors(scaffolding: ReturnType<typeof buildRuntimeScaffoldingPlan>): SectorState[] {
  const [first, second, third, fourth] = scaffolding.sectorNames
  const [statusA, statusB, statusC, statusD] = scaffolding.boardStatuses
  return [
    { id: "north", name: first ?? "North Line", control: 52, threat: 46, fortification: 28, yield: 3, status: statusA ?? "contested" },
    { id: "river", name: second ?? "River Gate", control: 64, threat: 32, fortification: 40, yield: 4, status: statusB ?? "holding" },
    { id: "market", name: third ?? "Market Core", control: 58, threat: 38, fortification: 24, yield: 5, status: statusC ?? "contested" },
    { id: "relay", name: fourth ?? "Relay Ridge", control: 44, threat: 52, fortification: 22, yield: 3, status: statusD ?? "at risk" },
  ]
}

function createInitialState(
  plan: ReturnType<typeof getProjectRuntimeVersatilityPlan>,
  scaffolding: ReturnType<typeof buildRuntimeScaffoldingPlan>,
  playbook: ReturnType<typeof getProjectRuntimePlaybookPlan>,
  director: ReturnType<typeof getProjectRuntimeEncounterDirector>,
): CommandState {
  const sectors = createInitialSectors(scaffolding)

  return {
    turn: 1,
    commandPoints: 6 + Math.round(scaffolding.tuning.interactionDensity - 1) + Math.max(0, Math.round((playbook.tuning.interactionFrequency - 1) * 2)),
    supply: 10 + Math.max(0, scaffolding.tuning.resourceBonus) + Math.max(0, Math.round((playbook.tuning.rewardRate - 1) * 2)),
    morale: 74 + Math.round((scaffolding.tuning.recoveryBoost - 1) * 10) + Math.round((playbook.tuning.recoveryWindow - 1) * 8),
    intel: 4,
    activeDirectiveIndex: 0,
    activeEventIndex: 0,
    eventLog: director.eventDeck.slice(0, 1).map((event) => event.label),
    selectedSectorId: sectors[0]?.id ?? "north",
    sectors,
    paused: false,
    won: false,
    failed: false,
    objective: plan.objectiveHooks[0] ?? "Secure the contested sectors, keep morale stable, and build a command lead before the front collapses.",
  }
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value))
}

function evaluateState(
  next: CommandState,
  plan: ReturnType<typeof getProjectRuntimeVersatilityPlan>,
) {
  const averageControl = next.sectors.reduce((sum, sector) => sum + sector.control, 0) / next.sectors.length
  const highThreatSectors = next.sectors.filter((sector) => sector.threat >= 70).length

  if (averageControl >= 74 && next.turn >= 5) {
    next.won = true
    next.failed = false
    next.objective = `${plan.flavorLabel} stabilized. ${plan.pressureTracks[0]} and sector control now read like a real strategy slice.`
    return next
  }

  if (next.morale <= 0 || highThreatSectors >= 3 || next.turn > 8) {
    next.failed = true
    next.objective = `${plan.flavorLabel} collapsed under pressure. Rebalance ${plan.resourceLabels.primary.toLowerCase()}, recovery, and timing earlier.`
    return next
  }

  next.objective = highThreatSectors > 0
    ? `${plan.encounterLabels.hostile} pressure is spiking. ${plan.actionLabels.recovery} or ${plan.actionLabels.primary.toLowerCase()} before ${plan.resourceLabels.secondary.toLowerCase()} drops.`
    : `Push the board state forward. Spend ${plan.resourceLabels.primary.toLowerCase()} where ${plan.pressureTracks[2].toLowerCase()} matters most.`

  return next
}

function sectorTone(sector: SectorState) {
  if (sector.threat >= 65) return "border-rose-500/40 bg-rose-500/10"
  if (sector.control >= 70) return "border-emerald-500/40 bg-emerald-500/10"
  return "border-amber-500/30 bg-amber-500/10"
}

export function StrategyRuntime({ project }: { project: UserProject }) {
  const graphicsPresentation = getRuntimeGraphicsPresentation(project)
  const versatility = useMemo(() => getProjectRuntimeVersatilityPlan(project), [project])
  const scaffolding = useMemo(() => buildRuntimeScaffoldingPlan(project), [project])
  const playbook = useMemo(() => getProjectRuntimePlaybookPlan(project), [project])
  const director = useMemo(() => getProjectRuntimeEncounterDirector(project), [project])
  const [state, setState] = useState<CommandState>(() => createInitialState(versatility, scaffolding, playbook, director))

  const selectedSector = useMemo(
    () => state.sectors.find((sector) => sector.id === state.selectedSectorId) ?? state.sectors[0],
    [state.selectedSectorId, state.sectors],
  )
  const averageControl = useMemo(
    () => Math.round(state.sectors.reduce((sum, sector) => sum + sector.control, 0) / state.sectors.length),
    [state.sectors],
  )

  useEffect(() => {
    setState(createInitialState(versatility, scaffolding, playbook, director))
  }, [director, playbook, project.id, scaffolding, versatility])

  const restartRun = useCallback(() => {
    setState(createInitialState(versatility, scaffolding, playbook, director))
  }, [director, playbook, scaffolding, versatility])

  const togglePause = useCallback(() => {
    setState((current) => ({
      ...current,
      paused: !current.paused,
      objective: !current.paused
        ? "Command paused. Review the sectors before committing resources."
        : current.failed
          ? current.objective
          : current.won
            ? current.objective
            : `${versatility.flavorLabel} resumed. Pressure the front where ${versatility.encounterLabels.hostile.toLowerCase()} is highest.`,
    }))
  }, [versatility.encounterLabels.hostile, versatility.flavorLabel])

  const selectSector = useCallback((sectorId: string) => {
    setState((current) => ({
      ...current,
      selectedSectorId: sectorId,
    }))
  }, [])

  const applyToSelectedSector = useCallback((updater: (sector: SectorState) => SectorState, commandCost: number, supplyCost = 0, intelGain = 0) => {
    setState((current) => {
      if (current.paused || current.won || current.failed) return current
      const activeDirective = director.objectiveChain[current.activeDirectiveIndex % Math.max(director.objectiveChain.length, 1)] ?? director.objectiveChain[0]
      if (current.commandPoints < commandCost || current.supply < supplyCost) {
        return {
          ...current,
          objective: "Not enough command resources for that move. End the turn or rebalance supply first.",
        }
      }

      const sectors = current.sectors.map((sector) =>
        sector.id === current.selectedSectorId ? updater(sector) : sector,
      )
      return evaluateState({
        ...current,
        sectors,
        commandPoints: current.commandPoints - commandCost,
        supply: current.supply - supplyCost,
        intel: clamp(current.intel + intelGain, 0, 12),
        objective: `${activeDirective.label}: ${activeDirective.objective}`,
      }, versatility)
    })
  }, [director, versatility])

  const allocateSupply = useCallback(() => {
    const activeEvent = director.eventDeck[state.activeEventIndex % Math.max(director.eventDeck.length, 1)] ?? director.eventDeck[0]
    const activeWeights = getRuntimeEncounterTickWeights(director, state.activeDirectiveIndex, state.activeEventIndex, state.turn / 8)
    applyToSelectedSector((sector) => ({
      ...sector,
      control: clamp(sector.control + Math.round((6 + Math.round((playbook.tuning.rewardRate - 1) * 4)) * activeWeights.reward), 0, 100),
      threat: clamp(sector.threat - Math.round((5 + Math.round((playbook.tuning.recoveryWindow - 1) * 3)) * activeWeights.recovery), 0, 100),
      yield: clamp(sector.yield + Math.max(1, Math.round((1 + Math.max(0, Math.round((playbook.tuning.rewardRate - 1) * 2))) * activeWeights.reward)), 1, 8),
      status: `${activeEvent.label.toLowerCase()} resupply`,
    }), 2, 2, 1)
  }, [applyToSelectedSector, director, playbook.tuning.recoveryWindow, playbook.tuning.rewardRate, state.activeDirectiveIndex, state.activeEventIndex, state.turn])

  const fortifySector = useCallback(() => {
    const activeDirective = director.objectiveChain[state.activeDirectiveIndex % Math.max(director.objectiveChain.length, 1)] ?? director.objectiveChain[0]
    const activeWeights = getRuntimeEncounterTickWeights(director, state.activeDirectiveIndex, state.activeEventIndex, state.turn / 8)
    applyToSelectedSector((sector) => ({
      ...sector,
      fortification: clamp(sector.fortification + Math.round((12 + Math.round((playbook.tuning.recoveryWindow - 1) * 6)) * activeWeights.recovery), 0, 100),
      threat: clamp(sector.threat - Math.round((4 + Math.round((playbook.tuning.recoveryWindow - 1) * 2)) * activeWeights.recovery), 0, 100),
      status: `${activeDirective.label.toLowerCase()} fortified`,
    }), 2, 1)
  }, [applyToSelectedSector, director, playbook.tuning.recoveryWindow, state.activeDirectiveIndex, state.activeEventIndex, state.turn])

  const launchOperation = useCallback(() => {
    const activeEvent = director.eventDeck[state.activeEventIndex % Math.max(director.eventDeck.length, 1)] ?? director.eventDeck[0]
    const activeWeights = getRuntimeEncounterTickWeights(director, state.activeDirectiveIndex, state.activeEventIndex, state.turn / 8)
    applyToSelectedSector((sector) => ({
      ...sector,
      control: clamp(sector.control + Math.round((10 + Math.round((playbook.tuning.mobility - 1) * 4)) * activeWeights.reward), 0, 100),
      threat: clamp(sector.threat - Math.round((12 + Math.round((playbook.tuning.pressure - 1) * 3)) * activeWeights.pressure), 0, 100),
      fortification: clamp(sector.fortification - 4, 0, 100),
      status: `${activeEvent.label.toLowerCase()} executed`,
    }), 3, 0, 2)
  }, [applyToSelectedSector, director, playbook.tuning.mobility, playbook.tuning.pressure, state.activeDirectiveIndex, state.activeEventIndex, state.turn])

  const endTurn = useCallback(() => {
    setState((current) => {
      if (current.won || current.failed) return current
      const activeEvent = director.eventDeck[current.activeEventIndex % Math.max(director.eventDeck.length, 1)] ?? director.eventDeck[0]
      const activeWeights = getRuntimeEncounterTickWeights(director, current.activeDirectiveIndex, current.activeEventIndex, current.turn / 8)
      const nextDirectiveIndex = current.activeDirectiveIndex + 1
      const nextEventIndex = current.activeEventIndex + 1
      const nextDirective = director.objectiveChain[nextDirectiveIndex % Math.max(director.objectiveChain.length, 1)] ?? director.objectiveChain[0]
      const nextEvent = director.eventDeck[nextEventIndex % Math.max(director.eventDeck.length, 1)] ?? director.eventDeck[0]

      const income = current.sectors.reduce((sum, sector) => sum + sector.yield, 0)
      const nextSectors = current.sectors.map((sector) => {
        const threatShift = sector.fortification >= 50 ? 1 : Math.round(5 * scaffolding.tuning.pressureRate * playbook.tuning.pressure * activeWeights.pressure)
        const newThreat = clamp(sector.threat + threatShift - Math.floor(sector.control / 25), 0, 100)
        const newControl = clamp(
          sector.control + Math.floor(sector.fortification / 30) - Math.floor(newThreat / 24),
          0,
          100,
        )

        return {
          ...sector,
          threat: newThreat,
          control: newControl,
          status:
            newThreat >= 68
              ? "front cracking"
              : newControl >= 70
                ? "secured"
                : "contested",
        }
      })

      const moralePenalty = nextSectors.filter((sector) => sector.threat >= 70).length * 8
      const next = {
        ...current,
        turn: current.turn + 1,
        activeDirectiveIndex: nextDirectiveIndex,
        activeEventIndex: nextEventIndex,
        eventLog: [nextEvent.label, ...current.eventLog].slice(0, 4),
        sectors: nextSectors,
        commandPoints: 6 + Math.round(scaffolding.tuning.interactionDensity - 1) + Math.max(0, Math.round((playbook.tuning.interactionFrequency - 1) * 2 * activeWeights.interaction)) + nextSectors.filter((sector) => sector.control >= 65).length,
        supply: clamp(current.supply + Math.round((income + scaffolding.tuning.resourceBonus + Math.max(0, Math.round((playbook.tuning.rewardRate - 1) * 2)) - 2) * activeWeights.reward), 0, 24),
        morale: clamp(current.morale + Math.round((Math.floor(current.intel / 3) + Math.round((scaffolding.tuning.recoveryBoost - 1) * 5) + Math.round((playbook.tuning.recoveryWindow - 1) * 4)) * activeWeights.recovery) - moralePenalty, 0, 100),
        intel: clamp(current.intel - 1, 0, 12),
        objective: `${nextDirective.objective} ${nextEvent.objectiveShift}`,
      }

      return evaluateState(next, versatility)
    })
  }, [director, playbook.tuning.interactionFrequency, playbook.tuning.pressure, playbook.tuning.recoveryWindow, playbook.tuning.rewardRate, scaffolding, versatility])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-sky-500/30 text-sky-300">
          {project.design.runtimePlan.label}
        </Badge>
        <Badge variant="outline">{versatility.flavorLabel}</Badge>
        <Badge variant="outline">{scaffolding.scenarioTitle}</Badge>
        <Badge variant="outline">{playbook.physics.profileLabel}</Badge>
        <Badge variant="outline" className="uppercase">
          {project.dimension}
        </Badge>
        <Badge variant="outline" className="capitalize">
          {project.genre.replace(/_/g, " ")}
        </Badge>
        <Badge variant="outline">
          {project.design.runtimePlan.targetSessionMinutes} min slice
        </Badge>
        <Badge variant="outline" className="capitalize">
          {project.engine}
        </Badge>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={togglePause}>
            {state.paused ? <Play className="mr-2 h-4 w-4" /> : <Pause className="mr-2 h-4 w-4" />}
            {state.paused ? "Resume" : "Pause"}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={endTurn} disabled={state.paused || state.won || state.failed}>
            <Flag className="mr-2 h-4 w-4" />
            End Turn
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={restartRun}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Restart Command
          </Button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-lg border border-border/50 bg-card/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Turn</p>
          <p className="mt-1 font-mono text-lg">{state.turn}</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Command</p>
          <p className="mt-1 flex items-center gap-2 font-mono text-lg">
            <Radar className="h-4 w-4 text-sky-400" />
            {state.commandPoints}
          </p>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{versatility.resourceLabels.primary}</p>
          <p className="mt-1 flex items-center gap-2 font-mono text-lg">
            <Coins className="h-4 w-4 text-amber-400" />
            {state.supply}
          </p>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{versatility.resourceLabels.secondary}</p>
          <p className="mt-1 flex items-center gap-2 font-mono text-lg">
            <Shield className="h-4 w-4 text-emerald-400" />
            {state.morale}
          </p>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Average Control</p>
          <p className="mt-1 flex items-center gap-2 font-mono text-lg">
            <Swords className="h-4 w-4 text-rose-400" />
            {averageControl}%
          </p>
        </div>
      </div>

      <div className={graphicsPresentation.objectiveClassName}>
        {state.objective}
      </div>

      <RuntimeVersatilityPanel plan={versatility} boardClassName={graphicsPresentation.boardClassName} />
      <RuntimeEncounterPanel
        director={director}
        boardClassName={graphicsPresentation.boardClassName}
        activeDirectiveIndex={state.activeDirectiveIndex}
        activeEventIndex={state.activeEventIndex}
      />
      <RuntimePlaybookPanel plan={playbook} boardClassName={graphicsPresentation.boardClassName} activeIndex={state.turn - 1} />

      <div className={graphicsPresentation.boardClassName}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">Command Board</p>
          <Badge variant="outline">{versatility.runtimeSubtitle}</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {state.sectors.map((sector) => {
            const selected = sector.id === selectedSector.id
            return (
              <button
                key={sector.id}
                type="button"
                onClick={() => selectSector(sector.id)}
                className={`rounded-xl border p-4 text-left transition ${sectorTone(sector)} ${selected ? "ring-2 ring-sky-400/70" : "hover:border-sky-400/30"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{sector.name}</p>
                  <Badge variant="outline">{sector.status}</Badge>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                  <p>Control: <span className="font-mono text-foreground">{sector.control}%</span></p>
                  <p>Threat: <span className="font-mono text-foreground">{sector.threat}%</span></p>
                  <p>Fortification: <span className="font-mono text-foreground">{sector.fortification}%</span></p>
                  <p>Yield: <span className="font-mono text-foreground">{sector.yield}</span></p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.9fr)]">
        <div className={graphicsPresentation.boardClassName}>
          <p className="text-sm font-medium">Selected Sector</p>
          <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
            <p>Name: <span className="font-mono text-foreground">{selectedSector.name}</span></p>
            <p>Control: <span className="font-mono text-foreground">{selectedSector.control}%</span></p>
            <p>Threat: <span className="font-mono text-foreground">{selectedSector.threat}%</span></p>
            <p>Fortification: <span className="font-mono text-foreground">{selectedSector.fortification}%</span></p>
            <p>Status: <span className="font-mono text-foreground">{selectedSector.status}</span></p>
          </div>
        </div>

        <div className={graphicsPresentation.boardClassName}>
          <p className="text-sm font-medium">Command Actions</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={allocateSupply} disabled={state.paused || state.commandPoints < 2 || state.supply < 2 || state.won || state.failed}>
              {versatility.actionLabels.secondary}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={fortifySector} disabled={state.paused || state.commandPoints < 2 || state.supply < 1 || state.won || state.failed}>
              {versatility.actionLabels.recovery}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={launchOperation} disabled={state.paused || state.commandPoints < 3 || state.won || state.failed}>
              {versatility.actionLabels.primary}
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            This runtime keeps strategy prompts in a board-state loop: read the front, invest {versatility.resourceLabels.primary.toLowerCase()}, stabilize the weak line, and commit only where {versatility.pressureTracks[2].toLowerCase()} gains matter.
          </p>
          <div className="mt-4 rounded-lg border border-border/40 bg-background/40 p-3">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Recent Crisis Feed</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {state.eventLog.map((entry) => (
                <Badge key={entry} variant="outline">{entry}</Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
