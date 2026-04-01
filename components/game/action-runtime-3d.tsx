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
import { MoonStar, Pause, Play, RotateCcw, Shield, Target, Zap } from "lucide-react"
import type { UserProject } from "@/lib/engine/types"

type Lane = -1 | 0 | 1
type ContactKind = "hostile" | "interaction"
type InteractionReward = "intel" | "ammo" | "repair" | "supply"
type RuntimeMode = "survival" | "assault"

interface PhaseDefinition {
  id: string
  label: string
  objective: string
  directiveLabel: string
  eventLabel: string
  targetKills: number
  targetInteractions: number
  hostileLabel: string
  interactionLabel: string
  interactionReward: InteractionReward
  pressureScale: number
  rewardScale: number
  recoveryScale: number
  accentClassName: string
  skylineClassName: string
}

interface RuntimeContact {
  id: string
  kind: ContactKind
  label: string
  lane: Lane
  depth: number
  hp: number
  reward?: InteractionReward
}

interface RuntimeState {
  lane: Lane
  phaseIndex: number
  activeDirectiveIndex: number
  activeEventIndex: number
  phaseProgress: number
  kills: number
  interactions: number
  health: number
  armor: number
  ammo: number
  reserveAmmo: number
  supplies: number
  repairCharges: number
  contacts: RuntimeContact[]
  contactNonce: number
  elapsedSeconds: number
  paused: boolean
  won: boolean
  failed: boolean
  fireCooldown: number
  strafeCooldown: number
  interactCooldown: number
  reloadCooldown: number
  statusText: string
}

