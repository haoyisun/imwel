# /imwel-lint

Thin wrapper: validate the current imwel template repository.

## Steps

1. From the workspace root (or the detected template root), run:

   ```bash
   imwel lint
   ```

   For CI-style strictness:

   ```bash
   imwel lint --strict
   ```

2. If the CLI reports wrong context (consumer / neither / ambiguous), show the message and stop — do not invent a fake clean result.
3. Summarize errors vs warnings for the user and suggest concrete fixes (manifest paths, missing `SKILL.md`, triggerable skill descriptions).
