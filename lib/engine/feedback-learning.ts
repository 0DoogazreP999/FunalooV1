import type {
  GenerationFeedbackScoreBand,
  ProjectFeedbackDigest,
  ProjectFeedbackIssueSignal,
  ProjectFeedbackLearningReport,
  ProjectGenerationFeedback,
  ProjectGenerationRepairPlan,
  ProjectSourceRepairTarget,
  UserProject,
} from "@/lib/engine/types"

type RepairFocusArea =
  | "prompt_stack"
  | "runtime_component"
  | "generated_system"
  | "ui_layer"
  | "asset_pipeline"
  | "world_logic"
  | "tests"

interface FeedbackThemeRule {
  id: string
  label: string
  pattern: RegExp
  priority: string
  promptFix: string
  runtimeFix: string
  sourceFix: string
  evalHint: string
  focusAreas: RepairFocusArea[]
  preferredSystems?: string[]
}

export const FEEDBACK_SCORE_OPTIONS: Array<{
  band: GenerationFeedbackScoreBand
  label: string
  description: string
}> = [
  { band: "failed", label: "Failed", description: "The generation missed the brief badly or was not really playable." },
  { band: "1-2", label: "1-2", description: "Very weak fit with serious issues." },
  { band: "3-4", label: "3-4", description: "Some intent showed up, but the result still felt wrong." },
  { band: "5-6", label: "5-6", description: "Playable and partially aligned, but still average or generic." },
  { band: "7-8", label: "7-8", description: "Strong result with room for improvement." },
  { band: "9-10", label: "9-10", description: "Excellent fit and worth using as a positive training example." },
]

