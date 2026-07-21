# imwel

Git-native CLI for distributing AI coding rules, skills, and agent instructions — **no backend, no database, no hosted platform**.

Template repositories are ordinary Git repos. imwel binds a local project directory to one project inside a remote template repo, renders Artifacts into tool-native formats (Cursor, Claude Code, …), detects drift with Git, and proposes upstream changes via branch + PR/MR. New to the terms? See the [Glossary](./concepts/glossary.md).

## 30-second quickstart

```bash
# Consume a team's rules:
imwel remote add git@github.com:example/imwel-templates.git   # alias derived from the URL
cd your-project
imwel init && imwel sync
```

Install globally when you want a persistent binary: `npm install -g @culock/imwel` (the command stays `imwel`). Or run once with `npx @culock/imwel@latest <command>`.

## Choose your path

imwel has two distinct lifecycles. Pick the one that matches your role — each is an ordered, step-by-step track:

| I want to… | Start here |
|------------|-----------|
| **Use** a team's rules in my AI tools | [Consumer path → Install a template](./consume/quickstart.md) |
| **Publish** rules for others to consume | [Author path → Author a template](./author/quickstart.md) |

Prefer a single-screen overview first? See the [Quick walkthrough](./guide/usage.md) (both lanes, minimal commands).

## Reference & concepts

| Page | What you will find |
|------|--------------------|
| [Commands](./guide/commands.md) | Full CLI reference (`doctor`, `lint`, `init`, `sync`, `push`, …) |
| [Manifest](./guide/manifest.md) | `.imwel/manifest.yaml` fields, conventions, rule metadata overlay |
| [Architecture](./guide/architecture.md) | Git as the database, per-directory bindings, history repo, safety defaults |
| [Glossary](./concepts/glossary.md) | Core terms: Template repo, Artifact, Binding, Adapter, Drift, … |
| [Adapters](./contribute/adapters.md) | How to add a render target via upstream PR (not a plugin system) |

## Next

- New consumer? → [Install a template](./consume/quickstart.md)
- New author? → [Author a template](./author/quickstart.md)
- Repository [README](https://github.com/haoyisun/imwel) · [Contributing](https://github.com/haoyisun/imwel/blob/main/CONTRIBUTING.md) · [Security](https://github.com/haoyisun/imwel/blob/main/SECURITY.md)
