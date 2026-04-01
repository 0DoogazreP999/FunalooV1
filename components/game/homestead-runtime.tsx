"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getProjectRuntimeEncounterDirector, RuntimeEncounterPanel } from "@/components/game/runtime-encounters"
import { getRuntimeGraphicsPresentation } from "@/components/game/runtime-graphics"
import { getProjectRuntimePlaybookPlan, RuntimePlaybookPanel } from "@/components/game/runtime-playbook"
import { getProjectRuntimeVersatilityPlan, RuntimeVersatilityPanel } from "@/components/game/runtime-versatility"
import { getRuntimeEncounterTickWeights } from "@/lib/engine/runtime-encounters"
import { buildRuntimeScaffoldingPlan } from "@/lib/engine/runtime-scaffolding"
import { Coins, MoonStar, Pause, Play, RotateCcw, Sprout, Droplets, Heart } from "lucide-react"
import type { UserProject } from "@/lib/engine/types"

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 520
const GRID_COLS = 8
const GRID_ROWS = 5
const TILE_SIZE = 70
const GRID_ORIGIN_X = 112
const GRID_ORIGIN_Y = 120
const CONTROL_KEYS = new Set([
  "w",
  "a",
  "s",
  "d",
  "arrowup",
  "arrowdown",
  "arrowleft",
  "arrowright",
  " ",
  "e",
  "r",
  "p",
  "n",
])

type CropStage = "empty" | "tilled" | "seeded" | "growing" | "ready"

interface FarmTile {
  x: number
  y: number
  stage: CropStage
  watered: boolean
  growth: number
}

interface HomesteadState {
  tiles: FarmTile[]
  cursorX: number
  cursorY: number
  day: number
  timeProgress: number
  energy: number
  water: number
  seeds: number
  crops: number
  coins: number
  hearts: number
  paused: boolean
  won: boolean
  failed: boolean
  objective: string
  actionLocks: {
    tend: boolean
    harvest: boolean
    pause: boolean
    sell: boolean
    nextDay: boolean
  }
}

function createInitialTiles() {
  return Array.from({ length: GRID_COLS * GRID_ROWS }, (_, index) => ({
    x: index % GRID_COLS,
    y: Math.floor(index / GRID_COLS),
    stage: "empty" as CropStage,
    watered: false,
    growth: 0,
  }))
}

function createInitialState(): HomesteadState {
  return {
    tiles: createInitialTiles(),
    cursorX: 2,
    cursorY: 2,
    day: 1,
    timeProgress: 0.15,
    energy: 100,
    water: 6,
    seeds: 6,
    crops: 0,
    coins: 24,
    hearts: 1,
    paused: false,
    won: false,
    failed: false,
    objective: "Start the season by tilling soil, planting seeds, and earning enough coin to expand the homestead.",
    actionLocks: {
      tend: false,
      harvest: false,
      pause: false,
      sell: false,
      nextDay: false,
    },
  }
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value))
}

function tileColor(tile: FarmTile) {
  switch (tile.stage) {
    case "tilled":
      return "#5b3a29"
    case "seeded":
      return "#6b4423"
    case "growing":
      return "#2f7d32"
    case "ready":
      return "#d4a017"
    default:
      return "#73553a"
  }
}

function findTileIndex(state: HomesteadState) {
  return state.tiles.findIndex((tile) => tile.x === state.cursorX && tile.y === state.cursorY)
}

function getSeasonTarget(project: UserProject, scaffolding: ReturnType<typeof buildRuntimeScaffoldingPlan>) {
  const base = project.design.scopeScale === "limitless"
    ? { coins: 260, hearts: 4, days: 7 }
    : project.design.scopeScale === "expanded"
      ? { coins: 220, hearts: 3, days: 6 }
      : { coins: 180, hearts: 3, days: 5 }

  return {
    coins: base.coins + scaffolding.tuning.resourceBonus * 12,
    hearts: Math.max(2, base.hearts + Math.round((scaffolding.tuning.recoveryBoost - 1) * 2)),
    days: Math.max(4, base.days + (scaffolding.tuning.pressureRate < 1 ? 1 : 0)),
  }
}

function ControlButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      className="h-10 min-w-10 border-border/60 bg-card/60"
      onPointerDown={onPress}
      onContextMenu={(event) => event.preventDefault()}
    >
      {label}
    </Button>
  )
}

export function HomesteadRuntime({ project }: { project: UserProject }) {
  const graphicsPresentation = getRuntimeGraphicsPresentation(project)
  const versatility = useMemo(() => getProjectRuntimeVersatilityPlan(project), [project])
  const scaffolding = useMemo(() => buildRuntimeScaffoldingPlan(project), [project])
  const playbook = useMemo(() => getProjectRuntimePlaybookPlan(project), [project])
  const director = useMemo(() => getProjectRuntimeEncounterDirector(project), [project])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const targetRef = useRef(getSeasonTarget(project, scaffolding))
  const [state, setState] = useState<HomesteadState>(createInitialState)

  useEffect(() => {
    targetRef.current = getSeasonTarget(project, scaffolding)
  }, [project, scaffolding])

  const updateObjective = useCallback((nextState: HomesteadState) => {
    const target = targetRef.current
    const activeDirective = director.objectiveChain[(Math.max(0, nextState.day - 1)) % Math.max(director.objectiveChain.length, 1)] ?? director.objectiveChain[0]
    const activeEvent = director.eventDeck[(Math.max(0, nextState.day - 1)) % Math.max(director.eventDeck.length, 1)] ?? director.eventDeck[0]

    if (nextState.coins >= target.coins && nextState.hearts >= target.hearts) {
      nextState.won = true
      nextState.failed = false
      nextState.objective = `${versatility.flavorLabel} thriving. You hit the season goal and turned the loop into a stable playable slice.`
      return nextState
    }

    if (nextState.day > target.days && !nextState.won) {
      nextState.failed = true
      nextState.objective = `The cycle ended before ${versatility.pressureTracks[1].toLowerCase()} stabilized. Restart and tighten the routine.`
      return nextState
    }

    nextState.objective =
      nextState.crops > 0
        ? `${activeDirective.label}: cash out the harvest while ${activeEvent.label.toLowerCase()} is active.`
        : `${activeDirective.objective} ${activeEvent.objectiveShift}`

    return nextState
  }, [director, versatility.flavorLabel, versatility.pressureTracks])

  const restartRun = useCallback(() => {
    setState(createInitialState())
  }, [])

  const togglePause = useCallback(() => {
    setState((current) => ({
      ...current,
      paused: !current.paused,
      objective: !current.paused
        ? "Day paused. Resume when you are ready to keep the farm moving."
        : current.failed
          ? current.objective
          : current.won
            ? current.objective
            : "Back to work. Keep the field cycle efficient and the village happy.",
    }))
  }, [])

  const moveCursor = useCallback((dx: number, dy: number) => {
    setState((current) => {
      if (current.won || current.failed) return current

      return {
        ...current,
        cursorX: clamp(current.cursorX + dx, 0, GRID_COLS - 1),
        cursorY: clamp(current.cursorY + dy, 0, GRID_ROWS - 1),
      }
    })
  }, [])

  const tendTile = useCallback(() => {
    setState((current) => {
      if (current.won || current.failed || current.energy <= 0) return current
      const activeEvent = director.eventDeck[(Math.max(0, current.day - 1)) % Math.max(director.eventDeck.length, 1)] ?? director.eventDeck[0]

      const tileIndex = findTileIndex(current)
      if (tileIndex < 0) return current

      const next = {
        ...current,
        tiles: [...current.tiles],
      }
      const tile = { ...next.tiles[tileIndex] }
      next.tiles[tileIndex] = tile
      next.energy = clamp(next.energy - Math.max(4, Math.round(8 * playbook.tuning.pressure * activeEvent.modifiers.pressure)), 0, 100)

      if (tile.stage === "empty") {
        tile.stage = "tilled"
        next.objective = `${activeEvent.label}: Soil prepared. Plant seeds and keep water stocked before the day ends.`
        return next
      }

      if (tile.stage === "tilled" && next.seeds > 0) {
        tile.stage = "seeded"
        tile.growth = 0
        tile.watered = false
        next.seeds -= 1
        next.objective = `${activeEvent.label}: Seeds planted. Water the tile so it can progress overnight.`
        return next
      }

      if ((tile.stage === "seeded" || tile.stage === "growing") && !tile.watered && next.water > 0) {
        tile.watered = true
        next.water -= 1
        next.objective = `${activeEvent.objectiveShift}`
        return next
      }

      next.objective = tile.stage === "ready"
        ? "This crop is ready. Harvest it with E so you can sell the yield."
        : "This tile needs a different action. Tilled soil wants seeds, planted crops want water, and ready crops want harvesting."

      return next
    })
  }, [director.eventDeck, playbook.tuning.pressure])

  const harvestTile = useCallback(() => {
    setState((current) => {
      if (current.won || current.failed) return current
      const activeEvent = director.eventDeck[(Math.max(0, current.day - 1)) % Math.max(director.eventDeck.length, 1)] ?? director.eventDeck[0]

      const tileIndex = findTileIndex(current)
      if (tileIndex < 0) return current

      const targetTile = current.tiles[tileIndex]
      if (targetTile.stage !== "ready") {
        return {
          ...current,
          objective: "Harvest works only on ready crops. Golden tiles are ready to pick.",
        }
      }

      const next = {
        ...current,
        tiles: [...current.tiles],
        crops: current.crops + 1,
        energy: clamp(current.energy - Math.max(3, Math.round(6 * playbook.tuning.pressure)), 0, 100),
      }
      next.tiles[tileIndex] = {
        ...targetTile,
        stage: "tilled",
        watered: false,
        growth: 0,
      }
      next.objective = `${activeEvent.rewardHint}`
      if ((next.crops + next.coins) % 4 === 0) {
        next.hearts = clamp(next.hearts + 1, 0, 6)
      }
      return updateObjective(next)
    })
  }, [director.eventDeck, playbook.tuning.pressure, updateObjective])

  const sellCrops = useCallback(() => {
    setState((current) => {
      if (current.won || current.failed || current.crops <= 0) {
        return current.crops <= 0
          ? { ...current, objective: "No harvest in the basket yet. Pick ready crops before heading to market." }
          : current
      }
      const activeEvent = director.eventDeck[(Math.max(0, current.day - 1)) % Math.max(director.eventDeck.length, 1)] ?? director.eventDeck[0]
      const activeWeights = getRuntimeEncounterTickWeights(
        director,
        Math.max(0, current.day - 1),
        Math.max(0, current.day - 1),
        current.timeProgress,
      )

      const soldValue = Math.round(current.crops * (18 + scaffolding.tuning.resourceBonus * 2) * playbook.tuning.rewardRate * activeWeights.reward)
      const next = {
        ...current,
        coins: current.coins + soldValue,
        crops: 0,
        hearts: clamp(current.hearts + 1, 0, 6),
        objective: `${activeEvent.label}: sold the harvest for ${soldValue} coins and strengthened village trust.`,
      }
      return updateObjective(next)
    })
  }, [director, playbook.tuning.rewardRate, scaffolding, updateObjective])

  const sleepToNextDay = useCallback(() => {
    setState((current) => {
      if (current.won || current.failed) return current
      const nextDayIndex = current.day % Math.max(director.eventDeck.length, 1)
      const nextEvent = director.eventDeck[nextDayIndex] ?? director.eventDeck[0]
      const nextWeights = getRuntimeEncounterTickWeights(director, current.day, nextDayIndex, 0.12)

      const nextTiles: FarmTile[] = current.tiles.map((tile) => {
        if (tile.stage === "seeded" || tile.stage === "growing") {
          const nextGrowth = tile.watered
            ? tile.growth + Math.max(1, Math.round(playbook.tuning.interactionFrequency * nextWeights.interaction))
            : tile.growth
          return {
            ...tile,
            stage: nextGrowth >= 2 ? "ready" : nextGrowth > 0 ? "growing" : tile.stage,
            watered: false,
            growth: nextGrowth,
          }
        }

        return {
          ...tile,
          watered: false,
        }
      })

      const next = {
        ...current,
        tiles: nextTiles,
        day: current.day + 1,
        timeProgress: 0.12,
        energy: 100,
        water: Math.max(3, Math.round(6 / Math.max(0.8, nextWeights.pressure))),
        seeds: current.seeds + 2 + Math.max(0, scaffolding.tuning.resourceBonus - 1) + Math.max(0, Math.round((playbook.tuning.rewardRate - 1) * 2 * nextWeights.reward)),
        objective: `${nextEvent.objectiveShift}`,
      }

      return updateObjective(next)
    })
  }, [director, playbook.tuning.interactionFrequency, playbook.tuning.rewardRate, scaffolding, updateObjective])

  useEffect(() => {
    if (state.paused || state.won || state.failed) return

    const interval = window.setInterval(() => {
      setState((current) => {
        if (current.paused || current.won || current.failed) return current
        const activeEvent = director.eventDeck[(Math.max(0, current.day - 1)) % Math.max(director.eventDeck.length, 1)] ?? director.eventDeck[0]
        const activeWeights = getRuntimeEncounterTickWeights(
          director,
          Math.max(0, current.day - 1),
          Math.max(0, current.day - 1),
          current.timeProgress,
        )

        const next = {
          ...current,
          timeProgress: Math.min(1, current.timeProgress + 0.04 * scaffolding.tuning.pressureRate * playbook.tuning.pressure * activeWeights.pressure * activeWeights.eventAdvanceRate),
          energy: clamp(current.energy - Math.max(1, Math.round(scaffolding.tuning.pressureRate * playbook.tuning.pressure * activeWeights.pressure)), 0, 100),
        }

        if (next.timeProgress >= 1) {
          next.objective = "The sun is setting. Press N or End Day to move the farm into the next growth cycle."
        } else if (next.energy <= 18) {
          next.objective = `${activeEvent.label}: energy is low. Sell what you have and end the day before the loop stalls out.`
        }

        return next
      })
    }, 900)

    return () => {
      window.clearInterval(interval)
    }
  }, [director, playbook.tuning.pressure, scaffolding, state.failed, state.paused, state.won])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (CONTROL_KEYS.has(key)) event.preventDefault()
      if (!CONTROL_KEYS.has(key)) return

      if (key === "w" || key === "arrowup") moveCursor(0, -1)
      if (key === "s" || key === "arrowdown") moveCursor(0, 1)
      if (key === "a" || key === "arrowleft") moveCursor(-1, 0)
      if (key === "d" || key === "arrowright") moveCursor(1, 0)

      if (key === " " && !state.actionLocks.tend) {
        setState((current) => ({
          ...current,
          actionLocks: { ...current.actionLocks, tend: true },
        }))
        tendTile()
      }

      if (key === "e" && !state.actionLocks.harvest) {
        setState((current) => ({
          ...current,
          actionLocks: { ...current.actionLocks, harvest: true },
        }))
        harvestTile()
      }

      if (key === "r" && !state.actionLocks.sell) {
        setState((current) => ({
          ...current,
          actionLocks: { ...current.actionLocks, sell: true },
        }))
        sellCrops()
      }

      if (key === "n" && !state.actionLocks.nextDay) {
        setState((current) => ({
          ...current,
          actionLocks: { ...current.actionLocks, nextDay: true },
        }))
        sleepToNextDay()
      }

      if (key === "p" && !state.actionLocks.pause) {
        setState((current) => ({
          ...current,
          actionLocks: { ...current.actionLocks, pause: true },
        }))
        togglePause()
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (!CONTROL_KEYS.has(key)) return

      setState((current) => ({
        ...current,
        actionLocks: {
          ...current.actionLocks,
          tend: key === " " ? false : current.actionLocks.tend,
          harvest: key === "e" ? false : current.actionLocks.harvest,
          sell: key === "r" ? false : current.actionLocks.sell,
          nextDay: key === "n" ? false : current.actionLocks.nextDay,
          pause: key === "p" ? false : current.actionLocks.pause,
        },
      }))
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [harvestTile, moveCursor, sellCrops, sleepToNextDay, state.actionLocks, tendTile, togglePause])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext("2d")
    if (!context) return

    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    const sky = context.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
    sky.addColorStop(0, "#89c2ff")
    sky.addColorStop(0.58, "#d8f0c8")
    sky.addColorStop(1, "#7aa35a")
    context.fillStyle = sky
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    context.fillStyle = "#5b8e3d"
    context.fillRect(0, GRID_ORIGIN_Y - 26, CANVAS_WIDTH, CANVAS_HEIGHT - GRID_ORIGIN_Y + 26)

    context.fillStyle = "#b76e3b"
    context.fillRect(44, 82, 112, 86)
    context.fillStyle = "#6f3c24"
    context.fillRect(74, 52, 56, 40)

    context.fillStyle = "#4fa8db"
    context.beginPath()
    context.ellipse(696, 116, 54, 32, 0, 0, Math.PI * 2)
    context.fill()

    for (const tile of state.tiles) {
      const x = GRID_ORIGIN_X + tile.x * TILE_SIZE
      const y = GRID_ORIGIN_Y + tile.y * TILE_SIZE
      context.fillStyle = tileColor(tile)
      context.fillRect(x, y, TILE_SIZE - 6, TILE_SIZE - 6)
      context.strokeStyle = "rgba(17,24,39,0.18)"
      context.strokeRect(x, y, TILE_SIZE - 6, TILE_SIZE - 6)

      if (tile.stage === "seeded" || tile.stage === "growing") {
        context.fillStyle = tile.stage === "growing" ? "#d1fa7a" : "#8bc34a"
        context.beginPath()
        context.arc(x + (TILE_SIZE - 6) / 2, y + (TILE_SIZE - 6) / 2 + 4, tile.stage === "growing" ? 10 : 6, 0, Math.PI * 2)
        context.fill()
      }

      if (tile.stage === "ready") {
        context.fillStyle = "#facc15"
        context.fillRect(x + 18, y + 14, 8, 30)
        context.fillRect(x + 30, y + 10, 8, 34)
        context.fillRect(x + 42, y + 16, 8, 28)
      }

      if (tile.watered) {
        context.fillStyle = "rgba(59,130,246,0.55)"
        context.fillRect(x + 5, y + TILE_SIZE - 24, TILE_SIZE - 16, 10)
      }
    }

    const cursorX = GRID_ORIGIN_X + state.cursorX * TILE_SIZE
    const cursorY = GRID_ORIGIN_Y + state.cursorY * TILE_SIZE
    context.strokeStyle = "#f8fafc"
    context.lineWidth = 3
    context.strokeRect(cursorX - 2, cursorY - 2, TILE_SIZE - 2, TILE_SIZE - 2)

    context.fillStyle = "rgba(15,23,42,0.78)"
    context.fillRect(16, 16, 214, 84)
    context.fillStyle = "#f8fafc"
    context.font = "12px var(--font-mono, monospace)"
    context.fillText(`Day ${state.day}`, 28, 36)
    context.fillText(`Energy ${state.energy}`, 28, 54)
    context.fillText(`Seeds ${state.seeds}  Water ${state.water}`, 28, 72)
    context.fillText(`Crops ${state.crops}  Coins ${state.coins}`, 28, 90)

    context.fillStyle = "rgba(15,23,42,0.78)"
    context.fillRect(CANVAS_WIDTH - 252, 16, 236, 84)
    context.fillStyle = "#f8fafc"
    context.fillText(project.design.runtimePlan.label, CANVAS_WIDTH - 240, 36)
    context.fillText(`Target ${targetRef.current.coins}c / ${targetRef.current.hearts} hearts`, CANVAS_WIDTH - 240, 54)
    context.fillText(`Time ${Math.round(state.timeProgress * 100)}% of day`, CANVAS_WIDTH - 240, 72)
    context.fillText(state.paused ? "Paused" : state.won ? "Season Won" : state.failed ? "Season Lost" : "Workday Live", CANVAS_WIDTH - 240, 90)

    const timeWidth = 220
    context.fillStyle = "#1f2937"
    context.fillRect(292, 34, timeWidth, 12)
    context.fillStyle = "#f59e0b"
    context.fillRect(292, 34, state.timeProgress * timeWidth, 12)
    context.fillStyle = "#0f172a"
    context.fillRect(292, 64, timeWidth, 12)
    context.fillStyle = "#fb7185"
    context.fillRect(292, 64, (state.hearts / Math.max(1, targetRef.current.hearts + 1)) * timeWidth, 12)
    context.fillStyle = "#f8fafc"
    context.fillText("Daylight", 292, 28)
    context.fillText("Village Trust", 292, 58)

    if (state.paused || state.won || state.failed) {
      context.fillStyle = "rgba(2,6,23,0.58)"
      context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
      context.fillStyle = state.won ? "#86efac" : state.failed ? "#fca5a5" : "#f8fafc"
      context.font = "28px var(--font-mono, monospace)"
      context.textAlign = "center"
      context.fillText(
        state.won ? "SEASON STABILIZED" : state.failed ? "HOMESTEAD STALLED" : "DAY PAUSED",
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 - 18,
      )
      context.font = "14px var(--font-mono, monospace)"
      context.fillText(
        state.won
          ? "Restart to run another farming slice."
          : state.failed
            ? "Restart and tighten the crop loop."
            : "Resume when you are ready.",
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 16,
      )
      context.textAlign = "start"
    }
  }, [project.design.runtimePlan.label, state])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-emerald-500/30 text-emerald-300">
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
          <Button type="button" size="sm" variant="outline" onClick={sleepToNextDay}>
            <MoonStar className="mr-2 h-4 w-4" />
            End Day
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={restartRun}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Restart Season
          </Button>
        </div>
      </div>

      <div className={graphicsPresentation.canvasWrapperClassName}>
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className={graphicsPresentation.canvasClassName}
          style={graphicsPresentation.canvasStyle}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-lg border border-border/50 bg-card/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Energy</p>
          <p className="mt-1 font-mono text-lg">{state.energy}</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{versatility.resourceLabels.primary}</p>
          <p className="mt-1 flex items-center gap-2 font-mono text-lg">
            <Sprout className="h-4 w-4 text-emerald-400" />
            {state.seeds}
          </p>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{versatility.resourceLabels.secondary}</p>
          <p className="mt-1 flex items-center gap-2 font-mono text-lg">
            <Droplets className="h-4 w-4 text-sky-400" />
            {state.water}
          </p>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{versatility.encounterLabels.collectible}</p>
          <p className="mt-1 font-mono text-lg">{state.crops}</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Coins</p>
          <p className="mt-1 flex items-center gap-2 font-mono text-lg">
            <Coins className="h-4 w-4 text-amber-400" />
            {state.coins}
          </p>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{versatility.pressureTracks[1]}</p>
          <p className="mt-1 flex items-center gap-2 font-mono text-lg">
            <Heart className="h-4 w-4 text-rose-400" />
            {state.hearts}
          </p>
        </div>
      </div>

      <div className={graphicsPresentation.objectiveClassName}>
        {state.objective}
      </div>

      <div className={graphicsPresentation.infoClassName}>
        {project.design.runtimePlan.reason} {versatility.runtimeSubtitle}
      </div>

      <RuntimeVersatilityPanel plan={versatility} boardClassName={graphicsPresentation.boardClassName} />
      <RuntimeEncounterPanel
        director={director}
        boardClassName={graphicsPresentation.boardClassName}
        activeDirectiveIndex={state.day - 1}
        activeEventIndex={state.day - 1}
      />
      <RuntimePlaybookPanel plan={playbook} boardClassName={graphicsPresentation.boardClassName} activeIndex={state.day - 1} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Field Cursor</p>
          <div className="grid w-fit grid-cols-3 gap-2">
            <div />
            <ControlButton label="W" onPress={() => moveCursor(0, -1)} />
            <div />
            <ControlButton label="A" onPress={() => moveCursor(-1, 0)} />
            <ControlButton label="S" onPress={() => moveCursor(0, 1)} />
            <ControlButton label="D" onPress={() => moveCursor(1, 0)} />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Farm Actions</p>
          <div className="flex flex-wrap gap-2">
            <ControlButton label="Tend" onPress={tendTile} />
            <ControlButton label="Harvest" onPress={harvestTile} />
            <ControlButton label="Sell" onPress={sellCrops} disabled={state.crops <= 0} />
            <ControlButton label="Sleep" onPress={sleepToNextDay} />
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Use <span className="font-mono">WASD</span> to move the field cursor, <span className="font-mono">Space</span> to till, plant, or water, <span className="font-mono">E</span> to harvest, <span className="font-mono">R</span> to sell the crop basket, <span className="font-mono">N</span> to end the day, and <span className="font-mono">P</span> to pause.
      </p>
    </div>
  )
}
