# How to add a rule

Want a new coding rule in the shared template so every consumer’s AI tool gets the same constraint?

**What you get:** a canonical rule (agents.md-flavored Markdown + optional overlay) that imwel can render to Cursor `.mdc`, Claude Code `CLAUDE.md` blocks, and other adapters.

## Prerequisites

- You are inside a **template repository** (`.imwel/manifest.yaml` present)
- You know the project `path` from the manifest (e.g. `example-project`)

## Steps

### 1. Read the manifest

```bash
cat .imwel/manifest.yaml
```

Confirm `conventions.rulesDir` (default `rules`) and the target project’s `path`.

### 2. Add the rule file

Create `<project-path>/<rulesDir>/<name>.md`. Example:

```bash
# from the template repo root
cat > example-project/rules/no-silent-catch.md <<'EOF'
---
description: Use when editing error handling — prefer explicit handling over empty catch blocks.
# globs: ["**/*.{ts,js}"]
# alwaysApply: false
---

# No silent catch

- Do not leave empty `catch` blocks.
- Log or rethrow with context.
EOF
```

The YAML frontmatter is an optional **overlay**. imwel strips it from the canonical body and maps `description` / `globs` / `alwaysApply` into each tool’s native metadata at render time.

### 3. Lint

```bash
imwel lint
```

### 4. Commit on a branch and open a PR (author path)

```bash
git checkout -b add-no-silent-catch
git add example-project/rules/no-silent-catch.md
git commit -m "add no-silent-catch rule"
git push -u origin HEAD
```

Open a PR/MR on your Git host.

### 5. Preview on a consumer (optional)

In a bound consumer project after the PR is merged (or against your local template remote):

```bash
imwel sync
```

## Expected result

- `imwel lint` accepts the new file
- After sync, consumers see it under their tool paths (e.g. `.cursor/rules/no-silent-catch.mdc`)

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Lint: empty / placeholder rule | Put real guidance in the body; one-line stubs fail the quality bar. |
| Rule not offered at init | Path must sit under the project’s `rulesDir`; check `path` in the manifest. |
| Overlay ignored | Keep frontmatter at the top; unknown keys may not map — stick to `description`, `globs`, `alwaysApply`. |

## Related

- [Add a skill](./add-skill.md)
- [Consume for Cursor](./consume-for-cursor.md)
- [Manifest](../reference/manifest.md)
