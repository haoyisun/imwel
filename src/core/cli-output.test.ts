import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { error, info, success, warn } from './cli-output.js';

const originalNoColor = process.env.NO_COLOR;
const hadNoColor = Object.hasOwn(process.env, 'NO_COLOR');
const stdoutIsTTY = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
const stderrIsTTY = Object.getOwnPropertyDescriptor(process.stderr, 'isTTY');
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

function setTTY(stdout: boolean, stderr: boolean): void {
  Object.defineProperty(process.stdout, 'isTTY', { configurable: true, value: stdout });
  Object.defineProperty(process.stderr, 'isTTY', { configurable: true, value: stderr });
}

function captureConsole(): {
  stdout: string[];
  warnings: string[];
  errors: string[];
} {
  const output = { stdout: [] as string[], warnings: [] as string[], errors: [] as string[] };
  console.log = (...args: unknown[]) => output.stdout.push(args.map(String).join(' '));
  console.warn = (...args: unknown[]) => output.warnings.push(args.map(String).join(' '));
  console.error = (...args: unknown[]) => output.errors.push(args.map(String).join(' '));
  return output;
}

afterEach(() => {
  if (hadNoColor) {
    process.env.NO_COLOR = originalNoColor;
  } else {
    delete process.env.NO_COLOR;
  }
  if (stdoutIsTTY) {
    Object.defineProperty(process.stdout, 'isTTY', stdoutIsTTY);
  } else {
    Reflect.deleteProperty(process.stdout, 'isTTY');
  }
  if (stderrIsTTY) {
    Object.defineProperty(process.stderr, 'isTTY', stderrIsTTY);
  } else {
    Reflect.deleteProperty(process.stderr, 'isTTY');
  }
  console.log = originalLog;
  console.warn = originalWarn;
  console.error = originalError;
});

describe('CLI output', () => {
  it('writes colored info and success messages to stdout in a TTY', () => {
    delete process.env.NO_COLOR;
    setTTY(true, true);
    const output = captureConsole();

    info('Next step');
    success('Done');

    assert.match(output.stdout[0] ?? '', /^\x1b\[36m→ Next step\x1b\[39m$/);
    assert.match(output.stdout[1] ?? '', /^\x1b\[32m✔ Done\x1b\[39m$/);
    assert.deepEqual(output.warnings, []);
    assert.deepEqual(output.errors, []);
  });

  it('writes colored warnings and errors to stderr in a TTY', () => {
    delete process.env.NO_COLOR;
    setTTY(true, true);
    const output = captureConsole();

    warn('Check this');
    error('Failed');

    assert.match(output.warnings[0] ?? '', /^\x1b\[33m⚠ Check this\x1b\[39m$/);
    assert.match(output.errors[0] ?? '', /^\x1b\[31m✖ Failed\x1b\[39m$/);
    assert.deepEqual(output.stdout, []);
  });

  it('can keep warning styling while writing to stdout', () => {
    delete process.env.NO_COLOR;
    setTTY(true, false);
    const output = captureConsole();

    warn('Check this', { target: 'stdout' });

    assert.match(output.stdout[0] ?? '', /^\x1b\[33m⚠ Check this\x1b\[39m$/);
    assert.deepEqual(output.warnings, []);
  });

  it('can keep error styling while writing to stdout', () => {
    delete process.env.NO_COLOR;
    setTTY(true, false);
    const output = captureConsole();

    error('Failed', { target: 'stdout' });

    assert.match(output.stdout[0] ?? '', /^\x1b\[31m✖ Failed\x1b\[39m$/);
    assert.deepEqual(output.errors, []);
  });

  it('keeps icons but removes ANSI when NO_COLOR is present, including empty', () => {
    process.env.NO_COLOR = '';
    setTTY(true, true);
    const output = captureConsole();

    success('Done');
    warn('Check this');

    assert.equal(output.stdout[0], '✔ Done');
    assert.equal(output.warnings[0], '⚠ Check this');
  });

  it('keeps icons but removes ANSI for non-TTY destination streams', () => {
    delete process.env.NO_COLOR;
    setTTY(false, false);
    const output = captureConsole();

    info('Next step');
    error('Failed');

    assert.equal(output.stdout[0], '→ Next step');
    assert.equal(output.errors[0], '✖ Failed');
  });
});
