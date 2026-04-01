"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import type { Email, ProjectId, UserProject } from "@/lib/engine/types"
import type { RegisteredUser, UserConnections } from "@/lib/user-store"
import type { DashboardPageId, StoredDashboardState } from "@/lib/project-storage"
import {
  createEmail,
  createProjectId,
  createEmptyConnections,
  createEmptyUserAiSettings,
  normalizeUserAiSettings,
  normalizeUserConnections,
} from "@/lib/validators"
import { type PersistenceAdapter, localStorageAdapter } from "./persistence"

// ── Storage keys ─────────────────────────────────────────────

const USERS_KEY = "funaloo_registered_users"
const SESSION_KEY = "funaloo_session"

function projectsKey(email: string) {
  return `funaloo_projects:${email.toLowerCase()}`
}

function dashboardStateKey(email: string) {
  return `funaloo_dashboard_state:${email.toLowerCase()}`
}

// ── Normalization helpers ────────────────────────────────────

function normalizeUser(user: Partial<RegisteredUser>): RegisteredUser {
  const email = createEmail(typeof user.email === "string" ? user.email : "")
  const signedUpAt = typeof user.signedUpAt === "string" ? user.signedUpAt : new Date().toISOString()

  return {
    id: typeof user.id === "string" && user.id.trim() ? user.id : `user_${Math.random().toString(36).slice(2, 10)}`,
    name: typeof user.name === "string" && user.name.trim() ? user.name : email.split("@")[0] || "Player",
    email,
    role: user.role === "admin" ? "admin" : "user",
    signedUpAt,
    lastLoginAt: typeof user.lastLoginAt === "string" ? user.lastLoginAt : signedUpAt,
    projectCount: typeof user.projectCount === "number" ? user.projectCount : 0,
    totalLinesGenerated: typeof user.totalLinesGenerated === "number" ? user.totalLinesGenerated : 0,
    avatarUrl: typeof user.avatarUrl === "string" ? user.avatarUrl : "",
    tagline: typeof user.tagline === "string" ? user.tagline : "",
    bio: typeof user.bio === "string" ? user.bio : "",
    connections: normalizeUserConnections(user.connections),
    aiSettings: normalizeUserAiSettings(user.aiSettings),
  }
}

// ── Store state shape ────────────────────────────────────────

export interface AppState {
  // Auth
  currentUser: RegisteredUser | null
  loading: boolean
  isAdmin: boolean

  // Users
  users: RegisteredUser[]
  totalUsers: number
  totalProjects: number
  totalLines: number
}

export interface AppActions {
  // Auth
  login: (email: string, password: string) => Promise<boolean>
  signup: (name: string, email: string, password: string) => Promise<boolean>
  logout: () => void

  // Users
  addUser: (name: string, email: string, role: "user" | "admin") => RegisteredUser
  updateUser: (id: string, updates: Partial<RegisteredUser>) => RegisteredUser | undefined
  getUser: (email: string) => RegisteredUser | undefined

  // Projects (scoped to currentUser)
  listProjects: () => UserProject[]
  loadDashboardState: () => StoredDashboardState | null
  saveDashboardState: (state: StoredDashboardState) => void
  saveProjects: (projects: UserProject[]) => void
  deleteProject: (projectId: ProjectId) => { deleted: boolean; totalLinesRemoved: number }
}

export type AppStore = AppState & AppActions

// ── Context ──────────────────────────────────────────────────

const AppStoreContext = createContext<AppStore | null>(null)

// ── Provider ─────────────────────────────────────────────────

