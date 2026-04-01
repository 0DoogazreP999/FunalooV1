"use client"

/**
 * Compatibility wrappers — bridge the old useAuth/useUserStore hooks
 * to the new unified AppStore during the migration window.
 *
 * Usage: import { useAuthCompat as useAuth } from "@/lib/store/compat"
 * Drop-in replacement with identical return types.
 */

import { useAppStore } from "@/lib/store/index"
import type { RegisteredUser } from "@/lib/user-store"

/** Drop-in replacement for useAuth() */
export function useAuthCompat() {
  const store = useAppStore()

  return {
    user: store.currentUser,
    loading: store.loading,
    login: store.login,
    signup: store.signup,
    logout: store.logout,
    isAdmin: store.isAdmin,
  }
}

/** Drop-in replacement for useUserStore() */
export function useUserStoreCompat() {
  const store = useAppStore()

  return {
    users: store.users,
    addUser: store.addUser,
    updateUser: store.updateUser,
    getUser: store.getUser,
    totalUsers: store.totalUsers,
    totalProjects: store.totalProjects,
    totalLines: store.totalLines,
  }
}
