"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ActionRuntime3D } from "@/components/game/action-runtime-3d"
import { HomesteadRuntime } from "@/components/game/homestead-runtime"
import { JourneyRuntime } from "@/components/game/journey-runtime"
import { getProjectRuntimeEncounterDirector, RuntimeEncounterPanel } from "@/components/game/runtime-encounters"
import { getRuntimeGraphicsPresentation } from "@/components/game/runtime-graphics"
import { getProjectRuntimePlaybookPlan, RuntimePlaybookPanel } from "@/components/game/runtime-playbook"
import { getProjectRuntimeVersatilityPlan, RuntimeVersatilityPanel } from "@/components/game/runtime-versatility"
import { getRuntimeEncounterTickWeights } from "@/lib/engine/runtime-encounters"
import { buildRuntimeScaffoldingPlan } from "@/lib/engine/runtime-scaffolding"
import { StrategyRuntime } from "@/components/game/strategy-runtime"
import { SurvivalRuntime } from "@/components/game/survival-runtime"
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
  "r",
  "p",
])

type RuntimeEntityType = "enemy" | "boss" | "shard" | "medkit" | "ally" | "portal"

interface RuntimeEntity {
  id: string
  type: RuntimeEntityType
  x: number
  y: number
  vx: number
  vy: number
  hp: number
  maxHp: number
  size: number
  color: string
  active: boolean
  cooldown: number
  locked?: boolean
}

interface RuntimeProjectile {
  x: number
  y: number
  vx: number
  vy: number
  ttl: number
  owner: "player" | "ally" | "enemy"
  color: string
  damage: number
}

interface RuntimeParticle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
  size: number
}

interface RuntimePlayer {
  x: number
  y: number
  vx: number
  vy: number
  hp: number
  maxHp: number
  facing: number
  medkits: number
  dashCooldown: number
  shootCooldown: number
}

interface RuntimeState {
  player: RuntimePlayer
  entities: RuntimeEntity[]
  projectiles: RuntimeProjectile[]
  particles: RuntimeParticle[]
  keys: Record<string, boolean>
  rooms: { x: number; y: number; w: number; h: number }[]
  corridors: { x1: number; y1: number; x2: number; y2: number }[]
  seed: number
  score: number
  time: number
  shardsCollected: number
  totalShards: number
  inventory: number
  activeDirectiveIndex: number
  activeEventIndex: number
  eventHistory: string[]
  running: boolean
  paused: boolean
  won: boolean
  objective: string
  audioPulse: number
  initialEnemyCount: number
  actionLocks: {
    pause: boolean
    heal: boolean
  }
}

interface HudState {
  hp: number
  maxHp: number
  score: number
  time: number
  shardsCollected: number
  totalShards: number
  inventory: number
  medkits: number
  enemiesLeft: number
  portalUnlocked: boolean
  paused: boolean
  won: boolean
  objective: string
  currentEvent: string
  activeDirectiveIndex: number
  activeEventIndex: number
  dashReady: boolean
}

function createSeededRandom(seed: number) {
  let value = seed

  return () => {
    value = (value * 1664525 + 1013904223) % 0x100000000
    return value / 0x100000000
  }
}

function createEmptyState(): RuntimeState {
  return {
    player: {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT / 2,
      vx: 0,
      vy: 0,
      hp: 100,
      maxHp: 100,
      facing: 0,
      medkits: 0,
      dashCooldown: 0,
      shootCooldown: 0,
    },
    entities: [],
    projectiles: [],
    particles: [],
    keys: {},
    rooms: [],
    corridors: [],
    seed: 0,
    score: 0,
    time: 0,
    shardsCollected: 0,
    totalShards: 0,
    inventory: 0,
    activeDirectiveIndex: 0,
    activeEventIndex: 0,
    eventHistory: [],
    running: true,
    paused: false,
    won: false,
    objective: "Stabilizing generation stream...",
    audioPulse: 0,
    initialEnemyCount: 0,
    actionLocks: {
      pause: false,
      heal: false,
    },
  }
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function roomsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
  padding = 18,
) {
  return !(
    a.x + a.w + padding <= b.x ||
    b.x + b.w + padding <= a.x ||
    a.y + a.h + padding <= b.y ||
    b.y + b.h + padding <= a.y
  )
}

function buildRooms({
  roomCount,
  dimension,
  random,
}: {
  roomCount: number
  dimension: UserProject["dimension"]
  random: () => number
}) {
  const rooms: { x: number; y: number; w: number; h: number }[] = []
  const isTwoD = dimension === "2d" || dimension === "hybrid"
  const laneAnchors = isTwoD ? [78, 166, 262, 358, 438] : []

  for (let index = 0; index < roomCount; index += 1) {
    let placed = false

    for (let attempt = 0; attempt < 80 && !placed; attempt += 1) {
      const width = isTwoD ? 104 + Math.floor(random() * 94) : 90 + Math.floor(random() * 120)
      const height = isTwoD ? 54 + Math.floor(random() * 48) : 78 + Math.floor(random() * 108)
      const x = 24 + Math.floor(random() * (CANVAS_WIDTH - width - 48))
      const y = isTwoD
        ? Math.max(24, Math.min(CANVAS_HEIGHT - height - 24, laneAnchors[index % laneAnchors.length] - height / 2 + Math.floor(random() * 20)))
        : 24 + Math.floor(random() * (CANVAS_HEIGHT - height - 48))
      const candidate = { x, y, w: width, h: height }

      if (!rooms.some((room) => roomsOverlap(room, candidate, isTwoD ? 26 : 18))) {
        rooms.push(candidate)
        placed = true
      }
    }

    if (!placed) {
      const fallbackX = 24 + (index % 4) * 180
      const fallbackY = 24 + Math.floor(index / 4) * (isTwoD ? 92 : 118)
      rooms.push({
        x: Math.min(CANVAS_WIDTH - 120, fallbackX),
        y: Math.min(CANVAS_HEIGHT - 96, fallbackY),
        w: isTwoD ? 132 : 110,
        h: isTwoD ? 62 : 88,
      })
    }
  }

  const sortedRooms = [...rooms].sort((left, right) =>
    left.x === right.x ? left.y - right.y : left.x - right.x,
  )

  const corridors = sortedRooms.slice(1).map((room, index) => {
    const previous = sortedRooms[index]
    return {
      x1: previous.x + previous.w / 2,
      y1: previous.y + previous.h / 2,
      x2: room.x + room.w / 2,
      y2: room.y + room.h / 2,
    }
  })

  return { rooms: sortedRooms, corridors }
}

