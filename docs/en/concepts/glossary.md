# Glossary

Core terms used throughout the docs. Each links to where the concept is used in depth.

| Term | Meaning |
|------|---------|
| **Template repo** | An ordinary Git repository with a `.imwel/manifest.yaml` that lists one or more *projects* and their Artifacts. There is no special server — see [Architecture](../guide/architecture.md#git-is-the-database). |
| **Artifact** | A unit of shared content: a **rule** (agents.md-flavored Markdown), a **skill** (a `SKILL.md` bundle), or **agents** instructions. See [Manifest → discovery](../guide/manifest.md#how-artifacts-are-discovered). |
| **Project** | A named, installable unit inside a template repo (`name` + `path` in the manifest). One consumer directory binds to one project. See [Manifest → projects](../guide/manifest.md#projects). |
| **Binding** | A consumer directory's `.imwel/binding.yaml` linking it to one project in one remote template repo. Bindings are per-directory, not per-repo — see [Architecture → bindings](../guide/architecture.md#bindings-are-per-directory). |
| **Adapter** | A per-tool renderer (Cursor, Claude Code, Codex, …) that writes Artifacts into that tool's native format and reads them back. See [Adapters](../contribute/adapters.md). |
| **Convention** | The manifest's directory/file names (`rulesDir`, `skillsDir`, `agentsFile`) used to discover Artifacts, with per-project overrides. See [Manifest → conventions](../guide/manifest.md#conventions). |
| **Overlay** | A small YAML frontmatter block on a rule (`description` / `globs` / `alwaysApply`) that imwel translates into each tool's native metadata at render time. See [Rule metadata overlay](../guide/manifest.md#rule-metadata-overlay). |
| **Drift** | Divergence between the remote template, your last sync, and your on-disk files — detected via Git. See [Sync, drift & rollback](../consume/sync-and-drift.md). |
| **History repo** | A real, hidden Git repo under `.imwel/history/` that records installed states for diff, rollback, and three-way merge. See [Architecture → history](../guide/architecture.md#local-history-repo). |
| **Draft** | An AI-generated rule/skill written to `.imwel/drafts/` (by `imwel-extract`) for human review before adoption. See [Draft rules from your codebase](../author/from-codebase.md). |

## Next

- Consumer workflow → [Install a template](../consume/quickstart.md)
- Author workflow → [Author a template](../author/quickstart.md)
- The model behind these terms → [Architecture](../guide/architecture.md)
