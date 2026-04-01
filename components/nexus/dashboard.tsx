"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Activity, Brain, Database, Layers, Radio, Cpu, Zap, GitBranch } from "lucide-react"
import { INITIAL_ENGINE_STATE, RESEARCH_DOMAINS, TRAINING_DOMAINS, GENERATION_SYSTEMS, OPEN_SOURCE_ENGINES } from "@/lib/engine/config"
import { AGENTS_LIST as AGENTS } from "@/lib/engine/agents"

const phases = [
  { key: "L0_context", label: "L0 Context", color: "bg-blue-500" },
  { key: "L1_research", label: "L1 Research", color: "bg-purple-500" },
  { key: "L2_training", label: "L2 Training", color: "bg-amber-500" },
  { key: "L3_generation", label: "L3 Generation", color: "bg-emerald-500" },
  { key: "L4_meta_loop", label: "L4 Meta Loop", color: "bg-red-500" },
]

function StatCard({ title, value, sub, icon: Icon, color }: { title: string; value: string | number; sub: string; icon: React.ElementType; color: string }) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2 ${color}`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-xl font-bold font-mono">{value}</p>
            <p className="text-xs text-muted-foreground truncate">{sub}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function Dashboard() {
  const state = INITIAL_ENGINE_STATE
  const activeAgents = AGENTS.filter(a => a.status === "running").length
  const researchProgress = Math.round((state.research.domainsDone / state.research.domainsTotal) * 100)
  const trainingProgress = Math.round((state.training.domainsDone / state.training.domainsTotal) * 100)
  const generationProgress = Math.round((state.generation.systemsDone / state.generation.systemsTotal) * 100)
  const totalLinks = RESEARCH_DOMAINS.reduce((sum, d) => sum + d.links, 0)
  const totalPairs = TRAINING_DOMAINS.reduce((sum, d) => sum + d.pairs, 0)
  const totalLines = GENERATION_SYSTEMS.reduce((sum, s) => sum + s.linesGenerated, 0)

  return (
    <div className="space-y-6">
      {/* Engine Status Banner */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-3 w-3 rounded-full bg-emerald-500" />
              <div className="absolute inset-0 h-3 w-3 animate-ping rounded-full bg-emerald-500/50" />
            </div>
            <div>
              <h2 className="font-semibold">NEXUS-116 Engine Active</h2>
              <p className="text-sm text-muted-foreground">
                Cycle #{state.cycleCount} &mdash; {state.currentTask}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 font-mono">
            {state.status.toUpperCase()}
          </Badge>
        </div>

        {/* Phase Pipeline */}
        <div className="mt-4 flex gap-1">
          {phases.map((p) => (
            <div key={p.key} className="flex-1">
              <div className={`h-1.5 rounded-full ${
                state.currentPhase === p.key ? `${p.color} animate-pulse` :
                state.levelsEnabled[p.key] ? "bg-muted-foreground/30" : "bg-muted/20"
              }`} />
              <p className={`text-[10px] mt-1 text-center ${
                state.currentPhase === p.key ? "text-foreground font-medium" : "text-muted-foreground"
              }`}>{p.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Engine Cycles" value={state.cycleCount} sub="Continuous improvement" icon={Activity} color="bg-blue-600" />
        <StatCard title="Active Agents" value={`${activeAgents}/${AGENTS.length}`} sub="Specialized AI workers" icon={Cpu} color="bg-violet-600" />
        <StatCard title="Research Links" value={totalLinks} sub={`${state.research.domainsDone}/${state.research.domainsTotal} domains`} icon={Database} color="bg-purple-600" />
        <StatCard title="Training Pairs" value={totalPairs.toLocaleString()} sub={`${state.training.domainsDone}/${state.training.domainsTotal} domains`} icon={Brain} color="bg-amber-600" />
      </div>

      {/* Progress Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Radio className="h-4 w-4 text-purple-400" />
              Research Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{state.research.domainsDone}/{state.research.domainsTotal} domains</span>
                <span className="font-mono">{researchProgress}%</span>
              </div>
              <Progress value={researchProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">{totalLinks} links collected across all domains</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              Training Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{state.training.domainsDone}/{state.training.domainsTotal} domains</span>
                <span className="font-mono">{trainingProgress}%</span>
              </div>
              <Progress value={trainingProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">{totalPairs.toLocaleString()} instruction pairs generated</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-400" />
              Generation Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{state.generation.systemsDone}/{state.generation.systemsTotal} systems</span>
                <span className="font-mono">{generationProgress}%</span>
              </div>
              <Progress value={generationProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">{totalLines.toLocaleString()} lines of C++ generated</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Knowledge Sources */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-blue-400" />
            Open-Source Engine Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {OPEN_SOURCE_ENGINES.map((engine) => (
              <div key={engine.name} className="rounded-lg border border-border/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{engine.name}</span>
                  <Badge variant="secondary" className="text-[10px] font-mono">{engine.stars}</Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {engine.absorbed.slice(0, 3).map((tech) => (
                    <Badge key={tech} variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">
                      {tech}
                    </Badge>
                  ))}
                  {engine.absorbed.length > 3 && (
                    <Badge variant="outline" className="text-[10px]">+{engine.absorbed.length - 3}</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
