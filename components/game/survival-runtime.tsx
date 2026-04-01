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
import { Drumstick, Hammer, MoonStar, Pause, Play, RotateCcw, Shield, Target } from "lucide-react"
import type { UserProject } from "@/lib/engine/types"

const W = 800
const H = 520
const BASE = { x: W / 2, y: H / 2 }
const KEYS = new Set(["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " ", "shift", "e", "r", "p"])

type NodeType = "food" | "scrap" | "ammo"

interface NodeState { id: string; type: NodeType; x: number; y: number; active: boolean }
interface ZombieState { id: string; x: number; y: number; vx: number; vy: number; hp: number; active: boolean }
interface BulletState { x: number; y: number; vx: number; vy: number; ttl: number }
interface PlayerState {
  x: number
  y: number
  vx: number
  vy: number
  hp: number
  hunger: number
  stamina: number
  ammo: number
  food: number
  scrap: number
  facing: number
  shootCooldown: number
}
interface SimState {
  player: PlayerState
  nodes: NodeState[]
  zombies: ZombieState[]
  bullets: BulletState[]
  keys: Record<string, boolean>
  running: boolean
  paused: boolean
  won: boolean
  day: number
  cycle: number
  night: boolean
  nights: number
  targetNights: number
  activeDirectiveIndex: number
  activeEventIndex: number
  waveSpawned: boolean
  baseIntegrity: number
  objective: string
  eventStatus: string
  actionLocks: { pause: boolean; repair: boolean; ration: boolean }
}
interface HudState {
  hp: number
  hunger: number
  stamina: number
  ammo: number
  food: number
  scrap: number
  baseIntegrity: number
  day: number
  nights: number
  targetNights: number
  night: boolean
  zombies: number
  objective: string
  eventStatus: string
  activeDirectiveIndex: number
  activeEventIndex: number
  paused: boolean
  won: boolean
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function rand(seed: { value: number }) {
  seed.value = (seed.value * 1664525 + 1013904223) % 0x100000000
  return seed.value / 0x100000000
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function createState(
  targetNights: number,
  director: ReturnType<typeof getProjectRuntimeEncounterDirector>,
): SimState {
  return {
    player: { x: BASE.x, y: BASE.y + 72, vx: 0, vy: 0, hp: 100, hunger: 100, stamina: 100, ammo: 18, food: 3, scrap: 2, facing: -Math.PI / 2, shootCooldown: 0 },
    nodes: [],
    zombies: [],
    bullets: [],
    keys: {},
    running: true,
    paused: false,
    won: false,
    day: 1,
    cycle: 0.08,
    night: false,
    nights: 0,
    targetNights,
    activeDirectiveIndex: 0,
    activeEventIndex: 0,
    waveSpawned: false,
    baseIntegrity: 100,
    objective: director.objectiveChain[0]?.objective ?? "Scavenge by day, repair the shelter, and survive the night horde.",
    eventStatus: director.eventDeck[0]?.summary ?? "Keep the shelter loop readable while the pressure rises.",
    actionLocks: { pause: false, repair: false, ration: false },
  }
}

function spawnNodes(
  state: SimState,
  seed: { value: number },
  count: number,
  rewardScale = 1,
) {
  state.nodes = []
  const types: NodeType[] = ["food", "scrap", "ammo"]
  const totalCount = Math.max(3, Math.round(count * rewardScale))
  for (let i = 0; i < totalCount; i += 1) {
    let x = 0
    let y = 0
    do {
      x = 48 + rand(seed) * (W - 96)
      y = 48 + rand(seed) * (H - 96)
    } while (dist({ x, y }, BASE) < 90)
    state.nodes.push({ id: `node_${state.day}_${i}`, type: types[i % 3], x, y, active: true })
  }
}

function spawnWave(state: SimState, seed: { value: number }, size: number, pressureScale = 1) {
  const totalSize = Math.max(3, Math.round(size * pressureScale))
  for (let i = 0; i < totalSize; i += 1) {
    const edge = Math.floor(rand(seed) * 4)
    const x = edge === 0 ? 18 : edge === 1 ? W - 18 : 40 + rand(seed) * (W - 80)
    const y = edge === 2 ? 18 : edge === 3 ? H - 18 : 40 + rand(seed) * (H - 80)
    state.zombies.push({ id: `z_${state.day}_${i}_${state.zombies.length}`, x, y, vx: 0, vy: 0, hp: 22 + Math.floor(rand(seed) * 14), active: true })
  }
}

function ControlButton({ label, onPress, onRelease, disabled = false }: { label: string; onPress: () => void; onRelease: () => void; disabled?: boolean }) {
  return (
    <Button type="button" variant="outline" size="sm" disabled={disabled} className="h-10 min-w-10 border-border/60 bg-card/60" onPointerDown={onPress} onPointerUp={onRelease} onPointerLeave={onRelease} onPointerCancel={onRelease} onContextMenu={(e) => e.preventDefault()}>
      {label}
    </Button>
  )
}

export function SurvivalRuntime({ project }: { project: UserProject }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<SimState>(createState(3, getProjectRuntimeEncounterDirector(project)))
  const seedRef = useRef({ value: 1 })
  const [runToken, setRunToken] = useState(0)
  const [hud, setHud] = useState<HudState>({ hp: 100, hunger: 100, stamina: 100, ammo: 18, food: 3, scrap: 2, baseIntegrity: 100, day: 1, nights: 0, targetNights: 3, night: false, zombies: 0, objective: "Initializing survival runtime...", eventStatus: "Preparing scenario chain...", activeDirectiveIndex: 0, activeEventIndex: 0, paused: false, won: false })

  const renderInThreeD = project.dimension === "3d"
  const graphicsPresentation = getRuntimeGraphicsPresentation(project)
  const versatility = useMemo(() => getProjectRuntimeVersatilityPlan(project), [project])
  const scaffolding = useMemo(() => buildRuntimeScaffoldingPlan(project), [project])
  const playbook = useMemo(() => getProjectRuntimePlaybookPlan(project), [project])
  const director = useMemo(() => getProjectRuntimeEncounterDirector(project), [project])
  const targetNights = (project.design.scopeScale === "limitless" ? 4 : project.design.scopeScale === "expanded" ? 3 : 2) + Math.max(0, Math.round(scaffolding.tuning.pressureRate - 1))
  const nodeCount = (project.design.scopeScale === "limitless" ? 11 : project.design.scopeScale === "expanded" ? 9 : 7) + Math.max(0, scaffolding.tuning.resourceBonus)

  const syncHud = useCallback(() => {
    const s = stateRef.current
    setHud({
      hp: Math.round(s.player.hp),
      hunger: Math.round(s.player.hunger),
      stamina: Math.round(s.player.stamina),
      ammo: s.player.ammo,
      food: s.player.food,
      scrap: s.player.scrap,
      baseIntegrity: Math.round(s.baseIntegrity),
      day: s.day,
      nights: s.nights,
      targetNights: s.targetNights,
      night: s.night,
      zombies: s.zombies.filter((z) => z.active).length,
      objective: s.objective,
      eventStatus: s.eventStatus,
      activeDirectiveIndex: s.activeDirectiveIndex,
      activeEventIndex: s.activeEventIndex,
      paused: s.paused,
      won: s.won,
    })
  }, [])

  const restartRun = useCallback(() => setRunToken((value) => value + 1), [])
  const setControlKey = useCallback((key: string, pressed: boolean) => { stateRef.current.keys[key] = pressed }, [])
  const clearControls = useCallback(() => {
    stateRef.current.keys = {}
    stateRef.current.actionLocks.pause = false
    stateRef.current.actionLocks.ration = false
    stateRef.current.actionLocks.repair = false
  }, [])

  const fireShot = useCallback((clientX?: number, clientY?: number) => {
    const canvas = canvasRef.current
    const s = stateRef.current
    if (!canvas || s.paused || s.won || s.player.ammo <= 0 || s.player.shootCooldown > 0) return
    let angle = s.player.facing
    if (typeof clientX === "number" && typeof clientY === "number") {
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      const x = (clientX - rect.left) * scaleX
      const y = (clientY - rect.top) * scaleY
      angle = Math.atan2(y - s.player.y, x - s.player.x)
      s.player.facing = angle
    }
    s.player.ammo -= 1
    s.player.shootCooldown = (renderInThreeD ? 0.12 : 0.16) / playbook.tuning.traction
    s.bullets.push({ x: s.player.x, y: s.player.y, vx: Math.cos(angle) * 11, vy: Math.sin(angle) * 11, ttl: 28 })
  }, [playbook.tuning.traction, renderInThreeD])

  const repairShelter = useCallback(() => {
    const s = stateRef.current
    const activeEvent = director.eventDeck[s.activeEventIndex % Math.max(director.eventDeck.length, 1)] ?? director.eventDeck[0]
    if (s.player.scrap <= 0 || s.baseIntegrity >= 100 || dist(s.player, BASE) > 80) return
    s.player.scrap -= 1
    s.baseIntegrity = clamp(s.baseIntegrity + 18 * playbook.tuning.recoveryWindow * activeEvent.modifiers.recovery, 0, 100)
    s.objective = `${versatility.encounterLabels.support} stabilized. ${activeEvent.objectiveShift}`
    syncHud()
  }, [director.eventDeck, playbook.tuning.recoveryWindow, syncHud, versatility.encounterLabels.support])

  const eatRation = useCallback(() => {
    const s = stateRef.current
    const activeEvent = director.eventDeck[s.activeEventIndex % Math.max(director.eventDeck.length, 1)] ?? director.eventDeck[0]
    if (s.player.food <= 0) return
    s.player.food -= 1
    s.player.hunger = clamp(s.player.hunger + 28 * playbook.tuning.recoveryWindow * activeEvent.modifiers.recovery, 0, 100)
    s.player.hp = clamp(s.player.hp + 12 * playbook.tuning.recoveryWindow * activeEvent.modifiers.recovery, 0, 100)
    s.objective = `${versatility.actionLabels.recovery} complete. ${activeEvent.objectiveShift}`
    syncHud()
  }, [director.eventDeck, playbook.tuning.recoveryWindow, syncHud, versatility.actionLabels.recovery])

  const togglePause = useCallback(() => {
    const s = stateRef.current
    s.paused = !s.paused
    s.objective = s.paused ? `${versatility.flavorLabel} paused. Check ammo, food, and ${versatility.pressureTracks[0].toLowerCase()}.` : s.objective
    syncHud()
  }, [syncHud, versatility.flavorLabel, versatility.pressureTracks])

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const s = stateRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (event.clientX - rect.left) * scaleX
    const y = (event.clientY - rect.top) * scaleY
    s.player.facing = Math.atan2(y - s.player.y, x - s.player.x)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const s = createState(targetNights, director)
    s.objective = `${director.objectiveChain[0]?.objective ?? "Sweep the zone, gather food and scrap, then hold the shelter through the night."} ${director.eventDeck[0]?.objectiveShift ?? ""}`.trim()
    stateRef.current = s
    seedRef.current.value = project.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) || 1
    const openingWeights = getRuntimeEncounterTickWeights(director, 0, 0, 0.08)
    spawnNodes(
      s,
      seedRef.current,
      Math.max(3, Math.round(nodeCount * Math.max(0.82, openingWeights.interaction))),
      openingWeights.reward,
    )
    syncHud()

    const keyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (KEYS.has(key)) event.preventDefault()
      if (!KEYS.has(key)) return
      s.keys[key] = true
      if (key === "p" && !s.actionLocks.pause) { s.actionLocks.pause = true; togglePause() }
      if (key === "e" && !s.actionLocks.repair) { s.actionLocks.repair = true; repairShelter() }
      if (key === "r" && !s.actionLocks.ration) { s.actionLocks.ration = true; eatRation() }
      if (key === " " && !s.paused && !s.won) fireShot()
    }
    const keyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      s.keys[key] = false
      if (key === "p") s.actionLocks.pause = false
      if (key === "e") s.actionLocks.repair = false
      if (key === "r") s.actionLocks.ration = false
    }

    window.addEventListener("keydown", keyDown)
    window.addEventListener("keyup", keyUp)
    window.addEventListener("blur", clearControls)

    let frame = 0
    let raf = 0

    const render = () => {
      const activeZombies = s.zombies.filter((z) => z.active).length
      ctx.clearRect(0, 0, W, H)
      if (renderInThreeD) {
        const sky = ctx.createLinearGradient(0, 0, 0, H)
        sky.addColorStop(0, s.night ? "#07111d" : "#5fa5ff")
        sky.addColorStop(0.56, s.night ? "#142230" : "#d9efc5")
        sky.addColorStop(1, s.night ? "#13201a" : "#3a5630")
        ctx.fillStyle = sky
        ctx.fillRect(0, 0, W, H)
      } else {
        ctx.fillStyle = s.night ? "#08110c" : "#173120"
        ctx.fillRect(0, 0, W, H)
      }
      ctx.fillStyle = s.night ? "#203324" : "#46643d"
      ctx.beginPath()
      ctx.ellipse(BASE.x, BASE.y + 32, 112, 84, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = "#94a3b8"
      ctx.fillRect(BASE.x - 44, BASE.y - 42, 88, 62)
      ctx.fillStyle = s.baseIntegrity > 50 ? "#22c55e" : s.baseIntegrity > 25 ? "#f59e0b" : "#ef4444"
      ctx.fillRect(BASE.x - 48, BASE.y + 36, (s.baseIntegrity / 100) * 96, 8)

      for (const node of s.nodes) {
        if (!node.active) continue
        ctx.fillStyle = node.type === "food" ? "#86efac" : node.type === "scrap" ? "#f59e0b" : "#60a5fa"
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.type === "scrap" ? 10 : 9, 0, Math.PI * 2)
        ctx.fill()
      }
      for (const zombie of s.zombies) {
        if (!zombie.active) continue
        ctx.fillStyle = "#84cc16"
        ctx.fillRect(zombie.x - 7, zombie.y - 3, 14, 20)
        ctx.fillStyle = "#d9f99d"
        ctx.beginPath()
        ctx.arc(zombie.x, zombie.y - 10, 8, 0, Math.PI * 2)
        ctx.fill()
      }
      for (const bullet of s.bullets) {
        ctx.fillStyle = "#f8fafc"
        ctx.beginPath()
        ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = "#8b5cf6"
      ctx.fillRect(s.player.x - 8, s.player.y - 3, 16, 24)
      ctx.fillStyle = "#f5d0fe"
      ctx.beginPath()
      ctx.arc(s.player.x, s.player.y - 12, 10, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = "#e9d5ff"
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(s.player.x, s.player.y - 2)
      ctx.lineTo(s.player.x + Math.cos(s.player.facing) * 20, s.player.y - 2 + Math.sin(s.player.facing) * 20)
      ctx.stroke()

      ctx.fillStyle = "rgba(15,23,42,0.78)"
      ctx.fillRect(16, 16, 220, 90)
      ctx.fillStyle = "#f8fafc"
      ctx.font = "12px var(--font-mono, monospace)"
      ctx.fillText(`Day ${s.day} ${s.night ? "Night" : "Daylight"}`, 28, 36)
      ctx.fillText(`Base ${Math.round(s.baseIntegrity)} Ammo ${s.player.ammo}`, 28, 56)
      ctx.fillText(`Food ${s.player.food} Scrap ${s.player.scrap}`, 28, 76)
      ctx.fillText(`Zombies ${activeZombies}`, 28, 96)

      if (s.paused || s.won || s.player.hp <= 0 || s.baseIntegrity <= 0) {
        ctx.fillStyle = "rgba(2,6,23,0.62)"
        ctx.fillRect(0, 0, W, H)
        ctx.textAlign = "center"
        ctx.fillStyle = s.won ? "#86efac" : "#fca5a5"
        ctx.font = "28px var(--font-mono, monospace)"
        ctx.fillText(s.won ? "SURVIVAL LOCKED" : "RUN LOST", W / 2, H / 2 - 18)
        ctx.font = "14px var(--font-mono, monospace)"
        ctx.fillText(s.won ? "Restart to run another survival slice." : "Restart and rebalance scavenging, repairs, and rations.", W / 2, H / 2 + 16)
        ctx.textAlign = "start"
      }
    }

    const loop = () => {
      if (!s.running) return
      frame += 1
      if (!s.paused && !s.won && s.player.hp > 0 && s.baseIntegrity > 0) {
        const activeDirective = director.objectiveChain[s.activeDirectiveIndex % Math.max(director.objectiveChain.length, 1)] ?? director.objectiveChain[0]
        const activeEvent = director.eventDeck[s.activeEventIndex % Math.max(director.eventDeck.length, 1)] ?? director.eventDeck[0]
        const activeWeights = getRuntimeEncounterTickWeights(
          director,
          s.activeDirectiveIndex,
          s.activeEventIndex,
          s.cycle,
        )

        s.cycle += (1 / 60 / (project.design.scopeScale === "limitless" ? 28 : project.design.scopeScale === "expanded" ? 24 : 21)) * scaffolding.tuning.pressureRate * playbook.tuning.pressure * activeWeights.pressure
        s.player.shootCooldown = Math.max(0, s.player.shootCooldown - 1 / 60)
        s.player.hunger = clamp(s.player.hunger - 0.032 * playbook.tuning.pressure * activeWeights.pressure, 0, 100)
        s.player.stamina = clamp(s.player.stamina + (s.keys.shift ? -0.55 : 0.32), 0, 100)
        if (s.player.hunger <= 18) s.player.hp = clamp(s.player.hp - 0.08 * playbook.tuning.pressure * activeWeights.pressure, 0, 100)

        let mx = 0
        let my = 0
        if (s.keys.w || s.keys.arrowup) my -= 1
        if (s.keys.s || s.keys.arrowdown) my += 1
        if (s.keys.a || s.keys.arrowleft) mx -= 1
        if (s.keys.d || s.keys.arrowright) mx += 1
        const sprint = Boolean(s.keys.shift) && s.player.stamina > 6
        s.player.vx = (s.player.vx + mx * (sprint ? 0.42 : 0.26) * playbook.tuning.mobility) * Math.min(0.94, 0.86 + (playbook.tuning.traction - 1) * 0.06)
        s.player.vy = (s.player.vy + my * (sprint ? 0.42 : 0.26) * playbook.tuning.mobility) * Math.min(0.94, 0.86 + (playbook.tuning.traction - 1) * 0.06)
        const speed = Math.hypot(s.player.vx, s.player.vy)
        const maxSpeed = (sprint ? 5.6 : 4.1) * playbook.tuning.mobility
        if (speed > maxSpeed) {
          s.player.vx = (s.player.vx / speed) * maxSpeed
          s.player.vy = (s.player.vy / speed) * maxSpeed
        }
        s.player.x = clamp(s.player.x + s.player.vx, 18, W - 18)
        s.player.y = clamp(s.player.y + s.player.vy, 18, H - 18)
        if (s.keys[" "] && s.player.shootCooldown <= 0) fireShot()

        if (!s.night && s.cycle >= 0.62) {
          s.night = true
          s.waveSpawned = false
          s.activeEventIndex += 1
          const nightEvent = director.eventDeck[s.activeEventIndex % Math.max(director.eventDeck.length, 1)] ?? activeEvent
          s.eventStatus = nightEvent.summary
          s.objective = `${scaffolding.phaseLabels[1] ?? "Nightfall"}: ${nightEvent.objectiveShift}`
        }
        if (s.night && !s.waveSpawned) {
          const nightEvent = director.eventDeck[s.activeEventIndex % Math.max(director.eventDeck.length, 1)] ?? activeEvent
          s.waveSpawned = true
          spawnWave(
            s,
            seedRef.current,
            Math.max(
              4,
              Math.round(
                (5 + s.day + Math.round(scaffolding.tuning.combatDensity * 2) + Math.max(0, Math.round((playbook.tuning.pressure - 1) * 3)) + (project.design.scopeScale === "limitless" ? 4 : project.design.scopeScale === "expanded" ? 2 : 0))
                * Math.max(0.82, activeWeights.hostileSpawn),
              ),
            ),
            activeWeights.pressure,
          )
        }
        if (s.cycle >= 1) {
          s.cycle = 0
          if (s.night) {
            s.nights += 1
            if (s.nights >= s.targetNights) {
              s.won = true
              s.objective = `${scaffolding.phaseLabels[2] ?? "The shelter held"}: ${director.objectiveChain[Math.min(director.objectiveChain.length - 1, 2)]?.successSignal ?? "Restart to run the survival loop again."}`
            } else {
              s.day += 1
              s.night = false
              s.waveSpawned = false
              s.activeDirectiveIndex = Math.min(s.day - 1, Math.max(0, director.objectiveChain.length - 1))
              s.activeEventIndex += 1
              const dawnDirective = director.objectiveChain[s.activeDirectiveIndex % Math.max(director.objectiveChain.length, 1)] ?? activeDirective
              const dawnEvent = director.eventDeck[s.activeEventIndex % Math.max(director.eventDeck.length, 1)] ?? activeEvent
              const dawnWeights = getRuntimeEncounterTickWeights(director, s.activeDirectiveIndex, s.activeEventIndex, 0.14)
              spawnNodes(
                s,
                seedRef.current,
                Math.max(3, Math.round(nodeCount * Math.max(0.84, dawnWeights.interaction))),
                dawnWeights.reward,
              )
              s.player.ammo += Math.round((5 + scaffolding.tuning.resourceBonus + Math.max(0, Math.round((playbook.tuning.rewardRate - 1) * 3))) * dawnWeights.reward)
              s.eventStatus = dawnEvent.summary
              s.objective = `${dawnDirective.objective} ${dawnEvent.objectiveShift}`
            }
          }
        }

        for (const node of s.nodes) {
          if (!node.active || dist(node, s.player) >= 18) continue
          node.active = false
          if (node.type === "food") s.player.food += Math.max(1, Math.round((1 + Math.max(0, scaffolding.tuning.resourceBonus - 1)) * playbook.tuning.rewardRate * activeWeights.reward))
          if (node.type === "scrap") s.player.scrap += Math.max(1, Math.round((2 + Math.max(0, scaffolding.tuning.resourceBonus - 1)) * playbook.tuning.rewardRate * activeWeights.reward))
          if (node.type === "ammo") s.player.ammo += Math.max(1, Math.round((4 + Math.max(0, scaffolding.tuning.resourceBonus - 1)) * playbook.tuning.rewardRate * activeWeights.reward))
          s.objective = `${activeDirective.label}: ${activeEvent.objectiveShift}`
        }
        for (const zombie of s.zombies) {
          if (!zombie.active) continue
          const playerTarget = dist(zombie, s.player) < 140 || dist(zombie, BASE) > 110
          const target = playerTarget ? s.player : BASE
          const dx = target.x - zombie.x
          const dy = target.y - zombie.y
          const mag = Math.max(0.001, Math.hypot(dx, dy))
          zombie.vx = (zombie.vx + (dx / mag) * 0.95) * 0.84
          zombie.vy = (zombie.vy + (dy / mag) * 0.95) * 0.84
          zombie.x = clamp(zombie.x + zombie.vx, 12, W - 12)
          zombie.y = clamp(zombie.y + zombie.vy, 12, H - 12)
          if (dist(zombie, s.player) < 22) s.player.hp = clamp(s.player.hp - 0.28 * playbook.tuning.pressure * activeWeights.pressure, 0, 100)
          else if (dist(zombie, BASE) < 44) s.baseIntegrity = clamp(s.baseIntegrity - 0.18 * playbook.tuning.pressure * activeWeights.pressure, 0, 100)
        }
        for (let i = s.bullets.length - 1; i >= 0; i -= 1) {
          const bullet = s.bullets[i]
          bullet.x += bullet.vx
          bullet.y += bullet.vy
          bullet.ttl -= 1
          if (bullet.ttl <= 0 || bullet.x < 0 || bullet.x > W || bullet.y < 0 || bullet.y > H) { s.bullets.splice(i, 1); continue }
          const hit = s.zombies.find((z) => z.active && dist(bullet, z) < 16)
          if (!hit) continue
          hit.hp -= 18 * playbook.tuning.mobility
          s.bullets.splice(i, 1)
          if (hit.hp <= 0) hit.active = false
        }
        s.zombies = s.zombies.filter((z) => z.active)
        if (s.player.hp <= 0) s.objective = "You were overrun. Restart and keep the loop centered on scavenging, repairs, and event timing."
        if (s.baseIntegrity <= 0) s.objective = "The shelter collapsed. Restart and spend scrap earlier when the event deck starts leaning toward pressure."
      }
      render()
      if (frame % 4 === 0) syncHud()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      s.running = false
      cancelAnimationFrame(raf)
      window.removeEventListener("keydown", keyDown)
      window.removeEventListener("keyup", keyUp)
      window.removeEventListener("blur", clearControls)
    }
  }, [clearControls, director, eatRation, fireShot, nodeCount, playbook.tuning.mobility, playbook.tuning.pressure, playbook.tuning.recoveryWindow, playbook.tuning.rewardRate, project.design.scopeScale, project.id, repairShelter, renderInThreeD, runToken, scaffolding, syncHud, targetNights, togglePause])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-rose-500/30 text-rose-300">{project.design.runtimePlan.label}</Badge>
        <Badge variant="outline">{versatility.flavorLabel}</Badge>
        <Badge variant="outline">{scaffolding.scenarioTitle}</Badge>
        <Badge variant="outline">{playbook.physics.profileLabel}</Badge>
        <Badge variant="outline" className="uppercase">{project.dimension}</Badge>
        <Badge variant="outline" className="capitalize">{project.genre.replace(/_/g, " ")}</Badge>
        <Badge variant="outline">{project.design.runtimePlan.targetSessionMinutes} min slice</Badge>
        <Badge variant="outline" className="capitalize">{project.engine}</Badge>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={togglePause}>{hud.paused ? <Play className="mr-2 h-4 w-4" /> : <Pause className="mr-2 h-4 w-4" />}{hud.paused ? "Resume" : "Pause"}</Button>
          <Button type="button" size="sm" variant="outline" onClick={repairShelter} disabled={hud.scrap <= 0 || hud.baseIntegrity >= 100}><Hammer className="mr-2 h-4 w-4" />{versatility.actionLabels.secondary}</Button>
          <Button type="button" size="sm" variant="outline" onClick={restartRun}><RotateCcw className="mr-2 h-4 w-4" />Restart Run</Button>
        </div>
      </div>

      <div className={graphicsPresentation.canvasWrapperClassName}>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className={graphicsPresentation.canvasClassName}
          style={graphicsPresentation.canvasStyle}
          onPointerMove={handlePointerMove}
          onPointerDown={(event) => fireShot(event.clientX, event.clientY)}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-7">
        <div className="rounded-lg border border-border/50 bg-card/50 p-3"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Health</p><p className="mt-1 font-mono text-lg">{hud.hp}</p></div>
        <div className="rounded-lg border border-border/50 bg-card/50 p-3"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Hunger</p><p className="mt-1 flex items-center gap-2 font-mono text-lg"><Drumstick className="h-4 w-4 text-orange-400" />{hud.hunger}</p></div>
        <div className="rounded-lg border border-border/50 bg-card/50 p-3"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Stamina</p><p className="mt-1 font-mono text-lg">{hud.stamina}</p></div>
        <div className="rounded-lg border border-border/50 bg-card/50 p-3"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{versatility.resourceLabels.support}</p><p className="mt-1 flex items-center gap-2 font-mono text-lg"><Target className="h-4 w-4 text-violet-400" />{hud.ammo}</p></div>
        <div className="rounded-lg border border-border/50 bg-card/50 p-3"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{versatility.resourceLabels.primary}</p><p className="mt-1 font-mono text-lg">{hud.food}</p></div>
        <div className="rounded-lg border border-border/50 bg-card/50 p-3"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{versatility.resourceLabels.secondary}</p><p className="mt-1 flex items-center gap-2 font-mono text-lg"><Hammer className="h-4 w-4 text-yellow-400" />{hud.scrap}</p></div>
        <div className="rounded-lg border border-border/50 bg-card/50 p-3"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{versatility.pressureTracks[0]}</p><p className="mt-1 flex items-center gap-2 font-mono text-lg"><Shield className="h-4 w-4 text-emerald-400" />{hud.baseIntegrity}</p></div>
      </div>

      <div className={graphicsPresentation.objectiveClassName}>{hud.objective}</div>
      <div className={graphicsPresentation.infoClassName}>{hud.eventStatus}</div>
      <div className={graphicsPresentation.infoClassName}>{project.design.runtimePlan.reason} {versatility.runtimeSubtitle}</div>

      <RuntimeVersatilityPanel plan={versatility} boardClassName={graphicsPresentation.boardClassName} />
      <RuntimeEncounterPanel
        director={director}
        boardClassName={graphicsPresentation.boardClassName}
        activeDirectiveIndex={hud.activeDirectiveIndex}
        activeEventIndex={hud.activeEventIndex}
      />
      <RuntimePlaybookPanel plan={playbook} boardClassName={graphicsPresentation.boardClassName} activeIndex={hud.nights} />

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
            <ControlButton label="Fire" onPress={() => setControlKey(" ", true)} onRelease={() => setControlKey(" ", false)} disabled={hud.ammo <= 0} />
            <ControlButton label="Sprint" onPress={() => setControlKey("shift", true)} onRelease={() => setControlKey("shift", false)} />
            <ControlButton label={versatility.actionLabels.secondary} onPress={() => { setControlKey("e", true); repairShelter() }} onRelease={() => setControlKey("e", false)} disabled={hud.scrap <= 0} />
            <ControlButton label={versatility.actionLabels.recovery} onPress={() => { setControlKey("r", true); eatRation() }} onRelease={() => setControlKey("r", false)} disabled={hud.food <= 0} />
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">Use <span className="font-mono">WASD</span> to move, aim with the pointer, click or <span className="font-mono">Space</span> to fire, <span className="font-mono">Shift</span> to sprint, <span className="font-mono">E</span> to {versatility.actionLabels.secondary.toLowerCase()}, <span className="font-mono">R</span> to {versatility.actionLabels.recovery.toLowerCase()}, and <span className="font-mono">P</span> to pause.</p>
    </div>
  )
}
