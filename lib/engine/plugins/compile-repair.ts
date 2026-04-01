import { pluginRegistry } from "@/lib/engine/plugin";
import type { UserProject, ProjectWorkspaceFile } from "@/lib/engine/types";

class CompileRepairPlugin {
  id = "compile-repair";
  label = "Compile Repair";
  priority = 500;

  async execute(project: UserProject): Promise<ProjectWorkspaceFile[]> {
    // This is a placeholder.
    return [];
  }
}

pluginRegistry.register(new CompileRepairPlugin());
