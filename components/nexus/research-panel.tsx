"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Radio, ExternalLink, Search, CheckCircle } from "lucide-react"
import { RESEARCH_DOMAINS, STANDALONE_LIBS } from "@/lib/engine/config"

export function ResearchPanel() {
  const totalLinks = RESEARCH_DOMAINS.reduce((s, d) => s + d.links, 0)
  const completed = RESEARCH_DOMAINS.filter(d => d.status === "complete").length

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border/50 bg-card/50 p-4">
          <p className="text-xs text-muted-foreground">Total Links</p>
          <p className="text-2xl font-mono font-bold">{totalLinks}</p>
        </Card>
        <Card className="border-border/50 bg-card/50 p-4">
          <p className="text-xs text-muted-foreground">Domains Complete</p>
          <p className="text-2xl font-mono font-bold text-emerald-400">{completed}/{RESEARCH_DOMAINS.length}</p>
        </Card>
        <Card className="border-border/50 bg-card/50 p-4">
          <p className="text-xs text-muted-foreground">Threshold</p>
          <p className="text-2xl font-mono font-bold">20 links</p>
        </Card>
        <Card className="border-border/50 bg-card/50 p-4">
          <p className="text-xs text-muted-foreground">Method</p>
          <p className="text-lg font-mono font-bold">Claude CLI</p>
          <p className="text-[10px] text-muted-foreground">Zero API cost</p>
        </Card>
      </div>

      {/* Domain Grid */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Research Domains ({RESEARCH_DOMAINS.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {RESEARCH_DOMAINS.map((domain) => (
              <div key={domain.name} className={`rounded-lg border p-3 transition-all ${
                domain.status === "active" ? "border-purple-500/30 bg-purple-500/5" :
                domain.status === "complete" ? "border-emerald-500/20" :
                "border-border/50"
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {domain.status === "complete" && <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />}
                    {domain.status === "active" && <Radio className="h-3.5 w-3.5 text-purple-400 animate-pulse" />}
                    <span className="text-sm font-medium">{domain.displayName}</span>
                  </div>
                  <Badge variant="outline" className={`text-[10px] font-mono ${
                    domain.status === "complete" ? "border-emerald-500/30 text-emerald-400" :
                    domain.status === "active" ? "border-purple-500/30 text-purple-400" :
                    ""
                  }`}>
                    {domain.links}/{domain.threshold}
                  </Badge>
                </div>
                <Progress
                  value={Math.min((domain.links / domain.threshold) * 100, 100)}
                  className="h-1.5"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Standalone Libraries */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Tracked Standalone Libraries ({STANDALONE_LIBS.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
              {STANDALONE_LIBS.map((lib) => (
                <div key={lib.name} className="rounded-lg border border-border/50 p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{lib.name}</span>
                    <Badge variant="secondary" className="text-[10px]">{lib.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{lib.description}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
