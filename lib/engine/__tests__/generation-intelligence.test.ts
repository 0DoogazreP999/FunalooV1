import assert from "node:assert/strict"
import test from "node:test"
import { buildFeedbackLearningReport, buildProjectFeedbackDigest, createProjectFeedback } from "../feedback-learning"
import {
  buildGenerationKnowledgeCoverage,
  buildGenerationKnowledgeRiskSummary,
  buildGenerationUsageIntelligence,
  buildGenerationEvolutionContext,
  buildProjectGenerationAudit,
  ensureProjectExecution,
  buildProjectGenerationContext,
  buildGenerationProfile,
  buildRuntimeEncounterDirector,
  getRuntimeEncounterTickWeights,
  enhanceGenerationBrief,
  generateGenerationProfile,
  getConfiguredUserProviderRoster,
  parseGenerationBrief,
  buildRuntimePlaybookPlan,
  planGenerationMechanics,
  planGenerationRuntimeVersatility,
  planWorldStructure,
  resolveGenerationTaxonomy,
  runProjectExecutionPipeline,
} from "../generation-intelligence"
import { buildRuntimeScaffoldingPlan } from "../runtime-scaffolding"
import { createGeneratedAssetFiles, createGeneratedCodeFiles } from "../project-workspace"
import { createEmptyUserAiSettings } from "@/lib/validators"

test("staged generation modules stay aligned on a travel simulation brief", () => {
  const prompt = "A frontier management simulation with caravan travel, trade, logistics, weather, and no combat"
  const brief = parseGenerationBrief({
    prompt,
    fallbackGenre: "adventure",
    fallbackMultiplayer: false,
    fallbackMaxPlayers: 1,
  })
  const taxonomy = resolveGenerationTaxonomy({
    prompt,
    genre: "adventure",
    selectedFeatures: ["world_gen", "ui"],
    multiplayer: false,
    maxPlayers: 1,
    brief,
  })
  const world = planWorldStructure({
    prompt,
    genre: taxonomy.resolvedGenre,
    dimension: taxonomy.dimension,
    promptSignals: taxonomy.promptSignals,
  })
  const mechanics = planGenerationMechanics({
    prompt,
    genre: taxonomy.resolvedGenre,
    dimension: taxonomy.dimension,
    promptSignals: taxonomy.promptSignals,
    resolvedFeatures: taxonomy.resolvedFeatures,
    mapArchetype: world.mapArchetype,
    environmentThemes: world.environmentThemes,
  })

  assert.equal(brief.genre, "simulation")
  assert.equal(taxonomy.dimension, "2d")
  assert.equal(brief.multiplayer, false)
  assert.equal(brief.maxPlayers, 1)
  assert.ok(taxonomy.promptSignals.includes("travel-heavy"))
  assert.ok(taxonomy.promptSignals.includes("peaceful"))
  assert.ok(taxonomy.resolvedFeatures.includes("world_gen"))
  assert.ok(!taxonomy.resolvedFeatures.includes("combat"))
  assert.equal(world.mapArchetype, "Overland Trail Network")
  assert.match(mechanics.generatedPitch, /2D simulation/i)
  assert.ok(mechanics.uiSurfaces.includes("Trade and supply ledger"))
})

test("buildGenerationProfile synthesizes the staged results into a valid profile", () => {
  const profile = buildGenerationProfile({
    prompt: "A co-op tactical fantasy RPG with quests, companions, and dungeons",
    genre: "rpg",
    selectedFeatures: ["inventory", "combat", "world_gen", "ai_npc", "ui"],
    multiplayer: true,
    maxPlayers: 4,
  })

  assert.equal(profile.resolvedGenre, "rpg")
  assert.equal(profile.resolvedMultiplayer, true)
  assert.equal(profile.resolvedMaxPlayers, 4)
  assert.ok(profile.promptSignals.includes("progression-heavy"))
  assert.ok(profile.resolvedFeatures.includes("networking"))
  assert.ok(profile.supplementalSystems.some((system) => system.name === "session_flow"))
  assert.ok(profile.supplementalSystems.some((system) => system.name === "objective_director"))
  assert.match(profile.generatedPitch, /rpg/i)
  assert.ok(profile.candidatePlan.candidates.length >= 3)
  assert.ok(profile.candidatePlan.candidates.every((candidate) => typeof candidate.knowledgeFit === "string"))
  assert.ok(profile.candidatePlan.candidates.some((candidate) => candidate.knowledgeNotes.length > 0))
  assert.ok(profile.evaluationPlan.rubrics.length >= 4)
  assert.ok(profile.diversityPlan.retrievalExamples.length >= 1)
  assert.ok(profile.assetPlan.characterBlueprints.length > 0)
  assert.equal(typeof profile.graphicsPlan.renderPath, "string")
  assert.equal(typeof profile.enginePlan.recommendedEngine, "string")
  assert.ok(profile.runtimeVersatilityPlan.activeModules.length >= 3)
  assert.equal(typeof profile.runtimeVersatilityPlan.flavorLabel, "string")
})

test("runtime versatility planning preserves distinct play flavor for heist and political prompts", () => {
  const heistPlan = planGenerationRuntimeVersatility({
    prompt: "A 3D heist where a stealth crew bypasses alarms, steals the target, and escapes through a getaway route",
    genre: "fps",
    dimension: "3d",
    runtimeArchetype: "action_operation_3d",
    promptSignals: ["heist-heavy", "stealth-heavy"],
    resolvedFeatures: ["stealth", "inventory", "ui"],
    contentPillars: ["Stealth routes", "Getaway pressure"],
    coreLoop: ["Bypass patrols", "Steal the target"],
    secondaryLoop: ["Drop heat", "Secure escape"],
    progressionLoop: ["Unlock stronger tools"],
    uiSurfaces: ["Alarm state", "Objective feed"],
    environmentThemes: ["Luxury vault", "Service corridors"],
  })
  const politicalPlan = planGenerationRuntimeVersatility({
    prompt: "A strategy game about passing agendas, securing blocs, and surviving scandals inside a tense council",
    genre: "strategy",
    dimension: "2d",
    runtimeArchetype: "strategy_command",
    promptSignals: ["politics-heavy", "story-heavy"],
    resolvedFeatures: ["diplomacy", "dialogue", "ui"],
    contentPillars: ["Bloc control", "Agenda pressure"],
    coreLoop: ["Secure votes", "Pass agendas"],
    secondaryLoop: ["Stabilize coalitions"],
    progressionLoop: ["Unlock stronger mandates"],
    uiSurfaces: ["Bloc state", "Legitimacy meter"],
    environmentThemes: ["Council chamber", "Press hall"],
  })

  assert.equal(heistPlan.flavorId, "heist_infiltration")
  assert.equal(heistPlan.encounterLabels.hostile, "Security Patrol")
  assert.equal(politicalPlan.flavorId, "political_command")
  assert.equal(politicalPlan.resourceLabels.primary, "Influence")
})

test("runtime scaffolding turns versatility flavor into named phases and live tuning biases", () => {
  const project = {
    id: "proj_runtime_scaffold" as never,
    name: "Vaultbreak Directive",
    description: "A 3D heist where a stealth crew bypasses alarms, steals a prototype, and escapes cleanly.",
    genre: "fps" as const,
    dimension: "3d" as const,
    engine: "unreal" as const,
    features: ["stealth", "inventory", "ui"],
    multiplayer: false,
    maxPlayers: 1,
    status: "complete" as const,
    progress: 100,
    createdAt: new Date().toISOString(),
    llmConfiguration: { provider: "local" as const, source: "local" as const },
    design: buildGenerationProfile({
      prompt: "A 3D heist where a stealth crew bypasses alarms, steals a prototype, and escapes cleanly.",
      genre: "fps",
      selectedFeatures: ["stealth", "inventory", "ui"],
      multiplayer: false,
      maxPlayers: 1,
    }),
    systems: [],
    codeFiles: [],
    assetFiles: [],
    feedback: [],
  }

  const scaffolding = buildRuntimeScaffoldingPlan(project)

  assert.equal(scaffolding.phaseLabels[0], "Silent Entry")
  assert.equal(scaffolding.tuning.interactionDensity > 1, true)
  assert.equal(scaffolding.tuning.combatDensity < 1, true)
})

