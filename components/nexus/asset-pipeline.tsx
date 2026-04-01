"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FolderOpen, FileCode, FileImage, FileCog, Box, ArrowRight, CheckCircle } from "lucide-react"

const assetTypes = [
  { type: "C++ Source", icon: FileCode, count: 34, size: "847 KB", color: "text-blue-400" },
  { type: "C++ Headers", icon: FileCode, count: 28, size: "312 KB", color: "text-cyan-400" },
  { type: "Shader (HLSL)", icon: FileCog, count: 12, size: "156 KB", color: "text-purple-400" },
  { type: "Config (JSON)", icon: FileCog, count: 8, size: "42 KB", color: "text-amber-400" },
  { type: "Python Scripts", icon: FileCode, count: 15, size: "234 KB", color: "text-emerald-400" },
  { type: "Shell Scripts", icon: FileCode, count: 11, size: "28 KB", color: "text-rose-400" },
]

const pipelineStages = [
  { name: "Import", desc: "FBX, GLTF, PNG, WAV", status: "ready" },
  { name: "Cook", desc: "Raw -> Intermediate", status: "ready" },
  { name: "Compile", desc: "Shaders, Code", status: "active" },
  { name: "Optimize", desc: "LOD, Compression", status: "pending" },
  { name: "Package", desc: "Runtime format", status: "pending" },
]

const supportedEngines = [
  { name: "Unreal Engine 5", status: "primary", features: ["C++ UCLASS", "Blueprints", "Nanite", "Lumen", "Multiplayer"] },
  { name: "Godot 4", status: "supported", features: ["GDExtension", "Scene System", "Signals", "GDScript"] },
  { name: "Unity", status: "planned", features: ["C# Scripts", "DOTS ECS", "URP/HDRP"] },
  { name: "Custom Engine", status: "supported", features: ["Raw C++", "Vulkan/D3D12", "Custom ECS"] },
]

const recentBuilds = [
  { name: "combat_system.cpp", status: "success", time: "2.3s", output: "combat_system.o" },
  { name: "inventory_system.cpp", status: "success", time: "1.8s", output: "inventory_system.o" },
  { name: "networking.cpp", status: "success", time: "4.1s", output: "networking.o" },
  { name: "world_gen.cpp", status: "success", time: "3.7s", output: "world_gen.o" },
  { name: "rendering_pipeline.cpp", status: "success", time: "5.2s", output: "rendering_pipeline.o" },
  { name: "pbr_shader.hlsl", status: "success", time: "0.8s", output: "pbr_shader.spv" },
]

export function AssetPipeline() {
  return (
    <div className="space-y-6">
      {/* Asset Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {assetTypes.map((asset) => (
          <Card key={asset.type} className="border-border/50 bg-card/50 p-4">
            <div className="flex items-center gap-3">
              <asset.icon className={`h-5 w-5 ${asset.color}`} />
              <div>
                <p className="text-sm font-medium">{asset.type}</p>
                <p className="text-xs text-muted-foreground">{asset.count} files &middot; {asset.size}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Cook Pipeline */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Asset Cook Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {pipelineStages.map((stage, i) => (
              <div key={stage.name} className="flex items-center gap-2 flex-shrink-0">
                <div className={`rounded-lg border p-4 text-center min-w-[120px] ${
                  stage.status === "active" ? "border-amber-500/30 bg-amber-500/5" :
                  stage.status === "ready" ? "border-emerald-500/20 bg-emerald-500/5" :
                  "border-border/50"
                }`}>
                  <p className="text-sm font-medium">{stage.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stage.desc}</p>
                  <Badge variant="outline" className={`text-[9px] mt-2 ${
                    stage.status === "active" ? "border-amber-500/30 text-amber-400" :
                    stage.status === "ready" ? "border-emerald-500/30 text-emerald-400" :
                    ""
                  }`}>{stage.status}</Badge>
                </div>
                {i < pipelineStages.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Supported Engines */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Box className="h-5 w-5" />
            Supported Target Engines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {supportedEngines.map((engine) => (
              <div key={engine.name} className={`rounded-lg border p-4 ${
                engine.status === "primary" ? "border-emerald-500/30 bg-emerald-500/5" :
                engine.status === "supported" ? "border-blue-500/20" :
                "border-border/50"
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{engine.name}</span>
                  <Badge variant="outline" className={`text-[10px] ${
                    engine.status === "primary" ? "border-emerald-500/30 text-emerald-400" :
                    engine.status === "supported" ? "border-blue-500/30 text-blue-400" :
                    "border-muted-foreground/30"
                  }`}>{engine.status}</Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {engine.features.map((f) => (
                    <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Builds */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="text-sm">Recent Build Output</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            <div className="space-y-1.5 font-mono text-xs">
              {recentBuilds.map((build, i) => (
                <div key={i} className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                  <span className="text-emerald-400">[OK]</span>
                  <span>{build.name}</span>
                  <ArrowRight className="h-3 w-3 flex-shrink-0" />
                  <span>{build.output}</span>
                  <span className="ml-auto text-muted-foreground/50">{build.time}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
