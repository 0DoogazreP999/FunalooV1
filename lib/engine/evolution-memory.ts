import {
  AGENTS,
  GENERATION_SYSTEMS,
  OPEN_SOURCE_ENGINES,
  RESEARCH_DOMAINS,
  STANDALONE_LIBS,
  TRAINING_DOMAINS,
} from "@/lib/nexus-data"
import { buildFeedbackLearningReport } from "@/lib/engine/feedback-learning"
import type {
  GameDimension,
  GenerationAlphabeticalAddition,
  GenerationEvolutionContext,
  GenerationEvolutionInsertionBlock,
  GenerationEvolutionUsageSnapshot,
  Genre,
  NexusCacheLine,
  PromptIntelligenceFragment,
  UserProject,
} from "@/lib/engine/types"

interface CacheCandidate extends NexusCacheLine {
  score: number
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function tokenize(value: string) {
  return unique(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .filter((token) => token.length >= 3),
  )
}

function createNexusCacheCorpus(dynamicFragments: PromptIntelligenceFragment[] = []) {
  const corpus: NexusCacheLine[] = [
    ...AGENTS.map((agent) => ({
      id: `agent:${agent.name}`,
      label: agent.displayName,
      category: "agent" as const,
      line: `${agent.displayName}: ${agent.description}. Expertise: ${agent.expertise.join(", ")}.`,
      tags: unique([
        agent.name,
        ...agent.expertise,
        ...tokenize(agent.description),
        ...tokenize(agent.lastTask),
      ]),
    })),
    ...RESEARCH_DOMAINS.map((domain) => ({
      id: `research:${domain.name}`,
      label: domain.displayName,
      category: "research_domain" as const,
      line: `${domain.displayName}: ${domain.links} links researched with status ${domain.status}.`,
      tags: unique([domain.name, ...tokenize(domain.displayName), domain.status]),
    })),
    ...TRAINING_DOMAINS.map((domain) => ({
      id: `training:${domain.name}`,
      label: domain.displayName,
      category: "training_domain" as const,
      line: `${domain.displayName}: ${domain.pairs} training pairs at quality ${domain.quality}.`,
      tags: unique([domain.name, ...tokenize(domain.displayName), domain.status]),
    })),
    ...GENERATION_SYSTEMS.map((system) => ({
      id: `system:${system.name}`,
      label: system.displayName,
      category: "generation_system" as const,
      line: `${system.displayName}: ${system.linesGenerated} generated lines on ${system.engine}.`,
      tags: unique([system.name, system.engine, ...tokenize(system.displayName)]),
    })),
    ...OPEN_SOURCE_ENGINES.map((engine) => ({
      id: `engine:${engine.name.toLowerCase()}`,
      label: engine.name,
      category: "open_source_engine" as const,
      line: `${engine.name}: absorbed patterns include ${engine.absorbed.join(", ")}.`,
      tags: unique([engine.name, ...engine.absorbed, ...tokenize(engine.name)]),
    })),
    ...STANDALONE_LIBS.map((library) => ({
      id: `library:${library.name.toLowerCase().replace(/\s+/g, "_")}`,
      label: library.name,
      category: "standalone_library" as const,
      line: `${library.name}: ${library.category} library focused on ${library.description}.`,
      tags: unique([library.name, library.category, ...tokenize(library.description)]),
    })),
    ...dynamicFragments.map((frag) => ({
      id: `evolution:${frag.id}`,
      label: `Evolved ${frag.category.replace(/_/g, " ")}`,
      category: "generation_system" as const, // Reusing category for consistency
      line: `${frag.fragment}. Rationale: ${frag.rationale}`,
      tags: unique([frag.category, ...frag.tags, ...tokenize(frag.fragment)]),
    })),
  ]

  return corpus
    .map((entry) => ({
      ...entry,
      tags: unique([
        ...entry.tags,
        ...tokenize(entry.label),
        ...tokenize(entry.line),
      ]),
    }))
    .sort((left, right) => left.label.localeCompare(right.label))
}

export const NEXUS_CACHE_CORPUS = createNexusCacheCorpus()
export const EVOLUTION_INSERT_DIVIDER = "-----------------------------------"

function scoreCacheLine(
  line: NexusCacheLine,
  promptTokens: string[],
  genre: Genre,
  dimension: GameDimension,
  selectedFeatures: string[],
) {
  const lineText = `${line.label} ${line.line}`.toLowerCase()
  let score = 0

  for (const token of promptTokens) {
    if (line.tags.some((tag) => tag.toLowerCase() === token)) {
      score += 6
      continue
    }

    if (line.tags.some((tag) => tag.toLowerCase().includes(token) || token.includes(tag.toLowerCase()))) {
      score += 4
      continue
    }

    if (lineText.includes(token)) {
      score += 2
    }
  }

  if (lineText.includes(genre.replace(/_/g, " "))) {
    score += 3
  }

  if (dimension === "3d" && /3d|render|mesh|volumetric|camera|viewport|geometry|terrain/i.test(line.line)) {
    score += 2
  }

  if (dimension === "2d" && /2d|ui|sprite|scene|signals/i.test(line.line)) {
    score += 2
  }

  for (const feature of selectedFeatures) {
    if (line.tags.some((tag) => tag.toLowerCase().includes(feature.toLowerCase()))) {
      score += 3
    }
  }

  return score
}

function buildAlphabeticalAdditions(
  matched: CacheCandidate[],
  corpus: NexusCacheLine[],
): GenerationAlphabeticalAddition[] {
  const corpusLabels = corpus.map((entry) => entry.label)
  const alphabetical = matched
    .slice(0, 6)
    .sort((left, right) => left.label.localeCompare(right.label))

  for (let startIndex = 0; startIndex < alphabetical.length - 1; startIndex += 1) {
    for (let endIndex = startIndex + 1; endIndex < alphabetical.length; endIndex += 1) {
      const start = alphabetical[startIndex]
      const end = alphabetical[endIndex]
      const lower = corpusLabels.indexOf(start.label)
      const upper = corpusLabels.indexOf(end.label)
      if (lower < 0 || upper < 0 || upper - lower <= 1) {
        continue
      }

      const additions = corpus
        .slice(lower + 1, upper)
        .map((entry) => entry.label)
        .slice(0, 3)

      if (additions.length > 0) {
        return [{
          start: start.label,
          end: end.label,
          additions,
          rationale: `Alphabetically, these cached lines fit between ${start.label} and ${end.label} and can widen the prompt without changing the current flow.`,
        }]
      }
    }
  }

  const fallbackAnchors = alphabetical.slice(0, 2)
  if (fallbackAnchors.length === 2) {
    return [{
      start: fallbackAnchors[0].label,
      end: fallbackAnchors[1].label,
      additions: [],
      rationale: `No cached labels fell cleanly between ${fallbackAnchors[0].label} and ${fallbackAnchors[1].label}, so the loop will still use them as the two prompt anchors.`,
    }]
  }

  return []
}

function buildEvolutionInsertionBlocks(input: {
  cacheLines: NexusCacheLine[]
  alphabeticalAdditions: GenerationAlphabeticalAddition[]
  userLearnings: string[]
  globalLearnings: string[]
  qualitySignals: string[]
}): GenerationEvolutionInsertionBlock[] {
  if (input.cacheLines.length < 2) {
    return []
  }

  return input.alphabeticalAdditions.slice(0, 2).map((addition, index) => {
    const startAnchor = input.cacheLines.find((entry) => entry.label === addition.start) ?? input.cacheLines[0]!
    const endAnchor = input.cacheLines.find((entry) => entry.label === addition.end) ?? input.cacheLines[input.cacheLines.length - 1]!
    const promptInsertions = unique([
      ...addition.additions.map((item) => `Add ${item} deliberately between ${addition.start} and ${addition.end} so the design grows with purpose instead of drifting.`),
      ...input.userLearnings.slice(0, 2),
      ...input.globalLearnings.slice(0, 2),
      ...input.qualitySignals.slice(0, 1),
    ]).slice(0, 6)
    const codeInsertions = unique([
      `// EVOLUTION_INSERT_START: ${addition.start} -> ${addition.end}`,
      ...addition.additions.map((item) => `// EVOLUTION_INSERT: ${item}`),
      ...input.qualitySignals.slice(0, 1).map((signal) => `// EVOLUTION_QUALITY: ${signal}`),
      `// EVOLUTION_INSERT_END: ${addition.start} -> ${addition.end}`,
    ]).slice(0, 6)

    return {
      id: `evolution_block_${index + 1}`,
      divider: EVOLUTION_INSERT_DIVIDER,
      startAnchor: startAnchor.label,
      startLine: startAnchor.line,
      endAnchor: endAnchor.label,
      endLine: endAnchor.line,
      promptInsertions,
      codeInsertions,
      rationale: addition.rationale,
    }
  })
}

function summarizeProjectPrompt(project: UserProject) {
  return [
    project.design.promptSummary,
    project.design.generatedPitch,
    project.description,
  ].find((value) => typeof value === "string" && value.trim()) ?? project.name
}

function buildLearningSignals(projects: UserProject[]) {
  const readyProjects = projects.filter((project) => project.llmConfiguration.releaseStatus === "ready")
  const blockedProjects = projects.filter((project) => project.llmConfiguration.releaseStatus === "blocked")
  const positiveProjects = projects.filter((project) => (project.feedback ?? []).some((entry) => entry.scoreBand === "9-10"))

  const runtimeCounts = new Map<string, number>()
  const featureCounts = new Map<string, number>()
  const genreCounts = new Map<string, number>()
  const issueCounts = new Map<string, number>()

  for (const project of projects) {
    runtimeCounts.set(
      project.design.runtimePlan.label,
      (runtimeCounts.get(project.design.runtimePlan.label) ?? 0) + 1,
    )
    genreCounts.set(project.design.resolvedGenre, (genreCounts.get(project.design.resolvedGenre) ?? 0) + 1)

    for (const feature of project.design.resolvedFeatures) {
      featureCounts.set(feature, (featureCounts.get(feature) ?? 0) + 1)
    }

    if ((project.feedback?.length ?? 0) > 0) {
      const learning = buildFeedbackLearningReport(project)
      for (const issue of learning.recognizedIssues) {
        issueCounts.set(issue.label, (issueCounts.get(issue.label) ?? 0) + 1)
      }
    }
  }

  const topEntries = (map: Map<string, number>, maxItems = 3) => [...map.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, maxItems)
    .map(([label]) => label)

  return {
    topRuntimes: topEntries(runtimeCounts),
    topFeatures: topEntries(featureCounts),
    topGenres: topEntries(genreCounts),
    topIssues: topEntries(issueCounts),
    readyCount: readyProjects.length,
    blockedCount: blockedProjects.length,
    positiveCount: positiveProjects.length,
  }
}

function buildUserLearnings(projects: UserProject[]) {
  if (projects.length === 0) {
    return [
      "No prior generations for this user yet, so the loop will lean on Nexus cache lines and global improvement memory.",
    ]
  }

  const signals = buildLearningSignals(projects)
  const learnings: string[] = []

  if (signals.topRuntimes.length > 0) {
    learnings.push(`This user's saved runs most often land in ${signals.topRuntimes.join(", ")}.`)
  }
  if (signals.topFeatures.length > 0) {
    learnings.push(`Their strongest repeated systems are ${signals.topFeatures.join(", ")}.`)
  }
  if (signals.topIssues.length > 0) {
    learnings.push(`Repair pressure for this user most often shows up around ${signals.topIssues.join(", ")}.`)
  }

  return learnings
}

function buildGlobalLearnings(projects: UserProject[]) {
  if (projects.length === 0) {
    return [
      "Global usage memory is still empty, so this run becomes part of the first retrieval and quality baseline.",
    ]
  }

  const signals = buildLearningSignals(projects)
  const learnings: string[] = []

  if (signals.topGenres.length > 0) {
    learnings.push(`Across saved projects, the most common genres are ${signals.topGenres.join(", ")}.`)
  }
  if (signals.topFeatures.length > 0) {
    learnings.push(`The widest reusable capability pressure is around ${signals.topFeatures.join(", ")}.`)
  }
  if (signals.topIssues.length > 0) {
    learnings.push(`Global fix pressure is highest around ${signals.topIssues.join(", ")}.`)
  }

  return learnings
}

function buildQualitySignals(
  allProjects: UserProject[],
  totalUsers: number,
): GenerationEvolutionUsageSnapshot & { summaries: string[] } {
  const providerBackedProjects = allProjects.filter((project) => project.llmConfiguration.source === "user-key").length
  const readyProjects = allProjects.filter((project) => project.llmConfiguration.releaseStatus === "ready").length
  const blockedProjects = allProjects.filter((project) => project.llmConfiguration.releaseStatus === "blocked").length
  const positiveExamples = allProjects.filter((project) => (project.feedback ?? []).some((entry) => entry.scoreBand === "9-10")).length

  const snapshot: GenerationEvolutionUsageSnapshot = {
    totalUsers,
    totalProjects: allProjects.length,
    providerBackedProjects,
    readyProjects,
    blockedProjects,
    positiveExamples,
  }

  return {
    ...snapshot,
    summaries: [
      `${providerBackedProjects}/${allProjects.length} saved projects used creator API keys.`,
      `${readyProjects} ready runs and ${blockedProjects} blocked runs are feeding the improvement memory.`,
      `${positiveExamples} positive examples are available to reinforce high-quality patterns.`,
    ],
  }
}

export function buildGenerationEvolutionContext(input: {
  prompt: string
  genre: Genre
  dimension: GameDimension
  selectedFeatures: string[]
  currentUserProjects?: UserProject[]
  allProjects?: UserProject[]
  totalUsers?: number
  dynamicFragments?: PromptIntelligenceFragment[]
}): GenerationEvolutionContext {
  const corpus = createNexusCacheCorpus(input.dynamicFragments)
  const promptTokens = tokenize([
    input.prompt,
    input.genre,
    input.dimension,
    ...input.selectedFeatures,
  ].join(" "))
  const scored = corpus
    .map((entry) => ({
      ...entry,
      score: scoreCacheLine(entry, promptTokens, input.genre, input.dimension, input.selectedFeatures),
    }))
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label))

  const matched = scored.filter((entry) => entry.score > 0)
  const cacheLines = (matched.length > 0 ? matched : scored)
    .slice(0, 2)
    .sort((left, right) => left.label.localeCompare(right.label))
    .map(({ score: _score, ...entry }) => entry)

  const alphabeticalAdditions = buildAlphabeticalAdditions(
    matched.length > 0 ? matched : scored.slice(0, 6),
    corpus,
  )
  const currentUserProjects = input.currentUserProjects ?? []
  const allProjects = input.allProjects ?? currentUserProjects
  const quality = buildQualitySignals(allProjects, input.totalUsers ?? 0)
  const userLearnings = buildUserLearnings(currentUserProjects)
  const globalLearnings = buildGlobalLearnings(allProjects)
  const insertionBlocks = buildEvolutionInsertionBlocks({
    cacheLines,
    alphabeticalAdditions,
    userLearnings,
    globalLearnings,
    qualitySignals: quality.summaries,
  })

  const promptExpansionHints = unique([
    ...insertionBlocks.flatMap((block) => block.promptInsertions),
    ...cacheLines.map((entry) => `${entry.label}: ${entry.line}`),
  ]).slice(0, 8)

  return {
    cacheLines,
    alphabeticalAdditions,
    insertionBlocks,
    userLearnings,
    globalLearnings,
    qualitySignals: quality.summaries,
    promptExpansionHints,
    usageSnapshot: {
      totalUsers: quality.totalUsers,
      totalProjects: quality.totalProjects,
      providerBackedProjects: quality.providerBackedProjects,
      readyProjects: quality.readyProjects,
      blockedProjects: quality.blockedProjects,
      positiveExamples: quality.positiveExamples,
    },
  }
}

