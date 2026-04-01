// ═══════════════════════════════════════════════════════════════
// FUNALOO ENGINE — Configuration, Domains, Intelligence DB
// Ported from NEXUS-116 v3 — nexus116.json, engine_intelligence,
// research domains, training domains, generation systems
// ═══════════════════════════════════════════════════════════════

import { buildAssetGenerationPlan } from "./asset-generation-intelligence"
import { planGenerationCandidates } from "./generation-intelligence/candidate-planner"
import { planGenerationDiversity } from "./generation-intelligence/diversity-planner"
import { planGenerationEngine } from "./generation-intelligence/engine-planner"
import { planGenerationEvaluation } from "./generation-intelligence/evaluation-planner"
import { planGenerationGraphics } from "./generation-intelligence/graphics-planner"
import { buildGenerationPromptCouncilPlan } from "./generation-intelligence/prompt-council-planner"
import { planGenerationReferences } from "./generation-intelligence/retrieval-planner"
import { planGenerationRuntimeVersatility } from "./generation-intelligence/runtime-versatility-planner"
import type {
  EngineState, BrainState, ResearchDomain, TrainingDomain,
  GenerationSystem, OpenSourceEngine, StandaloneLibrary,
  WorkItem, SceneNode, TrainingConfig, UserProject, ProjectId,
  GameDimension, GenerationIntelligenceProfile, GenerationRuntimePlan, Genre, GenreTemplateDefinition,
} from "./types"

// ── Engine State ──────────────────────────────────────────────

export const INITIAL_ENGINE_STATE: EngineState = {
  status: "running",
  currentPhase: "L1_research",
  currentTask: "Researching: rendering_graphics",
  cycleCount: 182,
  levelsEnabled: {
    L0_context: true, L1_research: true,
    L2_training: true, L3_generation: true, L4_meta_loop: true,
  },
  research: { domainsDone: 9, domainsTotal: 14, linksFound: 247, current: "rendering_graphics" },
  training: { domainsDone: 6, domainsTotal: 13, epoch: "2/3", lastCheckpoint: "checkpoint_physics_simulation_epoch2", current: "physics_simulation" },
  generation: { systemsDone: 5, systemsTotal: 9, current: "ai_npc" },
  startedAt: "2026-03-27T14:30:00Z",
  lastActivity: "2026-03-28T03:42:15Z",
}

export const BRAIN_STATE: BrainState = {
  cycleCount: 182,
  totalItemsCompleted: 69,
  totalItemsFailed: 93,
  totalLinesWritten: 2877,
  totalFilesCreated: 26,
  totalFilesModified: 20,
  lastReflection: "Identified 3 missing subsystems, 2 weak areas in rendering pipeline",
  running: true,
  knownGaps: [
    "Vulkan RHI abstraction layer incomplete",
    "No virtual geometry (Nanite-style) pipeline",
    "Rollback netcode not tested under load",
    "Behavior tree parallel node execution missing",
    "HRTF audio not integrated with scene graph",
    "Terrain LOD system not streaming-ready",
    "No GPU profiling integration",
    "Shader hot-reload not functional",
    "Missing asset dependency graph",
    "No visual scripting editor prototype",
  ],
  recentlyCompleted: [
    "ECS archetype storage system",
    "Godot node-based scene composition",
    "GDExtension architecture analysis",
    "Signal pattern for event-driven systems",
    "Bevy ECS scheduler parallel execution",
    "O3DE Gem plugin architecture",
    "Fyrox animation state machine",
    "Flax GI implementation analysis",
    "Stride render graph architecture",
  ],
}

// ── Training Configuration ────────────────────────────────────

export const TRAINING_CONFIG: TrainingConfig = {
  method: "lora",
  baseModel: "unsloth/Meta-Llama-3.1-8B-Instruct",
  maxSeqLength: 8192,
  batchSize: 4,
  epochs: 3,
  learningRate: 2e-4,
  outputDir: "data/models/checkpoints",
}

// ── Research Domains (14 domains from crawler.py) ─────────────

export const RESEARCH_DOMAINS: ResearchDomain[] = [
  { name: "engine_architecture", displayName: "Engine Architecture", description: "Core engine design patterns, ECS, scene graphs, memory management", links: 32, threshold: 20, status: "complete", searchQueries: ["game engine ECS architecture", "scene graph optimization", "data-oriented design games"] },
  { name: "rendering_graphics", displayName: "Rendering & Graphics", description: "Vulkan/D3D12, PBR, GI, mesh shaders, post-processing pipelines", links: 14, threshold: 20, status: "active", searchQueries: ["vulkan rendering engine", "PBR implementation", "nanite virtual geometry"] },
  { name: "procedural_generation", displayName: "Procedural Generation", description: "Noise functions, terrain, WFC, L-systems, dungeon/city generation", links: 28, threshold: 20, status: "complete", searchQueries: ["procedural terrain generation", "wave function collapse", "hydraulic erosion simulation"] },
  { name: "multiplayer_networking", displayName: "Multiplayer Networking", description: "Client prediction, replication, rollback netcode, MMO architecture", links: 22, threshold: 20, status: "complete", searchQueries: ["game networking prediction", "rollback netcode implementation", "MMO server architecture"] },
  { name: "ai_game_agents", displayName: "AI & Game Agents", description: "Behavior trees, GOAP, utility AI, navigation, NPC systems", links: 25, threshold: 20, status: "complete", searchQueries: ["game AI behavior trees", "GOAP implementation", "navmesh pathfinding"] },
  { name: "physics_simulation", displayName: "Physics Simulation", description: "Rigid body, collision detection, constraints, soft body, destruction", links: 21, threshold: 20, status: "complete", searchQueries: ["game physics engine", "GJK collision detection", "constraint solver"] },
  { name: "asset_pipeline", displayName: "Asset Pipeline", description: "Import, cooking, streaming, hot-reload, dependency tracking", links: 19, threshold: 20, status: "complete", searchQueries: ["game asset pipeline", "hot reload game engine", "asset streaming"] },
  { name: "audio_engine", displayName: "Audio Engine", description: "Spatial audio, HRTF, DSP pipeline, adaptive music, procedural sound", links: 18, threshold: 20, status: "complete", searchQueries: ["spatial audio HRTF", "adaptive game music", "audio DSP engine"] },
  { name: "ui_framework", displayName: "UI Framework", description: "Immediate/retained GUI, HUD, menus, data binding, localization", links: 15, threshold: 20, status: "complete", searchQueries: ["game UI framework", "imgui game engine", "HUD system design"] },
  { name: "optimization", displayName: "Optimization", description: "SIMD, GPU optimization, memory management, profiling, streaming", links: 24, threshold: 20, status: "complete", searchQueries: ["game optimization SIMD", "GPU-driven rendering", "memory pool allocator"] },
  { name: "llm_finetuning", displayName: "LLM Fine-tuning", description: "LoRA, QLoRA, dataset preparation, evaluation, deployment", links: 8, threshold: 20, status: "pending", searchQueries: ["lora fine-tuning", "instruction tuning dataset", "llm evaluation"] },
  { name: "ai_code_generation", displayName: "AI Code Generation", description: "Code LLMs, program synthesis, code review, automated testing", links: 6, threshold: 20, status: "pending", searchQueries: ["AI code generation", "program synthesis", "automated code review"] },
  { name: "unreal_cpp", displayName: "Unreal C++", description: "UE5 UCLASS, Blueprints, Nanite, Lumen, multiplayer, GAS", links: 11, threshold: 20, status: "pending", searchQueries: ["unreal engine C++", "UE5 gameplay ability system", "nanite implementation"] },
  { name: "unreal_blueprints", displayName: "Unreal Blueprints", description: "Visual scripting, Blueprint communication, Blueprint nativization", links: 4, threshold: 20, status: "pending", searchQueries: ["unreal blueprints tutorial", "blueprint vs C++", "visual scripting game engine"] },
]

