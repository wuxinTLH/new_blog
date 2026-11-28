import zhCN from '../locals/zh-CN.json' with { type: 'json' };
import enUS from '../locals/en-US.json' with { type: 'json' };

export type Locale = 'zh-CN' | 'en-US';
const storageKey = 'sakuramikku-locale';
const dictionaries: Record<Locale, Record<string, string>> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};
let locale: Locale = 'zh-CN';
let initialized = false;

function isLocale(value: unknown): value is Locale {
  return value === 'zh-CN' || value === 'en-US';
}

/** Missing translations fall back to Chinese, then to the key itself. */
export function t(key: string, params?: Record<string, string | number>): string {
  const dictionary = dictionaries[locale];
  const text = Object.hasOwn(dictionary, key) ? dictionary[key]
    : Object.hasOwn(zhCN, key) ? dictionaries['zh-CN'][key] : key;
  return text.replace(/\{(\w+)\}/g, (token, name: string) =>
    params && Object.hasOwn(params, name) ? String(params[name]) : token);
}

export function getLocale(): Locale {
  return locale;
}

function applyTranslations(): void {
  document.documentElement.lang = locale;
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(element => {
    const key = element.dataset.i18n;
    if (key) element.textContent = t(key);
  });
  // Attribute mappings use semicolon-separated attribute:key pairs.
  document.querySelectorAll<HTMLElement>('[data-i18n-attr]').forEach(element => {
    for (const mapping of (element.dataset.i18nAttr ?? '').split(';')) {
      const separator = mapping.indexOf(':');
      if (separator < 1) continue;
      const attribute = mapping.slice(0, separator).trim();
      const key = mapping.slice(separator + 1).trim();
      if (key) element.setAttribute(attribute, t(key));
    }
  });
  document.querySelectorAll<HTMLSelectElement>('[data-locale-select]').forEach(select => {
    select.value = locale;
  });
  document.documentElement.style.setProperty('--swipe-label', JSON.stringify(t('ui.swipe')));
}

/** Change the active locale and notify dynamic UI; unsupported values reset to Chinese. */
export function setLocale(value: string): void {
  locale = isLocale(value) ? value : 'zh-CN';
  try {
    localStorage.setItem(storageKey, locale);
  } catch {
    // The current tab remains usable when browser storage is blocked or full.
  }
  applyTranslations();
  document.dispatchEvent(new CustomEvent('localechange', { detail: { locale }, bubbles: true }));
}

/** Safe to call repeatedly; event handlers are installed only once. */
export function initI18n(): void {
  if (initialized) {
    applyTranslations();
    return;
  }
  initialized = true;
  try {
    const stored = localStorage.getItem(storageKey);
    locale = isLocale(stored) ? stored : 'zh-CN';
  } catch {
    locale = 'zh-CN';
  }
  applyTranslations();
  document.querySelectorAll<HTMLSelectElement>('[data-locale-select]').forEach(select => {
    select.addEventListener('change', () => setLocale(select.value));
  });
  window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    // Ignore sessionStorage events. Reading localStorage can itself throw.
    try {
      if (event.storageArea && event.storageArea !== localStorage) return;
    } catch {
      locale = 'zh-CN';
      applyTranslations();
      document.dispatchEvent(new CustomEvent('localechange', { detail: { locale }, bubbles: true }));
      return;
    }
    locale = isLocale(event.newValue) ? event.newValue : 'zh-CN';
    applyTranslations();
    document.dispatchEvent(new CustomEvent('localechange', { detail: { locale }, bubbles: true }));
  });
  document.dispatchEvent(new CustomEvent('localechange', { detail: { locale }, bubbles: true }));
}
