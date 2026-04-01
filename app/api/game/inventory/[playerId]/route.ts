
import { NextResponse } from "next/server"
import { handleError } from "@/lib/api-helpers"
import { addItemToInventorySchema, removeItemFromInventorySchema } from "@/lib/validation"

// Get player inventory by ID
export async function GET(request: Request, { params }: { params: { playerId: string } }) {
  try {
    const { playerId } = params

    // In a real implementation, you would retrieve the player inventory from a database
    console.log(`Retrieving inventory for player ${playerId}`)

    // For now, we'll return a mock inventory
    const mockInventory = [
      { itemId: "1", quantity: 1 },
      { itemId: "2", quantity: 5 },
    ]

    return NextResponse.json(mockInventory)
  } catch (error) {
    return handleError(error)
  }
}

// Add an item to a player's inventory
export async function POST(request: Request, { params }: { params: { playerId: string } }) {
  try {
    const { playerId } = params
    const body = await request.json()
    const validation = addItemToInventorySchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(validation.error.issues, { status: 400 })
    }

    const { itemId, quantity } = validation.data

    // In a real implementation, you would add the item to the player's inventory in a database
    console.log(`Adding item ${itemId} with quantity ${quantity} to player ${playerId}'s inventory`)

    return NextResponse.json({ success: true, playerId, itemId, quantity })
  } catch (error) {
    return handleError(error)
  }
}

// Remove an item from a player's inventory
export async function DELETE(request: Request, { params }: { params: { playerId: string } }) {
  try {
    const { playerId } = params
    const body = await request.json()
    const validation = removeItemFromInventorySchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(validation.error.issues, { status: 400 })
    }

    const { itemId } = validation.data

    // In a real implementation, you would remove the item from the player's inventory in a database
    console.log(`Removing item ${itemId} from player ${playerId}'s inventory`)

    return NextResponse.json({ success: true, playerId, itemId })
  } catch (error) {
    return handleError(error)
  }
}
