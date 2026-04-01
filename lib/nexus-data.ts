// NEXUS-116 Mock Data — mirrors the real backend structures

export type EngineStatus = "idle" | "running" | "stopping"
export type Phase = "L0_context" | "L1_research" | "L2_training" | "L3_generation"

export interface EngineState {
  status: EngineStatus
  currentPhase: Phase | ""
  currentTask: string
  cycleCount: number
  levelsEnabled: Record<string, boolean>
  research: {
    domainsDone: number
    domainsTotal: number
    linksFound: number
    current: string
  }
  training: {
    domainsDone: number
    domainsTotal: number
    epoch: string
    lastCheckpoint: string
    current: string
  }
  generation: {
    systemsDone: number
    systemsTotal: number
    current: string
  }
  startedAt: string
  lastActivity: string
}

export interface Agent {
  name: string
  displayName: string
  icon: string
  status: "idle" | "running" | "done"
  description: string
  expertise: string[]
  lastTask: string
  lastDuration: number
  outputChars: number
}

export interface ResearchDomain {
  name: string
  displayName: string
  links: number
  threshold: number
  status: "pending" | "active" | "complete"
  lastUpdated: string
}

export interface TrainingDomain {
  name: string
  displayName: string
  epoch: number
  totalEpochs: number
  pairs: number
  quality: number
  status: "pending" | "training" | "complete"
}

export interface GenerationSystem {
  name: string
  displayName: string
  status: "pending" | "generating" | "optimizing" | "complete"
  linesGenerated: number
  engine: string
}

export interface BrainWorkItem {
  id: string
  category: "implement" | "fix" | "improve" | "research" | "test"
  priority: number
  title: string
  targetFile: string
  status: "pending" | "running" | "done" | "failed"
}

export const INITIAL_ENGINE_STATE: EngineState = {
  status: "running",
  currentPhase: "L1_research",
  currentTask: "Researching: rendering_graphics",
  cycleCount: 7,
  levelsEnabled: {
    L0_context: true,
    L1_research: true,
    L2_training: true,
    L3_generation: true,
    L4_meta_loop: true,
  },
  research: { domainsDone: 9, domainsTotal: 14, linksFound: 247, current: "rendering_graphics" },
  training: { domainsDone: 6, domainsTotal: 13, epoch: "2/3", lastCheckpoint: "checkpoint_physics_simulation_epoch2", current: "physics_simulation" },
  generation: { systemsDone: 5, systemsTotal: 9, current: "ai_npc" },
  startedAt: "2026-03-27T14:30:00Z",
  lastActivity: "2026-03-28T03:42:15Z",
}

export const AGENTS: Agent[] = [
  { name: "architect", displayName: "Chief Architect", icon: "building", status: "idle", description: "Designs ECS, scene graphs, memory architecture, threading models, asset pipelines, plugin systems", expertise: ["ECS", "Scene Graphs", "Memory", "Threading", "Asset Pipeline", "Plugins"], lastTask: "Design full game architecture", lastDuration: 34.2, outputChars: 28400 },
  { name: "renderer", displayName: "Rendering Engineer", icon: "monitor", status: "running", description: "Vulkan/D3D12 RHI, PBR pipeline, GI (Lumen-style), Nanite-style mesh, post-processing, shadows", expertise: ["Vulkan/D3D12", "PBR", "Global Illumination", "Mesh Shaders", "Post Processing", "Shadows"], lastTask: "Implement PBR + IBL pipeline", lastDuration: 67.1, outputChars: 42100 },
  { name: "network", displayName: "Networking Engineer", icon: "wifi", status: "idle", description: "Client prediction, server authority, replication, rollback netcode, MMO networking, anti-cheat", expertise: ["Client-Server", "Replication", "Rollback", "MMO", "Voice Chat", "Anti-Cheat"], lastTask: "Build replication system", lastDuration: 45.8, outputChars: 35600 },
  { name: "physics", displayName: "Physics Engineer", icon: "orbit", status: "idle", description: "Rigid body dynamics, GJK/EPA collision, constraint solving, soft body, destruction, vehicles", expertise: ["Rigid Body", "Collision", "Constraints", "Soft Body", "Destruction", "Vehicles"], lastTask: "Implement Jolt-style physics", lastDuration: 52.3, outputChars: 38900 },
  { name: "gameplay", displayName: "Gameplay Systems", icon: "gamepad-2", status: "idle", description: "Inventory, combat, progression, quests, AI/NPC behavior trees, ability systems, save/load", expertise: ["Inventory", "Combat", "Quests", "AI/NPC", "Abilities", "Save System"], lastTask: "Build GAS-like ability system", lastDuration: 41.6, outputChars: 31200 },
  { name: "audio", displayName: "Audio Engineer", icon: "volume-2", status: "idle", description: "HRTF spatial audio, DSP pipeline, adaptive music, procedural audio, voice management", expertise: ["Spatial Audio", "DSP", "Adaptive Music", "Procedural", "Voice Mgmt"], lastTask: "Implement HRTF spatial system", lastDuration: 38.4, outputChars: 26800 },
  { name: "procedural", displayName: "Procedural Generation", icon: "mountain", status: "idle", description: "Noise functions, terrain erosion, WFC, L-systems, dungeon gen, city gen, infinite worlds", expertise: ["Noise/Terrain", "WFC", "L-Systems", "Dungeons", "Cities", "Infinite Worlds"], lastTask: "Terrain with hydraulic erosion", lastDuration: 55.9, outputChars: 40200 },
  { name: "optimizer", displayName: "Performance Optimizer", icon: "zap", status: "idle", description: "SIMD vectorization, GPU occupancy, memory pools, lock-free structures, profiling, streaming", expertise: ["SIMD", "GPU Opt", "Memory", "Lock-Free", "Profiling", "Streaming"], lastTask: "Full optimization pass", lastDuration: 29.7, outputChars: 22100 },
  { name: "tooling", displayName: "Tools & Pipeline", icon: "wrench", status: "idle", description: "Editor architecture, asset pipeline, build system, debugging tools, scripting integration", expertise: ["Editor", "Asset Pipeline", "Build System", "Debug Tools", "Scripting"], lastTask: "ImGui editor scaffold", lastDuration: 33.1, outputChars: 24500 },
]

