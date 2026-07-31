# How to use imwel's built-in skills

Have imwel installed but want the AI itself to draft, activate, audit, and package your rules — instead of running CLI steps by hand?

**What you get:** four first-party skills you invoke *inside* your AI tool (`/imwel-extract`, `/imwel-adopt`, `/imwel-audit`, `/imwel-create-template`) that compose into a full draft → activate → audit → publish loop. Each writes to an isolated review folder; nothing becomes the team's shared standard until you say so.

## Prerequisites

- [Install imwel](./install.md)
- Install the command pack **once** (skills only, unmanaged):

```bash
imwel skill install
```

- A supported tool where skills surface as `/` commands (Cursor, Claude Code). In other tools they still match by `description`.

## The four skills at a glance

| Skill | Use when | What it writes | Managed? |
|-------|----------|----------------|----------|
| `/imwel-extract` | A project has few or no rules and you want a project-fit starting set | `.imwel/drafts/<box>/` | No (drafts for review) |
| `/imwel-adopt` | You reviewed a draft box and want those rules live in your tools now | Tool-native paths (`.cursor/rules/*`, …) | No (unmanaged) |
| `/imwel-audit` | You already have rules but suspect they've drifted from the code | `.imwel/audit/` | No (advisory findings) |
| `/imwel-create-template` | Local rules stabilized and you want to publish them for the team | A new template repo skeleton | No (skeleton for you to organize) |

All four only ever write to isolated review folders or unmanaged tool paths — they never touch your binding, `.imwel/history/`, or the remote template until you explicitly run `sync` / `push`.

---

## 1. `/imwel-extract` — draft rules from your codebase

**Use this when** a project has few or no AI coding rules and you want a project-fit starting set, drafted from what the repo actually looks like — not a generic template.

It ensures a fingerprint (runs `imwel scan` itself if `.imwel/fingerprint.yaml` is missing), reads the key files the fingerprint points to, and drafts rules/skills into a **named draft box**.

**Invoke it** in your AI tool's chat:

```
/imwel-extract
```

**Minimal output** — a named, timestamped draft box so repeated runs never overwrite each other:

```
.imwel/drafts/
└── node-cli-20260731-1042/
    ├── rules/
    │   ├── error-handling.md
    │   └── testing.md
    └── skills/
        └── review-pr/SKILL.md
```

The skill ends with a three-part handoff: the box location, a review prompt, and the next step (`imwel adopt --from <box>`). You stay in control — drafts are not active until you adopt them.

---

## 2. `/imwel-adopt` — activate a reviewed draft box

**Use this when** you've reviewed (and edited) a draft box and want those rules rendered into your AI tools' native locations so they're active right now.

It is a thin wrapper around `imwel adopt --from <box>`: it locates draft boxes, runs the command, and explains the health-gate / conflict results. It never renders or rewrites drafts itself.

**Invoke it** after review:

```
/imwel-adopt
```

Or the equivalent CLI (useful in CI or scripts):

```bash
imwel adopt --from .imwel/drafts/node-cli-20260731-1042
```

**Minimal result** — files land in each tool's native path, ready to steer the AI:

```
.cursor/rules/error-handling.mdc
.cursor/rules/testing.mdc
.claude/rules/error-handling.md
```

**Why this matters:** rendered files are **unmanaged** — not written to the binding, not committed to `.imwel/history/`, never tracked by `status` / `sync` / `push`. So trying drafts locally is risk-free; your team template stays untouched until you choose to package it.

---

## 3. `/imwel-audit` — audit existing rules for drift

**Use this when** you already have rules (managed or hand-written) but suspect they've drifted from the code — a rule references a deleted file, two rules contradict each other, or a new pattern has no rule at all.

It reads your current rules plus the fingerprint-pointed code and writes actionable findings to `.imwel/audit/`. Explicit invocation only — it never hooks your AI tool's session.

**Invoke it:**

```
/imwel-audit
```

**Minimal finding file** (`.imwel/audit/20260731-1055.md`) — three finding types:

