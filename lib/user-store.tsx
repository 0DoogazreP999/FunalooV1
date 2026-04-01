"use client"

import { createContext, useCallback, useContext, useState, useEffect, type ReactNode } from "react"
import type { Email, PromptProviderId } from "@/lib/engine/types"
import type {
  ExternalPromptProvider,
  ProviderModelRoutingMap,
  ProviderModelRoutingPolicy,
} from "@/lib/provider-models"
import {
  createEmail,
  createEmptyConnections,
  createEmptyUserAiSettings,
  normalizeUserAiSettings,
  normalizeUserConnections,
} from "@/lib/validators"
import { storage } from "@/lib/storage"

export interface UserConnections {
  discord: string
  twitter: string
  github: string
  linkedin: string
  website: string
}

export interface UserAiSettings {
  defaultProvider: PromptProviderId
  apiKeys: Record<ExternalPromptProvider, string>
  models: Record<ExternalPromptProvider, string>
  modelRouting: Record<ExternalPromptProvider, ProviderModelRoutingMap>
  routingPolicies: Record<ExternalPromptProvider, ProviderModelRoutingPolicy>
  baseUrls: Record<ExternalPromptProvider, string>
  updatedAt: Record<ExternalPromptProvider, string | null>
}

export interface RegisteredUser {
  id: string
  name: string
  email: Email
  role: "user" | "admin"
  signedUpAt: string
  lastLoginAt: string
  projectCount: number
  totalLinesGenerated: number
  avatarUrl: string
  tagline: string
  bio: string
  connections: UserConnections
  aiSettings: UserAiSettings
}

interface UserStoreContextType {
  users: RegisteredUser[]
  addUser: (name: string, email: string, role: "user" | "admin") => RegisteredUser
  updateUser: (id: string, updates: Partial<RegisteredUser>) => RegisteredUser | undefined
  deleteUser: (email: string) => void
  getUser: (email: string) => RegisteredUser | undefined
  totalUsers: number
  totalProjects: number
  totalLines: number
}

const UserStoreContext = createContext<UserStoreContextType | null>(null)

function normalizeUser(user: Partial<RegisteredUser>): RegisteredUser {
  const normalizedEmail = createEmail(typeof user.email === "string" ? user.email : "")
  const signedUpAt = typeof user.signedUpAt === "string" ? user.signedUpAt : new Date().toISOString()

  return {
    id: typeof user.id === "string" && user.id.trim() ? user.id : `user_${Math.random().toString(36).slice(2, 10)}`,
    name: typeof user.name === "string" && user.name.trim() ? user.name : normalizedEmail.split("@")[0] || "Player",
    email: normalizedEmail,
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

export function UserStoreProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<RegisteredUser[]>([])

  useEffect(() => {
    setUsers(storage.getAllUsers().map((user) => normalizeUser(user)))
  }, [])

  const persistUsers = useCallback((next: RegisteredUser[]) => {
    storage.saveAllUsers(next.map((user) => normalizeUser(user)))
  }, [])

  const addUser = useCallback((name: string, email: string, role: "user" | "admin") => {
    const normalizedEmail = createEmail(email)
    let result: RegisteredUser | undefined

    setUsers((prev) => {
      const existing = prev.find((user) => user.email === normalizedEmail)

      if (existing) {
        result = normalizeUser({
          ...existing,
          name: existing.name || name,
          lastLoginAt: new Date().toISOString(),
        })

        const updated = prev.map((user) => (user.email === normalizedEmail ? result! : user))
        persistUsers(updated)
        return updated
      }

      result = normalizeUser({
        id: `user_${Math.random().toString(36).slice(2, 10)}`,
        name,
        email: normalizedEmail,
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

      const updated = [result!, ...prev]
      persistUsers(updated)
      return updated
    })

    return result ?? normalizeUser({ name, email: normalizedEmail, role })
  }, [persistUsers])

  const updateUser = useCallback((id: string, updates: Partial<RegisteredUser>) => {
    let result: RegisteredUser | undefined

    setUsers((prev) => {
      const updated = prev.map((user) => {
        if (user.id !== id) return user

        const normalizedAiSettings = updates.aiSettings
          ? normalizeUserAiSettings(updates.aiSettings)
          : user.aiSettings

        result = normalizeUser({
          ...user,
          ...updates,
          connections: {
            ...user.connections,
            ...normalizeUserConnections(updates.connections),
          },
          aiSettings: normalizeUserAiSettings({
            ...user.aiSettings,
            ...updates.aiSettings,
            apiKeys: {
              ...user.aiSettings.apiKeys,
              ...normalizedAiSettings.apiKeys,
            },
            models: {
              ...user.aiSettings.models,
              ...normalizedAiSettings.models,
            },
            modelRouting: {
              ...user.aiSettings.modelRouting,
              ...normalizedAiSettings.modelRouting,
            },
            routingPolicies: {
              ...user.aiSettings.routingPolicies,
              ...normalizedAiSettings.routingPolicies,
            },
            baseUrls: {
              ...user.aiSettings.baseUrls,
              ...normalizedAiSettings.baseUrls,
            },
            updatedAt: {
              ...user.aiSettings.updatedAt,
              ...normalizedAiSettings.updatedAt,
            },
          }),
        })

        return result!
      })

      persistUsers(updated)
      return updated
    })

    return result
  }, [persistUsers])

  const deleteUser = useCallback((email: string) => {
    const normalizedEmail = createEmail(email)
    setUsers((prev) => {
      const updated = prev.filter((user) => user.email !== normalizedEmail)
      storage.deleteUser(normalizedEmail)
      return updated
    })
  }, [])

  const getUser = useCallback(
    (email: string) => users.find((user) => user.email === createEmail(email)),
    [users],
  )

  return (
    <UserStoreContext.Provider
      value={{
        users,
        addUser,
        updateUser,
        deleteUser,
        getUser,
        totalUsers: users.length,
        totalProjects: users.reduce((sum, user) => sum + user.projectCount, 0),
        totalLines: users.reduce((sum, user) => sum + user.totalLinesGenerated, 0),
      }}
    >
      {children}
    </UserStoreContext.Provider>
  )
}

export function useUserStore() {
  const context = useContext(UserStoreContext)
  if (!context) throw new Error("useUserStore must be used within UserStoreProvider")
  return context
}
