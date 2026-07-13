export type SupportedLocale = 'en' | 'zh-CN';

const SUPPORTED: SupportedLocale[] = ['en', 'zh-CN'];

export function normalizeLocaleTag(tag: string): SupportedLocale | null {
  const normalized = tag.trim().replace(/_/g, '-');
  if (normalized === 'en' || normalized.startsWith('en-')) {
    return 'en';
  }
  if (normalized === 'zh-CN' || normalized === 'zh-cn' || normalized === 'zh-Hans') {
    return 'zh-CN';
  }
  if (SUPPORTED.includes(normalized as SupportedLocale)) {
    return normalized as SupportedLocale;
  }
  return null;
}

export function resolveLocale(explicitLang?: string): SupportedLocale {
  if (explicitLang) {
    const fromFlag = normalizeLocaleTag(explicitLang);
    if (fromFlag) {
      return fromFlag;
    }
  }
  const env = process.env.LC_ALL || process.env.LANG;
  if (env) {
    const fromEnv = normalizeLocaleTag(env.split('.')[0] ?? env);
    if (fromEnv) {
      return fromEnv;
    }
  }
  return 'en';
}
