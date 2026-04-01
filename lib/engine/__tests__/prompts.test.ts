import assert from "node:assert/strict"
import test from "node:test"
import { z } from "zod"
import {
  PromptBatchManager,
  budgetPromptMessages,
  createConfiguredLlmClient,
  createZodJsonVerifier,
  renderPromptTemplate,
  runPrompt,
  type PromptClientRequest,
  type PromptClientResponse,
  type PromptPipelineClient,
} from "../prompts"
import {
  mergeProviderModelCatalogs,
  parseOpenRouterModelCatalog,
  resolveProviderModelForUsage,
} from "@/lib/provider-models"

test("renderPromptTemplate supports partials, nested values, and safe escaping", () => {
  const rendered = renderPromptTemplate({
    template: "Lead {{user.name}}\n{{data}}\n{{>summary}}\n{{missing}}",
    values: {
      user: { name: "Rhea" },
      data: { mode: "safe" },
    },
    partials: {
      summary: "Summary for {{user.name}}",
    },
  })

  assert.match(rendered, /Lead Rhea/)
  assert.match(rendered, /"mode": "safe"/)
  assert.match(rendered, /Summary for Rhea/)
  assert.ok(rendered.endsWith("\n"))
})

test("budgetPromptMessages trims optional sections when the token budget is exceeded", () => {
  const budgeted = budgetPromptMessages([
    {
      role: "user",
      sections: [
        { id: "required", content: "Keep this essential request intact." },
        {
          id: "optional-low",
          content: "This optional section is verbose and should be trimmed first when the budget is tight.",
          optional: true,
          trimPriority: 1,
        },
        {
          id: "optional-high",
          content: "Another optional section that should survive longer than the lower-priority one.",
          optional: true,
          trimPriority: 2,
        },
      ],
    },
  ], 18)

  assert.ok(budgeted.messages[0]?.content.includes("Keep this essential request intact."))
  assert.ok(budgeted.omittedSections.includes("user:optional-low"))
})

test("runPrompt retries when verification fails and succeeds on a later response", async () => {
  let calls = 0

  const client: PromptPipelineClient = {
    provider: "mock",
    defaultModel: "mock-model",
    complete: async (_request: PromptClientRequest): Promise<PromptClientResponse> => {
      calls += 1
      return calls === 1
        ? { text: "not-json" }
        : { text: JSON.stringify({ value: "verified" }) }
    },
  }

  const result = await runPrompt({
    name: "retry-success",
    client,
    retries: 2,
    verifier: createZodJsonVerifier(z.object({
      value: z.string(),
    })),
    messages: [
      {
        role: "user",
        content: "Return a JSON object with a value property.",
      },
    ],
  })

  assert.equal(calls, 2)
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.data.value, "verified")
    assert.equal(result.attempts, 2)
  }
})

test("runPrompt returns a structured verification error after retries are exhausted", async () => {
  let calls = 0

  const client: PromptPipelineClient = {
    provider: "mock",
    defaultModel: "mock-model",
    complete: async (): Promise<PromptClientResponse> => {
      calls += 1
      return { text: "still-not-json" }
    },
  }

  const result = await runPrompt({
    name: "retry-failure",
    client,
    retries: 1,
    verifier: createZodJsonVerifier(z.object({
      value: z.string(),
    })),
    messages: [
      {
        role: "user",
        content: "Return JSON.",
      },
    ],
  })

  assert.equal(calls, 2)
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.error.code, "verification_failed")
    assert.equal(result.error.attempts, 2)
    assert.ok(result.error.issues.length > 0)
  }
})

