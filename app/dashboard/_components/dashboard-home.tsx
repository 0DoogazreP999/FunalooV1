"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, FolderOpen, Play, Trash2 } from "lucide-react"
import { OPEN_SOURCE_ENGINES } from "@/lib/engine/config"
import type { UserProject } from "@/lib/engine/types"
import type { RegisteredUser } from "@/lib/user-store"

interface DashboardHomeProps {
  projects: UserProject[]
  userProfile: RegisteredUser | null
  userName: string | undefined
  onCreateGame: () => void
  onOpenProject: (project: UserProject) => void
  onDeleteProject: (project: UserProject) => void
}

export function DashboardHome({
  projects,
  userProfile,
  userName,
  onCreateGame,
  onOpenProject,
  onDeleteProject,
}: DashboardHomeProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-violet-500/20 bg-gradient-to-r from-violet-600/5 to-fuchsia-600/5 p-6">
        <h2 className="text-2xl font-bold mb-2">Welcome back, {userProfile?.name ?? userName}!</h2>
        <p className="text-muted-foreground mb-4">
          {userProfile?.tagline || "Build your next game with AI-powered code generation."}
        </p>
        <Button onClick={onCreateGame} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white">
          <Plus className="mr-2 h-4 w-4" /> Create New Game
        </Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-border/50 bg-card/50 p-4"><p className="text-xs text-muted-foreground">Projects</p><p className="text-2xl font-mono font-bold">{projects.length}</p></Card>
        <Card className="border-border/50 bg-card/50 p-4"><p className="text-xs text-muted-foreground">Lines Generated</p><p className="text-2xl font-mono font-bold">{projects.reduce((s, p) => s + p.systems.reduce((ss, sys) => ss + sys.linesGenerated, 0), 0).toLocaleString()}</p></Card>
        <Card className="border-border/50 bg-card/50 p-4"><p className="text-xs text-muted-foreground">AI Agents</p><p className="text-2xl font-mono font-bold">9</p></Card>
        <Card className="border-border/50 bg-card/50 p-4"><p className="text-xs text-muted-foreground">Engine Intelligence</p><p className="text-2xl font-mono font-bold">{OPEN_SOURCE_ENGINES.length} engines</p></Card>
      </div>
      <Card className="border-border/50 bg-card/50">
        <CardHeader><CardTitle className="text-sm">Recent Projects</CardTitle></CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No projects yet.</p>
              <Button onClick={onCreateGame} variant="outline" size="sm" className="mt-3"><Plus className="mr-1 h-3 w-3" /> Create Game</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.slice(0, 5).map(p => (
                <div key={p.id} className="rounded-lg border border-border/50 p-3 flex items-center justify-between hover:bg-accent/30 transition-colors">
                  <button onClick={() => onOpenProject(p)} className="flex-1 text-left min-w-0">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.genre.replace(/_/g, " ")} &middot; {p.engine} &middot; {p.multiplayer ? `${p.maxPlayers} players` : "solo"} &middot; {p.systems.length} systems</p>
                  </button>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px]">{p.status}</Badge>
                    <button onClick={() => onDeleteProject(p)} className="rounded-md p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors" title="Delete project">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => onOpenProject(p)} className="rounded-md p-1 text-violet-400 hover:bg-violet-500/10 transition-colors">
                      <Play className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