export const RESEARCH_DOMAINS: ResearchDomain[] = [
  { name: "engine_architecture", displayName: "Engine Architecture", links: 32, threshold: 20, status: "complete", lastUpdated: "2026-03-27T21:30:00Z" },
  { name: "rendering_graphics", displayName: "Rendering & Graphics", links: 14, threshold: 20, status: "active", lastUpdated: "2026-03-28T03:42:00Z" },
  { name: "procedural_generation", displayName: "Procedural Generation", links: 28, threshold: 20, status: "complete", lastUpdated: "2026-03-27T20:15:00Z" },
  { name: "multiplayer_networking", displayName: "Multiplayer Networking", links: 22, threshold: 20, status: "complete", lastUpdated: "2026-03-27T19:45:00Z" },
  { name: "ai_game_agents", displayName: "AI & Game Agents", links: 25, threshold: 20, status: "complete", lastUpdated: "2026-03-27T18:30:00Z" },
  { name: "physics_simulation", displayName: "Physics Simulation", links: 21, threshold: 20, status: "complete", lastUpdated: "2026-03-27T17:00:00Z" },
  { name: "asset_pipeline", displayName: "Asset Pipeline", links: 19, threshold: 20, status: "complete", lastUpdated: "2026-03-27T22:00:00Z" },
  { name: "audio_engine", displayName: "Audio Engine", links: 18, threshold: 20, status: "complete", lastUpdated: "2026-03-27T16:30:00Z" },
  { name: "ui_framework", displayName: "UI Framework", links: 15, threshold: 20, status: "complete", lastUpdated: "2026-03-27T15:45:00Z" },
  { name: "optimization", displayName: "Optimization", links: 24, threshold: 20, status: "complete", lastUpdated: "2026-03-27T21:00:00Z" },
  { name: "llm_finetuning", displayName: "LLM Fine-tuning", links: 8, threshold: 20, status: "pending", lastUpdated: "2026-03-27T14:30:00Z" },
  { name: "ai_code_generation", displayName: "AI Code Generation", links: 6, threshold: 20, status: "pending", lastUpdated: "2026-03-27T14:30:00Z" },
  { name: "unreal_cpp", displayName: "Unreal C++", links: 11, threshold: 20, status: "pending", lastUpdated: "2026-03-27T14:30:00Z" },
  { name: "unreal_blueprints", displayName: "Unreal Blueprints", links: 4, threshold: 20, status: "pending", lastUpdated: "2026-03-27T14:30:00Z" },
]

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