test("runPrompt preserves provider retry metadata on client errors", async () => {
  let calls = 0

  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => {
    calls += 1
    return new Response(JSON.stringify({
      error: {
        message: "Rate limit exceeded.",
        type: "rate_limit_error",
      },
    }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "retry-after": "12",
        "x-request-id": "req_123",
      },
    })
  }) as typeof fetch

  try {
    const client = createConfiguredLlmClient({
      provider: "gpt",
      apiKey: "sk-test",
      model: "gpt-5-mini",
      baseUrl: "https://api.openai.com/v1",
    })

    const result = await runPrompt({
      name: "client-error",
      client,
      retries: 0,
      messages: [
        {
          role: "user",
          content: "Return JSON.",
        },
      ],
    })

    assert.equal(calls, 1)
    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.equal(result.error.code, "client_error")
      assert.equal(result.error.status, 429)
      assert.equal(result.error.providerErrorType, "rate_limit_error")
      assert.equal(result.error.category, "rate_limit")
      assert.equal(result.error.severity, "warning")
      assert.equal(result.error.retryStrategy, "retry_after_wait")
      assert.equal(result.error.headline, "Provider rate limit reached")
      assert.equal(result.error.requestId, "req_123")
      assert.equal(result.error.retryAfterSeconds, 12)
      assert.equal(result.error.retryable, true)
      assert.ok((result.error.signals?.length ?? 0) >= 2)
      assert.match(result.error.suggestedAction ?? "", /retry/i)
    }
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("PromptBatchManager uses the client batch endpoint for small compatible prompts", async () => {
  let batchCalls = 0

  const client: PromptPipelineClient = {
    provider: "mock-batch",
    defaultModel: "mock-model",
    complete: async (): Promise<PromptClientResponse> => {
      throw new Error("single-call path should not be used for this test")
    },
    completeBatch: async (requests: PromptClientRequest[]) => {
      batchCalls += 1
      return requests.map((request, index) => ({
        text: `batched:${index}:${request.messages[0]?.content ?? ""}`,
      }))
    },
  }

  const manager = new PromptBatchManager({
    maxBatchSize: 4,
    smallPromptTokenThreshold: 200,
  })
  const results = await manager.run<string>([
    {
      name: "batch-a",
      client,
      messages: [{ role: "user" as const, content: "alpha" }],
    },
    {
      name: "batch-b",
      client,
      messages: [{ role: "user" as const, content: "beta" }],
    },
  ])

  assert.equal(batchCalls, 1)
  assert.equal(results.length, 2)
  assert.equal(results[0].ok, true)
  assert.equal(results[1].ok, true)
  if (results[0].ok && results[1].ok) {
    assert.match(results[0].text, /batched:0:alpha/)
    assert.match(results[1].text, /batched:1:beta/)
  }
})

test("resolveProviderModelForUsage honors usage-specific and policy-based routing", () => {
  const usageModels = {
    generationProfile: "openai/gpt-5.4",
    evaluation: "openai/gpt-5.4-mini",
    candidateRanking: "meta-llama/llama-4-maverick",
    assetPlanning: "anthropic/claude-sonnet-4",
  }

  assert.equal(resolveProviderModelForUsage({
    provider: "openrouter",
    defaultModel: "openai/gpt-5.4-mini",
    usageModels,
    routingPolicy: "single-model",
    usage: "evaluation",
  }), "openai/gpt-5.4-mini")

  assert.equal(resolveProviderModelForUsage({
    provider: "openrouter",
    defaultModel: "openai/gpt-5.4-mini",
    usageModels,
    routingPolicy: "usage-specific",
    usage: "candidateRanking",
  }), "meta-llama/llama-4-maverick")

  assert.equal(resolveProviderModelForUsage({
    provider: "gpt",
    defaultModel: "gpt-5-mini",
    usageModels: {
      generationProfile: "gpt-5.4",
      evaluation: "gpt-5-mini",
      candidateRanking: "gpt-5-mini",
      assetPlanning: "gpt-5-mini",
    },
    routingPolicy: "quality-first",
    usage: "generationProfile",
  }), "gpt-5.4")
})

test("parseOpenRouterModelCatalog normalizes live OpenRouter model metadata", () => {
  const parsed = parseOpenRouterModelCatalog({
    data: [
      {
        id: "google/gemini-2.5-pro",
        canonical_slug: "google/gemini-2.5-pro",
        name: "Gemini 2.5 Pro",
        description: "High-context reasoning model.",
        context_length: 1_048_576,
        architecture: {
          input_modalities: ["text", "image"],
          output_modalities: ["text"],
        },
        pricing: {
          prompt: "0.00000125",
          completion: "0.00001",
          input_cache_read: "0.000000125",
        },
        top_provider: {
          context_length: 1_048_576,
          max_completion_tokens: 65_536,
        },
        supported_parameters: ["structured_outputs", "reasoning", "tools"],
      },
    ],
  })

  assert.equal(parsed.length, 1)
  assert.equal(parsed[0]?.id, "google/gemini-2.5-pro")
  assert.equal(parsed[0]?.group, "Google")
  assert.equal(parsed[0]?.vendor, "Google via OpenRouter")
  assert.equal(parsed[0]?.inputCostPerMillion, 1.25)
  assert.equal(parsed[0]?.outputCostPerMillion, 10)
  assert.equal(parsed[0]?.cachedInputCostPerMillion, 0.125)
  assert.equal(parsed[0]?.maxCompletionTokens, 65_536)
  assert.equal(parsed[0]?.supportsStructuredOutputs, true)
  assert.equal(parsed[0]?.supportsReasoning, true)
  assert.equal(parsed[0]?.catalogSource, "live")
})

