"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Zap, Database, CheckCircle, Loader2, Clock } from "lucide-react"
import { TRAINING_DOMAINS } from "@/lib/engine/config"

export function TrainingPanel() {
  const totalPairs = TRAINING_DOMAINS.reduce((s, d) => s + d.pairs, 0)
  const completed = TRAINING_DOMAINS.filter(d => d.status === "complete").length
  const avgQuality = TRAINING_DOMAINS.filter(d => d.quality > 0).reduce((s, d, _, a) => s + d.quality / a.length, 0)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="border-border/50 bg-card/50 p-4">
          <p className="text-xs text-muted-foreground">Training Pairs</p>
          <p className="text-2xl font-mono font-bold">{totalPairs.toLocaleString()}</p>
        </Card>
        <Card className="border-border/50 bg-card/50 p-4">
          <p className="text-xs text-muted-foreground">Domains Done</p>
          <p className="text-2xl font-mono font-bold text-emerald-400">{completed}/{TRAINING_DOMAINS.length}</p>
        </Card>
        <Card className="border-border/50 bg-card/50 p-4">
          <p className="text-xs text-muted-foreground">Avg Quality</p>
          <p className="text-2xl font-mono font-bold text-amber-400">{(avgQuality * 100).toFixed(0)}%</p>
        </Card>
        <Card className="border-border/50 bg-card/50 p-4">
          <p className="text-xs text-muted-foreground">Base Model</p>
          <p className="text-sm font-mono font-bold">Llama 3.1 8B</p>
          <p className="text-[10px] text-muted-foreground">Instruct</p>
        </Card>
        <Card className="border-border/50 bg-card/50 p-4">
          <p className="text-xs text-muted-foreground">Method</p>
          <p className="text-lg font-mono font-bold">LoRA</p>
          <p className="text-[10px] text-muted-foreground">r=16, alpha=32</p>
        </Card>
      </div>

      {/* Training Config */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4" />
            Training Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 font-mono text-sm">
            <div><p className="text-xs text-muted-foreground">Max Seq Length</p><p className="font-bold">8,192</p></div>
            <div><p className="text-xs text-muted-foreground">Batch Size</p><p className="font-bold">4</p></div>
            <div><p className="text-xs text-muted-foreground">Epochs</p><p className="font-bold">3</p></div>
            <div><p className="text-xs text-muted-foreground">Learning Rate</p><p className="font-bold">2e-4</p></div>
            <div><p className="text-xs text-muted-foreground">Optimizer</p><p className="font-bold">AdamW</p></div>
            <div><p className="text-xs text-muted-foreground">Data Source</p><p className="font-bold">Claude CLI</p></div>
          </div>
        </CardContent>
      </Card>

      {/* Domain Progress */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Domain Training Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {TRAINING_DOMAINS.map((domain) => (
              <div key={domain.name} className={`rounded-lg border p-3 ${
                domain.status === "training" ? "border-amber-500/30 bg-amber-500/5" :
                domain.status === "complete" ? "border-emerald-500/20" :
                "border-border/50"
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {domain.status === "complete" && <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />}
                    {domain.status === "training" && <Loader2 className="h-3.5 w-3.5 text-amber-400 animate-spin" />}
                    {domain.status === "pending" && <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                    <span className="text-sm font-medium">{domain.displayName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {domain.pairs > 0 && (
                      <span className="text-xs text-muted-foreground font-mono">{domain.pairs} pairs</span>
                    )}
                    {domain.quality > 0 && (
                      <Badge variant="outline" className={`text-[10px] font-mono ${
                        domain.quality >= 0.9 ? "border-emerald-500/30 text-emerald-400" :
                        domain.quality >= 0.8 ? "border-amber-500/30 text-amber-400" :
                        "border-muted-foreground/30"
                      }`}>
                        {(domain.quality * 100).toFixed(0)}% quality
                      </Badge>
                    )}
                    <span className="text-xs font-mono text-muted-foreground">
                      {domain.epoch}/{domain.totalEpochs}
                    </span>
                  </div>
                </div>
                <Progress
                  value={(domain.epoch / domain.totalEpochs) * 100}
                  className="h-1.5"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
