import fs from 'node:fs/promises';
import path from 'node:path';
import { detectImwelContext, isDirectory } from './detect-context.js';
import { parseFrontmatter } from './frontmatter.js';
import { pathExists } from './fs-utils.js';
import { checkRuleHealth } from './rule-health.js';
import {
  ManifestError,
  type Manifest,
  type ManifestConventions,
  type ManifestProject,
  readManifest,
  resolveConventions,
} from './manifest.js';

export type LintSeverity = 'error' | 'warning';

export interface LintIssue {
  severity: LintSeverity;
  code: string;
  message: string;
  path?: string;
}

export interface LintResult {
  contextKind: 'template' | 'consumer' | 'neither' | 'ambiguous';
  root: string | null;
  /** Set when context is template and lint ran against the template root. */
  issues: LintIssue[];
  /** True when the caller should treat this as a non-template / wrong-context failure. */
  wrongContext: boolean;
}

const DESCRIPTION_MIN = 20;
const DESCRIPTION_MAX = 1024;

/**
 * Lint a template repository (or report wrong-context for non-template cwd).
 * Does not print; callers format and choose exit codes.
 */
export async function lintTemplateRepo(
  cwd: string,
  options: { strict?: boolean } = {},
): Promise<LintResult> {
  void options; // exit-code policy is applied by the command layer
  const context = await detectImwelContext(cwd);

  if (context.kind !== 'template' || !context.root) {
    return {
      contextKind: context.kind,
      root: context.root,
      issues: [],
      wrongContext: true,
    };
  }

  const issues: LintIssue[] = [];
  let manifest: Manifest;
  try {
    manifest = await readManifest(context.root);
  } catch (error) {
    const message =
      error instanceof ManifestError
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error);
    issues.push({
      severity: 'error',
      code: 'manifest.invalid',
      message,
      path: path.join(context.root, '.imwel', 'manifest.yaml'),
    });
    return {
      contextKind: 'template',
      root: context.root,
      issues,
      wrongContext: false,
    };
  }

  const artifactNamesByProject: Map<string, ProjectArtifactNames> = new Map();
  for (const project of manifest.projects) {
    await lintProject(context.root, manifest, project, issues);
    artifactNamesByProject.set(project.name, await collectProjectArtifactNames(context.root, manifest, project));
  }
  lintCrossProjectArtifactNameCollisions(artifactNamesByProject, issues);

  const readmePath = path.join(context.root, 'README.md');
  if (!(await pathExists(readmePath))) {
    issues.push({
      severity: 'warning',
      code: 'repo.readmeMissing',
      message: 'Repository root has no README.md',
      path: readmePath,
    });
  }

  return {
    contextKind: 'template',
    root: context.root,
    issues,
    wrongContext: false,
  };
}

export function lintExitCode(result: LintResult, strict: boolean): number {
  if (result.wrongContext) {
    return 1;
  }
  const hasError = result.issues.some((i) => i.severity === 'error');
  if (hasError) {
    return 1;
  }
  if (strict && result.issues.some((i) => i.severity === 'warning')) {
    return 1;
  }
  return 0;
}

