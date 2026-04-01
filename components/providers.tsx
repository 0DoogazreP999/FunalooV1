"use client"

import { type ReactNode } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import { ErrorBoundary } from "@/components/error-boundary"
import { UserStoreProvider } from "@/lib/user-store"
import { AuthProvider } from "@/lib/auth-context"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <ErrorBoundary>
        <UserStoreProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </UserStoreProvider>
      </ErrorBoundary>
    </ThemeProvider>
  )
}
