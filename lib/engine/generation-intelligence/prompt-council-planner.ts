import { GENRE_TEMPLATES } from "@/lib/engine/config"
import type {
  GameDimension,
  GenerationPromptCouncilPlan,
  GenerationCouncilAgent,
  GenerationPromptTier,
  GenerationRuntimeArchetype,
  Genre,
} from "@/lib/engine/types"

function buildAgents(input: {
  genre: Genre
  dimension: GameDimension
  runtimeArchetype: GenerationRuntimeArchetype
  promptSignals: string[]
}) {
  const template = GENRE_TEMPLATES[input.genre]
  const threeD = input.dimension === "3d"

  const agents: GenerationCouncilAgent[] = [
    {
      id: "intent_architect",
      displayName: "Intent Architect",
      mandate: "Lock the brief, preserve the prompt fantasy, and keep the downstream stack from drifting into a safer but wrong template.",
      challengeFocus: ["Prompt ambiguity", "Genre collapse", ...template.councilDebateFocus.slice(0, 2)],
      repairFocus: ["Rewrite the brief contract", "Re-anchor the target fantasy"],
    },
    {
      id: "systems_critic",
      displayName: "Systems Critic",
      mandate: "Argue against shallow mechanics and force the design to expose the real verbs, loops, and failure states the prompt implies.",
      challengeFocus: ["System depth", "Verb clarity", "Progression authenticity"],
      repairFocus: ["Tighten the core loop", "Add missing support systems"],
    },
    {
      id: "runtime_guard",
      displayName: "Runtime Guard",
      mandate: "Defend dimension, camera, and playable-loop fidelity so the runtime does not collapse into the generic fallback shell.",
      challengeFocus: [
        threeD ? "3D camera fidelity" : "2D readability",
        `${input.runtimeArchetype} fidelity`,
        "Playable first-session verbs",
      ],
      repairFocus: ["Swap runtime archetype", "Escalate anti-collapse rules"],
    },
    {
      id: "asset_director",
      displayName: "Asset Director",
      mandate: "Force character, prop, and environment plans to read like the requested game fantasy rather than generic content kits.",
      challengeFocus: ["Visual identity", ...template.assetPriorities.slice(0, 2)],
      repairFocus: ["Rescope asset kits", "Increase silhouette and state readability"],
    },
    {
      id: "player_advocate",
      displayName: "Player Advocate",
      mandate: "Represent the player who will actually play the generated slice and call out boredom, confusion, and mismatch fast.",
      challengeFocus: ["Moment-to-moment feel", "Onboarding clarity", "Player trust"],
      repairFocus: ["Improve readability", "Improve fail-and-retry cadence"],
    },
    {
      id: "scope_referee",
      displayName: "Scope Referee",
      mandate: "Keep the generation inside the time budget by trimming breadth before fantasy fidelity.",
      challengeFocus: ["25-minute budget", "Over-scoping", "Parallelization opportunities"],
      repairFocus: ["Cut optional content", "Preserve first playable slice"],
    },
    {
      id: "repair_synthesizer",
      displayName: "Repair Synthesizer",
      mandate: "Merge the strongest arguments into one corrected generation plan and emit a concrete repair brief.",
      challengeFocus: ["Contradictions across agents", "Unresolved risks", "Missing repair steps"],
      repairFocus: ["Final repair prompt", "Actionable synthesis"],
    },
  ]

  if (input.promptSignals.includes("multiplayer-aware")) {
    agents.push({
      id: "session_choreographer",
      displayName: "Session Choreographer",
      mandate: "Argue for session readability, regroup flow, and multiplayer clarity before the design adds more mechanics.",
      challengeFocus: ["Spawn rhythm", "Regroup readability", "Shared objective pacing"],
      repairFocus: ["Trim multiplayer scope", "Clarify role flow"],
    })
  }

  return agents
}