function formatEvolutionInsertionBlock(block: GenerationEvolutionInsertionBlock) {
  return [
    block.divider,
    `EVOLUTION ANCHOR START: ${block.startAnchor}`,
    block.startLine,
    block.divider,
    "EVOLUTION INSERTION BLOCK",
    ...block.promptInsertions.map((entry) => `Prompt insert: ${entry}`),
    "Code insert scaffold:",
    ...block.codeInsertions,
    block.divider,
    `EVOLUTION ANCHOR END: ${block.endAnchor}`,
    block.endLine,
    `Rationale: ${block.rationale}`,
    block.divider,
  ].join("\n")
}

export function formatEvolutionContextForPrompt(context: GenerationEvolutionContext) {
  return [
    "Advisory only: use this evolution memory to widen options, but never replace the creator's explicit prompt, UI settings, locked constraints, dimension, camera, or runtime intent.",
    `Nexus cache anchors: ${context.cacheLines.map((entry) => `${entry.label} -> ${entry.line}`).join(" | ") || "none"}`,
    `Alphabetical additions: ${context.alphabeticalAdditions.map((entry) => `${entry.start} -> ${entry.additions.join(", ") || "none"} -> ${entry.end}`).join(" | ") || "none"}`,
    `Evolution insertion blocks:\n${context.insertionBlocks.map(formatEvolutionInsertionBlock).join("\n") || "none"}`,
    `User learnings: ${context.userLearnings.join(" | ") || "none"}`,
    `Global learnings: ${context.globalLearnings.join(" | ") || "none"}`,
    `Quality signals: ${context.qualitySignals.join(" | ") || "none"}`,
  ].join("\n")
}

export function summarizeEvolutionContext(context: GenerationEvolutionContext) {
  return {
    cacheLines: context.cacheLines.map((entry) => ({
      label: entry.label,
      line: entry.line,
      category: entry.category,
    })),
    alphabeticalAdditions: context.alphabeticalAdditions,
    insertionBlocks: context.insertionBlocks,
    userLearnings: context.userLearnings,
    globalLearnings: context.globalLearnings,
    qualitySignals: context.qualitySignals,
    usageSnapshot: context.usageSnapshot,
  }
}

export function summarizeProjectHistoryForEvolution(project: UserProject) {
  return {
    name: project.name,
    promptSummary: summarizeProjectPrompt(project),
    genre: project.design.resolvedGenre,
    runtime: project.design.runtimePlan.label,
    features: project.design.resolvedFeatures,
    releaseStatus: project.llmConfiguration.releaseStatus ?? "needs_review",
  }
}
