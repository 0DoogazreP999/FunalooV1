import assert from "node:assert/strict"
import test from "node:test"
import { LocalStorageAdapter, MockAdapter } from "../index"
import type { RegisteredUser } from "@/lib/user-store"
import type { UserProject, ProjectId, Email } from "@/lib/engine/types"
import type { StoredDashboardState } from "@/lib/project-storage"

function createMockLocalStorage() {
  const store = new Map<string, string>()

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value) },
    removeItem: (key: string) => { store.delete(key) },
    clear: () => { store.clear() },
    get length() { return store.size },
    key: (index: number) => [...store.keys()][index] ?? null,
  }
}

function testUser(overrides: Partial<RegisteredUser> = {}): RegisteredUser {
  return {
    id: "user_test1",
    name: "Test User",
    email: "test@example.com" as Email,
    role: "user",
    signedUpAt: "2026-01-01T00:00:00.000Z",
    lastLoginAt: "2026-01-01T00:00:00.000Z",
    projectCount: 0,
    totalLinesGenerated: 0,
    avatarUrl: "",
    tagline: "",
    bio: "",
    connections: { discord: "", twitter: "", github: "", linkedin: "", website: "" },
    aiSettings: {
      defaultProvider: "local",
      apiKeys: {
        claude: "",
        openrouter: "",
        gpt: "",
      },
      models: {
        claude: "claude-sonnet-4-20250514",
        openrouter: "openai/gpt-5.4-mini",
        gpt: "gpt-5-mini",
      },
      modelRouting: {
        claude: {
          generationProfile: "claude-sonnet-4-20250514",
          evaluation: "claude-3-5-haiku-latest",
          candidateRanking: "claude-sonnet-4-20250514",
          assetPlanning: "claude-sonnet-4-20250514",
        },
        openrouter: {
          generationProfile: "openai/gpt-5.4",
          evaluation: "openai/gpt-5.4-mini",
          candidateRanking: "google/gemini-2.5-flash",
          assetPlanning: "anthropic/claude-sonnet-4",
        },
        gpt: {
          generationProfile: "gpt-5.4",
          evaluation: "gpt-5-mini",
          candidateRanking: "gpt-5-mini",
          assetPlanning: "gpt-5-mini",
        },
      },
      routingPolicies: {
        claude: "single-model",
        openrouter: "single-model",
        gpt: "single-model",
      },
      baseUrls: {
        claude: "https://api.anthropic.com",
        openrouter: "https://openrouter.ai/api/v1",
        gpt: "https://api.openai.com/v1",
      },
      updatedAt: {
        claude: null,
        openrouter: null,
        gpt: null,
      },
    },
    ...overrides,
  }
}

function testProject(overrides: Partial<UserProject> = {}): UserProject {
  return {
    id: "proj_abc123" as ProjectId,
    name: "Test Game",
    description: "A test game",
    genre: "fps",
    dimension: "3d",
    engine: "unreal",
    features: ["combat"],
    multiplayer: false,
    maxPlayers: 1,
    status: "complete",
    progress: 100,
    createdAt: "2026-01-01T00:00:00.000Z",
    llmConfiguration: {
      provider: "local",
      source: "local",
    },
    design: {} as UserProject["design"],
    systems: [{ name: "combat", displayName: "Combat", status: "complete", linesGenerated: 500, engine: "unreal" }],
    codeFiles: [],
    assetFiles: [],
    ...overrides,
  } as UserProject
}

