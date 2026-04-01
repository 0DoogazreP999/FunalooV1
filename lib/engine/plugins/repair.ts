import { pluginRegistry } from "@/lib/engine/plugin";
import type { UserProject, ProjectWorkspaceFile } from "@/lib/engine/types";

class RepairPlugin {
  id = "repair";
  label = "Repair";
  priority = 600;

  async execute(project: UserProject): Promise<ProjectWorkspaceFile[]> {
    // This is a placeholder.
    return [];
  }
}

pluginRegistry.register(new RepairPlugin());
