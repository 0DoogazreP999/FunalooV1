import type { CSSProperties } from "react"
import type { UserProject } from "@/lib/engine/types"

export interface RuntimeGraphicsPresentation {
  canvasWrapperClassName: string
  canvasClassName: string
  canvasStyle: CSSProperties
  objectiveClassName: string
  infoClassName: string
  boardClassName: string
}

export function getRuntimeGraphicsPresentation(
  project: Pick<UserProject, "dimension" | "design">,
): RuntimeGraphicsPresentation {
  const presentation = project.design.graphicsPlan?.runtimePresentation

  if (presentation === "hazard_pressure") {
    return {
      canvasWrapperClassName: "overflow-hidden rounded-xl border border-rose-500/20 bg-slate-950 shadow-[0_0_60px_rgba(244,63,94,0.18)]",
      canvasClassName: "block h-auto w-full touch-none bg-black",
      canvasStyle: { imageRendering: project.dimension === "3d" ? "auto" : "pixelated" },
      objectiveClassName: "rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-sm text-muted-foreground",
      infoClassName: "rounded-lg border border-slate-500/30 bg-slate-950/40 p-3 text-sm text-muted-foreground",
      boardClassName: "rounded-lg border border-rose-500/20 bg-slate-950/40 p-4",
    }
  }

  if (presentation === "expedition_survival") {
    return {
      canvasWrapperClassName: "overflow-hidden rounded-xl border border-amber-500/25 bg-slate-950 shadow-[0_0_70px_rgba(245,158,11,0.16)]",
      canvasClassName: "block h-auto w-full touch-none bg-[#05070b]",
      canvasStyle: { imageRendering: "auto" },
      objectiveClassName: "rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-muted-foreground",
      infoClassName: "rounded-lg border border-amber-500/15 bg-slate-950/50 p-3 text-sm text-muted-foreground",
      boardClassName: "rounded-lg border border-amber-500/20 bg-slate-950/50 p-4",
    }
  }

  if (presentation === "cinematic_assault") {
    return {
      canvasWrapperClassName: "overflow-hidden rounded-xl border border-sky-500/25 bg-slate-950 shadow-[0_0_70px_rgba(56,189,248,0.16)]",
      canvasClassName: "block h-auto w-full touch-none bg-[#02040a]",
      canvasStyle: { imageRendering: "auto" },
      objectiveClassName: "rounded-lg border border-sky-500/20 bg-sky-500/5 p-3 text-sm text-muted-foreground",
      infoClassName: "rounded-lg border border-sky-500/15 bg-slate-950/50 p-3 text-sm text-muted-foreground",
      boardClassName: "rounded-lg border border-sky-500/20 bg-slate-950/50 p-4",
    }
  }

  if (presentation === "warm_simulation") {
    return {
      canvasWrapperClassName: "overflow-hidden rounded-xl border border-emerald-500/20 bg-emerald-950/20 shadow-[0_0_60px_rgba(16,185,129,0.14)]",
      canvasClassName: "block h-auto w-full bg-[#08120c]",
      canvasStyle: { imageRendering: "pixelated" },
      objectiveClassName: "rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-muted-foreground",
      infoClassName: "rounded-lg border border-emerald-500/15 bg-emerald-950/20 p-3 text-sm text-muted-foreground",
      boardClassName: "rounded-lg border border-emerald-500/20 bg-emerald-950/15 p-4",
    }
  }

  if (presentation === "social_readability") {
    return {
      canvasWrapperClassName: "overflow-hidden rounded-xl border border-violet-500/20 bg-violet-950/20 shadow-[0_0_60px_rgba(139,92,246,0.14)]",
      canvasClassName: "block h-auto w-full touch-none bg-[#09070f]",
      canvasStyle: { imageRendering: "pixelated" },
      objectiveClassName: "rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 text-sm text-muted-foreground",
      infoClassName: "rounded-lg border border-violet-500/15 bg-violet-950/20 p-3 text-sm text-muted-foreground",
      boardClassName: "rounded-lg border border-violet-500/20 bg-violet-950/15 p-4",
    }
  }

  if (presentation === "logic_chambers") {
    return {
      canvasWrapperClassName: "overflow-hidden rounded-xl border border-cyan-500/20 bg-cyan-950/20 shadow-[0_0_60px_rgba(6,182,212,0.14)]",
      canvasClassName: "block h-auto w-full touch-none bg-[#040b0f]",
      canvasStyle: { imageRendering: project.dimension === "3d" ? "auto" : "pixelated" },
      objectiveClassName: "rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 text-sm text-muted-foreground",
      infoClassName: "rounded-lg border border-cyan-500/15 bg-cyan-950/20 p-3 text-sm text-muted-foreground",
      boardClassName: "rounded-lg border border-cyan-500/20 bg-cyan-950/15 p-4",
    }
  }

  if (presentation === "clean_competitive") {
    return {
      canvasWrapperClassName: "overflow-hidden rounded-xl border border-sky-500/20 bg-sky-950/20 shadow-[0_0_60px_rgba(14,165,233,0.14)]",
      canvasClassName: "block h-auto w-full touch-none bg-[#050c16]",
      canvasStyle: { imageRendering: project.dimension === "3d" ? "auto" : "pixelated" },
      objectiveClassName: "rounded-lg border border-sky-500/20 bg-sky-500/5 p-3 text-sm text-muted-foreground",
      infoClassName: "rounded-lg border border-sky-500/15 bg-sky-950/20 p-3 text-sm text-muted-foreground",
      boardClassName: "rounded-lg border border-sky-500/20 bg-sky-950/15 p-4",
    }
  }

  return {
    canvasWrapperClassName: "overflow-hidden rounded-xl border border-border/50 bg-black/30 shadow-2xl",
    canvasClassName: "block h-auto w-full touch-none bg-black",
    canvasStyle: { imageRendering: project.dimension === "3d" ? "auto" : "pixelated" },
    objectiveClassName: "rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 text-sm text-muted-foreground",
    infoClassName: "rounded-lg border border-border/50 bg-card/50 p-3 text-sm text-muted-foreground",
    boardClassName: "rounded-lg border border-border/50 bg-card/50 p-4",
  }
}