test("runtime playbook turns prompt flavor into physics, ui, and live beat guidance", () => {
  const project = {
    id: "proj_runtime_playbook" as never,
    name: "Council of Embers",
    description: "A political strategy game about whip counts, scandals, blocs, and majority votes inside a volatile chamber.",
    genre: "strategy" as const,
    dimension: "2d" as const,
    engine: "custom" as const,
    features: ["ui", "dialogue", "diplomacy"],
    multiplayer: false,
    maxPlayers: 1,
    status: "complete" as const,
    progress: 100,
    createdAt: new Date().toISOString(),
    llmConfiguration: { provider: "local" as const, source: "local" as const },
    design: buildGenerationProfile({
      prompt: "A political strategy game about whip counts, scandals, blocs, and majority votes inside a volatile chamber.",
      genre: "strategy",
      selectedFeatures: ["ui", "dialogue", "diplomacy"],
      multiplayer: false,
      maxPlayers: 1,
    }),
    systems: [],
    codeFiles: [],
    assetFiles: [],
    feedback: [],
  }

  const playbook = buildRuntimePlaybookPlan(project)

  assert.equal(playbook.cadenceLabel, "Count -> bargain -> lock majority")
  assert.equal(playbook.physics.profileLabel, "Crisp board response")
  assert.equal(playbook.ui.focusWidgets.length > 0, true)
  assert.equal(playbook.beats[0]?.label, "Whip Count")
  assert.equal(playbook.tuning.interactionFrequency > 1, true)
})

test("runtime encounter director turns prompt flavor into scenario chains and live event cards", () => {
  const project = {
    id: "proj_runtime_encounters" as never,
    name: "Night Cartel",
    description: "A 3D extraction shooter about breaching a cartel compound, stealing intel, and escaping through a collapsing exfil route.",
    genre: "fps" as const,
    dimension: "3d" as const,
    engine: "unreal" as const,
    features: ["combat", "ui", "inventory", "audio"],
    multiplayer: false,
    maxPlayers: 1,
    status: "complete" as const,
    progress: 100,
    createdAt: new Date().toISOString(),
    llmConfiguration: { provider: "local" as const, source: "local" as const },
    design: buildGenerationProfile({
      prompt: "A 3D extraction shooter about breaching a cartel compound, stealing intel, and escaping through a collapsing exfil route.",
      genre: "fps",
      selectedFeatures: ["combat", "ui", "inventory", "audio"],
      multiplayer: false,
      maxPlayers: 1,
    }),
    systems: [],
    codeFiles: [],
    assetFiles: [],
    feedback: [],
  }

  const director = buildRuntimeEncounterDirector(project)

  assert.equal(director.scenarioLabel, "Extraction Corridor Chain")
  assert.ok(director.objectiveChain.length >= 3)
  assert.ok(director.eventDeck.some((event) => event.category === "pressure"))
  assert.ok(director.eventDeck.some((event) => event.category === "twist"))
  assert.ok(director.cadenceWindows.length >= 3)
  assert.ok(director.promptBridge.continuityRules.some((rule) => /button-clicker|board-state|objective/i.test(rule)))
  assert.ok(director.encounterMix.aggression > director.encounterMix.support)
})

test("runtime encounter tick weights escalate pressure and tempo across the cadence chain", () => {
  const project = {
    id: "proj_runtime_tick_weights" as never,
    name: "Night Cartel",
    description: "A 3D extraction shooter about breaching a cartel compound, stealing intel, and escaping through a collapsing exfil route.",
    genre: "fps" as const,
    dimension: "3d" as const,
    engine: "unreal" as const,
    features: ["combat", "ui", "inventory", "audio"],
    multiplayer: false,
    maxPlayers: 1,
    status: "complete" as const,
    progress: 100,
    createdAt: new Date().toISOString(),
    llmConfiguration: { provider: "local" as const, source: "local" as const },
    design: buildGenerationProfile({
      prompt: "A 3D extraction shooter about breaching a cartel compound, stealing intel, and escaping through a collapsing exfil route.",
      genre: "fps",
      selectedFeatures: ["combat", "ui", "inventory", "audio"],
      multiplayer: false,
      maxPlayers: 1,
    }),
    systems: [],
    codeFiles: [],
    assetFiles: [],
    feedback: [],
  }

  const director = buildRuntimeEncounterDirector(project)
  const opening = getRuntimeEncounterTickWeights(director, 0, 0, 0.1)
  const climax = getRuntimeEncounterTickWeights(director, 2, 2, 0.92)

  assert.ok(climax.pressure > opening.pressure)
  assert.ok(climax.hostileSpawn >= opening.hostileSpawn)
  assert.ok(climax.eventAdvanceRate >= opening.eventAdvanceRate)
})

test("knowledge coverage turns nexus research and training state into focused advisory signals", () => {
  const coverage = buildGenerationKnowledgeCoverage({
    prompt: "A 3D tactical shooter with squad breaches, extraction, cinematic lighting, and compile-safe Unreal systems",
    genre: "fps",
    selectedFeatures: ["combat", "audio", "ui"],
    dimension: "3d",
    multiplayer: true,
    targetEngine: "unreal",
    runtimeArchetype: "action_operation_3d",
  })

  assert.ok(coverage.relevantSignals.some((signal) => signal.id === "research:rendering_graphics"))
  assert.ok(coverage.relevantSignals.some((signal) => signal.id === "research:unreal_cpp"))
  assert.ok(coverage.gapWarnings.some((gap) => gap.id === "gap:research:unreal_cpp" || gap.id === "gap:training:unreal_cpp"))
  assert.ok(coverage.compileGuidance.some((entry) => /unreal/i.test(entry)))
  assert.ok(coverage.verificationFocus.some((entry) => /unreal|rendering/i.test(entry)))
})

test("knowledge risk summary escalates weakly covered 3D Unreal pressure into critique and release guidance", () => {
  const coverage = buildGenerationKnowledgeCoverage({
    prompt: "A 3D tactical shooter with squad breaches, extraction, cinematic lighting, and compile-safe Unreal systems",
    genre: "fps",
    selectedFeatures: ["combat", "audio", "ui"],
    dimension: "3d",
    multiplayer: true,
    targetEngine: "unreal",
    runtimeArchetype: "action_operation_3d",
  })
  const risk = buildGenerationKnowledgeRiskSummary({
    coverage,
    dimension: "3d",
    targetEngine: "unreal",
    runtimeArchetype: "action_operation_3d",
    knowledgeFit: "risky",
  })

  assert.equal(risk.level, "risky")
  assert.ok(risk.repairPressure.some((entry) => /compile|render|unreal/i.test(entry)))
  assert.ok(risk.releasePressure.some((entry) => /release|3d|runtime/i.test(entry)))
})

test("usage intelligence turns prior AI-backed generations into manifest and routing pressure", () => {
  const historyProfile = buildGenerationProfile({
    prompt: "A 3D co-op extraction shooter with squad revives, breaches, and compile-safe mission scripting",
    genre: "fps",
    selectedFeatures: ["combat", "ui", "audio"],
    multiplayer: true,
    maxPlayers: 4,
  })
  const usage = buildGenerationUsageIntelligence({
    prompt: "A 3D co-op extraction shooter with squad revives, breaches, and compile-safe mission scripting",
    genre: "fps",
    dimension: "3d",
    selectedFeatures: ["combat", "ui", "audio"],
    selectedProvider: "gpt",
    selectedModel: "gpt-5-mini",
    currentUserProjects: [{
      id: "usage_proj_1" as never,
      name: "Operation Vector",
      description: "A 3D co-op extraction shooter with squad revives, breaches, and compile-safe mission scripting",
      genre: historyProfile.resolvedGenre,
      dimension: historyProfile.dimension,
      engine: "unreal",
      features: historyProfile.resolvedFeatures,
      multiplayer: true,
      maxPlayers: 4,
      status: "complete",
      progress: 100,
      createdAt: new Date().toISOString(),
      llmConfiguration: {
        provider: "gpt",
        source: "user-key",
        model: "gpt-5-mini",
        releaseStatus: "ready",
        providerFailures: [],
        operationalAnalytics: {
          totalPromptCalls: 6,
          totalProviderFallbacks: 0,
          totalRetries: 1,
          totalInputTokens: 4200,
          totalOutputTokens: 1500,
          totalTokens: 5700,
          totalCostUsd: 0.12,
          slowStages: [],
          cacheableStages: [],
          routingStrategies: [],
          failureHotspots: [],
          optimizationNotes: [],
        },
      },
      design: historyProfile,
      systems: [],
      codeFiles: [],
      assetFiles: [],
      feedback: [],
    }],
    allProjects: [],
  })

  assert.ok(usage.summary.length > 0)
  assert.ok(usage.providerSnapshots.some((snapshot) => snapshot.provider === "gpt"))
  assert.ok(usage.manifestPressure.length > 0)
  assert.ok(usage.routingPressure.length > 0)
})

