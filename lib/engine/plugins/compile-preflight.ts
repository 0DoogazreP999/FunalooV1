import { pluginRegistry } from "@/lib/engine/plugin";
import type { UserProject, ProjectWorkspaceFile } from "@/lib/engine/types";

class CompilePreflightPlugin {
  id = "compile-preflight";
  label = "Compile Preflight";
  priority = 400;

  async execute(project: UserProject): Promise<ProjectWorkspaceFile[]> {
    // This is a placeholder.
    return [];
  }
}

pluginRegistry.register(new CompilePreflightPlugin());
