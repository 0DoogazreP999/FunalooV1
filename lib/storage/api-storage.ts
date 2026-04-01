
import type { ProjectId, PromptIntelligenceFragment, UserProject } from "@/lib/engine/types"
import type { RegisteredUser } from "@/lib/user-store"
import type { StoredDashboardState } from "@/lib/project-storage"
import type { StorageAdapter } from "./index"

// ── API-based Storage Adapter ──────────────────────────────────────

export class APIBasedStorageAdapter implements StorageAdapter {
  private get available() {
    return typeof window !== "undefined"
  }

  async getAllUsers(): Promise<RegisteredUser[]> {
    if (!this.available) return []
    try {
      const response = await fetch("/api/storage/users")
      if (!response.ok) {
        return []
      }
      const users = await response.json()
      return users
    } catch (error) {
      return []
    }
  }

  async saveAllUsers(users: RegisteredUser[]): Promise<void> {
    if (!this.available) return
    try {
      await fetch("/api/storage/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(users),
      })
    } catch (error) {
      // Handle error
    }
  }

  async getUser(email: string): Promise<RegisteredUser | undefined> {
    if (!this.available) return undefined
    try {
      const response = await fetch(`/api/storage/user?email=${email}`)
      if (!response.ok) {
        return undefined
      }
      const user = await response.json()
      return user
    } catch (error) {
      return undefined
    }
  }

  async saveUser(user: RegisteredUser): Promise<void> {
    if (!this.available) return
    try {
      await fetch("/api/storage/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(user),
      })
    } catch (error) {
      // Handle error
    }
  }

  async deleteUser(email: string): Promise<void> {
    if (!this.available) return
    try {
      await fetch(`/api/storage/user?email=${email}`, {
        method: "DELETE",
      })
    } catch (error) {
      // Handle error
    }
  }

  async getProjects(userEmail: string): Promise<UserProject[]> {
    if (!this.available) return []
    try {
      const response = await fetch(`/api/storage/projects?userEmail=${userEmail}`)
      if (!response.ok) {
        return []
      }
      const projects = await response.json()
      return projects
    } catch (error) {
      return []
    }
  }

  async saveProjects(userEmail: string, projects: UserProject[]): Promise<void> {
    if (!this.available) return
    try {
      await fetch(`/api/storage/projects?userEmail=${userEmail}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(projects),
      })
    } catch (error) {
      // Handle error
    }
  }

  async deleteProject(email: string, projectId: ProjectId): Promise<{ deleted: boolean; totalLinesRemoved: number }> {
    if (!this.available) return { deleted: false, totalLinesRemoved: 0 }
    try {
      const response = await fetch(`/api/storage/project?email=${email}&projectId=${projectId}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        return { deleted: false, totalLinesRemoved: 0 }
      }
      const result = await response.json()
      return result
    } catch (error) {
      return { deleted: false, totalLinesRemoved: 0 }
    }
  }

  async getDashboardState(email: string): Promise<StoredDashboardState | null> {
    if (!this.available) return null
    try {
      const response = await fetch(`/api/storage/dashboard-state?email=${email}`)
      if (!response.ok) {
        return null
      }
      const state = await response.json()
      return state
    } catch (error) {
      return null
    }
  }

  async saveDashboardState(email: string, state: StoredDashboardState): Promise<void> {
    if (!this.available) return
    try {
      await fetch(`/api/storage/dashboard-state?email=${email}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(state),
      })
    } catch (error) {
      // Handle error
    }
  }

  async getEvolutionFragments(): Promise<PromptIntelligenceFragment[]> {
    if (!this.available) return []
    try {
      const response = await fetch("/api/storage/evolution-fragments")
      if (!response.ok) {
        return []
      }
      const fragments = await response.json()
      return fragments
    } catch (error) {
      return []
    }
  }

  async saveEvolutionFragment(fragment: PromptIntelligenceFragment): Promise<void> {
    if (!this.available) return
    try {
      await fetch("/api/storage/evolution-fragments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fragment),
      })
    } catch (error) {
      // Handle error
    }
  }
}