test("generateGenerationProfile falls back to the local manifest when no provider is configured", async () => {
  const evolutionContext = buildGenerationEvolutionContext({
    prompt: "A cozy village sim with farming, weather, and no combat",
    genre: "simulation",
    dimension: "2d",
    selectedFeatures: ["world_gen", "ui", "audio"],
    currentUserProjects: [],
    allProjects: [],
    totalUsers: 0,
  })
  const result = await generateGenerationProfile({
    prompt: "A cozy village sim with farming, weather, and no combat",
    genre: "simulation",
    selectedFeatures: ["world_gen", "ui", "audio"],
    multiplayer: false,
    maxPlayers: 1,
    evolutionContext,
    usageIntelligence: buildGenerationUsageIntelligence({
      prompt: "A cozy village sim with farming, weather, and no combat",
      genre: "simulation",
      dimension: "2d",
      selectedFeatures: ["world_gen", "ui", "audio"],
      currentUserProjects: [],
      allProjects: [],
    }),
  })

  assert.equal(result.llmConfiguration.provider, "local")
  assert.equal(result.llmConfiguration.source, "local")
  assert.equal(result.llmConfiguration.suiteId, "generation_pipeline")
  assert.equal(result.llmConfiguration.suiteVersion, "phase1-2026-03-29")
  assert.ok(result.llmConfiguration.stages?.some((stage) => stage.id === "brief_parser"))
  assert.ok(result.llmConfiguration.stages?.some((stage) => stage.id === "manifest_synthesizer"))
  assert.ok(result.loopReport?.operationalAnalytics)
  assert.equal(result.llmConfiguration.operationalAnalytics?.totalPromptCalls, 1)
  assert.ok(result.llmConfiguration.knowledgeCoverage)
  assert.ok(result.llmConfiguration.knowledgeRisk)
  assert.ok(result.llmConfiguration.usageIntelligence)
  assert.equal(result.profile.resolvedMultiplayer, false)
  assert.ok(result.profile.negativeConstraints.some((constraint) => /combat/i.test(constraint)))
  assert.equal(result.llmConfiguration.evolutionContext?.cacheLines.length, 2)
})

test("local generation keeps evolution memory separate from the main manifest prompt", async () => {
  const evolutionContext = buildGenerationEvolutionContext({
    prompt: "A cozy village sim with farming, weather, and no combat",
    genre: "simulation",
    dimension: "2d",
    selectedFeatures: ["world_gen", "ui", "audio"],
    currentUserProjects: [],
    allProjects: [],
    totalUsers: 0,
  })

  const isolatedContext = {
    ...evolutionContext,
    userLearnings: ["EVOLUTION_ONLY_MARKER should never appear inside the generation pitch."],
    globalLearnings: ["GLOBAL_ONLY_MARKER should remain advisory-only."],
  }

  const result = await generateGenerationProfile({
    prompt: "A cozy village sim with farming, weather, and no combat",
    genre: "simulation",
    selectedFeatures: ["world_gen", "ui", "audio"],
    multiplayer: false,
    maxPlayers: 1,
    evolutionContext: isolatedContext,
  })

  assert.equal(result.llmConfiguration.evolutionContext?.userLearnings.includes("EVOLUTION_ONLY_MARKER should never appear inside the generation pitch."), true)
  assert.equal(result.profile.generatedPitch.includes("EVOLUTION_ONLY_MARKER"), false)
  assert.equal(result.profile.promptSummary.includes("GLOBAL_ONLY_MARKER"), false)
})

test("buildGenerationEvolutionContext selects cached lines and alphabetical additions", () => {
  const profile = buildGenerationProfile({
    prompt: "A 3D zombie survival game with scavenging, shelter repair, and horde nights",
    genre: "survival",
    selectedFeatures: ["world_gen", "inventory", "audio", "ui"],
    multiplayer: false,
    maxPlayers: 1,
  })

  const context = buildGenerationEvolutionContext({
    prompt: "A 3D zombie survival game with scavenging, shelter repair, and horde nights",
    genre: "survival",
    dimension: profile.dimension,
    selectedFeatures: profile.resolvedFeatures,
    currentUserProjects: [{
      id: "proj_history" as never,
      name: "Outpost Archive",
      description: "A 3D zombie survival game with scavenging, shelter repair, and horde nights",
      genre: profile.resolvedGenre,
      dimension: profile.dimension,
      engine: "unreal",
      features: profile.resolvedFeatures,
      multiplayer: false,
      maxPlayers: 1,
      seed: "test_seed",
      status: "complete",
      progress: 100,
      createdAt: new Date().toISOString(),
      llmConfiguration: {
        provider: "gpt",
        source: "user-key",
        releaseStatus: "ready",
      },
      design: profile,
      systems: [],
      codeFiles: [],
      assetFiles: [],
      feedback: [
        createProjectFeedback({
          project: { design: profile },
          scoreBand: "9-10",
          notes: "Great survival pressure and strong 3D traversal.",
        }),
      ],
    }],
    allProjects: [],
    totalUsers: 1,
  })

  assert.equal(context.cacheLines.length, 2)
  assert.ok(context.cacheLines.every((entry) => typeof entry.line === "string" && entry.line.length > 0))
  assert.ok(context.alphabeticalAdditions.length >= 1)
  assert.ok(context.insertionBlocks.length >= 1)
  assert.equal(context.insertionBlocks[0]?.divider, "-----------------------------------")
  assert.ok(context.insertionBlocks[0]?.promptInsertions.length > 0)
  assert.ok(context.insertionBlocks[0]?.codeInsertions.some((entry) => entry.includes("EVOLUTION_INSERT")))
  assert.ok(context.promptExpansionHints.length >= 2)
})