export function AppStoreProvider({
  children,
  adapter = localStorageAdapter,
}: {
  children: ReactNode
  adapter?: PersistenceAdapter
}) {
  const [users, setUsers] = useState<RegisteredUser[]>([])
  const [currentUser, setCurrentUser] = useState<RegisteredUser | null>(null)
  const [loading, setLoading] = useState(true)

  // ── Persistence helpers (closed over adapter) ──────────

  const persistUsers = useCallback(
    (next: RegisteredUser[]) => {
      adapter.setItem(USERS_KEY, JSON.stringify(next.map(normalizeUser)))
    },
    [adapter],
  )

  const persistSession = useCallback(
    (user: RegisteredUser | null) => {
      if (!user) {
        adapter.removeItem(SESSION_KEY)
      } else {
        adapter.setItem(SESSION_KEY, JSON.stringify(user))
      }
    },
    [adapter],
  )

  // ── Initialization (SSR-safe) ──────────────────────────

  useEffect(() => {
    // Load users
    let loadedUsers: RegisteredUser[] = []
    try {
      const raw = adapter.getItem(USERS_KEY)
      const parsed = raw ? JSON.parse(raw) : []
      loadedUsers = Array.isArray(parsed) ? parsed.map(normalizeUser) : []
    } catch {
      loadedUsers = []
    }
    setUsers(loadedUsers)

    // Restore session
    const storedSession = adapter.getItem(SESSION_KEY)
    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession) as Partial<RegisteredUser>
        const canonical = parsed.email
          ? loadedUsers.find((u) => u.email === createEmail(parsed.email as string))
          : undefined
        const restored = canonical ?? normalizeUser(parsed)
        setCurrentUser(restored)
        persistSession(restored)
      } catch {
        adapter.removeItem(SESSION_KEY)
      }
    }

    setLoading(false)
  }, [adapter, persistSession])

  // Sync currentUser with canonical user store
  useEffect(() => {
    if (!currentUser?.email) return

    const canonical = users.find((u) => u.email === currentUser.email)
    if (!canonical) return

    if (JSON.stringify(canonical) !== JSON.stringify(currentUser)) {
      setCurrentUser(canonical)
      persistSession(canonical)
    }
  }, [currentUser, persistSession, users])

  // ── User actions ───────────────────────────────────────

  const addUser = useCallback(
    (name: string, email: string, role: "user" | "admin"): RegisteredUser => {
      const branded = createEmail(email)
      let result: RegisteredUser | undefined

      setUsers((prev) => {
        const existing = prev.find((u) => u.email === branded)

        if (existing) {
          result = normalizeUser({
            ...existing,
            name: existing.name || name,
            lastLoginAt: new Date().toISOString(),
          })
          const next = prev.map((u) => (u.email === branded ? result! : u))
          persistUsers(next)
          return next
        }

        result = normalizeUser({
          id: `user_${Math.random().toString(36).slice(2, 10)}`,
          name,
          email: branded,
          role,
          signedUpAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          projectCount: 0,
          totalLinesGenerated: 0,
          avatarUrl: "",
          tagline: "",
          bio: "",
          connections: createEmptyConnections(),
          aiSettings: createEmptyUserAiSettings(),
        })

        const next = [result!, ...prev]
        persistUsers(next)
        return next
      })

      return result ?? normalizeUser({ name, email: branded, role })
    },
    [persistUsers],
  )

  const updateUser = useCallback(
    (id: string, updates: Partial<RegisteredUser>): RegisteredUser | undefined => {
      let result: RegisteredUser | undefined

      setUsers((prev) => {
        const next = prev.map((u) => {
          if (u.id !== id) return u
          const normalizedAiSettings = updates.aiSettings
            ? normalizeUserAiSettings(updates.aiSettings)
            : u.aiSettings
          result = normalizeUser({
            ...u,
            ...updates,
            connections: { ...u.connections, ...normalizeUserConnections(updates.connections) },
            aiSettings: normalizeUserAiSettings({
              ...u.aiSettings,
              ...updates.aiSettings,
              apiKeys: {
                ...u.aiSettings.apiKeys,
                ...normalizedAiSettings.apiKeys,
              },
              models: {
                ...u.aiSettings.models,
                ...normalizedAiSettings.models,
              },
              modelRouting: {
                ...u.aiSettings.modelRouting,
                ...normalizedAiSettings.modelRouting,
              },
              routingPolicies: {
                ...u.aiSettings.routingPolicies,
                ...normalizedAiSettings.routingPolicies,
              },
              baseUrls: {
                ...u.aiSettings.baseUrls,
                ...normalizedAiSettings.baseUrls,
              },
              updatedAt: {
                ...u.aiSettings.updatedAt,
                ...normalizedAiSettings.updatedAt,
              },
            }),
          })
          return result!
        })
        persistUsers(next)
        return next
      })

      return result
    },
    [persistUsers],
  )

  const getUser = useCallback(
    (email: string): RegisteredUser | undefined =>
      users.find((u) => u.email === createEmail(email)),
    [users],
  )

  // ── Auth actions ───────────────────────────────────────

  const login = useCallback(
    async (email: string, _password: string): Promise<boolean> => {
      const normalized = email.trim().toLowerCase()
      const role = normalized.includes("admin") ? ("admin" as const) : ("user" as const)
      const name = normalized.split("@")[0]
      const user = addUser(name, normalized, role)
      setCurrentUser(user)
      persistSession(user)
      return true
    },
    [addUser, persistSession],
  )

  const signup = useCallback(
    async (name: string, email: string, _password: string): Promise<boolean> => {
      const normalized = email.trim().toLowerCase()
      const role = normalized.includes("admin") ? ("admin" as const) : ("user" as const)
      const user = addUser(name, normalized, role)
      setCurrentUser(user)
      persistSession(user)
      return true
    },
    [addUser, persistSession],
  )

  const logout = useCallback(() => {
    setCurrentUser(null)
    persistSession(null)
  }, [persistSession])

  // ── Project actions (scoped to currentUser) ────────────

  const listProjects = useCallback((): UserProject[] => {
    if (!currentUser) return []
    try {
      const raw = adapter.getItem(projectsKey(currentUser.email))
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }, [adapter, currentUser])

  const saveProjects = useCallback(
    (projects: UserProject[]) => {
      if (!currentUser) return
      adapter.setItem(projectsKey(currentUser.email), JSON.stringify(projects))
    },
    [adapter, currentUser],
  )

  const loadDashboardStateFn = useCallback((): StoredDashboardState | null => {
    if (!currentUser) return null
    try {
      const raw = adapter.getItem(dashboardStateKey(currentUser.email))
      if (!raw) return null
      const parsed = JSON.parse(raw)
      return {
        activeProjectId:
          typeof parsed?.activeProjectId === "string" && parsed.activeProjectId.trim()
            ? (parsed.activeProjectId as ProjectId)
            : null,
        page:
          parsed?.page === "home" || parsed?.page === "create" || parsed?.page === "projects" || parsed?.page === "game"
            ? parsed.page
            : "home",
      }
    } catch {
      return null
    }
  }, [adapter, currentUser])

  const saveDashboardStateFn = useCallback(
    (state: StoredDashboardState) => {
      if (!currentUser) return
      try {
        adapter.setItem(
          dashboardStateKey(currentUser.email),
          JSON.stringify({ activeProjectId: state.activeProjectId, page: state.page }),
        )
      } catch {
        // Quota exceeded
      }
    },
    [adapter, currentUser],
  )

  const deleteProjectFn = useCallback(
    (projectId: ProjectId): { deleted: boolean; totalLinesRemoved: number } => {
      if (!currentUser) return { deleted: false, totalLinesRemoved: 0 }

      const all = listProjects()
      const target = all.find((p) => p.id === projectId)
      if (!target) return { deleted: false, totalLinesRemoved: 0 }

      const totalLinesRemoved = target.systems.reduce((sum, sys) => sum + sys.linesGenerated, 0)
      const remaining = all.filter((p) => p.id !== projectId)

      try {
        adapter.setItem(projectsKey(currentUser.email), JSON.stringify(remaining))
      } catch {
        return { deleted: false, totalLinesRemoved: 0 }
      }

      return { deleted: true, totalLinesRemoved }
    },
    [adapter, currentUser, listProjects],
  )

  // ── Computed state ─────────────────────────────────────

  const isAdmin = currentUser?.role === "admin"
  const totalUsers = users.length
  const totalProjects = users.reduce((sum, u) => sum + u.projectCount, 0)
  const totalLines = users.reduce((sum, u) => sum + u.totalLinesGenerated, 0)

  // ── Context value ──────────────────────────────────────

  const value: AppStore = {
    // State
    currentUser,
    loading,
    isAdmin,
    users,
    totalUsers,
    totalProjects,
    totalLines,

    // Auth actions
    login,
    signup,
    logout,

    // User actions
    addUser,
    updateUser,
    getUser,

    // Project actions
    listProjects,
    loadDashboardState: loadDashboardStateFn,
    saveDashboardState: saveDashboardStateFn,
    saveProjects,
    deleteProject: deleteProjectFn,
  }

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
}

// ── Hook ─────────────────────────────────────────────────────

export function useAppStore(): AppStore {
  const context = useContext(AppStoreContext)
  if (!context) throw new Error("useAppStore must be used within AppStoreProvider")
  return context
}
