import { pluginRegistry } from "@/lib/engine/plugin";
import type { UserProject, ProjectWorkspaceFile } from "@/lib/engine/types";

class PromptLockPlugin {
  id = "prompt-lock";
  label = "Prompt Lock";
  priority = 100;

  async execute(project: UserProject): Promise<ProjectWorkspaceFile[]> {
    // This is a placeholder.
    return [];
  }
}

pluginRegistry.register(new PromptLockPlugin());
