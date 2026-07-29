# How to adopt reviewed draft rules

Want drafts from `/imwel-extract` (or a draft box under `.imwel/drafts/`) written into your AI tools so you can try them locally?

**What you get:** rendered tool-native files from a reviewed draft box. These writes are **unmanaged** — not tracked by `sync` / `status` / `push` until you move content into a real template workflow.

## Prerequisites

- A draft box produced by the extract workflow (see [Draft rules from a codebase](./draft-rules-from-codebase.md))
- Target tools installed / detectable in the project directory

## Steps

### 1. Review the draft box

Open `.imwel/drafts/<box>/` and edit until you trust the content.

### 2. Adopt into tools

```bash
imwel adopt --from <box>
```

Follow prompts (or pass tool flags as documented in [Commands](../reference/commands.md)).

### 3. Decide the long-term home

- Keep iterating locally, then harvest into a template with `imwel template init --from-project`, **or**
- Copy accepted Artifacts into an existing template repo and open a normal PR

## Expected result

- Tool-native rule/skill files exist on disk from the draft box
- `imwel status` does not treat them as managed template Artifacts

## Troubleshooting

| Problem | Fix |
|---------|-----|
| No draft box | Run `imwel scan` + extract flow first. |
| Thought adopt would replace sync | Adopt is for drafts/local activation — ongoing team distribution still uses template + `init` / `sync`. |

## Related

- [Draft rules from a codebase](./draft-rules-from-codebase.md)
- [Create a template repo](./create-template-repo.md)
- [In-tool skills](../reference/in-tool-skills.md)
