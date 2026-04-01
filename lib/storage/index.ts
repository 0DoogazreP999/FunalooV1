import type { ProjectId, PromptIntelligenceFragment, UserProject } from "@/lib/engine/types"
import type { RegisteredUser } from "@/lib/user-store"
import type { StoredDashboardState } from "@/lib/project-storage"

// ── Storage Adapter Interface ────────────────────────────────

export interface StorageAdapter {
  getUser(email: string): RegisteredUser | undefined
  saveUser(user: RegisteredUser): void
  getAllUsers(): RegisteredUser[]
  saveAllUsers(users: RegisteredUser[]): void
  deleteUser(email: string): void
  getProjects(userEmail: string): UserProject[]
  saveProjects(userEmail: string, projects: UserProject[]): void
  getDashboardState(email: string): StoredDashboardState | null
  saveDashboardState(email: string, state: StoredDashboardState): void
  deleteProject(email: string, projectId: ProjectId): { deleted: boolean; totalLinesRemoved: number }
  getEvolutionFragments(): PromptIntelligenceFragment[]
  saveEvolutionFragment(fragment: PromptIntelligenceFragment): void
}

// ── Storage Keys ─────────────────────────────────────────────

const USERS_KEY = "funaloo_registered_users"
const PROJECTS_PREFIX = "funaloo_projects"
const DASHBOARD_PREFIX = "funaloo_dashboard_state"
const EVOLUTION_FRAGMENTS_KEY = "funaloo_evolution_fragments"

function projectsKey(email: string) {
  return `${PROJECTS_PREFIX}:${email.toLowerCase()}`
}

function dashboardKey(email: string) {
  return `${DASHBOARD_PREFIX}:${email.toLowerCase()}`
}

// ── LocalStorageAdapter ──────────────────────────────────────

export class LocalStorageAdapter implements StorageAdapter {
  private get available() {
    return typeof window !== "undefined"
  }

