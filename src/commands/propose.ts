import path from 'node:path';
import * as p from '@clack/prompts';
import { adapters } from '../adapters/index.js';
import { readBinding } from '../core/binding.js';
import { listRemotes } from '../core/config.js';
import { projectRole, readManifest, resolveConventions } from '../core/manifest.js';
import { ensureRemoteCache } from '../core/remote-cache.js';
import {
  addPendingProposal,
  buildProposal,
  contributionSourceIdentity,
  contributionTargetIdentity,
  readPendingProposals,
  writePendingProposals,
} from '../core/propose.js';
import { collectProposeCandidates, deriveCanonicalPath } from '../core/propose-candidates.js';
import { validateProposalPath } from '../core/propose-validate.js';
import { selectWithDiffConfirm } from '../core/select-diff.js';
import {
  exitIfMissingFlags,
  isInteractiveStdin,
} from '../core/cli-flags.js';
import { pathExists } from '../core/fs-utils.js';
import type { ArtifactType } from '../core/artifact-types.js';
import { t } from '../locales/index.js';
import { toSlug } from '../adapters/slug.js';

export interface ProposeOptions {
  yes?: boolean;
  remote?: string;
  project?: string;
  type?: string;
  optional?: boolean;
  required?: boolean;
  tool?: string;
}

function hasSelectionFlags(opts: ProposeOptions): boolean {
  return Boolean(
    opts.remote ||
      opts.project ||
      opts.type ||
      opts.tool ||
      opts.optional === true ||
      opts.required === true,
  );
}

function useNonInteractive(opts: ProposeOptions): boolean {
  return !isInteractiveStdin() || Boolean(opts.yes) || hasSelectionFlags(opts);
}

const ARTIFACT_TYPES: ArtifactType[] = ['rule', 'skill', 'agents'];

