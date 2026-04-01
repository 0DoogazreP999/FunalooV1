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
import { Heart, Pause, Play, RotateCcw, Zap } from "lucide-react"
import type { UserProject } from "@/lib/engine/types"

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 520
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
  "shift",
  "e",
  "p",
  "r",
])

type JourneyStopType = "camp" | "settlement" | "hazard" | "landmark" | "destination"

interface JourneyStop {
  id: string
  title: string
  type: JourneyStopType
  distance: number
  description: string
  rewardLabel: string
  scenarioLabel: string
  eventLabel: string
  eventCategory: "pressure" | "opportunity" | "recovery" | "twist"
  pressureScale: number
  rewardScale: number
  mapX: number
  mapY: number
}

interface JourneyRoadEntity {
  id: string
  type: "supply" | "hazard"
  lane: number
  depth: number
  speed: number
  value: number
  size: number
  color: string
  active: boolean
}

interface JourneyState {
  keys: Record<string, boolean>
  routeStops: JourneyStop[]
  roadEntities: JourneyRoadEntity[]
  seed: number
  time: number
  score: number
  day: number
  supplies: number
  morale: number
  wagonHealth: number
  pace: number
  playerLane: number
  routeIndex: number
  routeProgress: number
  totalDistance: number
  activeDirectiveIndex: number
  activeEventIndex: number
  running: boolean
  paused: boolean
  won: boolean
  awaitingStop: boolean
  objective: string
  eventFeed: string
  audioPulse: number
  actionLocks: {
    pause: boolean
    stabilize: boolean
    resolve: boolean
  }
}

interface JourneyHud {
  score: number
  day: number
  supplies: number
  morale: number
  wagonHealth: number
  distance: number
  totalDistance: number
  paceLabel: string
  nextStop: string
  paused: boolean
  won: boolean
  awaitingStop: boolean
  canStabilize: boolean
  objective: string
  eventFeed: string
  activeDirectiveIndex: number
  activeEventIndex: number
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value))
}

function createSeededRandom(seed: number) {
  let value = seed

  return () => {
    value = (value * 1664525 + 1013904223) % 0x100000000
    return value / 0x100000000
  }
}

function stopColor(stopType: JourneyStopType) {
  switch (stopType) {
    case "camp":
      return "#22c55e"
    case "settlement":
      return "#f59e0b"
    case "hazard":
      return "#f97316"
    case "destination":
      return "#8b5cf6"
    default:
      return "#38bdf8"
  }
}

function paceLabelFor(state: Pick<JourneyState, "awaitingStop" | "pace">) {
  if (state.awaitingStop) return "stopped"
  if (state.pace >= 1.15) return "push"
  if (state.pace <= 0.74) return "careful"
  return "steady"
}

function createEmptyJourneyState(): JourneyState {
  return {
    keys: {},
    routeStops: [],
    roadEntities: [],
    seed: 0,
    time: 0,
    score: 0,
    day: 1,
    supplies: 0,
    morale: 76,
    wagonHealth: 100,
    pace: 0.92,
    playerLane: 0,
    routeIndex: 0,
    routeProgress: 0,
    totalDistance: 1,
    activeDirectiveIndex: 0,
    activeEventIndex: 0,
    running: true,
    paused: false,
    won: false,
    awaitingStop: false,
    objective: "Charting the route...",
    eventFeed: "Preparing live route events...",
    audioPulse: 0,
    actionLocks: {
      pause: false,
      stabilize: false,
      resolve: false,
    },
  }
}

