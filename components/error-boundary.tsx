"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Funaloo] Uncaught render error:", error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center max-w-md">
              <p className="text-lg font-semibold text-foreground mb-2">Something went wrong</p>
              <p className="text-sm text-muted-foreground mb-4">
                An unexpected error occurred. Try refreshing the page.
              </p>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="rounded-md bg-violet-600 px-4 py-2 text-sm text-white hover:bg-violet-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}
