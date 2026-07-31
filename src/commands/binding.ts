import {
  buildBindingInspection,
  type BindingInspection,
  type BindingInspectionView,
  type ContributionInspection,
  type ManagedArtifactInspection,
} from '../core/binding-inspection.js';
import type { ArtifactType } from '../core/artifact-types.js';
import { info, warn } from '../core/cli-output.js';
import { t } from '../locales/index.js';

export interface BindingShowOptions {
  json?: boolean;
}

const TYPE_ORDER: ArtifactType[] = ['rule', 'skill', 'agents'];
const TYPE_LOCALE_KEYS = {
  rule: 'binding.enum.type.rule',
  skill: 'binding.enum.type.skill',
  agents: 'binding.enum.type.agents',
} as const;
const REQUIREMENT_LOCALE_KEYS = {
  required: 'binding.enum.requirement.required',
  optional: 'binding.enum.requirement.optional',
} as const;
const CONTRIBUTION_STATUS_LOCALE_KEYS = {
  pending: 'binding.enum.status.pending',
  pushed: 'binding.enum.status.pushed',
  clean: 'binding.enum.status.clean',
  modified: 'binding.enum.status.modified',
  missing: 'binding.enum.status.missing',
} as const;
const CONTRIBUTION_ROLE_LOCALE_KEYS = {
  project: 'binding.enum.role.project',
  shared: 'binding.enum.role.shared',
} as const;

function formatArtifactType(type: ArtifactType): string {
  return t(TYPE_LOCALE_KEYS[type]);
}

function formatRequirement(requirement: 'required' | 'optional'): string {
  return t(REQUIREMENT_LOCALE_KEYS[requirement]);
}

function formatContributionStatus(status: ContributionInspection['status']): string {
  return t(CONTRIBUTION_STATUS_LOCALE_KEYS[status]);
}

function formatContributionRole(role: ContributionInspection['role']): string {
  return t(CONTRIBUTION_ROLE_LOCALE_KEYS[role]);
}

function formatInstalledTools(artifact: ManagedArtifactInspection): string {
  const tools = new Map<string, boolean>();
  for (const installed of artifact.installedPaths) {
    tools.set(installed.tool, (tools.get(installed.tool) ?? false) || installed.status === 'missing');
  }
  return [...tools.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([tool, missing]) =>
      missing ? `${tool} ${t('binding.enum.missing')}` : tool,
    )
    .join(', ');
}

function projectGroupLabel(binding: BindingInspection, project: string): string {
  if (project === binding.linkedProject) {
    return t('binding.projectGroup.linked', { project });
  }
  const module = binding.modules.find((candidate) => candidate.name === project);
  return module?.frozen
    ? t('binding.projectGroup.subscribedFrozen', { project })
    : t('binding.projectGroup.subscribed', { project });
}

function formatArtifactGroups(binding: BindingInspection): string[] {
  const lines: string[] = [];
  const projects = [...new Set(binding.managedArtifacts.map((artifact) => artifact.project))].sort(
    (left, right) => {
      if (left === binding.linkedProject) return -1;
      if (right === binding.linkedProject) return 1;
      return left.localeCompare(right);
    },
  );
  for (const project of projects) {
    lines.push(t('binding.tree.project', { label: projectGroupLabel(binding, project) }));
    const projectArtifacts = binding.managedArtifacts.filter(
      (artifact) => artifact.project === project,
    );
    const presentTypes = TYPE_ORDER.filter((type) =>
      projectArtifacts.some((artifact) => artifact.type === type),
    );
    presentTypes.forEach((type, typeIndex) => {
      const typeIsLast = typeIndex === presentTypes.length - 1;
      lines.push(
        t('binding.tree.type', {
          branch: typeIsLast ? '└─' : '├─',
          type: formatArtifactType(type),
        }),
      );
      const artifacts = projectArtifacts
        .filter((artifact) => artifact.type === type)
        .sort((left, right) => left.canonicalPath.localeCompare(right.canonicalPath));
      artifacts.forEach((artifact, artifactIndex) => {
        lines.push(
          t('binding.tree.artifact', {
            indent: typeIsLast ? '   ' : '│  ',
            branch: artifactIndex === artifacts.length - 1 ? '└─' : '├─',
            path: artifact.canonicalPath,
            type: formatArtifactType(artifact.type),
            requirement: formatRequirement(artifact.requirement),
            tools: formatInstalledTools(artifact),
          }),
        );
      });
    });
  }
  return lines;
}

function formatBinding(view: BindingInspectionView): string[] {
  const lines = [t('binding.section.binding')];
  if (!view.binding) {
    lines.push(t('binding.none'));
    return lines;
  }
  const binding = view.binding;
  lines.push(t('binding.remote', { remote: binding.remoteAlias, branch: binding.branch }));
  lines.push(
    binding.linkedProject
      ? t('binding.linkedProject', { project: binding.linkedProject })
      : t('binding.linkedProject.none'),
  );
  lines.push(
    binding.modules.length > 0
      ? t('binding.modules', {
          modules: binding.modules
            .slice()
            .sort((left, right) => left.name.localeCompare(right.name))
            .map((module) =>
              module.frozen ? t('binding.moduleFrozen', { name: module.name }) : module.name,
            )
            .join(', '),
        })
      : t('binding.modules.none'),
  );
  lines.push(t('binding.tools', { tools: binding.tools.join(', ') }));
  lines.push(t('binding.syncRemote', { sha: binding.sync.remoteCommit || '-' }));
  lines.push(t('binding.syncHistory', { sha: binding.sync.historyCommit || '-' }));
  lines.push(t('binding.artifactCount', { count: binding.managedArtifactCount }));
  lines.push(...formatArtifactGroups(binding));
  return lines;
}

