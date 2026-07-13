import { execa } from 'execa';

export const MIN_GIT_VERSION = '2.30.0';

export interface GitRunOptions {
  cwd?: string;
  gitDir?: string;
  workTree?: string;
  env?: NodeJS.ProcessEnv;
}

function gitArgs(options?: GitRunOptions): string[] {
  const args: string[] = [];
  if (options?.gitDir) {
    args.push('--git-dir', options.gitDir);
  }
  if (options?.workTree) {
    args.push('--work-tree', options.workTree);
  }
  return args;
}

export async function runGit(
  args: string[],
  options?: GitRunOptions,
): Promise<{ stdout: string; stderr: string }> {
  const prefix = gitArgs(options);
  const result = await execa('git', [...prefix, ...args], {
    cwd: options?.cwd,
    env: options?.env,
    reject: false,
  });
  if (result.exitCode !== 0) {
    const message = result.stderr || result.stdout || `git ${args.join(' ')} failed`;
    throw new Error(message.trim());
  }
  return { stdout: result.stdout, stderr: result.stderr };
}

function parseVersion(version: string): number[] {
  return version.split('.').map((part) => Number.parseInt(part, 10) || 0);
}

export function compareVersions(a: string, b: string): number {
  const av = parseVersion(a);
  const bv = parseVersion(b);
  const len = Math.max(av.length, bv.length);
  for (let i = 0; i < len; i += 1) {
    const diff = (av[i] ?? 0) - (bv[i] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}

export async function getGitVersion(): Promise<string> {
  const { stdout } = await runGit(['--version']);
  const match = stdout.match(/git version (\d+\.\d+\.\d+)/i);
  if (!match?.[1]) {
    throw new Error('Unable to parse git version');
  }
  return match[1];
}

export async function assertGitVersion(minVersion = MIN_GIT_VERSION): Promise<string> {
  const version = await getGitVersion();
  if (compareVersions(version, minVersion) < 0) {
    throw new Error(`Git ${minVersion} or newer is required (found ${version})`);
  }
  return version;
}

export interface NameStatusEntry {
  status: string;
  path: string;
  oldPath?: string;
}

export async function diffNameStatus(
  fromRef: string,
  toRef: string,
  options?: GitRunOptions & { paths?: string[] },
): Promise<NameStatusEntry[]> {
  const args = ['diff', '--name-status', fromRef, toRef];
  if (options?.paths?.length) {
    args.push('--', ...options.paths);
  }
  const { stdout } = await runGit(args, options);
  if (!stdout.trim()) {
    return [];
  }
  return stdout
    .trim()
    .split('\n')
    .map((line) => {
      const parts = line.split('\t');
      const status = parts[0] ?? '';
      if (status.startsWith('R') || status.startsWith('C')) {
        return {
          status,
          oldPath: parts[1],
          path: parts[2] ?? parts[1] ?? '',
        };
      }
      return {
        status,
        path: parts[1] ?? '',
      };
    });
}

export async function showFileAtCommit(
  commit: string,
  filePath: string,
  options?: GitRunOptions,
): Promise<string | null> {
  try {
    const { stdout } = await runGit(['show', `${commit}:${filePath}`], options);
    return stdout;
  } catch {
    return null;
  }
}

export async function hashObject(content: string, options?: GitRunOptions): Promise<string> {
  const { stdout } = await execa(
    'git',
    [...gitArgs(options), 'hash-object', '--stdin', '-w'],
    {
      cwd: options?.cwd,
      input: content,
    },
  );
  return stdout.trim();
}

export async function mergeFile(
  currentPath: string,
  basePath: string,
  otherPath: string,
  options?: GitRunOptions,
): Promise<number> {
  const result = await execa(
    'git',
    [...gitArgs(options), 'merge-file', currentPath, basePath, otherPath],
    { cwd: options?.cwd, reject: false },
  );
  return result.exitCode ?? 1;
}

export function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n');
}
