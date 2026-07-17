import path from 'node:path';
import * as p from '@clack/prompts';
import { adapters } from '../adapters/index.js';
import { buildFingerprint } from '../core/fingerprint.js';
import { fingerprintPath } from '../core/paths.js';
import { writeYamlFile } from '../core/yaml-file.js';
import { t } from '../locales/index.js';

export interface ScanOptions {
  out?: string;
}

export async function runScan(opts: ScanOptions = {}): Promise<number> {
  p.intro(t('scan.title'));
  const projectDir = process.cwd();

  const spinner = p.spinner();
  spinner.start(t('scan.scanning'));
  const fingerprint = await buildFingerprint(projectDir, adapters);
  spinner.stop(t('common.done'));

  const topLang = fingerprint.languages[0];
  console.log(
    t('scan.summary', {
      languages: fingerprint.languages.length,
      topLang: topLang ? `${topLang.ext} (${topLang.files})` : '-',
      manifests: fingerprint.manifests.length,
      rules: fingerprint.existingRules.length,
    }),
  );

  const outPath = opts.out ? path.resolve(projectDir, opts.out) : fingerprintPath(projectDir);
  await writeYamlFile(outPath, fingerprint);
  console.log(t('scan.written', { path: path.relative(projectDir, outPath) || outPath }));

  p.outro(t('common.done'));
  return 0;
}
