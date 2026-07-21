import { extractImwelOverrides, parseFrontmatter } from './frontmatter.js';
import { toSemanticOverrides } from '../adapters/strategies/overrides.js';

export interface RuleOverlayResult {
  /** Canonical body with any authoring frontmatter stripped. */
  body: string;
  /** Author-declared semantic overrides, or undefined when none were present. */
  overrides: Record<string, unknown> | undefined;
}

/**
 * Parse a rule source file's optional YAML frontmatter overlay into semantic
 * overrides and strip it from the canonical body. Mirrors the consumer-side
 * `parseExisting` so authored metadata stays in the same semantic layer without
 * a second rule dialect. Files without frontmatter are returned unchanged.
 */
export function parseRuleOverlay(content: string): RuleOverlayResult {
  const parsed = parseFrontmatter(content);
  if (Object.keys(parsed.frontmatter).length === 0) {
    return { body: content, overrides: undefined };
  }
  const semantic = toSemanticOverrides(parsed.frontmatter) as Record<string, unknown>;
  const imwel = extractImwelOverrides(parsed.frontmatter);
  const merged = { ...imwel, ...semantic };
  return {
    body: parsed.body,
    overrides: Object.keys(merged).length ? merged : undefined,
  };
}
