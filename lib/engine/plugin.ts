
import type {
  ProjectGenerationExecutionStageRun,
  UserProject,
} from "@/lib/engine/types"

export interface GenerationPlugin {
  id: string
  label: string
  priority: number
  execute: (
    project: UserProject
  ) => Promise<ProjectGenerationExecutionStageRun>
}

export class PluginRegistry {
  private plugins: GenerationPlugin[] = []

  register(plugin: GenerationPlugin): void {
    if (this.plugins.find((p) => p.id === plugin.id)) {
      console.warn(`Plugin with id ${plugin.id} is already registered.`)
      return
    }
    this.plugins.push(plugin)
  }

  getPlugins(): GenerationPlugin[] {
    return [...this.plugins].sort((a, b) => a.priority - b.priority)
  }
}

export const pluginRegistry = new PluginRegistry()
