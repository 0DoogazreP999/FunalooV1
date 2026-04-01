
import { NextResponse } from "next/server"
import { storage } from "@/lib/storage"
import type { RegisteredUser } from "@/lib/user-store"

// Get all users
export async function GET() {
  try {
    const users = storage.getAllUsers()
    return NextResponse.json(users)
  } catch (error) {
    return NextResponse.json({ error: "Failed to retrieve users" }, { status: 500 })
  }
}

// Save all users
export async function POST(request: Request) {
  try {
    const users = await request.json() as RegisteredUser[]
    storage.saveAllUsers(users)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to save users" }, { status: 500 })
  }
}