const CONTROL_KEYS = new Set(["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " ", "shift", "e", "r", "p"])

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function lanePosition(lane: Lane) {
  if (lane === -1) return 28
  if (lane === 1) return 72
  return 50
}

function createPhases(
  mode: RuntimeMode,
  scopeScale: UserProject["design"]["scopeScale"],
  versatility: ReturnType<typeof getProjectRuntimeVersatilityPlan>,
  scaffolding: ReturnType<typeof buildRuntimeScaffoldingPlan>,
  playbook: ReturnType<typeof getProjectRuntimePlaybookPlan>,
  director: ReturnType<typeof getProjectRuntimeEncounterDirector>,
): PhaseDefinition[] {
  const densityBonus = scopeScale === "limitless" ? 2 : scopeScale === "expanded" ? 1 : 0
  const hostileLabel = versatility.encounterLabels.hostile
  const eliteLabel = versatility.encounterLabels.elite
  const collectibleLabel = versatility.encounterLabels.collectible
  const supportLabel = versatility.encounterLabels.support
  const destinationLabel = versatility.encounterLabels.destination
  const hooks = versatility.objectiveHooks
  const phaseLabels = scaffolding.phaseLabels
  const combatDensity = Math.max(
    0,
    Math.round((scaffolding.tuning.combatDensity - 1) * 3 + (playbook.tuning.pressure - 1) * 2),
  )
  const interactionDensity = Math.max(
    0,
    Math.round((scaffolding.tuning.interactionDensity - 1) * 2 + (playbook.tuning.interactionFrequency - 1) * 2),
  )
  const getDirective = (index: number) =>
    director.objectiveChain[index % Math.max(director.objectiveChain.length, 1)] ?? director.objectiveChain[0]
  const getEvent = (index: number) =>
    director.eventDeck[index % Math.max(director.eventDeck.length, 1)] ?? director.eventDeck[0]

  if (mode === "survival") {
    const scavengeDirective = getDirective(0)
    const scavengeEvent = getEvent(0)
    const repairDirective = getDirective(1)
    const repairEvent = getEvent(1)
    const extractDirective = getDirective(2)
    const extractEvent = getEvent(2)

    return [
      {
        id: "district_scavenge",
        label: phaseLabels[0] ?? "Scavenge District",
        objective: `${scavengeDirective.objective} ${scavengeEvent.objectiveShift}`,
        directiveLabel: scavengeDirective.label,
        eventLabel: scavengeEvent.label,
        targetKills: 3 + densityBonus + combatDensity + Math.max(0, Math.round(scavengeDirective.modifiers.pressure - 1)),
        targetInteractions: 2 + interactionDensity + Math.max(0, Math.round(scavengeEvent.modifiers.interaction - 1)),
        hostileLabel,
        interactionLabel: collectibleLabel,
        interactionReward: "supply",
        pressureScale: scavengeEvent.modifiers.pressure,
        rewardScale: scavengeEvent.modifiers.reward,
        recoveryScale: scavengeEvent.modifiers.recovery,
        accentClassName: "border-amber-400/40 bg-amber-500/12 text-amber-100",
        skylineClassName: "from-amber-500/15 via-orange-500/10 to-transparent",
      },
      {
        id: "safehouse_repair",
        label: phaseLabels[1] ?? "Safehouse Repair",
        objective: `${repairDirective.objective} ${repairEvent.objectiveShift}`,
        directiveLabel: repairDirective.label,
        eventLabel: repairEvent.label,
        targetKills: 4 + densityBonus + combatDensity + Math.max(0, Math.round(repairEvent.modifiers.pressure - 1)),
        targetInteractions: 2 + interactionDensity + Math.max(0, Math.round(repairDirective.modifiers.interaction - 1)),
        hostileLabel: eliteLabel,
        interactionLabel: supportLabel,
        interactionReward: "repair",
        pressureScale: repairEvent.modifiers.pressure,
        rewardScale: repairEvent.modifiers.reward,
        recoveryScale: repairEvent.modifiers.recovery,
        accentClassName: "border-orange-400/40 bg-orange-500/12 text-orange-100",
        skylineClassName: "from-orange-500/15 via-amber-500/10 to-transparent",
      },
      {
        id: "night_extract",
        label: phaseLabels[2] ?? "Night Extraction",
        objective: `${extractDirective.objective} ${extractEvent.objectiveShift}`,
        directiveLabel: extractDirective.label,
        eventLabel: extractEvent.label,
        targetKills: 5 + densityBonus + combatDensity + Math.max(0, Math.round(extractEvent.modifiers.pressure * 2 - 2)),
        targetInteractions: 1,
        hostileLabel: eliteLabel,
        interactionLabel: destinationLabel,
        interactionReward: "intel",
        pressureScale: extractEvent.modifiers.pressure,
        rewardScale: extractEvent.modifiers.reward,
        recoveryScale: extractEvent.modifiers.recovery,
        accentClassName: "border-rose-400/40 bg-rose-500/12 text-rose-100",
        skylineClassName: "from-rose-500/15 via-red-500/10 to-transparent",
      },
    ]
  }

  const breachDirective = getDirective(0)
  const breachEvent = getEvent(0)
  const commandDirective = getDirective(1)
  const commandEvent = getEvent(1)
  const extractDirective = getDirective(2)
  const extractEvent = getEvent(2)

  return [
    {
      id: "breach_lane",
      label: phaseLabels[0] ?? "Breach Lane",
      objective: `${breachDirective.objective} ${breachEvent.objectiveShift}`,
      directiveLabel: breachDirective.label,
      eventLabel: breachEvent.label,
      targetKills: 4 + densityBonus + combatDensity + Math.max(0, Math.round(breachEvent.modifiers.pressure - 1)),
      targetInteractions: 1 + interactionDensity + Math.max(0, Math.round(breachDirective.modifiers.interaction - 1)),
      hostileLabel,
      interactionLabel: supportLabel,
      interactionReward: "ammo",
      pressureScale: breachEvent.modifiers.pressure,
      rewardScale: breachEvent.modifiers.reward,
      recoveryScale: breachEvent.modifiers.recovery,
      accentClassName: "border-sky-400/40 bg-sky-500/12 text-sky-100",
      skylineClassName: "from-sky-500/15 via-cyan-500/10 to-transparent",
    },
    {
      id: "command_room",
      label: phaseLabels[1] ?? "Command Room",
      objective: `${commandDirective.objective} ${commandEvent.objectiveShift}`,
      directiveLabel: commandDirective.label,
      eventLabel: commandEvent.label,
      targetKills: 5 + densityBonus + combatDensity + Math.max(0, Math.round(commandEvent.modifiers.pressure - 1)),
      targetInteractions: 1 + interactionDensity + Math.max(0, Math.round(commandEvent.modifiers.interaction - 1)),
      hostileLabel: eliteLabel,
      interactionLabel: collectibleLabel,
      interactionReward: "intel",
      pressureScale: commandEvent.modifiers.pressure,
      rewardScale: commandEvent.modifiers.reward,
      recoveryScale: commandEvent.modifiers.recovery,
      accentClassName: "border-cyan-400/40 bg-cyan-500/12 text-cyan-100",
      skylineClassName: "from-cyan-500/15 via-sky-500/10 to-transparent",
    },
    {
      id: "extract_route",
      label: phaseLabels[2] ?? "Extract Route",
      objective: `${extractDirective.objective} ${extractEvent.objectiveShift}`,
      directiveLabel: extractDirective.label,
      eventLabel: extractEvent.label,
      targetKills: 6 + densityBonus + combatDensity + Math.max(0, Math.round(extractEvent.modifiers.pressure * 2 - 2)),
      targetInteractions: 1,
      hostileLabel: eliteLabel,
      interactionLabel: destinationLabel,
      interactionReward: "supply",
      pressureScale: extractEvent.modifiers.pressure,
      rewardScale: extractEvent.modifiers.reward,
      recoveryScale: extractEvent.modifiers.recovery,
      accentClassName: "border-blue-400/40 bg-blue-500/12 text-blue-100",
      skylineClassName: "from-blue-500/15 via-sky-500/10 to-transparent",
    },
  ]
}

function buildContacts(
  phase: PhaseDefinition,
  contactNonce: number,
  hostileWeight = 1,
  interactionWeight = 1,
): RuntimeContact[] {
  const hostileCount = Math.max(phase.targetKills, 3, Math.round(Math.max(1, phase.targetKills * Math.max(0.78, hostileWeight))))
  const interactionCount = Math.max(phase.targetInteractions, 1, Math.round(Math.max(1, phase.targetInteractions * Math.max(0.82, interactionWeight))))
  const hostiles = Array.from({ length: hostileCount }, (_, index) => ({
    id: `hostile_${phase.id}_${contactNonce}_${index}`,
    kind: "hostile" as const,
    label: index === 0 ? `${phase.hostileLabel} ${phase.eventLabel}` : phase.hostileLabel,
    lane: ((index % 3) - 1) as Lane,
    depth: 92 - index * 14,
    hp: index >= 2 ? (phase.pressureScale >= 1.12 ? 3 : 2) : 1,
  }))
  const interactions = Array.from({ length: interactionCount }, (_, index) => ({
    id: `interaction_${phase.id}_${contactNonce}_${index}`,
    kind: "interaction" as const,
    label: index === 0 ? `${phase.interactionLabel} ${phase.directiveLabel}` : phase.interactionLabel,
    lane: (((index + 1) % 3) - 1) as Lane,
    depth: 72 - index * 12,
    hp: 1,
    reward: phase.interactionReward,
  }))

  return [...hostiles, ...interactions]
}

function createInitialState(
  phases: PhaseDefinition[],
  playbook: ReturnType<typeof getProjectRuntimePlaybookPlan>,
): RuntimeState {
  return {
    lane: 0,
    phaseIndex: 0,
    activeDirectiveIndex: 0,
    activeEventIndex: 0,
    phaseProgress: 12,
    kills: 0,
    interactions: 0,
    health: 100,
    armor: Math.round(60 * playbook.tuning.recoveryWindow),
    ammo: 14,
    reserveAmmo: 56 + Math.max(0, Math.round((playbook.tuning.rewardRate - 1) * 12)),
    supplies: 2 + Math.max(0, Math.round((playbook.tuning.rewardRate - 1) * 2)),
    repairCharges: 0,
    contacts: buildContacts(phases[0], 0),
    contactNonce: 1,
    elapsedSeconds: 0,
    paused: false,
    won: false,
    failed: false,
    fireCooldown: 0,
    strafeCooldown: 0,
    interactCooldown: 0,
    reloadCooldown: 0,
    statusText: phases[0]?.objective ?? "Initializing 3D runtime...",
  }
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
      className="h-10 min-w-10 border-border/60 bg-card/60"
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

export function ActionRuntime3D({ project }: { project: UserProject }) {
  const runtimeArchetype = project.design.runtimePlan?.archetype
  const mode: RuntimeMode = runtimeArchetype === "survival_expedition_3d" ? "survival" : "assault"
  const versatility = useMemo(() => getProjectRuntimeVersatilityPlan(project), [project])
  const scaffolding = useMemo(() => buildRuntimeScaffoldingPlan(project), [project])
  const playbook = useMemo(() => getProjectRuntimePlaybookPlan(project), [project])
  const director = useMemo(() => getProjectRuntimeEncounterDirector(project), [project])
  const phases = useMemo(
    () => createPhases(mode, project.design.scopeScale, versatility, scaffolding, playbook, director),
    [director, mode, playbook, project.design.scopeScale, scaffolding, versatility],
  )
  const graphicsPresentation = getRuntimeGraphicsPresentation(project)
  const keysRef = useRef<Set<string>>(new Set())
  const [runToken, setRunToken] = useState(0)
  const [state, setState] = useState<RuntimeState>(() => createInitialState(phases, playbook))

  const restartRun = useCallback(() => setRunToken((value) => value + 1), [])
  const setControlKey = useCallback((key: string, pressed: boolean) => {
    if (pressed) {
      keysRef.current.add(key)
      return
    }
    keysRef.current.delete(key)
  }, [])

  useEffect(() => {
    keysRef.current.clear()
    setState(createInitialState(phases, playbook))
  }, [phases, playbook, runToken])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (!CONTROL_KEYS.has(key)) return
      keysRef.current.add(key)
      if (key === "p") {
        event.preventDefault()
        setState((current) => ({
          ...current,
          paused: !current.paused,
          statusText: current.paused
            ? current.statusText
            : "Runtime paused. Check the objective feed, ammo, and route state before pushing again.",
        }))
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (!CONTROL_KEYS.has(key)) return
      keysRef.current.delete(key)
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setState((current) => {
        if (current.paused || current.won || current.failed) {
          return current
        }

        const phase = phases[Math.min(current.phaseIndex, phases.length - 1)]
        if (!phase) return current
        const liveEvent = director.eventDeck[current.activeEventIndex % Math.max(director.eventDeck.length, 1)] ?? director.eventDeck[0]
        const activeWeights = getRuntimeEncounterTickWeights(
          director,
          current.activeDirectiveIndex,
          current.activeEventIndex,
          current.phaseProgress / 100,
        )

        const next: RuntimeState = {
          ...current,
          elapsedSeconds: current.elapsedSeconds + 0.1,
          fireCooldown: Math.max(0, current.fireCooldown - 0.1),
          strafeCooldown: Math.max(0, current.strafeCooldown - 0.1),
          interactCooldown: Math.max(0, current.interactCooldown - 0.1),
          reloadCooldown: Math.max(0, current.reloadCooldown - 0.1),
          statusText: current.statusText,
        }

        const movingForward = keysRef.current.has("w") || keysRef.current.has("arrowup")
        const movingBackward = keysRef.current.has("s") || keysRef.current.has("arrowdown")
        const strafeLeft = keysRef.current.has("a") || keysRef.current.has("arrowleft")
        const strafeRight = keysRef.current.has("d") || keysRef.current.has("arrowright")
        const firing = keysRef.current.has(" ")
        const interacting = keysRef.current.has("e")
        const reloading = keysRef.current.has("r")

        if (strafeLeft && next.strafeCooldown === 0) {
          next.lane = clamp(next.lane - 1, -1, 1) as Lane
          next.strafeCooldown = 0.18 / playbook.tuning.traction
        } else if (strafeRight && next.strafeCooldown === 0) {
          next.lane = clamp(next.lane + 1, -1, 1) as Lane
          next.strafeCooldown = 0.18 / playbook.tuning.traction
        }

        const depthShift = (movingForward ? 4.4 : movingBackward ? 1.2 : 2.2) * playbook.tuning.mobility * activeWeights.objectiveTempo
        next.phaseProgress = clamp(
          next.phaseProgress + (movingForward ? 2.6 : movingBackward ? -1.5 : 0.6) * playbook.tuning.mobility * phase.pressureScale * activeWeights.objectiveTempo,
          0,
          100,
        )

        next.contacts = next.contacts
          .map((contact) => ({ ...contact, depth: contact.depth - depthShift }))
          .filter((contact) => contact.depth > 0)

        if (firing && next.fireCooldown === 0 && next.ammo > 0) {
          const targetIndex = next.contacts.findIndex((contact) =>
            contact.kind === "hostile" &&
            Math.abs(contact.lane - next.lane) <= 1 &&
            contact.depth <= 88,
          )

          if (targetIndex >= 0) {
            next.ammo -= 1
            next.fireCooldown = 0.22 / playbook.tuning.traction
            const target = next.contacts[targetIndex]
            const remainingHp = target.hp - 1

            if (remainingHp <= 0) {
              next.kills += 1
              next.contacts.splice(targetIndex, 1)
              next.statusText = `${phase.label}: ${target.label} neutralized. Keep the lane moving.`
            } else {
              next.contacts[targetIndex] = { ...target, hp: remainingHp }
              next.statusText = `${phase.label}: armor cracked. Stay on the push.`
            }
          }
        }

        if (interacting && next.interactCooldown === 0) {
          const contactIndex = next.contacts.findIndex((contact) =>
            contact.kind === "interaction" &&
            contact.lane === next.lane &&
            contact.depth <= 24,
          )

          if (contactIndex >= 0) {
            const contact = next.contacts[contactIndex]
            next.interactions += 1
            next.interactCooldown = 0.4 / playbook.tuning.traction
            next.contacts.splice(contactIndex, 1)

            if (contact.reward === "ammo") {
              next.reserveAmmo += Math.round((12 + Math.max(0, Math.round((playbook.tuning.rewardRate - 1) * 8))) * phase.rewardScale)
                * Math.max(0.82, activeWeights.reward)
              next.statusText = `${phase.label}: breach kit secured. Reserve ammo increased.`
            } else if (contact.reward === "repair") {
              next.repairCharges += 1
              next.armor = clamp(next.armor + 18 * playbook.tuning.recoveryWindow * phase.recoveryScale * activeWeights.recovery, 0, 100)
              next.statusText = `${phase.label}: safehouse system repaired. Keep the perimeter intact.`
            } else if (contact.reward === "supply") {
              next.supplies += 1
              next.health = clamp(next.health + 8 * playbook.tuning.recoveryWindow * phase.recoveryScale * activeWeights.recovery, 0, 100)
              next.statusText = `${phase.label}: supplies recovered. Push to the next landmark.`
            } else {
              next.supplies += 1
              next.statusText = `${phase.label}: objective package secured. Hold the route and move.`
            }
          }
        }

        if (reloading && next.reloadCooldown === 0 && next.ammo < 14 && next.reserveAmmo > 0) {
          const refill = Math.min(14 - next.ammo, next.reserveAmmo)
          next.ammo += refill
          next.reserveAmmo -= refill
          next.reloadCooldown = 0.8 / playbook.tuning.traction
          next.statusText = `${phase.label}: reload complete. Advance while the lane is clear.`
        }

        next.contacts = next.contacts.filter((contact) => {
          if (contact.kind !== "hostile") return true
          if (contact.depth > 12) return true

          const armorDamage = Math.min(next.armor, (mode === "survival" ? 12 : 10) * playbook.tuning.pressure * phase.pressureScale * activeWeights.pressure)
          next.armor = clamp(next.armor - armorDamage, 0, 100)
          const spillDamage = (mode === "survival" ? 10 : 8) * playbook.tuning.pressure * phase.pressureScale * activeWeights.pressure
          next.health = clamp(next.health - Math.max(2, spillDamage - armorDamage / 2), 0, 100)
          next.statusText = `${phase.label}: ${contact.label} broke through the lane. Reset and stabilize.`
          return false
        })

        const remainingKills = phase.targetKills - next.kills
        const remainingInteractions = phase.targetInteractions - next.interactions

        if (
          next.contacts.length === 0 ||
          (
            !next.contacts.some((contact) => contact.kind === "hostile") && remainingKills > 0
          ) ||
          (
            !next.contacts.some((contact) => contact.kind === "interaction") && remainingInteractions > 0
          )
        ) {
          const nextEventIndex = next.activeEventIndex + 1
          const refreshedEvent = director.eventDeck[nextEventIndex % Math.max(director.eventDeck.length, 1)] ?? liveEvent
          next.contacts = [
            ...next.contacts,
            ...buildContacts(
              phase,
              next.contactNonce,
              activeWeights.hostileSpawn,
              activeWeights.interaction,
            ).filter((contact) =>
              (contact.kind === "hostile" && remainingKills > 0) ||
              (contact.kind === "interaction" && remainingInteractions > 0),
            ),
          ]
          next.contactNonce += 1
          next.activeEventIndex = nextEventIndex
          next.statusText = `${phase.label}: ${refreshedEvent.label}. ${refreshedEvent.objectiveShift}`
        }

        if (next.health <= 0) {
          return {
            ...next,
            failed: true,
            statusText: mode === "survival"
              ? "The expedition collapsed before extraction. Restart and keep the safehouse loop alive."
              : "The operation failed before extraction. Restart and preserve the mission route.",
          }
        }

        if (
          next.kills >= phase.targetKills &&
          next.interactions >= phase.targetInteractions &&
          next.phaseProgress >= 100
        ) {
          if (next.phaseIndex >= phases.length - 1) {
            return {
              ...next,
              won: true,
              phaseProgress: 100,
              statusText: mode === "survival"
                ? `${phase.directiveLabel} complete. The 3D survival slice held scavenging, shelter, and extraction pressure together.`
                : `${phase.directiveLabel} complete. The 3D mission slice held objective chains, lane pressure, and extraction together.`,
            }
          }

          const nextPhaseIndex = next.phaseIndex + 1
          const upcomingPhase = phases[nextPhaseIndex]
          const upcomingWeights = getRuntimeEncounterTickWeights(
            director,
            nextPhaseIndex,
            next.activeEventIndex + 1,
            0.12,
          )

          return {
            ...next,
            phaseIndex: nextPhaseIndex,
            activeDirectiveIndex: nextPhaseIndex,
            activeEventIndex: next.activeEventIndex + 1,
            phaseProgress: 14,
            kills: 0,
            interactions: 0,
            armor: clamp(next.armor + 10 * upcomingWeights.recovery, 0, 100),
            contacts: buildContacts(upcomingPhase, next.contactNonce + 1, upcomingWeights.hostileSpawn, upcomingWeights.interaction),
            contactNonce: next.contactNonce + 2,
            statusText: `${upcomingPhase.objective} ${upcomingPhase.eventLabel} is now active.`,
          }
        }

        return next
      })
    }, 100)

    return () => window.clearInterval(intervalId)
  }, [director, mode, phases, playbook])

  const phase = phases[Math.min(state.phaseIndex, phases.length - 1)]
  const hostileCount = state.contacts.filter((contact) => contact.kind === "hostile").length
  const interactionCount = state.contacts.filter((contact) => contact.kind === "interaction").length
  const activeEvent = director.eventDeck[state.activeEventIndex % Math.max(director.eventDeck.length, 1)] ?? director.eventDeck[0]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{project.design.runtimePlan.label}</Badge>
        <Badge variant="outline">{phase.label}</Badge>
        <Badge variant="outline">{versatility.flavorLabel}</Badge>
        <Badge variant="outline">{scaffolding.scenarioTitle}</Badge>
        <Badge variant="outline">{playbook.physics.profileLabel}</Badge>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_0.9fr]">
        <div className="space-y-4">
          <div className={`${graphicsPresentation.canvasWrapperClassName} relative aspect-[16/10]`}>
            <div className={`absolute inset-0 bg-gradient-to-b ${phase.skylineClassName}`} />
            <div className="absolute inset-x-0 top-0 h-[32%] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_52%)]" />
            <div className="absolute inset-x-0 bottom-0 h-[60%] bg-[linear-gradient(180deg,rgba(2,6,23,0)_0%,rgba(2,6,23,0.35)_18%,rgba(2,6,23,0.95)_100%)]" />
            <div className="absolute inset-x-[22%] bottom-0 top-[22%] border-x border-white/10" />
            <div className="absolute inset-x-[34%] bottom-0 top-[28%] border-x border-white/6" />
            <div className="absolute inset-x-[46%] bottom-0 top-[32%] border-x border-white/8" />
            <div className="absolute inset-x-0 top-[68%] h-px bg-white/10" />
            <div className="absolute inset-x-[48%] bottom-[14%] top-[36%] bg-[linear-gradient(180deg,rgba(148,163,184,0.1),rgba(148,163,184,0.35),rgba(148,163,184,0))]" />
            <div className="absolute inset-x-[40%] bottom-10 top-[48%] bg-[linear-gradient(180deg,rgba(56,189,248,0),rgba(56,189,248,0.16),rgba(56,189,248,0))] blur-2xl" />

            {state.contacts.map((contact) => {
              const nearFactor = clamp((100 - contact.depth) / 100, 0.15, 1)
              const top = 14 + nearFactor * 58
              const scale = 0.45 + nearFactor * 0.95
              const width = contact.kind === "hostile" ? 88 : 72
              const className =
                contact.kind === "hostile"
                  ? mode === "survival"
                    ? "border-rose-300/35 bg-gradient-to-b from-rose-400/30 via-rose-500/15 to-slate-950/80 text-rose-50"
                    : "border-sky-300/35 bg-gradient-to-b from-sky-400/30 via-cyan-500/15 to-slate-950/80 text-sky-50"
                  : "border-emerald-300/35 bg-gradient-to-b from-emerald-400/25 via-emerald-500/10 to-slate-950/80 text-emerald-50"

              return (
                <div
                  key={contact.id}
                  className={`absolute flex flex-col items-center justify-center rounded-xl border px-3 py-2 text-center shadow-2xl backdrop-blur ${className}`}
                  style={{
                    left: `${lanePosition(contact.lane)}%`,
                    top: `${top}%`,
                    width,
                    transform: `translate(-50%, -50%) scale(${scale})`,
                    opacity: clamp(1.08 - contact.depth / 120, 0.3, 1),
                  }}
                >
                  <span className="text-[10px] uppercase tracking-[0.24em] text-white/80">
                    {contact.kind === "hostile" ? "Threat" : "Interact"}
                  </span>
                  <span className="text-xs font-semibold">{contact.label}</span>
                  <span className="text-[10px] text-white/60">
                    Lane {contact.lane === -1 ? "Left" : contact.lane === 1 ? "Right" : "Center"}
                  </span>
                </div>
              )
            })}

            <div
              className="absolute bottom-[15%] h-16 w-14 -translate-x-1/2 rounded-t-[18px] border border-white/20 bg-white/10 shadow-[0_0_30px_rgba(125,211,252,0.25)]"
              style={{ left: `${lanePosition(state.lane)}%` }}
            >
              <div className="absolute inset-x-2 top-2 h-4 rounded-full bg-white/55" />
              <div className="absolute inset-x-3 bottom-2 h-5 rounded-md bg-white/20" />
            </div>

            <div className="absolute right-4 top-4 flex gap-2">
              <Badge className={phase.accentClassName}>
                <Target className="mr-1.5 h-3.5 w-3.5" />
                {phase.label}
              </Badge>
              <Badge variant="outline">{phase.directiveLabel}</Badge>
              <Badge variant="outline">{activeEvent?.label ?? playbook.beats[state.phaseIndex]?.label ?? "Prompt Beat"}</Badge>
              <Badge variant="secondary">
                {state.failed ? "Failed" : state.won ? "Cleared" : state.paused ? "Paused" : "Live"}
              </Badge>
            </div>

            <div className="absolute inset-x-4 bottom-4">
              <div className="rounded-xl border border-white/10 bg-slate-950/68 px-4 py-3 backdrop-blur">
                <div className="mb-2 flex items-center justify-between gap-3 text-xs text-slate-300">
                  <span className="uppercase tracking-[0.24em]">Objective Feed</span>
                  <span>{Math.floor(state.elapsedSeconds)}s</span>
                </div>
                <p className="text-sm text-slate-100">{state.statusText}</p>
              </div>
            </div>
          </div>

          <div className={graphicsPresentation.objectiveClassName}>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Current Objective</p>
            <p className="mt-2 text-sm text-foreground">{phase.objective}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-border/40 bg-background/40 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Directive</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{phase.directiveLabel}</p>
              </div>
              <div className="rounded-lg border border-border/40 bg-background/40 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Event Card</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{phase.eventLabel}</p>
              </div>
              <div className="rounded-lg border border-border/40 bg-background/40 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Progress</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{Math.round(state.phaseProgress)}%</p>
              </div>
              <div className="rounded-lg border border-border/40 bg-background/40 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{phase.hostileLabel}s Cleared</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{state.kills}/{phase.targetKills}</p>
              </div>
              <div className="rounded-lg border border-border/40 bg-background/40 px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{phase.interactionLabel}s</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{state.interactions}/{phase.targetInteractions}</p>
              </div>
            </div>
          </div>

          <RuntimeVersatilityPanel plan={versatility} boardClassName={graphicsPresentation.boardClassName} />
          <RuntimeEncounterPanel
            director={director}
            boardClassName={graphicsPresentation.boardClassName}
            activeDirectiveIndex={state.activeDirectiveIndex}
            activeEventIndex={state.activeEventIndex}
          />
          <RuntimePlaybookPanel plan={playbook} boardClassName={graphicsPresentation.boardClassName} activeIndex={state.phaseIndex} />
        </div>

        <div className="space-y-4">
          <div className={graphicsPresentation.boardClassName}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  <Shield className="h-3.5 w-3.5" />
                  Vital Status
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Health</span>
                    <span className="font-semibold">{Math.round(state.health)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{versatility.resourceLabels.recovery}</span>
                    <span className="font-semibold">{Math.round(state.armor)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{versatility.resourceLabels.support}</span>
                    <span className="font-semibold">{state.ammo}/{state.reserveAmmo}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border/40 bg-background/40 p-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  {mode === "survival" ? <MoonStar className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
                  Route State
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>{phase.hostileLabel}s In View</span>
                    <span className="font-semibold">{hostileCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{phase.interactionLabel}s</span>
                    <span className="font-semibold">{interactionCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{mode === "survival" ? versatility.encounterLabels.support : versatility.resourceLabels.secondary}</span>
                    <span className="font-semibold">{mode === "survival" ? state.repairCharges : state.supplies}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setState((current) => ({ ...current, paused: !current.paused }))}>
                {state.paused ? <Play className="mr-1.5 h-4 w-4" /> : <Pause className="mr-1.5 h-4 w-4" />}
                {state.paused ? "Resume" : "Pause"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={restartRun}>
                <RotateCcw className="mr-1.5 h-4 w-4" />
                Restart
              </Button>
            </div>
          </div>

          <div className={graphicsPresentation.infoClassName}>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Controls</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Move</p>
                <div className="flex flex-wrap gap-2">
                  <ControlButton label="W" onPress={() => setControlKey("w", true)} onRelease={() => setControlKey("w", false)} />
                  <ControlButton label="A" onPress={() => setControlKey("a", true)} onRelease={() => setControlKey("a", false)} />
                  <ControlButton label="S" onPress={() => setControlKey("s", true)} onRelease={() => setControlKey("s", false)} />
                  <ControlButton label="D" onPress={() => setControlKey("d", true)} onRelease={() => setControlKey("d", false)} />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Actions</p>
                <div className="flex flex-wrap gap-2">
                  <ControlButton label="Fire" onPress={() => setControlKey(" ", true)} onRelease={() => setControlKey(" ", false)} disabled={state.ammo <= 0} />
                  <ControlButton label={versatility.actionLabels.primary} onPress={() => setControlKey("e", true)} onRelease={() => setControlKey("e", false)} />
                  <ControlButton label="Reload" onPress={() => setControlKey("r", true)} onRelease={() => setControlKey("r", false)} disabled={state.reserveAmmo <= 0} />
                </div>
              </div>
            </div>
          </div>

          <div className={graphicsPresentation.infoClassName}>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Why This Fixes Collapse</p>
            <p className="mt-2 text-sm text-muted-foreground">
              This 3D runtime keeps direct-avatar movement, prompt-specific objective nouns, threat lanes, and extraction pressure visible from the first minute, so a 3D shooter or survival brief cannot quietly fall back into a fortify board or button-clicker loop.
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Use <span className="font-mono">WASD</span> or the touch controls to strafe and push the route,
        <span className="font-mono"> Space</span> to fire,
        <span className="font-mono"> E</span> to {versatility.actionLabels.primary.toLowerCase()},
        <span className="font-mono"> R</span> to reload,
        <span className="font-mono"> P</span> to pause, and
        <span className="font-mono"> Restart</span> to rerun the slice.
      </p>
    </div>
  )
}