async function lintProject(
  repoRoot: string,
  manifest: Manifest,
  project: ManifestProject,
  issues: LintIssue[],
): Promise<void> {
  const { conventions } = resolveConventions(manifest, project.name);
  const projectDir = path.join(repoRoot, project.path);

  // An undeclared role silently defaults to a writable project. Nudge authors to
  // be explicit so a project meant as a read-only module is not left pushable.
  if (project.role === undefined) {
    issues.push({
      severity: 'warning',
      code: 'project.roleUndeclared',
      message: `Project "${project.name}" does not declare a role; it defaults to a writable project (role: project). Set role: shared to publish it as a read-only module.`,
      path: project.path,
    });
  }

  if (pathEscapes(repoRoot, project.path)) {
    issues.push({
      severity: 'error',
      code: 'project.pathEscape',
      message: `Project path escapes the repository root: ${project.path}`,
      path: project.path,
    });
    return;
  }

  if (!(await pathExists(projectDir))) {
    issues.push({
      severity: 'error',
      code: 'project.pathMissing',
      message: `Project path does not exist: ${project.path}`,
      path: project.path,
    });
    return;
  }

  if (!(await isDirectory(projectDir))) {
    issues.push({
      severity: 'error',
      code: 'project.pathNotDir',
      message: `Project path is not a directory: ${project.path}`,
      path: project.path,
    });
    return;
  }

  // A shared module composes into a consumer next to the single writable project;
  // its agents file would collide at the single project-root instructions path and
  // is intentionally not installed. Warn so the author moves the content into
  // rule/skill artifacts (which compose cleanly) instead of shipping dead content.
  if (project.role === 'shared') {
    const agentsAbs = path.join(projectDir, ...conventions.agentsFile.split('/'));
    if (await pathExists(agentsAbs)) {
      issues.push({
        severity: 'warning',
        code: 'module.agentsIgnored',
        message: `Shared module "${project.name}" ships an agents file (${conventions.agentsFile}); it is not installed for modules (it would collide with the writable project's root instructions). Move this content into rule/skill artifacts instead.`,
        path: path.posix.join(project.path.replace(/\\/g, '/'), conventions.agentsFile),
      });
    }
  }

  await lintSkills(projectDir, conventions, issues);
  await lintRules(projectDir, conventions, issues);
  await lintOptionalPaths(projectDir, project, conventions, issues);
}

async function lintSkills(
  projectDir: string,
  conventions: ManifestConventions,
  issues: LintIssue[],
): Promise<void> {
  const skillsDir = path.join(projectDir, conventions.skillsDir);
  if (!(await pathExists(skillsDir))) {
    return;
  }
  if (!(await isDirectory(skillsDir))) {
    issues.push({
      severity: 'error',
      code: 'skills.notDir',
      message: `Skills path is not a directory: ${conventions.skillsDir}`,
      path: conventions.skillsDir,
    });
    return;
  }

  const entries = await fs.readdir(skillsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const skillRel = path.posix.join(conventions.skillsDir, entry.name);
    const skillDir = path.join(skillsDir, entry.name);
    const skillMd = path.join(skillDir, 'SKILL.md');
    if (!(await pathExists(skillMd))) {
      issues.push({
        severity: 'error',
        code: 'skill.missingSkillMd',
        message: `Skill directory is missing SKILL.md: ${skillRel}`,
        path: skillRel,
      });
      continue;
    }
    await lintSkillDescription(skillMd, skillRel, issues);
  }
}

async function lintSkillDescription(
  skillMdPath: string,
  skillRel: string,
  issues: LintIssue[],
): Promise<void> {
  const content = await fs.readFile(skillMdPath, 'utf8');
  const { frontmatter } = parseFrontmatter(content);
  const description =
    typeof frontmatter.description === 'string' ? frontmatter.description.trim() : '';

  if (!description) {
    issues.push({
      severity: 'warning',
      code: 'skill.descriptionMissing',
      message: `Skill SKILL.md should declare a YAML frontmatter description (agentskills / Cursor convention): ${skillRel}`,
      path: `${skillRel}/SKILL.md`,
    });
    return;
  }

  if (description.length < DESCRIPTION_MIN) {
    issues.push({
      severity: 'warning',
      code: 'skill.descriptionShort',
      message: `Skill description is shorter than ${DESCRIPTION_MIN} characters (harder to trigger reliably): ${skillRel}`,
      path: `${skillRel}/SKILL.md`,
    });
  } else if (description.length > DESCRIPTION_MAX) {
    issues.push({
      severity: 'warning',
      code: 'skill.descriptionLong',
      message: `Skill description exceeds ${DESCRIPTION_MAX} characters: ${skillRel}`,
      path: `${skillRel}/SKILL.md`,
    });
  }

  if (!looksTriggerable(description)) {
    issues.push({
      severity: 'warning',
      code: 'skill.descriptionNotTriggerable',
      message: `Skill description should say when to use the skill (e.g. include "use when" / "when working on"): ${skillRel}`,
      path: `${skillRel}/SKILL.md`,
    });
  }
}

