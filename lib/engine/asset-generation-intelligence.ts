import type {
  AssetIntegrationContract,
  AssetGenerationPlan,
  AssetProductionPhase,
  AssetGenerationToolchain,
  AssetGeneratorSource,
  CharacterAssetBlueprint,
  EnvironmentAssetKit,
  GameDimension,
  Genre,
  PropAssetBlueprint,
} from "@/lib/engine/types"

interface AssetSourceDataset extends AssetGeneratorSource {
  dimensions: GameDimension[]
  genres: Genre[]
  signalHints: string[]
  keywords: string[]
}

function unique<T>(values: T[]) {
  return [...new Set(values)]
}

function takeTop(values: string[], count: number) {
  return unique(values.filter(Boolean)).slice(0, count)
}

function titleCase(value: string) {
  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function promptHas(prompt: string, pattern: RegExp) {
  return pattern.test(prompt)
}

function inferAssetSystemSummary(input: {
  promptSignals: string[]
  resolvedFeatures: string[]
  mapArchetype: string
  worldStructure: string
}) {
  const pillars = [
    `${input.mapArchetype} as the structural source of truth`,
    input.resolvedFeatures.includes("world_gen") ? "constraint-safe kit placement" : "authored kit assembly",
    input.resolvedFeatures.includes("inventory") ? "pickup and stock-state variants" : "ambient readability variants",
    input.promptSignals.includes("story-heavy") ? "character-driven state communication" : "environment-led state communication",
    input.promptSignals.includes("social-deduction") ? "shared-information readability" : "interaction readability",
  ]

  return `Treat assets as a gameplay system, not just decoration. Build around ${takeTop(pillars, 4).join(", ")}, and keep ${input.worldStructure.toLowerCase()} coherent across characters, props, and environments.`
}

function inferKitArchitecture(input: {
  dimension: GameDimension
  promptSignals: string[]
  mapArchetype: string
  resolvedFeatures: string[]
}) {
  const architecture = [
    input.dimension === "2d"
      ? "sprite family -> state variants -> landmark overlays"
      : input.dimension === "hybrid"
        ? "board kit -> depth accents -> hero landmarks"
        : "structural kit -> gameplay props -> hero set dressing",
    input.promptSignals.includes("travel-heavy")
      ? "route-stop kits with safe, risky, and destination variants"
      : "zone kits with clear ownership boundaries",
    input.resolvedFeatures.includes("world_gen")
      ? "constraint-owned slots for structural pieces and high-value props"
      : "authored anchor points for hero props and interaction clusters",
    `${input.mapArchetype.toLowerCase()} as the reusable assembly scaffold`,
  ]

  return `Kit architecture: ${takeTop(architecture, 4).join(" | ")}.`
}

function buildReuseDirectives(input: {
  dimension: GameDimension
  promptSignals: string[]
  resolvedFeatures: string[]
}) {
  const directives = [
    "Prefer attachment and overlay swaps before creating brand-new base assets.",
    "Every hero asset family should degrade into at least one mid-tier and one low-tier reusable variant.",
    input.dimension === "3d"
      ? "Reuse shared trim sheets, material instances, and collision hull conventions across kits."
      : "Reuse pivot conventions, palette groups, and bounding boxes across tiles and props.",
  ]

  if (input.promptSignals.includes("farming-heavy") || input.promptSignals.includes("simulation-heavy")) {
    directives.push("Use one workstation or crop base with multiple visible progress states instead of one-off props for each stage.")
  }

  if (input.resolvedFeatures.includes("inventory")) {
    directives.push("Interactive pickups should share footprint and highlight logic across rarity or category tiers.")
  }

  return takeTop(directives, 6)
}

function buildStateModelRules(input: {
  genre: Genre
  promptSignals: string[]
  resolvedFeatures: string[]
}) {
  const rules = [
    "Every gameplay-relevant asset family needs idle, active, depleted, and highlighted communication when applicable.",
    "Do not introduce a visual state the runtime cannot express through animation, tint, mesh swap, or UI callout.",
    "State changes should remain readable without forcing the user to open a menu.",
  ]

  if (input.promptSignals.includes("social-deduction")) {
    rules.push("Meeting, task, and suspicion spaces must communicate state without revealing hidden information incorrectly.")
  }

  if (input.promptSignals.includes("farming-heavy") || input.genre === "simulation") {
    rules.push("Growth, repair, and service states should be visible from the main play camera in one glance.")
  }

  if (input.resolvedFeatures.includes("combat")) {
    rules.push("Threat props and enemies need clean pre-attack, active, and broken states.")
  }

  return takeTop(rules, 6)
}

function buildSpawnRules(input: {
  promptSignals: string[]
  resolvedFeatures: string[]
  mapArchetype: string
}) {
  const rules = [
    `Spawn assets according to ${input.mapArchetype.toLowerCase()} ownership rather than filling all open space.`,
    "Separate traversal-critical, interaction-critical, and dressing-only spawn zones.",
    "Reserve landmark spawns before clutter or filler props.",
  ]

  if (input.promptSignals.includes("travel-heavy")) {
    rules.push("Checkpoint, camp, and route props should spawn in clusters that signal stop quality and supply value.")
  }

  if (input.promptSignals.includes("social-deduction")) {
    rules.push("Meeting rooms, task props, and transit spaces must spawn in distinct information zones.")
  }

  if (input.resolvedFeatures.includes("inventory")) {
    rules.push("Lootable props should spawn with category and stock-state separation, not random overlap.")
  }

  return takeTop(rules, 6)
}

function buildProductionPhases(input: {
  dimension: GameDimension
  genre: Genre
  promptSignals: string[]
  resolvedFeatures: string[]
}): AssetProductionPhase[] {
  const phases: AssetProductionPhase[] = [
    {
      name: "Kit Foundations",
      goal: "Lock module language, pivots, scale, and state conventions before asset volume expands.",
      deliverables: [
        input.dimension === "3d" ? "Structural mesh kit" : "Tile and silhouette kit",
        "Material and palette guide",
        "State-variant naming rules",
      ],
    },
    {
      name: "Gameplay Carriers",
      goal: "Build the assets that actually communicate verbs, systems, and progress.",
      deliverables: [
        "Primary character family",
        "Interactive prop families",
        input.resolvedFeatures.includes("inventory") ? "Pickup and stock-state variants" : "Ambient interaction variants",
      ],
    },
    {
      name: "World Cohesion",
      goal: "Integrate landmarks, background dressing, and transitions without harming readability.",
      deliverables: [
        "Environment kits",
        "Landmark set",
        input.promptSignals.includes("travel-heavy") ? "Route-stop variants" : "Zone transition variants",
      ],
    },
  ]

  if (input.promptSignals.includes("story-heavy") || input.resolvedFeatures.includes("ai_npc")) {
    phases.push({
      name: "Expression Pass",
      goal: "Add expression, social readability, and narrative state cues after the base kits are stable.",
      deliverables: ["Talk and gesture states", "Narrative prop set", "Character role overlays"],
    })
  }

  return phases.slice(0, 4)
}

function buildIntegrationContracts(input: {
  promptSignals: string[]
  resolvedFeatures: string[]
  multiplayer: boolean
}): AssetIntegrationContract[] {
  const contracts: AssetIntegrationContract[] = [
    {
      id: "runtime_state_visibility",
      focus: "Runtime state visibility",
      targetSystems: ["runtime", "ui"],
      rules: [
        "Character, prop, and environment states must map to runtime-readable states with no orphan variants.",
        "UI callouts should reinforce asset state, not compensate for missing visual readability.",
      ],
    },
    {
      id: "world_layout_ownership",
      focus: "World layout ownership",
      targetSystems: ["world_gen", "asset_pipeline"],
      rules: [
        "Structural kits own traversal footprints before props or dressing are placed.",
        "Landmarks, blockers, and interactables cannot compete for the same reserved slot.",
      ],
    },
  ]

  if (input.resolvedFeatures.includes("inventory")) {
    contracts.push({
      id: "inventory_affordances",
      focus: "Inventory and pickup affordances",
      targetSystems: ["inventory", "ui", "asset_pipeline"],
      rules: [
        "Loot props must expose category, stock, and depletion states visually.",
        "Pickup silhouettes should remain legible even in cluttered scenes.",
      ],
    })
  }

  if (input.resolvedFeatures.includes("combat")) {
    contracts.push({
      id: "combat_readability",
      focus: "Combat and threat readability",
      targetSystems: ["combat", "runtime", "asset_pipeline"],
      rules: [
        "Enemies, cover, and hazard props must communicate their gameplay role before cosmetic detail.",
        "Damage and broken states should preserve collision and line-of-sight clarity.",
      ],
    })
  }

  if (input.promptSignals.includes("social-deduction")) {
    contracts.push({
      id: "social_information_flow",
      focus: "Social information flow",
      targetSystems: ["runtime", "ui", "asset_pipeline"],
      rules: [
        "Meeting spaces, task props, and suspicion surfaces must remain visually distinct.",
        "Asset states cannot leak hidden-role information accidentally.",
      ],
    })
  }

  if (input.multiplayer) {
    contracts.push({
      id: "multiplayer_clarity",
      focus: "Multiplayer clarity",
      targetSystems: ["networking", "runtime", "asset_pipeline"],
      rules: [
        "Player-controlled characters need silhouette separation and team-safe readability.",
        "Shared props and landmarks should remain readable under concurrent use.",
      ],
    })
  }

  return contracts.slice(0, 6)
}

const ASSET_SOURCE_DATASETS: AssetSourceDataset[] = [
  {
    name: "Character Studio",
    repo: "M3-org/CharacterStudio",
    url: "https://github.com/M3-org/CharacterStudio",
    license: "MIT",
    reusePolicy: "direct",
    focus: "Modular 3D avatar assembly, optimization, and export.",
    fit: "Best for prompts that need swappable wearables, metadata-driven characters, and export-ready avatar pipelines.",
    integrationPatterns: [
      "Separate editor shell from asset packs",
      "Use a CharacterManager-style orchestration layer",
      "Support batch export and metadata schemas",
      "Merge skinned meshes and atlas textures during optimization",
    ],
    dimensions: ["3d", "hybrid"],
    genres: ["rpg", "adventure", "simulation", "sandbox", "mmo", "horror", "fps", "survival"],
    signalHints: ["story-heavy", "social-heavy", "travel-heavy"],
    keywords: ["avatar", "character", "party", "crew", "npc"],
  },
  {
    name: "Ready Player Me Avatar Creator",
    repo: "readyplayerme/rpm-unity-sdk-avatar-creator",
    url: "https://github.com/readyplayerme/rpm-unity-sdk-avatar-creator",
    license: "MIT",
    reusePolicy: "direct",
    focus: "Embed-first avatar creation flow for runtime projects.",
    fit: "Useful when a project needs account-linked player avatars, profile-driven character identity, or creator onboarding.",
    integrationPatterns: [
      "Launch avatar creation as a guided sub-flow",
      "Persist the returned avatar payload separately from gameplay state",
      "Keep runtime loading decoupled from the editor shell",
    ],
    dimensions: ["3d", "hybrid"],
    genres: ["mmo", "sandbox", "adventure", "simulation", "rpg"],
    signalHints: ["social-heavy", "story-heavy"],
    keywords: ["avatar", "social", "profile", "customize"],
  },
  {
    name: "Shot Generator Models",
    repo: "wonderunit/shot-generator-models",
    url: "https://github.com/wonderunit/shot-generator-models",
    license: "MIT",
    reusePolicy: "direct",
    focus: "Canonical character, object, and environment model conventions.",
    fit: "Strong reference for silhouette-first characters, consistent meter-scale assets, and lightweight GLTF-oriented content packs.",
    integrationPatterns: [
      "Keep asset kits in canonical folders for characters, objects, and environments",
      "Normalize scale around meter-based authoring",
      "Prefer simple silhouettes before high-frequency detail",
      "Use morph targets or blend-shape variants for body diversity",
    ],
    dimensions: ["3d", "hybrid"],
    genres: ["adventure", "simulation", "rpg", "horror", "sandbox", "fps"],
    signalHints: ["story-heavy", "mystery-heavy", "travel-heavy"],
    keywords: ["character", "model", "environment", "pose"],
  },
  {
    name: "AutoLevel",
    repo: "Al-Asl/AutoLevel",
    url: "https://github.com/Al-Asl/AutoLevel",
    license: "MIT",
    reusePolicy: "direct",
    focus: "Constraint-based block repos, layered kits, and exportable procedural layout assembly.",
    fit: "Excellent for environment kits and prop placement where blocks, boundaries, and layer-safe composition matter more than freeform noise.",
    integrationPatterns: [
      "Model kits as block repos with explicit adjacency",
      "Apply weight, volume, and boundary constraints",
      "Support big blocks for landmark rooms or hero props",
      "Keep layer-aware rebuilds available in the authoring flow",
    ],
    dimensions: ["2d", "3d", "hybrid"],
    genres: ["adventure", "simulation", "strategy", "survival", "sandbox", "rpg", "horror"],
    signalHints: ["map-heavy", "travel-heavy", "simulation-heavy", "colony-heavy"],
    keywords: ["layout", "level", "kit", "block", "module"],
  },
  {
    name: "DeBroglie",
    repo: "BorisTheBrave/DeBroglie",
    url: "https://github.com/BorisTheBrave/DeBroglie",
    license: "MIT",
    reusePolicy: "direct",
    focus: "Wave Function Collapse with non-local constraints and backtracking.",
    fit: "Great for non-overlapping tile, voxel, or prop placement systems where higher-order rules should survive contradiction-heavy layouts.",
    integrationPatterns: [
      "Use constraint solving instead of only random scatter",
      "Allow non-local rules for landmark spacing and route integrity",
      "Backtrack instead of accepting dead-end layouts",
      "Share the same solver across 2D tiles, hex grids, and 3D voxels",
    ],
    dimensions: ["2d", "3d", "hybrid"],
    genres: ["strategy", "simulation", "adventure", "sandbox", "survival", "horror"],
    signalHints: ["map-heavy", "automation-heavy", "colony-heavy"],
    keywords: ["wfc", "constraint", "tile", "voxel", "solver"],
  },
  {
    name: "ProceduralToolkit",
    repo: "Syomus/ProceduralToolkit",
    url: "https://github.com/Syomus/ProceduralToolkit",
    license: "MIT",
    reusePolicy: "direct",
    focus: "General procedural geometry, mesh drafting, and utility-first PCG.",
    fit: "Strong foundation for reusable prop geometry, path tools, and environment kit generators without tying the pipeline to a single genre.",
    integrationPatterns: [
      "Build small mesh and path utilities as composable primitives",
      "Keep generation programmable instead of editor-only",
      "Prefer reusable geometry helpers over per-asset one-offs",
    ],
    dimensions: ["2d", "3d", "hybrid"],
    genres: ["simulation", "strategy", "sandbox", "adventure", "racing"],
    signalHints: ["vehicle-heavy", "automation-heavy", "simulation-heavy"],
    keywords: ["mesh", "geometry", "terrain", "building", "path"],
  },
  {
    name: "Procedural Mesh Generator",
    repo: "sxm-sxpxxl/procedural-mesh-generator",
    url: "https://github.com/sxm-sxpxxl/procedural-mesh-generator",
    license: "MIT",
    reusePolicy: "direct",
    focus: "Primitive-based mesh generation, modifier stacks, and export.",
    fit: "Useful for hero props, simple vehicles, collision-safe primitives, and exportable prototype meshes.",
    integrationPatterns: [
      "Start from primitive families and apply modifier stacks",
      "Generate colliders alongside visible meshes",
      "Preserve export paths for edited procedural results",
    ],
    dimensions: ["3d", "hybrid"],
    genres: ["fps", "racing", "sandbox", "simulation", "adventure", "survival"],
    signalHints: ["vehicle-heavy", "velocity-heavy", "map-heavy"],
    keywords: ["mesh", "modifier", "export", "primitive", "prop"],
  },
  {
    name: "Poly Haven Asset Browser",
    repo: "Poly-Haven/polyhavenassets",
    url: "https://github.com/Poly-Haven/polyhavenassets",
    license: "GPL/AGPL family",
    reusePolicy: "reference-only",
    focus: "Asset browser, import workflow, LOD-aware content variants, and editable imports.",
    fit: "Best treated as workflow inspiration for browsing, swapping resolutions, and keeping imported assets editable rather than as direct code to absorb.",
    integrationPatterns: [
      "Keep downloaded or imported assets editable in the workspace",
      "Expose lightweight versus high-detail variants",
      "Treat asset browsing separately from generation logic",
    ],
    dimensions: ["3d", "hybrid"],
    genres: ["sandbox", "adventure", "simulation", "rpg", "horror"],
    signalHints: ["map-heavy", "story-heavy"],
    keywords: ["browse", "material", "asset", "lod", "import"],
  },
  {
    name: "ComfyUI",
    repo: "comfyanonymous/ComfyUI",
    url: "https://github.com/comfyanonymous/ComfyUI",
    license: "GPL-3.0",
    reusePolicy: "reference-only",
    focus: "Node-graph orchestration for multimodal generation workflows, conditioning, and reusable generation graphs.",
    fit: "Best for projects that need one orchestrator to chain prompt packs, control images, style references, upscaling, and downstream asset passes without collapsing everything into one raw model call.",
    integrationPatterns: [
      "Treat generation as a saved workflow graph instead of a single prompt box",
      "Lock prompt, negative prompt, and style-control nodes from the generation profile before asset passes begin",
      "Export intermediate concepts so later passes can be debugged instead of rerun blindly",
      "Keep graph presets per game type, not one universal graph for all prompts",
    ],
    dimensions: ["2d", "3d", "hybrid"],
    genres: ["fps", "rpg", "simulation", "strategy", "survival", "sandbox", "adventure", "horror"],
    signalHints: ["story-heavy", "map-heavy", "travel-heavy", "simulation-heavy"],
    keywords: ["workflow", "graph", "concept", "character", "prop", "environment", "texture", "material"],
  },
  {
    name: "InvokeAI",
    repo: "invoke-ai/InvokeAI",
    url: "https://github.com/invoke-ai/InvokeAI",
    license: "Apache-2.0",
    reusePolicy: "reference-only",
    focus: "Canvas-first creative engine for visual generation, inpainting, and iterative look development.",
    fit: "Strong when users need controlled art direction, paint-over correction, or a guided asset art workflow rather than one-shot generations.",
    integrationPatterns: [
      "Use canvas revisions for repairing generated concepts instead of discarding the whole asset batch",
      "Store per-project boards that map directly to character, prop, and environment blueprint families",
      "Treat inpaint and regional edits as repair stages after the first generation pass",
    ],
    dimensions: ["2d", "3d", "hybrid"],
    genres: ["adventure", "rpg", "simulation", "sandbox", "horror", "strategy"],
    signalHints: ["story-heavy", "mystery-heavy", "peaceful"],
    keywords: ["canvas", "paint", "concept", "portrait", "environment", "styleframe"],
  },
  {
    name: "Stable Diffusion WebUI",
    repo: "AUTOMATIC1111/stable-diffusion-webui",
    url: "https://github.com/AUTOMATIC1111/stable-diffusion-webui",
    license: "AGPL-3.0",
    reusePolicy: "reference-only",
    focus: "Extension-rich image generation workbench with mature txt2img, img2img, ControlNet-style workflows, and API usage patterns.",
    fit: "Useful as a broad compatibility reference when we need a large ecosystem of generation plugins, presets, and automation hooks for 2D asset workflows.",
    integrationPatterns: [
      "Separate style preset selection from per-asset prompt tokens",
      "Use image-to-image or control passes to keep related assets on-model",
      "Batch-generate variants for props and icons, then rank them against the asset blueprint rules",
    ],
    dimensions: ["2d", "hybrid"],
    genres: ["adventure", "simulation", "strategy", "sandbox", "horror", "rpg"],
    signalHints: ["story-heavy", "map-heavy", "peaceful"],
    keywords: ["sprite", "icon", "texture", "control", "variant", "concept"],
  },
  {
    name: "Stable Diffusion WebUI Forge",
    repo: "lllyasviel/stable-diffusion-webui-forge",
    url: "https://github.com/lllyasviel/stable-diffusion-webui-forge",
    license: "AGPL-3.0",
    reusePolicy: "reference-only",
    focus: "Resource-optimized Stable Diffusion WebUI variant with built-in extension support and improved inference management.",
    fit: "Strong fit when many users need lower-friction self-hosted 2D generation, ControlNet-heavy workflows, or faster iteration on consumer hardware.",
    integrationPatterns: [
      "Use Forge-style resource presets for cheaper draft passes before high-cost approval renders",
      "Keep API-driven batch generation behind blueprint-aware queues",
      "Use integrated control tools to keep icons, props, and callout art aligned with gameplay readability",
    ],
    dimensions: ["2d", "hybrid"],
    genres: ["fps", "rpg", "simulation", "strategy", "sandbox", "survival", "horror"],
    signalHints: ["story-heavy", "map-heavy", "simulation-heavy"],
    keywords: ["optimized", "controlnet", "texture", "concept", "batch", "ui"],
  },
  {
    name: "Hunyuan3D-2",
    repo: "Tencent/Hunyuan3D-2",
    url: "https://github.com/Tencent/Hunyuan3D-2",
    license: "Project-specific",
    reusePolicy: "reference-only",
    focus: "Text and image conditioned 3D generation for objects and assets that need to move from concept to mesh quickly.",
    fit: "Best for 3D prompts that need rapid object or prop mesh drafts without building every mesh family by hand first.",
    integrationPatterns: [
      "Feed approved concept frames into 3D generation rather than freehand prompts only",
      "Use generated meshes as draft geometry that still must pass runtime collision and silhouette checks",
      "Route hero props through repair and retopology stages before final acceptance",
    ],
    dimensions: ["3d", "hybrid"],
    genres: ["fps", "rpg", "simulation", "sandbox", "survival", "adventure", "horror"],
    signalHints: ["map-heavy", "vehicle-heavy", "travel-heavy"],
    keywords: ["3d", "mesh", "object", "prop", "model", "geometry"],
  },
  {
    name: "TRELLIS",
    repo: "microsoft/TRELLIS",
    url: "https://github.com/microsoft/TRELLIS",
    license: "MIT",
    reusePolicy: "reference-only",
    focus: "Structured 3D generation pipeline suited for scalable and versatile image-to-3D workflows.",
    fit: "Strong reference when we want generated 3D assets to stay structured enough for downstream layout, kit reuse, and repair instead of becoming opaque one-off meshes.",
    integrationPatterns: [
      "Prefer structured image-to-3D stages for reusable props and kit pieces",
      "Keep generation outputs grouped by asset family and gameplay role",
      "Run structure and scale checks before importing meshes into the playable slice",
    ],
    dimensions: ["3d", "hybrid"],
    genres: ["rpg", "simulation", "strategy", "sandbox", "adventure", "survival", "horror"],
    signalHints: ["map-heavy", "simulation-heavy", "story-heavy"],
    keywords: ["3d", "structured", "mesh", "image-to-3d", "kit", "family"],
  },
]

function getAssetSourceName(repo: string) {
  return ASSET_SOURCE_DATASETS.find((source) => source.repo === repo)?.name ?? repo
}

function inferProductionStyle(prompt: string, genre: Genre, dimension: GameDimension, promptSignals: string[]) {
  if (dimension === "2d") {
    if (promptHas(prompt, /pixel|sprite|retro|hand[- ]drawn/i)) {
      return "Sprite-atlas production with layered silhouettes, tile-safe pivots, and palette-driven variants."
    }

    return "2D kit production with reusable tiles, props, and character sheets authored for clean gameplay readability."
  }

  if (dimension === "hybrid") {
    return "Hybrid 2.5D production with board-aware landmarks, billboard-friendly characters, and reusable modular depth kits."
  }

  if (promptHas(prompt, /low poly|stylized|retro|ps1|psx/i)) {
    return "Stylized 3D kitbash production with modular meshes, trim-reuse, and fast-turnaround variant generation."
  }

  if (promptSignals.includes("story-heavy")) {
    return "Character-forward 3D production with silhouette-first actors, attachment variants, and location-specific hero props."
  }

  if (genre === "simulation" || genre === "strategy") {
    return "Systemic 3D production with modular environment kits, repeated prop families, and readable state variants."
  }

  return "3D modular asset production with reusable character rigs, prop families, and location kits tied to the prompt fantasy."
}

function inferAssetPipelineSummary(
  dimension: GameDimension,
  promptSignals: string[],
  mapArchetype: string,
  worldStructure: string,
) {
  const dimensionNote =
    dimension === "2d"
      ? "sprite sheets, layered tiles, and icon-safe props"
      : dimension === "hybrid"
        ? "mixed sprite and mesh kits with depth-aware pivots"
        : "modular meshes, trims, and attachment-driven actors"
  const routeNote = promptSignals.includes("travel-heavy")
    ? "Route landmarks, camps, and checkpoint props should be packaged as reusable kits."
    : promptSignals.includes("colony-heavy")
      ? "Service buildings, work props, and district markers should share a common module language."
      : "Hero spaces and filler spaces should draw from the same constrained kit families."

  return `Build around ${dimensionNote}. Use ${mapArchetype.toLowerCase()} as the main asset-assembly scaffold, preserve ${worldStructure.toLowerCase()}, and keep kit reuse high so authored content stays coherent. ${routeNote}`
}

function inferAssemblyStrategy(dimension: GameDimension, promptSignals: string[], resolvedFeatures: string[]) {
  const layers = [
    dimension === "2d"
      ? "foreground, gameplay, and backdrop layers"
      : dimension === "hybrid"
        ? "board, landmark, and depth accent layers"
        : "structural, dressing, and interaction layers",
  ]

  if (promptSignals.includes("travel-heavy")) {
    layers.push("route anchors, stop kits, and arrival-set variants")
  }

  if (resolvedFeatures.includes("world_gen")) {
    layers.push("constraint-owned placement slots instead of free scatter")
  }

  return `Assemble assets in distinct ${layers.join(", ")} so characters, props, and traversal blockers never compete for the same footprint.`
}

function inferCharacterStrategy(prompt: string, genre: Genre, promptSignals: string[]) {
  if (promptSignals.includes("travel-heavy")) {
    return "Characters should read as a moving party: one leader silhouette, one logistics role, one specialist, and one ambient civilian or wildlife layer."
  }

  if (promptSignals.includes("story-heavy")) {
    return "Prioritize readable silhouettes, attachment swaps, and expression-ready pose sets over raw costume count."
  }

  if (genre === "simulation" || genre === "strategy") {
    return "Treat characters as state carriers first, with role-specific overlays showing labor, morale, health, or faction alignment."
  }

  if (promptHas(prompt, /no combat|peaceful|cozy|nonviolent/i)) {
    return "Focus on companions, civilians, merchants, and wildlife rather than combatant archetypes."
  }

  return "Build character families around player, ally, neutral, and pressure roles with shared rigs and clear silhouette separation."
}

function inferPropStrategy(promptSignals: string[], resolvedFeatures: string[]) {
  const rules = [
    "Author props in families so state variants can reuse the same base mesh or sprite footprint.",
  ]

  if (promptSignals.includes("economy-heavy")) {
    rules.push("Make supply, trade, and storage props readable at a glance.")
  }

  if (promptSignals.includes("travel-heavy")) {
    rules.push("Route props should signal safety, risk, supply value, and travel progress without dialog.")
  }

  if (resolvedFeatures.includes("inventory")) {
    rules.push("Interactive props need clear pickup, inspect, or stock-state variants.")
  }

  return rules.join(" ")
}

function inferEnvironmentStrategy(dimension: GameDimension, environmentThemes: string[], mapArchetype: string) {
  const primaryThemes = environmentThemes.slice(0, 2).join(", ").toLowerCase()
  const dimensionRule =
    dimension === "2d"
      ? "Keep collision and visual silhouette aligned."
      : dimension === "hybrid"
        ? "Keep depth cheats consistent across the whole kit."
        : "Separate collision hulls from dressing pieces so hero props can scale without breaking traversal."

  return `${mapArchetype} should be expressed through kits that reinforce ${primaryThemes}. ${dimensionRule}`
}

function inferMaterialPalette(prompt: string, genre: Genre, promptSignals: string[]) {
  const palette: string[] = []

  if (promptHas(prompt, /western|frontier|oregon trail|wagon|trail|prairie|frontier/i) || promptSignals.includes("travel-heavy")) {
    palette.push("Weathered oak", "Canvas tan", "Dust beige", "Iron black", "Campfire amber")
  }

  if (promptHas(prompt, /horror|dark|haunted|mystery/i)) {
    palette.push("Cold slate", "Fog gray", "Oxide brown", "Sickly green")
  }

  if (promptHas(prompt, /scifi|sci-fi|space|cyber/i)) {
    palette.push("Gunmetal graphite", "Neon accent", "Composite white", "Cool blue emission")
  }

  if (promptHas(prompt, /fantasy|medieval|kingdom/i)) {
    palette.push("Aged bronze", "Stone gray", "Wool red", "Forest green")
  }

  if (genre === "simulation" || genre === "strategy") {
    palette.push("Operational brass", "Ledger parchment")
  }

  if (palette.length === 0) {
    palette.push(
      ...(genre === "fps" || genre === "survival"
        ? ["Steel gray", "Utility olive", "Signal orange"]
        : genre === "adventure" || genre === "rpg"
          ? ["Earth brown", "Accent teal", "Story gold"]
          : ["Neutral stone", "Readable accent", "Material contrast"]),
    )
  }

  return takeTop(palette, 6)
}

function inferAnimationNeeds(promptSignals: string[], resolvedFeatures: string[], multiplayer: boolean) {
  const animations = ["Idle", "Locomotion", "Interact"]

  if (resolvedFeatures.includes("combat")) animations.push("Attack", "Hit react")
  if (resolvedFeatures.includes("ai_npc") || promptSignals.includes("story-heavy")) animations.push("Talk", "Gesture")
  if (promptSignals.includes("travel-heavy")) animations.push("Camp", "Pack", "Drive or lead")
  if (promptSignals.includes("economy-heavy")) animations.push("Trade", "Inspect goods")
  if (promptSignals.includes("survival-heavy")) animations.push("Recover", "Carry burden")
  if (multiplayer) animations.push("Emote", "Regroup")

  return takeTop(animations, 8)
}

function buildCharacterBlueprints(input: {
  prompt: string
  genre: Genre
  promptSignals: string[]
  resolvedFeatures: string[]
}): CharacterAssetBlueprint[] {
  const blueprints: CharacterAssetBlueprint[] = []
  const peaceful = promptHas(input.prompt, /no combat|peaceful|cozy|nonviolent/i)

  if (input.promptSignals.includes("travel-heavy")) {
    blueprints.push(
      {
        name: "Trail Leader",
        role: "Primary player-facing party silhouette.",
        silhouette: "Long coat or duster, broad-brim hat, readable travel gear profile.",
        rigProfile: "Shared travel-party biped rig with attachment sockets for packs and tools.",
        modules: ["Body base", "Hat set", "Outerwear set", "Pack straps", "Tool holster"],
        animations: ["Idle", "Walk", "Point", "Inspect", "Camp"],
        stateVariants: ["Fresh travel state", "Burdened state", "Camp state", "Weather-stressed state"],
        interactionHooks: ["Lead convoy", "Inspect landmark", "Camp interact"],
        spawnContexts: ["Route start", "Checkpoint stop", "Arrival scene"],
        reuseStrategy: "Keep one base rig and rotate attachments, weathering, and cargo fullness.",
        presentationRules: ["Readable from route distance", "Keep hat and pack silhouette distinct from support roles"],
        notes: "Keep this archetype readable from far camera distances and world-map previews.",
      },
      {
        name: "Guide or Scout",
        role: "Route specialist and hazard reader.",
        silhouette: "Slim profile with spyglass, satchel, or map tube.",
        rigProfile: "Lean scout biped rig with quick-read upper-body attachments.",
        modules: ["Body base", "Light outerwear", "Navigation kit", "Shoulder bag"],
        animations: ["Walk", "Scan horizon", "Warn", "Kneel"],
        stateVariants: ["Scanning", "Alert", "At-rest", "Travel-worn"],
        interactionHooks: ["Warn party", "Read route", "Scout ahead"],
        spawnContexts: ["Hazard preview", "Trail checkpoint", "Lookout zone"],
        reuseStrategy: "Swap navigation gear and biome accents before adding new bodies.",
        presentationRules: ["Keep upper-body gestures readable", "Navigation tools must silhouette clearly"],
        notes: "Use attachments to communicate biome expertise and travel state.",
      },
      {
        name: "Merchant or Quartermaster",
        role: "Economy-facing NPC or party support role.",
        silhouette: "Stockier load-bearing silhouette with crates, ledger, or utility apron.",
        rigProfile: "Load-bearing biped rig with cargo, apron, and belt attachment points.",
        modules: ["Apron variant", "Pack frame", "Ledger prop", "Cargo straps"],
        animations: ["Inspect goods", "Trade", "Unload", "Gesture"],
        stateVariants: ["Stocked", "Sold-out", "Traveling", "Negotiating"],
        interactionHooks: ["Trade", "Unload supplies", "Restock convoy"],
        spawnContexts: ["Waystation", "Trade post", "Camp market"],
        reuseStrategy: "Use cargo, ledger, and apron swaps as the main variety driver.",
        presentationRules: ["Cargo fullness should read immediately", "Economy roles should contrast travel specialists"],
        notes: "Best used when the prompt includes trade, supply, or caravan systems.",
      },
    )
  }

  if (input.promptSignals.includes("colony-heavy") || input.genre === "simulation" || input.genre === "strategy") {
    blueprints.push({
      name: "Worker Specialist",
      role: "Simulation-state carrier for labor, health, and morale.",
      silhouette: "Task-specific gear overlay with readable role marker.",
      rigProfile: "Shared worker rig with role-overlay sockets and low-cost state swaps.",
      modules: ["Worker base", "Role badge", "Hand tool", "Utility belt"],
      animations: ["Work loop", "Carry", "Repair", "Rest"],
      stateVariants: ["On shift", "Resting", "Damaged or tired", "Promoted specialist"],
      interactionHooks: ["Workstation use", "Carry resources", "Repair station"],
      spawnContexts: ["Work district", "Service hub", "Routine loop"],
      reuseStrategy: "Change badges, tools, and grime states before introducing new worker bodies.",
      presentationRules: ["Role must read at a glance", "State overlays should not hide the base silhouette"],
      notes: "Swap overlays instead of replacing the whole rig when jobs change.",
    })
  }

  if (input.promptSignals.includes("social-deduction")) {
    blueprints.push({
      name: "Suspicion Carrier",
      role: "Player or NPC archetype used to communicate public trust, secrecy, and role ambiguity.",
      silhouette: "Readable civilian or crew silhouette with one memorable accessory slot.",
      rigProfile: "Shared social-cast rig with gesture and meeting-state variants.",
      modules: ["Base body", "Accessory slot", "Task tool", "Meeting badge"],
      animations: ["Idle", "Task loop", "Talk", "Accuse", "React"],
      stateVariants: ["Trusted", "Suspected", "Under watch", "Revealed"],
      interactionHooks: ["Task perform", "Meeting react", "Vote state", "Social emote"],
      spawnContexts: ["Task room", "Meeting hall", "Transit lane"],
      reuseStrategy: "Preserve one social-cast family and vary accessories, task tools, and public-state overlays.",
      presentationRules: ["Do not leak hidden information through exclusive silhouettes", "Meeting-state overlays must remain readable"],
      notes: "Keep the cast wide enough for suspicion play without making hidden roles obvious.",
    })
  }

  if (input.promptSignals.includes("farming-heavy")) {
    blueprints.push({
      name: "Homestead Resident",
      role: "Routine-carrying villager or helper that sells the life-sim fantasy.",
      silhouette: "Warm readable silhouette with apron, hat, basket, or field-tool variants.",
      rigProfile: "Shared homestead rig with low-intensity daily routine loops.",
      modules: ["Base body", "Seasonal outfit", "Apron or overalls", "Hand basket"],
      animations: ["Idle", "Water crops", "Carry", "Wave", "Harvest"],
      stateVariants: ["Morning routine", "Working", "Festival", "Rain gear"],
      interactionHooks: ["Talk", "Trade produce", "Routine loop", "Festival emote"],
      spawnContexts: ["Farm lane", "Town square", "Field edge"],
      reuseStrategy: "Swap seasonal clothing and hand-held props before creating new residents.",
      presentationRules: ["Daily roles should read softly and clearly", "Keep silhouettes friendly and distinct from threat roles"],
      notes: "This family keeps cozy and village prompts from drifting into generic NPCs.",
    })
  }

  if (!peaceful && input.resolvedFeatures.includes("combat")) {
    blueprints.push({
      name: "Pressure Enemy",
      role: "Reusable threat archetype for combat or chase spaces.",
      silhouette: "Exaggerated threat profile with one memorable silhouette cue.",
      rigProfile: "Threat rig with modular head, weapon, and locomotion overlays.",
      modules: ["Base rig", "Threat gear", "Variant head", "Weapon or claws"],
      animations: ["Patrol", "Attack", "Hit react", "Death"],
      stateVariants: ["Idle threat", "Alerted", "Attacking", "Broken or dead"],
      interactionHooks: ["Patrol route", "Engage player", "Break state"],
      spawnContexts: ["Encounter pocket", "Pressure lane", "Boss lead-in"],
      reuseStrategy: "Use one threat body with modular weapons, damage states, and head variants.",
      presentationRules: ["Keep the threat cue readable from first contact", "Damage state cannot hide attack intent"],
      notes: "Create 3-4 attachment sets before adding more base rigs.",
    })
  } else {
    blueprints.push({
      name: "Ambient Civilian or Wildlife",
      role: "Non-combat world population.",
      silhouette: "Simple relaxed profile that contrasts the player party.",
      rigProfile: "Ambient rig with lightweight idle, wander, and flee behaviors.",
      modules: ["Base body", "Accessory swap", "Idle pose variants"],
      animations: ["Idle", "Wander", "Inspect", "Flee"],
      stateVariants: ["Idle", "Alert", "Busy", "Leaving area"],
      interactionHooks: ["Ambient wander", "React to player", "Flee or disperse"],
      spawnContexts: ["Town path", "Field edge", "Ambient population pocket"],
      reuseStrategy: "Reuse the same animation set and silhouette family with accessory swaps.",
      presentationRules: ["Ambient roles should feel alive without reading as combatants", "Keep contrast with player-facing characters"],
      notes: "Use these to make generated spaces feel alive without forcing combat.",
    })
  }

  return blueprints.slice(0, 4)
}

function buildPropBlueprints(input: {
  prompt: string
  genre: Genre
  promptSignals: string[]
  resolvedFeatures: string[]
}): PropAssetBlueprint[] {
  const props: PropAssetBlueprint[] = []

  if (input.promptSignals.includes("travel-heavy")) {
    props.push(
      {
        name: "Wagon and Convoy Kit",
        category: "vehicle",
        gameplayRole: "Carries party state, cargo, and route identity.",
        silhouetteRole: "Hero travel landmark and moving inventory carrier.",
        modularity: "Base chassis with wheel, canopy, cargo, and damage variants.",
        variants: 4,
        materials: ["Weathered wood", "Canvas", "Iron fittings"],
        stateVariants: ["Packed", "Damaged", "Upgraded", "Empty"],
        interactionHooks: ["Inspect cargo", "Repair", "Upgrade", "Board"],
        spawnContexts: ["Route origin", "Camp stop", "Settlement arrival"],
        reuseStrategy: "Keep the wagon chassis stable and swap cargo, wear, and attachments.",
        placementRules: ["Keep convoy footprint readable from a distance", "Expose damage and cargo fullness as state variants"],
      },
      {
        name: "Camp and Waystation Props",
        category: "utility",
        gameplayRole: "Signals safe stops, recovery points, and narrative beats.",
        silhouetteRole: "Recovery cluster and stop-quality signal.",
        modularity: "Firepit, bedroll, cook set, crates, lanterns, signage.",
        variants: 6,
        materials: ["Canvas", "Ash wood", "Copper", "Rope"],
        stateVariants: ["Cold", "Active camp", "Abandoned", "Looted"],
        interactionHooks: ["Rest", "Cook", "Trade", "Story trigger"],
        spawnContexts: ["Checkpoint", "Camp pocket", "Waystation"],
        reuseStrategy: "Build from a small cluster of reusable camp modules with fire and stock overlays.",
        placementRules: ["Arrange around a clear interaction core", "Avoid blocking route exits with dressing"],
      },
    )
  }

  if (input.promptSignals.includes("economy-heavy") || input.genre === "simulation" || input.genre === "strategy") {
    props.push({
      name: "Trade and Supply Set",
      category: "economy",
      gameplayRole: "Communicates stock, value, and scarcity.",
      silhouetteRole: "Readable stockpile and service marker.",
      modularity: "Crates, sacks, barrels, shelves, scales, ledgers.",
      variants: 7,
      materials: ["Wood", "Canvas", "Paper", "Stamped metal"],
      stateVariants: ["Full", "Partial", "Empty", "High value"],
      interactionHooks: ["Inspect stock", "Buy", "Sell", "Restock"],
      spawnContexts: ["Market", "Depot", "Service building"],
      reuseStrategy: "Use fill states, labels, and overlays to scale goods without unique meshes.",
      placementRules: ["Use label variants instead of new meshes for many goods", "Cluster by value tier or scarcity"],
    })
  }

  if (input.promptSignals.includes("farming-heavy")) {
    props.push({
      name: "Crop and Farm Loop Set",
      category: "farming",
      gameplayRole: "Carries watering, growth, harvest, and storage state across the daily loop.",
      silhouetteRole: "Primary routine read for field progress and seasonal change.",
      modularity: "Crop tiles, trellis variants, irrigation props, baskets, scarecrows, and farm tools.",
      variants: 8,
      materials: ["Soil brown", "Leaf green", "Weathered wood", "Seasonal cloth"],
      stateVariants: ["Planted", "Growing", "Harvest-ready", "Withered"],
      interactionHooks: ["Plant", "Water", "Harvest", "Sell"],
      spawnContexts: ["Field plot", "Barn edge", "Market stall"],
      reuseStrategy: "Keep one crop family per footprint and communicate season or state through overlays and color change.",
      placementRules: ["Crop state must be readable from the main play camera", "Tool props should cluster near work loops, not in route lanes"],
    })
  }

  if (input.promptSignals.includes("social-deduction")) {
    props.push({
      name: "Task and Vote Surface Set",
      category: "social",
      gameplayRole: "Communicates public tasks, accusations, meetings, and reveal states.",
      silhouetteRole: "Shared-information anchor for social loops.",
      modularity: "Task consoles, paperwork, vote table props, suspicion markers, meeting bells.",
      variants: 6,
      materials: ["Painted metal", "Paper", "Signal cloth", "Crew plastics"],
      stateVariants: ["Neutral", "In progress", "Contested", "Meeting active"],
      interactionHooks: ["Use task", "Call meeting", "Inspect evidence", "Vote"],
      spawnContexts: ["Task room", "Meeting room", "Social hub"],
      reuseStrategy: "Build tasks from a common shell and vary top modules, status lights, and icon panels.",
      placementRules: ["Task props and meeting props must never blur into the same interaction cluster", "Keep transit lanes clear around vote surfaces"],
    })
  }

  if (input.promptSignals.includes("puzzle-heavy")) {
    props.push({
      name: "Puzzle Mechanism Set",
      category: "puzzle",
      gameplayRole: "Teaches chamber rules through switches, movers, sockets, and readable reset states.",
      silhouetteRole: "Mechanic teacher and state-feedback surface.",
      modularity: "Switch bases, sockets, pressure plates, door cores, moving blocks, reset beacons.",
      variants: 7,
      materials: ["Clean stone", "Logic metal", "Accent emissive", "Signal glass"],
      stateVariants: ["Idle", "Primed", "Solved", "Reset"],
      interactionHooks: ["Toggle", "Insert", "Push", "Reset"],
      spawnContexts: ["Puzzle chamber", "Observation ledge", "Mastery junction"],
      reuseStrategy: "Preserve one mechanism language across all chambers and vary only the combinatorics.",
      placementRules: ["Each mechanism family should advertise one clear verb", "Reset affordances must be visible from the chamber entry"],
    })
  }

  if (input.resolvedFeatures.includes("combat")) {
    props.push({
      name: "Cover and Threat Props",
      category: "combat",
      gameplayRole: "Shapes line of sight, pressure, and recovery windows.",
      silhouetteRole: "Instant read for safe cover, risky cover, and breakable pressure.",
      modularity: "Low cover, tall cover, destructible, explosive, and hero variants.",
      variants: 5,
      materials: ["Concrete", "Steel", "Wood splinters"],
      stateVariants: ["Intact", "Damaged", "Broken", "Explosive armed"],
      interactionHooks: ["Take cover", "Destroy", "Explode", "Vault"],
      spawnContexts: ["Encounter lane", "Flank route", "Boss room edge"],
      reuseStrategy: "Preserve common cover footprints and vary material, damage, and top profile.",
      placementRules: ["Keep combat props outside the main traversal spline", "Reserve one readable flank lane per encounter space"],
    })
  }

  props.push({
    name: "Landmark Readability Props",
    category: "navigation",
    gameplayRole: "Helps players parse routes, districts, and points of interest.",
    silhouetteRole: "Primary navigation cue and zone identity marker.",
    modularity: "Signs, poles, lights, banners, rock markers, or skyline props.",
    variants: 5,
    materials: ["Painted wood", "Stone", "Metal", "Cloth accents"],
    stateVariants: ["Neutral", "Objective highlighted", "Damaged", "Region-specific"],
    interactionHooks: ["Inspect", "Ping", "Objective focus"],
    spawnContexts: ["Entrance", "Decision point", "Destination horizon"],
    reuseStrategy: "Reuse one landmark family per zone and vary color, height, or banner state.",
    placementRules: ["One dominant landmark family per zone", "Keep landmark silhouettes unique across adjacent areas"],
  })

  return props.slice(0, 5)
}

function buildEnvironmentKits(input: {
  prompt: string
  genre: Genre
  dimension: GameDimension
  mapArchetype: string
  promptSignals: string[]
  environmentThemes: string[]
}): EnvironmentAssetKit[] {
  const kits: EnvironmentAssetKit[] = [
    {
      name: `${titleCase(input.mapArchetype)} Core Kit`,
      purpose: "Owns the main structural kit for traversal-critical spaces.",
      modules: input.dimension === "2d"
        ? ["Ground tiles", "Edge trims", "Blocking tiles", "Door frames", "Landmark backdrops"]
        : ["Floor pieces", "Wall modules", "Connector segments", "Door frames", "Hero landmarks"],
      biomeTags: takeTop(input.environmentThemes, 3),
      propFamilies: ["Navigation props", "Structural accents", "Interaction markers"],
      characterAnchors: ["Entry point", "Objective lane", "Recovery pocket"],
      traversalAffordances: ["Primary route", "Safe pocket", "Transition node"],
      stateVariants: ["Base", "Objective-active", "Damaged or worn"],
      assemblyRules: [
        "Place structure before dressing props",
        "Keep gameplay lanes readable after decoration",
      ],
    },
  ]

  if (input.promptSignals.includes("travel-heavy")) {
    kits.push({
      name: "Route Stop Kit",
      purpose: "Packages checkpoints, camps, and arrival spaces.",
      modules: ["Stop marker", "Recovery props", "Supply props", "Story scene dressing"],
      biomeTags: ["Travel", "Recovery", "Risk"],
      propFamilies: ["Camp props", "Supply props", "Arrival markers"],
      characterAnchors: ["Party rest point", "Trader point", "Scout lookout"],
      traversalAffordances: ["Stop center", "Exit vector", "Hazard warning lane"],
      stateVariants: ["Safe stop", "Risky stop", "Abandoned stop", "Destination stop"],
      assemblyRules: [
        "Every stop should have one clear center of interaction",
        "Reserve one exit direction before dressing the stop",
      ],
    })
  }

  if (input.promptSignals.includes("colony-heavy") || input.genre === "simulation" || input.genre === "strategy") {
    kits.push({
      name: "Service Hub Kit",
      purpose: "Builds settlements, depots, or district clusters.",
      modules: ["Facade set", "Interior markers", "Work props", "Storage props", "District signage"],
      biomeTags: ["Service", "Logistics", "Population"],
      propFamilies: ["Workstation props", "Storage props", "District markers"],
      characterAnchors: ["Worker loop", "Service counter", "District crossing"],
      traversalAffordances: ["Main street", "Work bay", "Storage lane"],
      stateVariants: ["Working", "Idle", "Upgraded", "Strained"],
      assemblyRules: [
        "Group service buildings by role rather than random variety",
        "Keep upgrade states compatible with the same footprint",
      ],
    })
  }

  if (input.promptSignals.includes("social-deduction")) {
    kits.push({
      name: "Meeting and Task Kit",
      purpose: "Separates public discussion spaces from private or semi-private task execution rooms.",
      modules: ["Meeting circle", "Vote table", "Task console set", "Transit connectors", "Observation props"],
      biomeTags: ["Social", "Suspicion", "Information"],
      propFamilies: ["Task props", "Meeting props", "Transit markers"],
      characterAnchors: ["Meeting center", "Task station", "Observation edge"],
      traversalAffordances: ["Public hub", "Private detour", "Reveal lane"],
      stateVariants: ["Normal shift", "Meeting active", "Contested", "Reveal"],
      assemblyRules: [
        "Keep meeting rooms visually distinct from work rooms.",
        "Task props should communicate public progress without leaking hidden state.",
      ],
    })
  }

  if (input.promptSignals.includes("farming-heavy")) {
    kits.push({
      name: "Seasonal Farm Kit",
      purpose: "Builds fields, barns, service sheds, and village edges around one coherent daily loop.",
      modules: ["Field plots", "Barn walls", "Fences", "Service sheds", "Seasonal dressing"],
      biomeTags: ["Farm", "Village", "Seasonal"],
      propFamilies: ["Crop props", "Tool props", "Market props"],
      characterAnchors: ["Field entry", "Barn door", "Village crossing"],
      traversalAffordances: ["Work lane", "Home lane", "Town lane"],
      stateVariants: ["Spring", "Summer", "Autumn", "Rain state"],
      assemblyRules: [
        "Season and crop progress should be visible before close inspection.",
        "Keep work, home, and social lanes visually distinct.",
      ],
    })
  }

  return kits.slice(0, 3)
}

function buildGenerationRules(input: {
  dimension: GameDimension
  promptSignals: string[]
  resolvedFeatures: string[]
  mapArchetype: string
}) {
  const rules = [
    "Do not place props on top of traversal-critical footprints.",
    "Keep each asset family on a reusable module grid or pivot convention.",
    `Match prop density to ${input.mapArchetype.toLowerCase()} rather than decorating every open space.`,
  ]

  if (input.dimension === "3d") {
    rules.push("Separate collision hulls from decorative meshes for large hero props.")
  } else {
    rules.push("Keep sprite silhouettes readable against the background layer.")
  }

  if (input.promptSignals.includes("travel-heavy")) {
    rules.push("Use landmark props to signal route safety, supply value, and destination identity.")
  }

  if (input.resolvedFeatures.includes("inventory")) {
    rules.push("Interactive loot props need at least empty, stocked, and highlighted states.")
  }

  if (input.promptSignals.includes("economy-heavy")) {
    rules.push("Reuse base storage meshes and communicate trade value through labels, fills, or overlays.")
  }

  return takeTop(rules, 6)
}

function buildAssetSpecialistTracks(input: {
  genre: Genre
  dimension: GameDimension
  promptSignals: string[]
  resolvedFeatures: string[]
}) {
  const tracks = [
    input.dimension === "3d"
      ? "Rendering and readability review for 3D spaces"
      : input.dimension === "hybrid"
        ? "Depth-cheat and board readability review"
        : "Silhouette and layer readability review",
    "Character identity and state-variant review",
    "Prop interaction clarity review",
    "Environment-kit coherence review",
  ]

  if (input.promptSignals.includes("story-heavy") || input.resolvedFeatures.includes("ai_npc")) {
    tracks.push("Narrative character expression review")
  }

  if (input.promptSignals.includes("farming-heavy") || input.genre === "simulation") {
    tracks.push("Routine, crop, and workstation state review")
  }

  if (input.promptSignals.includes("survival-heavy") || input.genre === "survival") {
    tracks.push("Shelter damage, scavenging node, and hazard-state review")
  }

  if (input.promptSignals.includes("strategy-heavy") || input.genre === "strategy") {
    tracks.push("Sector-state and board-readability review")
  }

  return takeTop(tracks, 6)
}

function buildAssetReviewPasses(input: {
  genre: Genre
  dimension: GameDimension
  promptSignals: string[]
}) {
  const passes = [
    "Pass 1: Asset Director checks that character, prop, and environment kits all describe the same fantasy.",
    "Pass 2: Runtime Guard checks that the assets reinforce the chosen camera model and runtime archetype.",
    "Pass 3: Player Advocate checks first-glance readability, affordance clarity, and state communication.",
  ]

  if (input.dimension === "3d") {
    passes.push("Pass 4: Sightline and scale review ensures hero props, cover, and landmarks support navigation.")
  }

  if (input.promptSignals.includes("peaceful")) {
    passes.push("Pass 4: Non-combat review removes hostile visual assumptions that were not asked for.")
  }

  if (input.genre === "simulation" || input.genre === "strategy") {
    passes.push("Pass 4: Operational-state review ensures state changes are visible without opening a menu.")
  }

  return takeTop(passes, 5)
}

function buildAssetQualityGates(input: {
  genre: Genre
  promptSignals: string[]
  resolvedFeatures: string[]
}) {
  const gates = [
    "Every interactive asset family needs a readable idle, active, and highlighted state.",
    "Environment kits must reuse a constrained module language instead of drifting into unrelated one-off props.",
    "Character silhouettes must remain distinct at gameplay distance before cosmetic detail is added.",
  ]

  if (input.promptSignals.includes("travel-heavy")) {
    gates.push("Landmarks, checkpoints, and route props must communicate safety, danger, or destination value immediately.")
  }

  if (input.promptSignals.includes("farming-heavy") || input.genre === "simulation") {
    gates.push("Crops, workstations, and seasonal props must clearly show progress state without relying on tooltip text.")
  }

  if (input.promptSignals.includes("survival-heavy") || input.genre === "survival") {
    gates.push("Shelter, hazard, and scavenging assets must expose damage and depletion states visibly.")
  }

  if (input.resolvedFeatures.includes("inventory")) {
    gates.push("Loot props must advertise pickup state and category without opening inventory.")
  }

  return takeTop(gates, 6)
}

function selectSourceInspirations(input: {
  prompt: string
  genre: Genre
  dimension: GameDimension
  promptSignals: string[]
  resolvedFeatures: string[]
}) {
  const scored = ASSET_SOURCE_DATASETS.map((source) => {
    let score = 0

    if (source.dimensions.includes(input.dimension)) score += 2
    if (source.genres.includes(input.genre)) score += 1.5
    if (source.signalHints.some((signal) => input.promptSignals.includes(signal))) score += 2
    if (source.keywords.some((keyword) => input.prompt.toLowerCase().includes(keyword))) score += 1
    if (
      source.focus.toLowerCase().includes("avatar") &&
      (input.resolvedFeatures.includes("ai_npc") || input.promptSignals.includes("story-heavy"))
    ) {
      score += 1
    }
    if (
      source.focus.toLowerCase().includes("constraint") &&
      (input.promptSignals.includes("map-heavy") || input.resolvedFeatures.includes("world_gen"))
    ) {
      score += 1
    }

    return { source, score }
  })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)

  const selected = scored.slice(0, 5).map((entry) => entry.source)

  return selected.length > 0
    ? selected
    : ASSET_SOURCE_DATASETS.filter((source) => source.dimensions.includes(input.dimension)).slice(0, 4)
}

