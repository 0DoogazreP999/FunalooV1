"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Play, Square, RotateCcw, Activity, Clock, Layers } from "lucide-react"
import type { EngineStatus } from "@/lib/engine/types"

const levels = [
  { key: "L0_context", label: "L0: Context Scan", desc: "Scan all project files, build full awareness" },
  { key: "L1_research", label: "L1: Research", desc: "Query, search, vet, store training links" },
  { key: "L2_training", label: "L2: Training", desc: "Dataset generation, LoRA train, eval, merge" },
  { key: "L3_generation", label: "L3: Generation", desc: "Parse prompt, generate systems, build, optimize" },
  { key: "L4_meta_loop", label: "L4: Meta Loop", desc: "Repeat L0-L3 forever, continuous improvement" },
]

export function EngineControl() {
  const [status, setStatus] = useState<EngineStatus>("running")
  const [levelsEnabled, setLevelsEnabled] = useState<Record<string, boolean>>({
    L0_context: true,
    L1_research: true,
    L2_training: true,
    L3_generation: true,
    L4_meta_loop: true,
  })
  const [cycleCount] = useState(7)

  const toggleLevel = (key: string) => {
    setLevelsEnabled(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="space-y-6">
      {/* Control Buttons */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Engine Controller
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              size="lg"
              onClick={() => setStatus("running")}
              disabled={status === "running"}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Play className="mr-2 h-4 w-4" /> Start Engine
            </Button>
            <Button
              size="lg"
              variant="destructive"
              onClick={() => setStatus("stopping")}
              disabled={status !== "running"}
            >
              <Square className="mr-2 h-4 w-4" /> Graceful Stop
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setStatus("idle")}
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Reset State
            </Button>

            <div className="ml-auto flex items-center gap-3">
              <Badge variant={status === "running" ? "default" : status === "stopping" ? "destructive" : "secondary"}
                className={`font-mono text-sm px-3 py-1 ${status === "running" ? "bg-emerald-600" : ""}`}>
                {status === "running" && (
                  <span className="relative mr-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                  </span>
                )}
                {status.toUpperCase()}
              </Badge>
            </div>
          </div>

          {status === "stopping" && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="text-sm text-amber-400">
                Graceful shutdown initiated. Current task will finish, state will be saved. No work will be lost.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Level Toggles */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Engine Levels
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {levels.map((level, i) => (
            <div key={level.key}>
              <div className="flex items-center justify-between py-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">{level.label}</span>
                    {status === "running" && levelsEnabled[level.key] && (
                      <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">ACTIVE</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{level.desc}</p>
                </div>
                <Switch
                  checked={levelsEnabled[level.key]}
                  onCheckedChange={() => toggleLevel(level.key)}
                />
              </div>
              {i < levels.length - 1 && <Separator />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Engine State */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Persistent State
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Cycle Count</p>
              <p className="text-lg font-bold">{cycleCount}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Started At</p>
              <p>2026-03-27 14:30</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Last Activity</p>
              <p>2026-03-28 03:42</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">State File</p>
              <p className="text-xs text-muted-foreground">data/engine_state.json</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            State is persisted to disk after every task. Restart picks up exactly where it left off.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
