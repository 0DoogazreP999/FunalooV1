"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronRight, ChevronDown, Globe, Box, Component, Cpu, Layers, Crosshair, Move, RotateCcw, Maximize } from "lucide-react"
import { DEFAULT_SCENE_TREE as SCENE_TREE } from "@/lib/engine/config"

import type { SceneNode } from "@/lib/engine/types"

const typeIcons: Record<string, React.ElementType> = {
  root: Globe,
  node: Layers,
  entity: Box,
  component: Component,
  system: Cpu,
}

const typeColors: Record<string, string> = {
  root: "text-blue-400",
  node: "text-amber-400",
  entity: "text-emerald-400",
  component: "text-purple-400",
  system: "text-red-400",
}

function TreeNode({ node, depth = 0, selected, onSelect }: {
  node: SceneNode; depth?: number; selected: string; onSelect: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(depth < 2)
  const Icon = typeIcons[node.type] || Box
  const hasChildren = node.children.length > 0

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1 px-2 cursor-pointer rounded text-sm hover:bg-accent/50 ${
          selected === node.id ? "bg-accent text-accent-foreground" : ""
        }`}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
        onClick={() => { onSelect(node.id); if (hasChildren) setExpanded(!expanded) }}
      >
        {hasChildren ? (
          expanded ? <ChevronDown className="h-3 w-3 flex-shrink-0" /> : <ChevronRight className="h-3 w-3 flex-shrink-0" />
        ) : (
          <span className="w-3" />
        )}
        <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${typeColors[node.type]}`} />
        <span className="truncate">{node.name}</span>
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map(child => (
            <TreeNode key={child.id} node={child} depth={depth + 1} selected={selected} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  )
}

export function SceneEditor() {
  const [selectedNode, setSelectedNode] = useState("player")

  const findNode = (nodes: SceneNode[], id: string): SceneNode | null => {
    for (const n of nodes) {
      if (n.id === id) return n
      const found = findNode(n.children, id)
      if (found) return found
    }
    return null
  }

  const selected = findNode(SCENE_TREE as SceneNode[], selectedNode)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-12rem)]">
        {/* Scene Hierarchy */}
        <Card className="border-border/50 bg-card/50 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Scene Hierarchy
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-18rem)]">
              <div className="p-2">
                {(SCENE_TREE as SceneNode[]).map(node => (
                  <TreeNode key={node.id} node={node} selected={selectedNode} onSelect={setSelectedNode} />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Viewport */}
        <Card className="border-border/50 bg-card/50 lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">3D Viewport</CardTitle>
              <div className="flex items-center gap-1">
                <button className="p-1.5 rounded hover:bg-accent"><Move className="h-3.5 w-3.5" /></button>
                <button className="p-1.5 rounded hover:bg-accent"><RotateCcw className="h-3.5 w-3.5" /></button>
                <button className="p-1.5 rounded hover:bg-accent"><Maximize className="h-3.5 w-3.5" /></button>
                <button className="p-1.5 rounded hover:bg-accent"><Crosshair className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative h-[calc(100vh-18rem)] rounded-lg bg-black/50 border border-border/30 overflow-hidden">
              {/* Grid */}
              <div className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
                  `,
                  backgroundSize: '40px 40px',
                }}
              />
              {/* Axis lines */}
              <div className="absolute top-1/2 left-0 right-0 h-px bg-red-500/30" />
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-green-500/30" />
              {/* Center indicator */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="w-2 h-2 rounded-full bg-white/50" />
              </div>
              {/* Scene objects */}
              <div className="absolute top-[30%] left-[40%] flex flex-col items-center gap-1">
                <div className="w-8 h-12 border border-emerald-500/50 bg-emerald-500/10 rounded" />
                <span className="text-[9px] text-emerald-400 font-mono">Player</span>
              </div>
              <div className="absolute top-[35%] left-[60%] flex flex-col items-center gap-1">
                <div className="w-6 h-10 border border-amber-500/50 bg-amber-500/10 rounded" />
                <span className="text-[9px] text-amber-400 font-mono">NPC_Guard</span>
              </div>
              <div className="absolute top-[65%] left-[20%] flex flex-col items-center gap-1">
                <div className="w-32 h-4 border border-blue-500/30 bg-blue-500/5 rounded" />
                <span className="text-[9px] text-blue-400 font-mono">Terrain</span>
              </div>
              <div className="absolute top-[15%] left-[50%] flex flex-col items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <span className="text-[9px] text-yellow-400 font-mono">Sun</span>
              </div>
              {/* Gizmo */}
              <div className="absolute bottom-4 left-4 flex flex-col gap-0.5">
                <div className="flex items-center gap-1">
                  <div className="w-8 h-0.5 bg-red-500" /><span className="text-[8px] text-red-400">X</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-8 h-0.5 bg-green-500" /><span className="text-[8px] text-green-400">Y</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-8 h-0.5 bg-blue-500" /><span className="text-[8px] text-blue-400">Z</span>
                </div>
              </div>
              {/* Info overlay */}
              <div className="absolute top-3 left-3 text-[10px] font-mono text-muted-foreground space-y-0.5">
                <p>Perspective | Lit</p>
                <p>Objects: 12 | Tris: 847K</p>
                <p>FPS: 144 | 6.94ms</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Properties */}
        <Card className="border-border/50 bg-card/50 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-18rem)]">
              {selected && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="text-sm font-medium">{selected.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Type</p>
                    <Badge variant="outline" className={typeColors[selected.type]}>{selected.type}</Badge>
                  </div>
                  <Separator />

                  <Tabs defaultValue="transform">
                    <TabsList className="w-full">
                      <TabsTrigger value="transform" className="text-xs flex-1">Transform</TabsTrigger>
                      <TabsTrigger value="components" className="text-xs flex-1">Components</TabsTrigger>
                    </TabsList>
                    <TabsContent value="transform" className="space-y-3 mt-3">
                      {["Position", "Rotation", "Scale"].map((label) => (
                        <div key={label}>
                          <p className="text-xs text-muted-foreground mb-1">{label}</p>
                          <div className="grid grid-cols-3 gap-1">
                            {["X", "Y", "Z"].map((axis) => (
                              <div key={axis} className="rounded border border-border/50 px-2 py-1 text-xs font-mono">
                                <span className={`text-[10px] ${axis === "X" ? "text-red-400" : axis === "Y" ? "text-green-400" : "text-blue-400"}`}>{axis} </span>
                                {label === "Scale" ? "1.0" : "0.0"}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </TabsContent>
                    <TabsContent value="components" className="mt-3">
                      {selected.children.length > 0 ? (
                        <div className="space-y-2">
                          {selected.children.map(child => (
                            <div key={child.id} className="rounded border border-border/50 p-2">
                              <div className="flex items-center gap-2">
                                <Component className={`h-3 w-3 ${typeColors[child.type]}`} />
                                <span className="text-xs font-medium">{child.name}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No child components</p>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
