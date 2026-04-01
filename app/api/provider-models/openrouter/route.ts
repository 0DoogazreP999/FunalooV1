import { NextResponse } from "next/server"
import {
  getProviderModelCatalog,
  mergeProviderModelCatalogs,
  parseOpenRouterModelCatalog,
} from "@/lib/provider-models"

const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models?output_modalities=text"
const OPENROUTER_CATALOG_REVALIDATE_SECONDS = 60 * 60

export const revalidate = OPENROUTER_CATALOG_REVALIDATE_SECONDS

export async function GET() {
  const fallbackModels = getProviderModelCatalog("openrouter")

  try {
    const response = await fetch(OPENROUTER_MODELS_URL, {
      headers: {
        Accept: "application/json",
      },
      next: {
        revalidate: OPENROUTER_CATALOG_REVALIDATE_SECONDS,
      },
    })

    if (!response.ok) {
      throw new Error(`OpenRouter catalog request failed with ${response.status} ${response.statusText}`)
    }

    const payload = await response.json()
    const liveModels = parseOpenRouterModelCatalog(payload)
    const models = liveModels.length > 0
      ? mergeProviderModelCatalogs(liveModels, fallbackModels)
      : fallbackModels

    return NextResponse.json({
      provider: "openrouter",
      source: liveModels.length > 0 ? "live" : "fallback",
      fetchedAt: new Date().toISOString(),
      totalModels: models.length,
      models,
    }, {
      headers: {
        "Cache-Control": `s-maxage=${OPENROUTER_CATALOG_REVALIDATE_SECONDS}, stale-while-revalidate=86400`,
      },
    })
  } catch (error) {
    return NextResponse.json({
      provider: "openrouter",
      source: "fallback",
      fetchedAt: new Date().toISOString(),
      totalModels: fallbackModels.length,
      models: fallbackModels,
      error: error instanceof Error ? error.message : "Unknown OpenRouter catalog error",
    }, {
      headers: {
        "Cache-Control": `s-maxage=${OPENROUTER_CATALOG_REVALIDATE_SECONDS}, stale-while-revalidate=86400`,
      },
    })
  }
}