function buildJourneyStops(
  project: UserProject,
  random: () => number,
  scaffolding: ReturnType<typeof buildRuntimeScaffoldingPlan>,
  director: ReturnType<typeof getProjectRuntimeEncounterDirector>,
): JourneyStop[] {
  const seq = project.design.levelSequence ?? []
  const beats = seq.slice(0, Math.max(4, Math.min(6, seq.length)))
  const sourceBeats =
    beats.length > 0
      ? beats
      : [
          {
            title: "Departure Camp",
            purpose: "Set the pace and leave the starting settlement with enough supplies.",
            challenge: "Your first route choice sets the tone for the run.",
            reward: "A clean start and a readable first objective.",
          },
          {
            title: "River Crossing",
            purpose: "Commit to the route while handling friction and delay.",
            challenge: "The party needs discipline under pressure.",
            reward: "Confidence and momentum for the next leg.",
          },
          {
            title: "Trading Post",
            purpose: "Reset resources and reopen the route network.",
            challenge: "Spend carefully and choose what to repair.",
            reward: "Fresh supplies and a stronger wagon.",
          },
          {
            title: "Final Approach",
            purpose: "Finish the expedition and bring the caravan home.",
            challenge: "Endurance matters more than speed now.",
            reward: "Journey complete.",
          },
        ]

  const promptText = `${project.description} ${project.name}`.toLowerCase()
  const signals = new Set(project.design.promptSignals ?? [])
  const historical = signals.has("historical")
  const economyHeavy = signals.has("economy-heavy") || /trade|merchant|barter|market/.test(promptText)
  const survivalHeavy = signals.has("survival-heavy") || /survival|hunger|disease|weather|hardship|scarcity/.test(promptText)
  const travelHeavy = signals.has("travel-heavy") || /journey|travel|trail|wagon|frontier|caravan/.test(promptText)

  let totalDistance = 0

  return sourceBeats.map((beat, index) => {
    totalDistance += 180 + Math.floor(random() * 90) + (historical ? 16 : 0) + index * 12

    let type: JourneyStopType = "landmark"
    if (index === sourceBeats.length - 1) {
      type = "destination"
    } else if (/camp|rest|recover|checkpoint|shelter/i.test(`${beat.title} ${beat.purpose} ${beat.reward}`)) {
      type = "camp"
    } else if (
      economyHeavy ||
      /town|trade|merchant|market|hub|settlement|fort/i.test(`${beat.title} ${beat.purpose} ${beat.reward}`)
    ) {
      type = index % 2 === 0 ? "settlement" : "landmark"
    } else if (
      survivalHeavy ||
      /hazard|storm|crossing|danger|risk|scarcity|illness/i.test(`${beat.challenge} ${beat.purpose}`)
    ) {
      type = index % 2 === 0 ? "hazard" : "camp"
    } else if (travelHeavy && index % 3 === 1) {
      type = "camp"
    }

    const progress = sourceBeats.length === 1 ? 1 : index / (sourceBeats.length - 1)
    const typeLabel = {
      camp: scaffolding.stopTypeLabels.camp,
      settlement: scaffolding.stopTypeLabels.settlement,
      hazard: scaffolding.stopTypeLabels.hazard,
      landmark: scaffolding.stopTypeLabels.landmark,
      destination: scaffolding.stopTypeLabels.destination,
    }[type]
    const directive = director.objectiveChain[index % Math.max(director.objectiveChain.length, 1)] ?? director.objectiveChain[0]
    const event = director.eventDeck[index % Math.max(director.eventDeck.length, 1)] ?? director.eventDeck[0]

    return {
      id: `stop_${index}`,
      title: beat.title || typeLabel || `Stop ${index + 1}`,
      type,
      distance: totalDistance,
      description: beat.purpose,
      rewardLabel: beat.reward,
      scenarioLabel: directive.label,
      eventLabel: event.label,
      eventCategory: event.category,
      pressureScale: event.modifiers.pressure,
      rewardScale: event.modifiers.reward,
      mapX: 84 + progress * 620,
      mapY: 146 + Math.sin(progress * Math.PI * 2 + random() * 0.55) * (historical ? 54 : 72),
    }
  })
}

function ControlButton({
  label,
  onPress,
  onRelease,
  disabled = false,
}: {
  label: string
  onPress: () => void
  onRelease: () => void
  disabled?: boolean
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      className="h-10 min-w-10 select-none border-border/60 bg-card/60"
      onPointerDown={onPress}
      onPointerUp={onRelease}
      onPointerLeave={onRelease}
      onPointerCancel={onRelease}
      onContextMenu={(event) => event.preventDefault()}
    >
      {label}
    </Button>
  )
}