const FEEDBACK_THEME_RULES: FeedbackThemeRule[] = [
  {
    id: "dimension_fidelity",
    label: "Dimension fidelity",
    pattern: /2d|3d|first[- ]person|third[- ]person|camera|top[- ]down|side[- ]scroll|isometric/i,
    priority: "Strengthen dimension and camera lock before runtime selection.",
    promptFix: "Escalate Runtime Guard when the brief mentions a specific dimension or camera model.",
    runtimeFix: "Verify the playable runtime matches the requested camera, dimension, and first-session verbs.",
    sourceFix: "Patch runtime routing and camera-specific interaction logic before expanding content breadth.",
    evalHint: "Add a regression eval that checks requested dimension and camera against the saved runtime contract.",
    focusAreas: ["prompt_stack", "runtime_component", "tests"],
    preferredSystems: ["rendering", "physics", "ui"],
  },
  {
    id: "genre_collapse",
    label: "Genre collapse",
    pattern: /generic|same game|same thing|shooter|wrong genre|not what i asked|collapse|defaulted/i,
    priority: "Protect prompt fantasy from falling back to the default combat template.",
    promptFix: "Increase template debate pressure and require rejected-template reasoning.",
    runtimeFix: "Block runtime fallback when the selected archetype contradicts the brief's genre fantasy.",
    sourceFix: "Patch archetype routing, anti-collapse rules, and first-playable loop selection together.",
    evalHint: "Add an eval set for unusual briefs that should not collapse into the dominant runtime template.",
    focusAreas: ["prompt_stack", "runtime_component", "tests"],
    preferredSystems: ["combat", "world_gen", "ui"],
  },
  {
    id: "system_depth",
    label: "System depth",
    pattern: /shallow|thin|depth|mechanic|systems|progression|content|repetitive|loop/i,
    priority: "Increase system specificity before generation starts.",
    promptFix: "Have Systems Critic demand explicit core verbs, progression, and support loops.",
    runtimeFix: "Ensure the first playable slice demonstrates at least one support loop and one progression hook.",
    sourceFix: "Patch the highest-pressure generated systems before adding more optional content packs.",
    evalHint: "Add an eval that scores whether the output includes core loop, support loop, and progression evidence.",
    focusAreas: ["prompt_stack", "generated_system", "tests"],
    preferredSystems: ["inventory", "combat", "world_gen", "ai_npc", "ui"],
  },
  {
    id: "asset_fidelity",
    label: "Asset fidelity",
    pattern: /asset|art|visual|animation|model|environment|look|style|fidelity|polish/i,
    priority: "Improve specialist asset tracks and visual identity checks.",
    promptFix: "Raise Asset Director objections when silhouettes, kits, or state variants feel generic.",
    runtimeFix: "Keep readable landmarking, animation intent, and stateful visual cues visible in the playable slice.",
    sourceFix: "Patch the asset planner, source inspiration rules, and presentation-facing runtime hooks together.",
    evalHint: "Add a visual fidelity grader for silhouette clarity, environment identity, and state readability.",
    focusAreas: ["asset_pipeline", "runtime_component", "tests"],
    preferredSystems: ["rendering", "audio", "ui"],
  },
  {
    id: "ui_controls",
    label: "UI and controls",
    pattern: /ui|hud|controls|confusing|readable|menu|feedback|tutorial|onboarding/i,
    priority: "Tighten onboarding, HUD clarity, and affordance feedback.",
    promptFix: "Add a player-advocate review pass focused on clarity and control teaching.",
    runtimeFix: "Teach verbs faster and surface goal state, damage state, and next-action cues earlier.",
    sourceFix: "Patch runtime UI surfaces, interaction prompts, and the generated UI system before adding more mechanics.",
    evalHint: "Add a grader for onboarding clarity, HUD readability, and affordance feedback within the first session.",
    focusAreas: ["ui_layer", "generated_system", "tests"],
    preferredSystems: ["ui", "inventory", "combat"],
  },
  {
    id: "runtime_stability",
    label: "Runtime stability",
    pattern: /bug|broken|crash|lag|performance|glitch|stuck|freeze|unstable/i,
    priority: "Prioritize stability and fail-safe loops before adding more content breadth.",
    promptFix: "Promote stability issues into verification gates and trim optional content earlier.",
    runtimeFix: "Add safety rails around fail states, state resets, and overloaded runtime transitions.",
    sourceFix: "Patch the runtime shell and the highest-risk generated systems, then add regression tests before further expansion.",
    evalHint: "Add runtime stability checks to the prompt eval suite and gate new prompt versions on them.",
    focusAreas: ["runtime_component", "generated_system", "tests"],
    preferredSystems: ["networking", "physics", "ai_npc", "ui"],
  },
  {
    id: "survival_pressure",
    label: "Survival pressure",
    pattern: /zombie|horde|survival|scavenge|shelter|night|repair|endurance/i,
    priority: "Keep scavenging, endurance, and shelter loops visible in the first playable slice.",
    promptFix: "Require survival prompts to ship with hostile-pressure, resource, and repair verbs intact.",
    runtimeFix: "Strengthen day-night pacing, resource attrition, and shelter repair pressure in the runtime contract.",
    sourceFix: "Patch survival runtime flow, world pressure hooks, and inventory or repair systems together.",
    evalHint: "Add survival-specific eval prompts that check scavenging, shelter repair, and horde escalation.",
    focusAreas: ["runtime_component", "generated_system", "world_logic", "prompt_stack", "tests"],
    preferredSystems: ["inventory", "combat", "world_gen", "audio", "ui"],
  },
  {
    id: "cozy_farming",
    label: "Cozy or farming fidelity",
    pattern: /farm|farming|crop|stardew|cozy|village|homestead|villager|daily routine/i,
    priority: "Protect peaceful homestead loops from combat drift.",
    promptFix: "Force crop, village, and daily-routine verbs into the first playable slice.",
    runtimeFix: "Keep routine, crop-state, social, and homestead feedback loops visible before any conflict systems.",
    sourceFix: "Patch cozy runtime flow, village-state logic, and farming or inventory systems together.",
    evalHint: "Add a no-combat homestead eval bucket that checks crops, routines, village state, and peaceful pacing.",
    focusAreas: ["runtime_component", "generated_system", "world_logic", "prompt_stack", "tests"],
    preferredSystems: ["inventory", "world_gen", "ai_npc", "ui", "audio"],
  },
  {
    id: "narrative_social",
    label: "Narrative or social fidelity",
    pattern: /quest|story|narrative|dialogue|character|relationship|social|deduction|politics|faction/i,
    priority: "Preserve narrative-state and social verbs instead of flattening everything into traversal or combat.",
    promptFix: "Have the brief parser and mechanics planner lock social structure, quest cadence, and narrative consequence earlier.",
    runtimeFix: "Keep dialogue, quest choice, or social-reaction state visible in the first session instead of hiding it in later scope.",
    sourceFix: "Patch NPC, UI, and world-state logic together so narrative and social systems show up as actual mechanics.",
    evalHint: "Add a narrative-social eval bucket that checks dialogue, relationship state, and consequence visibility.",
    focusAreas: ["prompt_stack", "generated_system", "world_logic", "tests"],
    preferredSystems: ["ai_npc", "ui", "world_gen", "inventory"],
  },
  {
    id: "multiplayer_flow",
    label: "Multiplayer or social flow",
    pattern: /co[- ]op|coop|multiplayer|party|friends|team|social flow|sync|matchmaking/i,
    priority: "Lock role flow and session choreography before broadening content.",
    promptFix: "Require session structure, role expectations, and social verbs before final synthesis.",
    runtimeFix: "Surface role clarity, join flow, and objective sync in the first multiplayer slice.",
    sourceFix: "Patch session flow, networking-facing systems, and role UI together instead of adding more feature breadth.",
    evalHint: "Add multiplayer eval prompts that check role clarity, join flow, and synchronized session objectives.",
    focusAreas: ["prompt_stack", "runtime_component", "generated_system", "tests"],
    preferredSystems: ["networking", "combat", "ui", "inventory"],
  },
]

