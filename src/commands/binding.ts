import {
  buildBindingInspection,
  type BindingInspectionView,
} from '../core/binding-inspection.js';
import { t } from '../locales/index.js';

export interface BindingShowOptions {
  details?: boolean;
  json?: boolean;
}

function formatBinding(view: BindingInspectionView, details: boolean): string[] {
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
  if (!details) {
    return lines;
  }
  let hasMissing = false;
  for (const artifact of binding.managedArtifacts) {
    lines.push(
      t('binding.artifact', {
        path: artifact.canonicalPath,
        type: artifact.type,
        requirement: artifact.requirement,
        role: artifact.role,
        project: artifact.project,
      }),
    );
    for (const installed of artifact.installedPaths) {
      hasMissing ||= installed.status === 'missing';
      lines.push(
        t('binding.installedPath', {
          tool: installed.tool,
          path: installed.path,
          status: installed.status,
        }),
      );
    }
  }
  if (hasMissing) {
    lines.push(t('binding.syncHint'));
  }
  return lines;
}

function formatContribution(view: BindingInspectionView, details: boolean): string[] {
  const lines = [t('binding.section.contribution')];
  if (!view.contributionTracking) {
    lines.push(t('binding.contribution.none'));
    return lines;
  }
  const tracking = view.contributionTracking;
  lines.push(t('binding.contribution.explanation'));
  lines.push(t('binding.contributionCount', { count: tracking.count }));
  if (!details) {
    return lines;
  }
  let hasMissing = false;
  for (const record of tracking.records) {
    lines.push(
      t('binding.contribution', {
        path: record.canonicalPath,
        type: record.type,
        requirement: record.requirement,
        status: record.status,
        remote: record.target.remoteAlias,
        project: record.target.project,
        role: record.role,
      }),
    );
    lines.push(t('binding.contributionTool', { tool: record.tool }));
    for (const source of record.sourceFiles) {
      hasMissing ||= source.status === 'missing';
      lines.push(
        t('binding.contributionSource', {
          path: source.path,
          status: source.status,
        }),
      );
    }
    if (record.latestPush) {
      lines.push(
        t('binding.contributionPush', {
          branch: record.latestPush.branch,
          commit: record.latestPush.commit,
        }),
      );
    }
  }
  if (hasMissing) {
    lines.push(t('binding.proposeHint'));
  }
  return lines;
}

export function formatBindingInspection(
  view: BindingInspectionView,
  details = false,
): string {
  return [...formatBinding(view, details), '', ...formatContribution(view, details)].join('\n');
}

export async function runBindingShow(
  options: BindingShowOptions = {},
  projectDir = process.cwd(),
): Promise<number> {
  const view = await buildBindingInspection(projectDir);
  if (options.json) {
    console.log(JSON.stringify(view, null, 2));
    return 0;
  }
  if (!view.binding && !view.contributionTracking) {
    console.log(t('binding.noState'));
    return 0;
  }
  console.log(formatBindingInspection(view, Boolean(options.details)));
  return 0;
}
