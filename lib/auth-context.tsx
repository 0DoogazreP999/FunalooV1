"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useUserStore, type RegisteredUser } from "./user-store"

interface AuthContextType {
  user: RegisteredUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<boolean>
  signup: (name: string, email: string, password: string) => Promise<boolean>
  logout: () => void
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

const SESSION_KEY = "funaloo_session"

function saveSession(user: RegisteredUser | null) {
  if (typeof window === "undefined") return

  try {
    if (!user) {
      localStorage.removeItem(SESSION_KEY)
      return
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  } catch {
    // Storage quota exceeded or access denied — session will not persist
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<RegisteredUser | null>(null)
  const [loading, setLoading] = useState(true)
  const { addUser, getUser, users } = useUserStore()

  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY)

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<RegisteredUser>
        const canonical = parsed.email ? getUser(parsed.email) : undefined
        const nextUser = canonical ?? (parsed as RegisteredUser)
        setUser(nextUser)
        saveSession(nextUser)
      } catch {
        localStorage.removeItem(SESSION_KEY)
      }
    }

    setLoading(false)
  }, [getUser])

  useEffect(() => {
    if (!user?.email) return

    const canonicalUser = getUser(user.email)
    if (!canonicalUser) return

    const sessionChanged = JSON.stringify(canonicalUser) !== JSON.stringify(user)
    if (sessionChanged) {
      setUser(canonicalUser)
      saveSession(canonicalUser)
    }
  }, [getUser, user, users])

  const login = async (email: string, _password: string): Promise<boolean> => {
    const normalizedEmail = email.trim().toLowerCase()
    const role = normalizedEmail.includes("admin") ? "admin" as const : "user" as const
    const name = normalizedEmail.split("@")[0]
    const nextUser = addUser(name, normalizedEmail, role)
    setUser(nextUser)
    saveSession(nextUser)
    return true
  }

  const signup = async (name: string, email: string, _password: string): Promise<boolean> => {
    const normalizedEmail = email.trim().toLowerCase()
    const role = normalizedEmail.includes("admin") ? "admin" as const : "user" as const
    const nextUser = addUser(name, normalizedEmail, role)
    setUser(nextUser)
    saveSession(nextUser)
    return true
  }

  const logout = () => {
    setUser(null)
    saveSession(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, isAdmin: user?.role === "admin" }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within AuthProvider")
  return context
}