function scoreBandToValue(scoreBand: GenerationFeedbackScoreBand) {
  switch (scoreBand) {
    case "failed":
      return 0
    case "1-2":
      return 1.5
    case "3-4":
      return 3.5
    case "5-6":
      return 5.5
    case "7-8":
      return 7.5
    case "9-10":
      return 9.5
  }
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function severityRank(value: "low" | "medium" | "high") {
  switch (value) {
    case "high":
      return 3
    case "medium":
      return 2
    case "low":
      return 1
  }
}

function toClassStem(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")
}

function getCodeFileExtension(engine: UserProject["engine"]) {
  switch (engine) {
    case "godot":
      return ".gd"
    case "unity":
      return ".cs"
    case "custom":
      return ".hpp"
    default:
      return ".cpp"
  }
}

function getRuntimeFiles(project: Pick<UserProject, "design">) {
  const archetype = project.design.runtimePlan.archetype

  switch (archetype) {
    case "survival_expedition_3d":
    case "action_operation_3d":
      return ["components/game/playable-runtime.tsx", "components/game/action-runtime-3d.tsx"]
    case "survival_horde":
      return ["components/game/playable-runtime.tsx", "components/game/survival-runtime.tsx"]
    case "homestead_life":
      return ["components/game/playable-runtime.tsx", "components/game/homestead-runtime.tsx"]
    case "strategy_command":
      return ["components/game/playable-runtime.tsx", "components/game/strategy-runtime.tsx"]
    case "journey_route":
      return ["components/game/playable-runtime.tsx", "components/game/journey-runtime.tsx"]
    default:
      return ["components/game/playable-runtime.tsx"]
  }
}

function inferGeneratedSystemFiles(
  project: Pick<UserProject, "engine" | "systems" | "design">,
  preferredSystems: string[] = [],
  maxItems = 4,
) {
  const ext = getCodeFileExtension(project.engine)
  const systems = project.systems.length > 0
    ? project.systems
    : project.design.resolvedFeatures.map((feature) => ({
      name: feature,
      linesGenerated: 0,
    }))

  const prioritized = systems
    .slice()
    .sort((left, right) => {
      const leftPreferred = preferredSystems.includes(left.name) ? 1 : 0
      const rightPreferred = preferredSystems.includes(right.name) ? 1 : 0
      if (leftPreferred !== rightPreferred) return rightPreferred - leftPreferred
      return (right.linesGenerated ?? 0) - (left.linesGenerated ?? 0)
    })

  return prioritized
    .slice(0, maxItems)
    .map((system) => `Nexus${toClassStem(system.name)}System${ext}`)
}

function extractEvidenceSnippet(note: string, pattern: RegExp) {
  const sentences = note
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
  const matchedSentence = sentences.find((sentence) => pattern.test(sentence))

  return matchedSentence ?? note.trim().slice(0, 160)
}

function deriveSeverity(entries: ProjectGenerationFeedback[]) {
  const scores = entries.map((entry) => scoreBandToValue(entry.scoreBand))
  const lowestScore = Math.min(...scores)

  if (lowestScore <= 1.5 || entries.length >= 3) {
    return "high" as const
  }

  if (lowestScore <= 5.5 || entries.length >= 2) {
    return "medium" as const
  }

  return "low" as const
}

function deriveConfidence(entries: ProjectGenerationFeedback[]) {
  if (entries.length >= 3) return "high" as const
  if (entries.length >= 2) return "medium" as const
  return "low" as const
}

function categoryFromFocusArea(area: RepairFocusArea): ProjectSourceRepairTarget["category"] {
  switch (area) {
    case "runtime_component":
      return "runtime_component"
    case "generated_system":
      return "generated_system"
    case "ui_layer":
      return "ui_layer"
    case "asset_pipeline":
      return "asset_pipeline"
    case "world_logic":
      return "world_logic"
    case "tests":
      return "tests"
    case "prompt_stack":
    default:
      return "prompt_stack"
  }
}

function filesForFocusArea(
  focusArea: RepairFocusArea,
  project: Pick<UserProject, "engine" | "systems" | "design">,
  preferredSystems: string[] = [],
) {
  switch (focusArea) {
    case "prompt_stack":
      return [
        "lib/engine/generation-intelligence/brief-parser.ts",
        "lib/engine/generation-intelligence/mechanics-planner.ts",
        "lib/engine/generation-intelligence/runtime-planner.ts",
        "lib/engine/generation-intelligence/manifest-synthesizer.ts",
      ]
    case "runtime_component":
      return getRuntimeFiles(project)
    case "generated_system":
      return inferGeneratedSystemFiles(project, preferredSystems)
    case "ui_layer":
      return unique([
        "components/game/playable-runtime.tsx",
        ...getRuntimeFiles(project),
        ...inferGeneratedSystemFiles(project, ["ui", ...preferredSystems], 3),
      ])
    case "asset_pipeline":
      return [
        "lib/engine/asset-generation-intelligence.ts",
        "lib/engine/generation-intelligence/asset-planner.ts",
        "app/dashboard/_components/project-detail-panel.tsx",
      ]
    case "world_logic":
      return unique([
        "lib/engine/generation-intelligence/world-planner.ts",
        ...getRuntimeFiles(project),
        ...inferGeneratedSystemFiles(project, ["world_gen", "ai_npc", ...preferredSystems], 3),
      ])
    case "tests":
      return [
        "lib/engine/__tests__/generation-intelligence.test.ts",
        "components/game/playable-runtime.tsx",
      ]
  }
}

function buildRecognizedIssues(
  feedback: ProjectGenerationFeedback[],
): ProjectFeedbackIssueSignal[] {
  const issues: ProjectFeedbackIssueSignal[] = []

  for (const rule of FEEDBACK_THEME_RULES) {
    const matchedEntries = feedback.filter((entry) => rule.pattern.test(entry.notes))
    if (matchedEntries.length === 0) continue

    const severity = deriveSeverity(matchedEntries)
    const confidence = deriveConfidence(matchedEntries)

    issues.push({
      id: rule.id,
      label: rule.label,
      severity,
      confidence,
      evidence: unique(
        matchedEntries.map((entry) => extractEvidenceSnippet(entry.notes, rule.pattern)),
      ).slice(0, 3),
      promptRepair: rule.promptFix,
      runtimeRepair: rule.runtimeFix,
      sourceRepair: rule.sourceFix,
    })
  }

  return issues.sort((left, right) => {
    const severityDiff = severityRank(right.severity) - severityRank(left.severity)
    if (severityDiff !== 0) return severityDiff
    return left.label.localeCompare(right.label)
  })
}

function buildSourceRepairPlan(
  project: Pick<UserProject, "engine" | "systems" | "design">,
  recognizedIssues: ProjectFeedbackIssueSignal[],
): ProjectSourceRepairTarget[] {
  return recognizedIssues
    .map((issue) => {
      const rule = FEEDBACK_THEME_RULES.find((candidate) => candidate.id === issue.id)
      if (!rule) return null

      const files = unique(
        rule.focusAreas.flatMap((focusArea) => filesForFocusArea(focusArea, project, rule.preferredSystems)),
      ).slice(0, 8)

      return {
        id: `repair_target_${rule.id}`,
        label: `${rule.label} Repair Track`,
        category: categoryFromFocusArea(rule.focusAreas[0]),
        priority: issue.severity,
        rationale: rule.priority,
        files,
        actions: unique([
          issue.sourceRepair,
          issue.runtimeRepair,
          issue.promptRepair,
          "Patch the smallest set of files that restores the requested fantasy before widening scope again.",
        ]).slice(0, 5),
      } satisfies ProjectSourceRepairTarget
    })
    .filter((target): target is ProjectSourceRepairTarget => target !== null)
}

function buildGenerationRepairPlan(recognizedIssues: ProjectFeedbackIssueSignal[]): ProjectGenerationRepairPlan {
  const promptRepairs = unique(recognizedIssues.map((issue) => issue.promptRepair)).slice(0, 6)
  const runtimeRepairs = unique(recognizedIssues.map((issue) => issue.runtimeRepair)).slice(0, 6)
  const sourceRepairs = unique(recognizedIssues.map((issue) => issue.sourceRepair)).slice(0, 6)
  const assetRepairs = unique(
    recognizedIssues
      .filter((issue) => issue.label === "Asset fidelity" || issue.label === "UI and controls" || issue.label === "Dimension fidelity")
      .map((issue) => issue.sourceRepair),
  ).slice(0, 5)
  const evalAdditions = unique(
    recognizedIssues.flatMap((issue) => {
      const rule = FEEDBACK_THEME_RULES.find((candidate) => candidate.id === issue.id)
      return rule ? [rule.evalHint] : []
    }),
  ).slice(0, 6)

  return {
    promptRepairs,
    runtimeRepairs,
    sourceRepairs,
    assetRepairs,
    evalAdditions,
  }
}

function extractThemes(feedback: ProjectGenerationFeedback[]) {
  const recognizedIssues = buildRecognizedIssues(feedback)

  return {
    themes: recognizedIssues.map((issue) => issue.label).slice(0, 5),
    priorities: unique(recognizedIssues.map((issue) => {
      const rule = FEEDBACK_THEME_RULES.find((candidate) => candidate.id === issue.id)
      return rule?.priority ?? ""
    })).slice(0, 6),
    promptFixes: unique(recognizedIssues.map((issue) => issue.promptRepair)).slice(0, 6),
  }
}

export function createProjectFeedback(input: {
  project: Pick<UserProject, "design">
  scoreBand: GenerationFeedbackScoreBand
  notes: string
}): ProjectGenerationFeedback {
  return {
    id: `feedback_${Math.random().toString(36).slice(2, 10)}`,
    scoreBand: input.scoreBand,
    notes: input.notes.trim(),
    submittedAt: new Date().toISOString(),
    runtimeArchetype: input.project.design.runtimePlan.archetype,
    runtimeLabel: input.project.design.runtimePlan.label,
    promptSummary: input.project.design.promptSummary,
  }
}

export function buildProjectFeedbackDigest(
  feedback: ProjectGenerationFeedback[] | null | undefined,
): ProjectFeedbackDigest {
  const entries = Array.isArray(feedback) ? feedback : []
  if (entries.length === 0) {
    return {
      totalReports: 0,
      latestScoreBand: null,
      averageScore: null,
      failurePressure: "low",
      recurringThemes: [],
      improvementPriorities: [],
      promptAdjustments: [],
    }
  }

  const averageScore = entries.reduce((sum, entry) => sum + scoreBandToValue(entry.scoreBand), 0) / entries.length
  const failedOrLow = entries.filter((entry) => entry.scoreBand === "failed" || entry.scoreBand === "1-2" || entry.scoreBand === "3-4").length
  const failurePressure = failedOrLow >= Math.max(2, Math.ceil(entries.length / 2))
    ? "high"
    : failedOrLow > 0
      ? "medium"
      : "low"
  const { themes, priorities, promptFixes } = extractThemes(entries)

  return {
    totalReports: entries.length,
    latestScoreBand: entries[0]?.scoreBand ?? null,
    averageScore: Number(averageScore.toFixed(1)),
    failurePressure,
    recurringThemes: themes,
    improvementPriorities: priorities.length > 0
      ? priorities
      : [
          averageScore < 5
            ? "Increase prompt-fidelity checks before final synthesis."
            : "Keep collecting reports to separate one-off issues from repeat failures.",
        ],
    promptAdjustments: promptFixes.length > 0
      ? promptFixes
      : [
          averageScore < 5
            ? "Push more objections into the repair synthesizer before accepting the generation plan."
            : "Store this as a positive signal and reuse the winning prompt tier stack.",
        ],
  }
}

export function buildFeedbackLearningReport(
  project: Pick<UserProject, "name" | "description" | "genre" | "dimension" | "features" | "design" | "feedback" | "engine" | "systems">,
): ProjectFeedbackLearningReport {
  const digest = buildProjectFeedbackDigest(project.feedback)
  const recognizedIssues = buildRecognizedIssues(Array.isArray(project.feedback) ? project.feedback : [])
  const sourceRepairPlan = buildSourceRepairPlan(project, recognizedIssues)
  const generationRepairPlan = buildGenerationRepairPlan(recognizedIssues)

  return {
    project: {
      name: project.name,
      genre: project.genre,
      dimension: project.dimension,
      runtimeArchetype: project.design.runtimePlan.archetype,
      promptSummary: project.design.promptSummary,
    },
    digest,
    recognizedIssues,
    sourceRepairPlan,
    generationRepairPlan,
    enhancementAgentBrief: [
      `Project: ${project.name}`,
      `Prompt: ${project.description}`,
      `Runtime: ${project.design.runtimePlan.label}`,
      `Feedback reports: ${digest.totalReports}`,
      `Failure pressure: ${digest.failurePressure}`,
      `Recurring themes: ${digest.recurringThemes.join(", ") || "none yet"}`,
      `Recognized issues: ${recognizedIssues.map((issue) => `${issue.label} (${issue.severity})`).join(" | ") || "none yet"}`,
      `Prompt repairs: ${generationRepairPlan.promptRepairs.join(" | ") || "none yet"}`,
      `Runtime repairs: ${generationRepairPlan.runtimeRepairs.join(" | ") || "none yet"}`,
      `Source repairs: ${generationRepairPlan.sourceRepairs.join(" | ") || "none yet"}`,
      `Top source targets: ${sourceRepairPlan.map((target) => `${target.label}: ${target.files.join(", ")}`).join(" | ") || "collect more feedback"}`,
      "Task: patch the weakest prompt stage, runtime contract, and source targets together so the next build preserves the original fantasy instead of drifting.",
    ].join("\n"),
    learningSignals: {
      positiveExample: digest.averageScore !== null && digest.averageScore >= 8,
      retrainRecommended: digest.failurePressure === "high" || (digest.averageScore !== null && digest.averageScore < 5),
      runtimeMismatchRisk: digest.recurringThemes.includes("Dimension fidelity") || digest.recurringThemes.includes("Genre collapse"),
      sourcePatchRecommended: sourceRepairPlan.length > 0 && (
        digest.failurePressure !== "low"
        || recognizedIssues.some((issue) => issue.severity === "high")
      ),
    },
  }
}