function buildPromptTiers(input: {
  genre: Genre
  runtimeArchetype: GenerationRuntimeArchetype
  promptSignals: string[]
  agents: GenerationCouncilAgent[]
}) {
  const template = GENRE_TEMPLATES[input.genre]
  const tiers: GenerationPromptTier[] = [
    {
      id: "tier_1_intent_lock",
      name: "Tier 1 Intent Lock",
      objective: "Normalize the brief into a hard contract with explicit genre, dimension, runtime, constraints, and failure watchouts.",
      ownerAgentId: "intent_architect",
      deliverables: ["Prompt contract", "Explicit anti-drift constraints", "Primary and fallback runtime choices"],
      escalationRules: ["If the fantasy is ambiguous, freeze multiple candidate readings and push them to debate instead of guessing silently."],
    },
    {
      id: "tier_2_template_debate",
      name: "Tier 2 Template Debate",
      objective: "Force genre and runtime specialists to argue against template collapse and prove the selected structure fits the prompt.",
      ownerAgentId: "systems_critic",
      deliverables: ["Debated template fit", "Rejected template list", "Missing-system objections"],
      escalationRules: [
        "If a safer genre template wins only because it is easier to generate, escalate to Runtime Guard and Scope Referee before accepting it.",
        ...template.failureWatchouts.slice(0, 2),
      ],
    },
    {
      id: "tier_3_system_and_asset_argument",
      name: "Tier 3 System And Asset Argument",
      objective: "Have systems and asset specialists challenge each other until mechanics, presentation, and UI all support the same fantasy.",
      ownerAgentId: "asset_director",
      deliverables: ["System priorities", "Asset specialist tracks", "UI and readability objections"],
      escalationRules: ["If mechanics and assets describe different fantasies, Repair Synthesizer must reject the pass and rewrite both together."],
    },
    {
      id: "tier_4_scope_and_playable_slice",
      name: "Tier 4 Scope And Playable Slice",
      objective: "Reduce the design to the best first playable slice that still feels like the requested game.",
      ownerAgentId: "scope_referee",
      deliverables: ["25-minute generation slice", "Required systems only", "Cuts deferred to later tiers"],
      escalationRules: ["Never cut the core fantasy before cutting optional breadth, content volume, or polish extras."],
    },
    {
      id: "tier_5_repair_synthesis",
      name: "Tier 5 Repair Synthesis",
      objective: "Merge agent disagreements into one actionable repair prompt for the final generation pass.",
      ownerAgentId: "repair_synthesizer",
      deliverables: ["Repair brief", "Prompt-tier handoff", "Residual risks"],
      escalationRules: ["Any unresolved dimension or runtime mismatch blocks synthesis until Runtime Guard signs off."],
    },
  ]

  if (input.promptSignals.includes("story-heavy")) {
    tiers.splice(3, 0, {
      id: "tier_3b_narrative_coherence",
      name: "Tier 3B Narrative Coherence",
      objective: "Challenge narrative beats, quest flow, and progression handoffs before the final synthesis pass.",
      ownerAgentId: "player_advocate",
      deliverables: ["Quest pacing objections", "Story-state risks", "Narrative repair notes"],
      escalationRules: ["If story beats fight the playable loop, privilege gameplay clarity and rewrite the narrative handoff."],
    })
  }

  return tiers
}

export function buildGenerationPromptCouncilPlan(input: {
  genre: Genre
  dimension: GameDimension
  runtimeArchetype: GenerationRuntimeArchetype
  promptSignals: string[]
}): GenerationPromptCouncilPlan {
  const agents = buildAgents(input)
  const promptTiers = buildPromptTiers({ ...input, agents })

  return {
    orchestrationModel: "Tiered multi-agent debate: specialists argue, a scope referee trims breadth, and a repair synthesizer merges the final generation brief.",
    agents,
    promptTiers,
    adjudicationRules: [
      "Prompt fidelity beats template convenience.",
      "Dimension and runtime mismatches block final synthesis.",
      "Asset, UI, and systems plans must describe the same player fantasy before a pass is accepted.",
      "If multiple specialists disagree, the repair brief must cite the specific conflict instead of smoothing it over.",
    ],
    repairLoop: [
      "Collect objections from every specialist tier.",
      "Sort objections into fantasy drift, runtime drift, asset drift, and over-scope buckets.",
      "Rewrite only the weakest stage first instead of regenerating the whole stack blindly.",
      "Promote repeated failures into permanent anti-collapse rules for the next generation.",
    ],
  }
}