```markdown
## rule ↔ code mismatch
- `rules/error-handling.md` says "wrap all async routes in try/catch", but
  `src/routes/users.ts` exports a raw async handler.

## rule ↔ rule conflict
- `rules/testing.md` requires Vitest; `skills/review-pr/SKILL.md` references Jest.

## missing rules
- No rule covers the new `src/db/migrations/` directory (detected via fingerprint).
```

### How it differs from `imwel status`

| Check | Where | What it catches |
|-------|-------|------------------|
| `imwel status` rule health | Deterministic, no LLM | `empty`, `dead-import`, `orphan-ref` (syntax/path) |
| `/imwel-audit` | Semantic, LLM-assisted | rule↔code mismatch, rule↔rule conflict, missing rules (meaning) |

Run `imwel status` for cheap, always-on syntax checks; run `/imwel-audit` when you need a deeper, semantic pass.

---

## 4. `/imwel-create-template` — turn this repo's rules into a shareable template

**Use this when** your local rules have stabilized (drafted, adopted, iterated) and you want to publish them as a template repo the whole team can `imwel init` from.

It runs `imwel template init --from-project` (harvesting **only your own** `USER` artifacts — it excludes imwel's own command pack and other tools' installed artifacts), then guides the **semantic** organization: splitting projects, assigning roles, writing manifest/README.

**Invoke it:**

```
/imwel-create-template
```

**Minimal skeleton** it produces (into a unique dir so repeated runs don't collide):

```
.imwel/generated-templates/<topic>-20260731-1100/
├── .imwel/manifest.yaml
├── rules/
├── skills/
├── agents.md
└── .cursor/commands/imwel-author.md
```

**Why the split:** the CLI stops at the deterministic skeleton; the skill handles the judgment calls (which rules belong to which project, what's a shared module vs a writable project, the README that explains it). Validate with `imwel lint` in the generated dir; publishing stays plain `git`.

---

## Combining them — the loop

The four skills are designed to chain. Pick the pattern that matches where you are:

### A. Cold start (no rules yet)

```
imwel scan
  → /imwel-extract          # drafts into .imwel/drafts/<box>/
  → review the box
  → /imwel-adopt            # renders into your tools — LOCAL ACTIVATION
```

### B. Audit existing rules

```
/imwel-audit               # writes .imwel/audit/ findings
  → fix rules (or /imwel-extract to fill gaps)
  → /imwel-adopt            # re-render the corrected batch
```

### C. Local iteration

```
/imwel-adopt                # try a draft batch
  → use the rules in real work
  → tweak, /imwel-adopt again
  → when stable, move to D
```

### D. Publish back

Two routes depending on where the canonical home should be:

```
# New shareable template repo:
/imwel-create-template     # → imwel lint → git push

# Or feed an existing remote:
imwel propose <file>       # register contribution tracking
imwel push                 # branch + PR by default
```

## Expected result

- Drafts, audits, and skeletons live in isolated `.imwel/` subfolders — reviewable, never auto-promoted
- Adopted rules are active in your tools but stay **unmanaged** until you package or propose them
- The team template repo is touched only through your explicit `git push` / `imwel push`

## Troubleshooting

| Problem | Fix |
|---------|-----|
| No `/imwel-*` slash commands | Re-run `imwel skill install --tools cursor` (or your tool id). |
| `/imwel-extract` says fingerprint missing | It auto-runs `imwel scan`; if that fails, run `imwel scan` manually and re-invoke. |
| `/imwel-adopt` refused with health issues | Open the reported draft files, fix empty/dead-import/orphan-ref, then re-invoke. |
| `/imwel-create-template` excluded my files | It harvests only `USER` artifacts; imwel's own pack and other tools' installs are excluded by design — edit those in their source instead. |

## Related

- [In-tool skills (reference)](../reference/in-tool-skills.md)
- [Draft rules from a codebase (CLI view)](./draft-rules-from-codebase.md)
- [Adopt existing rules (CLI view)](./adopt-existing-rules.md)
- [Create a template repo (CLI view)](./create-template-repo.md)
- [Commands — scan / adopt / skill](../reference/commands.md)
