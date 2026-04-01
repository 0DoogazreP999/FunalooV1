import { pluginRegistry } from "@/lib/engine/plugin"
import type { UserProject, ProjectWorkspaceFile } from "@/lib/engine/types"

class ProceduralGenerationPlugin {
  id = "procedural-generation"
  label = "Procedural Generation"
  priority = 200

  async execute(project: UserProject): Promise<ProjectWorkspaceFile[]> {
    const newCodeFiles: ProjectWorkspaceFile[] = []

    // For each asset file that is a content module, create a new code file
    for (const assetFile of project.assetFiles) {
      if (assetFile.name.endsWith(".json")) {
        const codeFile: ProjectWorkspaceFile = {
          name: assetFile.name.replace(".json", ""),
          content: JSON.parse(assetFile.content).content,
          lines: 0,
        }
        newCodeFiles.push(codeFile)
      }
    }

    return newCodeFiles
  }
}

pluginRegistry.register(new ProceduralGenerationPlugin())