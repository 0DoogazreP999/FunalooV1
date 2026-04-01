
import type { ProjectId, PromptIntelligenceFragment, UserProject } from "@/lib/engine/types"
import type { RegisteredUser } from "@/lib/user-store"
import type { StoredDashboardState } from "@/lib/project-storage"
import { APIBasedStorageAdapter } from "./api-storage"

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

// ── Default instance ─────────────────────────────────────────

export const storage: StorageAdapter = new APIBasedStorageAdapter()
