import picocolors from 'picocolors';

type SemanticColor = 'cyan' | 'green' | 'yellow' | 'red';
type OutputTarget = 'stdout' | 'stderr';

export interface OutputOptions {
  target?: OutputTarget;
}

function format(icon: string, text: string, isTTY: boolean | undefined, color: SemanticColor): string {
  const colors = picocolors.createColors(Boolean(isTTY) && !Object.hasOwn(process.env, 'NO_COLOR'));
  return colors[color](`${icon} ${text}`);
}

export function info(text: string): void {
  console.log(format('→', text, process.stdout.isTTY, 'cyan'));
}

export function success(text: string): void {
  console.log(format('✔', text, process.stdout.isTTY, 'green'));
}

export function warn(text: string, options: OutputOptions = {}): void {
  if (options.target === 'stdout') {
    console.log(format('⚠', text, process.stdout.isTTY, 'yellow'));
    return;
  }
  console.warn(format('⚠', text, process.stderr.isTTY, 'yellow'));
}

export function error(text: string, options: OutputOptions = {}): void {
  if (options.target === 'stdout') {
    console.log(format('✖', text, process.stdout.isTTY, 'red'));
    return;
  }
  console.error(format('✖', text, process.stderr.isTTY, 'red'));
}