// ── Training Domains (13 from training config) ────────────────

export const TRAINING_DOMAINS: TrainingDomain[] = [
  { name: "procedural_generation", displayName: "Procedural Generation", epoch: 3, totalEpochs: 3, pairs: 847, quality: 0.91, status: "complete" },
  { name: "rendering_graphics", displayName: "Rendering & Graphics", epoch: 3, totalEpochs: 3, pairs: 1203, quality: 0.88, status: "complete" },
  { name: "multiplayer_networking", displayName: "Multiplayer Networking", epoch: 3, totalEpochs: 3, pairs: 654, quality: 0.85, status: "complete" },
  { name: "ai_game_agents", displayName: "AI & Game Agents", epoch: 3, totalEpochs: 3, pairs: 512, quality: 0.87, status: "complete" },
  { name: "engine_architecture", displayName: "Engine Architecture", epoch: 3, totalEpochs: 3, pairs: 945, quality: 0.92, status: "complete" },
  { name: "physics_simulation", displayName: "Physics Simulation", epoch: 2, totalEpochs: 3, pairs: 423, quality: 0.83, status: "training" },
  { name: "optimization", displayName: "Optimization", epoch: 3, totalEpochs: 3, pairs: 378, quality: 0.89, status: "complete" },
  { name: "asset_pipeline", displayName: "Asset Pipeline", epoch: 0, totalEpochs: 3, pairs: 0, quality: 0, status: "pending" },
  { name: "audio_engine", displayName: "Audio Engine", epoch: 0, totalEpochs: 3, pairs: 0, quality: 0, status: "pending" },
  { name: "ui_framework", displayName: "UI Framework", epoch: 0, totalEpochs: 3, pairs: 0, quality: 0, status: "pending" },
  { name: "llm_finetuning", displayName: "LLM Fine-tuning", epoch: 0, totalEpochs: 3, pairs: 0, quality: 0, status: "pending" },
  { name: "ai_code_generation", displayName: "AI Code Generation", epoch: 0, totalEpochs: 3, pairs: 0, quality: 0, status: "pending" },
  { name: "unreal_cpp", displayName: "Unreal C++", epoch: 0, totalEpochs: 3, pairs: 0, quality: 0, status: "pending" },
]

// ── Generation Systems ────────────────────────────────────────

export const GENERATION_SYSTEMS: GenerationSystem[] = [
  { name: "inventory", displayName: "Inventory System", status: "complete", linesGenerated: 1847, engine: "unreal" },
  { name: "combat", displayName: "Combat System", status: "complete", linesGenerated: 2340, engine: "unreal" },
  { name: "networking", displayName: "Networking", status: "complete", linesGenerated: 3120, engine: "unreal" },
  { name: "world_gen", displayName: "World Generation", status: "complete", linesGenerated: 2890, engine: "unreal" },
  { name: "rendering", displayName: "Rendering Pipeline", status: "complete", linesGenerated: 4210, engine: "unreal" },
  { name: "ai_npc", displayName: "AI & NPC", status: "generating", linesGenerated: 1420, engine: "unreal" },
  { name: "physics", displayName: "Physics", status: "pending", linesGenerated: 0, engine: "unreal" },
  { name: "audio", displayName: "Audio", status: "pending", linesGenerated: 0, engine: "unreal" },
  { name: "ui", displayName: "UI Framework", status: "pending", linesGenerated: 0, engine: "unreal" },
]

// ── Open Source Engine Intelligence ───────────────────────────
// From engine_intelligence.py — Tier 1/2/3 engines studied

export const OPEN_SOURCE_ENGINES: OpenSourceEngine[] = [
  { name: "Godot", tier: 1, stars: "107K", contributors: 2800, language: "C++/GDScript", absorbed: ["Node-based scene composition", "GDExtension architecture", "Signal pattern for event-driven systems", "Single-binary deployment", "2D renderer (best in class)"], subsystems: ["Scene System", "GDExtension", "Signals", "Rendering", "Physics", "Audio", "Networking"] },
  { name: "O3DE", tier: 1, stars: "8.2K", contributors: 450, language: "C++", absorbed: ["Atom renderer", "Gem plugin architecture", "Multiplayer framework", "Override system", "Prefab system"], subsystems: ["Atom Renderer", "Gem Plugins", "Multiplayer", "Prefabs", "Script Canvas"] },
  { name: "Bevy", tier: 2, stars: "38K", contributors: 1200, language: "Rust", absorbed: ["ECS scheduler (true parallel)", "Change detection on components", "Plugin architecture", "Asset hot-reload pipeline", "Rendering approach"], subsystems: ["ECS", "Scheduler", "Rendering", "Assets", "Audio", "Input"] },
  { name: "Fyrox", tier: 2, stars: "8.4K", contributors: 85, language: "Rust", absorbed: ["Scene graph property inheritance", "Animation state machine design", "Navmesh baking pipeline", "Sound system with HRTF"], subsystems: ["Scene Graph", "Animation", "NavMesh", "Audio", "Physics", "UI"] },
  { name: "Flax", tier: 2, stars: "6.4K", contributors: 120, language: "C++/C#", absorbed: ["GI implementation (closest to Lumen)", "Terrain + virtual texturing", "Foliage instancing (GPU-driven)", "Material editor graph system", "C# hot-reload with AppDomain"], subsystems: ["Rendering", "Terrain", "Foliage", "Materials", "Scripting", "Physics"] },
  { name: "Stride", tier: 2, stars: "7.2K", contributors: 95, language: "C#", absorbed: ["Render graph architecture", "VR rendering pipeline", "Near-native performance via Burst-like compilation", "Asset compilation pipeline"], subsystems: ["Render Graph", "VR", "Assets", "Physics", "Audio", "UI"] },
]

// ── Standalone Libraries (16 tracked) ─────────────────────────

export const STANDALONE_LIBS: StandaloneLibrary[] = [
  { name: "Jolt Physics", category: "Physics", description: "Horizon Forbidden West physics engine", absorbed: ["Broad-phase BVH", "Constraint solver", "Character controller"] },
  { name: "Rapier", category: "Physics", description: "Rust physics for Bevy ecosystem", absorbed: ["SIMD collision", "Deterministic simulation"] },
  { name: "Bullet3", category: "Physics", description: "Classic open-source physics", absorbed: ["Soft body dynamics", "Vehicle physics"] },
  { name: "Google Filament", category: "Rendering", description: "Mobile-first PBR renderer", absorbed: ["PBR material model", "IBL pipeline", "Shadow mapping"] },
  { name: "bgfx", category: "Rendering", description: "Cross-platform rendering library", absorbed: ["API abstraction pattern", "Shader compilation"] },
  { name: "wgpu", category: "Rendering", description: "Rust WebGPU implementation", absorbed: ["Modern GPU abstraction", "Compute pipeline"] },
  { name: "The Forge", category: "Rendering", description: "Cross-platform rendering framework", absorbed: ["Multi-threaded rendering", "Ray tracing abstraction"] },
  { name: "GameNetworkingSockets", category: "Networking", description: "Valve's networking library", absorbed: ["Reliable UDP", "Steam relay integration", "Connection encryption"] },
  { name: "yojimbo", category: "Networking", description: "Netcode library by Glenn Fiedler", absorbed: ["Client-server model", "Packet encryption", "Connection management"] },
  { name: "ENet", category: "Networking", description: "Reliable UDP networking library", absorbed: ["Channel multiplexing", "Peer management"] },
  { name: "SoLoud", category: "Audio", description: "Easy-to-use audio engine", absorbed: ["Mix bus architecture", "Filter chains", "3D audio"] },
  { name: "Steam Audio", category: "Audio", description: "Spatial audio SDK by Valve", absorbed: ["HRTF rendering", "Occlusion/propagation", "Ambisonics"] },
  { name: "RecastNavigation", category: "AI", description: "Navigation mesh library", absorbed: ["Navmesh generation", "Pathfinding", "Crowd simulation"] },
  { name: "BehaviorTree.CPP", category: "AI", description: "Behavior tree framework", absorbed: ["Node types", "Blackboard", "XML serialization"] },
  { name: "FastNoiseLite", category: "Procedural", description: "Noise generation library", absorbed: ["Simplex/Perlin/Cellular", "Domain warping", "Fractal types"] },
]

