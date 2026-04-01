
import { z } from "zod"

export const createQuestSchema = z.object({
  userId: z.string(),
  questId: z.string(),
  questData: z.object({}), // You can define a more specific schema for questData
})

export const updateQuestSchema = z.object({
  status: z.enum(["in-progress", "completed", "failed"]),
})

export const addItemToInventorySchema = z.object({
  itemId: z.string(),
  quantity: z.number().min(1),
})

export const removeItemFromInventorySchema = z.object({
  itemId: z.string(),
})
