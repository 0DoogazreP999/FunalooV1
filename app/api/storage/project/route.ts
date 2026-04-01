
import { NextResponse } from "next/server"
import { storage } from "@/lib/storage"

// Delete a project
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get("email")
  const projectId = searchParams.get("projectId")

  if (!email || !projectId) {
    return NextResponse.json({ error: "Email and projectId are required" }, { status: 400 })
  }

  try {
    const result = storage.deleteProject(email, projectId)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 })
  }
}