export async function runPropose(filePath?: string, opts: ProposeOptions = {}): Promise<number> {
  p.intro(t('propose.title'));
  const projectDir = process.cwd();
  const remotes = Object.keys(await listRemotes());
  if (remotes.length === 0) {
    console.error(t('init.noRemotes'));
    return 1;
  }
  const nonInteractive = useNonInteractive(opts);
  if (!filePath && nonInteractive) {
    console.error(t('propose.multiselect.needsInteractive'));
    return 1;
  }
  if (filePath && !(await pathExists(path.resolve(projectDir, filePath)))) {
    console.error(t('propose.fileMissing', { path: filePath }));
    return 1;
  }

  let remote = opts.remote;
  if (!remote && !nonInteractive) {
    const selected = await p.select({
      message: t('propose.prompt.remote'),
      options: remotes.map((alias) => ({ value: alias, label: alias })),
    });
    if (p.isCancel(selected)) {
      console.log(t('common.cancelled'));
      return 1;
    }
    remote = String(selected);
  }
  if (!remote) {
    const missing = exitIfMissingFlags({ '--remote': remote });
    return missing ?? 1;
  }
  if (!remotes.includes(remote)) {
    console.error(t('init.unknownRemote', { alias: remote }));
    return 1;
  }

  const cacheDir = await ensureRemoteCache(remote, { force: true });
  const manifest = await readManifest(cacheDir);
  let project = opts.project;
  if (!project && !nonInteractive) {
    const selected = await p.select({
      message: t('propose.prompt.project'),
      options: manifest.projects.map((item) => ({
        value: item.name,
        label: `${item.name} (${projectRole(item)})`,
      })),
    });
    if (p.isCancel(selected)) {
      console.log(t('common.cancelled'));
      return 1;
    }
    project = String(selected);
  }
  if (!project) {
    const missing = exitIfMissingFlags({ '--project': project });
    return missing ?? 1;
  }
  const resolved = resolveConventions(manifest, project);
  const binding = await readBinding(projectDir);
  const proposals = await readPendingProposals(projectDir);

  if (filePath) {
    const optionalFlag = opts.optional === true || opts.required === true ? 'set' : undefined;
    if (nonInteractive) {
      const missing = exitIfMissingFlags({
        '--type': opts.type,
        '--tool': opts.tool,
        '--optional/--required': optionalFlag,
      });
      if (missing !== null) {
        return missing;
      }
    }
    let type = opts.type as ArtifactType | undefined;
    if (!type && !nonInteractive) {
      const selected = await p.select({
        message: t('propose.prompt.type'),
        options: ARTIFACT_TYPES.map((value) => ({
          value,
          label: t(`artifact.type.${value}` as 'artifact.type.rule'),
        })),
      });
      if (p.isCancel(selected)) {
        console.log(t('common.cancelled'));
        return 1;
      }
      type = selected as ArtifactType;
    }
    if (!ARTIFACT_TYPES.includes(type as ArtifactType)) {
      console.error(t('propose.unknownType', { type: type ?? '' }));
      return 1;
    }
    let tool = opts.tool;
    if (!tool && !nonInteractive) {
      const selected = await p.select({
        message: t('propose.prompt.tool'),
        options: adapters.map((adapter) => ({ value: adapter.id, label: adapter.id })),
      });
      if (p.isCancel(selected)) {
        console.log(t('common.cancelled'));
        return 1;
      }
      tool = String(selected);
    }
    const adapter = adapters.find((item) => item.id === tool);
    if (!adapter) {
      console.error(t('propose.unknownTool', { tool: tool ?? '' }));
      return 1;
    }
    let optional = opts.optional === true;
    if (!optionalFlag && !nonInteractive) {
      const answer = await p.confirm({
        message: t('propose.prompt.optional'),
        initialValue: false,
      });
      if (p.isCancel(answer)) {
        console.log(t('common.cancelled'));
        return 1;
      }
      optional = Boolean(answer);
    }
    const rel = path.relative(projectDir, path.resolve(projectDir, filePath)).replace(/\\/g, '/');
    let sourceFiles = [rel];
    let canonicalContent = '';
    let slug = toSlug(rel);
    if (adapter.discoverExisting) {
      const discovered = (await adapter.discoverExisting(projectDir)).find((item) =>
        item.sourceFiles.map((source) => source.replace(/\\/g, '/')).includes(rel),
      );
      if (discovered) {
        sourceFiles = discovered.sourceFiles;
        canonicalContent = adapter.parseExisting(discovered.files).canonicalContent;
        slug = discovered.slug;
      }
    }
    if (!canonicalContent) {
      const content = await import('node:fs/promises').then((fs) =>
        fs.readFile(path.join(projectDir, rel), 'utf8'),
      );
      canonicalContent = adapter.parseExisting([{ path: rel, content }]).canonicalContent;
    }
    const canonicalPath = deriveCanonicalPath(type!, slug, resolved.conventions);
    const validation = validateProposalPath(canonicalPath, type!, resolved.conventions);
    if (!validation.ok || !canonicalContent.trim()) {
      console.error(
        t('propose.pathInvalid', {
          path: canonicalPath,
          type: type!,
          expected: validation.expected ?? '',
        }),
      );
      return 1;
    }
    try {
      await addPendingProposal(
        projectDir,
        buildProposal(
          sourceFiles,
          remote,
          project,
          projectRole(resolved.project),
          type!,
          canonicalPath,
          optional,
          tool!,
          slug,
        ),
      );
    } catch (error) {
      console.error(t('common.error', { message: (error as Error).message }));
      return 1;
    }
    console.log(t('propose.success', { path: canonicalPath }));
    p.outro(t('common.done'));
    return 0;
  }

  const summary = await collectProposeCandidates(
    projectDir,
    adapters,
    binding,
    proposals,
    { remote, project: resolved.project, conventions: resolved.conventions },
    cacheDir,
  );
  if (summary.candidates.length === 0) {
    console.log(t('propose.multiselect.none'));
    return 0;
  }
  console.log(
    t('propose.multiselect.excluded', {
      provenance: summary.excluded.provenance,
      binding: summary.excluded.linkedBinding,
      target: summary.excluded.otherTarget,
      conflict: summary.excluded.conflict,
    }),
  );
  for (const conflict of summary.conflicts) {
    console.error(
      t('propose.multiselect.conflict', {
        path: conflict.canonicalPath,
        tools: conflict.tools.join(', '),
      }),
    );
  }
  const tracked = summary.candidates.filter((item) => item.tracked);
  const result = await selectWithDiffConfirm({
    message: t('propose.multiselect.prompt'),
    items: summary.candidates.map((candidate) => ({
      value: contributionSourceIdentity(candidate),
      label: `${candidate.canonicalPath} [${candidate.status}]`,
      hint: `${candidate.tool}: ${candidate.sourceFiles.join(', ')}`,
    })),
    installed: tracked.map(contributionSourceIdentity),
  });
  if (!result) {
    console.log(t('common.cancelled'));
    return 1;
  }
  const currentTarget = `${remote}\u0000${project}`;
  const kept = proposals.filter(
    (proposal) =>
      contributionTargetIdentity(proposal) !== currentTarget ||
      !result.removed.includes(contributionSourceIdentity(proposal)),
  );
  for (const identity of result.added) {
    const candidate = summary.candidates.find(
      (item) => contributionSourceIdentity(item) === identity,
    );
    if (!candidate) {
      continue;
    }
    kept.push(
      buildProposal(
        candidate.sourceFiles,
        remote,
        project,
        projectRole(resolved.project),
        candidate.type,
        candidate.canonicalPath,
        candidate.optional,
        candidate.tool,
        candidate.sourceId,
      ),
    );
  }
  await writePendingProposals(projectDir, kept);
  console.log(
    t('propose.multiselect.done', {
      added: result.added.length,
      removed: result.removed.length,
    }),
  );
  p.outro(t('common.done'));
  return 0;
}