// ── Genre Templates (from GameGenerator) ──────────────────────

export const GENRE_TEMPLATES: Record<Genre, GenreTemplateDefinition> = {
  battle_royale: {
    features: ["networking", "combat", "inventory", "world_gen", "ui"],
    description: "Large-scale last-player-standing with rotating contest spaces, loot pressure, and a decisive late-game collapse.",
    defaultMultiplayer: true,
    defaultPlayers: 100,
    defaultNetworkTopology: "distributed_fleet",
    defaultTickRate: 60,
    designPriorities: ["Drop clarity", "Macro rotation pressure", "Readable late circles"],
    assetPriorities: ["Contest landmarks", "Loot readability", "Zone-threat communication"],
    failureWatchouts: ["Do not flatten the loop into generic deathmatch.", "Keep loot, rotation, and zone pressure visible in the first playable slice."],
    councilDebateFocus: ["Contest readability", "Endgame pacing", "Player-routing clarity"],
  },
  fps: {
    features: ["combat", "networking", "physics", "rendering", "audio"],
    description: "Direct-fire shooter structure centered on weapon handling, mission flow, sightline control, and paced combat recovery.",
    defaultMultiplayer: true,
    defaultPlayers: 16,
    designPriorities: ["Weapon feel", "Encounter pacing", "3D mission readability"],
    assetPriorities: ["Cover language", "Sightline landmarks", "Combat state readability"],
    failureWatchouts: ["Do not turn every shooter into the same flat arena.", "Honor first-person or over-the-shoulder expectations when the prompt calls for them."],
    councilDebateFocus: ["Mission fit", "Firefight readability", "Objective-led combat"],
  },
  rpg: {
    features: ["inventory", "combat", "world_gen", "ai_npc", "ui"],
    description: "Character- or party-driven progression structure with quests, build identity, exploration rewards, and stateful world reactions.",
    defaultMultiplayer: false,
    defaultPlayers: 1,
    defaultNetworkTopology: "listen_server",
    defaultTickRate: 30,
    designPriorities: ["Build progression", "Quest coherence", "World-state response"],
    assetPriorities: ["Party silhouettes", "Quest props", "Region identity"],
    failureWatchouts: ["Do not reduce RPG prompts to disconnected fights.", "Progression and world reaction must show up before optional breadth."],
    councilDebateFocus: ["Build depth", "Quest pacing", "Companion or NPC relevance"],
  },
  mmo: {
    features: ["networking", "combat", "inventory", "world_gen", "ai_npc", "ui", "audio"],
    description: "Persistent shared-world structure with social coordination, long-term progression, scalable activity loops, and role readability.",
    defaultMultiplayer: true,
    defaultPlayers: 1000,
    designPriorities: ["Session flow", "Role readability", "Persistent progression"],
    assetPriorities: ["Hub readability", "Class or faction identity", "Scalable world signage"],
    failureWatchouts: ["Do not simulate MMO scale by only inflating player counts.", "The first playable slice must prove social flow, not just solo combat."],
    councilDebateFocus: ["Session choreography", "Group readability", "Persistence scaffolding"],
  },
  racing: {
    features: ["physics", "networking", "rendering", "audio", "ui"],
    description: "Speed-first structure focused on vehicle feel, line discipline, sector learning, and high-clarity course feedback.",
    defaultMultiplayer: true,
    defaultPlayers: 12,
    designPriorities: ["Track readability", "Vehicle feel", "Sector progression"],
    assetPriorities: ["Track signage", "Course silhouettes", "Speed feedback"],
    failureWatchouts: ["Do not turn a racer into a generic driving sandbox.", "Course readability matters more than prop variety."],
    councilDebateFocus: ["Course teaching", "Speed feedback", "Vehicle-state clarity"],
  },
  platformer: {
    features: ["physics", "combat", "world_gen", "audio", "ui"],
    description: "Traversal-forward structure where movement verbs, hazard bands, and mastery checks are the primary source of satisfaction.",
    defaultMultiplayer: false,
    defaultPlayers: 1,
    defaultNetworkTopology: "listen_server",
    defaultTickRate: 30,
    designPriorities: ["Verb teaching", "Hazard readability", "Mastery cadence"],
    assetPriorities: ["Silhouette clarity", "Traversal anchors", "Hazard communication"],
    failureWatchouts: ["Do not bury platforming under generic combat.", "Movement readability beats environment clutter."],
    councilDebateFocus: ["Verb mastery", "Hazard spacing", "Readability under speed"],
  },
  sandbox: {
    features: ["world_gen", "physics", "inventory", "ai_npc", "rendering"],
    description: "Player-authored sandbox structure with building, systemic chaining, and space for self-directed progression loops.",
    defaultMultiplayer: true,
    defaultPlayers: 32,
    designPriorities: ["Player authorship", "System interoperability", "World persistence"],
    assetPriorities: ["Modular kits", "State variants", "Construction readability"],
    failureWatchouts: ["Do not confuse breadth with player agency.", "Building, crafting, or systems chaining must appear early if promised."],
    councilDebateFocus: ["Player ownership", "System chaining", "State persistence"],
  },
  adventure: {
    features: ["world_gen", "inventory", "ai_npc", "audio", "ui"],
    description: "Travel- and discovery-led structure where route choice, landmark payoff, and event pacing matter more than raw combat volume.",
    defaultMultiplayer: false,
    defaultPlayers: 1,
    defaultNetworkTopology: "listen_server",
    defaultTickRate: 30,
    designPriorities: ["Discovery payoff", "Route choice", "Landmark rhythm"],
    assetPriorities: ["Landmark identity", "Travel props", "Readable destination cues"],
    failureWatchouts: ["Do not inject combat loops unless the prompt explicitly asks for them.", "The trip itself must feel meaningful."],
    councilDebateFocus: ["Travel pacing", "Landmark payoff", "Exploration identity"],
  },
  simulation: {
    features: ["world_gen", "inventory", "audio", "ui"],
    description: "Systemic simulation structure centered on routines, optimization, stateful resources, and readable cause-and-effect loops.",
    defaultMultiplayer: false,
    defaultPlayers: 1,
    defaultNetworkTopology: "listen_server",
    defaultTickRate: 30,
    designPriorities: ["System literacy", "Routine clarity", "Operational feedback"],
    assetPriorities: ["State variants", "Functional props", "Readable workspaces"],
    failureWatchouts: ["Do not let sim prompts drift into shallow ambient scenery.", "The player must be able to act on system state immediately."],
    councilDebateFocus: ["Cause and effect", "Routine pacing", "State readability"],
  },
  strategy: {
    features: ["world_gen", "inventory", "ui", "ai_npc"],
    description: "Planning-heavy structure built around resource allocation, sector or board control, long-horizon leverage, and consequence clarity.",
    defaultMultiplayer: false,
    defaultPlayers: 1,
    defaultNetworkTopology: "listen_server",
    defaultTickRate: 30,
    designPriorities: ["Decision weight", "Board-state clarity", "Economy leverage"],
    assetPriorities: ["Board readability", "Faction or sector states", "Decision support UI"],
    failureWatchouts: ["Do not flatten strategy into direct-avatar action.", "The player needs visible consequences for every major decision."],
    councilDebateFocus: ["Board clarity", "Economic tempo", "Decision consequence"],
  },
  survival: {
    features: ["world_gen", "inventory", "audio", "ui"],
    description: "Endurance-driven structure where scarcity, hazard pressure, scavenging routes, and recovery windows define the loop.",
    defaultMultiplayer: false,
    defaultPlayers: 1,
    defaultNetworkTopology: "listen_server",
    defaultTickRate: 30,
    designPriorities: ["Resource pressure", "Recovery windows", "Threat escalation"],
    assetPriorities: ["Shelter states", "Scavenge nodes", "Hazard signaling"],
    failureWatchouts: ["Do not turn survival prompts into generic shard collection.", "Scavenging, endurance, and repair must stay visible in the first playable slice."],
    councilDebateFocus: ["Threat pacing", "Scavenge clarity", "Shelter integrity"],
  },
  horror: {
    features: ["audio", "rendering", "ai_npc", "physics", "ui"],
    description: "Tension-forward structure built on vulnerability, sparse information, threat anticipation, and controlled psychological escalation.",
    defaultMultiplayer: false,
    defaultPlayers: 1,
    defaultNetworkTopology: "listen_server",
    defaultTickRate: 30,
    designPriorities: ["Tension pacing", "Threat ambiguity", "Escape or confrontation payoff"],
    assetPriorities: ["Atmosphere states", "Threat silhouettes", "Audio-reactive spaces"],
    failureWatchouts: ["Do not confuse darkness with actual horror pacing.", "Threat anticipation must arrive before repeated jump-scare noise."],
    councilDebateFocus: ["Fear pacing", "Information scarcity", "Threat readability"],
  },
  action: {
    features: ["combat", "physics", "rendering", "audio", "ui"],
    description: "High-momentum mechanical structure centered on reaction mastery, spectacles, and frame-tight execution.",
    defaultMultiplayer: false,
    defaultPlayers: 1,
    defaultNetworkTopology: "listen_server",
    defaultTickRate: 30,
    designPriorities: ["Mechanical response", "Spectacle staging", "Reaction pacing"],
    assetPriorities: ["VFX impact", "Animation frames", "Arena readability"],
    failureWatchouts: ["Do not let technical spectacle bury the mechanical verb.", "Reaction windows must stay fair even during high-momentum spikes."],
    councilDebateFocus: ["Flow sustain", "Response latency", "Spectacle readability"],
  },
  sports: {
    features: ["physics", "networking", "ui", "ai_npc", "audio"],
    description: "Rule-based competitive structure focused on coordination, possession mastery, and match-driven tactical execution.",
    defaultMultiplayer: true,
    defaultPlayers: 22,
    designPriorities: ["Rule consistency", "Team coordination", "Match pacing"],
    assetPriorities: ["Rule-critical UI", "Arena signage", "Crowd feedback"],
    failureWatchouts: ["Do not let physics noise break rule consistency.", "Team coordination must be visible even in solo-play slices."],
    councilDebateFocus: ["Match cadence", "Rule enforcement", "Possession feedback"],
  },
  puzzle: {
    features: ["world_gen", "ui", "audio", "physics"],
    description: "Logic-driven informational structure centered on teaching mechanics, chamber solving, and systemic 'ah-ha' moments.",
    defaultMultiplayer: false,
    defaultPlayers: 1,
    defaultNetworkTopology: "listen_server",
    defaultTickRate: 30,
    designPriorities: ["Verb teaching", "Chamber flow", "Logic readability"],
    assetPriorities: ["Logic state feedback", "Clean silhouettes", "Informational cues"],
    failureWatchouts: ["Do not hide the logic; teach it through design failure first.", "Trial-and-error must be fast and low-friction."],
    councilDebateFocus: ["Logic scaffolding", "Clue routing", "Verb consistency"],
  },
  shooter: {
    features: ["combat", "physics", "rendering", "audio", "ui"],
    description: "Projectile-based engagement structure centered on sightline control, weapon handling, and tactical battlefield awareness.",
    defaultMultiplayer: true,
    defaultPlayers: 16,
    designPriorities: ["Weapon feel", "Battlefield legibility", "Engagement pacing"],
    assetPriorities: ["Muzzle and impact VFX", "Sightline landmarks", "Threat indicators"],
    failureWatchouts: ["Do not turn shooters into generic arenas without tactical cover.", "Projectile physics must match the prompt's ballistics expectations."],
    councilDebateFocus: ["Firefight pacing", "Ballistics feel", "Sightline integrity"],
  },
  fighting: {
    features: ["combat", "physics", "rendering", "audio", "ui"],
    description: "Frame-precise mechanical structure focused on one-on-one duels, pattern reading, and high-response counter-play.",
    defaultMultiplayer: true,
    defaultPlayers: 2,
    designPriorities: ["Frame-data accuracy", "Spacing discipline", "Collision clarity"],
    assetPriorities: ["Hit and block VFX", "Frame-tight animation", "Stage boundaries"],
    failureWatchouts: ["Do not let visual noise break frame-data readability.", "Hitboxes and hurtboxes must align with the visual spectacle perfectly."],
    councilDebateFocus: ["Neutral play", "Execution precision", "Matchup fairness"],
  },
  stealth: {
    features: ["stealth", "ai_npc", "audio", "ui", "world_gen"],
    description: "Detection-driven structure built around information asymmetry, infiltration routing, and exposure management.",
    defaultMultiplayer: false,
    defaultPlayers: 1,
    defaultNetworkTopology: "listen_server",
    defaultTickRate: 30,
    designPriorities: ["Detection clarity", "Infiltration routing", "Information gathering"],
    assetPriorities: ["Exposure UI", "Guard-cone signals", "Hidden pathing"],
    failureWatchouts: ["Do not make detection binary; give the player 'near-miss' feedback.", "The environment must narrate the threat's awareness state."],
    councilDebateFocus: ["Detection logic", "Route options", "Exposure pacing"],
  },
  rhythm: {
    features: ["rhythm", "audio", "ui", "rendering"],
    description: "Beat-synced synchronization structure focused on timing precision, flow-state sustain, and audio-visual feedback loops.",
    defaultMultiplayer: false,
    defaultPlayers: 1,
    defaultNetworkTopology: "listen_server",
    defaultTickRate: 30,
    designPriorities: ["Audio-visual sync", "Timing fairness", "Flow sustain"],
    assetPriorities: ["Beat-synced VFX", "Timing-window UI", "Track silhouettes"],
    failureWatchouts: ["Do not let visual latency break the beat sync.", "Feedback must tell the player *why* they missed, not just *that* they missed."],
    councilDebateFocus: ["Sync precision", "Tempo mapping", "Feedback cadence"],
  },
  party: {
    features: ["networking", "ui", "audio", "physics"],
    description: "High-energy social structure centered on low-friction participation, rapid-reset rounds, and shared chaotic fun.",
    defaultMultiplayer: true,
    defaultPlayers: 8,
    designPriorities: ["Social energy", "Reset speed", "Low-friction onboarding"],
    assetPriorities: ["Shared lobby UI", "Chaotic VFX", "Social cues"],
    failureWatchouts: ["Do not let mechanical complexity block social participation.", "Downtime between rounds is the ultimate retention killer."],
    councilDebateFocus: ["Reset cadence", "Social sticky-loops", "Rivalry balance"],
  },
  board_card: {
    features: ["inventory", "ui", "networking", "ai_npc"],
    description: "Tactical decision structure built around hand management, board state, and long-horizon planning.",
    defaultMultiplayer: true,
    defaultPlayers: 4,
    designPriorities: ["State visibility", "Resource clarity", "Synergy depth"],
    assetPriorities: ["Card/Unit silhouettes", "Board-state markers", "Synergy UI"],
    failureWatchouts: ["Do not let randomness overwhelm tactical planning.", "The board state must be readable at a single glance."],
    councilDebateFocus: ["Tactical state", "Synergy realization", "Probability balance"],
  },
  idle_incremental: {
    features: ["inventory", "ui", "audio", "rendering"],
    description: "Exponential scaling structure centered on throughput, investment milestones, and passive-to-active growth loops.",
    defaultMultiplayer: false,
    defaultPlayers: 1,
    defaultNetworkTopology: "listen_server",
    defaultTickRate: 30,
    designPriorities: ["Scaling logic", "Milestone frequency", "Growth feedback"],
    assetPriorities: ["Number-pop VFX", "Throughput dashboards", "Tier silhouettes"],
    failureWatchouts: ["Do not let scaling feel like a chore; reward the wait with visible power spikes.", "Active loops must strengthen the passive baseline."],
    councilDebateFocus: ["Scaling math", "Milestone pacing", "Retention loops"],
  },
  visual_novel: {
    features: ["dialogue", "ai_npc", "ui", "audio"],
    description: "Character-driven narrative structure focused on relationship management, choices, and branching story consequences.",
    defaultMultiplayer: false,
    defaultPlayers: 1,
    defaultNetworkTopology: "listen_server",
    defaultTickRate: 30,
    designPriorities: ["Narrative branching", "Relationship status", "Choice impact"],
    assetPriorities: ["Character portraits", "Expressive backgrounds", "Dialogue surfaces"],
    failureWatchouts: ["Do not make choices feel illusory; they must have visible consequences.", "Dialogue pacing must respect the character's emotional arc."],
    councilDebateFocus: ["Branching logic", "Character bonds", "Story milestones"],
  },
  interactive_fiction: {
    features: ["dialogue", "questing", "ui", "audio"],
    description: "Text-led deductive structure centered on world investigation, narrative inquiry, and informational breakthroughs.",
    defaultMultiplayer: false,
    defaultPlayers: 1,
    defaultNetworkTopology: "listen_server",
    defaultTickRate: 30,
    designPriorities: ["Deduction support", "World responsiveness", "Clue routing"],
    assetPriorities: ["Investigation UI", "Thematic text surfaces", "Hidden cues"],
    failureWatchouts: ["Do not lead the player; let them find the Rosetta Stone moment through inquiry.", "The world must respond to systemic questions."],
    councilDebateFocus: ["Inquiry depth", "Logic routing", "Narrative deduction"],
  },
  walking_simulator: {
    features: ["audio", "rendering", "world_gen", "ui"],
    description: "Atmospheric immersion structure focused on unhurried observation, environmental narration, and thematic reflection.",
    defaultMultiplayer: false,
    defaultPlayers: 1,
    defaultNetworkTopology: "listen_server",
    defaultTickRate: 30,
    designPriorities: ["Atmospheric pacing", "Thematic unity", "Observation reward"],
    assetPriorities: ["Environmental narrator", "Deep-theme props", "Mood lighting"],
    failureWatchouts: ["Do not confuse a lack of mechanics with a lack of pacing.", "The world must tell a complete story through its form alone."],
    councilDebateFocus: ["Immersion pacing", "Thematic resonance", "Sensory onboarding"],
  },
  moba: {
    features: ["networking", "combat", "inventory", "world_gen", "ai_npc", "ui"],
    description: "Lane-driven coordination structure centered on role execution, teamwide objectives, and scaling power arcs.",
    defaultMultiplayer: true,
    defaultPlayers: 10,
    designPriorities: ["Role readability", "Map objective timing", "Scaling fairness"],
    assetPriorities: ["Team silhouettes", "Lane signage", "Objective landmarks"],
    failureWatchouts: ["Do not let snowballing break late-game comeback potential.", "Role execution must be mandatory for team success."],
    councilDebateFocus: ["Lane pressure", "Team coordination", "Scaling math"],
  },
  tower_defense: {
    features: ["strategy_heavy", "ui", "world_gen", "audio"],
    description: "Path-based defense structure focused on wave pressure, tower specialization, and resource optimization.",
    defaultMultiplayer: false,
    defaultPlayers: 1,
    defaultNetworkTopology: "listen_server",
    defaultTickRate: 30,
    designPriorities: ["Wave pacing", "Tower synergy", "Path readability"],
    assetPriorities: ["Tower silhouettes", "Creep variety", "Impact feedback"],
    failureWatchouts: ["Do not let wave volume bury the strategic tower choice.", "Path bottlenecks must be a tactical decision, not a map accident."],
    councilDebateFocus: ["Pressure scaling", "Tower utility", "Path strategy"],
  },
  auto_battler: {
    features: ["strategy_heavy", "inventory", "ui", "networking", "ai_npc"],
    description: "Draft-led assembly structure focused on composition drafting, positional strategy, and automated combat resolution.",
    defaultMultiplayer: true,
    defaultPlayers: 8,
    designPriorities: ["Drafting fairness", "Synergy readability", "Combat automation"],
    assetPriorities: ["Unit synergies", "Board layout", "Resolution VFX"],
    failureWatchouts: ["Do not let drafting luck bury strategic composition choice.", "Positional decisions must be the primary win condition."],
    councilDebateFocus: ["Synergy math", "Drafting cadence", "Automation clarity"],
  },
  tps: {
    features: ["combat", "physics", "rendering", "audio", "ui"],
    description: "Tactical over-the-shoulder structure focused on cover-based interactions, flank reading, and situational awareness.",
    defaultMultiplayer: true,
    defaultPlayers: 12,
    designPriorities: ["Cover integrity", "Situational awareness", "Tactical flow"],
    assetPriorities: ["Cover language", "Flank landmarks", "Third-person HUD"],
    failureWatchouts: ["Do not let the wider camera break the combat tension.", "Cover entry and exit must be frame-tight and responsive."],
    councilDebateFocus: ["Cover strategy", "Perspective clarity", "Situational pacing"],
  },
  metroidbrainia: {
    features: ["puzzle", "world_gen", "questing", "ui", "audio"],
    description: "Knowledge-gating structure centered on world rules, mechanic deduction, and informational keys over physical powers.",
    defaultMultiplayer: false,
    defaultPlayers: 1,
    defaultNetworkTopology: "listen_server",
    defaultTickRate: 30,
    designPriorities: ["Knowledge gating", "Mechanic teaching", "Deductive flow"],
    assetPriorities: ["Rule clues", "Rosetta landmarks", "Mystery map"],
    failureWatchouts: ["Do not confuse knowledge gates with physical ability locks.", "The player must feel smart for deciphering the world's grammar."],
    councilDebateFocus: ["Knowledge routing", "Rule literacy", "Mystery pacing"],
  },
  four_x: {
    features: ["strategy_heavy", "world_gen", "inventory", "networking", "ai_npc", "ui"],
    description: "Grand-scale territorial structure focused on global grids, resource yields, and scientific or scientific dominance.",
    defaultMultiplayer: true,
    defaultPlayers: 8,
    designPriorities: ["Strategic depth", "Scaling throughput", "Dominance feedback"],
    assetPriorities: ["Global grid", "Empire silhouettes", "Tech/Civic trees"],
    failureWatchouts: ["Do not let macro scale bury local resource meaning.", "The endgame must resolve through strategic pivot, not just math sprawl."],
    councilDebateFocus: ["Strategic horizons", "Empire balance", "Victory conditions"],
  },
  soulslike: {
    features: ["combat", "physics", "rendering", "audio", "ui", "world_gen"],
    description: "Lethality-driven mastery structure focused on shortcut discovery, pattern learning, and high-stakes resource retrieval.",
    defaultMultiplayer: false,
    defaultPlayers: 1,
    defaultNetworkTopology: "listen_server",
    defaultTickRate: 30,
    designPriorities: ["Pattern fairness", "Persistence reward", "Shortcut topology"],
    assetPriorities: ["Safe haven landmarks", "Threat silhouettes", "Corpse retrieval cues"],
    failureWatchouts: ["Do not confuse lethality with unfairness.", "Shortcuts must be earned through spatial mastery and risk."],
    councilDebateFocus: ["Mastery curve", "Pattern learnability", "Shortcut flow"],
  },
  deckbuilder: {
    features: ["deckbuilding", "inventory", "ui", "ai_npc"],
    description: "Draft-engine structure focused on engine optimization, card drafting, and high-pressure synergy exams.",
    defaultMultiplayer: false,
    defaultPlayers: 1,
    defaultNetworkTopology: "listen_server",
    defaultTickRate: 30,
    designPriorities: ["Synergy drafting", "Run-to-run variety", "Engine readability"],
    assetPriorities: ["Card card silhouettes", "Relic feedback", "Node-map pathing"],
    failureWatchouts: ["Do not let a bloated deck kill the synergy fantasy.", "Run-defining relics must arrive early enough to shape the draft."],
    councilDebateFocus: ["Engine math", "Drafting variety", "Exam fairness"],
  },
}

