/**
 * Semantic targetOverrides fields shared across adapters.
 * Each adapter translates these to/from tool-native frontmatter keys.
 */
export interface SemanticOverrides {
  globs?: string[];
  alwaysApply?: boolean;
  description?: string;
  regex?: string | string[];
  /** Tool-specific trigger mode when needed (windsurf trigger, kiro inclusion, …). */
  trigger?: string;
}

export type FrontmatterShape =
  | 'standard'
  | 'windsurf'
  | 'cline'
  | 'kiro'
  | 'copilot-applyTo';

function asStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return undefined;
}

export function toSemanticOverrides(raw: Record<string, unknown> | undefined): SemanticOverrides {
  if (!raw) {
    return {};
  }
  const out: SemanticOverrides = {};
  if (raw.globs !== undefined) {
    out.globs = asStringArray(raw.globs);
  }
  if (raw.paths !== undefined && !out.globs) {
    out.globs = asStringArray(raw.paths);
  }
  if (raw.applyTo !== undefined && !out.globs) {
    out.globs = asStringArray(raw.applyTo);
  }
  if (raw.fileMatchPattern !== undefined && !out.globs) {
    out.globs = asStringArray(raw.fileMatchPattern);
  }
  if (typeof raw.alwaysApply === 'boolean') {
    out.alwaysApply = raw.alwaysApply;
  }
  if (typeof raw.description === 'string') {
    out.description = raw.description;
  }
  if (raw.regex !== undefined) {
    out.regex = Array.isArray(raw.regex) ? raw.regex.map(String) : String(raw.regex);
  }
  if (typeof raw.trigger === 'string') {
    out.trigger = raw.trigger;
  }
  if (typeof raw.inclusion === 'string' && !out.trigger) {
    out.trigger = raw.inclusion;
  }
  return out;
}

/** Build tool-native frontmatter from semantic overrides. */
export function toNativeFrontmatter(
  shape: FrontmatterShape,
  overrides: SemanticOverrides,
  fallbackDescription?: string,
): Record<string, unknown> {
  const description = overrides.description ?? fallbackDescription;
  switch (shape) {
    case 'windsurf': {
      const fm: Record<string, unknown> = {};
      if (overrides.trigger) {
        fm.trigger = overrides.trigger;
      } else if (overrides.globs?.length) {
        fm.trigger = 'glob';
        fm.globs = overrides.globs;
      } else if (overrides.alwaysApply === false) {
        fm.trigger = 'model_decision';
      } else {
        fm.trigger = 'always_on';
      }
      if (overrides.globs?.length && fm.trigger === 'glob') {
        fm.globs = overrides.globs;
      }
      if (description) {
        fm.description = description;
      }
      return fm;
    }
    case 'cline': {
      const fm: Record<string, unknown> = {};
      if (overrides.globs?.length) {
        fm.paths = overrides.globs;
      }
      if (overrides.alwaysApply !== undefined) {
        fm.alwaysApply = overrides.alwaysApply;
      }
      if (description) {
        fm.description = description;
      }
      return fm;
    }
    case 'kiro': {
      const fm: Record<string, unknown> = {};
      if (overrides.trigger) {
        fm.inclusion = overrides.trigger;
      } else if (overrides.globs?.length) {
        fm.inclusion = 'fileMatch';
        fm.fileMatchPattern = overrides.globs.length === 1 ? overrides.globs[0] : overrides.globs;
      } else if (overrides.alwaysApply === false) {
        fm.inclusion = 'manual';
      } else {
        fm.inclusion = 'always';
      }
      if (overrides.globs?.length && fm.inclusion === 'fileMatch') {
        fm.fileMatchPattern = overrides.globs.length === 1 ? overrides.globs[0] : overrides.globs;
      }
      return fm;
    }
    case 'copilot-applyTo': {
      const fm: Record<string, unknown> = {};
      if (overrides.globs?.length) {
        fm.applyTo = overrides.globs.join(', ');
      }
      return fm;
    }
    case 'standard':
    default: {
      const fm: Record<string, unknown> = {};
      if (description) {
        fm.description = description;
      }
      if (overrides.globs?.length) {
        fm.globs = overrides.globs;
      }
      if (overrides.alwaysApply !== undefined) {
        fm.alwaysApply = overrides.alwaysApply;
      }
      if (overrides.regex !== undefined) {
        fm.regex = overrides.regex;
      }
      return fm;
    }
  }
}

/** Recover semantic overrides from tool-native frontmatter. */
export function fromNativeFrontmatter(
  shape: FrontmatterShape,
  frontmatter: Record<string, unknown>,
): SemanticOverrides {
  const base = toSemanticOverrides(frontmatter);
  switch (shape) {
    case 'windsurf': {
      if (typeof frontmatter.trigger === 'string') {
        base.trigger = frontmatter.trigger;
        if (frontmatter.trigger === 'always_on') {
          base.alwaysApply = true;
        } else if (frontmatter.trigger === 'manual' || frontmatter.trigger === 'model_decision') {
          base.alwaysApply = false;
        }
      }
      return base;
    }
    case 'kiro': {
      if (typeof frontmatter.inclusion === 'string') {
        base.trigger = frontmatter.inclusion;
        if (frontmatter.inclusion === 'always') {
          base.alwaysApply = true;
        } else if (frontmatter.inclusion === 'manual' || frontmatter.inclusion === 'auto') {
          base.alwaysApply = false;
        }
      }
      return base;
    }
    default:
      return base;
  }
}

/** True when frontmatter indicates an on-demand (skill-like) rule rather than always-on. */
export function isOnDemandFrontmatter(shape: FrontmatterShape, frontmatter: Record<string, unknown>): boolean {
  const semantic = fromNativeFrontmatter(shape, frontmatter);
  if (shape === 'windsurf') {
    return semantic.trigger === 'manual' || semantic.trigger === 'model_decision';
  }
  if (shape === 'kiro') {
    return semantic.trigger === 'manual' || semantic.trigger === 'auto';
  }
  if (shape === 'cline' || shape === 'standard') {
    return semantic.alwaysApply === false;
  }
  return false;
}
