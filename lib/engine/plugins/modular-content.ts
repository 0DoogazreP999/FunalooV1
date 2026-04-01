import { pluginRegistry } from "@/lib/engine/plugin"
import type { UserProject, ProjectWorkspaceFile } from "@/lib/engine/types"

class ModularContentPlugin {
  id = "modular-content"
  label = "Modular Content"
  priority = 100

  async execute(project: UserProject): Promise<ProjectWorkspaceFile[]> {
    const newAssetFiles: ProjectWorkspaceFile[] = []

    // For each code file, create a corresponding asset file
    for (const codeFile of project.codeFiles) {
      const assetFile: ProjectWorkspaceFile = {
        name: `${codeFile.name}.json`,
        content: JSON.stringify(codeFile, null, 2),
        lines: 0,
      }
      newAssetFiles.push(assetFile)
    }

    return newAssetFiles
  }
}

pluginRegistry.register(new ModularContentPlugin())