export const BRAIN_WORK_QUEUE: BrainWorkItem[] = [
  { id: "a1b2c3", category: "implement", priority: 1, title: "Implement Vulkan RHI abstraction layer", targetFile: "core/rhi/vulkan_rhi.cpp", status: "done" },
  { id: "d4e5f6", category: "implement", priority: 1, title: "Build ECS archetype storage system", targetFile: "core/ecs/archetype.cpp", status: "done" },
  { id: "g7h8i9", category: "implement", priority: 2, title: "Add GJK + EPA narrow-phase collision", targetFile: "physics/collision/gjk.cpp", status: "running" },
  { id: "j1k2l3", category: "improve", priority: 2, title: "Optimize scene graph dirty flag propagation", targetFile: "core/scene/scene_graph.cpp", status: "pending" },
  { id: "m4n5o6", category: "implement", priority: 1, title: "Client-side prediction with reconciliation", targetFile: "networking/prediction.cpp", status: "pending" },
  { id: "p7q8r9", category: "fix", priority: 3, title: "Fix shadow acne in cascaded shadow maps", targetFile: "rendering/shadows/csm.cpp", status: "pending" },
  { id: "s1t2u3", category: "implement", priority: 2, title: "Behavior tree parallel node execution", targetFile: "ai/behavior_tree/parallel.cpp", status: "pending" },
  { id: "v4w5x6", category: "research", priority: 3, title: "Study Nanite cluster DAG for virtual geometry", targetFile: "research/nanite_analysis.md", status: "pending" },
  { id: "y7z8a1", category: "implement", priority: 1, title: "HRTF binaural audio rendering", targetFile: "audio/spatial/hrtf.cpp", status: "pending" },
  { id: "b2c3d4", category: "test", priority: 4, title: "Stress test replication with 100 clients", targetFile: "tests/networking/replication_stress.cpp", status: "pending" },
]

export const OPEN_SOURCE_ENGINES = [
  { name: "Godot", stars: "107K", contributors: 2800, absorbed: ["Scene system", "GDExtension", "Signals", "2D Renderer", "Single-binary deploy"] },
  { name: "O3DE", stars: "8.2K", contributors: 450, absorbed: ["Atom Renderer", "Gem Plugins", "Multiplayer Framework", "Override System"] },
  { name: "Bevy", stars: "38K", contributors: 1200, absorbed: ["ECS Scheduler", "Change Detection", "Plugin Architecture", "Hot-Reload", "Rendering"] },
  { name: "Fyrox", stars: "8.4K", contributors: 85, absorbed: ["Scene Graph", "Animation FSM", "Navmesh Baking", "Sound System (HRTF)"] },
  { name: "Flax", stars: "6.4K", contributors: 120, absorbed: ["GI Implementation", "Virtual Texturing", "Foliage Instancing", "Material Editor", "C# Hot-Reload"] },
  { name: "Stride", stars: "7.2K", contributors: 95, absorbed: ["Render Graph", "VR Pipeline", "Near-Native Performance", "Asset Compilation"] },
]

export const STANDALONE_LIBS = [
  { name: "Jolt Physics", category: "Physics", description: "Horizon Forbidden West physics" },
  { name: "Rapier", category: "Physics", description: "Rust physics for Bevy" },
  { name: "Bullet3", category: "Physics", description: "Classic physics engine" },
  { name: "Google Filament", category: "Rendering", description: "Mobile PBR renderer" },
  { name: "bgfx", category: "Rendering", description: "Cross-platform rendering" },
  { name: "wgpu", category: "Rendering", description: "Rust WebGPU implementation" },
  { name: "The Forge", category: "Rendering", description: "Cross-platform renderer" },
  { name: "GameNetworkingSockets", category: "Networking", description: "Valve's networking" },
  { name: "yojimbo", category: "Networking", description: "Netcode library" },
  { name: "ENet", category: "Networking", description: "Reliable UDP networking" },
  { name: "SoLoud", category: "Audio", description: "Easy audio engine" },
  { name: "Steam Audio", category: "Audio", description: "Spatial audio SDK" },
  { name: "RecastNavigation", category: "AI", description: "Navigation mesh" },
  { name: "BehaviorTree.CPP", category: "AI", description: "BT framework" },
  { name: "FastNoiseLite", category: "Procedural", description: "Noise generation" },
]

export const SCENE_TREE = [
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
      { id: "physics", name: "PhysicsWorld", type: "system", children: [] },
      { id: "audio", name: "AudioEngine", type: "system", children: [] },
      { id: "network", name: "NetworkManager", type: "system", children: [] },
      { id: "render", name: "RenderPipeline", type: "system", children: [] },
    ]},
  ]},
]
