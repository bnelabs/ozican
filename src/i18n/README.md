# OzMos Internationalisation Guide

OzMos ships with **English (en)** and **Turkish (tr)** locales.
This guide covers everything you need to add a new language.

---

## File Map

| File | Purpose |
|------|---------|
| `src/i18n/ui.en.js` | English UI strings (source of truth) |
| `src/i18n/ui.tr.js` | Turkish UI strings (mirrors every key in `ui.en.js`) |
| `src/i18n/i18n.js` | Runtime engine — `t()`, `setLang()`, `initLang()`, `toUpper()`, `toLower()` |
| `src/i18n/localizedData.js` | Returns per-planet data objects in the active language |
| `src/i18n/data.tr.js` | Turkish planet data (names, descriptions, fun facts, …) |
| `src/data/mineralInfo.js` | English mineral tooltips |

---

## Adding a New Language (e.g., German `de`)

### 1. Create the UI strings file

Copy `ui.en.js` → `ui.de.js` and translate every value.
Do **not** change or remove any key — every key that exists in `ui.en.js` must appear here too.
Missing keys automatically fall back to English via `t()`.

```js
// src/i18n/ui.de.js
export const ui_de = {
  'brand.tagline': 'Sonnensystem-Explorer',
  // … all other keys …
};
```

### 2. Create a planet-data file (optional but recommended)

Copy `data.tr.js` → `data.de.js`.
Each entry in the exported array can override any field present in `src/data/planets.js`:
`name`, `subtitle`, `tagline`, `description` (array of paragraphs), `funFacts` (array), `geology`, `atmosphere`, etc.

### 3. Register the language in `i18n.js`

```js
// src/i18n/i18n.js
import { ui_de } from './ui.de.js';
const SUPPORTED = ['en', 'tr', 'de'];          // add 'de'
const DICTIONARIES = { en: ui_en, tr: ui_tr, de: ui_de };
```

### 4. Wire planet data in `localizedData.js`

```js
import { planets_de } from './data.de.js';     // if you created one
// Inside getLocalizedPlanet():
if (lang === 'de') overrides = planets_de[key];
```

### 5. Add a language picker button in `index.html`

```html
<button class="lang-btn" data-lang="de">DE</button>
```

### 6. Quiz questions (optional)

Quiz questions live inside `src/data/quiz.js` as a bilingual object.
Add a `questionDe` / `optionsDe` / `explanationDe` field alongside the existing English and Turkish ones.

### 7. Mineral tooltips (optional)

English tooltips are in `src/data/mineralInfo.js`.
Add a sibling export `MINERAL_INFO_DE` with German descriptions and import it in `src/ui/InfoPanel.js`.

---

## Naming Conventions

- **Key format**: `'section.camelCase'` — e.g., `'info.showMore'`, `'stat.mass'`
- **Namespace prefixes**: `aria.*` for screen-reader strings, `a11y.*` for announcements, `attr.*` for physical-attribute labels, `unit.*` for measurement units
- Keys are looked up via `t('key')` at render time, so strings are always in the active language

---

## Locale-Aware Casing

Always use the helpers from `i18n.js` instead of native `String` methods:

```js
import { toUpper, toLower } from '../i18n/i18n.js';
toUpper('istanbul');  // → 'İSTANBUL' in TR, 'ISTANBUL' in EN
toLower('İ');         // → 'i' in TR, 'İ' in EN (dotless-ı handled correctly)
```

---

## Verification Checklist

- [ ] `npm run dev` — switch to new language in picker, check no key shows as raw string
- [ ] All planet names, types, and stats are translated
- [ ] Quiz plays through at least one question in the new language
- [ ] No `console.warn` about missing keys
- [ ] Screen reader announcements (`aria.*` keys) are translated
