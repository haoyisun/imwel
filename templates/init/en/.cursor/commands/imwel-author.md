# /imwel-author

Primary imwel authoring entrypoint for Cursor.

## Steps

1. Detect repository context from the current workspace (walk up for `.imwel/`):
   - **template** — `.imwel/manifest.yaml` with `projects`, no `binding.yaml`
   - **consumer** — `.imwel/binding.yaml`, no `manifest.yaml`
   - **neither** — no markers
   - **ambiguous** — both `manifest.yaml` and `binding.yaml` in the same `.imwel/`
2. Tell the user the detected kind and the root path used. **Never** silently apply the wrong pack.
3. Branch on result:
   - **template** → load skill `imwel-template-author` and help with the user's task (new/edit rule or skill, manifest change, lint, PR notes).
   - **consumer** → load skill `imwel-consumer` and help with sync/status/drift/propose/push. Do not edit a template `manifest.yaml` here.
   - **neither** → explain next steps: run `imwel template init` to create a template repo, or `imwel init` to bind a consumer project, or open the correct repo root.
   - **ambiguous** → explain the conflict; ask the user to remove the misplaced file (usually delete consumer `binding.yaml` from a template root, or open the intended directory).
4. After structural edits in a template repo, run `imwel lint` (shell) and fix reported errors before finishing.
