
import { NextResponse } from "next/server"
import { storage } from "@/lib/storage"
import type { PromptIntelligenceFragment } from "@/lib/engine/types"

// Get evolution fragments
export async function GET() {
  try {
    const fragments = storage.getEvolutionFragments()
    return NextResponse.json(fragments)
  } catch (error) {
    return NextResponse.json({ error: "Failed to retrieve evolution fragments" }, { status: 500 })
  }
}

// Save an evolution fragment
export async function POST(request: Request) {
  try {
    const fragment = await request.json() as PromptIntelligenceFragment
    storage.saveEvolutionFragment(fragment)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to save evolution fragment" }, { status: 500 })
  }
}