// ── Scene Tree (default) ──────────────────────────────────────

export const DEFAULT_SCENE_TREE: SceneNode[] = [
  { id: "root", name: "World", type: "root", children: [
    { id: "env", name: "Environment", type: "node", children: [
      { id: "sky", name: "SkyAtmosphere", type: "component", children: [] },
      { id: "sun", name: "DirectionalLight", type: "component", children: [] },
      { id: "fog", name: "VolumetricFog", type: "component", children: [] },
    ]},
    { id: "terrain", name: "Terrain", type: "node", children: [
      { id: "heightmap", name: "HeightmapGenerator", type: "component", children: [] },
      { id: "erosion", name: "HydraulicErosion", type: "component", children: [] },
      { id: "foliage", name: "FoliageInstancer", type: "component", children: [] },
      { id: "water", name: "WaterSystem", type: "component", children: [] },
    ]},
    { id: "entities", name: "Entities", type: "node", children: [
      { id: "player", name: "PlayerCharacter", type: "entity", children: [
        { id: "mesh", name: "SkeletalMesh", type: "component", children: [] },
        { id: "phys", name: "CapsuleCollider", type: "component", children: [] },
        { id: "input", name: "InputController", type: "component", children: [] },
        { id: "ability", name: "AbilitySystem", type: "component", children: [] },
      ]},
      { id: "npc1", name: "NPC_Guard_01", type: "entity", children: [
        { id: "npc1mesh", name: "SkeletalMesh", type: "component", children: [] },
        { id: "npc1ai", name: "BehaviorTree", type: "component", children: [] },
        { id: "npc1nav", name: "NavMeshAgent", type: "component", children: [] },
      ]},
    ]},
    { id: "systems", name: "Systems", type: "node", children: [
      { id: "phys_world", name: "PhysicsWorld", type: "system", children: [] },
      { id: "audio_sys", name: "AudioEngine", type: "system", children: [] },
      { id: "net_sys", name: "NetworkManager", type: "system", children: [] },
      { id: "render_sys", name: "RenderPipeline", type: "system", children: [] },
    ]},
  ]},
]

