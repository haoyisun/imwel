# Install & prerequisites

> **Getting started** — Shared by both the [Consumer path](../consume/quickstart.md) and the [Author path](../author/quickstart.md).

## Prerequisites

You need **Node.js ≥ 18.18** and the system **`git`** binary on your `PATH`. imwel shells out to your existing `git` (SSH keys, credential helpers, and `.gitconfig` all work as usual).

## Install

```bash
# One-off, no install:
npx @culock/imwel@latest <command>

# Or install globally (the command stays `imwel`):
npm install -g @culock/imwel
```

## Verify

```bash
imwel doctor   # checks git + environment prerequisites
```

Run `imwel doctor` first on a new machine or if anything looks off — it reports missing prerequisites with a concrete next step (e.g. "no `git` binary found on PATH — install Git and re-run").

## Next

- Consuming a team's rules? → [Install a template](../consume/quickstart.md)
- Publishing your own rules? → [Author a template](../author/quickstart.md)
- Want the minimal command sequences side by side? → [Quick walkthrough](../guide/usage.md)
