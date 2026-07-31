# How to draft rules from a codebase

Want a cold-start set of AI coding rules based on what this repo actually looks like — then review before anything becomes team canon?

**What you get:** a deterministic fingerprint (`imwel scan`), AI-assisted drafts in `.imwel/drafts/`, and a path to local adopt or template harvest. No silent promotion to managed Artifacts.

## Prerequisites

- [Install imwel](./install.md)
- An AI coding tool where you can run slash commands (after `imwel skill install`), or willingness to edit draft Markdown by hand

## Steps

### 1. Fingerprint (terminal)

```bash
cd your-app
imwel scan
```

Writes `.imwel/fingerprint.yaml` (languages, configs, where existing tool rules live; optional Git history overlay).

### 2. Install first-party skills (once)

```bash
imwel skill install
```

### 3. Extract drafts (in-tool)

In Cursor (or another supported tool), run `/imwel-extract` and follow the skill. Drafts land under `.imwel/drafts/<box>/`.

> For the full in-tool workflow (`/imwel-extract` → `/imwel-adopt` → `/imwel-audit` → `/imwel-create-template`) with minimal examples and combination patterns, see [Use first-party skills](./use-first-party-skills.md).

### 4. Review, then adopt locally

```bash
imwel adopt --from <box>
```

See [Adopt existing rules](./adopt-existing-rules.md).

### 5. Optional — harvest into a template

```bash
imwel template init --from-project --dir ./my-templates
```

Then lint, commit, and publish with plain Git ([Lint and publish](./lint-and-publish.md)).

## Expected result

- Fingerprint file exists
- Draft box contains reviewable Markdown
- Adopted files appear in tool paths as **unmanaged** content until you put them in a template

## Troubleshooting

| Problem | Fix |
|---------|-----|
| No slash commands | Re-run `imwel skill install --tools cursor` (or your tool id). |
| Scan history is `none` | Shallow or tiny Git history — fingerprint still works without the overlay. |

## Related

- [Adopt existing rules](./adopt-existing-rules.md)
- [In-tool skills](../reference/in-tool-skills.md)
- [Commands — scan / adopt](../reference/commands.md)
