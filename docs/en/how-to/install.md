# How to install imwel

Want a working `imwel` (or `npx`) on this machine before anything else?

**What you get:** a CLI that can scaffold templates, bind projects, and render Artifacts — with no account, no hosted service.

## Prerequisites

- Node.js ≥ 18.18
- System `git` on your `PATH` (SSH keys and credential helpers work as usual)

## Steps

### Option A — one-off (no global install)

```bash
npx @culock/imwel@latest doctor
```

### Option B — global install

```bash
npm install -g @culock/imwel
imwel doctor
```

The installed command name stays `imwel`.

## Expected result

`imwel doctor` (or the `npx` form) reports that Git and environment checks pass, or tells you exactly what to fix.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `imwel: command not found` after global install | Ensure npm’s global bin dir is on `PATH` (Windows: often `%AppData%\npm`). Or use `npx @culock/imwel@latest …`. |
| `no git binary found on PATH` | Install Git, reopen the terminal, re-run `imwel doctor`. |
| Wrong Node version | Upgrade to Node ≥ 18.18 (`node -v`). |

## Related

- First win in five minutes → [Quick Start](../tutorials/quick-start.md)
- Flag reference → [Commands](../reference/commands.md)