test("mergeProviderModelCatalogs prefers live OpenRouter entries while preserving fallback coverage", () => {
  const merged = mergeProviderModelCatalogs([
    {
      id: "openai/gpt-5.4-mini",
      provider: "openrouter",
      label: "OpenAI GPT-5.4 Mini Live",
      group: "OpenAI",
      vendor: "OpenAI via OpenRouter",
      description: "Live version",
      qualityTier: "balanced",
      speedTier: "fast",
      recommendedFor: ["generationProfile", "evaluation", "candidateRanking", "assetPlanning"],
      sourceLabel: "OpenRouter models API",
      sourceUrl: "https://openrouter.ai/api/v1/models",
      verifiedOn: "2026-03-29",
      catalogSource: "live",
    },
  ], [
    {
      id: "openai/gpt-5.4-mini",
      provider: "openrouter",
      label: "OpenAI GPT-5.4 Mini Static",
      group: "OpenAI",
      vendor: "OpenAI via OpenRouter",
      description: "Static version",
      qualityTier: "balanced",
      speedTier: "fast",
      recommendedFor: ["generationProfile", "evaluation", "candidateRanking", "assetPlanning"],
      sourceLabel: "OpenRouter models API",
      sourceUrl: "https://openrouter.ai/api/v1/models",
      verifiedOn: "2026-03-29",
      catalogSource: "static",
    },
    {
      id: "anthropic/claude-sonnet-4",
      provider: "openrouter",
      label: "Claude Sonnet 4",
      group: "Anthropic",
      vendor: "Anthropic via OpenRouter",
      description: "Fallback only",
      qualityTier: "balanced",
      speedTier: "medium",
      recommendedFor: ["generationProfile", "evaluation", "candidateRanking", "assetPlanning"],
      sourceLabel: "OpenRouter models API",
      sourceUrl: "https://openrouter.ai/api/v1/models",
      verifiedOn: "2026-03-29",
      catalogSource: "static",
    },
  ])

  assert.equal(merged.length, 2)
  assert.equal(merged.find((entry) => entry.id === "openai/gpt-5.4-mini")?.label, "OpenAI GPT-5.4 Mini Live")
  assert.ok(merged.some((entry) => entry.id === "anthropic/claude-sonnet-4"))
})

