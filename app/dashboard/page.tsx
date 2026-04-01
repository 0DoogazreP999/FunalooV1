"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import {
  Plus, FolderOpen, LayoutDashboard,
  ChevronLeft, ChevronRight, LogOut, Shield, Play,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { SidebarProfileCard } from "@/components/account/sidebar-profile-card"
import { useUserStore, type RegisteredUser } from "@/lib/user-store"
import { ensureGenerationProfile } from "@/lib/engine/generation-intelligence"
import type { ProjectId, UserProject } from "@/lib/engine/types"
import { DashboardHome } from "./_components/dashboard-home"
import { ProjectGallery } from "./_components/project-gallery"
import { ProjectCreationFlow } from "./_components/project-creation-flow"
import { ProjectDetailPanel } from "./_components/project-detail-panel"
import {
  deleteProject as deleteProjectFromStorage,
  loadDashboardState,
  loadProjects,
  saveDashboardState,
  saveProjects,
  type DashboardPageId,
} from "@/lib/project-storage"
// ═══════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════

const BRAND_LOGO_SRC = "/brand-logo-cropped.png"

export default function DashboardPage() {
  const { user, logout, isAdmin } = useAuth()
  const { updateUser, getUser } = useUserStore()
  const { toast } = useToast()
  const [projectsLoaded, setProjectsLoaded] = useState(false)
  const [page, setPage] = useState<DashboardPageId>("home")
  const [collapsed, setCollapsed] = useState(false)
  const [projects, setProjects] = useState<UserProject[]>([])
  const [activeProject, setActiveProject] = useState<UserProject | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserProject | null>(null)
  const currentUserProfile = user ? getUser(user.email) ?? user : null
  const activeProjectDesign = activeProject
    ? ensureGenerationProfile({
        existing: activeProject.design,
        prompt: activeProject.description || activeProject.name,
        genre: activeProject.genre,
        features: activeProject.features,
        multiplayer: activeProject.multiplayer,
        maxPlayers: activeProject.maxPlayers,
      })
    : null
  const activeProjectView = activeProject && activeProjectDesign
    ? { ...activeProject, design: activeProjectDesign }
    : null

  // Creation state, callbacks, and timer now live in ProjectCreationFlow component

  useEffect(() => {
    if (!user) {
      setProjects([])
      setActiveProject(null)
      setProjectsLoaded(false)
      return
    }

    const storedProjects = loadProjects(user.email)
    const storedDashboardState = loadDashboardState(user.email)
    const restoredActiveProject = storedProjects.find(
      (project) => project.id === storedDashboardState?.activeProjectId,
    ) ?? storedProjects[0] ?? null

    setProjects(storedProjects)
    setActiveProject(restoredActiveProject)
    setPage(
      storedDashboardState?.page === "game" && !restoredActiveProject
        ? "projects"
        : storedDashboardState?.page ?? "home",
    )
    setProjectsLoaded(true)
  }, [user])

  useEffect(() => {
    if (!user || !projectsLoaded) return
    saveProjects(user.email, projects)
  }, [projects, projectsLoaded, user])

  useEffect(() => {
    if (!user || !projectsLoaded) return

    saveDashboardState(user.email, {
      activeProjectId: activeProject?.id ?? null,
      page: page === "game" && !activeProject ? "projects" : page,
    })
  }, [activeProject, page, projectsLoaded, user])

  useEffect(() => {
    if (page === "game" && !activeProject) {
      setPage(projects.length > 0 ? "projects" : "home")
    }
  }, [activeProject, page, projects.length])

  // Workspace file selection now lives in ProjectDetailPanel

  const openProject = (p: UserProject) => { setActiveProject(p); setPage("game") }

  const updateProject = useCallback((
    projectId: ProjectId,
    updater: (project: UserProject) => UserProject,
  ) => {
    setProjects((prev) => prev.map((project) => project.id === projectId ? updater(project) : project))
    setActiveProject((prev) => prev?.id === projectId ? updater(prev) : prev)
  }, [])

  // updateWorkspaceFile and handleRebuildProject now live in ProjectDetailPanel

  const handleSaveProfile = useCallback((updates: Partial<RegisteredUser>) => {
    if (!currentUserProfile) return

    updateUser(currentUserProfile.id, updates)
    toast({
      title: "Profile updated",
      description: "Your profile photo and creator links are now saved in the sidebar.",
    })
  }, [currentUserProfile, toast, updateUser])

  const handleDeleteProject = useCallback((project: UserProject) => {
    if (!user) return

    const { deleted, totalLinesRemoved } = deleteProjectFromStorage(user.email, project.id)
    if (!deleted) {
      toast({ title: "Delete failed", description: "Could not remove the project. Try again." })
      return
    }

    setProjects((prev) => prev.filter((p) => p.id !== project.id))

    if (activeProject?.id === project.id) {
      setActiveProject(null)
      setPage("projects")
    }

    const stored = getUser(user.email)
    if (stored) {
      updateUser(stored.id, {
        projectCount: Math.max(0, (stored.projectCount ?? 0) - 1),
        totalLinesGenerated: Math.max(0, (stored.totalLinesGenerated ?? 0) - totalLinesRemoved),
      })
    }

    toast({
      title: "Project deleted",
      description: `"${project.name}" and ${totalLinesRemoved.toLocaleString()} lines of generated code have been removed.`,
    })
    setDeleteTarget(null)
  }, [activeProject, getUser, toast, updateUser, user])

  const handleProjectCreated = useCallback((project: UserProject, totalLines: number) => {
    setProjects((prev) => [project, ...prev])
    setActiveProject(project)

    if (user) {
      const stored = getUser(user.email)
      if (stored) {
        updateUser(stored.id, {
          projectCount: (stored.projectCount ?? 0) + 1,
          totalLinesGenerated: (stored.totalLinesGenerated ?? 0) + totalLines,
        })
      }
    }
  }, [getUser, updateUser, user])

  const navItems: { id: DashboardPageId; label: string; icon: React.ElementType }[] = [
    { id: "home", label: "Home", icon: LayoutDashboard },
    { id: "create", label: "Create Game", icon: Plus },
    { id: "projects", label: "My Projects", icon: FolderOpen },
    ...(activeProject ? [{ id: "game" as DashboardPageId, label: activeProject.name.slice(0, 14), icon: Play }] : []),
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className={`flex min-h-0 flex-col border-r border-border/50 bg-sidebar transition-all duration-200 ${collapsed ? "w-[52px]" : "w-[200px]"}`}>
        <div className={`bg-[#000000] py-3 ${collapsed ? "px-2" : "px-3"}`}>
          <div className={`flex items-center ${collapsed ? "justify-center" : ""}`}>
            <Image
              src={BRAND_LOGO_SRC}
              alt="Funaloo"
              width={1025}
              height={493}
              className={collapsed ? "w-8 h-auto" : "w-28 h-auto"}
            />
          </div>
        </div>
        <Separator className="opacity-50" />
        <nav className="flex-1 min-h-0 overflow-y-auto p-2 space-y-0.5">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setPage(item.id)}
              className={`w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${page === item.id ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50"} ${item.id === "game" ? "border border-violet-500/30 bg-violet-500/5" : ""}`}>
              <item.icon className={`h-4 w-4 flex-shrink-0 ${item.id === "game" ? "text-violet-400" : ""}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          ))}
          {isAdmin && (
            <>
              <Separator className="my-2 opacity-50" />
              <Link href="/admin" className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent/50">
                <Shield className="h-4 w-4" />{!collapsed && <span>Admin Panel</span>}
              </Link>
            </>
          )}
        </nav>
        <Separator className="opacity-50" />
        <div className="p-2 space-y-1">
          <SidebarProfileCard
            user={currentUserProfile}
            collapsed={collapsed}
            onSaveProfile={handleSaveProfile}
          />
          <button onClick={logout} className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent/50">
            <LogOut className="h-4 w-4" />{!collapsed && <span>Log Out</span>}
          </button>
          <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-accent/50">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex min-h-0 flex-1 overflow-hidden flex-col">
        <header className="border-b border-border/50 px-6 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold">
            {page === "home" ? "Dashboard" : page === "create" ? "Create New Game" : page === "projects" ? "My Projects" : page === "game" && activeProject ? activeProject.name : "Dashboard"}
          </h1>
          {page === "game" && activeProject && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] capitalize">{activeProject.genre.replace(/_/g, " ")}</Badge>
              <Badge variant="outline" className="text-[10px] uppercase">{activeProject.dimension}</Badge>
              <Badge variant="outline" className="text-[10px] capitalize">{activeProject.engine}</Badge>
              <Badge variant="outline" className="text-[10px]">{activeProject.multiplayer ? `${activeProject.maxPlayers} players` : "solo"}</Badge>
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px]">{activeProject.systems.length} systems</Badge>
            </div>
          )}
        </header>
        <ScrollArea className="flex-1 min-h-0">
          <div className={`min-h-full p-6 ${page === "game" ? "max-w-6xl" : "max-w-5xl"}`}>

            {/* ═══ HOME ═══ */}
            {page === "home" && (
              <DashboardHome
                projects={projects}
                userProfile={currentUserProfile}
                userName={user?.name}
                onCreateGame={() => setPage("create")}
                onOpenProject={openProject}
                onDeleteProject={setDeleteTarget}
              />
            )}

            {/* ═══ CREATE GAME ═══ */}
            {page === "create" && (
              <ProjectCreationFlow
                onProjectCreated={handleProjectCreated}
                onOpenProject={openProject}
                onViewProjects={() => setPage("projects")}
              />
            )}

            {/* ═══ PROJECTS LIST ═══ */}
            {page === "projects" && (
              <ProjectGallery
                projects={projects}
                onCreateGame={() => setPage("create")}
                onOpenProject={openProject}
                onDeleteProject={setDeleteTarget}
                onProjectUpdate={updateProject}
              />
            )}

            {/* ═══ MY GAME — Project Detail + Playable Preview ═══ */}
            {page === "game" && activeProjectView && (
              <ProjectDetailPanel
                project={activeProjectView}
                onBack={() => setPage("projects")}
                onDelete={() => setDeleteTarget(activeProjectView)}
                onProjectUpdate={(updater) => updateProject(activeProjectView.id, updater)}
              />
            )}

          </div>
        </ScrollArea>

      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{deleteTarget?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the project, all {deleteTarget?.systems.length ?? 0} generated systems,
              {" "}{deleteTarget?.systems.reduce((s, sys) => s + sys.linesGenerated, 0).toLocaleString() ?? "0"} lines of code,
              and all asset blueprints. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => { if (deleteTarget) handleDeleteProject(deleteTarget) }}
            >
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