function buildGenerationToolchains(input: {
  prompt: string
  genre: Genre
  dimension: GameDimension
  promptSignals: string[]
  resolvedFeatures: string[]
}): AssetGenerationToolchain[] {
  const wantsThreeDimensionalMeshes = input.dimension !== "2d"
  const needsCharacterGeneration = input.resolvedFeatures.includes("ai_npc")
    || promptHas(input.prompt, /\bcharacter|npc|villager|crew|survivor|avatar|party|companion|zombie/i)
    || input.promptSignals.some((signal) => ["story-heavy", "social-heavy", "travel-heavy"].includes(signal))
    || ["rpg", "simulation", "mmo", "adventure", "survival"].includes(input.genre)
  const needsConceptLookdev = input.dimension === "2d"
    || promptHas(input.prompt, /\bsprite|icon|card|portrait|ui|concept|painting|illustration|stylized/i)
    || input.promptSignals.includes("peaceful")
    || input.promptSignals.includes("story-heavy")
  const needsProceduralLayout = input.resolvedFeatures.includes("world_gen")
    || input.promptSignals.some((signal) => [
      "map-heavy",
      "travel-heavy",
      "simulation-heavy",
      "colony-heavy",
      "strategy-heavy",
    ].includes(signal))
    || input.genre === "simulation"
    || input.genre === "strategy"
  const needsVariantFactory = input.resolvedFeatures.includes("inventory")
    || input.promptSignals.includes("economy-heavy")
    || input.promptSignals.includes("simulation-heavy")
    || promptHas(input.prompt, /\bvariants?|skins?|loot|items?|cards?|icons?\b/i)

  const toolchains: AssetGenerationToolchain[] = [
    {
      id: "prompt_locked_orchestration",
      stage: "Orchestration",
      label: "Prompt-Locked Graph Orchestration",
      objective: "Turn the original prompt, saved design profile, runtime contract, and asset blueprints into a reusable generation workflow instead of one-off prompt calls.",
      primarySource: "comfyanonymous/ComfyUI",
      supportingSources: ["invoke-ai/InvokeAI"],
      inputs: ["Original prompt", "Saved generation profile", "Runtime contract", "Character/prop/environment blueprints"],
      outputs: ["Reusable workflow graph", "Prompt pack", "Negative prompt rules", "Stage-specific presets"],
      orchestrationNotes: [
        "Lock prompt, style, and constraint nodes from the generation profile before any asset generation begins.",
        "Persist intermediate outputs so failures can be repaired per stage instead of regenerating the whole asset stack.",
        "Route lookdev, 3D drafting, and repair passes through explicit stage handoffs.",
      ],
      verificationChecks: [
        "Workflow graph must preserve negative constraints from the prompt and runtime contract.",
        "Every downstream generation stage must point back to a known asset blueprint family.",
      ],
    },
  ]

  if (needsConceptLookdev) {
    toolchains.push({
      id: "concept_and_style_pack",
      stage: "Concept and Lookdev",
      label: "Concept Art and Style Pack Generation",
      objective: "Create style-consistent concept sheets for characters, props, UI, and environment landmarks before production assets are drafted.",
      primarySource: input.dimension === "2d"
        ? "lllyasviel/stable-diffusion-webui-forge"
        : "invoke-ai/InvokeAI",
      supportingSources: input.dimension === "2d"
        ? ["AUTOMATIC1111/stable-diffusion-webui", "comfyanonymous/ComfyUI"]
        : ["AUTOMATIC1111/stable-diffusion-webui"],
      inputs: ["Prompt pack", "Style references", "Asset family goals", "Gameplay readability rules"],
      outputs: ["Character sheets", "Prop mood boards", "Environment keyframes", "UI or icon exploration"],
      orchestrationNotes: [
        "Batch-generate variants for each asset family and score them against the blueprint role before approval.",
        "Keep the style pack tied to one game identity so late assets do not drift visually.",
        "Use regional edits or control passes for fixes instead of rewriting the whole prompt.",
      ],
      verificationChecks: [
        "Generated concepts must preserve silhouette clarity at gameplay distance.",
        "Concept outputs cannot introduce weapons, enemies, or fantasy elements that the prompt did not ask for.",
      ],
    })
  }

  if (needsCharacterGeneration) {
    toolchains.push({
      id: "character_identity_pipeline",
      stage: "Character Generation",
      label: "Character Identity and Rig Pipeline",
      objective: "Translate prompt intent into reusable characters with role clarity, variant-ready attachments, and export-safe identity data.",
      primarySource: wantsThreeDimensionalMeshes
        ? "M3-org/CharacterStudio"
        : "wonderunit/shot-generator-models",
      supportingSources: wantsThreeDimensionalMeshes
        ? ["readyplayerme/rpm-unity-sdk-avatar-creator", "wonderunit/shot-generator-models"]
        : ["invoke-ai/InvokeAI"],
      inputs: ["Character blueprints", "Approved concept sheets", "Animation needs", "Role and state requirements"],
      outputs: ["Roster variants", "Attachment sets", "Pose or rig plans", "Identity-safe export metadata"],
      orchestrationNotes: [
        "Separate identity metadata, cosmetic variants, and gameplay states so the runtime can swap them independently.",
        "Keep one canonical roster per project, then derive lower-cost or lower-detail variants from it.",
      ],
      verificationChecks: [
        "Each generated character family must support the state variants and hooks described in the blueprint.",
        "Character outputs must remain distinct from NPC, enemy, and player-controlled silhouette roles.",
      ],
    })
  }

  if (wantsThreeDimensionalMeshes) {
    toolchains.push({
      id: "three_d_mesh_drafting",
      stage: "3D Drafting",
      label: "Image-to-3D and Mesh Drafting",
      objective: "Convert approved 2D lookdev into fast draft meshes for props, hero objects, and reusable environment pieces.",
      primarySource: promptHas(input.prompt, /\bhero|landmark|kit|structure|building|environment\b/i)
        ? "microsoft/TRELLIS"
        : "Tencent/Hunyuan3D-2",
      supportingSources: ["Tencent/Hunyuan3D-2", "microsoft/TRELLIS"],
      inputs: ["Approved concept frames", "Prop and environment blueprints", "Scale rules", "Material palette"],
      outputs: ["Draft meshes", "Reusable kit parts", "Prop variants", "Mesh family candidates"],
      orchestrationNotes: [
        "Use approved concept frames as conditioning input so the 3D pass inherits the right fantasy instead of improvising a new one.",
        "Treat outputs as draft geometry that still flows through collision, scale, and gameplay-role validation.",
        "Prefer family generation for kit pieces over disconnected hero meshes.",
      ],
      verificationChecks: [
        "Generated meshes must align with the target footprint and gameplay role before import.",
        "3D drafts must pass silhouette, scale, and collision reviews before entering the playable runtime.",
      ],
    })
  }

  if (needsProceduralLayout) {
    toolchains.push({
      id: "layout_and_kit_assembly",
      stage: "Layout and Assembly",
      label: "Procedural Layout and Kit Assembly",
      objective: "Assemble rooms, routes, districts, or puzzle spaces from reusable kits instead of relying on one-off level authoring.",
      primarySource: "Al-Asl/AutoLevel",
      supportingSources: ["BorisTheBrave/DeBroglie", "Syomus/ProceduralToolkit"],
      inputs: ["World structure", "Map archetype", "Environment kits", "Spawn rules"],
      outputs: ["Block layouts", "Constraint-safe room graphs", "Landmark slots", "Reusable structural kits"],
      orchestrationNotes: [
        "Keep layout generation constraint-driven so asset density and traversal rules survive regeneration.",
        "Reserve hero landmarks and interactable slots before clutter props are added.",
        "Use the same structural constraints across draft and repair passes so fixes remain stable.",
      ],
      verificationChecks: [
        "Generated layouts must keep traversal-critical footprints free of decorative clutter.",
        "Every layout pass must preserve the runtime archetype's first-session verbs and information flow.",
      ],
    })
  }

  if (needsVariantFactory) {
    toolchains.push({
      id: "variant_factory_and_repair",
      stage: "Variants and Repair",
      label: "Variant Factory and Repair Loop",
      objective: "Generate large families of icons, loot props, tiles, and secondary variants without letting high-volume output drift from the prompt.",
      primarySource: "lllyasviel/stable-diffusion-webui-forge",
      supportingSources: ["AUTOMATIC1111/stable-diffusion-webui", "comfyanonymous/ComfyUI"],
      inputs: ["Asset family presets", "Approved style pack", "Variant targets", "Negative constraints"],
      outputs: ["Secondary variants", "Item or icon families", "Repair candidates", "Low-cost fallback assets"],
      orchestrationNotes: [
        "Generate in bounded batches and rank candidates against blueprint, readability, and genre-fit checks.",
        "Use the repair loop for near-miss outputs instead of discarding the whole family.",
        "Keep lower-cost fallback variants ready for the first playable slice and low-spec modes.",
      ],
      verificationChecks: [
        "Variant batches must remain visually related to the approved family anchor.",
        "No batch should be accepted without a blueprint-aware ranking pass and a readability check.",
      ],
    })
  }

  return toolchains.slice(0, 5)
}