function runAdapterTests(name: string, createAdapter: () => LocalStorageAdapter | MockAdapter) {
  test(name, async (suite) => {
    const reset = () => {
      if (typeof localStorage !== "undefined") {
        localStorage.clear()
      }

      return createAdapter()
    }

    await suite.test("returns undefined for unknown email", () => {
      const adapter = reset()
      assert.equal(adapter.getUser("nobody@example.com"), undefined)
    })

    await suite.test("saves and retrieves a user by email", () => {
      const adapter = reset()
      adapter.saveUser(testUser())
      const found = adapter.getUser("test@example.com")
      assert.ok(found)
      assert.equal(found.id, "user_test1")
      assert.equal(found.name, "Test User")
    })

    await suite.test("is case-insensitive on email lookup", () => {
      const adapter = reset()
      adapter.saveUser(testUser())
      assert.ok(adapter.getUser("TEST@EXAMPLE.COM"))
      assert.ok(adapter.getUser("Test@Example.Com"))
    })

    await suite.test("updates an existing user on re-save", () => {
      const adapter = reset()
      adapter.saveUser(testUser())
      adapter.saveUser(testUser({ name: "Updated Name" }))
      const found = adapter.getUser("test@example.com")
      assert.ok(found)
      assert.equal(found.name, "Updated Name")
      assert.equal(adapter.getAllUsers().length, 1)
    })

    await suite.test("round-trips per-user AI provider settings", () => {
      const adapter = reset()
      adapter.saveUser(testUser({
        aiSettings: {
          defaultProvider: "gpt",
          apiKeys: {
            claude: "",
            openrouter: "or-key",
            gpt: "gpt-key",
          },
          models: {
            claude: "claude-3-5-sonnet-latest",
            openrouter: "openai/gpt-4o-mini",
            gpt: "gpt-4o-mini",
          },
          modelRouting: {
            claude: {
              generationProfile: "claude-sonnet-4-20250514",
              evaluation: "claude-3-5-haiku-latest",
              candidateRanking: "claude-3-5-haiku-latest",
              assetPlanning: "claude-sonnet-4-20250514",
            },
            openrouter: {
              generationProfile: "openai/gpt-4o-mini",
              evaluation: "meta-llama/llama-4-maverick",
              candidateRanking: "google/gemini-2.5-flash",
              assetPlanning: "openai/gpt-4o-mini",
            },
            gpt: {
              generationProfile: "gpt-4o-mini",
              evaluation: "gpt-4o-mini",
              candidateRanking: "gpt-4o-mini",
              assetPlanning: "gpt-4o-mini",
            },
          },
          routingPolicies: {
            claude: "usage-specific",
            openrouter: "cost-optimized",
            gpt: "single-model",
          },
          baseUrls: {
            claude: "https://api.anthropic.com",
            openrouter: "https://openrouter.ai/api/v1",
            gpt: "https://api.openai.com/v1",
          },
          updatedAt: {
            claude: null,
            openrouter: "2026-03-29T05:00:00.000Z",
            gpt: "2026-03-29T05:05:00.000Z",
          },
        },
      }))

      const found = adapter.getUser("test@example.com")
      assert.ok(found)
      assert.equal(found.aiSettings.defaultProvider, "gpt")
      assert.equal(found.aiSettings.apiKeys.gpt, "gpt-key")
      assert.equal(found.aiSettings.apiKeys.openrouter, "or-key")
      assert.equal(found.aiSettings.routingPolicies.openrouter, "cost-optimized")
      assert.equal(found.aiSettings.modelRouting.openrouter.evaluation, "meta-llama/llama-4-maverick")
      assert.equal(found.aiSettings.updatedAt.gpt, "2026-03-29T05:05:00.000Z")
    })

    await suite.test("round-trips a list of users", () => {
      const adapter = reset()
      const users = [
        testUser({ id: "u1", email: "a@b.com" as Email }),
        testUser({ id: "u2", email: "c@d.com" as Email }),
      ]
      adapter.saveAllUsers(users)
      const loaded = adapter.getAllUsers()
      assert.equal(loaded.length, 2)
      assert.equal(loaded[0].id, "u1")
      assert.equal(loaded[1].id, "u2")
    })

    await suite.test("saves and loads projects scoped by email", () => {
      const adapter = reset()
      const projects = [
        testProject(),
        testProject({ id: "proj_xyz" as ProjectId, name: "Game 2" }),
      ]
      adapter.saveProjects("user@test.com", projects)
      const loaded = adapter.getProjects("user@test.com")
      assert.equal(loaded.length, 2)
      assert.equal(loaded[0].name, "Test Game")
      assert.equal(loaded[1].name, "Game 2")
    })

    await suite.test("isolates projects between users", () => {
      const adapter = reset()
      adapter.saveProjects("alice@test.com", [testProject({ name: "Alice Game" })])
      adapter.saveProjects("bob@test.com", [testProject({ name: "Bob Game" })])
      assert.equal(adapter.getProjects("alice@test.com")[0].name, "Alice Game")
      assert.equal(adapter.getProjects("bob@test.com")[0].name, "Bob Game")
    })

    await suite.test("round-trips project feedback metadata", () => {
      const adapter = reset()
      adapter.saveProjects("user@test.com", [
        testProject({
          feedback: [
            {
              id: "feedback_1",
              scoreBand: "3-4",
              notes: "The game needed stronger farming and village loops.",
              submittedAt: "2026-03-29T12:00:00.000Z",
              runtimeArchetype: "homestead_life",
              runtimeLabel: "Homestead Life Runtime",
              promptSummary: "Prompt interpreted as a cozy farming sim.",
            },
          ],
        }),
      ])

      const loaded = adapter.getProjects("user@test.com")
      assert.equal(loaded.length, 1)
      assert.equal(loaded[0].feedback?.length, 1)
      assert.equal(loaded[0].feedback?.[0]?.scoreBand, "3-4")
      assert.match(loaded[0].feedback?.[0]?.notes ?? "", /farming/)
    })

    await suite.test("round-trips prompt suite metadata on projects", () => {
      const adapter = reset()
      adapter.saveProjects("user@test.com", [
        testProject({
          llmConfiguration: {
            provider: "gpt",
            source: "user-key",
            model: "gpt-5.2",
            suiteId: "generation_pipeline",
            suiteVersion: "phase1-2026-03-29",
            evolutionContext: {
              cacheLines: [
                {
                  id: "engine:bevy",
                  label: "Bevy",
                  category: "open_source_engine",
                  line: "Bevy: absorbed patterns include ECS Scheduler and Plugin Architecture.",
                  tags: ["bevy", "ecs"],
                },
                {
                  id: "library:enet",
                  label: "ENet",
                  category: "standalone_library",
                  line: "ENet: Networking library focused on reliable UDP networking.",
                  tags: ["enet", "networking"],
                },
              ],
              alphabeticalAdditions: [
                {
                  start: "Bevy",
                  end: "ENet",
                  additions: ["Fyrox"],
                  rationale: "Alphabetical bridge.",
                },
              ],
              insertionBlocks: [
                {
                  id: "evolution_block_1",
                  divider: "-----------------------------------",
                  startAnchor: "Bevy",
                  startLine: "Bevy: absorbed patterns include ECS Scheduler and Plugin Architecture.",
                  endAnchor: "ENet",
                  endLine: "ENet: Networking library focused on reliable UDP networking.",
                  promptInsertions: ["Add Fyrox deliberately between Bevy and ENet so the design grows with purpose instead of drifting."],
                  codeInsertions: ["// EVOLUTION_INSERT_START: Bevy -> ENet", "// EVOLUTION_INSERT: Fyrox", "// EVOLUTION_INSERT_END: Bevy -> ENet"],
                  rationale: "Alphabetical bridge.",
                },
              ],
              userLearnings: ["Recent successful projects lean on networking."],
              globalLearnings: ["Global fix pressure is highest around genre collapse."],
              qualitySignals: ["3/4 projects used API keys."],
              promptExpansionHints: ["Use Bevy-style ECS discipline."],
              usageSnapshot: {
                totalUsers: 2,
                totalProjects: 4,
                providerBackedProjects: 3,
                readyProjects: 3,
                blockedProjects: 1,
                positiveExamples: 1,
              },
            },
            operationalAnalytics: {
              totalPromptCalls: 6,
              totalProviderFallbacks: 1,
              totalRetries: 2,
              totalInputTokens: 4200,
              totalOutputTokens: 1600,
              totalTokens: 5800,
              totalCostUsd: 0.1142,
              slowStages: ["candidate_generation (9.4s)"],
              cacheableStages: ["brief_completion: High prefix reuse candidate for prompt caching because the stage repeats stable engine/runtime context."],
              routingStrategies: ["OpenAI-compatible direct provider execution."],
              failureHotspots: [],
              failureCategories: ["rate_limit"],
              retryStrategies: ["switch_model"],
              providerHealthSignals: ["Free-tier RPM limit: High demand for meta-llama/llama-3.3-70b-instruct:free is limited to 8 requests per minute."],
              optimizationNotes: ["Repeated prompt prefixes are strong candidates for provider-side prompt caching."],
            },
            providerFailures: [
              {
                stageId: "candidate_generation",
                stageLabel: "Candidate Generation",
                provider: "openrouter",
                model: "meta-llama/llama-3.3-70b-instruct:free",
                attempt: 1,
                reason: "Rate limit exceeded: High demand for meta-llama/llama-3.3-70b-instruct:free on OpenRouter.",
                code: "client_error",
                retryable: true,
                recovered: true,
                final: false,
                status: 429,
                providerErrorType: "rate_limit_exceeded",
                category: "rate_limit",
                severity: "warning",
                retryStrategy: "switch_model",
                statusFamily: "4xx",
                headline: "OpenRouter free-tier rate limit hit.",
                suggestedAction: "Wait briefly or switch to a non-free or alternate provider model.",
                affectedModel: "meta-llama/llama-3.3-70b-instruct:free",
                limitSummary: "8 requests per minute",
                signals: [
                  {
                    id: "free-tier-rpm",
                    label: "Free-tier RPM limit",
                    severity: "warning",
                    detail: "High demand for meta-llama/llama-3.3-70b-instruct:free is limited to 8 requests per minute.",
                    source: "provider_message",
                    action: "Switch to another model or retry after a short wait.",
                  },
                ],
                requestId: "req_provider_diag_1",
                retryAfterSeconds: 15,
              },
            ],
            providerDiagnostics: {
              summary: "1 provider failure was recorded. 0 remain unresolved, 1 recovered through retries or fallback routing, and the highest severity is warning. Main categories: rate limit.",
              highestSeverity: "warning",
              totalFailures: 1,
              unresolvedFailures: 0,
              recoveredFailures: 1,
              finalFailures: 0,
              categories: ["rate_limit"],
              retryStrategies: ["switch_model"],
              statusFamilies: ["4xx"],
              affectedModels: ["meta-llama/llama-3.3-70b-instruct:free"],
              healthSignals: ["Free-tier RPM limit: High demand for meta-llama/llama-3.3-70b-instruct:free is limited to 8 requests per minute."],
              actionItems: ["Wait briefly or switch to a non-free or alternate provider model.", "Switch to another model or retry after a short wait."],
              hotspots: ["Candidate Generation · openrouter · meta-llama/llama-3.3-70b-instruct:free: OpenRouter free-tier rate limit hit."],
            },
            knowledgeCoverage: {
              summary: "Knowledge coverage is aligned with the current prompt and can be passed into the loop as focused advisory context.",
              coverageScore: 88,
              relevantSignals: [
                {
                  id: "research:engine_architecture",
                  label: "Engine Architecture",
                  category: "research_domain",
                  relevance: "high",
                  reason: "The prompt leans on engine architecture.",
                  status: "complete",
                  quality: 0.92,
                },
              ],
              gapWarnings: [],
              promptGuidance: ["Bring forward Engine Architecture context because the prompt leans on engine architecture."],
              compileGuidance: ["Keep render-path, camera, and runtime-specific asset coverage visible in compile-readiness assets."],
              verificationFocus: ["Engine Architecture"],
              recommendedContext: ["Engine Architecture"],
            },
            knowledgeRisk: {
              level: "watch",
              summary: "Knowledge pressure is elevated enough to keep extra critique and repair guardrails active.",
              blockers: [],
              warnings: ["Engine Architecture: keep review pressure active."],
              critiquePressure: ["Challenge weak engine architecture assumptions before release."],
              repairPressure: ["Keep compile markers and runtime coverage explicit."],
              releasePressure: ["Release review should explicitly verify Engine Architecture."],
            },
            usageIntelligence: {
              summary: "AI-usage memory found 3 relevant provider-backed runs that can guide manifest lock, fallback ordering, and release pressure.",
              currentUserSummary: "2/3 runs reached ready and 0 were blocked. Recent runtime patterns include Action Operation.",
              globalSummary: "3/4 runs reached ready and 1 was blocked. Recent runtime patterns include Action Operation.",
              relevantRuns: 3,
              suggestedProviders: ["gpt", "claude"],
              suggestedModels: ["gpt-5.2"],
              providerSnapshots: [
                {
                  provider: "gpt",
                  totalRuns: 3,
                  readyRuns: 2,
                  reviewRuns: 1,
                  blockedRuns: 0,
                  readyRate: 0.67,
                  avgPromptCalls: 6,
                  avgCostUsd: 0.1142,
                  topModels: ["gpt-5.2"],
                  topFailureStages: ["Candidate Critic"],
                },
              ],
              manifestPressure: ["Keep runtime fidelity explicit through manifest lock."],
              routingPressure: ["Prefer fallback ordering that leans on the strongest recent ready-rate providers: gpt, claude."],
              compilePressure: ["Carry compile priorities through to manifest lock."],
              releasePressure: ["Do not treat provider-backed manifest completion as enough on its own."],
              failureWatchouts: ["gpt: Candidate Critic"],
            },
            stages: [
              {
                id: "brief_parser",
                label: "Brief Parser",
                version: "phase1-2026-03-29",
                mode: "heuristic",
                provider: "local",
              },
              {
                id: "provider_refinement",
                label: "Provider Refinement",
                version: "phase1-2026-03-29",
                mode: "provider",
                promptId: "generation_profile_advice",
                promptHash: "prompt_deadbeef",
                provider: "gpt",
                model: "gpt-5.2",
              },
            ],
          },
        }),
      ])

      const loaded = adapter.getProjects("user@test.com")
      assert.equal(loaded.length, 1)
      assert.equal(loaded[0].llmConfiguration.suiteId, "generation_pipeline")
      assert.equal(loaded[0].llmConfiguration.suiteVersion, "phase1-2026-03-29")
      assert.equal(loaded[0].llmConfiguration.stages?.length, 2)
      assert.equal(loaded[0].llmConfiguration.stages?.[1]?.promptId, "generation_profile_advice")
      assert.equal(loaded[0].llmConfiguration.evolutionContext?.cacheLines.length, 2)
      assert.equal(loaded[0].llmConfiguration.evolutionContext?.alphabeticalAdditions?.[0]?.additions?.[0], "Fyrox")
      assert.equal(loaded[0].llmConfiguration.operationalAnalytics?.totalPromptCalls, 6)
      assert.equal(loaded[0].llmConfiguration.operationalAnalytics?.cacheableStages?.length, 1)
      assert.equal(loaded[0].llmConfiguration.operationalAnalytics?.failureCategories?.[0], "rate_limit")
      assert.equal(loaded[0].llmConfiguration.operationalAnalytics?.retryStrategies?.[0], "switch_model")
      assert.match(loaded[0].llmConfiguration.operationalAnalytics?.providerHealthSignals?.[0] ?? "", /Free-tier RPM limit/)
      assert.equal(loaded[0].llmConfiguration.providerFailures?.[0]?.severity, "warning")
      assert.equal(loaded[0].llmConfiguration.providerFailures?.[0]?.retryStrategy, "switch_model")
      assert.equal(loaded[0].llmConfiguration.providerFailures?.[0]?.statusFamily, "4xx")
      assert.equal(loaded[0].llmConfiguration.providerFailures?.[0]?.signals?.[0]?.label, "Free-tier RPM limit")
      assert.equal(loaded[0].llmConfiguration.providerDiagnostics?.highestSeverity, "warning")
      assert.equal(loaded[0].llmConfiguration.providerDiagnostics?.retryStrategies?.[0], "switch_model")
      assert.equal(loaded[0].llmConfiguration.providerDiagnostics?.statusFamilies?.[0], "4xx")
      assert.equal(loaded[0].llmConfiguration.providerDiagnostics?.affectedModels?.[0], "meta-llama/llama-3.3-70b-instruct:free")
      assert.equal(loaded[0].llmConfiguration.knowledgeCoverage?.coverageScore, 88)
      assert.equal(loaded[0].llmConfiguration.knowledgeRisk?.level, "watch")
      assert.equal(loaded[0].llmConfiguration.usageIntelligence?.suggestedProviders?.[0], "gpt")
    })

    await suite.test("round-trips dashboard state", () => {
      const adapter = reset()
      const state: StoredDashboardState = {
        activeProjectId: "proj_abc123" as ProjectId,
        page: "projects",
      }
      adapter.saveDashboardState("user@test.com", state)
      assert.deepEqual(adapter.getDashboardState("user@test.com"), state)
    })

    await suite.test("returns null for unknown dashboard state", () => {
      const adapter = reset()
      assert.equal(adapter.getDashboardState("nobody@example.com"), null)
    })

    await suite.test("returns { deleted: false } when project does not exist", () => {
      const adapter = reset()
      adapter.saveProjects("user@test.com", [testProject()])
      const result = adapter.deleteProject("user@test.com", "proj_missing" as ProjectId)
      assert.equal(result.deleted, false)
      assert.equal(result.totalLinesRemoved, 0)
    })

    await suite.test("deletes the project and reports lines removed", () => {
      const adapter = reset()
      const projects = [
        testProject({
          id: "proj_keep" as ProjectId,
          systems: [{ name: "ui", displayName: "UI", status: "complete", linesGenerated: 100, engine: "unreal" }],
        }),
        testProject({
          id: "proj_del" as ProjectId,
          systems: [{ name: "combat", displayName: "Combat", status: "complete", linesGenerated: 750, engine: "unreal" }],
        }),
      ]

      adapter.saveProjects("user@test.com", projects)
      const result = adapter.deleteProject("user@test.com", "proj_del" as ProjectId)

      assert.equal(result.deleted, true)
      assert.equal(result.totalLinesRemoved, 750)
      assert.equal(adapter.getProjects("user@test.com").length, 1)
      assert.equal(adapter.getProjects("user@test.com")[0].id, "proj_keep")
    })
  })
}

const mockLocalStorage = createMockLocalStorage()
Object.defineProperty(globalThis, "window", { value: globalThis, writable: true, configurable: true })
Object.defineProperty(globalThis, "localStorage", { value: mockLocalStorage, writable: true, configurable: true })

runAdapterTests("LocalStorageAdapter", () => {
  mockLocalStorage.clear()
  return new LocalStorageAdapter()
})

runAdapterTests("MockAdapter", () => new MockAdapter())