test("createConfiguredLlmClient sends the selected OpenRouter model and attribution headers", async () => {
  const originalFetch = globalThis.fetch
  let capturedUrl = ""
  let capturedHeaders: Record<string, string> = {}
  let capturedBody: Record<string, unknown> | undefined

  globalThis.fetch = (async (input, init) => {
    capturedUrl = String(input)
    capturedHeaders = (init?.headers ?? {}) as Record<string, string>
    capturedBody = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : undefined

    return new Response(JSON.stringify({
      choices: [
        {
          message: {
            content: "ok",
          },
        },
      ],
      usage: {
        prompt_tokens: 12,
        completion_tokens: 5,
        total_tokens: 17,
      },
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    })
  }) as typeof fetch

  try {
    const client = createConfiguredLlmClient({
      provider: "openrouter",
      apiKey: "or-key",
      model: "google/gemini-2.5-flash",
      baseUrl: "https://openrouter.ai/api/v1",
    })

    const result = await client.complete({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: "Return ok" }],
      temperature: 0.2,
      maxOutputTokens: 128,
    })

    assert.equal(capturedUrl, "https://openrouter.ai/api/v1/chat/completions")
    assert.equal(capturedHeaders.Authorization, "Bearer or-key")
    assert.equal(capturedHeaders["X-Title"], "Funaloo")
    assert.equal(capturedHeaders["X-OpenRouter-Title"], "Funaloo")
    assert.equal(capturedBody?.model, "google/gemini-2.5-flash")
    assert.equal(capturedBody?.max_tokens, 128)
    const providerPreferences = capturedBody?.provider as { allow_fallbacks?: boolean } | undefined
    assert.equal(providerPreferences?.allow_fallbacks, true)
    assert.equal(result.text, "ok")
    assert.equal(result.usage?.totalTokens, 17)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("openrouter requests bias routing based on provider loop role", async () => {
  const originalFetch = globalThis.fetch
  const capturedBodies: Array<Record<string, unknown>> = []

  globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    capturedBodies.push(JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>)
    return new Response(JSON.stringify({
      choices: [
        {
          message: {
            content: "ok",
          },
        },
      ],
      usage: {
        prompt_tokens: 20,
        completion_tokens: 8,
        total_tokens: 28,
      },
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    })
  }) as typeof fetch

  try {
    const client = createConfiguredLlmClient({
      provider: "openrouter",
      apiKey: "or-key",
      model: "google/gemini-2.5-flash",
      baseUrl: "https://openrouter.ai/api/v1",
    })

    await client.complete({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: "Draft a candidate" }],
      metadata: { providerRole: "author" },
    })

    await client.complete({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: "Critique the candidate" }],
      metadata: { providerRole: "critic" },
    })

    const authorProvider = capturedBodies[0]?.provider as { sort?: string; allow_fallbacks?: boolean } | undefined
    const criticProvider = capturedBodies[1]?.provider as { sort?: string; allow_fallbacks?: boolean } | undefined

    assert.equal(authorProvider?.sort, "throughput")
    assert.equal(authorProvider?.allow_fallbacks, true)
    assert.equal(criticProvider?.sort, "price")
    assert.equal(criticProvider?.allow_fallbacks, true)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("openrouter retries without provider preferences when the API rejects provider preference keys", async () => {
  const originalFetch = globalThis.fetch
  const capturedBodies: Array<Record<string, unknown>> = []
  let callCount = 0

  globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    callCount += 1
    capturedBodies.push(JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>)

    if (callCount === 1) {
      return new Response(JSON.stringify({
        error: {
          message: 'provider: Unrecognized key: "allow_fallbacks"',
          type: "invalid_request_error",
        },
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      })
    }

    return new Response(JSON.stringify({
      choices: [
        {
          message: {
            content: "ok",
          },
        },
      ],
      usage: {
        prompt_tokens: 20,
        completion_tokens: 8,
        total_tokens: 28,
      },
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    })
  }) as typeof fetch

  try {
    const client = createConfiguredLlmClient({
      provider: "openrouter",
      apiKey: "or-key",
      model: "google/gemini-2.5-flash",
      baseUrl: "https://openrouter.ai/api/v1",
    })

    const result = await client.complete({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: "Draft a candidate" }],
      metadata: { providerRole: "author" },
    })

    assert.equal(result.text, "ok")
    assert.equal(callCount, 2)
    assert.ok(capturedBodies[0]?.provider)
    assert.equal("provider" in capturedBodies[1]!, false)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("openrouter rate-limit failures preserve affected model guidance", async () => {
  const originalFetch = globalThis.fetch

  globalThis.fetch = (async () => (
    new Response(JSON.stringify({
      error: {
        message: "Rate limit exceeded: limit_rpm/meta-llama/llama-3.3-70b-instruct/839b2e30-a1b4-4974-b980-3e534b5873b1. High demand for meta-llama/llama-3.3-70b-instruct:free on OpenRouter - limited to 8 requests per minute. Please retry shortly.",
        type: "rate_limit_error",
      },
    }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
      },
    })
  )) as typeof fetch

  try {
    const client = createConfiguredLlmClient({
      provider: "openrouter",
      apiKey: "or-key",
      model: "meta-llama/llama-3.3-70b-instruct:free",
      baseUrl: "https://openrouter.ai/api/v1",
    })

    const result = await runPrompt({
      name: "openrouter-rate-limit",
      client,
      retries: 0,
      messages: [{ role: "user", content: "Return ok" }],
    })

    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.equal(result.error.status, 429)
      assert.equal(result.error.category, "rate_limit")
      assert.equal(result.error.headline, "Free-model rate limit reached")
      assert.equal(result.error.retryStrategy, "retry_with_backoff")
      assert.equal(result.error.affectedModel, "meta-llama/llama-3.3-70b-instruct")
      assert.equal(result.error.limitSummary, "8 requests per minute")
      assert.ok(result.error.signals?.some((signal) => signal.id === "free_model_variant"))
      assert.match(result.error.suggestedAction ?? "", /non-:free variant/i)
    }
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("network failures are surfaced as retryable provider connectivity issues", async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => {
    throw new TypeError("fetch failed")
  }) as typeof fetch

  try {
    const client = createConfiguredLlmClient({
      provider: "gpt",
      apiKey: "sk-test",
      model: "gpt-5-mini",
      baseUrl: "https://api.openai.com/v1",
    })

    const result = await runPrompt({
      name: "network-client-error",
      client,
      retries: 0,
      messages: [{ role: "user", content: "Return JSON." }],
    })

    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.equal(result.error.category, "network")
      assert.equal(result.error.retryable, true)
      assert.equal(result.error.headline, "Network or connectivity issue")
      assert.equal(result.error.retryStrategy, "switch_provider")
      assert.ok(result.error.signals?.some((signal) => signal.id === "network_connectivity_signal"))
      assert.match(result.error.suggestedAction ?? "", /retry/i)
    }
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("claude request_too_large failures map to context-limit diagnostics", async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => (
    new Response(JSON.stringify({
      error: {
        type: "request_too_large",
        message: "Request too large for this model.",
      },
    }), {
      status: 413,
      headers: {
        "Content-Type": "application/json",
      },
    })
  )) as typeof fetch

  try {
    const client = createConfiguredLlmClient({
      provider: "claude",
      apiKey: "anthropic-key",
      model: "claude-sonnet-4",
      baseUrl: "https://api.anthropic.com",
    })

    const result = await runPrompt({
      name: "claude-context-limit",
      client,
      retries: 0,
      messages: [{ role: "user", content: "Return JSON." }],
    })

    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.equal(result.error.category, "context_limit")
      assert.equal(result.error.severity, "error")
      assert.equal(result.error.retryStrategy, "trim_context")
      assert.ok(result.error.signals?.some((signal) => signal.id === "context_or_payload_limit"))
    }
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("unsupported capability errors map to capability diagnostics", async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => (
    new Response(JSON.stringify({
      error: {
        type: "invalid_request_error",
        message: "Prefilling assistant messages is not supported for this model.",
      },
    }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
    })
  )) as typeof fetch

  try {
    const client = createConfiguredLlmClient({
      provider: "claude",
      apiKey: "anthropic-key",
      model: "claude-opus-4-6",
      baseUrl: "https://api.anthropic.com",
    })

    const result = await runPrompt({
      name: "unsupported-capability",
      client,
      retries: 0,
      messages: [{ role: "user", content: "Return JSON." }],
    })

    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.equal(result.error.category, "unsupported_capability")
      assert.equal(result.error.retryStrategy, "simplify_request")
      assert.ok(result.error.signals?.some((signal) => signal.id === "unsupported_capability"))
    }
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("openrouter privacy-routing mismatches map to privacy policy diagnostics", async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => (
    new Response(JSON.stringify({
      error: {
        type: "invalid_request_error",
        message: "If you specify provider routing in your request, but none of the providers match the level of privacy specified in your account settings, you will get an error and your request will not complete.",
      },
    }), {
      status: 403,
      headers: {
        "Content-Type": "application/json",
      },
    })
  )) as typeof fetch

  try {
    const client = createConfiguredLlmClient({
      provider: "openrouter",
      apiKey: "or-key",
      model: "openai/gpt-5.4",
      baseUrl: "https://openrouter.ai/api/v1",
    })

    const result = await runPrompt({
      name: "openrouter-privacy-mismatch",
      client,
      retries: 0,
      messages: [{ role: "user", content: "Return JSON." }],
    })

    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.equal(result.error.category, "privacy_policy")
      assert.equal(result.error.retryStrategy, "adjust_privacy_or_routing")
      assert.ok(result.error.signals?.some((signal) => signal.id === "privacy_or_routing_policy_signal"))
    }
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("successful responses with no content are surfaced as empty-response diagnostics", async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => (
    new Response(JSON.stringify({
      choices: [
        {
          message: {
            content: "",
          },
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 0,
        total_tokens: 10,
      },
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    })
  )) as typeof fetch

  try {
    const client = createConfiguredLlmClient({
      provider: "openrouter",
      apiKey: "or-key",
      model: "openai/gpt-5.4-mini",
      baseUrl: "https://openrouter.ai/api/v1",
    })

    const result = await runPrompt({
      name: "empty-response",
      client,
      retries: 0,
      messages: [{ role: "user", content: "Return JSON." }],
    })

    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.equal(result.error.category, "empty_response")
      assert.equal(result.error.retryStrategy, "switch_provider")
      assert.ok(result.error.signals?.some((signal) => signal.id === "empty_response_signal"))
    }
  } finally {
    globalThis.fetch = originalFetch
  }
})