function buildModelGenerationSummary(input: {
  dimension: GameDimension
  genre: Genre
  generationToolchains: AssetGenerationToolchain[]
}) {
  const stack = input.generationToolchains
    .map((toolchain) => `${toolchain.label} via ${getAssetSourceName(toolchain.primarySource)}`)
    .join("; ")

  return `Model-generation stack for this ${input.dimension.toUpperCase()} ${input.genre} project: ${stack}. Keep generation staged, repairable, and blueprint-aware instead of relying on one monolithic image or mesh prompt.`
}

function buildOrchestrationStrategy(input: {
  generationToolchains: AssetGenerationToolchain[]
  promptSignals: string[]
  resolvedFeatures: string[]
}) {
  const pressureNotes = [
    input.promptSignals.includes("story-heavy") ? "Hold character identity and emotional readability stable across revisions." : "",
    input.promptSignals.includes("map-heavy") || input.resolvedFeatures.includes("world_gen")
      ? "Feed approved layout constraints into asset passes before clutter, dressing, or mesh variation."
      : "",
    input.resolvedFeatures.includes("inventory")
      ? "Batch-generate loot and icon families only after the family anchors are approved."
      : "",
  ].filter(Boolean)

  return `Run generation in bounded stages: ${input.generationToolchains.map((toolchain) => toolchain.stage).join(" -> ")}. Approve each stage before the next one starts, preserve intermediate outputs for repair, and reuse the same prompt-lock plus blueprint context in every pass. ${pressureNotes.join(" ")}`
}

