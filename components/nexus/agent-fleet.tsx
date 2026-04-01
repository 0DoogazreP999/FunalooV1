"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Building, Monitor, Wifi, Orbit, Gamepad2, Volume2, Mountain, Zap, Wrench, Users, Clock, FileCode } from "lucide-react"
import { AGENTS_LIST as AGENTS } from "@/lib/engine/agents"

const iconMap: Record<string, React.ElementType> = {
  building: Building, monitor: Monitor, wifi: Wifi, orbit: Orbit,
  "gamepad-2": Gamepad2, "volume-2": Volume2, mountain: Mountain,
  zap: Zap, wrench: Wrench,
}

const statusColors: Record<string, string> = {
  idle: "bg-muted text-muted-foreground",
  running: "bg-emerald-600 text-white",
  done: "bg-blue-600 text-white",
}

export function AgentFleet() {
  const [selectedAgent, setSelectedAgent] = useState(AGENTS[0].name)
  const agent = AGENTS.find(a => a.name === selectedAgent) || AGENTS[0]
  const Icon = iconMap[agent.icon] || Users

  return (
    <div className="space-y-6">
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Agent Fleet &mdash; {AGENTS.length} Specialized AI Workers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Each agent carries deep domain expertise injected as system prompts. They run in parallel via Claude CLI (3 max concurrent).
          </p>
          <div className="grid grid-cols-3 lg:grid-cols-5 gap-2">
            {AGENTS.map((a) => {
              const AgentIcon = iconMap[a.icon] || Users
              return (
                <Button
                  key={a.name}
                  variant={selectedAgent === a.name ? "default" : "outline"}
                  className={`h-auto py-3 flex flex-col gap-1 ${selectedAgent === a.name ? "" : "border-border/50"}`}
                  onClick={() => setSelectedAgent(a.name)}
                >
                  <AgentIcon className="h-5 w-5" />
                  <span className="text-[11px] leading-tight text-center">{a.displayName}</span>
                  <Badge variant="secondary" className={`text-[9px] ${statusColors[a.status]}`}>
                    {a.status}
                  </Badge>
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Agent Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              {agent.displayName}
              <Badge className={statusColors[agent.status]}>{agent.status}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{agent.description}</p>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">EXPERTISE</p>
              <div className="flex flex-wrap gap-1.5">
                {agent.expertise.map((e) => (
                  <Badge key={e} variant="outline" className="text-xs border-blue-500/30 text-blue-400">{e}</Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="rounded-lg border border-border/50 p-2 text-center">
                <Clock className="h-3 w-3 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-mono font-bold">{agent.lastDuration}s</p>
                <p className="text-[10px] text-muted-foreground">Last Duration</p>
              </div>
              <div className="rounded-lg border border-border/50 p-2 text-center">
                <FileCode className="h-3 w-3 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-mono font-bold">{(agent.outputChars / 1000).toFixed(1)}k</p>
                <p className="text-[10px] text-muted-foreground">Output Chars</p>
              </div>
              <div className="rounded-lg border border-border/50 p-2 text-center">
                <Zap className="h-3 w-3 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-mono font-bold">3</p>
                <p className="text-[10px] text-muted-foreground">Tasks Done</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agent Knowledge Preview */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">System Prompt Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[320px]">
              <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">
{`You are NEXUS-116 ${agent.displayName} Agent.

DEEP EXPERTISE:
${agent.expertise.map(e => `- ${e}: Production-level implementation knowledge`).join("\n")}

ARCHITECTURAL PATTERNS:
- Data-oriented design over object-oriented
- Composition over inheritance
- Cache-friendly memory layouts
- Zero-cost abstractions where possible
- Explicit resource management
- Deterministic frame ordering

When designing systems, always consider:
memory layout, cache efficiency, thread safety,
extensibility, and how systems compose together.

Provide complete C++ headers and implementation.
All code must be production-ready.`}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Parallel Execution Pipeline */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Design Pipeline (Parallel Execution)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <div className="flex-shrink-0 rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 text-center min-w-[100px]">
              <Building className="h-4 w-4 mx-auto mb-1 text-blue-400" />
              <p className="text-xs font-medium">Phase 1</p>
              <p className="text-[10px] text-muted-foreground">Architect</p>
            </div>
            <div className="text-muted-foreground">&rarr;</div>
            <div className="flex-shrink-0 flex gap-2">
              {[
                { icon: Monitor, label: "Renderer", color: "purple" },
                { icon: Orbit, label: "Physics", color: "amber" },
                { icon: Wifi, label: "Network", color: "emerald" },
              ].map(({ icon: I, label, color }) => (
                <div key={label} className={`rounded-lg border border-${color}-500/30 bg-${color}-500/5 p-3 text-center min-w-[80px]`}>
                  <I className={`h-4 w-4 mx-auto mb-1 text-${color}-400`} />
                  <p className="text-xs font-medium">Phase 2</p>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            <div className="text-muted-foreground">&rarr;</div>
            <div className="flex-shrink-0 flex gap-2">
              {[
                { icon: Gamepad2, label: "Gameplay" },
                { icon: Volume2, label: "Audio" },
                { icon: Mountain, label: "Procedural" },
              ].map(({ icon: I, label }) => (
                <div key={label} className="rounded-lg border border-border/50 p-3 text-center min-w-[80px]">
                  <I className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-xs font-medium">Phase 3</p>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            <div className="text-muted-foreground">&rarr;</div>
            <div className="flex-shrink-0 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-center min-w-[100px]">
              <Zap className="h-4 w-4 mx-auto mb-1 text-amber-400" />
              <p className="text-xs font-medium">Phase 4</p>
              <p className="text-[10px] text-muted-foreground">Optimizer</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