function shouldUseJourneyRuntime(project: UserProject) {
  const travelDrivenGenres = new Set(["adventure", "simulation", "strategy", "survival"])
  const promptSignals = project.design.promptSignals ?? []
  const resolvedGenre = project.design.resolvedGenre ?? project.genre
  const journeySignals = new Set([
    "travel-heavy",
    "simulation-heavy",
    "economy-heavy",
    "historical",
    "peaceful",
    "strategy-heavy",
    "survival-heavy",
  ])
  const promptHasCombatIntent = promptSignals.includes("combat-heavy")

  return (
    (travelDrivenGenres.has(resolvedGenre) || promptSignals.some((signal) => journeySignals.has(signal))) &&
    !promptHasCombatIntent
  )
}

function resolveRuntimeArchetype(project: UserProject) {
  const planned = project.design.runtimePlan?.archetype
  if (planned) return planned

  if (shouldUseJourneyRuntime(project)) return "journey_route"
  if (project.genre === "simulation") return "homestead_life"
  if (project.genre === "strategy" && project.dimension !== "3d") return "strategy_command"
  if (project.dimension === "3d" && (project.genre === "survival" || project.genre === "horror")) {
    return "survival_expedition_3d"
  }
  if (project.dimension === "3d") return "action_operation_3d"
  if (project.genre === "survival" || project.genre === "horror") return "survival_horde"
  return "combat_mission"
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

function ObjectiveRuntime({ project }: { project: UserProject }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<RuntimeState>(createEmptyState())
  const [runToken, setRunToken] = useState(0)
  const [hud, setHud] = useState<HudState>({
    hp: 100,
    maxHp: 100,
    score: 0,
    time: 0,
    shardsCollected: 0,
    totalShards: 0,
    inventory: 0,
    medkits: 0,
    enemiesLeft: 0,
    portalUnlocked: false,
    paused: false,
    won: false,
    objective: "Generating runtime...",
    currentEvent: "Preparing encounter chain...",
    activeDirectiveIndex: 0,
    activeEventIndex: 0,
    dashReady: true,
  })

  const hasCombat = project.features.includes("combat")
  const hasAI = project.features.includes("ai_npc")
  const hasPhysics = project.features.includes("physics")
  const hasInventory = project.features.includes("inventory")
  const hasWorldGen = project.features.includes("world_gen")
  const hasRendering = project.features.includes("rendering")
  const hasAudio = project.features.includes("audio")
  const hasUI = project.features.includes("ui")
  const hasMultiplayerSystems = project.multiplayer || project.features.includes("networking")
  const isTwoD = project.dimension !== "3d"
  const graphicsPresentation = getRuntimeGraphicsPresentation(project)
  const versatility = useMemo(() => getProjectRuntimeVersatilityPlan(project), [project])
  const scaffolding = useMemo(() => buildRuntimeScaffoldingPlan(project), [project])
  const playbook = useMemo(() => getProjectRuntimePlaybookPlan(project), [project])
  const director = useMemo(() => getProjectRuntimeEncounterDirector(project), [project])

  const syncHud = useCallback(() => {
    const state = stateRef.current
    const portal = state.entities.find((entity) => entity.type === "portal" && entity.active)
    const enemiesLeft = state.entities.filter(
      (entity) => entity.active && (entity.type === "enemy" || entity.type === "boss"),
    ).length

    setHud({
      hp: state.player.hp,
      maxHp: state.player.maxHp,
      score: state.score,
      time: state.time,
      shardsCollected: state.shardsCollected,
      totalShards: state.totalShards,
      inventory: state.inventory,
      medkits: state.player.medkits,
      enemiesLeft,
      portalUnlocked: Boolean(portal && !portal.locked),
      paused: state.paused,
      won: state.won,
      objective: state.objective,
      currentEvent: state.eventHistory[0] ?? director.eventDeck[0]?.label ?? "Prompt shift",
      activeDirectiveIndex: state.activeDirectiveIndex,
      activeEventIndex: state.activeEventIndex,
      dashReady: state.player.dashCooldown <= 0,
    })
  }, [director.eventDeck])

  const spawnBurst = useCallback((x: number, y: number, color: string, intensity = 8) => {
    const state = stateRef.current

    for (let index = 0; index < intensity; index += 1) {
      state.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        life: 18 + Math.floor(Math.random() * 10),
        color,
        size: 1 + Math.random() * 2,
      })
    }
  }, [])

  const fireProjectile = useCallback(
    (
      owner: RuntimeProjectile["owner"],
      x: number,
      y: number,
      angle: number,
      options?: { speed?: number; damage?: number; color?: string; ttl?: number },
    ) => {
      const state = stateRef.current
      const speed = options?.speed ?? 8
      const damage = options?.damage ?? 22
      const ttl = options?.ttl ?? 48
      const color =
        options?.color ?? (owner === "enemy" ? "#fb7185" : owner === "ally" ? "#38bdf8" : "#c084fc")

      state.projectiles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        ttl,
        owner,
        color,
        damage,
      })
      state.audioPulse = Math.min(1, state.audioPulse + 0.35)
    },
    [],
  )

  const consumeMedkit = useCallback(() => {
    const state = stateRef.current
    if (!hasInventory || state.player.medkits <= 0 || state.player.hp >= state.player.maxHp) return

    state.player.medkits -= 1
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + 28 * playbook.tuning.recoveryWindow)
    state.objective = "Medical kit applied. Push toward the extraction gate."
    spawnBurst(state.player.x, state.player.y, "#22c55e", 12)
    syncHud()
  }, [hasInventory, playbook.tuning.recoveryWindow, spawnBurst, syncHud])

  const togglePause = useCallback(() => {
    const state = stateRef.current
    state.paused = !state.paused
    state.objective = state.paused
      ? "Runtime paused. Resume when you are ready."
      : state.won
        ? "Extraction complete. Restart to run it again."
        : "Runtime resumed. Complete the extraction objective."
    syncHud()
  }, [syncHud])

  const restartRun = useCallback(() => {
    setRunToken((value) => value + 1)
  }, [])

  const setControlKey = useCallback((key: string, pressed: boolean) => {
    stateRef.current.keys[key] = pressed
  }, [])

  const clearControls = useCallback(() => {
    stateRef.current.keys = {}
    stateRef.current.actionLocks.pause = false
    stateRef.current.actionLocks.heal = false
  }, [])

  const shootFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      if (!hasCombat) return

      const canvas = canvasRef.current
      const state = stateRef.current
      if (!canvas || state.paused || state.won || state.player.hp <= 0) return
      if (state.player.shootCooldown > 0) return

      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const targetX = (clientX - rect.left) * scaleX
      const targetY = (clientY - rect.top) * scaleY
      const angle = Math.atan2(targetY - state.player.y, targetX - state.player.x)

      state.player.facing = angle
      state.player.shootCooldown = (hasPhysics ? 0.1 : 0.14) / playbook.tuning.traction
      fireProjectile("player", state.player.x, state.player.y, angle, {
        speed: (hasPhysics ? 10 : 8.5) * playbook.tuning.mobility,
        damage: (hasAI ? 24 : 20) * playbook.tuning.mobility,
      })
      spawnBurst(state.player.x, state.player.y, "#8b5cf6", 6)
    },
    [fireProjectile, hasAI, hasCombat, hasPhysics, playbook.tuning.mobility, playbook.tuning.traction, spawnBurst],
  )

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const state = stateRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const targetX = (event.clientX - rect.left) * scaleX
    const targetY = (event.clientY - rect.top) * scaleY
    state.player.facing = Math.atan2(targetY - state.player.y, targetX - state.player.x)
  }, [])

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      shootFromPointer(event.clientX, event.clientY)
    },
    [shootFromPointer],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext("2d")
    if (!context) return

    const state = createEmptyState()
    state.seed = project.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)
    const openingWeights = getRuntimeEncounterTickWeights(director, 0, 0, 0.08)
    state.totalShards = (hasInventory ? 5 : hasWorldGen ? 4 : 3) + Math.max(0, Math.round(scaffolding.tuning.interactionDensity - 1)) + Math.max(0, Math.round((playbook.tuning.interactionFrequency - 1) * 2 * openingWeights.interaction))
    state.eventHistory = director.eventDeck.slice(0, 1).map((event) => event.label)
    stateRef.current = state

    const random = createSeededRandom(state.seed)
    const enemyCount = hasCombat ? Math.round((4 + Math.round(scaffolding.tuning.combatDensity * 2) + Math.max(0, Math.round((playbook.tuning.pressure - 1) * 3)) + (hasAI ? 5 : 2) + (hasMultiplayerSystems ? 2 : 0)) * openingWeights.hostileSpawn) : 0
    const allyCount = hasMultiplayerSystems ? Math.min(3, Math.max(1, Math.ceil(project.maxPlayers / 12))) : 0
    const roomCount = 6 + Math.max(0, scaffolding.tuning.resourceBonus) + Math.max(0, Math.round((playbook.tuning.rewardRate - 1) * 2)) + (hasWorldGen ? 4 : 0) + (project.genre === "sandbox" ? 2 : 0) + (isTwoD ? 1 : 0) + Math.max(0, Math.round(openingWeights.hazardRate * 2))
    const medkitCount = hasInventory ? 3 + Math.max(0, Math.round((playbook.tuning.recoveryWindow - 1) * 2)) + Math.max(0, Math.round(openingWeights.supportSpawn)) : hasCombat ? 1 : 0
    const hasBoss = hasCombat && hasAI
    const layout = buildRooms({ roomCount, dimension: project.dimension, random })
    state.rooms = layout.rooms
    state.corridors = layout.corridors

    const startRoom = state.rooms[0]
    const portalRoom = state.rooms[state.rooms.length - 1]
    state.player.x = startRoom.x + startRoom.w / 2
    state.player.y = startRoom.y + startRoom.h / 2
    state.player.medkits = hasInventory ? 1 : 0
    state.objective = `${director.objectiveChain[0]?.objective ?? scaffolding.objectivePrompts[0] ?? versatility.objectiveHooks[0] ?? project.design.levelSequence[0]?.purpose ?? "Secure the opening route."} ${director.eventDeck[0]?.objectiveShift ?? `Then finish the ${versatility.encounterLabels.destination.toLowerCase()}.`}`

    state.entities.push({
      id: "portal",
      type: "portal",
      x: portalRoom.x + portalRoom.w / 2,
      y: portalRoom.y + portalRoom.h / 2,
      vx: 0,
      vy: 0,
      hp: 1,
      maxHp: 1,
      size: 14,
      color: "#a855f7",
      active: true,
      cooldown: 0,
      locked: true,
    })

    for (let index = 0; index < state.totalShards; index += 1) {
      const room = state.rooms[1 + (index % Math.max(1, state.rooms.length - 1))]
      state.entities.push({
        id: `shard_${index}`,
        type: "shard",
        x: room.x + random() * room.w,
        y: room.y + random() * room.h,
        vx: 0,
        vy: 0,
        hp: 1,
        maxHp: 1,
        size: 7,
        color: "#f59e0b",
        active: true,
        cooldown: 0,
      })
    }

    for (let index = 0; index < medkitCount; index += 1) {
      const room = state.rooms[(index + 2) % state.rooms.length]
      state.entities.push({
        id: `medkit_${index}`,
        type: "medkit",
        x: room.x + random() * room.w,
        y: room.y + random() * room.h,
        vx: 0,
        vy: 0,
        hp: 1,
        maxHp: 1,
        size: 8,
        color: "#22c55e",
        active: true,
        cooldown: 0,
      })
    }

    for (let index = 0; index < allyCount; index += 1) {
      state.entities.push({
        id: `ally_${index}`,
        type: "ally",
        x: state.player.x + (index + 1) * 18,
        y: state.player.y + (index % 2 === 0 ? 1 : -1) * 24,
        vx: 0,
        vy: 0,
        hp: 80,
        maxHp: 80,
        size: 7,
        color: "#38bdf8",
        active: true,
        cooldown: 0,
      })
    }

    for (let index = 0; index < enemyCount; index += 1) {
      const room = state.rooms[(index + 1) % state.rooms.length]
      state.entities.push({
        id: `enemy_${index}`,
        type: "enemy",
        x: room.x + random() * room.w,
        y: room.y + random() * room.h,
        vx: (random() - 0.5) * (hasPhysics ? 1.8 : 1.2),
        vy: (random() - 0.5) * (hasPhysics ? 1.8 : 1.2),
        hp: 42,
        maxHp: 42,
        size: 10,
        color: "#ef4444",
        active: true,
        cooldown: 0.4 + random() * 0.6,
      })
    }

    if (hasBoss) {
      state.entities.push({
        id: "boss",
        type: "boss",
        x: portalRoom.x + portalRoom.w / 2 + 36,
        y: portalRoom.y + portalRoom.h / 2 - 28,
        vx: 0,
        vy: 0,
        hp: 160,
        maxHp: 160,
        size: 16,
        color: "#fb7185",
        active: true,
        cooldown: 0.8,
      })
    }

    state.initialEnemyCount = state.entities.filter(
      (entity) => entity.type === "enemy" || entity.type === "boss",
    ).length

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

      if (key === "e" && !state.actionLocks.heal) {
        state.actionLocks.heal = true
        consumeMedkit()
      }

      if (key === "r" && (state.won || state.player.hp <= 0)) {
        restartRun()
      }
    }

    const keyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      state.keys[key] = false

      if (key === "p") state.actionLocks.pause = false
      if (key === "e") state.actionLocks.heal = false
    }

    window.addEventListener("keydown", keyDown)
    window.addEventListener("keyup", keyUp)
    window.addEventListener("blur", clearControls)

    let animationFrame = 0
    let frameIndex = 0

    const render = () => {
      const player = state.player
      const enemiesLeft = state.entities.filter(
        (entity) => entity.active && (entity.type === "enemy" || entity.type === "boss"),
      ).length
      const portalUnlocked = Boolean(
        state.entities.find((entity) => entity.type === "portal" && entity.active && !entity.locked),
      )

      context.fillStyle = hasRendering ? (isTwoD ? "#08111f" : "#05060b") : "#0a0a0f"
      context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      if (hasRendering) {
        const backdrop = context.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
        backdrop.addColorStop(0, isTwoD ? "rgba(14,116,144,0.18)" : "rgba(76,29,149,0.18)")
        backdrop.addColorStop(1, isTwoD ? "rgba(30,41,59,0.18)" : "rgba(8,47,73,0.16)")
        context.fillStyle = backdrop
        context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
      }

      for (const room of state.rooms) {
        context.fillStyle = hasRendering ? (isTwoD ? "#102033" : "#14192b") : "#141420"
        context.fillRect(room.x, room.y, room.w, room.h)
        context.strokeStyle = hasRendering ? (isTwoD ? "#2c5b76" : "#2d3a59") : "#2a2a3a"
        context.lineWidth = 1
        context.strokeRect(room.x, room.y, room.w, room.h)
      }

      context.strokeStyle = hasRendering ? (isTwoD ? "#164e63" : "#1c2340") : "#1a1a2a"
      context.lineWidth = isTwoD ? 10 : 16
      for (const corridor of state.corridors) {
        context.beginPath()
        context.moveTo(corridor.x1, corridor.y1)
        context.lineTo(corridor.x2, corridor.y1)
        context.lineTo(corridor.x2, corridor.y2)
        context.stroke()
      }

      context.strokeStyle = "rgba(148,163,184,0.05)"
      context.lineWidth = 0.5
      for (let gridX = 0; gridX < CANVAS_WIDTH; gridX += 32) {
        context.beginPath()
        context.moveTo(gridX, 0)
        context.lineTo(gridX, CANVAS_HEIGHT)
        context.stroke()
      }
      for (let gridY = 0; gridY < CANVAS_HEIGHT; gridY += 32) {
        context.beginPath()
        context.moveTo(0, gridY)
        context.lineTo(CANVAS_WIDTH, gridY)
        context.stroke()
      }

      for (const entity of state.entities) {
        if (!entity.active) continue

        if (entity.type === "portal") {
          context.globalAlpha = entity.locked ? 0.45 : 0.95
          context.strokeStyle = entity.locked ? "#71717a" : "#a855f7"
          context.lineWidth = 4
          context.beginPath()
          context.arc(entity.x, entity.y, entity.size + 4, 0, Math.PI * 2)
          context.stroke()
          context.lineWidth = 2
          context.beginPath()
          context.arc(entity.x, entity.y, entity.size - 2, 0, Math.PI * 2)
          context.stroke()
          context.globalAlpha = 1
          continue
        }

        context.fillStyle = entity.color

        if (entity.type === "enemy" || entity.type === "boss") {
          context.beginPath()
          context.moveTo(entity.x, entity.y - entity.size)
          context.lineTo(entity.x + entity.size, entity.y + entity.size)
          context.lineTo(entity.x - entity.size, entity.y + entity.size)
          context.closePath()
          context.fill()

          context.fillStyle = "#111827"
          context.fillRect(entity.x - entity.size, entity.y - entity.size - 7, entity.size * 2, 4)
          context.fillStyle = entity.type === "boss" ? "#fb7185" : "#ef4444"
          context.fillRect(
            entity.x - entity.size,
            entity.y - entity.size - 7,
            (Math.max(0, entity.hp) / entity.maxHp) * entity.size * 2,
            4,
          )
          continue
        }

        if (entity.type === "ally") {
          context.globalAlpha = 0.95
          context.beginPath()
          context.arc(entity.x, entity.y, entity.size, 0, Math.PI * 2)
          context.fill()
          context.globalAlpha = 1
          continue
        }

        if (entity.type === "medkit") {
          context.fillRect(entity.x - entity.size, entity.y - 3, entity.size * 2, 6)
          context.fillRect(entity.x - 3, entity.y - entity.size, 6, entity.size * 2)
          continue
        }

        context.globalAlpha = 0.75 + Math.sin(state.time * 4) * 0.2
        context.beginPath()
        context.arc(entity.x, entity.y, entity.size, 0, Math.PI * 2)
        context.fill()
        context.globalAlpha = 1
      }

      for (const projectile of state.projectiles) {
        context.fillStyle = projectile.color
        context.beginPath()
        context.arc(projectile.x, projectile.y, projectile.owner === "enemy" ? 4 : 3, 0, Math.PI * 2)
        context.fill()
      }

      for (const particle of state.particles) {
        context.globalAlpha = particle.life / 28
        context.fillStyle = particle.color
        context.beginPath()
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        context.fill()
      }
      context.globalAlpha = 1

      const glow = context.createRadialGradient(player.x, player.y, 0, player.x, player.y, 36)
      glow.addColorStop(0, "rgba(139,92,246,0.2)")
      glow.addColorStop(1, "transparent")
      context.fillStyle = glow
      context.fillRect(player.x - 36, player.y - 36, 72, 72)
      context.fillStyle = "#8b5cf6"
      context.beginPath()
      context.arc(player.x, player.y, 9, 0, Math.PI * 2)
      context.fill()
      context.fillStyle = "#f5d0fe"
      context.beginPath()
      context.arc(
        player.x + Math.cos(player.facing) * 7,
        player.y + Math.sin(player.facing) * 7,
        3,
        0,
        Math.PI * 2,
      )
      context.fill()

      context.fillStyle = "#111827"
      context.fillRect(12, 12, 180, 8)
      context.fillStyle = player.hp > 60 ? "#22c55e" : player.hp > 30 ? "#eab308" : "#ef4444"
      context.fillRect(12, 12, (player.hp / player.maxHp) * 180, 8)

      context.font = "11px var(--font-mono, monospace)"
      context.fillStyle = "#cbd5e1"
      context.fillText(`HP ${Math.round(player.hp)}/${player.maxHp}`, 14, 34)
      context.fillText(`Score ${state.score}`, 14, 50)
      context.fillText(`Shards ${state.shardsCollected}/${state.totalShards}`, 14, 66)
      context.fillText(`Medkits ${player.medkits}`, 14, 82)

      context.textAlign = "right"
      context.fillText(
        hasMultiplayerSystems ? `Squad ${Math.max(project.maxPlayers, 1)}P` : "Solo Runtime",
        CANVAS_WIDTH - 16,
        24,
      )
      context.fillText(portalUnlocked ? "Extraction open" : "Portal locked", CANVAS_WIDTH - 16, 40)
      context.fillText(`Enemies ${enemiesLeft}`, CANVAS_WIDTH - 16, 56)
      context.fillText(`${project.engine.toUpperCase()} BUILD`, CANVAS_WIDTH - 16, 72)
      context.textAlign = "start"

      if (hasUI) {
        context.fillStyle = "rgba(15,23,42,0.85)"
        context.fillRect(CANVAS_WIDTH - 140, CANVAS_HEIGHT - 140, 120, 120)
        context.strokeStyle = "rgba(148,163,184,0.25)"
        context.strokeRect(CANVAS_WIDTH - 140, CANVAS_HEIGHT - 140, 120, 120)
        const scaleX = 120 / CANVAS_WIDTH
        const scaleY = 120 / CANVAS_HEIGHT

        for (const entity of state.entities) {
          if (!entity.active) continue
          const color =
            entity.type === "enemy" || entity.type === "boss"
              ? "#ef4444"
              : entity.type === "portal"
                ? "#a855f7"
                : entity.type === "ally"
                  ? "#38bdf8"
                  : "#f59e0b"
          context.fillStyle = color
          context.beginPath()
          context.arc(
            CANVAS_WIDTH - 140 + entity.x * scaleX,
            CANVAS_HEIGHT - 140 + entity.y * scaleY,
            entity.type === "boss" ? 3 : 2,
            0,
            Math.PI * 2,
          )
          context.fill()
        }

        context.fillStyle = "#ffffff"
        context.beginPath()
        context.arc(
          CANVAS_WIDTH - 140 + player.x * scaleX,
          CANVAS_HEIGHT - 140 + player.y * scaleY,
          3,
          0,
          Math.PI * 2,
        )
        context.fill()
      }

      if (hasAudio) {
        context.strokeStyle = `rgba(56,189,248,${0.12 + state.audioPulse * 0.3})`
        context.lineWidth = 2
        context.beginPath()
        context.arc(player.x, player.y, 18 + state.audioPulse * 28, 0, Math.PI * 2)
        context.stroke()
      }

      if (state.paused || state.won || player.hp <= 0) {
        context.fillStyle = "rgba(2,6,23,0.72)"
        context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
        context.textAlign = "center"
        context.font = "28px var(--font-mono, monospace)"
        context.fillStyle = state.won ? "#22c55e" : player.hp <= 0 ? "#ef4444" : "#e2e8f0"
        context.fillText(
          state.won ? "EXTRACTION COMPLETE" : player.hp <= 0 ? "RUN FAILED" : "RUNTIME PAUSED",
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2 - 16,
        )
        context.font = "14px var(--font-mono, monospace)"
        context.fillStyle = "#cbd5e1"
        context.fillText(
          state.won
            ? "Restart to run another generated session."
            : player.hp <= 0
              ? "Press R or Restart Run to redeploy."
              : "Resume when you are ready.",
          CANVAS_WIDTH / 2,
          CANVAS_HEIGHT / 2 + 18,
        )
        context.textAlign = "start"
      }
    }

    const loop = () => {
      if (!state.running) return

      frameIndex += 1

      if (!state.paused && !state.won && state.player.hp > 0) {
        state.time += 1 / 60
        state.audioPulse *= 0.92
        const activeWeights = getRuntimeEncounterTickWeights(
          director,
          state.activeDirectiveIndex,
          state.activeEventIndex,
          state.shardsCollected / Math.max(1, state.totalShards),
        )
        const nextDirectiveIndex = Math.min(
          Math.max(0, director.objectiveChain.length - 1),
          Math.floor((state.shardsCollected / Math.max(1, state.totalShards)) * Math.max(1, director.objectiveChain.length)),
        )
        if (nextDirectiveIndex !== state.activeDirectiveIndex) {
          state.activeDirectiveIndex = nextDirectiveIndex
          const activeDirective = director.objectiveChain[state.activeDirectiveIndex] ?? director.objectiveChain[0]
          state.objective = `${activeDirective.objective} ${activeDirective.successSignal}`
        }

        const timedEventIndex = Math.min(
          Math.max(0, director.eventDeck.length - 1),
          Math.floor(state.time / Math.max(10, 18 / Math.max(0.84, activeWeights.eventAdvanceRate))),
        )
        if (timedEventIndex > state.activeEventIndex) {
          state.activeEventIndex = timedEventIndex
          const liveEvent = director.eventDeck[state.activeEventIndex] ?? director.eventDeck[0]
          state.eventHistory = [liveEvent.label, ...state.eventHistory].slice(0, 4)
          state.objective = `${liveEvent.objectiveShift} ${liveEvent.rewardHint}`

          if (liveEvent.category === "pressure" && hasCombat) {
            const pressureRoom = state.rooms[Math.min(state.rooms.length - 1, 1 + (state.activeEventIndex % Math.max(1, state.rooms.length - 1)))] ?? state.rooms[0]
            state.entities.push({
              id: `event_enemy_${state.activeEventIndex}`,
              type: "enemy",
              x: pressureRoom.x + random() * pressureRoom.w,
              y: pressureRoom.y + random() * pressureRoom.h,
              vx: (random() - 0.5) * 1.2 * activeWeights.objectiveTempo,
              vy: (random() - 0.5) * 1.2 * activeWeights.objectiveTempo,
              hp: Math.round(48 * activeWeights.pressure),
              maxHp: Math.round(48 * activeWeights.pressure),
              size: 10,
              color: "#ef4444",
              active: true,
              cooldown: 0.55,
            })
            state.initialEnemyCount += 1
          } else if (liveEvent.category === "opportunity") {
            const opportunityRoom = state.rooms[Math.min(state.rooms.length - 1, 1 + (state.activeEventIndex % Math.max(1, state.rooms.length - 1)))] ?? state.rooms[0]
            state.entities.push({
              id: `event_shard_${state.activeEventIndex}`,
              type: "shard",
              x: opportunityRoom.x + random() * opportunityRoom.w,
              y: opportunityRoom.y + random() * opportunityRoom.h,
              vx: 0,
              vy: 0,
              hp: 1,
              maxHp: 1,
              size: 7,
              color: "#f59e0b",
              active: true,
              cooldown: 0,
            })
            if (hasInventory) {
              state.entities.push({
                id: `event_medkit_${state.activeEventIndex}`,
                type: "medkit",
                x: opportunityRoom.x + random() * opportunityRoom.w,
                y: opportunityRoom.y + random() * opportunityRoom.h,
                vx: 0,
                vy: 0,
                hp: 1,
                maxHp: 1,
                size: 8,
                color: "#22c55e",
                active: true,
                cooldown: 0,
              })
            }
          } else if (liveEvent.category === "recovery") {
            state.player.medkits += hasInventory ? 1 : 0
            state.player.hp = Math.min(state.player.maxHp, state.player.hp + 12 * activeWeights.recovery)
          } else if (liveEvent.category === "twist" && hasMultiplayerSystems) {
            state.entities.push({
              id: `event_ally_${state.activeEventIndex}`,
              type: "ally",
              x: state.player.x + 26,
              y: state.player.y - 18,
              vx: 0,
              vy: 0,
              hp: 80,
              maxHp: 80,
              size: 7,
              color: "#38bdf8",
              active: true,
              cooldown: 0.25,
            })
          }
        }

        const player = state.player
        const acceleration = (hasPhysics ? 0.34 : 0.26) * playbook.tuning.mobility * activeWeights.objectiveTempo
        const friction = Math.min(0.94, (hasPhysics ? 0.9 : 0.86) + (playbook.tuning.traction - 1) * 0.05)
        const maxSpeed = (hasPhysics ? 5.6 : 4.2) * playbook.tuning.mobility * activeWeights.objectiveTempo

        let moveX = 0
        let moveY = 0
        if (state.keys.w || state.keys.arrowup) moveY -= 1
        if (state.keys.s || state.keys.arrowdown) moveY += 1
        if (state.keys.a || state.keys.arrowleft) moveX -= 1
        if (state.keys.d || state.keys.arrowright) moveX += 1

        if ((moveX !== 0 || moveY !== 0) && state.keys.shift && player.dashCooldown <= 0) {
          const dashAngle = Math.atan2(moveY, moveX)
          player.vx += Math.cos(dashAngle) * (hasPhysics ? 6.5 : 5.2) * playbook.tuning.mobility
          player.vy += Math.sin(dashAngle) * (hasPhysics ? 6.5 : 5.2) * playbook.tuning.mobility
          player.dashCooldown = hasPhysics ? 0.65 : 1
          spawnBurst(player.x, player.y, "#38bdf8", 10)
        }

        player.dashCooldown = Math.max(0, player.dashCooldown - 1 / 60)
        player.shootCooldown = Math.max(0, player.shootCooldown - 1 / 60)

        player.vx += moveX * acceleration
        player.vy += moveY * acceleration
        player.vx *= friction
        player.vy *= friction

        const speed = Math.hypot(player.vx, player.vy)
        if (speed > maxSpeed) {
          player.vx = (player.vx / speed) * maxSpeed
          player.vy = (player.vy / speed) * maxSpeed
        }

        player.x = Math.max(12, Math.min(CANVAS_WIDTH - 12, player.x + player.vx))
        player.y = Math.max(12, Math.min(CANVAS_HEIGHT - 12, player.y + player.vy))

        if (state.keys[" "] && hasCombat && player.shootCooldown <= 0) {
          player.shootCooldown = (hasPhysics ? 0.1 : 0.14) / playbook.tuning.traction
          fireProjectile("player", player.x, player.y, player.facing, {
            speed: (hasPhysics ? 10 : 8.5) * playbook.tuning.mobility,
            damage: (hasAI ? 24 : 20) * playbook.tuning.mobility,
          })
          spawnBurst(player.x, player.y, "#8b5cf6", 6)
        }

        for (let index = state.entities.length - 1; index >= 0; index -= 1) {
          const entity = state.entities[index]
          if (!entity.active) continue

          if (entity.type === "enemy" || entity.type === "boss") {
            const dx = player.x - entity.x
            const dy = player.y - entity.y
            const entityDistance = Math.hypot(dx, dy)
            const chasePower = entity.type === "boss" ? 0.18 : hasAI ? 0.14 : 0.08

            if (entityDistance > 1) {
              entity.vx += (dx / entityDistance) * chasePower
              entity.vy += (dy / entityDistance) * chasePower
            }

            entity.vx *= hasPhysics ? 0.94 : 0.9
            entity.vy *= hasPhysics ? 0.94 : 0.9
            entity.x = Math.max(18, Math.min(CANVAS_WIDTH - 18, entity.x + entity.vx))
            entity.y = Math.max(18, Math.min(CANVAS_HEIGHT - 18, entity.y + entity.vy))

            entity.cooldown = Math.max(0, entity.cooldown - 1 / 60)
            if (entityDistance < entity.size + 14) {
              player.hp = Math.max(0, player.hp - (entity.type === "boss" ? 0.55 : 0.26) * playbook.tuning.pressure)
            }

            if (entity.type === "boss" && entity.cooldown <= 0) {
              fireProjectile("enemy", entity.x, entity.y, Math.atan2(dy, dx), {
                speed: 4.8,
                damage: 10,
                color: "#fb7185",
                ttl: 88,
              })
              entity.cooldown = 1
            }
          }

          if (entity.type === "ally") {
            const orbitAngle = state.time * 0.8 + index
            const followTargetX = player.x + Math.cos(orbitAngle) * 34
            const followTargetY = player.y + Math.sin(orbitAngle) * 28
            entity.vx += (followTargetX - entity.x) * 0.08
            entity.vy += (followTargetY - entity.y) * 0.08
            entity.vx *= 0.82
            entity.vy *= 0.82
            entity.x += entity.vx
            entity.y += entity.vy
            entity.cooldown = Math.max(0, entity.cooldown - 1 / 60)

            if (hasCombat && entity.cooldown <= 0) {
              const target = state.entities.find(
                (candidate) =>
                  candidate.active && (candidate.type === "enemy" || candidate.type === "boss"),
              )
              if (target) {
                fireProjectile(
                  "ally",
                  entity.x,
                  entity.y,
                  Math.atan2(target.y - entity.y, target.x - entity.x),
                  {
                    speed: 7.4,
                    damage: 14,
                    color: "#38bdf8",
                  },
                )
                entity.cooldown = 0.45
              }
            }
          }

          if (entity.type === "shard" && distance(player, entity) < entity.size + 10) {
            entity.active = false
            state.shardsCollected += 1
            state.inventory += 1
            state.score += 15
            state.activeDirectiveIndex = Math.min(state.activeDirectiveIndex + 1, Math.max(0, director.objectiveChain.length - 1))
            const activeDirective = director.objectiveChain[state.activeDirectiveIndex] ?? director.objectiveChain[0]
            state.objective = state.shardsCollected >= state.totalShards
              ? `${activeDirective.successSignal} Clear the threat and enter the ${versatility.encounterLabels.destination.toLowerCase()}.`
              : `${activeDirective.label}: ${versatility.encounterLabels.collectible} secured. Sweep the remaining rooms.`
            spawnBurst(entity.x, entity.y, "#f59e0b", 14)
          }

          if (entity.type === "medkit" && distance(player, entity) < entity.size + 10) {
            entity.active = false
            player.medkits += 1
            state.score += 6
            state.objective = `${versatility.resourceLabels.recovery} acquired. Use E or the button to recover.`
            spawnBurst(entity.x, entity.y, "#22c55e", 12)
          }
        }

        for (let index = state.projectiles.length - 1; index >= 0; index -= 1) {
          const projectile = state.projectiles[index]
          projectile.x += projectile.vx
          projectile.y += projectile.vy
          projectile.ttl -= 1

          if (
            projectile.ttl <= 0 ||
            projectile.x < 0 ||
            projectile.x > CANVAS_WIDTH ||
            projectile.y < 0 ||
            projectile.y > CANVAS_HEIGHT
          ) {
            state.projectiles.splice(index, 1)
            continue
          }

          if (projectile.owner === "enemy") {
            if (distance(projectile, player) < 12) {
              player.hp = Math.max(0, player.hp - projectile.damage * playbook.tuning.pressure)
              spawnBurst(projectile.x, projectile.y, "#fb7185", 10)
              state.projectiles.splice(index, 1)
            }
            continue
          }

          const target = state.entities.find(
            (entity) =>
              entity.active &&
              (entity.type === "enemy" || entity.type === "boss") &&
              distance(projectile, entity) < entity.size + 5,
          )

          if (!target) continue

          target.hp = Math.max(0, target.hp - projectile.damage)
          spawnBurst(projectile.x, projectile.y, target.color, target.type === "boss" ? 12 : 8)
          state.projectiles.splice(index, 1)

          if (target.hp <= 0) {
            target.active = false
            state.score += target.type === "boss" ? 120 : 22
            state.objective =
              target.type === "boss"
                ? `${director.eventDeck[state.activeEventIndex]?.rewardHint ?? "Boss neutralized. Finish the extraction."}`
                : "Target down. Keep the pressure on."
          }
        }

        state.particles = state.particles.filter((particle) => {
          particle.x += particle.vx
          particle.y += particle.vy
          particle.vx *= 0.92
          particle.vy *= 0.92
          particle.life -= 1
          return particle.life > 0
        })

        const enemiesLeft = state.entities.filter(
          (entity) => entity.active && (entity.type === "enemy" || entity.type === "boss"),
        ).length

        const portal = state.entities.find((entity) => entity.type === "portal" && entity.active)
        if (portal) {
          portal.locked =
            state.shardsCollected < state.totalShards ||
            enemiesLeft > Math.ceil(state.initialEnemyCount / 3)

          if (!portal.locked && distance(player, portal) < portal.size + 12) {
            state.won = true
            state.objective = "Extraction complete. Restart to run the generated game again."
          }
        }

        if (player.hp <= 0) {
          state.objective = "Run failed. Restart the runtime to redeploy."
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
    clearControls,
    consumeMedkit,
    fireProjectile,
    hasAI,
    hasAudio,
    hasCombat,
    hasInventory,
    hasMultiplayerSystems,
    hasPhysics,
    hasRendering,
    hasUI,
    hasWorldGen,
    playbook.tuning.interactionFrequency,
    playbook.tuning.mobility,
    playbook.tuning.pressure,
    playbook.tuning.recoveryWindow,
    playbook.tuning.rewardRate,
    playbook.tuning.traction,
    project,
    restartRun,
    runToken,
    spawnBurst,
    syncHud,
    togglePause,
  ])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-violet-500/30 text-violet-300">
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
          {project.design.mapArchetype || "Room Graph"}
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
            Restart Run
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!hasInventory || hud.medkits <= 0 || hud.hp >= hud.maxHp}
            onClick={consumeMedkit}
          >
            <Heart className="mr-2 h-4 w-4" />
            Use Medkit
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
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-lg border border-border/50 bg-card/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Health</p>
          <p className="mt-1 font-mono text-lg">{Math.round(hud.hp)}/{hud.maxHp}</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Score</p>
          <p className="mt-1 font-mono text-lg">{hud.score}</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{versatility.encounterLabels.collectible}</p>
          <p className="mt-1 font-mono text-lg">{hud.shardsCollected}/{hud.totalShards}</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{versatility.encounterLabels.hostile}</p>
          <p className="mt-1 font-mono text-lg">{hud.enemiesLeft}</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{versatility.resourceLabels.recovery}</p>
          <p className="mt-1 font-mono text-lg">{hud.medkits}</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-card/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Dash</p>
          <p className="mt-1 flex items-center gap-2 font-mono text-lg">
            <Zap className={`h-4 w-4 ${hud.dashReady ? "text-sky-400" : "text-muted-foreground"}`} />
            {hud.dashReady ? "Ready" : "Cooling"}
          </p>
        </div>
      </div>

      <div className={graphicsPresentation.objectiveClassName}>
        {hud.objective}
      </div>

      <div className={graphicsPresentation.infoClassName}>
        {project.design.runtimePlan.reason} {versatility.runtimeSubtitle} {scaffolding.objectivePrompts[1] ?? ""} {project.design.nonOverlapStrategy || "Seeded room separation"}. {project.design.traversalModel || "Sweep and extract"} {playbook.directives[0] ?? ""}
      </div>

      <RuntimeVersatilityPanel plan={versatility} boardClassName={graphicsPresentation.boardClassName} />
      <RuntimeEncounterPanel
        director={director}
        boardClassName={graphicsPresentation.boardClassName}
        activeDirectiveIndex={hud.activeDirectiveIndex}
        activeEventIndex={hud.activeEventIndex}
      />
      <RuntimePlaybookPanel plan={playbook} boardClassName={graphicsPresentation.boardClassName} activeIndex={hud.shardsCollected} />

      <div className={graphicsPresentation.boardClassName}>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">Event Feed</p>
          <Badge variant="outline">{hud.currentEvent}</Badge>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          The runtime now injects timed pressure, recovery, opportunity, and twist cards so the room sweep can change shape mid-run without leaving the current routing system.
        </p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Movement Pad</p>
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
            <ControlButton label="Fire" onPress={() => setControlKey(" ", true)} onRelease={() => setControlKey(" ", false)} disabled={!hasCombat} />
            <ControlButton label="Dash" onPress={() => setControlKey("shift", true)} onRelease={() => setControlKey("shift", false)} />
            <ControlButton label={versatility.actionLabels.recovery} onPress={() => { setControlKey("e", true); consumeMedkit() }} onRelease={() => setControlKey("e", false)} disabled={!hasInventory} />
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Use <span className="font-mono">WASD</span> or the touch pad to move,{" "}
        <span className="font-mono">Space</span> or click/tap the arena to fire,{" "}
        <span className="font-mono">Shift</span> to dash,{" "}
        <span className="font-mono">E</span> to {versatility.actionLabels.recovery.toLowerCase()},{" "}
        <span className="font-mono">P</span> to pause, and{" "}
        <span className="font-mono">R</span> to restart after failure or extraction.
      </p>
    </div>
  )
}

export function PlayableRuntime({ project }: { project: UserProject }) {
  switch (resolveRuntimeArchetype(project)) {
    case "action_operation_3d":
    case "survival_expedition_3d":
      return <ActionRuntime3D project={project} />
    case "journey_route":
      return <JourneyRuntime project={project} />
    case "homestead_life":
      return <HomesteadRuntime project={project} />
    case "strategy_command":
      return <StrategyRuntime project={project} />
    case "survival_horde":
      return <SurvivalRuntime project={project} />
    default:
      return <ObjectiveRuntime project={project} />
  }
}
