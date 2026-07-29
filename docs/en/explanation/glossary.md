# Glossary

Core terms used throughout the docs. Each links to where the concept is used in depth.

| Term | Meaning |
|------|---------|
| **Template repo** | An ordinary Git repository with a `.imwel/manifest.yaml` that lists one or more *projects* and their Artifacts. There is no special server — see [Architecture](../explanation/architecture.md#git-is-the-database). |
| **Artifact** | A unit of shared content: a **rule** (agents.md-flavored Markdown), a **skill** (a `SKILL.md` bundle), or **agents** instructions. See [Manifest → discovery](../reference/manifest.md#how-artifacts-are-discovered). |
| **Project** | A named, installable unit inside a template repo (`name` + `path` in the manifest). With `role: project` it is a **writable project** a consumer can edit and push back; a consumer directory binds at most one. See [Manifest → project roles](../reference/manifest.md#project-roles-modules-vs-projects). |
| **Module** | A project declared `role: shared`: a reusable, **read-only** unit (e.g. a language/framework standards pack) a consumer installs and keeps in sync but does not push local edits back to. Install any number alongside one writable project. See [Manifest → project roles](../reference/manifest.md#project-roles-modules-vs-projects). |
| **Binding** | A consumer directory's `.imwel/binding.yaml` linking it to one remote template repo — at most one writable project plus any number of read-only modules. Bindings are per-directory, not per-repo — see [Architecture → bindings](../explanation/architecture.md#bindings-are-per-directory). |
| **Adapter** | A per-tool renderer (Cursor, Claude Code, Codex, …) that writes Artifacts into that tool's native format and reads them back. See [Adapters](../how-to/add-adapter.md). |
| **Convention** | The manifest's directory/file names (`rulesDir`, `skillsDir`, `agentsFile`) used to discover Artifacts, with per-project overrides. See [Manifest → conventions](../reference/manifest.md#conventions). |
| **Overlay** | A small YAML frontmatter block on a rule (`description` / `globs` / `alwaysApply`) that imwel translates into each tool's native metadata at render time. See [Rule metadata overlay](../reference/manifest.md#rule-metadata-overlay). |
| **Drift** | Divergence between the remote template, your last sync, and your on-disk files — detected via Git. See [Sync, drift & rollback](../how-to/sync-and-drift.md). |
| **History repo** | A real, hidden Git repo under `.imwel/history/` that records installed states for diff, rollback, and three-way merge. See [Architecture → history](../explanation/architecture.md#local-history-repo). |
| **Draft** | An AI-generated rule/skill written to `.imwel/drafts/` (by `imwel-extract`) for human review before adoption. See [Draft rules from your codebase](../how-to/draft-rules-from-codebase.md). |

## Next

- Consumer workflow → [Consume for Cursor](../how-to/consume-for-cursor.md)
- Author workflow → [Create a template repo](../how-to/create-template-repo.md)
- The model behind these terms → [Architecture](../explanation/architecture.md)
