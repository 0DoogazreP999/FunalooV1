"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Settings, Terminal, Database, Cpu, Clock, Key, Globe } from "lucide-react"

export function SettingsPanel() {
  return (
    <div className="space-y-6">
      {/* Studio Info */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            NEXUS-116 Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Version</p>
              <p className="font-mono font-bold">0.1.0</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Studio</p>
              <p className="font-mono font-bold">Element116 Studios</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Platform</p>
              <p className="font-mono font-bold">Windows 11</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Claude CLI</p>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 font-mono">Connected</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Claude CLI Config */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Terminal className="h-4 w-4" />
            Claude CLI Configuration
            <Badge variant="secondary" className="text-[10px]">Zero API Cost</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            All LLM calls route through the local Claude CLI binary. No API keys needed, no credits consumed.
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-sm">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Binary</p>
              <p className="text-xs bg-muted/50 rounded px-2 py-1">claude</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Max Retries</p>
              <p className="text-xs bg-muted/50 rounded px-2 py-1">3</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Retry Delay</p>
              <p className="text-xs bg-muted/50 rounded px-2 py-1">2 seconds</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Timeout</p>
              <p className="text-xs bg-muted/50 rounded px-2 py-1">300 seconds</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Cache Enabled</p>
              <p className="text-xs bg-muted/50 rounded px-2 py-1">true (24h TTL)</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Max Parallel</p>
              <p className="text-xs bg-muted/50 rounded px-2 py-1">3 workers</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Research Config */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Globe className="h-4 w-4" />
            Research Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-sm">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Max Links/Domain</p>
              <p className="text-xs bg-muted/50 rounded px-2 py-1">50</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Min Relevance</p>
              <p className="text-xs bg-muted/50 rounded px-2 py-1">0.6</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Min Quality</p>
              <p className="text-xs bg-muted/50 rounded px-2 py-1">0.5</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Auto-Vet Threshold</p>
              <p className="text-xs bg-muted/50 rounded px-2 py-1">0.8</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Training Config */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Cpu className="h-4 w-4" />
            Training Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-sm">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Method</p>
              <p className="text-xs bg-muted/50 rounded px-2 py-1">LoRA</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Base Model</p>
              <p className="text-xs bg-muted/50 rounded px-2 py-1">Meta-Llama-3.1-8B-Instruct</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Max Seq Length</p>
              <p className="text-xs bg-muted/50 rounded px-2 py-1">8192</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Batch Size</p>
              <p className="text-xs bg-muted/50 rounded px-2 py-1">4</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Epochs</p>
              <p className="text-xs bg-muted/50 rounded px-2 py-1">3</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Learning Rate</p>
              <p className="text-xs bg-muted/50 rounded px-2 py-1">2e-4</p>
            </div>
          </div>
          <Separator className="my-4" />
          <div>
            <p className="text-xs text-muted-foreground mb-2">Priority Domains</p>
            <div className="flex flex-wrap gap-1.5">
              {["procedural_generation", "rendering_graphics", "multiplayer_networking", "ai_game_agents", "unreal_cpp", "engine_architecture", "optimization"].map(d => (
                <Badge key={d} variant="outline" className="text-[10px] font-mono">{d}</Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Game Generator Config */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Database className="h-4 w-4" />
            Game Generator Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2">Supported Engines</p>
              <div className="flex flex-wrap gap-1.5">
                {["unreal", "godot", "unity", "custom"].map(e => (
                  <Badge key={e} variant="outline" className="text-[10px] font-mono">{e}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">Supported Genres</p>
              <div className="flex flex-wrap gap-1.5">
                {["battle_royale", "fps", "rpg", "mmo", "racing", "platformer", "sandbox", "horror"].map(g => (
                  <Badge key={g} variant="outline" className="text-[10px] font-mono">{g}</Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Continuous Loop */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" />
            Continuous Loop
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-sm">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Enabled</p>
              <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-[10px]">false</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Interval</p>
              <p className="text-xs bg-muted/50 rounded px-2 py-1">3600 seconds</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Context Phase</p>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px]">enabled</Badge>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Generation Phase</p>
              <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-[10px]">disabled</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Raw Config */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Key className="h-4 w-4" />
            nexus116.json
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[250px]">
            <pre className="text-xs font-mono text-muted-foreground bg-black/30 rounded-lg p-4 leading-relaxed">
{`{
  "nexus116": {
    "version": "0.1.0",
    "studio": "Element116 Studios",
    "claude_cli": {
      "_note": "All LLM calls route through local 'claude' binary",
      "binary": "claude",
      "max_retries": 3,
      "timeout_seconds": 300,
      "cache_enabled": true,
      "max_parallel_workers": 3
    },
    "training": {
      "default_method": "lora",
      "base_model": "unsloth/Meta-Llama-3.1-8B-Instruct",
      "max_seq_length": 8192,
      "batch_size": 4,
      "epochs": 3,
      "learning_rate": 2e-4
    },
    "game_generator": {
      "default_engine": "unreal",
      "default_optimization": "production",
      "supported_engines": [
        "unreal", "godot", "unity", "custom"
      ]
    }
  }
}`}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
