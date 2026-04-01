"use client"

import Image from "next/image"
import { useState } from "react"
import Link from "next/link"
import { SidebarProfileCard } from "@/components/account/sidebar-profile-card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import {
  LayoutDashboard, Activity, Users, Brain, Search, Zap, Layers,
  Boxes, FolderOpen, Settings, ChevronLeft, ChevronRight, Hexagon,
  ArrowLeft, LogOut, Mail,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useUserStore, type RegisteredUser } from "@/lib/user-store"
import { Dashboard } from "@/components/nexus/dashboard"
import { EngineControl } from "@/components/nexus/engine-control"
import { AgentFleet } from "@/components/nexus/agent-fleet"
import { BrainMonitor } from "@/components/nexus/brain-monitor"
import { ResearchPanel } from "@/components/nexus/research-panel"
import { TrainingPanel } from "@/components/nexus/training-panel"
import { GenerationPanel } from "@/components/nexus/generation-panel"
import { SceneEditor } from "@/components/nexus/scene-editor"
import { AssetPipeline } from "@/components/nexus/asset-pipeline"
import { SettingsPanel } from "@/components/nexus/settings-panel"
import { UsersPanel } from "@/components/nexus/users-panel"

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, section: "overview" },
  { id: "users", label: "Users", icon: Mail, section: "overview" },
  { id: "engine", label: "Engine Control", icon: Activity, section: "overview" },
  { id: "agents", label: "Agent Fleet", icon: Users, section: "ai" },
  { id: "brain", label: "Brain Monitor", icon: Brain, section: "ai" },
  { id: "research", label: "Research", icon: Search, section: "pipeline" },
  { id: "training", label: "Training", icon: Zap, section: "pipeline" },
  { id: "generation", label: "Generation", icon: Layers, section: "pipeline" },
  { id: "scene", label: "Scene Editor", icon: Boxes, section: "editor" },
  { id: "assets", label: "Asset Pipeline", icon: FolderOpen, section: "editor" },
  { id: "settings", label: "Settings", icon: Settings, section: "config" },
]

const sections: Record<string, string> = {
  overview: "Overview",
  ai: "AI Engine",
  pipeline: "Pipeline",
  editor: "Editor",
  config: "Config",
}

const panels: Record<string, React.ComponentType> = {
  dashboard: Dashboard,
  users: UsersPanel,
  engine: EngineControl,
  agents: AgentFleet,
  brain: BrainMonitor,
  research: ResearchPanel,
  training: TrainingPanel,
  generation: GenerationPanel,
  scene: SceneEditor,
  assets: AssetPipeline,
  settings: SettingsPanel,
}

export default function AdminPage() {
  const [activePage, setActivePage] = useState("dashboard")
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuth()
  const { getUser, updateUser } = useUserStore()
  const { toast } = useToast()
  const currentUserProfile = user ? getUser(user.email) ?? user : null

  const handleSaveProfile = (updates: Partial<RegisteredUser>) => {
    if (!currentUserProfile) return

    updateUser(currentUserProfile.id, updates)
    toast({
      title: "Profile updated",
      description: "Your admin profile card was updated.",
    })
  }

  const ActivePanel = panels[activePage] || Dashboard
  const activeItem = navItems.find(n => n.id === activePage)

  let lastSection = ""

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <aside className={`flex flex-col border-r border-border/50 bg-sidebar transition-all duration-200 ${collapsed ? "w-[52px]" : "w-[240px]"}`}>
        <div className={`bg-[#000000] py-3 ${collapsed ? "px-2" : "px-3"}`}>
          <div className={`flex items-center ${collapsed ? "justify-center" : ""}`}>
            <Image
              src="/brand-logo-cropped.png"
              alt="Funaloo"
              width={1025}
              height={493}
              className={collapsed ? "w-8 h-auto" : "w-28 h-auto"}
            />
          </div>
        </div>
        <Separator className="opacity-50" />

        {/* Back to Dashboard */}
        <div className="px-2 pt-2">
          <Link href="/dashboard" className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent/50 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {!collapsed && <span>Exit to App</span>}
          </Link>
        </div>

        <ScrollArea className="flex-1 py-2">
          <nav className="space-y-0.5 px-2">
            {navItems.map((item) => {
              const showSection = item.section !== lastSection
              lastSection = item.section
              return (
                <div key={item.id}>
                  {showSection && !collapsed && (
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 pt-3 pb-1">
                      {sections[item.section]}
                    </p>
                  )}
                  {showSection && collapsed && <div className="pt-2" />}
                  <button onClick={() => setActivePage(item.id)}
                    className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${activePage === item.id ? "bg-accent text-accent-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"}`}
                    title={collapsed ? item.label : undefined}>
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>
                </div>
              )
            })}
          </nav>
        </ScrollArea>

        <Separator className="opacity-50" />
        <div className="p-2 space-y-2">
          {!collapsed && (
            <div className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-1.5">
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <div className="absolute inset-0 h-1.5 w-1.5 animate-ping rounded-full bg-emerald-500/50" />
                </div>
                <span className="text-[10px] text-emerald-400 font-mono">SYSTEM ACTIVE</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Funaloo Core v0.1.0</p>
            </div>
          )}
          <SidebarProfileCard
            user={currentUserProfile}
            collapsed={collapsed}
            onSaveProfile={handleSaveProfile}
          />
          <button onClick={logout} className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent/50 transition-colors">
            <LogOut className="h-4 w-4" />{!collapsed && <span>Log Out</span>}
          </button>
          <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <header className="flex items-center justify-between border-b border-border/50 px-6 py-3 bg-card">
          <div className="flex items-center gap-3">
            {activeItem && <activeItem.icon className="h-5 w-5 text-muted-foreground" />}
            <h1 className="text-lg font-semibold tracking-tight">{activeItem?.label || "Dashboard"}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px] opacity-70">v0.1.0</Badge>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 font-mono text-[10px]">PRODUCTION</Badge>
            <Badge variant="secondary" className="font-mono text-[10px]">ADMIN</Badge>
          </div>
        </header>
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-6 max-w-7xl mx-auto min-h-full">
            <ActivePanel />
          </div>
        </ScrollArea>
      </main>
    </div>
  )
}