export function JourneyRuntime({ project }: { project: UserProject }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<JourneyState>(createEmptyJourneyState())
  const randomRef = useRef<() => number>(() => Math.random())
  const [runToken, setRunToken] = useState(0)
  const [hud, setHud] = useState<JourneyHud>({
    score: 0,
    day: 1,
    supplies: 0,
    morale: 76,
    wagonHealth: 100,
    distance: 0,
    totalDistance: 1,
    paceLabel: "steady",
    nextStop: "Preparing route",
    paused: false,
    won: false,
    awaitingStop: false,
    canStabilize: false,
    objective: "Preparing expedition...",
    eventFeed: "Preparing live route events...",
    activeDirectiveIndex: 0,
    activeEventIndex: 0,
  })

  const hasRendering = project.features.includes("rendering")
  const hasAudio = project.features.includes("audio")
  const hasInventory = project.features.includes("inventory")
  const renderInThreeD = project.dimension === "3d"
  const graphicsPresentation = getRuntimeGraphicsPresentation(project)
  const versatility = useMemo(() => getProjectRuntimeVersatilityPlan(project), [project])
  const scaffolding = useMemo(() => buildRuntimeScaffoldingPlan(project), [project])
  const playbook = useMemo(() => getProjectRuntimePlaybookPlan(project), [project])
  const director = useMemo(() => getProjectRuntimeEncounterDirector(project), [project])
  const routeSignals = project.design.promptSignals ?? []
  const survivalHeavy = routeSignals.includes("survival-heavy")
  const historical = routeSignals.includes("historical")
  const economyHeavy = routeSignals.includes("economy-heavy")
  const convoyLabel = project.multiplayer ? `${Math.max(project.maxPlayers, 1)} ${versatility.flavorLabel.toLowerCase()} convoy` : `Solo ${versatility.flavorLabel.toLowerCase()} run`

  const syncHud = useCallback(() => {
    const state = stateRef.current
    const nextStop = state.routeStops[state.routeIndex]

    setHud({
      score: state.score,
      day: state.day,
      supplies: Math.round(state.supplies),
      morale: Math.round(state.morale),
      wagonHealth: Math.round(state.wagonHealth),
      distance: Math.round(state.routeProgress),
      totalDistance: Math.max(1, Math.round(state.totalDistance)),
      paceLabel: paceLabelFor(state),
      nextStop: nextStop ? nextStop.title : "Destination reached",
      paused: state.paused,
      won: state.won,
      awaitingStop: state.awaitingStop,
      canStabilize: state.supplies >= 2 && (state.morale < 96 || state.wagonHealth < 96),
      objective: state.objective,
      eventFeed: state.eventFeed,
      activeDirectiveIndex: state.activeDirectiveIndex,
      activeEventIndex: state.activeEventIndex,
    })
  }, [])

  const appendRoadEntities = useCallback((state: JourneyState, count: number) => {
    const random = randomRef.current
    const activeEvent = director.eventDeck[state.activeEventIndex % Math.max(director.eventDeck.length, 1)] ?? director.eventDeck[0]
    const tickWeights = getRuntimeEncounterTickWeights(
      director,
      state.activeDirectiveIndex,
      state.activeEventIndex,
      state.routeProgress / Math.max(1, state.totalDistance),
    )
    const hazardBias = (survivalHeavy ? 0.58 : economyHeavy ? 0.34 : 0.42) * scaffolding.tuning.pressureRate * playbook.tuning.pressure * tickWeights.hazardRate

    for (let index = 0; index < count; index += 1) {
      const isHazard = random() < Math.min(0.9, hazardBias)
      state.roadEntities.push({
        id: `road_${Math.floor(random() * 100000)}_${state.routeIndex}_${index}`,
        type: isHazard ? "hazard" : "supply",
        lane: -1 + random() * 2,
        depth: 0.08 + random() * 0.65,
        speed: (0.72 + random() * 0.62) * (isHazard ? tickWeights.objectiveTempo : tickWeights.eventAdvanceRate),
        value: isHazard
          ? Math.max(6, Math.round((8 + Math.floor(random() * 8)) * tickWeights.pressure))
          : Math.max(2, Math.round((2 + Math.floor(random() * 3)) * tickWeights.reward)),
        size: 0.8 + random() * 0.65,
        color: isHazard ? "#f97316" : "#22c55e",
        active: true,
      })
    }
  }, [director, economyHeavy, playbook.tuning.pressure, scaffolding, survivalHeavy])

  const stabilizeCaravan = useCallback(() => {
    const state = stateRef.current
    const activeEvent = director.eventDeck[state.activeEventIndex % Math.max(director.eventDeck.length, 1)] ?? director.eventDeck[0]
    if (state.supplies < 2 || state.won || state.morale <= 0 || state.wagonHealth <= 0) return

    state.supplies = Math.max(0, state.supplies - 2)
    state.morale = clamp(state.morale + 10 * playbook.tuning.recoveryWindow * activeEvent.modifiers.recovery, 0, 100)
    state.wagonHealth = clamp(state.wagonHealth + 16 * playbook.tuning.recoveryWindow * activeEvent.modifiers.recovery, 0, 100)
    state.objective = state.awaitingStop
      ? `The ${versatility.flavorLabel.toLowerCase()} regroups before the next leg.`
      : `${versatility.resourceLabels.primary} spent on recovery. ${activeEvent.objectiveShift}`
    state.audioPulse = Math.min(1, state.audioPulse + 0.35)
    syncHud()
  }, [director.eventDeck, playbook.tuning.recoveryWindow, syncHud, versatility.flavorLabel, versatility.resourceLabels.primary])

  const togglePause = useCallback(() => {
    const state = stateRef.current
    state.paused = !state.paused
    state.objective = state.paused
      ? `${versatility.flavorLabel} paused. Resume when the route is ready.`
      : state.won
        ? `${versatility.flavorLabel} complete. Restart to run the route again.`
        : state.awaitingStop
          ? "Stop ready. Resolve the event to continue."
          : `Route resumed. Keep ${versatility.pressureTracks[0].toLowerCase()} readable.`
    syncHud()
  }, [syncHud, versatility.flavorLabel, versatility.pressureTracks])

  const restartRun = useCallback(() => {
    setRunToken((value) => value + 1)
  }, [])

  const resolveStop = useCallback(() => {
    const state = stateRef.current
    if (!state.awaitingStop || state.won || state.routeIndex >= state.routeStops.length) return

    const stop = state.routeStops[state.routeIndex]
    const nextStop = state.routeStops[state.routeIndex + 1]
    let arrivalNote = stop.rewardLabel

    switch (stop.type) {
      case "camp":
        state.supplies = clamp(state.supplies + Math.round((2 + scaffolding.tuning.resourceBonus) * stop.rewardScale), 0, 32)
        state.morale = clamp(state.morale + 12 * scaffolding.tuning.recoveryBoost * stop.rewardScale, 0, 100)
        state.wagonHealth = clamp(state.wagonHealth + 8 * scaffolding.tuning.recoveryBoost * stop.rewardScale, 0, 100)
        state.score += 18
        arrivalNote = `${stop.scenarioLabel}: the camp settles the nerves of the party and tightens up the wagon.`
        break
      case "settlement":
        state.supplies = clamp(state.supplies + Math.round((6 + scaffolding.tuning.resourceBonus) * stop.rewardScale), 0, 34)
        state.morale = clamp(state.morale + 8 * scaffolding.tuning.recoveryBoost * stop.rewardScale, 0, 100)
        state.wagonHealth = clamp(state.wagonHealth + 14 * scaffolding.tuning.recoveryBoost * stop.rewardScale, 0, 100)
        state.score += 28
        arrivalNote = `${stop.eventLabel}: a real stop at last. Repairs, trade, and fresh supplies keep the trip alive.`
        break
      case "hazard":
        if (state.supplies >= 3) {
          state.supplies = clamp(state.supplies - 2, 0, 34)
          state.score += 24
          arrivalNote = `${stop.eventLabel}: you spend supplies to get the caravan through the hazard without breaking stride.`
        } else {
          state.wagonHealth = clamp(state.wagonHealth - Math.round(14 * stop.pressureScale), 0, 100)
          state.morale = clamp(state.morale - Math.round(10 * stop.pressureScale), 0, 100)
          state.score = Math.max(0, state.score - 8)
          arrivalNote = "The crossing bites back. Low supplies force the caravan to absorb the damage."
        }
        break
      case "landmark":
        state.morale = clamp(state.morale + 9, 0, 100)
        state.score += 22
        arrivalNote = `${stop.scenarioLabel}: a landmark gives the party confidence and reorients the route.`
        break
      case "destination":
        state.score += 80
        state.won = true
        state.objective = "Journey complete. Restart to travel the route again."
        syncHud()
        return
    }

    state.awaitingStop = false
    state.routeIndex += 1
    state.activeDirectiveIndex = state.routeIndex
    state.activeEventIndex = state.routeIndex
    state.pace = clamp(state.pace - 0.06, 0.66, 1.22)
    state.roadEntities = []
    appendRoadEntities(
      state,
      (project.design.scopeScale ?? "focused") === "limitless" ? 10 : (project.design.scopeScale ?? "focused") === "expanded" ? 8 : 6,
    )
    state.objective = nextStop
      ? `${arrivalNote} Next leg: ${nextStop.title}. ${nextStop.description} ${nextStop.eventLabel}.`
      : "Journey complete. Restart to travel the route again."
    state.eventFeed = `${stop.eventLabel}: ${stop.description}`
    state.audioPulse = Math.min(1, state.audioPulse + 0.45)
    syncHud()
  }, [appendRoadEntities, project.design.scopeScale, scaffolding, syncHud])

  const setControlKey = useCallback((key: string, pressed: boolean) => {
    stateRef.current.keys[key] = pressed
  }, [])

  const clearControls = useCallback(() => {
    stateRef.current.keys = {}
    stateRef.current.actionLocks.pause = false
    stateRef.current.actionLocks.stabilize = false
    stateRef.current.actionLocks.resolve = false
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext("2d")
    if (!context) return

    const state = createEmptyJourneyState()
    state.seed = project.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)
    randomRef.current = createSeededRandom(state.seed)

    const routeStops = buildJourneyStops(project, randomRef.current, scaffolding, director)
    state.routeStops = routeStops
    state.totalDistance = routeStops[routeStops.length - 1]?.distance ?? 900
    state.supplies = 12 + scaffolding.tuning.resourceBonus + (hasInventory ? 4 : 1) + (project.multiplayer ? Math.min(8, Math.ceil(project.maxPlayers / 4)) : 0)
    state.morale = (project.multiplayer ? 80 : 76) + Math.round((scaffolding.tuning.recoveryBoost - 1) * 8)
    state.wagonHealth = 100
    state.eventFeed = director.eventDeck[0]?.summary ?? "Live route events loading."
    state.objective = routeStops[0]
      ? `Depart toward ${routeStops[0].title}. ${routeStops[0].description} ${routeStops[0].eventLabel}.`
      : "The caravan is ready to roll."

    appendRoadEntities(
      state,
      (project.design.scopeScale ?? "focused") === "limitless" ? 10 : (project.design.scopeScale ?? "focused") === "expanded" ? 8 : 6,
    )
    stateRef.current = state
    syncHud()

    const keyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (CONTROL_KEYS.has(key)) event.preventDefault()
      if (!CONTROL_KEYS.has(key)) return

      state.keys[key] = true

      if (key === "p" && !state.actionLocks.pause) {
        state.actionLocks.pause = true
        togglePause()
      }

      if (key === "e" && !state.actionLocks.stabilize) {
        state.actionLocks.stabilize = true
        stabilizeCaravan()
      }

      if (key === " " && !state.actionLocks.resolve && state.awaitingStop) {
        state.actionLocks.resolve = true
        resolveStop()
      }

      if (key === "r" && (state.won || state.wagonHealth <= 0 || state.morale <= 0)) {
        restartRun()
      }
    }

    const keyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      state.keys[key] = false

      if (key === "p") state.actionLocks.pause = false
      if (key === "e") state.actionLocks.stabilize = false
      if (key === " ") state.actionLocks.resolve = false
    }

    window.addEventListener("keydown", keyDown)
    window.addEventListener("keyup", keyUp)
    window.addEventListener("blur", clearControls)

    let animationFrame = 0
    let frameIndex = 0

    const render = () => {
      const failure = state.wagonHealth <= 0 || state.morale <= 0
      const nextStop = state.routeStops[state.routeIndex]
      const previousStop = state.routeIndex > 0 ? state.routeStops[state.routeIndex - 1] : null
      const startDistance = previousStop?.distance ?? 0
      const legDistance = Math.max(1, (nextStop?.distance ?? state.totalDistance) - startDistance)
      const travelT = clamp((state.routeProgress - startDistance) / legDistance, 0, 1)
      const startPoint = {
        x: previousStop?.mapX ?? 54,
        y: previousStop?.mapY ?? (state.routeStops[0]?.mapY ?? CANVAS_HEIGHT / 2),
      }
      const nextPoint = {
        x: nextStop?.mapX ?? (state.routeStops[state.routeStops.length - 1]?.mapX ?? CANVAS_WIDTH - 80),
        y: nextStop?.mapY ?? (state.routeStops[state.routeStops.length - 1]?.mapY ?? CANVAS_HEIGHT / 2),
      }
      const marker = {
        x: startPoint.x + (nextPoint.x - startPoint.x) * travelT,
        y: startPoint.y + (nextPoint.y - startPoint.y) * travelT,
      }

      if (renderInThreeD) {
        const sky = context.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
        sky.addColorStop(0, historical ? "#b45309" : hasRendering ? "#0f172a" : "#111827")
        sky.addColorStop(0.54, historical ? "#78350f" : hasRendering ? "#164e63" : "#1f2937")
        sky.addColorStop(1, historical ? "#2c1608" : "#0b1120")
        context.fillStyle = sky
        context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

        const horizonY = 154
        context.fillStyle = historical ? "rgba(234,179,8,0.18)" : "rgba(56,189,248,0.12)"
        context.beginPath()
        context.arc(CANVAS_WIDTH * 0.72, 92, 54, 0, Math.PI * 2)
        context.fill()

        context.fillStyle = historical ? "#5b3414" : "#111827"
        context.beginPath()
        context.moveTo(0, horizonY + 18)
        context.lineTo(96, 88)
        context.lineTo(180, horizonY + 12)
        context.lineTo(278, 104)
        context.lineTo(372, horizonY + 10)
        context.lineTo(494, 82)
        context.lineTo(620, horizonY + 14)
        context.lineTo(720, 98)
        context.lineTo(800, horizonY + 22)
        context.lineTo(800, CANVAS_HEIGHT)
        context.lineTo(0, CANVAS_HEIGHT)
        context.closePath()
        context.fill()

        context.fillStyle = historical ? "#7c2d12" : "#14532d"
        context.fillRect(0, horizonY, CANVAS_WIDTH, CANVAS_HEIGHT - horizonY)

        context.fillStyle = historical ? "#5b3414" : "#334155"
        context.beginPath()
        context.moveTo(CANVAS_WIDTH / 2 - 56, horizonY)
        context.lineTo(CANVAS_WIDTH - 40, CANVAS_HEIGHT)
        context.lineTo(40, CANVAS_HEIGHT)
        context.closePath()
        context.fill()

        context.strokeStyle = historical ? "rgba(253,224,71,0.45)" : "rgba(226,232,240,0.4)"
        context.lineWidth = 2
        for (let stripe = 0; stripe < 11; stripe += 1) {
          const t = stripe / 10
          const y = horizonY + t * (CANVAS_HEIGHT - horizonY - 30)
          const width = 10 + t * 42
          context.beginPath()
          context.moveTo(CANVAS_WIDTH / 2 - width, y)
          context.lineTo(CANVAS_WIDTH / 2 + width, y)
          context.stroke()
        }

        const sortedEntities = [...state.roadEntities]
          .filter((entity) => entity.active)
          .sort((left, right) => left.depth - right.depth)

        sortedEntities.forEach((entity) => {
          const depth = clamp(entity.depth, 0, 1)
          const y = horizonY + depth * (CANVAS_HEIGHT - horizonY - 86)
          const roadHalfWidth = 52 + depth * 284
          const x = CANVAS_WIDTH / 2 + entity.lane * roadHalfWidth * 0.6
          const size = (7 + depth * 24) * entity.size

          if (entity.type === "hazard") {
            context.fillStyle = entity.color
            context.beginPath()
            context.moveTo(x, y - size)
            context.lineTo(x + size * 0.8, y)
            context.lineTo(x, y + size * 0.9)
            context.lineTo(x - size * 0.8, y)
            context.closePath()
            context.fill()
          } else {
            context.fillStyle = entity.color
            context.fillRect(x - size * 0.8, y - size * 0.7, size * 1.6, size * 1.2)
            context.fillStyle = "#14532d"
            context.fillRect(x - size * 0.22, y - size * 0.92, size * 0.44, size * 0.35)
          }
        })

        const wagonX = CANVAS_WIDTH / 2 + state.playerLane * 162
        const wagonY = CANVAS_HEIGHT - 86
        context.fillStyle = historical ? "#92400e" : "#7c3aed"
        context.fillRect(wagonX - 30, wagonY - 10, 60, 26)
        context.fillStyle = historical ? "#f59e0b" : "#a5b4fc"
        context.fillRect(wagonX - 22, wagonY - 28, 44, 18)
        context.fillStyle = "#111827"
        context.beginPath()
        context.arc(wagonX - 20, wagonY + 20, 12, 0, Math.PI * 2)
        context.arc(wagonX + 20, wagonY + 20, 12, 0, Math.PI * 2)
        context.fill()
      } else {
        const parchment = context.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
        parchment.addColorStop(0, "#f5e7c4")
        parchment.addColorStop(1, "#e4c68e")
        context.fillStyle = parchment
        context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

        context.fillStyle = "rgba(120,53,15,0.08)"
        for (let stripe = 0; stripe < 18; stripe += 1) {
          context.fillRect(0, stripe * 28, CANVAS_WIDTH, 12)
        }

        context.strokeStyle = "#7c5a2d"
        context.lineWidth = 9
        context.lineJoin = "round"
        context.beginPath()
        context.moveTo(54, state.routeStops[0]?.mapY ?? CANVAS_HEIGHT / 2)
        state.routeStops.forEach((stop) => context.lineTo(stop.mapX, stop.mapY))
        context.stroke()

        context.strokeStyle = "#0f172a"
        context.lineWidth = 3
        context.beginPath()
        context.moveTo(54, state.routeStops[0]?.mapY ?? CANVAS_HEIGHT / 2)
        context.lineTo(marker.x, marker.y)
        context.stroke()

        state.routeStops.forEach((stop) => {
          context.fillStyle = stopColor(stop.type)
          context.beginPath()
          context.arc(stop.mapX, stop.mapY, stop.type === "destination" ? 13 : 10, 0, Math.PI * 2)
          context.fill()
          context.fillStyle = "#3b2f1b"
          context.font = "11px var(--font-mono, monospace)"
          context.fillText(stop.title.slice(0, 18), stop.mapX - 18, stop.mapY - 18)
        })

        state.roadEntities.filter((entity) => entity.active).forEach((entity) => {
          const t = 1 - clamp(entity.depth, 0, 1)
          const x = marker.x + (nextPoint.x - marker.x) * t + entity.lane * 18
          const y = marker.y + (nextPoint.y - marker.y) * t
          context.fillStyle = entity.color
          if (entity.type === "hazard") {
            context.beginPath()
            context.moveTo(x, y - 10)
            context.lineTo(x + 8, y)
            context.lineTo(x, y + 10)
            context.lineTo(x - 8, y)
            context.closePath()
            context.fill()
          } else {
            context.fillRect(x - 8, y - 8, 16, 16)
          }
        })

        context.fillStyle = "#7c3aed"
        context.beginPath()
        context.arc(marker.x + state.playerLane * 14, marker.y + state.playerLane * 3, 12, 0, Math.PI * 2)
        context.fill()
        context.fillStyle = "#f8fafc"
        context.fillRect(marker.x - 8 + state.playerLane * 14, marker.y - 22 + state.playerLane * 3, 16, 8)
      }

      context.fillStyle = "rgba(15,23,42,0.72)"
      context.fillRect(14, 14, 198, 92)
      context.fillStyle = "#e2e8f0"
      context.font = "12px var(--font-mono, monospace)"
      context.fillText(`Day ${state.day}`, 26, 36)
      context.fillText(`Supplies ${Math.round(state.supplies)}`, 26, 54)
      context.fillText(`Morale ${Math.round(state.morale)}`, 26, 72)
      context.fillText(`Wagon ${Math.round(state.wagonHealth)}`, 26, 90)

      context.fillStyle = "rgba(15,23,42,0.72)"
      context.fillRect(CANVAS_WIDTH - 216, 14, 202, 140)
      context.fillStyle = "#e2e8f0"
      context.fillText(convoyLabel, CANVAS_WIDTH - 202, 34)
      context.fillText(`Pace ${paceLabelFor(state)}`, CANVAS_WIDTH - 202, 52)
      context.fillText(`${Math.round(state.routeProgress)}/${Math.round(state.totalDistance)} mi`, CANVAS_WIDTH - 202, 70)
      context.fillText(`${project.engine.toUpperCase()} BUILD`, CANVAS_WIDTH - 202, 88)

      const trackX = CANVAS_WIDTH - 188
      const trackY = 108
      const trackWidth = 154
      context.fillStyle = "#1e293b"
      context.fillRect(trackX, trackY, trackWidth, 6)
      context.fillStyle = "#8b5cf6"
      context.fillRect(trackX, trackY, (state.routeProgress / state.totalDistance) * trackWidth, 6)

      state.routeStops.forEach((stop) => {
        const stopProgress = stop.distance / state.totalDistance
        const x = trackX + stopProgress * trackWidth
        context.fillStyle = stopColor(stop.type)
        context.beginPath()
        context.arc(x, trackY + 3, stop.type === "destination" ? 5 : 4, 0, Math.PI * 2)
        context.fill()
      })

      if (nextStop) {
        context.fillStyle = "#cbd5e1"
        context.fillText(`Next ${nextStop.title.slice(0, 22)}`, CANVAS_WIDTH - 202, 134)
      }

      if (hasAudio) {
        context.strokeStyle = `rgba(96,165,250,${0.12 + state.audioPulse * 0.3})`
        context.lineWidth = 2
        context.beginPath()
        context.arc(
          renderInThreeD ? CANVAS_WIDTH / 2 + state.playerLane * 162 : marker.x,
          renderInThreeD ? CANVAS_HEIGHT - 66 : marker.y,
          18 + state.audioPulse * 24,
          0,
          Math.PI * 2,
        )
        context.stroke()
      }

      if (state.paused || state.won || failure) {
        context.fillStyle = "rgba(2,6,23,0.72)"
        context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
        context.textAlign = "center"
        context.font = "28px var(--font-mono, monospace)"
        context.fillStyle = state.won ? "#22c55e" : failure ? "#ef4444" : "#e2e8f0"
        context.fillText(
          state.won ? "JOURNEY COMPLETE" : failure ? "EXPEDITION LOST" : "JOURNEY PAUSED",
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2 - 16,
        )
        context.font = "14px var(--font-mono, monospace)"
        context.fillStyle = "#cbd5e1"
        context.fillText(
          state.won
            ? "Restart to run the route again."
            : failure
              ? "Press R or Restart Journey to try another run."
              : "Resume when the caravan is ready.",
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2 + 18,
        )
        context.textAlign = "start"
      }
    }

    const loop = () => {
      if (!state.running) return

      frameIndex += 1

      if (!state.paused && !state.won && state.wagonHealth > 0 && state.morale > 0) {
        state.time += 1 / 60
        state.day = 1 + Math.floor(state.time / 42)
        state.audioPulse *= 0.92

        const steer =
          (state.keys.a || state.keys.arrowleft ? -1 : 0) +
          (state.keys.d || state.keys.arrowright ? 1 : 0)

        if (state.keys.w || state.keys.arrowup) {
        state.pace = clamp(state.pace + 0.012 * playbook.tuning.mobility, 0.58, 1.28)
      }
      if (state.keys.s || state.keys.arrowdown) {
        state.pace = clamp(state.pace - 0.014 * playbook.tuning.traction, 0.58, 1.28)
      }

      if (!state.awaitingStop) {
        state.playerLane = clamp(state.playerLane + steer * 0.04, -1.18, 1.18)
        const effectivePace = clamp(state.pace + (state.keys.shift ? 0.18 * playbook.tuning.mobility : 0), 0.58, 1.44)
        const activeEvent = director.eventDeck[state.activeEventIndex % Math.max(director.eventDeck.length, 1)] ?? director.eventDeck[0]
        const activeWeights = getRuntimeEncounterTickWeights(
          director,
          state.activeDirectiveIndex,
          state.activeEventIndex,
          state.routeProgress / Math.max(1, state.totalDistance),
        )
        const travelSpeed = effectivePace * (renderInThreeD ? 1.92 : 1.44) * playbook.tuning.mobility * activeWeights.objectiveTempo
        const supplyDrain = 0.028 + effectivePace * 0.018 * playbook.tuning.pressure * activeWeights.pressure + (survivalHeavy ? 0.01 * playbook.tuning.pressure * activeWeights.pressure : 0)

        state.routeProgress = Math.min(state.totalDistance, state.routeProgress + travelSpeed)
        state.supplies = Math.max(0, state.supplies - supplyDrain)
        state.morale = clamp(
          state.morale - Math.max(0, effectivePace - 1.08) * 0.18 - (state.supplies <= 0 ? 0.22 : 0.03),
          0,
          100,
        )

        if (state.supplies <= 0) {
          state.wagonHealth = clamp(state.wagonHealth - 0.12, 0, 100)
        }

        state.roadEntities.forEach((entity) => {
          if (!entity.active) return

          entity.depth += 0.0032 * travelSpeed * entity.speed

          if (entity.depth < 0.9) return

          if (Math.abs(entity.lane - state.playerLane) < 0.28) {
            if (entity.type === "supply") {
              state.supplies = clamp(state.supplies + entity.value * playbook.tuning.rewardRate * activeWeights.reward, 0, 34)
              state.score += 10
              state.objective = `${activeEvent.label}: supplies recovered on the trail. The caravan can push a little longer.`
            } else {
              state.wagonHealth = clamp(state.wagonHealth - entity.value * playbook.tuning.pressure * activeWeights.pressure, 0, 100)
              state.morale = clamp(state.morale - 4 * playbook.tuning.pressure * activeWeights.pressure, 0, 100)
              state.score = Math.max(0, state.score - 2)
              state.objective = `${activeEvent.label}: rough terrain hits the wagon. Recover or ease the pace before the next stop.`
            }
            state.audioPulse = Math.min(1, state.audioPulse + 0.28)
          }

          if (entity.depth > 1.08) {
            entity.active = false
          }
        })

        state.roadEntities = state.roadEntities.filter((entity) => entity.active)
        if (state.roadEntities.length <= Math.max(2, Math.round(3 * Math.max(0.84, activeWeights.interaction)))) {
          appendRoadEntities(state, Math.max(2, Math.round(3 * Math.max(0.84, activeWeights.interaction))))
        }

        const nextStop = state.routeStops[state.routeIndex]
        if (nextStop && state.routeProgress >= nextStop.distance) {
          state.routeProgress = nextStop.distance
          state.awaitingStop = true
          state.eventFeed = `${nextStop.eventLabel}: ${nextStop.description}`
          state.objective =
            nextStop.type === "destination"
              ? `You made it to ${nextStop.title}. Press Space to finish the expedition under ${nextStop.eventLabel.toLowerCase()}.`
              : `Arrived at ${nextStop.title}. Press Space to resolve ${nextStop.eventLabel.toLowerCase()} and continue.`
        }
      }

        if (state.wagonHealth <= 0 || state.morale <= 0) {
          state.objective = "The journey collapsed before the destination. Restart and take a better line."
        }
      }

      render()

      if (frameIndex % 4 === 0) {
        syncHud()
      }

      animationFrame = requestAnimationFrame(loop)
    }

    animationFrame = requestAnimationFrame(loop)

    return () => {
      state.running = false
      cancelAnimationFrame(animationFrame)
      window.removeEventListener("keydown", keyDown)
      window.removeEventListener("keyup", keyUp)
      window.removeEventListener("blur", clearControls)
    }
  }, [
    appendRoadEntities,
    clearControls,
    convoyLabel,
    director,
    hasAudio,
    hasInventory,
    hasRendering,
    historical,
    project,
    renderInThreeD,
    resolveStop,
    restartRun,
    runToken,
    scaffolding,
    stabilizeCaravan,
    survivalHeavy,
    syncHud,
    togglePause,
    playbook.tuning.mobility,
    playbook.tuning.pressure,
    playbook.tuning.rewardRate,
    playbook.tuning.traction,
  ])

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
        <Badge variant="outline" className="capitalize">
          {project.multiplayer ? `${project.maxPlayers} players` : "Solo"}
        </Badge>
        <Badge variant="outline">
          {project.design.mapArchetype || "Trail Network"}
        </Badge>
        <Badge variant="outline" className="capitalize">
          {project.engine}
        </Badge>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={togglePause}>
            {hud.paused ? <Play className="mr-2 h-4 w-4" /> : <Pause className="mr-2 h-4 w-4" />}
            {hud.paused ? "Resume" : "Pause"}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={restartRun}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Restart Journey
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={!hud.awaitingStop} onClick={resolveStop}>
            <Zap className="mr-2 h-4 w-4" />
            {versatility.actionLabels.primary}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={!hud.canStabilize} onClick={stabilizeCaravan}>
            <Heart className="mr-2 h-4 w-4" />
            {versatility.actionLabels.recovery}
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
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{versatility.resourceLabels.primary}</p>
          <p className="mt-1 font-mono text-lg">{hud.supplies}</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{versatility.resourceLabels.secondary}</p>
          <p className="mt-1 font-mono text-lg">{hud.morale}</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Wagon</p>
          <p className="mt-1 font-mono text-lg">{hud.wagonHealth}</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Day</p>
          <p className="mt-1 font-mono text-lg">{hud.day}</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Distance</p>
          <p className="mt-1 font-mono text-lg">{hud.distance}/{hud.totalDistance}</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Pace</p>
          <p className="mt-1 font-mono text-lg capitalize">{hud.paceLabel}</p>
        </div>
      </div>

      <div className={graphicsPresentation.objectiveClassName}>
        {hud.objective}
      </div>
      <div className={graphicsPresentation.infoClassName}>
        {hud.eventFeed}
      </div>

      <div className={graphicsPresentation.infoClassName}>
        {project.design.runtimePlan.reason} {versatility.runtimeSubtitle} {project.design.nonOverlapStrategy || "Waypoint corridor ownership"}. {project.design.traversalModel || "Route-based exploration"}
      </div>

      <RuntimeVersatilityPanel plan={versatility} boardClassName={graphicsPresentation.boardClassName} />
      <RuntimeEncounterPanel
        director={director}
        boardClassName={graphicsPresentation.boardClassName}
        activeDirectiveIndex={hud.activeDirectiveIndex}
        activeEventIndex={hud.activeEventIndex}
      />
      <RuntimePlaybookPanel plan={playbook} boardClassName={graphicsPresentation.boardClassName} activeIndex={stateRef.current.routeIndex} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Steer And Pace</p>
          <div className="grid w-fit grid-cols-3 gap-2">
            <div />
            <ControlButton label="W" onPress={() => setControlKey("w", true)} onRelease={() => setControlKey("w", false)} />
            <div />
            <ControlButton label="A" onPress={() => setControlKey("a", true)} onRelease={() => setControlKey("a", false)} />
            <ControlButton label="S" onPress={() => setControlKey("s", true)} onRelease={() => setControlKey("s", false)} />
            <ControlButton label="D" onPress={() => setControlKey("d", true)} onRelease={() => setControlKey("d", false)} />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Actions</p>
          <div className="flex flex-wrap gap-2">
            <ControlButton label={versatility.actionLabels.primary} onPress={() => { setControlKey(" ", true); resolveStop() }} onRelease={() => setControlKey(" ", false)} disabled={!hud.awaitingStop} />
            <ControlButton label="Push" onPress={() => setControlKey("shift", true)} onRelease={() => setControlKey("shift", false)} />
            <ControlButton label={versatility.actionLabels.recovery} onPress={() => { setControlKey("e", true); stabilizeCaravan() }} onRelease={() => setControlKey("e", false)} disabled={!hud.canStabilize} />
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Use <span className="font-mono">A</span> and <span className="font-mono">D</span> to steer,{" "}
        <span className="font-mono">W</span> and <span className="font-mono">S</span> to set the pace,{" "}
        <span className="font-mono">Shift</span> to push harder,{" "}
        <span className="font-mono">Space</span> to {versatility.actionLabels.primary.toLowerCase()},{" "}
        <span className="font-mono">E</span> to {versatility.actionLabels.recovery.toLowerCase()},{" "}
        <span className="font-mono">P</span> to pause, and{" "}
        <span className="font-mono">R</span> to restart after failure or arrival.
      </p>
    </div>
  )
}