test("enhanceGenerationBrief updates visible prompt and settings before generation when a key is configured", async () => {
  const originalFetch = globalThis.fetch
  const aiSettings = createEmptyUserAiSettings()
  aiSettings.defaultProvider = "openrouter"
  aiSettings.apiKeys.openrouter = "or-test"
  aiSettings.models.openrouter = "openai/gpt-5.4"

  globalThis.fetch = (async () => new Response(JSON.stringify({
    choices: [
      {
        message: {
          content: JSON.stringify({
            enhancedUserPrompt: "A 3D co-op heist where a crew infiltrates a luxury vault, disables layered security, steals prototype tech, and escapes through a reactive getaway route.",
            enhancedPrompt: "A 3D co-op heist where a crew infiltrates a luxury vault, disables layered security, steals prototype tech, and escapes through a reactive getaway route. Designer directives: Subgenres: Heist, Immersive Sim. Prefer a third-person camera. Combat intensity should be medium.",
            resolvedGenre: "fps",
            resolvedMultiplayer: true,
            resolvedMaxPlayers: 4,
            requiredFeatures: ["stealth", "questing", "inventory", "ui"],
            disallowedFeatures: [],
            intentNotes: ["Keep layered infiltration routes", "Preserve extraction payoff"],
            compilePriorities: ["Runtime-specific mission files", "Engine compile markers in generated sources"],
          }),
        },
      },
    ],
    usage: {
      prompt_tokens: 90,
      completion_tokens: 60,
      total_tokens: 150,
    },
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  })) as typeof fetch

  try {
    const result = await enhanceGenerationBrief({
      prompt: "A co-op vault heist game",
      displayPrompt: "A co-op vault heist game",
      genre: "fps",
      selectedFeatures: ["ui"],
      multiplayer: true,
      maxPlayers: 4,
      aiSettings,
    })

    assert.equal(result.llmConfiguration.source, "user-key")
    assert.equal(result.displayPrompt.startsWith("A 3D co-op heist"), true)
    assert.ok(result.prompt.includes("Designer directives:"))
    assert.equal(result.genre, "fps")
    assert.equal(result.multiplayer, true)
    assert.equal(result.maxPlayers, 4)
    assert.ok(result.selectedFeatures.includes("stealth"))
    assert.ok(result.selectedFeatures.includes("questing"))
    assert.ok(result.intentNotes.length > 0)
    assert.ok(result.compilePriorities.length > 0)
    assert.ok(result.llmConfiguration.stages?.some((stage) => stage.id === "provider_brief_enhancement"))
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("generateGenerationProfile uses provider brief enhancement before refinement when a key is configured", async () => {
  const originalFetch = globalThis.fetch
  const requestBodies: Array<Record<string, unknown>> = []
  const aiSettings = createEmptyUserAiSettings()
  aiSettings.defaultProvider = "gpt"
  aiSettings.apiKeys.gpt = "sk-test"
  aiSettings.models.gpt = "gpt-5-mini"

  globalThis.fetch = (async (_input, init) => {
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {}
    requestBodies.push(body)
    const callIndex = requestBodies.length

    const text = callIndex === 1
      ? JSON.stringify({
          enhancedUserPrompt: "A 3D zombie survival game with scavenging runs, safehouse repair, extraction pressure, and firearms.",
          enhancedPrompt: "A 3D zombie survival game with scavenging runs, safehouse repair, extraction pressure, and firearms. Designer directives: Prefer a third-person camera. Combat intensity should be high.",
          resolvedGenre: "survival",
          resolvedMultiplayer: false,
          resolvedMaxPlayers: 1,
          requiredFeatures: ["combat", "inventory", "world_gen"],
          disallowedFeatures: [],
          intentNotes: ["Preserve 3D survival pressure", "Keep safehouse repair playable"],
          compilePriorities: ["Runtime-specific code files", "Engine markers in generated sources"],
        })
      : callIndex === 2
        ? JSON.stringify({
            summary: "The loop still needs camera, compile, and anti-collapse rules locked.",
            missingCriteria: [
              {
                field: "camera_style",
                severity: "medium",
                reason: "The brief implies direct-avatar play and should keep a third-person camera.",
                suggestedFill: "Third-person survival camera with extraction landmarks",
              },
            ],
            inferenceDiff: [
              {
                field: "dimension",
                explicitValue: "3D",
                inferredValue: "3d",
                rationale: "The brief explicitly asks for a 3D survival game.",
                applied: true,
              },
            ],
            antiCollapseRules: ["Do not collapse into a flat 2D management loop."],
            engineExpectations: ["Preserve direct-avatar traversal and readable combat space."],
            compilePriorities: ["Runtime-specific code files", "Engine markers in generated sources"],
          })
        : callIndex === 3 || callIndex === 4 || callIndex === 6
          ? JSON.stringify({
              resolvedGenre: "survival",
              resolvedDimension: "3d",
              resolvedMultiplayer: false,
              resolvedMaxPlayers: 1,
              resolvedScopeScale: "expanded",
              runtimeArchetype: "survival_expedition_3d",
              cameraStyle: "Third-person survival camera with extraction landmarks",
              requiredFeatures: ["combat", "inventory", "world_gen"],
              disallowedFeatures: [],
              promptSummary: "Prompt interpreted as a solo 3D survival project while preserving direct-avatar scavenging and safehouse pressure.",
              generatedPitch: "A combat-driven 3D survival experience built around layered open-world cells.",
              genreReason: "The prompt explicitly describes 3D zombie survival, scavenging, firearms, and repair loops.",
              playerFantasy: "Traverse dangerous districts, scavenge what you need, and get home alive with the safehouse still standing.",
              sessionFantasy: "A session should feel like a high-pressure scavenging run that turns into a tense return-and-repair loop.",
              interactionModel: "Direct-avatar traversal, scavenging, repair, and extraction pressure should stay explicit in every major beat.",
              experienceGoals: ["Preserve 3D traversal", "Keep safehouse repair core", "Protect scavenging pressure"],
              contentPillars: ["Scavenge routes", "Safehouse recovery", "Hostile escalation"],
              progressionArcs: ["Open the next district", "Upgrade the safehouse", "Survive stronger horde pressure"],
              environmentThemes: ["Unsafe shelter", "Threat-saturated dead zones", "Readable horizon anchors"],
              uiSurfaces: ["Objective feed", "Vitals and ammo", "Repair materials"],
              systemPriorities: ["Spatial readability", "Objective-led combat flow", "Non-overlapping layout ownership"],
              negativeConstraints: [],
            })
          : callIndex === 5
            ? JSON.stringify({
                decision: "pass",
                summary: "The chosen candidate preserves the 3D survival fantasy and runtime requirements.",
                blockedReasons: [],
                warnings: [],
                missingCriteria: [],
                inferenceDiff: [],
                repairInstructions: [],
              })
            : JSON.stringify({
                decision: "ready",
                summary: "The final profile is ready for workspace generation and compile preflight.",
                blockers: [],
                warnings: [],
              })

    return new Response(JSON.stringify({
      choices: [
        {
          message: {
            content: text,
          },
        },
      ],
      usage: {
        prompt_tokens: 120,
        completion_tokens: 80,
        total_tokens: 200,
      },
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    })
  }) as typeof fetch

  try {
    const evolutionContext = buildGenerationEvolutionContext({
      prompt: "A 3D zombie survival game with scavenging, shelter repair, and firearms",
      genre: "survival",
      dimension: "3d",
      selectedFeatures: ["ui", "world_gen"],
      currentUserProjects: [],
      allProjects: [],
      totalUsers: 0,
    })
    const result = await generateGenerationProfile({
      prompt: "A 3D zombie survival game with scavenging, shelter repair, and firearms",
      genre: "survival",
      selectedFeatures: ["ui"],
      multiplayer: false,
      maxPlayers: 1,
      evolutionContext,
      aiSettings,
    })

    assert.equal(requestBodies.length, 7)
    assert.equal(result.llmConfiguration.source, "user-key")
    assert.ok(result.preparationRun?.ok)
    assert.ok(result.promptRun?.ok)
    assert.ok(result.llmConfiguration.stages?.some((stage) => stage.id === "provider_brief_enhancement"))
    assert.ok(result.llmConfiguration.stages?.some((stage) => stage.id === "intent_gap_fill"))
    assert.ok(result.llmConfiguration.stages?.some((stage) => stage.id === "candidate_generation"))
    assert.ok(result.llmConfiguration.stages?.some((stage) => stage.id === "candidate_critique"))
    assert.ok(result.llmConfiguration.stages?.some((stage) => stage.id === "provider_refinement"))
    assert.ok(result.llmConfiguration.stages?.some((stage) => stage.id === "release_judgement"))
    assert.equal(result.llmConfiguration.budgetMinutes, 90)
    assert.ok(result.loopReport)
    assert.ok(result.loopReport?.promptPackets.some((packet) => packet.includes.includes("Runtime encounter continuity")))
    assert.ok(result.candidateRuns && result.candidateRuns.length >= 2)
    assert.ok(result.profile.resolvedFeatures.includes("combat"))
    assert.equal(result.profile.runtimePlan.archetype, "survival_expedition_3d")
    assert.equal(result.profile.cameraStyle, "Third-person survival camera with extraction landmarks")
    assert.match(JSON.stringify(requestBodies[1]), /Expanded generation brief/)
    assert.match(JSON.stringify(requestBodies[2]), /runtime encounter continuity|scenario chain|cadence/i)
    assert.match(JSON.stringify(requestBodies[0]), /Evolution context/i)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("multi-key provider settings build a cross-provider roster for the loop", () => {
  const aiSettings = createEmptyUserAiSettings()
  aiSettings.defaultProvider = "openrouter"
  aiSettings.apiKeys.openrouter = "or-test"
  aiSettings.apiKeys.gpt = "gpt-test"
  aiSettings.apiKeys.claude = "claude-test"
  aiSettings.models.openrouter = "openai/gpt-5.4"
  aiSettings.models.gpt = "gpt-5-mini"
  aiSettings.models.claude = "claude-sonnet-4-20250514"

  const roster = getConfiguredUserProviderRoster(aiSettings)

  assert.ok(roster)
  assert.equal(roster.roster.mode, "cross_provider")
  assert.equal(roster.roster.assignments.some((assignment) => assignment.role === "author" && assignment.provider === "openrouter"), true)
  assert.equal(roster.roster.assignments.some((assignment) => assignment.role === "critic"), true)
  assert.equal(roster.roster.assignments.some((assignment) => assignment.role === "release_judge"), true)
})

test("multi-key provider loops recover from a failed selected provider and record the exact provider failure", async () => {
  const originalFetch = globalThis.fetch
  const aiSettings = createEmptyUserAiSettings()
  aiSettings.defaultProvider = "openrouter"
  aiSettings.apiKeys.openrouter = "or-invalid"
  aiSettings.apiKeys.gpt = "sk-valid"
  aiSettings.models.openrouter = "openai/gpt-5.4"
  aiSettings.models.gpt = "gpt-5-mini"

  const requestUrls: string[] = []
  let gptSuccessCalls = 0

  globalThis.fetch = (async (input, init) => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url
    requestUrls.push(url)

    if (url.includes("openrouter.ai")) {
      return new Response(JSON.stringify({
        error: {
          message: "OpenRouter rejected the API key.",
          type: "authentication_error",
          code: "invalid_api_key",
        },
      }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "x-request-id": "or_req_test_001",
        },
      })
    }

    gptSuccessCalls += 1
    const text = gptSuccessCalls === 1
      ? JSON.stringify({
          enhancedUserPrompt: "A 3D zombie survival game with scavenging runs, safehouse repair, extraction pressure, and firearms.",
          enhancedPrompt: "A 3D zombie survival game with scavenging runs, safehouse repair, extraction pressure, and firearms. Designer directives: Prefer a third-person camera. Combat intensity should be high.",
          resolvedGenre: "survival",
          resolvedMultiplayer: false,
          resolvedMaxPlayers: 1,
          requiredFeatures: ["combat", "inventory", "world_gen"],
          disallowedFeatures: [],
          intentNotes: ["Preserve 3D survival pressure", "Keep safehouse repair playable"],
          compilePriorities: ["Runtime-specific code files", "Engine markers in generated sources"],
        })
      : gptSuccessCalls === 2
        ? JSON.stringify({
            summary: "The loop still needs camera, compile, and anti-collapse rules locked.",
            missingCriteria: [],
            inferenceDiff: [
              {
                field: "dimension",
                explicitValue: "3D",
                inferredValue: "3d",
                rationale: "The brief explicitly asks for a 3D survival game.",
                applied: true,
              },
            ],
            antiCollapseRules: ["Do not collapse into a flat 2D management loop."],
            engineExpectations: ["Preserve direct-avatar traversal and readable combat space."],
            compilePriorities: ["Runtime-specific code files", "Engine markers in generated sources"],
          })
        : gptSuccessCalls === 3 || gptSuccessCalls === 4 || gptSuccessCalls === 6
          ? JSON.stringify({
              resolvedGenre: "survival",
              resolvedDimension: "3d",
              resolvedMultiplayer: false,
              resolvedMaxPlayers: 1,
              resolvedScopeScale: "expanded",
              runtimeArchetype: "survival_expedition_3d",
              cameraStyle: "Third-person survival camera with extraction landmarks",
              requiredFeatures: ["combat", "inventory", "world_gen"],
              disallowedFeatures: [],
              promptSummary: "Prompt interpreted as a solo 3D survival project while preserving direct-avatar scavenging and safehouse pressure.",
              generatedPitch: "A combat-driven 3D survival experience built around layered open-world cells.",
              genreReason: "The prompt explicitly describes 3D zombie survival, scavenging, firearms, and repair loops.",
              playerFantasy: "Traverse dangerous districts, scavenge what you need, and get home alive with the safehouse still standing.",
              sessionFantasy: "A session should feel like a high-pressure scavenging run that turns into a tense return-and-repair loop.",
              interactionModel: "Direct-avatar traversal, scavenging, repair, and extraction pressure should stay explicit in every major beat.",
              experienceGoals: ["Preserve 3D traversal", "Keep safehouse repair core", "Protect scavenging pressure"],
              contentPillars: ["Scavenge routes", "Safehouse recovery", "Hostile escalation"],
              progressionArcs: ["Open the next district", "Upgrade the safehouse", "Survive stronger horde pressure"],
              environmentThemes: ["Unsafe shelter", "Threat-saturated dead zones", "Readable horizon anchors"],
              uiSurfaces: ["Objective feed", "Vitals and ammo", "Repair materials"],
              systemPriorities: ["Spatial readability", "Objective-led combat flow", "Non-overlapping layout ownership"],
              negativeConstraints: [],
            })
          : gptSuccessCalls === 5
            ? JSON.stringify({
                decision: "pass",
                summary: "The chosen candidate preserves the 3D survival fantasy and runtime requirements.",
                blockedReasons: [],
                warnings: [],
                missingCriteria: [],
                inferenceDiff: [],
                repairInstructions: [],
              })
            : JSON.stringify({
                decision: "ready",
                summary: "The final profile is ready for workspace generation and compile preflight.",
                blockers: [],
                warnings: [],
              })

    return new Response(JSON.stringify({
      choices: [
        {
          message: {
            content: text,
          },
        },
      ],
      usage: {
        prompt_tokens: 120,
        completion_tokens: 80,
        total_tokens: 200,
      },
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    })
  }) as typeof fetch

  try {
    const result = await generateGenerationProfile({
      prompt: "A 3D zombie survival game with scavenging, shelter repair, and firearms",
      genre: "survival",
      selectedFeatures: ["ui"],
      multiplayer: false,
      maxPlayers: 1,
      aiSettings,
    })

    assert.ok(requestUrls.some((url) => url.includes("openrouter.ai")))
    assert.ok(requestUrls.some((url) => url.includes("openai.com")))
    assert.equal(result.releaseJudgement?.decision, "ready")
    assert.ok(result.providerFailures && result.providerFailures.length > 0)
    assert.ok(result.providerFailures?.some((failure) => failure.provider === "openrouter" && failure.status === 401 && failure.recovered))
    assert.ok(result.llmConfiguration.providerFailures?.some((failure) => failure.provider === "openrouter"))
    assert.ok(result.llmConfiguration.fallbackProvidersUsed?.includes("gpt"))
    assert.ok(result.loopReport?.operationalAnalytics)
    assert.ok((result.loopReport?.operationalAnalytics.totalPromptCalls ?? 0) >= 5)
    assert.ok((result.loopReport?.operationalAnalytics?.routingStrategies.length ?? 0) >= 1)
    assert.ok((result.loopReport?.operationalAnalytics?.cacheableStages.length ?? 0) >= 1)
    assert.ok(result.llmConfiguration.operationalAnalytics)
    assert.ok(result.providerDiagnostics)
    assert.ok((result.providerDiagnostics?.recoveredFailures ?? 0) >= 1)
    assert.ok((result.providerDiagnostics?.categories.length ?? 0) >= 1)
    assert.ok((result.providerDiagnostics?.actionItems.length ?? 0) >= 1)
    assert.ok(result.llmConfiguration.providerDiagnostics)
    assert.ok((result.llmConfiguration.providerDiagnostics?.healthSignals.length ?? 0) >= 1)
    assert.ok((result.llmConfiguration.operationalAnalytics?.failureCategories?.length ?? 0) >= 1)
    assert.ok((result.llmConfiguration.operationalAnalytics?.retryStrategies?.length ?? 0) >= 1)
    assert.ok((result.llmConfiguration.operationalAnalytics?.providerHealthSignals?.length ?? 0) >= 1)
    assert.equal(result.profile.dimension, "3d")
    assert.equal(result.profile.runtimePlan.archetype, "survival_expedition_3d")
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("3D zombie survival briefs stay combat-capable and select the survival runtime", () => {
  const profile = buildGenerationProfile({
    prompt: "A 3D zombie survival game with scavenging, shelter repair, horde nights, and firearms",
    genre: "survival",
    selectedFeatures: ["inventory", "world_gen", "audio"],
    multiplayer: false,
    maxPlayers: 1,
  })

  assert.equal(profile.dimension, "3d")
  assert.ok(profile.promptSignals.includes("combat-heavy"))
  assert.ok(profile.resolvedFeatures.includes("combat"))
  assert.equal(profile.runtimePlan.archetype, "survival_expedition_3d")
  assert.equal(profile.graphicsPlan.renderPath, "Expedition survival 3D")
  assert.equal(profile.enginePlan.recommendedEngine, "unreal")
  assert.equal(profile.pipelinePlan.targetMinutes >= 40, true)
  assert.ok(profile.assetPlan.generationToolchains.some((toolchain) => toolchain.id === "three_d_mesh_drafting"))
  assert.ok(profile.assetPlan.generationToolchains.some((toolchain) => /Tencent\/Hunyuan3D-2|microsoft\/TRELLIS/.test(toolchain.primarySource)))
})

test("Stardew-like farming briefs select the homestead runtime instead of combat", () => {
  const profile = buildGenerationProfile({
    prompt: "A cozy farming life sim like Stardew Valley with crops, fishing, villagers, and no combat",
    genre: "simulation",
    selectedFeatures: ["world_gen", "ui", "audio"],
    multiplayer: false,
    maxPlayers: 1,
  })

  assert.equal(profile.resolvedGenre, "simulation")
  assert.ok(profile.promptSignals.includes("peaceful"))
  assert.equal(profile.runtimePlan.archetype, "homestead_life")
  assert.equal(profile.graphicsPlan.renderPath, "Illustrated simulation 2D")
  assert.equal(profile.enginePlan.recommendedEngine, "godot")
  assert.ok(profile.runtimePlan.antiCollapseRules.some((rule) => /combat template/i.test(rule)))
  assert.equal(profile.pipelinePlan.targetMinutes >= 24, true)
})

test("3D action prompts select the operation runtime instead of strategy collapse", () => {
  const profile = buildGenerationProfile({
    prompt: "A 3D tactical shooter like Black Ops with squad breaches, mission objectives, extraction, and readable combat spaces",
    genre: "fps",
    selectedFeatures: ["combat", "audio", "ui"],
    multiplayer: true,
    maxPlayers: 4,
  })

  assert.equal(profile.dimension, "3d")
  assert.equal(profile.runtimePlan.archetype, "action_operation_3d")
  assert.equal(profile.graphicsPlan.renderPath, "Cinematic operation 3D")
  assert.equal(profile.enginePlan.recommendedEngine, "unreal")
  assert.ok(profile.runtimePlan.antiCollapseRules.some((rule) => /fortify|board|button-clicker|management loop/i.test(rule)))
  assert.equal(profile.pipelinePlan.targetMinutes >= 40, true)
})

test("planning overrides can lock dimension, camera, runtime, and larger scope", () => {
  const profile = buildGenerationProfile({
    prompt: "A dark prototype about surviving an abandoned city.",
    genre: "survival",
    selectedFeatures: ["world_gen", "audio"],
    multiplayer: false,
    maxPlayers: 1,
    planningOverrides: {
      dimension: "3d",
      cameraStyle: "Third-person survival camera with extraction landmarks",
      runtimeArchetype: "survival_expedition_3d",
      scopeScale: "limitless",
    },
  })

  assert.equal(profile.dimension, "3d")
  assert.equal(profile.cameraStyle, "Third-person survival camera with extraction landmarks")
  assert.equal(profile.runtimePlan.archetype, "survival_expedition_3d")
  assert.equal(profile.scopeScale, "limitless")
  assert.equal(profile.pipelinePlan.targetMinutes >= 55, true)
})

test("generation profiles now include prompt council and expert asset review scaffolding", () => {
  const profile = buildGenerationProfile({
    prompt: "A 3D tactical extraction shooter with squad roles, distinct mission phases, and strong environment readability",
    genre: "fps",
    selectedFeatures: ["combat", "rendering", "audio", "ui"],
    multiplayer: true,
    maxPlayers: 4,
  })

  assert.ok(profile.promptCouncilPlan.agents.length >= 6)
  assert.ok(profile.promptCouncilPlan.promptTiers.some((tier) => tier.id === "tier_2_template_debate"))
  assert.ok(profile.assetPlan.specialistTracks.length >= 3)
  assert.ok(profile.assetPlan.reviewPasses.length >= 3)
  assert.ok(profile.assetPlan.qualityGates.length >= 3)
  assert.ok(profile.assetPlan.integrationContracts.length >= 2)
  assert.ok(profile.assetPlan.productionPhases.length >= 3)
  assert.ok(profile.assetPlan.reuseDirectives.length >= 3)
})

test("designer directives can force social deduction layouts and anti-combat rules", () => {
  const profile = buildGenerationProfile({
    prompt: [
      "A prototype about a crew under pressure.",
      "",
      "Designer directives: Subgenres: Social Deduction, Party Game. Prefer a top down camera. Do not force combat into the design. Pacing should feel intense. Simulation depth 2/5. Narrative emphasis 1/5. Novelty target 5/5. Genre blending mode: hybrid experimental.",
    ].join("\n"),
    genre: "strategy",
    selectedFeatures: ["ui"],
    multiplayer: true,
    maxPlayers: 8,
  })

  assert.equal(profile.dimension, "2d")
  assert.ok(profile.promptSignals.includes("social-deduction"))
  assert.ok(profile.promptSignals.includes("hybridized"))
  assert.ok(profile.promptSignals.includes("novelty-high"))
  assert.ok(profile.resolvedFeatures.includes("social_deduction"))
  assert.ok(profile.resolvedFeatures.includes("networking"))
  assert.ok(!profile.resolvedFeatures.includes("combat"))
  assert.ok(profile.negativeConstraints.some((constraint) => /combat/i.test(constraint)))
  assert.equal(profile.mapArchetype, "Social Hub and Vote Loop")
})

test("designer directives can force puzzle-sandbox chamber planning from a generic prompt", () => {
  const profile = buildGenerationProfile({
    prompt: [
      "A strange experimental prototype.",
      "",
      "Designer directives: Subgenres: Puzzle Sandbox. Prefer a first person camera. Combat intensity should be none. Pacing should feel steady. Simulation depth 3/5. Narrative emphasis 1/5. Novelty target 4/5. Genre blending mode: strict.",
    ].join("\n"),
    genre: "adventure",
    selectedFeatures: ["ui"],
    multiplayer: false,
    maxPlayers: 1,
  })

  assert.equal(profile.dimension, "3d")
  assert.ok(profile.promptSignals.includes("puzzle-heavy"))
  assert.ok(profile.promptSignals.includes("genre-pure"))
  assert.ok(profile.promptSignals.includes("novelty-high"))
  assert.ok(profile.resolvedFeatures.includes("puzzle"))
  assert.ok(profile.resolvedFeatures.includes("physics_sandbox"))
  assert.ok(!profile.resolvedFeatures.includes("combat"))
  assert.equal(profile.mapArchetype, "Puzzle Chamber Network")
})

test("immersive heist prompts gain layered world selection and systemic candidates", () => {
  const profile = buildGenerationProfile({
    prompt: "A 3D immersive sim heist where a crew infiltrates a luxury vault, disables security systems, steals prototype tech, and extracts without becoming a corridor shooter",
    genre: "fps",
    selectedFeatures: ["ui", "audio", "inventory"],
    multiplayer: false,
    maxPlayers: 1,
  })

  assert.equal(profile.dimension, "3d")
  assert.ok(profile.promptSignals.includes("heist-heavy"))
  assert.ok(profile.promptSignals.includes("immersive-sim"))
  assert.equal(profile.mapArchetype, "Immersive Stronghold Layers")
  assert.equal(profile.runtimePlan.archetype, "action_operation_3d")
  assert.equal(profile.graphicsPlan.renderPath, "Systemic infiltration 3D")
  assert.ok(profile.diversityPlan.retrievalExamples.some((reference) => reference.id === "immersive_heist_compound"))
  assert.ok(profile.candidatePlan.candidates.some((candidate) => candidate.id === "candidate_systemic_space"))
})

test("detective mystery prompts stay non-combat and choose investigation-first planning", () => {
  const profile = buildGenerationProfile({
    prompt: "A 3D detective mystery with no combat, suspects to interview, crime scenes to inspect, a clue board, and a city-wide conspiracy to unravel",
    genre: "adventure",
    selectedFeatures: ["ui", "dialogue"],
    multiplayer: false,
    maxPlayers: 1,
  })

  assert.equal(profile.dimension, "3d")
  assert.ok(profile.promptSignals.includes("investigation-heavy"))
  assert.ok(profile.promptSignals.includes("mystery-heavy"))
  assert.ok(!profile.resolvedFeatures.includes("combat"))
  assert.equal(profile.runtimePlan.archetype, "journey_route")
  assert.equal(profile.mapArchetype, "Investigation District Grid")
  assert.equal(profile.graphicsPlan.renderPath, "Forensic exploration 3D")
  assert.ok(profile.diversityPlan.retrievalExamples.some((reference) => reference.id === "investigation_case_district"))
  assert.ok(profile.candidatePlan.candidates.some((candidate) => candidate.id === "candidate_narrative_social"))
})

test("archaeology restoration prompts build restoration-first worlds without combat drift", () => {
  const profile = buildGenerationProfile({
    prompt: "A 3D archaeology restoration sim with no combat, excavation camps, artifact cleaning, museum displays, and careful expedition prep",
    genre: "simulation",
    selectedFeatures: ["world_gen", "ui", "dialogue"],
    multiplayer: false,
    maxPlayers: 1,
  })

  assert.equal(profile.dimension, "3d")
  assert.ok(profile.promptSignals.includes("archaeology-heavy"))
  assert.ok(profile.promptSignals.includes("restoration-heavy"))
  assert.ok(!profile.resolvedFeatures.includes("combat"))
  assert.equal(profile.runtimePlan.archetype, "homestead_life")
  assert.equal(profile.mapArchetype, "Restoration Campus Loop")
  assert.equal(profile.graphicsPlan.renderPath, "Curatorial exploration 3D")
  assert.ok(profile.diversityPlan.retrievalExamples.some((reference) => reference.id === "restoration_expedition_campus"))
  assert.ok(profile.candidatePlan.candidates.some((candidate) => candidate.id === "candidate_systemic_space"))
})

test("political deckbuilder prompts surface civic strategy support without changing the core flow", () => {
  const profile = buildGenerationProfile({
    prompt: "A 2D political strategy deckbuilder about running a city council, passing policies, bargaining with factions, and stabilizing districts without combat",
    genre: "strategy",
    selectedFeatures: ["ui", "dialogue"],
    multiplayer: false,
    maxPlayers: 1,
  })

  assert.equal(profile.dimension, "2d")
  assert.ok(profile.promptSignals.includes("politics-heavy"))
  assert.ok(profile.promptSignals.includes("card-heavy"))
  assert.ok(profile.resolvedFeatures.includes("deckbuilding"))
  assert.ok(profile.resolvedFeatures.includes("diplomacy"))
  assert.ok(profile.resolvedFeatures.includes("faction_reputation"))
  assert.equal(profile.runtimePlan.archetype, "strategy_command")
  assert.equal(profile.mapArchetype, "Tactics Board Sectors")
  assert.ok(profile.diversityPlan.retrievalExamples.some((reference) => reference.id === "civic_policy_chamber" || reference.id === "deck_command_district"))
  assert.ok(profile.candidatePlan.candidates.some((candidate) => candidate.id === "candidate_narrative_social"))
})

test("farming briefs now build richer asset integration logic", () => {
  const profile = buildGenerationProfile({
    prompt: "A cozy farming life sim with crops, villagers, markets, and seasonal festivals",
    genre: "simulation",
    selectedFeatures: ["world_gen", "ui", "inventory", "ai_npc"],
    multiplayer: false,
    maxPlayers: 1,
  })

  assert.equal(typeof profile.assetPlan.assetSystemSummary, "string")
  assert.equal(typeof profile.assetPlan.kitArchitecture, "string")
  assert.ok(profile.assetPlan.spawnRules.length >= 3)
  assert.ok(profile.assetPlan.stateModelRules.length >= 3)
  assert.ok(profile.assetPlan.integrationContracts.some((contract) => /inventory|runtime/i.test(contract.targetSystems.join(" "))))
  assert.ok(profile.assetPlan.characterBlueprints.some((character) => character.stateVariants.length > 0))
  assert.ok(profile.assetPlan.propBlueprints.some((prop) => prop.interactionHooks.length > 0))
  assert.ok(profile.assetPlan.environmentKits.some((kit) => kit.propFamilies.length > 0))
  assert.equal(typeof profile.assetPlan.modelGenerationSummary, "string")
  assert.equal(typeof profile.assetPlan.orchestrationStrategy, "string")
  assert.ok(profile.assetPlan.generationToolchains.length >= 3)
  assert.ok(profile.assetPlan.toolchainQualityChecks.length >= 3)
  assert.ok(profile.assetPlan.generationToolchains.some((toolchain) => toolchain.primarySource === "lllyasviel/stable-diffusion-webui-forge"))
  assert.ok(profile.assetPlan.generationToolchains.some((toolchain) => toolchain.primarySource === "Al-Asl/AutoLevel"))
})

test("selection intelligence adds retrieval, candidate ranking, evals, and diversity memory", () => {
  const profile = buildGenerationProfile({
    prompt: "A cozy archaeology sim with no combat, camp logistics, artifact restoration, and seasonal expeditions",
    genre: "simulation",
    selectedFeatures: ["world_gen", "inventory", "ui", "dialogue"],
    multiplayer: false,
    maxPlayers: 1,
  })

  assert.ok(profile.diversityPlan.retrievalExamples.length >= 1)
  assert.ok(profile.diversityPlan.antiCollapseChecks.some((check) => /combat|constraint/i.test(check)))
  assert.ok(profile.candidatePlan.candidates.length >= 3)
  assert.ok(profile.candidatePlan.candidates.some((candidate) => candidate.score.total >= 70))
  assert.ok(profile.evaluationPlan.datasetBuckets.some((bucket) => bucket.id === "no_combat"))
  assert.ok(profile.evaluationPlan.datasetBuckets.some((bucket) => bucket.id === "simulation_heavy"))
  assert.ok(profile.evaluationPlan.rubrics.some((rubric) => rubric.id === "runtime_fidelity"))
})

test("feedback learning digest turns player notes into repair pressure", () => {
  const profile = buildGenerationProfile({
    prompt: "A 3D zombie survival game with scavenging, shelter repair, and horde nights",
    genre: "survival",
    selectedFeatures: ["world_gen", "inventory", "audio"],
    multiplayer: false,
    maxPlayers: 1,
  })
  const feedback = [
    createProjectFeedback({
      project: { design: profile },
      scoreBand: "failed",
      notes: "I asked for a 3D zombie survival game but it still felt generic and the shelter, scavenging, and horde pressure were too shallow.",
    }),
    createProjectFeedback({
      project: { design: profile },
      scoreBand: "3-4",
      notes: "The camera and survival loop still felt wrong. It needed stronger zombie pressure and more repair depth.",
    }),
  ]
  const digest = buildProjectFeedbackDigest(feedback)

  assert.equal(digest.failurePressure, "high")
  assert.ok(digest.recurringThemes.includes("Dimension fidelity"))
  assert.ok(digest.recurringThemes.includes("Genre collapse"))
  assert.ok(digest.improvementPriorities.some((priority) => /survival/i.test(priority) || /prompt fantasy/i.test(priority)))
  assert.ok(digest.promptAdjustments.some((adjustment) => /Runtime Guard|template debate|survival prompts/i.test(adjustment)))
})

test("feedback learning report builds source repair targets from player notes", () => {
  const profile = buildGenerationProfile({
    prompt: "A 3D zombie survival game with scavenging, shelter repair, and horde nights",
    genre: "survival",
    selectedFeatures: ["world_gen", "inventory", "audio", "ui"],
    multiplayer: false,
    maxPlayers: 1,
  })
  const feedback = [
    createProjectFeedback({
      project: { design: profile },
      scoreBand: "failed",
      notes: "The game felt like the wrong genre, the camera was wrong, and the shelter repair and scavenging systems were too shallow.",
    }),
  ]
  const report = buildFeedbackLearningReport({
    name: "Zombie Outpost",
    description: "A 3D zombie survival game with scavenging, shelter repair, and horde nights",
    genre: "survival",
    dimension: profile.dimension,
    engine: "unreal",
    features: profile.resolvedFeatures,
    design: profile,
    systems: [
      { name: "inventory", displayName: "Inventory", status: "complete", linesGenerated: 1800, engine: "unreal" },
      { name: "combat", displayName: "Combat", status: "complete", linesGenerated: 2100, engine: "unreal" },
      { name: "ui", displayName: "UI", status: "complete", linesGenerated: 900, engine: "unreal" },
    ],
    feedback,
  })

  assert.ok(report.recognizedIssues.some((issue) => issue.label === "Dimension fidelity"))
  assert.ok(report.recognizedIssues.some((issue) => issue.label === "Genre collapse"))
  assert.ok(report.recognizedIssues.some((issue) => issue.label === "Survival pressure"))
  assert.ok(report.sourceRepairPlan.some((target) => target.files.some((file) => /survival-runtime\.tsx|action-runtime-3d\.tsx|playable-runtime\.tsx/.test(file))))
  assert.ok(report.sourceRepairPlan.some((target) => target.files.some((file) => /NexusInventorySystem\.cpp|NexusCombatSystem\.cpp/.test(file))))
  assert.ok(report.generationRepairPlan.evalAdditions.some((item) => /eval/i.test(item)))
  assert.equal(report.learningSignals.sourcePatchRecommended, true)
})

test("generation readiness bundles prompt, agent context, and verification assets before release", () => {
  const profile = buildGenerationProfile({
    prompt: "A cozy farming life sim with crops, villagers, market days, and no combat",
    genre: "simulation",
    selectedFeatures: ["world_gen", "inventory", "ui", "audio"],
    multiplayer: false,
    maxPlayers: 1,
  })
  const evolutionContext = buildGenerationEvolutionContext({
    prompt: "A cozy farming life sim with crops, villagers, market days, and no combat",
    genre: "simulation",
    dimension: profile.dimension,
    selectedFeatures: profile.resolvedFeatures,
    currentUserProjects: [],
    allProjects: [],
    totalUsers: 0,
  })

  const project = {
    name: "Harvest Hearth",
    description: "A cozy farming life sim with crops, villagers, market days, and no combat",
    genre: profile.resolvedGenre,
    dimension: profile.dimension,
    engine: "godot" as const,
    features: profile.resolvedFeatures,
    multiplayer: false,
    maxPlayers: 1,
    llmConfiguration: {
      provider: "local" as const,
      source: "local" as const,
      suiteId: "generation_pipeline",
      suiteVersion: "phase1-2026-03-29",
      evolutionContext,
    },
    design: profile,
    systems: [
      { name: "inventory", displayName: "Inventory", status: "complete" as const, linesGenerated: 1200, engine: "godot" },
      { name: "crop_cycle", displayName: "Crop and Season Cycle", status: "complete" as const, linesGenerated: 1100, engine: "godot" },
      { name: "ui", displayName: "UI", status: "complete" as const, linesGenerated: 800, engine: "godot" },
    ],
    feedback: [],
  }

  const codeFiles = createGeneratedCodeFiles(project)
  const assetFiles = createGeneratedAssetFiles(project, codeFiles)
  const context = buildProjectGenerationContext({
    ...project,
    codeFiles,
    assetFiles,
  })
  const audit = buildProjectGenerationAudit({
    ...project,
    codeFiles,
    assetFiles,
  })

  assert.equal(context.agentBriefs.length, 9)
  assert.ok(context.generatedSystems.every((system) => typeof system.assignedAgent === "string"))
  assert.ok(codeFiles.every((file) => file.content.includes("Original Prompt:")))
  assert.ok(codeFiles.some((file) => file.content.includes("Assigned Agent:")))
  assert.ok(assetFiles.some((file) => file.name === "GenerationContext.asset.json"))
  assert.ok(assetFiles.some((file) => file.name === "AgentBriefing.asset.json"))
  assert.ok(assetFiles.some((file) => file.name === "GenerationVerification.asset.json"))
  assert.ok(assetFiles.some((file) => file.name === "CompileReadiness.asset.json"))
  assert.ok(assetFiles.some((file) => file.name === "GenerationOperations.asset.json"))
  assert.ok(assetFiles.some((file) => file.name === "ProviderDiagnostics.asset.json"))
  assert.ok(assetFiles.some((file) => file.name === "KnowledgeCoverage.asset.json"))
  assert.ok(assetFiles.some((file) => file.name === "KnowledgeRisk.asset.json"))
  assert.ok(assetFiles.some((file) => file.name === "UsageIntelligence.asset.json"))
  assert.ok(assetFiles.some((file) => file.name === "EvolutionContext.asset.json"))
  assert.ok(assetFiles.some((file) => file.name === "EvolutionInsertionBlocks.asset.json"))
  assert.ok(assetFiles.some((file) => file.name === "RuntimeVersatility.asset.json"))
  assert.ok(assetFiles.some((file) => file.name === "RuntimePlaybook.asset.json"))
  assert.ok(assetFiles.some((file) => file.name === "RuntimeEncounterDirector.asset.json"))
  assert.ok(assetFiles.some((file) => file.name === "RuntimeEncounterCadence.asset.json"))
  assert.ok(assetFiles.some((file) => file.name === "ModelGenerationToolchains.asset.json"))
  assert.ok(context.evolutionContext.insertionBlocks.length >= 1)
  assert.ok(context.runtimeEncounter.cadenceWindows.length >= 1)
  assert.match(context.providerDiagnostics.summary, /provider failure/i)
  assert.equal(context.providerDiagnostics.unresolvedFailures, 0)
  assert.ok(context.agentBriefs.some((brief) => brief.evolutionAdvisory.length > 0))
  assert.ok(context.agentBriefs.some((brief) => brief.runtimeEncounterContext.length > 0))
  assert.equal(audit.releaseDecision, "ready")
  assert.ok(audit.checks.some((check) => check.id === "model_generation_context" && check.status === "pass"))
  assert.ok(audit.checks.some((check) => check.id === "compile_surface" && check.status === "pass"))
  assert.ok(audit.checks.some((check) => check.id === "compile_asset" && check.status === "pass"))
  assert.ok(audit.checks.some((check) => check.id === "provider_diagnostics" && check.status === "pass"))
  assert.ok(audit.checks.some((check) => check.id === "provider_signal_coverage" && check.status === "pass"))
})

test("generation readiness blocks incomplete workspaces before presentation", () => {
  const profile = buildGenerationProfile({
    prompt: "A no-combat archaeology sim with restoration, cataloging, and camp logistics",
    genre: "simulation",
    selectedFeatures: ["world_gen", "inventory", "ui"],
    multiplayer: false,
    maxPlayers: 1,
  })

  const audit = buildProjectGenerationAudit({
    name: "Broken Dig",
    description: "A no-combat archaeology sim with restoration, cataloging, and camp logistics",
    genre: profile.resolvedGenre,
    dimension: profile.dimension,
    engine: "godot",
    features: [...profile.resolvedFeatures, "combat"],
    multiplayer: false,
    maxPlayers: 1,
    llmConfiguration: {
      provider: "gpt",
      source: "user-key",
    },
    design: {
      ...profile,
      resolvedFeatures: [...profile.resolvedFeatures, "combat"],
      negativeConstraints: [...profile.negativeConstraints, "No combat should appear in the runtime."],
    },
    systems: [
      { name: "inventory", displayName: "Inventory", status: "complete" as const, linesGenerated: 900, engine: "godot" },
    ],
    codeFiles: [],
    assetFiles: [],
    feedback: [],
  })

  assert.equal(audit.releaseDecision, "blocked")
  assert.ok(audit.checks.some((check) => check.id === "asset_workspace" && check.status === "fail"))
  assert.ok(audit.checks.some((check) => check.id === "code_workspace" && check.status === "fail"))
  assert.ok(audit.checks.some((check) => check.id === "compile_surface" && check.status === "fail"))
  assert.ok(audit.checks.some((check) => check.id === "compile_asset" && check.status === "fail"))
  assert.ok(audit.checks.some((check) => check.id === "constraint_consistency" && check.status === "fail"))
})

test("ensureProjectExecution attaches execution assets and a worker report", () => {
  const profile = buildGenerationProfile({
    prompt: "A cozy farming life sim with crops, villagers, market days, and no combat",
    genre: "simulation",
    selectedFeatures: ["world_gen", "inventory", "ui", "audio"],
    multiplayer: false,
    maxPlayers: 1,
  })

  const project = {
    id: "proj_exec_farm" as never,
    name: "Hearth Harvest",
    description: "A cozy farming life sim with crops, villagers, market days, and no combat",
    genre: profile.resolvedGenre,
    dimension: profile.dimension,
    engine: "godot" as const,
    features: profile.resolvedFeatures,
    multiplayer: false,
    maxPlayers: 1,
    seed: "test_seed",
    status: "complete" as const,
    progress: 100,
    createdAt: new Date().toISOString(),
    llmConfiguration: {
      provider: "local" as const,
      source: "local" as const,
      suiteId: "generation_pipeline",
      suiteVersion: "phase1-2026-03-29",
    },
    design: profile,
    systems: [
      { name: "inventory", displayName: "Inventory", status: "complete" as const, linesGenerated: 1200, engine: "godot" },
      { name: "crop_cycle", displayName: "Crop Cycle", status: "complete" as const, linesGenerated: 1100, engine: "godot" },
    ],
    codeFiles: createGeneratedCodeFiles({
      name: "Hearth Harvest",
      description: "A cozy farming life sim with crops, villagers, market days, and no combat",
      genre: profile.resolvedGenre,
      dimension: profile.dimension,
      engine: "godot" as const,
      features: profile.resolvedFeatures,
      multiplayer: false,
      maxPlayers: 1,
      seed: "test_seed",
      llmConfiguration: {
        provider: "local" as const,
        source: "local" as const,
        suiteId: "generation_pipeline",
        suiteVersion: "phase1-2026-03-29",
      },
      design: profile,
      systems: [
        { name: "inventory", displayName: "Inventory", status: "complete" as const, linesGenerated: 1200, engine: "godot" },
        { name: "crop_cycle", displayName: "Crop Cycle", status: "complete" as const, linesGenerated: 1100, engine: "godot" },
      ],
      feedback: [],
    }),
    assetFiles: [] as ReturnType<typeof createGeneratedAssetFiles>,
    feedback: [],
  }

  project.assetFiles = createGeneratedAssetFiles(project, project.codeFiles)
  const executed = ensureProjectExecution(project)

  assert.ok(executed.execution)
  assert.ok(executed.execution!.stageRuns.length >= 4)
  assert.ok(executed.assetFiles.some((file) => file.name === "GenerationExecution.asset.json"))
  assert.ok(executed.assetFiles.some((file) => file.name === "ExecutionChecks.asset.json"))
  assert.ok(executed.assetFiles.some((file) => file.name === "ExecutionRepairs.asset.json"))
  assert.ok(executed.assetFiles.some((file) => file.name === "CompileRepair.asset.json"))
  assert.ok(executed.assetFiles.some((file) => file.name === "WorkerPipeline.asset.json"))
})

test("runProjectExecutionPipeline repairs incomplete fresh generations before release", () => {
  const profile = buildGenerationProfile({
    prompt: "A 3D zombie survival game with scavenging, shelter repair, and horde nights",
    genre: "survival",
    selectedFeatures: ["world_gen", "inventory", "audio", "ui"],
    multiplayer: false,
    maxPlayers: 1,
  })

  const executed = runProjectExecutionPipeline({
    id: "proj_exec_test" as never,
    name: "Outpost After Dark",
    description: "A 3D zombie survival game with scavenging, shelter repair, and horde nights",
    genre: profile.resolvedGenre,
    dimension: profile.dimension,
    engine: "unreal",
    features: profile.resolvedFeatures,
    multiplayer: false,
    maxPlayers: 1,
    seed: "test_seed",
    status: "complete",
    progress: 100,
    createdAt: new Date().toISOString(),
    llmConfiguration: {
      provider: "local",
      source: "local",
      suiteId: "generation_pipeline",
      suiteVersion: "phase1-2026-03-29",
    },
    design: profile,
    systems: [
      { name: "inventory", displayName: "Inventory", status: "complete", linesGenerated: 1200, engine: "unreal" },
      { name: "combat", displayName: "Combat", status: "complete", linesGenerated: 1400, engine: "unreal" },
    ],
    codeFiles: [],
    assetFiles: [],
    feedback: [],
  })

  assert.ok(executed.execution)
  assert.ok(executed.execution!.autoRepairApplied)
  assert.ok(executed.execution!.repairActions.some((action) => action.applied))
  assert.ok(executed.execution!.stageRuns.some((stage) => stage.id === "compile_repair"))
  assert.ok(executed.codeFiles.length >= executed.systems.length)
  assert.ok(executed.assetFiles.some((file) => file.name === "GenerationExecution.asset.json"))
  assert.ok(executed.assetFiles.some((file) => file.name === "CompileRepair.asset.json"))
  assert.notEqual(executed.execution!.releaseDecision, "blocked")
})
