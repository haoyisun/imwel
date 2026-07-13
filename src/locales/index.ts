import { en, type LocaleKey } from './en.js';
import { zhCN } from './zh-CN.js';
import type { SupportedLocale } from '../core/locale.js';

let activeLocale: SupportedLocale = 'en';

const tables: Record<SupportedLocale, Partial<Record<LocaleKey, string>>> = {
  en,
  'zh-CN': zhCN,
};

export function setActiveLocale(locale: SupportedLocale): void {
  activeLocale = locale;
}

export function getActiveLocale(): SupportedLocale {
  return activeLocale;
}

export function t(key: LocaleKey, params?: Record<string, string | number>): string {
  const localized = tables[activeLocale]?.[key] ?? en[key];
  if (!params) {
    return localized;
  }
  return localized.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
}

export type { LocaleKey };