async function lintRules(
  projectDir: string,
  conventions: ManifestConventions,
  issues: LintIssue[],
): Promise<void> {
  const rulesDir = path.join(projectDir, conventions.rulesDir);
  if (!(await pathExists(rulesDir))) {
    return;
  }
  if (!(await isDirectory(rulesDir))) {
    issues.push({
      severity: 'error',
      code: 'rules.notDir',
      message: `Rules path is not a directory: ${conventions.rulesDir}`,
      path: conventions.rulesDir,
    });
    return;
  }

  const entries = await fs.readdir(rulesDir, { withFileTypes: true });
  const mdFiles = entries.filter((e) => e.isFile() && e.name.endsWith('.md'));
  if (mdFiles.length === 0) {
    issues.push({
      severity: 'warning',
      code: 'rules.empty',
      message: `Rules directory has no .md files: ${conventions.rulesDir}`,
      path: conventions.rulesDir,
    });
    return;
  }

  // Template-side rules reference the *consumer's* files (absent here), so only
  // the context-free empty/placeholder check is meaningful. Passing exists=() => true
  // suppresses orphan-ref / dead-import checks, leaving `rule.empty`.
  const files: { path: string; content: string }[] = [];
  for (const entry of mdFiles) {
    const rel = path.posix.join(conventions.rulesDir, entry.name);
    const content = await fs.readFile(path.join(rulesDir, entry.name), 'utf8');
    files.push({ path: rel, content });
    lintRuleDescription(content, rel, issues);
  }
  for (const issue of checkRuleHealth(files, () => true)) {
    issues.push({
      severity: 'warning',
      code: issue.code,
      message: `Rule has no meaningful content (empty or placeholder-only): ${issue.path}`,
      path: issue.path,
    });
  }
}

/**
 * Rules carry an optional frontmatter overlay (description/globs/alwaysApply).
 * A missing or non-triggerable description degrades to a filename slug when
 * rendered to tools, so warn (parity with the skill description check). Warnings
 * only; empty/placeholder rules are covered separately by `rule.empty`.
 */
function lintRuleDescription(content: string, ruleRel: string, issues: LintIssue[]): void {
  const { frontmatter } = parseFrontmatter(content);
  const description =
    typeof frontmatter.description === 'string' ? frontmatter.description.trim() : '';

  if (!description) {
    issues.push({
      severity: 'warning',
      code: 'rule.descriptionMissing',
      message: `Rule should declare a YAML frontmatter description so tools can trigger it reliably (otherwise it degrades to the filename): ${ruleRel}`,
      path: ruleRel,
    });
    return;
  }

  if (!looksTriggerable(description)) {
    issues.push({
      severity: 'warning',
      code: 'rule.descriptionNotTriggerable',
      message: `Rule description should say when it applies (e.g. include "use when" / "when working on"): ${ruleRel}`,
      path: ruleRel,
    });
  }
}

async function lintOptionalPaths(
  projectDir: string,
  project: ManifestProject,
  conventions: ManifestConventions,
  issues: LintIssue[],
): Promise<void> {
  for (const optional of project.optional ?? []) {
    const normalized = optional.replace(/\\/g, '/');
    if (pathEscapes(projectDir, normalized)) {
      issues.push({
        severity: 'error',
        code: 'optional.pathEscape',
        message: `Optional artifact path escapes the project directory: ${normalized}`,
        path: normalized,
      });
      continue;
    }
    const abs = path.join(projectDir, ...normalized.split('/'));
    if (!(await pathExists(abs))) {
      issues.push({
        severity: 'error',
        code: 'optional.pathMissing',
        message: `Optional artifact path does not exist: ${normalized}`,
        path: normalized,
      });
      continue;
    }
    // Skill optional entries are directories; ensure SKILL.md if it looks like a skill root.
    const skillsPrefix = `${conventions.skillsDir}/`;
    if (normalized.startsWith(skillsPrefix) && !normalized.endsWith('SKILL.md')) {
      const skillMd = path.join(abs, 'SKILL.md');
      if ((await isDirectory(abs)) && !(await pathExists(skillMd))) {
        issues.push({
          severity: 'error',
          code: 'skill.missingSkillMd',
          message: `Optional skill path is missing SKILL.md: ${normalized}`,
          path: normalized,
        });
      }
    }
  }
}

