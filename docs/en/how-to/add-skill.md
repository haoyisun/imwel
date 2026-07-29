# How to add a skill

Want a reusable agent skill (SKILL.md bundle) in the template so consumers get it in each tool’s skills directory?

**What you get:** a skill folder under the project’s `skillsDir`, optionally listed as `optional` in the manifest so installers can opt in.

## Prerequisites

- Template repo with `.imwel/manifest.yaml`
- Familiarity with Cursor / agentskills.io `SKILL.md` (`name` + triggerable `description` in YAML frontmatter)

## Steps

### 1. Create the skill bundle

```bash
mkdir -p example-project/skills/review-pr
```

```bash
cat > example-project/skills/review-pr/SKILL.md <<'EOF'
---
name: review-pr
description: Use when reviewing a pull request for risk, missing tests, and API compatibility.
---

# Review PR

1. Summarize the change.
2. List risks and missing tests.
3. Suggest concrete follow-ups.
EOF
```

Add extra files next to `SKILL.md` if the skill needs them; they ship with the bundle.

### 2. Register in the manifest (if optional or new layout)

If the skill should be **optional** at install time, list it under the project:

```yaml
projects:
  - name: example-project
    path: example-project
    role: project
    optional:
      - skills/review-pr
```

Skills not listed in `optional` are required and install by default.

### 3. Lint

```bash
imwel lint
```

### 4. Commit via branch + PR

```bash
git checkout -b add-review-pr-skill
git add example-project/skills/review-pr .imwel/manifest.yaml
git commit -m "add review-pr skill"
git push -u origin HEAD
```

## Expected result

- Lint passes
- After consumer `init` / `sync`, paths like `.cursor/skills/review-pr/SKILL.md` or `.claude/skills/review-pr/SKILL.md` appear (depending on selected tools)

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Lint: skill without `SKILL.md` | Every skill folder needs `SKILL.md` at its root. |
| Weak `description` warning | Write when-to-use language an agent can trigger on — not a vague label. |
| Skill missing after sync | Confirm it was selected (optional skills can be skipped); re-run `imwel init` / `imwel modules` as needed. |

## Related

- [Add a rule](./add-rule.md)
- [Lint and publish](./lint-and-publish.md)
- [Manifest](../reference/manifest.md)