// ── Work Queue (from brain work_queue.json) ───────────────────

export const BRAIN_WORK_QUEUE: WorkItem[] = [
  { id: "a1b2c3", category: "implement", priority: 1, title: "Implement Vulkan RHI abstraction layer", prompt: "Generate a complete Vulkan RHI abstraction...", targetFile: "core/rhi/vulkan_rhi.cpp", contextFiles: [], status: "done", result: "", applied: true, verified: true, error: "", createdAt: "2026-03-27T15:00:00Z", completedAt: "2026-03-27T15:34:00Z", cycle: 5 },
  { id: "d4e5f6", category: "implement", priority: 1, title: "Build ECS archetype storage system", prompt: "Implement archetype-based ECS storage...", targetFile: "core/ecs/archetype.cpp", contextFiles: [], status: "done", result: "", applied: true, verified: true, error: "", createdAt: "2026-03-27T16:00:00Z", completedAt: "2026-03-27T16:52:00Z", cycle: 8 },
  { id: "g7h8i9", category: "implement", priority: 2, title: "Add GJK + EPA narrow-phase collision", prompt: "Implement GJK with EPA...", targetFile: "physics/collision/gjk.cpp", contextFiles: [], status: "running", result: "", applied: false, verified: false, error: "", createdAt: "2026-03-28T03:40:00Z", completedAt: "", cycle: 182 },
  { id: "j1k2l3", category: "improve", priority: 2, title: "Optimize scene graph dirty flag propagation", prompt: "", targetFile: "core/scene/scene_graph.cpp", contextFiles: [], status: "pending", result: "", applied: false, verified: false, error: "", createdAt: "", completedAt: "", cycle: 0 },
  { id: "m4n5o6", category: "implement", priority: 1, title: "Client-side prediction with reconciliation", prompt: "", targetFile: "networking/prediction.cpp", contextFiles: [], status: "pending", result: "", applied: false, verified: false, error: "", createdAt: "", completedAt: "", cycle: 0 },
  { id: "p7q8r9", category: "fix", priority: 3, title: "Fix shadow acne in cascaded shadow maps", prompt: "", targetFile: "rendering/shadows/csm.cpp", contextFiles: [], status: "pending", result: "", applied: false, verified: false, error: "", createdAt: "", completedAt: "", cycle: 0 },
  { id: "s1t2u3", category: "implement", priority: 2, title: "Behavior tree parallel node execution", prompt: "", targetFile: "ai/behavior_tree/parallel.cpp", contextFiles: [], status: "pending", result: "", applied: false, verified: false, error: "", createdAt: "", completedAt: "", cycle: 0 },
  { id: "v4w5x6", category: "research", priority: 3, title: "Study Nanite cluster DAG for virtual geometry", prompt: "", targetFile: "research/nanite_analysis.md", contextFiles: [], status: "pending", result: "", applied: false, verified: false, error: "", createdAt: "", completedAt: "", cycle: 0 },
  { id: "y7z8a1", category: "implement", priority: 1, title: "HRTF binaural audio rendering", prompt: "", targetFile: "audio/spatial/hrtf.cpp", contextFiles: [], status: "pending", result: "", applied: false, verified: false, error: "", createdAt: "", completedAt: "", cycle: 0 },
  { id: "b2c3d4", category: "test", priority: 4, title: "Stress test replication with 100 clients", prompt: "", targetFile: "tests/networking/replication_stress.cpp", contextFiles: [], status: "pending", result: "", applied: false, verified: false, error: "", createdAt: "", completedAt: "", cycle: 0 },
]