interface ProjectArtifactNames {
  rules: Set<string>;
  skills: Set<string>;
}

/**
 * Gather rule-file basenames and skill-directory names for one project, for the
 * cross-project collision check below. Best-effort: an unreadable/missing dir
 * just yields an empty set (already reported by lintRules/lintSkills above).
 */
async function collectProjectArtifactNames(
  repoRoot: string,
  manifest: Manifest,
  project: ManifestProject,
): Promise<ProjectArtifactNames> {
  const { conventions } = resolveConventions(manifest, project.name);
  const projectDir = path.join(repoRoot, project.path);
  const rules = new Set<string>();
  const skills = new Set<string>();

  const rulesDir = path.join(projectDir, conventions.rulesDir);
  if ((await pathExists(rulesDir)) && (await isDirectory(rulesDir))) {
    const entries = await fs.readdir(rulesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        rules.add(entry.name.slice(0, -'.md'.length));
      }
    }
  }

  const skillsDir = path.join(projectDir, conventions.skillsDir);
  if ((await pathExists(skillsDir)) && (await isDirectory(skillsDir))) {
    const entries = await fs.readdir(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        skills.add(entry.name);
      }
    }
  }

  return { rules, skills };
}

/**
 * A rule/skill basename shared by two projects only *might* collide, and only
 * for consumers who install both — lint cannot know that in advance, so this
 * stays a warning even under --strict-adjacent policy (still respects --strict
 * like any other warning). See design.md D3.
 */
function lintCrossProjectArtifactNameCollisions(
  byProject: Map<string, ProjectArtifactNames>,
  issues: LintIssue[],
): void {
  const projectNames = [...byProject.keys()];
  for (let i = 0; i < projectNames.length; i += 1) {
    for (let j = i + 1; j < projectNames.length; j += 1) {
      const nameA = projectNames[i]!;
      const nameB = projectNames[j]!;
      const a = byProject.get(nameA)!;
      const b = byProject.get(nameB)!;

      for (const rule of intersect(a.rules, b.rules)) {
        issues.push({
          severity: 'warning',
          code: 'project.artifactNameCollision',
          message: `Projects "${nameA}" and "${nameB}" both declare a rule named "${rule}.md"; installing both would collide on the rendered path. Rename one of them if this is unintentional.`,
        });
      }
      for (const skill of intersect(a.skills, b.skills)) {
        issues.push({
          severity: 'warning',
          code: 'project.artifactNameCollision',
          message: `Projects "${nameA}" and "${nameB}" both declare a skill named "${skill}"; installing both would collide on the rendered path. Rename one of them if this is unintentional.`,
        });
      }
    }
  }
}

function intersect(a: Set<string>, b: Set<string>): string[] {
  return [...a].filter((value) => b.has(value));
}

function pathEscapes(root: string, relative: string): boolean {
  const resolved = path.resolve(root, relative);
  const normalizedRoot = path.resolve(root);
  return resolved !== normalizedRoot && !resolved.startsWith(normalizedRoot + path.sep);
}

/**
 * Heuristic aligned with agentskills / Cursor guidance: descriptions should
 * state when the skill applies, not only what it is named.
 */
function looksTriggerable(description: string): boolean {
  const lower = description.toLowerCase();
  return (
    /\buse when\b/.test(lower) ||
    /\bwhen (?:to use|working|editing|adding|creating|running|the user)\b/.test(lower) ||
    /\buse this skill\b/.test(lower) ||
    /\bfor (?:tasks|work) (?:related|involving)\b/.test(lower) ||
    /当/.test(description) ||
    /用于/.test(description)
  );
}