function buildToolchainQualityChecks(input: {
  dimension: GameDimension
  promptSignals: string[]
  resolvedFeatures: string[]
  generationToolchains: AssetGenerationToolchain[]
}) {
  const checks = [
    "Every external generation pass must consume the original prompt, runtime contract, and relevant asset blueprint family.",
    "No generated asset may add genre drift, combat assumptions, or interaction verbs that were not requested.",
    "Reject outputs that cannot be mapped cleanly to a character, prop, or environment family before import.",
    ...input.generationToolchains.flatMap((toolchain) => toolchain.verificationChecks),
  ]

  if (input.dimension !== "2d") {
    checks.push("All imported 3D drafts must pass scale, collision, and silhouette review before entering the playable slice.")
  }

  if (input.promptSignals.includes("peaceful")) {
    checks.push("Peaceful or no-combat prompts must be screened for hostile props, weapons, or threat silhouettes before approval.")
  }

  if (input.resolvedFeatures.includes("inventory")) {
    checks.push("Inventory-facing assets need consistent rarity, category, and depletion communication across the entire family.")
  }

  return takeTop(checks, 8)
}

export function buildAssetGenerationPlan(input: {
  prompt: string
  genre: Genre
  dimension: GameDimension
  mapArchetype: string
  worldStructure: string
  environmentThemes: string[]
  promptSignals: string[]
  resolvedFeatures: string[]
  multiplayer: boolean
}): AssetGenerationPlan {
  const generationToolchains = buildGenerationToolchains({
    prompt: input.prompt,
    genre: input.genre,
    dimension: input.dimension,
    promptSignals: input.promptSignals,
    resolvedFeatures: input.resolvedFeatures,
  })

  return {
    productionStyle: inferProductionStyle(input.prompt, input.genre, input.dimension, input.promptSignals),
    assetSystemSummary: inferAssetSystemSummary({
      promptSignals: input.promptSignals,
      resolvedFeatures: input.resolvedFeatures,
      mapArchetype: input.mapArchetype,
      worldStructure: input.worldStructure,
    }),
    assetPipelineSummary: inferAssetPipelineSummary(
      input.dimension,
      input.promptSignals,
      input.mapArchetype,
      input.worldStructure,
    ),
    modelGenerationSummary: buildModelGenerationSummary({
      dimension: input.dimension,
      genre: input.genre,
      generationToolchains,
    }),
    kitArchitecture: inferKitArchitecture({
      dimension: input.dimension,
      promptSignals: input.promptSignals,
      mapArchetype: input.mapArchetype,
      resolvedFeatures: input.resolvedFeatures,
    }),
    assemblyStrategy: inferAssemblyStrategy(input.dimension, input.promptSignals, input.resolvedFeatures),
    orchestrationStrategy: buildOrchestrationStrategy({
      generationToolchains,
      promptSignals: input.promptSignals,
      resolvedFeatures: input.resolvedFeatures,
    }),
    characterStrategy: inferCharacterStrategy(input.prompt, input.genre, input.promptSignals),
    propStrategy: inferPropStrategy(input.promptSignals, input.resolvedFeatures),
    environmentStrategy: inferEnvironmentStrategy(
      input.dimension,
      input.environmentThemes,
      input.mapArchetype,
    ),
    materialPalette: inferMaterialPalette(input.prompt, input.genre, input.promptSignals),
    animationNeeds: inferAnimationNeeds(input.promptSignals, input.resolvedFeatures, input.multiplayer),
    reuseDirectives: buildReuseDirectives({
      dimension: input.dimension,
      promptSignals: input.promptSignals,
      resolvedFeatures: input.resolvedFeatures,
    }),
    stateModelRules: buildStateModelRules({
      genre: input.genre,
      promptSignals: input.promptSignals,
      resolvedFeatures: input.resolvedFeatures,
    }),
    spawnRules: buildSpawnRules({
      promptSignals: input.promptSignals,
      resolvedFeatures: input.resolvedFeatures,
      mapArchetype: input.mapArchetype,
    }),
    productionPhases: buildProductionPhases({
      dimension: input.dimension,
      genre: input.genre,
      promptSignals: input.promptSignals,
      resolvedFeatures: input.resolvedFeatures,
    }),
    integrationContracts: buildIntegrationContracts({
      promptSignals: input.promptSignals,
      resolvedFeatures: input.resolvedFeatures,
      multiplayer: input.multiplayer,
    }),
    generationRules: buildGenerationRules({
      dimension: input.dimension,
      promptSignals: input.promptSignals,
      resolvedFeatures: input.resolvedFeatures,
      mapArchetype: input.mapArchetype,
    }),
    specialistTracks: buildAssetSpecialistTracks({
      genre: input.genre,
      dimension: input.dimension,
      promptSignals: input.promptSignals,
      resolvedFeatures: input.resolvedFeatures,
    }),
    reviewPasses: buildAssetReviewPasses({
      genre: input.genre,
      dimension: input.dimension,
      promptSignals: input.promptSignals,
    }),
    qualityGates: buildAssetQualityGates({
      genre: input.genre,
      promptSignals: input.promptSignals,
      resolvedFeatures: input.resolvedFeatures,
    }),
    toolchainQualityChecks: buildToolchainQualityChecks({
      dimension: input.dimension,
      promptSignals: input.promptSignals,
      resolvedFeatures: input.resolvedFeatures,
      generationToolchains,
    }),
    characterBlueprints: buildCharacterBlueprints({
      prompt: input.prompt,
      genre: input.genre,
      promptSignals: input.promptSignals,
      resolvedFeatures: input.resolvedFeatures,
    }),
    propBlueprints: buildPropBlueprints({
      prompt: input.prompt,
      genre: input.genre,
      promptSignals: input.promptSignals,
      resolvedFeatures: input.resolvedFeatures,
    }),
    environmentKits: buildEnvironmentKits({
      prompt: input.prompt,
      genre: input.genre,
      dimension: input.dimension,
      mapArchetype: input.mapArchetype,
      promptSignals: input.promptSignals,
      environmentThemes: input.environmentThemes,
    }),
    generationToolchains,
    sourceInspirations: selectSourceInspirations({
      prompt: input.prompt,
      genre: input.genre,
      dimension: input.dimension,
      promptSignals: input.promptSignals,
      resolvedFeatures: input.resolvedFeatures,
    }),
  }
}
