"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Brain, Eye, Lightbulb, ListTodo, Play, FileCheck, CheckCircle, History, AlertTriangle } from "lucide-react"
import { BRAIN_WORK_QUEUE } from "@/lib/engine/config"

const brainPhases = [
  { icon: Eye, label: "READ", desc: "Ingest every file", color: "blue" },
  { icon: Lightbulb, label: "REFLECT", desc: "What's missing?", color: "purple" },
  { icon: ListTodo, label: "PLAN", desc: "Prioritize work", color: "amber" },
  { icon: Play, label: "EXECUTE", desc: "Run via CLI", color: "emerald" },
  { icon: FileCheck, label: "APPLY", desc: "Write to disk", color: "cyan" },
  { icon: CheckCircle, label: "VERIFY", desc: "Check results", color: "green" },
  { icon: History, label: "LOG", desc: "Record & loop", color: "rose" },
]

const priorityColors: Record<number, string> = {
  1: "border-red-500/50 text-red-400",
  2: "border-amber-500/50 text-amber-400",
  3: "border-blue-500/50 text-blue-400",
  4: "border-muted-foreground/50 text-muted-foreground",
  5: "border-muted/50 text-muted-foreground",
}

const statusIcons: Record<string, { color: string; label: string }> = {
  done: { color: "text-emerald-400", label: "DONE" },
  running: { color: "text-amber-400", label: "RUNNING" },
  pending: { color: "text-muted-foreground", label: "PENDING" },
  failed: { color: "text-red-400", label: "FAILED" },
}

export function BrainMonitor() {
  const completed = BRAIN_WORK_QUEUE.filter(w => w.status === "done").length
  const running = BRAIN_WORK_QUEUE.filter(w => w.status === "running").length
  const total = BRAIN_WORK_QUEUE.length

  return (
    <div className="space-y-6">
      {/* Brain Loop Visualization */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Self-Directing Brain Loop
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            The brain reads the entire codebase, reflects on what&apos;s missing, plans work, executes via Claude CLI, applies changes, verifies, and loops forever.
          </p>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {brainPhases.map((phase, i) => {
              const isActive = i === 3 // EXECUTE is currently active
              return (
                <div key={phase.label} className="flex items-center gap-1 flex-shrink-0">
                  <div className={`rounded-lg border p-3 text-center min-w-[85px] transition-all ${
                    isActive
                      ? `border-${phase.color}-500/50 bg-${phase.color}-500/10 ring-1 ring-${phase.color}-500/30`
                      : i < 3 ? "border-emerald-500/20 bg-emerald-500/5" : "border-border/50"
                  }`}>
                    <phase.icon className={`h-4 w-4 mx-auto mb-1 ${
                      isActive ? `text-${phase.color}-400` : i < 3 ? "text-emerald-400" : "text-muted-foreground"
                    }`} />
                    <p className={`text-xs font-mono font-bold ${isActive ? "text-foreground" : ""}`}>{phase.label}</p>
                    <p className="text-[10px] text-muted-foreground">{phase.desc}</p>
                  </div>
                  {i < brainPhases.length - 1 && (
                    <span className={`text-xs ${i < 3 ? "text-emerald-500" : "text-muted-foreground"}`}>&rarr;</span>
                  )}
                </div>
              )
            })}
            <span className="text-xs text-muted-foreground flex-shrink-0">&crarr;</span>
          </div>
        </CardContent>
      </Card>

      {/* Brain Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border/50 bg-card/50 p-4">
          <p className="text-xs text-muted-foreground">Brain Cycles</p>
          <p className="text-2xl font-mono font-bold">12</p>
        </Card>
        <Card className="border-border/50 bg-card/50 p-4">
          <p className="text-xs text-muted-foreground">Items Completed</p>
          <p className="text-2xl font-mono font-bold text-emerald-400">47</p>
        </Card>
        <Card className="border-border/50 bg-card/50 p-4">
          <p className="text-xs text-muted-foreground">Lines Written</p>
          <p className="text-2xl font-mono font-bold">18,432</p>
        </Card>
        <Card className="border-border/50 bg-card/50 p-4">
          <p className="text-xs text-muted-foreground">Files Created</p>
          <p className="text-2xl font-mono font-bold">34</p>
        </Card>
      </div>

      {/* Work Queue */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <ListTodo className="h-4 w-4" />
              Work Queue
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400">{completed} done</Badge>
              <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400">{running} running</Badge>
              <Badge variant="outline" className="text-xs">{total - completed - running} pending</Badge>
            </div>
          </div>
          <Progress value={(completed / total) * 100} className="h-1.5 mt-2" />
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[350px]">
            <div className="space-y-2">
              {BRAIN_WORK_QUEUE.map((item) => {
                const si = statusIcons[item.status]
                return (
                  <div key={item.id} className={`rounded-lg border p-3 transition-all ${
                    item.status === "running" ? "border-amber-500/30 bg-amber-500/5" :
                    item.status === "done" ? "border-emerald-500/20 bg-emerald-500/5 opacity-70" :
                    "border-border/50"
                  }`}>
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className={`text-[10px] font-mono flex-shrink-0 ${priorityColors[item.priority]}`}>
                        P{item.priority}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{item.title}</p>
                          <Badge variant="secondary" className={`text-[9px] ${si.color}`}>{si.label}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{item.targetFile}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] flex-shrink-0">{item.category}</Badge>
                    </div>
                    {item.status === "running" && (
                      <div className="mt-2 h-1 rounded-full bg-amber-500/20 overflow-hidden">
                        <div className="h-full w-2/3 bg-amber-500 rounded-full animate-pulse" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Recent Activity Log */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4" />
            Recent Brain Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 font-mono text-xs">
            {[
              { time: "03:42:15", msg: "EXECUTE: Running GJK+EPA collision via Claude CLI...", type: "info" },
              { time: "03:38:02", msg: "APPLY: Wrote core/ecs/archetype.cpp (1,847 lines)", type: "success" },
              { time: "03:37:45", msg: "VERIFY: ECS archetype storage passed validation", type: "success" },
              { time: "03:31:20", msg: "EXECUTE: Generated Vulkan RHI abstraction (4,210 chars)", type: "info" },
              { time: "03:28:55", msg: "PLAN: Generated 8 new work items, priority 1-3", type: "info" },
              { time: "03:25:30", msg: "REFLECT: Identified 3 missing systems, 2 weak areas", type: "warn" },
              { time: "03:22:10", msg: "READ: Scanned 47 files, 18,432 lines, 12 languages", type: "info" },
              { time: "03:20:00", msg: "CYCLE #12 started", type: "info" },
            ].map((entry, i) => (
              <div key={i} className={`flex items-start gap-3 ${
                entry.type === "success" ? "text-emerald-400" :
                entry.type === "warn" ? "text-amber-400" :
                "text-muted-foreground"
              }`}>
                <span className="text-muted-foreground flex-shrink-0">[{entry.time}]</span>
                <span>{entry.msg}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
