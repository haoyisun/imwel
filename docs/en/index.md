# imwel

Git-native CLI for distributing AI coding rules, skills, and agent instructions — **no backend, no database, no hosted platform**.

One template repo. Many AI tools. Sync like code; push back through a normal PR.

## Start here

In about five minutes you can scaffold a local template and see rules land in Cursor or Claude Code’s native paths.

**[Quick Start (5 min) →](./tutorials/quick-start.md)**

## What do you want to do?

| I want to… | Go to |
|------------|--------|
| Install Node / Git / the CLI | [Install](./how-to/install.md) |
| Draft rules/skills from an existing codebase | [Draft rules from a codebase](./how-to/draft-rules-from-codebase.md) |
| Try reviewed drafts in my AI tools | [Adopt existing rules](./how-to/adopt-existing-rules.md) |
| Publish rules for the team | [Create a template repo](./how-to/create-template-repo.md) |
| Use a team template in Cursor | [Consume for Cursor](./how-to/consume-for-cursor.md) |
| Use a team template in Claude Code | [Consume for Claude Code](./how-to/consume-for-claude-code.md) |
| Send local edits upstream via PR | [Push via PR](./how-to/push-via-pr.md) |
| Use imwel's built-in skills (extract / adopt / audit / create-template) | [Use first-party skills](./how-to/use-first-party-skills.md) |
| Register or configure template remotes | [Manage remotes](./how-to/manage-remotes.md) |
| Run imwel in CI (lint / auto-sync) | [Use in CI](./how-to/use-in-ci.md) |
| Understand author vs consumer | [Author vs consumer](./explanation/author-vs-consumer.md) |

## Reference

| Page | Contents |
|------|----------|
| [Commands](./reference/commands.md) | Full CLI flags |
| [Manifest](./reference/manifest.md) | `.imwel/manifest.yaml` |
| [Binding](./reference/binding.md) | `.imwel/binding.yaml` & `pending-proposals.yaml` |
| [Supported tools](./reference/supported-tools.md) | Adapter list and typical paths |
| [Architecture](./explanation/architecture.md) | Git-as-database, safety defaults |
| [Glossary](./explanation/glossary.md) | Template repo, Artifact, Binding, Drift, … |

Repository [README](https://github.com/haoyisun/imwel) · [Contributing](https://github.com/haoyisun/imwel/blob/main/CONTRIBUTING.md)