  getAllUsers(): RegisteredUser[] {
    if (!this.available) return []
    try {
      const raw = localStorage.getItem(USERS_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  saveAllUsers(users: RegisteredUser[]): void {
    if (!this.available) return
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(users))
    } catch {
      // Quota exceeded
    }
  }

  getUser(email: string): RegisteredUser | undefined {
    const normalized = email.trim().toLowerCase()
    return this.getAllUsers().find(
      (u) => typeof u.email === "string" && (u.email as string).trim().toLowerCase() === normalized,
    )
  }

  saveUser(user: RegisteredUser): void {
    const users = this.getAllUsers()
    const email = (user.email as string).trim().toLowerCase()
    const index = users.findIndex(
      (u) => typeof u.email === "string" && (u.email as string).trim().toLowerCase() === email,
    )
    if (index >= 0) {
      users[index] = user
    } else {
      users.unshift(user)
    }
    this.saveAllUsers(users)
  }

  deleteUser(email: string): void {
    if (!this.available) return
    const normalized = email.trim().toLowerCase()
    const users = this.getAllUsers().filter(
      (u) => typeof u.email === "string" && (u.email as string).trim().toLowerCase() !== normalized,
    )
    this.saveAllUsers(users)
    localStorage.removeItem(projectsKey(email))
    localStorage.removeItem(dashboardKey(email))
  }

  getProjects(userEmail: string): UserProject[] {
    if (!this.available) return []
    try {
      const raw = localStorage.getItem(projectsKey(userEmail))
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  saveProjects(userEmail: string, projects: UserProject[]): void {
    if (!this.available) return
    try {
      localStorage.setItem(projectsKey(userEmail), JSON.stringify(projects))
    } catch {
      // Quota exceeded
    }
  }

  getDashboardState(email: string): StoredDashboardState | null {
    if (!this.available) return null
    try {
      const raw = localStorage.getItem(dashboardKey(email))
      if (!raw) return null
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  saveDashboardState(email: string, state: StoredDashboardState): void {
    if (!this.available) return
    try {
      localStorage.setItem(dashboardKey(email), JSON.stringify(state))
    } catch {
      // Quota exceeded
    }
  }

  deleteProject(email: string, projectId: ProjectId): { deleted: boolean; totalLinesRemoved: number } {
    const projects = this.getProjects(email)
    const target = projects.find((p) => p.id === projectId)
    if (!target) return { deleted: false, totalLinesRemoved: 0 }

    const totalLinesRemoved = target.systems.reduce((sum, sys) => sum + sys.linesGenerated, 0)
    const remaining = projects.filter((p) => p.id !== projectId)

    try {
      this.saveProjects(email, remaining)
    } catch {
      return { deleted: false, totalLinesRemoved: 0 }
    }

    return { deleted: true, totalLinesRemoved }
  }

  getEvolutionFragments(): PromptIntelligenceFragment[] {
    if (!this.available) return []
    try {
      const raw = localStorage.getItem(EVOLUTION_FRAGMENTS_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  saveEvolutionFragment(fragment: PromptIntelligenceFragment): void {
    if (!this.available) return
    try {
      const fragments = this.getEvolutionFragments()
      fragments.unshift(fragment)
      // Cap it at 1000 for local storage performance
      localStorage.setItem(EVOLUTION_FRAGMENTS_KEY, JSON.stringify(fragments.slice(0, 1000)))
    } catch {
      // Quota exceeded
    }
  }
}

// ── MockAdapter (for tests) ──────────────────────────────────

export class MockAdapter implements StorageAdapter {
  private users: RegisteredUser[] = []
  private projectStore = new Map<string, UserProject[]>()
  private dashboardStates = new Map<string, StoredDashboardState>()
  private fragments: PromptIntelligenceFragment[] = []

  getAllUsers(): RegisteredUser[] {
    return [...this.users]
  }

  saveAllUsers(users: RegisteredUser[]): void {
    this.users = [...users]
  }

  getUser(email: string): RegisteredUser | undefined {
    const normalized = email.trim().toLowerCase()
    return this.users.find(
      (u) => (u.email as string).trim().toLowerCase() === normalized,
    )
  }

  saveUser(user: RegisteredUser): void {
    const email = (user.email as string).trim().toLowerCase()
    const index = this.users.findIndex(
      (u) => (u.email as string).trim().toLowerCase() === email,
    )
    if (index >= 0) {
      this.users[index] = user
    } else {
      this.users.unshift(user)
    }
  }

  deleteUser(email: string): void {
    const normalized = email.trim().toLowerCase()
    this.users = this.users.filter(
      (u) => (u.email as string).trim().toLowerCase() !== normalized,
    )
    this.projectStore.delete(normalized)
    this.dashboardStates.delete(normalized)
  }

  getProjects(userEmail: string): UserProject[] {
    return [...(this.projectStore.get(userEmail.toLowerCase()) ?? [])]
  }

  saveProjects(userEmail: string, projects: UserProject[]): void {
    this.projectStore.set(userEmail.toLowerCase(), [...projects])
  }

  getDashboardState(email: string): StoredDashboardState | null {
    return this.dashboardStates.get(email.toLowerCase()) ?? null
  }

  saveDashboardState(email: string, state: StoredDashboardState): void {
    this.dashboardStates.set(email.toLowerCase(), { ...state })
  }

  deleteProject(email: string, projectId: ProjectId): { deleted: boolean; totalLinesRemoved: number } {
    const projects = this.getProjects(email)
    const target = projects.find((p) => p.id === projectId)
    if (!target) return { deleted: false, totalLinesRemoved: 0 }

    const totalLinesRemoved = target.systems.reduce((sum, sys) => sum + sys.linesGenerated, 0)
    this.saveProjects(email, projects.filter((p) => p.id !== projectId))
    return { deleted: true, totalLinesRemoved }
  }

  getEvolutionFragments(): PromptIntelligenceFragment[] {
    return [...this.fragments]
  }

  saveEvolutionFragment(fragment: PromptIntelligenceFragment): void {
    this.fragments.unshift(fragment)
  }
}

// ── Migration Hook ───────────────────────────────────────────

interface MigrationPrimitives {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export type MigrationFn = (primitives: MigrationPrimitives) => void

/**
 * Invoke once at app startup to transform older localStorage shapes.
 * Each migration receives raw read/write primitives to inspect and rewrite storage.
 */
export function runMigrations(migrations: MigrationFn[]): void {
  if (typeof window === "undefined") return

  const primitives: MigrationPrimitives = {
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
    removeItem: (key) => localStorage.removeItem(key),
  }

  for (const migrate of migrations) {
    try {
      migrate(primitives)
    } catch {
      // Migration failed — skip to keep app functional
    }
  }
}

// ── Default instance ─────────────────────────────────────────

export const storage: StorageAdapter = new LocalStorageAdapter()