function createStaticDesignProfile({
  genre,
  dimension,
  mapArchetype,
  mapOverview,
  gameplayLoopSummary,
  resolvedFeatures,
  supplementalSystems,
}: {
  genre: Genre
  dimension: GameDimension
  mapArchetype: string
  mapOverview: string
  gameplayLoopSummary: string
  resolvedFeatures: string[]
  supplementalSystems: GenerationIntelligenceProfile["supplementalSystems"]
}): GenerationIntelligenceProfile {
  const environmentThemes = ["Legacy authored spaces", "Updated generation blueprint"]
  const worldStructure = "Legacy demo project structure"
  const runtimeArchetype =
    genre === "simulation"
      ? "homestead_life"
      : genre === "strategy"
        ? "strategy_command"
        : genre === "survival"
          ? dimension === "3d"
            ? "survival_expedition_3d"
            : "survival_horde"
          : genre === "adventure"
            ? "journey_route"
            : dimension === "3d"
              ? "action_operation_3d"
              : "combat_mission"
  const assetPlan = buildAssetGenerationPlan({
    prompt: `Legacy ${dimension.toUpperCase()} ${genre.replace(/_/g, " ")} project`,
    genre,
    dimension,
    mapArchetype,
    worldStructure,
    environmentThemes,
    promptSignals: ["legacy-demo", dimension],
    resolvedFeatures,
    multiplayer: resolvedFeatures.includes("networking"),
  })
  const promptCouncilPlan = buildGenerationPromptCouncilPlan({
    genre,
    dimension,
    runtimeArchetype,
    promptSignals: ["legacy-demo", dimension],
  })
  const runtimePlan: GenerationRuntimePlan = {
    archetype: runtimeArchetype,
    label:
      runtimeArchetype === "homestead_life"
        ? "Homestead Life Runtime"
        : runtimeArchetype === "strategy_command"
          ? "Command Strategy Runtime"
          : runtimeArchetype === "survival_expedition_3d"
            ? "3D Survival Expedition Runtime"
          : runtimeArchetype === "survival_horde"
            ? "Survival Horde Runtime"
            : runtimeArchetype === "journey_route"
              ? "Journey Route Runtime"
              : runtimeArchetype === "action_operation_3d"
                ? "3D Action Operation Runtime"
                : "Combat Mission Runtime",
    reason: "Legacy demo projects are mapped onto the closest modern runtime archetype.",
    cameraModel: dimension === "3d" ? "Legacy 3D follow camera" : "Legacy authored overhead camera",
    targetSessionMinutes: 14,
    inputModel: "Legacy authored interaction model adapted to the runtime archetype.",
    playFocus: ["Legacy genre identity", "Readable progression", "Coherent first playable"],
    uiFocus: ["Primary HUD", "Objective panel"],
    contentStrategy: [
      "Preserve the original authored fantasy before expanding scope.",
      "Favor a stable first playable slice over broad system sprawl.",
    ],
    winCondition: "Complete the authored legacy objective chain.",
    failCondition: "Lose control of the route, objective, or primary survival state.",
    antiCollapseRules: [
      "Do not degrade legacy demos into the universal fallback loop.",
      "Preserve the original genre intent while modernizing the profile.",
    ],
  }
  const runtimeVersatilityPlan = planGenerationRuntimeVersatility({
    prompt: `Legacy ${dimension.toUpperCase()} ${genre.replace(/_/g, " ")} project`,
    genre,
    dimension,
    runtimeArchetype,
    promptSignals: ["legacy-demo", dimension],
    resolvedFeatures,
    contentPillars: ["Core genre identity", "Readable progression"],
    coreLoop: gameplayLoopSummary.split(", ").slice(0, 4),
    secondaryLoop: ["Reward routing", "Checkpoint resets"],
    progressionLoop: ["Unlock stronger spaces", "Escalate challenge", "Cash out rewards"],
    uiSurfaces: ["Primary HUD", "Objective readout", "Project information panels"],
    environmentThemes,
  })
  const graphicsPlan = planGenerationGraphics({
    genre,
    dimension,
    promptSignals: ["legacy-demo", dimension],
    resolvedFeatures,
    runtimeArchetype,
    environmentThemes,
    assetPlan,
  })
  const enginePlan = planGenerationEngine({
    genre,
    dimension,
    promptSignals: ["legacy-demo", dimension],
    resolvedFeatures,
    multiplayer: resolvedFeatures.includes("networking"),
    runtimeArchetype,
    graphicsPlan,
  })
  const references = planGenerationReferences({
    genre,
    dimension,
    runtimeArchetype,
    promptSignals: ["legacy-demo", dimension],
    resolvedFeatures,
  })
  const candidatePlan = planGenerationCandidates({
    genre,
    dimension,
    runtimeArchetype,
    promptSummary: `Legacy ${genre.replace(/_/g, " ")} project profile.`,
    generatedPitch: `Legacy ${dimension.toUpperCase()} ${genre.replace(/_/g, " ")} project updated into the current generation intelligence format.`,
    mapArchetype,
    promptSignals: ["legacy-demo", dimension],
    resolvedFeatures,
    negativeConstraints: [],
    scopeScale: "expanded",
    references,
  })
  const diversityPlan = planGenerationDiversity({
    promptSummary: `Legacy ${genre.replace(/_/g, " ")} project profile.`,
    genre,
    dimension,
    runtimeArchetype,
    mapArchetype,
    promptSignals: ["legacy-demo", dimension],
    resolvedFeatures,
    negativeConstraints: [],
    references,
    candidatePlan,
  })
  const evaluationPlan = planGenerationEvaluation({
    genre,
    dimension,
    runtimeArchetype,
    prompt: `Legacy ${dimension.toUpperCase()} ${genre.replace(/_/g, " ")} project`,
    promptSignals: ["legacy-demo", dimension],
    candidatePlan,
    diversityPlan,
  })

  return {
    resolvedGenre: genre,
    genreConfidence: "medium",
    genreReason: "Legacy project profile aligned to the authored demo genre.",
    resolvedSystems: [],
    resolvedModes: [],
    promptSummary: `Legacy ${genre.replace(/_/g, " ")} project profile.`,
    generatedPitch: `Legacy ${dimension.toUpperCase()} ${genre.replace(/_/g, " ")} project updated into the current generation intelligence format.`,
    playerFantasy: "Preserve the original project fantasy while modernizing its generation profile.",
    sessionFantasy: "Each run should still feel coherent, readable, and aligned to the original project intent.",
    interactionModel: dimension === "3d" ? "Direct character control in authored 3D spaces." : "Readable screen-space control with clear progression beats.",
    experienceGoals: ["Preserve the original project fantasy", "Keep the generated runtime coherent"],
    contentPillars: ["Core genre identity", "Readable progression", "Coherent generated systems"],
    progressionArcs: ["Teach the core loop", "Escalate pressure", "Cash out a session payoff"],
    environmentThemes,
    uiSurfaces: ["Primary HUD", "Objective readout", "Project information panels"],
    systemPriorities: ["Prompt alignment", "Layout readability", "Runtime coherence"],
    negativeConstraints: [],
    scopeScale: "expanded",
    resolvedMultiplayer: resolvedFeatures.includes("networking"),
    resolvedMaxPlayers: resolvedFeatures.includes("networking") ? GENRE_TEMPLATES[genre].defaultPlayers : 1,
    networkTopology: "listen_server",
    tickRate: 30,
    seed: "legacy_seed",
    dimension,
    cameraStyle: dimension === "2d" ? "Orthographic gameplay camera" : "Exploration follow camera",
    worldStructure,
    mapArchetype,
    mapOverview,
    nonOverlapStrategy: "Reserved anchor spaces with corridor-safe spacing",
    traversalModel: "Legacy authored traversal route",
    layoutRules: [
      "Keep primary spaces readable and non-overlapping.",
      "Stage threats after route comprehension.",
      "Preserve one recovery pocket between pressure beats.",
    ],
    promptSignals: ["legacy-demo", dimension],
    gameplayLoopSummary,
    coreLoop: gameplayLoopSummary.split(", ").slice(0, 4),
    secondaryLoop: ["Reward routing", "Checkpoint resets"],
    progressionLoop: ["Unlock stronger spaces", "Escalate challenge", "Cash out rewards"],
    failStates: ["Pressure spikes", "Poor route planning"],
    levelSequence: [
      { title: "Onboarding", purpose: "Establish the route and fantasy.", challenge: "Low-risk introduction.", reward: "Player confidence." },
      { title: "Escalation", purpose: "Raise pressure with stronger opposition.", challenge: "Sustain performance.", reward: "Momentum." },
      { title: "Capstone", purpose: "Resolve the run with a memorable finish.", challenge: "Execute cleanly.", reward: "Session payoff." },
    ],
    autoIncludedFeatures: [],
    resolvedFeatures,
    supplementalSystems,
    complementarySystems: supplementalSystems.map((system) => system.displayName),
    knowledgeDomains: resolvedFeatures.map((feature) => `${feature} integration`),
    runtimePlan,
    runtimeVersatilityPlan,
    graphicsPlan,
    enginePlan,
    pipelinePlan: {
      targetMinutes: 20,
      parallelTracks: [
        "Legacy profile normalization",
        "Runtime archetype mapping",
        "Asset kit preservation",
      ],
      methodology: [
        "Normalize old projects into the staged generation model.",
        "Lock a runtime archetype before rehydrating the playable slice.",
        "Favor compatibility and prompt fidelity over raw expansion.",
      ],
      phaseBudgets: [
        { name: "normalize", minutes: 4, goal: "Map the legacy profile to the staged schema.", outputs: ["Normalized genre and dimension", "Runtime archetype"] },
        { name: "hydrate", minutes: 8, goal: "Restore the first playable slice and system pack.", outputs: ["Playable runtime", "Supplemental systems"] },
        { name: "verify", minutes: 8, goal: "Check prompt and runtime coherence after migration.", outputs: ["Coherence checks", "Fallback notes"] },
      ],
      qualityGates: [
        "Legacy genre intent remains visible.",
        "Runtime does not fall back to the universal default.",
      ],
      fallbackStrategy: [
        "Prefer the closest matching archetype over a generic combat shell.",
      ],
    },
    promptCouncilPlan,
    candidatePlan,
    evaluationPlan,
    diversityPlan,
    assetPlan,
  }
}

