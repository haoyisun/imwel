import { execa } from 'execa';

export type HostCli = 'gh' | 'glab' | null;

export async function detectHostCli(): Promise<HostCli> {
  for (const cli of ['gh', 'glab'] as const) {
    const which = await execa(cli, ['--version'], { reject: false });
    if (which.exitCode === 0) {
      const auth = await execa(cli, ['auth', 'status'], { reject: false });
      if (auth.exitCode === 0) {
        return cli;
      }
    }
  }
  return null;
}

export async function createRemoteRepo(
  cli: HostCli,
  name: string,
  visibility: 'public' | 'private' = 'private',
): Promise<string | null> {
  if (!cli) {
    return null;
  }
  if (cli === 'gh') {
    const result = await execa(
      'gh',
      ['repo', 'create', name, `--${visibility}`, '--source=.', '--remote=origin'],
      { reject: false },
    );
    if (result.exitCode !== 0) {
      return null;
    }
    const url = await execa('gh', ['repo', 'view', '--json', 'url', '-q', '.url'], { reject: false });
    return url.exitCode === 0 ? url.stdout.trim() : null;
  }
  const result = await execa('glab', ['repo', 'create', name, `--visibility=${visibility}`], {
    reject: false,
  });
  return result.exitCode === 0 ? result.stdout.trim() : null;
}

export async function createPullRequest(
  cli: HostCli,
  title: string,
  body: string,
  base: string,
  head: string,
): Promise<string | null> {
  if (!cli) {
    return null;
  }
  if (cli === 'gh') {
    const result = await execa(
      'gh',
      ['pr', 'create', '--title', title, '--body', body, '--base', base, '--head', head],
      { reject: false },
    );
    return result.exitCode === 0 ? result.stdout.trim() : null;
  }
  const result = await execa(
    'glab',
    ['mr', 'create', '--title', title, '--description', body, '--target-branch', base, '--source-branch', head],
    { reject: false },
  );
  return result.exitCode === 0 ? result.stdout.trim() : null;
}
