#!/usr/bin/env node
/**
 * Manual E2E walkthrough for imwel-git-native-cli-mvp (tasks 13.1–13.5).
 * Uses isolated IMWEL_HOME and local git repos — no network required.
 */
import { execSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..');
const IMWEL = path.join(REPO_ROOT, 'dist', 'cli.js');

function distImport(rel) {
  return import(pathToFileURL(path.join(REPO_ROOT, 'dist', rel)).href);
}

const HOME = await mkdtemp(path.join(os.tmpdir(), 'imwel-e2e-home-'));
const WORK = await mkdtemp(path.join(os.tmpdir(), 'imwel-e2e-work-'));
process.env.IMWEL_HOME = HOME;

const env = { ...process.env, IMWEL_HOME: HOME };
const results = [];

function log(step, msg) {
  console.log(`\n[${step}] ${msg}`);
}

function pass(step, detail) {
  results.push({ step, ok: true, detail });
  console.log(`  ✓ ${detail}`);
}

function fail(step, detail) {
  results.push({ step, ok: false, detail });
  console.error(`  ✗ ${detail}`);
  throw new Error(`E2E failed at ${step}: ${detail}`);
}

function cli(args, cwd = WORK) {
  return execSync(`node "${IMWEL}" ${args}`, { cwd, env, encoding: 'utf8', stdio: 'pipe' });
}

function git(args, cwd) {
  return execSync(`git ${args}`, { cwd, encoding: 'utf8', stdio: 'pipe', shell: true });
}

async function initProject(projectDir, tools, includeOptional = true) {
  const { copyScaffold } = await distImport('core/scaffold.js');
  const { ensureRemoteCache, checkoutBranch, branchCommit } = await distImport('core/remote-cache.js');
  const { readManifest } = await distImport('core/manifest.js');
  const { discoverArtifacts } = await distImport('core/artifacts.js');
  const { renderArtifacts } = await distImport('core/render.js');
  const { applyRenderedFiles } = await distImport('core/apply-files.js');
  const { ensureHistoryRepo, commitInstalledFiles } = await distImport('core/history.js');
  const { writeBinding } = await distImport('core/binding.js');

  const templateDir = path.join(WORK, 'template-repo');
  const alias = 'templates';
  const cacheDir = await ensureRemoteCache(alias, { force: true });
  await checkoutBranch(cacheDir, 'main');
  const commit = await branchCommit(cacheDir, 'main');
  const manifest = await readManifest(cacheDir);
  const projectEntry = manifest.projects[0];
  const conventions = { ...manifest.conventions, ...(projectEntry.conventions ?? {}) };
  const allArtifacts = await discoverArtifacts(cacheDir, projectEntry, conventions);
  const selectedOptional = includeOptional
    ? new Set(allArtifacts.filter((a) => a.optional).map((a) => a.sourcePath))
    : new Set();
  const artifacts = allArtifacts.filter((a) => !a.optional || selectedOptional.has(a.sourcePath));
  const { files, managed } = renderArtifacts(artifacts, tools);
  await mkdir(projectDir, { recursive: true });
  await applyRenderedFiles(projectDir, files);
  await ensureHistoryRepo(projectDir);
  const writtenPaths = files.map((f) => f.path);
  const historyCommit = await commitInstalledFiles(projectDir, writtenPaths, 'imwel init (e2e)');
  await writeBinding(projectDir, {
    remote: alias,
    branch: 'main',
    project: projectEntry.name,
    tools,
    lastSyncedCommit: commit,
    lastSyncedHistoryCommit: historyCommit,
    artifacts: managed,
  });
  return { templateDir, cacheDir, commit };
}

try {
  log('SETUP', `IMWEL_HOME=${HOME}`);
  log('SETUP', `WORK=${WORK}`);

  // --- 13.1: template init → remote add → init (Cursor) → upstream edit → sync ---
  log('13.1', 'Scaffold template repository');
  const templateDir = path.join(WORK, 'template-repo');
  await mkdir(templateDir, { recursive: true });
  const { copyScaffold } = await distImport('core/scaffold.js');
  await copyScaffold(templateDir, 'en', { name: 'e2e-templates' });
  git('init -b main', templateDir);
  git('add .', templateDir);
  git('commit -m "chore: initial scaffold"', templateDir);
  pass('13.1', 'Template repo created and committed');

  log('13.1', 'remote add');
  const templateUrl = `file:///${templateDir.replace(/\\/g, '/').replace(/^([A-Z]):/, '$1:')}`;
  const remoteOut = cli(`remote add templates "${templateUrl}"`);
  if (!remoteOut.includes('templates')) fail('13.1', 'remote add output unexpected');
  pass('13.1', 'remote add succeeded');

  log('13.1', 'init consumer (Cursor only)');
  const consumerCursor = path.join(WORK, 'consumer-cursor');
  await initProject(consumerCursor, ['cursor'], false);
  const mdcPath = path.join(consumerCursor, '.cursor', 'rules', 'example-rule.mdc');
  const mdcBefore = await readFile(mdcPath, 'utf8');
  if (!mdcBefore.includes('example')) fail('13.1', 'Cursor rule not installed');
  pass('13.1', `Cursor rule installed at .cursor/rules/example-rule.mdc`);

  log('13.1', 'Edit upstream rule and sync');
  const upstreamRule = path.join(templateDir, 'example-project', 'rules', 'example-rule.md');
  await writeFile(upstreamRule, (await readFile(upstreamRule, 'utf8')) + '\n\n## E2E upstream change\n', 'utf8');
  git('add .', templateDir);
  git('commit -m "feat: update example rule"', templateDir);

  const { planSync, writeSyncResults } = await distImport('core/sync-engine.js');
  const { readBinding, writeBinding } = await distImport('core/binding.js');
  const { ensureRemoteCache, checkoutBranch } = await distImport('core/remote-cache.js');

  let binding = await readBinding(consumerCursor);
  if (!binding) fail('13.1', 'binding missing after init');
  const cacheDir = await ensureRemoteCache('templates', { force: true });
  await checkoutBranch(cacheDir, 'main');
  const plan = await planSync(cacheDir, binding);
  if (plan.items.length === 0) fail('13.1', 'sync plan should show upstream changes');
  pass('13.1', `sync preview: ${plan.items.map((i) => `${i.status} ${i.sourcePath}`).join(', ')}`);

  const syncResult = await writeSyncResults(consumerCursor, binding, plan, ['cursor'], false);
  if (syncResult.hasConflicts) fail('13.1', 'unexpected conflicts on clean sync');
  await writeBinding(consumerCursor, syncResult.binding);
  const mdcAfter = await readFile(mdcPath, 'utf8');
  if (!mdcAfter.includes('E2E upstream change')) fail('13.1', 'sync did not apply upstream change');
  pass('13.1', 'sync applied upstream change to local Cursor rule');

  // --- 13.2: Claude Code + skill ---
  log('13.2', 'init consumer (Claude Code + optional skill)');
  const consumerClaude = path.join(WORK, 'consumer-claude');
  await initProject(consumerClaude, ['claude-code'], true);
  const claudeMd = path.join(consumerClaude, 'CLAUDE.md');
  const skillMd = path.join(consumerClaude, '.claude', 'skills', 'example-skill', 'SKILL.md');
  if (!(await readFile(claudeMd, 'utf8')).includes('example')) fail('13.2', 'CLAUDE.md missing rule block');
  pass('13.2', 'CLAUDE.md contains rule block');
  const skillContent = await readFile(skillMd, 'utf8');
  if (!skillContent.includes('skill')) fail('13.2', 'skill not installed');
  pass('13.2', 'Optional skill installed at .claude/skills/example-skill/SKILL.md');

  // --- 13.3: local edit + upstream update → conflict markers ---
  log('13.3', 'Simulate local edit + upstream divergence');
  const conflictConsumer = path.join(WORK, 'consumer-conflict');
  await initProject(conflictConsumer, ['cursor'], false);
  binding = await readBinding(conflictConsumer);
  if (!binding) fail('13.3', 'binding missing');
  const conflictMdc = path.join(conflictConsumer, '.cursor', 'rules', 'example-rule.mdc');
  await writeFile(conflictMdc, '# LOCAL EDIT\n\nUser changed this locally.\n', 'utf8');

  await writeFile(upstreamRule, '# REMOTE EDIT\n\nUpstream changed this.\n', 'utf8');
  git('add .', templateDir);
  git('commit -m "feat: conflicting upstream change"', templateDir);
  await checkoutBranch(cacheDir, 'main');

  const conflictPlan = await planSync(cacheDir, binding);
  const conflictSync = await writeSyncResults(conflictConsumer, binding, conflictPlan, ['cursor'], false);
  if (!conflictSync.hasConflicts) fail('13.3', 'expected conflict markers');
  const conflictContent = await readFile(conflictMdc, 'utf8');
  if (!conflictContent.includes('<<<<<<<')) fail('13.3', 'conflict markers not written');
  pass('13.3', 'Three-way merge produced conflict markers');

  log('13.3', 'Resolve conflict and sync --continue');
  await writeFile(conflictMdc, '# RESOLVED\n\nMerged by user.\n', 'utf8');
  const continued = await writeSyncResults(conflictConsumer, binding, conflictPlan, ['cursor'], true);
  if (continued.hasConflicts) fail('13.3', 'sync --continue should clear conflicts');
  await writeBinding(conflictConsumer, continued.binding);
  pass('13.3', 'sync --continue finalized after manual resolution');

  // --- 13.4: propose + push ---
  log('13.4', 'propose new local rule and push');
  const pushConsumer = path.join(WORK, 'consumer-push');
  await initProject(pushConsumer, ['cursor'], false);
  binding = await readBinding(pushConsumer);
  if (!binding) fail('13.4', 'binding missing');
  const newRulePath = path.join(pushConsumer, '.cursor', 'rules', 'my-new-rule.mdc');
  await writeFile(newRulePath, '---\ndescription: E2E new rule\n---\n\n# My new rule\n\nContributed via e2e.\n', 'utf8');

  const { buildProposal, addPendingProposal } = await distImport('core/propose.js');
  const proposal = buildProposal(
    '.cursor/rules/my-new-rule.mdc',
    'templates',
    binding.project,
    'rule',
    false,
    'cursor',
  );
  await addPendingProposal(pushConsumer, proposal);
  pass('13.4', 'propose registered new artifact candidate');

  const { collectEditCandidates, collectProposalCandidates, executePush } = await distImport('core/push.js');
  const { readPendingProposals } = await distImport('core/propose.js');
  const proposals = await readPendingProposals(pushConsumer);
  const candidates = [
    ...(await collectProposalCandidates(pushConsumer, proposals)),
    ...(await collectEditCandidates(pushConsumer, binding)),
  ];
  if (candidates.length === 0) fail('13.4', 'no push candidates');
  const pushResult = await executePush(binding, candidates, 'feat(e2e): add my-new-rule');
  if (pushResult.directPush) fail('13.4', 'default remote must not direct-push');
  if (!pushResult.branch.startsWith('imwel-push-')) fail('13.4', 'expected feature branch');
  pass('13.4', `push created branch: ${pushResult.branch}`);
  pass('13.4', `compare URL: ${pushResult.compareUrl}`);

  // --- 13.5: rollback ---
  log('13.5', 'rollback after unwanted sync');
  const rollbackConsumer = path.join(WORK, 'consumer-rollback');
  await initProject(rollbackConsumer, ['cursor'], false);
  binding = await readBinding(rollbackConsumer);
  if (!binding) fail('13.5', 'binding missing');
  const rollbackMdc = path.join(rollbackConsumer, '.cursor', 'rules', 'example-rule.mdc');
  const beforeRollback = await readFile(rollbackMdc, 'utf8');

  await writeFile(upstreamRule, beforeRollback + '\n\n## Unwanted sync\n', 'utf8');
  git('add .', templateDir);
  git('commit -m "feat: unwanted change"', templateDir);
  await checkoutBranch(cacheDir, 'main');
  const rollbackPlan = await planSync(cacheDir, binding);
  const rollbackSync = await writeSyncResults(rollbackConsumer, binding, rollbackPlan, ['cursor'], false);
  await writeBinding(rollbackConsumer, rollbackSync.binding);
  const afterUnwanted = await readFile(rollbackMdc, 'utf8');
  if (!afterUnwanted.includes('Unwanted sync')) fail('13.5', 'unwanted sync did not apply');

  const { listHistoryCommits, restoreToCommit } = await distImport('core/history.js');
  const commits = await listHistoryCommits(rollbackConsumer);
  if (commits.length < 2) fail('13.5', 'need at least 2 history commits');
  const priorSha = commits[1].sha;
  await restoreToCommit(rollbackConsumer, priorSha, []);
  const restored = await readFile(rollbackMdc, 'utf8');
  if (restored.includes('Unwanted sync')) fail('13.5', 'rollback did not restore prior state');
  pass('13.5', `rollback restored state to commit ${priorSha.slice(0, 8)}`);

  // CLI smoke
  log('CLI', 'doctor + remote list');
  const doctor = cli('doctor');
  if (!doctor.toLowerCase().includes('git')) fail('CLI', 'doctor failed');
  pass('CLI', 'imwel doctor OK');
  const list = cli('remote list');
  if (!list.includes('templates')) fail('CLI', 'remote list missing templates');
  pass('CLI', 'imwel remote list OK');

  console.log('\n========================================');
  console.log('E2E WALKTHROUGH COMPLETE');
  console.log(`Passed: ${results.filter((r) => r.ok).length}/${results.length}`);
  console.log('========================================\n');
} catch (err) {
  console.error('\n========================================');
  console.error('E2E WALKTHROUGH FAILED');
  console.error(err instanceof Error ? err.message : err);
  console.error(`Passed before failure: ${results.filter((r) => r.ok).length}/${results.length}`);
  console.error('========================================\n');
  process.exitCode = 1;
} finally {
  await rm(HOME, { recursive: true, force: true }).catch(() => undefined);
  await rm(WORK, { recursive: true, force: true }).catch(() => undefined);
}