// ── [REMOVED] Demo projects - users start fresh ──────────────

export const _DEPRECATED_DEMO_PROJECTS: UserProject[] = [
  {
    id: "proj_001" as ProjectId,
    name: "Neon Wasteland",
    description: "Cyberpunk battle royale with 100 players, destructible environments, and vehicle combat",
    genre: "battle_royale",
    dimension: "3d",
    engine: "unreal",
    features: ["networking", "combat", "inventory", "world_gen", "physics", "rendering", "audio", "ui"],
    multiplayer: true,
    maxPlayers: 100,
    networkTopology: "distributed_fleet",
    tickRate: 60,
    seed: "neon_wasteland_alpha",
    status: "complete",
    progress: 100,
    createdAt: "2026-03-26T10:00:00Z",
    llmConfiguration: { provider: "local", source: "local" },
    design: createStaticDesignProfile({
      genre: "battle_royale",
      dimension: "3d",
      mapArchetype: "Combat Arena Ring",
      mapOverview: "A legacy combat map with rotating contest spaces and wide-open macro movement.",
      gameplayLoopSummary: "Drop, loot, fight, rotate, and survive the final compression.",
      resolvedFeatures: ["networking", "combat", "inventory", "world_gen", "physics", "rendering", "audio", "ui"],
      supplementalSystems: [
        { name: "map_builder", displayName: "Map Builder", rationale: "Legacy demo support", linesBudget: 1200 },
        { name: "encounter_director", displayName: "Encounter Director", rationale: "Legacy demo support", linesBudget: 1100 },
      ],
    }),
    systems: [
      { name: "combat", displayName: "Combat System", status: "complete", linesGenerated: 2340, engine: "unreal" },
      { name: "networking", displayName: "Networking", status: "complete", linesGenerated: 3120, engine: "unreal" },
      { name: "inventory", displayName: "Inventory", status: "complete", linesGenerated: 1847, engine: "unreal" },
      { name: "world_gen", displayName: "World Gen", status: "complete", linesGenerated: 2890, engine: "unreal" },
      { name: "physics", displayName: "Physics", status: "complete", linesGenerated: 1950, engine: "unreal" },
    ],
    codeFiles: [
      { name: "NexusCombatSystem.h", content: "// Combat system header...", lines: 340 },
      { name: "NexusCombatSystem.cpp", content: "// Combat system impl...", lines: 2000 },
      { name: "NexusNetworking.h", content: "// Networking header...", lines: 280 },
    ],
    assetFiles: [],
  },
  {
    id: "proj_002" as ProjectId,
    name: "Echoes of Eternity",
    description: "Open-world RPG with procedural dungeons, deep crafting, and AI companions",
    genre: "rpg",
    dimension: "3d",
    engine: "unreal",
    features: ["inventory", "combat", "world_gen", "ai_npc", "audio", "ui"],
    multiplayer: false,
    maxPlayers: 1,
    status: "generating",
    progress: 67,
    createdAt: "2026-03-27T14:30:00Z",
    llmConfiguration: { provider: "local", source: "local" },
    design: createStaticDesignProfile({
      genre: "rpg",
      dimension: "3d",
      mapArchetype: "Dungeon Room Graph",
      mapOverview: "A procedural RPG structure built around anchored dungeons and readable exploration loops.",
      gameplayLoopSummary: "Accept goals, explore, solve threats, upgrade, and reopen the world.",
      resolvedFeatures: ["inventory", "combat", "world_gen", "ai_npc", "audio", "ui"],
      supplementalSystems: [
        { name: "map_builder", displayName: "Map Builder", rationale: "Legacy demo support", linesBudget: 1200 },
        { name: "level_flow", displayName: "Level Flow Director", rationale: "Legacy demo support", linesBudget: 1000 },
        { name: "objective_director", displayName: "Objective Director", rationale: "Legacy demo support", linesBudget: 900 },
      ],
    }),
    systems: [
      { name: "inventory", displayName: "Inventory", status: "complete", linesGenerated: 1847, engine: "unreal" },
      { name: "combat", displayName: "Combat", status: "complete", linesGenerated: 2340, engine: "unreal" },
      { name: "world_gen", displayName: "World Gen", status: "complete", linesGenerated: 2890, engine: "unreal" },
      { name: "ai_npc", displayName: "AI & NPC", status: "generating", linesGenerated: 1420, engine: "unreal" },
      { name: "audio", displayName: "Audio", status: "pending", linesGenerated: 0, engine: "unreal" },
      { name: "ui", displayName: "UI", status: "pending", linesGenerated: 0, engine: "unreal" },
    ],
    codeFiles: [],
    assetFiles: [],
  },
  {
    id: "proj_003" as ProjectId,
    name: "Phantom Protocol",
    description: "Tactical FPS with competitive 5v5, ability-based gameplay",
    genre: "fps",
    dimension: "3d",
    engine: "unreal",
    features: ["combat", "networking", "physics", "rendering", "audio"],
    multiplayer: true,
    maxPlayers: 10,
    networkTopology: "client_server",
    tickRate: 60,
    seed: "phantom_protocol_alpha",
    status: "creating",
    progress: 0,
    createdAt: "2026-03-28T09:00:00Z",
    llmConfiguration: { provider: "local", source: "local" },
    design: createStaticDesignProfile({
      genre: "fps",
      dimension: "3d",
      mapArchetype: "Mission Corridor and Hub",
      mapOverview: "A lane-based tactical shooter map with clean encounter pockets and rejoin corridors.",
      gameplayLoopSummary: "Move, acquire targets, clear pressure pockets, then extract or complete the mission.",
      resolvedFeatures: ["combat", "networking", "physics", "rendering", "audio"],
      supplementalSystems: [
        { name: "map_builder", displayName: "Map Builder", rationale: "Legacy demo support", linesBudget: 1200 },
        { name: "game_loop", displayName: "Gameplay Loop Controller", rationale: "Legacy demo support", linesBudget: 1000 },
      ],
    }),
    systems: [],
    codeFiles: [],
    assetFiles: [],
  },
]