function contributionGroupKey(record: ContributionInspection): string {
  return `${record.target.remoteAlias}/${record.target.project}`;
}

function formatContributionGroups(records: ContributionInspection[]): string[] {
  const lines: string[] = [];
  const targets = [...new Set(records.map(contributionGroupKey))].sort();
  for (const target of targets) {
    lines.push(t('binding.tree.target', { target }));
    const targetRecords = records.filter((record) => contributionGroupKey(record) === target);
    const presentTypes = TYPE_ORDER.filter((type) =>
      targetRecords.some((record) => record.type === type),
    );
    presentTypes.forEach((type, typeIndex) => {
      const typeIsLast = typeIndex === presentTypes.length - 1;
      lines.push(
        t('binding.tree.type', {
          branch: typeIsLast ? '└─' : '├─',
          type: formatArtifactType(type),
        }),
      );
      const typedRecords = targetRecords
        .filter((record) => record.type === type)
        .sort((left, right) => left.canonicalPath.localeCompare(right.canonicalPath));
      typedRecords.forEach((record, recordIndex) => {
        const recordIsLast = recordIndex === typedRecords.length - 1;
        const typeIndent = typeIsLast ? '   ' : '│  ';
        lines.push(
          t('binding.tree.contribution', {
            indent: typeIndent,
            branch: recordIsLast ? '└─' : '├─',
            path: record.canonicalPath,
            type: formatArtifactType(record.type),
            requirement: formatRequirement(record.requirement),
            tool: record.tool,
            status: formatContributionStatus(record.status),
            role: formatContributionRole(record.role),
          }),
        );
        const details = [
          ...record.sourceFiles.map((source) =>
            t('binding.tree.contributionSource', {
              path: source.path,
              missing: source.status === 'missing' ? ` ${t('binding.enum.missing')}` : '',
            }),
          ),
          ...(record.latestPush
            ? [
                t('binding.tree.contributionPush', {
                  branch: record.latestPush.branch,
                  commit: record.latestPush.commit,
                }),
              ]
            : []),
        ];
        const recordIndent = recordIsLast ? '   ' : '│  ';
        details.forEach((detail, detailIndex) => {
          lines.push(
            t('binding.tree.detail', {
              indent: `${typeIndent}${recordIndent}`,
              branch: detailIndex === details.length - 1 ? '└─' : '├─',
              detail,
            }),
          );
        });
      });
    });
  }
  return lines;
}

function formatContribution(view: BindingInspectionView): string[] {
  const lines = [t('binding.section.contribution')];
  if (!view.contributionTracking) {
    lines.push(t('binding.contribution.none'));
    return lines;
  }
  const tracking = view.contributionTracking;
  lines.push(t('binding.contribution.explanation'));
  lines.push(t('binding.contributionCount', { count: tracking.count }));
  lines.push(...formatContributionGroups(tracking.records));
  return lines;
}

export function formatBindingInspection(view: BindingInspectionView): string {
  return [...formatBinding(view), '', ...formatContribution(view)].join('\n');
}

export function emitBindingWarnings(view: BindingInspectionView): void {
  const missingInstalledPaths =
    view.binding?.managedArtifacts.reduce(
      (count, artifact) =>
        count + artifact.installedPaths.filter((installed) => installed.status === 'missing').length,
      0,
    ) ?? 0;
  if (missingInstalledPaths > 0) {
    warn(
      t(
        missingInstalledPaths === 1
          ? 'binding.missingArtifacts.one'
          : 'binding.missingArtifacts.many',
        { count: missingInstalledPaths },
      ),
      { target: 'stdout' },
    );
  }
  const missingSources =
    view.contributionTracking?.records.reduce(
      (count, record) =>
        count + record.sourceFiles.filter((source) => source.status === 'missing').length,
      0,
    ) ?? 0;
  if (missingSources > 0) {
    warn(
      t(
        missingSources === 1
          ? 'binding.missingContributions.one'
          : 'binding.missingContributions.many',
        { count: missingSources },
      ),
      { target: 'stdout' },
    );
  }
}

export async function runBindingShow(
  options: BindingShowOptions = {},
  projectDir = process.cwd(),
): Promise<number> {
  const view = await buildBindingInspection(projectDir);
  if (options.json) {
    process.stdout.write(`${JSON.stringify(view, null, 2)}\n`);
    return 0;
  }
  if (!view.binding && !view.contributionTracking) {
    info(t('binding.noState'));
    return 0;
  }
  info(formatBindingInspection(view));
  emitBindingWarnings(view);
  return 0;
}
