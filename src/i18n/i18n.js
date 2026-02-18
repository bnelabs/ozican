/**
 * Lightweight i18n engine for OzMos.
 * Supports EN and TR with localStorage persistence.
 */
import { ui_en } from './ui.en.js';
import { ui_tr } from './ui.tr.js';

const STORAGE_KEY = 'ozmos-lang';
const SUPPORTED = ['en', 'tr'];
const DICTIONARIES = { en: ui_en, tr: ui_tr };

let currentLang = 'en';
const listeners = [];

/** Initialize language from localStorage or browser preference */
export function initLang() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED.includes(stored)) {
    currentLang = stored;
  } else {
    const browserLang = (navigator.language || '').slice(0, 2).toLowerCase();
    currentLang = SUPPORTED.includes(browserLang) ? browserLang : 'en';
  }
  document.documentElement.lang = currentLang;
}

/** Get current language */
export function getLang() {
  return currentLang;
}

/** Set language and notify listeners */
export function setLang(lang) {
  if (!SUPPORTED.includes(lang) || lang === currentLang) return;
  currentLang = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.lang = lang;
  listeners.forEach(fn => fn(lang));
}

/** Translate a key. Falls back to English, then to the key itself. */
export function t(key) {
  return DICTIONARIES[currentLang]?.[key]
    || DICTIONARIES.en[key]
    || key;
}

/** Register a callback for language changes */
export function onLangChange(fn) {
  listeners.push(fn);
}
