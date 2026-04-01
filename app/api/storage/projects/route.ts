
import { NextResponse } from "next/server"
import { storage } from "@/lib/storage"
import type { UserProject } from "@/lib/engine/types"

// Get projects for a user
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userEmail = searchParams.get("userEmail")

  if (!userEmail) {
    return NextResponse.json({ error: "userEmail is required" }, { status: 400 })
  }

  try {
    const projects = storage.getProjects(userEmail)
    return NextResponse.json(projects)
  } catch (error) {
    return NextResponse.json({ error: "Failed to retrieve projects" }, { status: 500 })
  }
}

// Save projects for a user
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const userEmail = searchParams.get("userEmail")

  if (!userEmail) {
    return NextResponse.json({ error: "userEmail is required" }, { status: 400 })
  }

  try {
    const projects = await request.json() as UserProject[]
    storage.saveProjects(userEmail, projects)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to save projects" }, { status: 500 })
  }
}
