
import { NextResponse } from "next/server"
import { handleError } from "@/lib/api-helpers"

// Get the leaderboard
export async function GET() {
  try {
    // In a real implementation, you would retrieve the leaderboard from a database
    const mockLeaderboard = [
      { userId: "1", score: 100 },
      { userId: "2", score: 90 },
      { userId: "3", score: 80 },
    ]

    return NextResponse.json(mockLeaderboard)
  } catch (error) {
    return handleError(error)
  }
}
