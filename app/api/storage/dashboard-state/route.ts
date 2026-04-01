
import { NextResponse } from "next/server"
import { storage } from "@/lib/storage"
import type { StoredDashboardState } from "@/lib/project-storage"

// Get the dashboard state
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get("email")

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }

  try {
    const state = storage.getDashboardState(email)
    if (state) {
      return NextResponse.json(state)
    } else {
      return NextResponse.json({ error: "Dashboard state not found" }, { status: 404 })
    }
  } catch (error) {
    return NextResponse.json({ error: "Failed to retrieve dashboard state" }, { status: 500 })
  }
}

// Save the dashboard state
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get("email")

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }

  try {
    const state = await request.json() as StoredDashboardState
    storage.saveDashboardState(email, state)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to save dashboard state" }, { status: 500 })
  }
}
