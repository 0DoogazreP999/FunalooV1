import { pluginRegistry } from "@/lib/engine/plugin"
import type { UserProject, ProjectWorkspaceFile } from "@/lib/engine/types"

class KnowledgeExtractionPlugin {
  id = "knowledge-extraction"
  label = "Knowledge Extraction"
  priority = 300

  async execute(project: UserProject): Promise<ProjectWorkspaceFile[]> {
    const knowledgeByAgent = {}

    for (const codeFile of project.codeFiles) {
      const match = codeFile.content.match(/\/\/ INSIGHT_BLOCK_START\n([\s\S]*?)\/\/ INSIGHT_BLOCK_END/)
      if (match && match[1]) {
        try {
          const insight = JSON.parse(match[1])
          const agent = insight.agent || 'unknown';
          if (!knowledgeByAgent[agent]) {
            knowledgeByAgent[agent] = {
                design_patterns: [],
                key_decisions: [],
                reusable_components: [],
                optimization_notes: [],
            };
          }
          knowledgeByAgent[agent].design_patterns.push(...(insight.design_patterns || []))
          knowledgeByAgent[agent].key_decisions.push(...(insight.key_decisions || []))
          knowledgeByAgent[agent].reusable_components.push(...(insight.reusable_components || []))
          knowledgeByAgent[agent].optimization_notes.push(...(insight.optimization_notes || []))
        } catch (e) {
          console.error(`Error parsing insight block in ${codeFile.name}:`, e)
        }
      }
    }

    const knowledgeFile: ProjectWorkspaceFile = {
      name: "knowledge.json",
      content: JSON.stringify(knowledgeByAgent, null, 2),
      lines: 0,
    }

    return [knowledgeFile]
  }
}

pluginRegistry.register(new KnowledgeExtractionPlugin())