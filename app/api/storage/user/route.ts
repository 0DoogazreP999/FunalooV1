
import { NextResponse } from "next/server"
import { storage } from "@/lib/storage"
import type { RegisteredUser } from "@/lib/user-store"

// Get a single user
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get("email")

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }

  try {
    const user = storage.getUser(email)
    if (user) {
      return NextResponse.json(user)
    } else {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
  } catch (error) {
    return NextResponse.json({ error: "Failed to retrieve user" }, { status: 500 })
  }
}

// Save a single user
export async function POST(request: Request) {
  try {
    const user = await request.json() as RegisteredUser
    storage.saveUser(user)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to save user" }, { status: 500 })
  }
}

// Delete a single user
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get("email")

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }

  try {
    storage.deleteUser(email)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}
