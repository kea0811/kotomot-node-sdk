---
name: kotomot-node-sdk
description: Use when the user wants to integrate Kotomot (hosted translation management) into a Node.js app for SSR, build tooling, or CLIs. Read published translations + import translations back. Sibling SDKs exist for React (`kotomot-react`), React Native (`kotomot-react-native`), and Flutter (`kotomot_flutter`).
---

# kotomot-node-sdk

Server-side Node.js client for the [Kotomot](https://kotomot.app) translation management API. Reads the **published** version of translations (what your apps actually receive) and imports translations back.

## When to reach for this

User says:
- "add i18n to my Next.js / Express / Astro app"
- "read translations at SSR / build time"
- "import translations back from a CSV / JSON"
- "translation management with a real dashboard, not a JSON file"

For a different host environment, point them at the matching SDK:
- React (browser) → `kotomot-react`
- React Native → `kotomot-react-native`
- Flutter → `kotomot_flutter`

## Install

```bash
npm install kotomot-node-sdk
```

Node 14+. CommonJS + types.

## Quick start

```ts
import { KotoClient } from 'kotomot-node-sdk';

const koto = new KotoClient({
  apiKey: process.env.KOTOMOT_API_KEY!,  // generate in the dashboard
  // baseUrl: 'https://api.kotomot.app',  // default
});

// Flat map: { 'home.hero.title': 'Welcome', … }
const t = await koto.getTranslations('your-project-id', {
  locale: 'en',
  namespace: 'common',         // optional
  environment: 'production',   // optional — pins to a published version
});
```

## Build-time write each locale to disk

```ts
import { writeFileSync } from 'fs';
import { KotoClient } from 'kotomot-node-sdk';

const koto = new KotoClient({ apiKey: process.env.KOTOMOT_API_KEY! });
const { locales } = await koto.getLocales('your-project');
for (const { code } of locales) {
  const map = await koto.getTranslations('your-project', { locale: code });
  writeFileSync(`./locales/${code}.json`, JSON.stringify(map, null, 2));
}
```

## Methods

| Method | Returns | Notes |
|---|---|---|
| `getTranslations(projectId, { locale, namespace?, environment? })` | `Record<string,string>` | The flat keyPath → value map for the published version |
| `getVersion(projectId)` | `string \| null` | Current published version string |
| `getLocales(projectId)` | `{ defaultLocale, locales: LocaleInfo[] }` | Source locale + all supported ones |
| `importTranslations(projectId, { format, content, namespace?, conflictResolution?, createMissingKeys? })` | `ApiResponse` | Requires a key with `write:translations` scope |

Also exported: `CacheManager`, `MemoryCache`, all types.

## Config — `new KotoClient(config)`

| Option | Default | Notes |
|---|---|---|
| `apiKey` | required | Generated in the dashboard |
| `baseUrl` | `https://api.kotomot.app` | |
| `timeout` (ms) | `30000` | |
| `retryAttempts` | `3` | |
| `retryDelay` (ms) | `1000` | Exponential backoff base |
| `cache` | `{ enabled: true, ttl: 3600 }` | `storage: 'memory' \| 'redis' \| 'custom'` |
| `headers` | — | Merged into every request |

## Gotchas worth knowing

1. **Reads come from the PUBLISHED set, not the live dashboard.** Edits in the dashboard go live only after you publish a version. This boundary is deliberate — your prod app reads a pinned version, not whatever's mid-edit.
2. **Pin environments to a version.** Pass `environment: 'production'` (or any env slug) to read whatever version is pinned to that env. Without it, you get the latest published.
3. **The cache config swaps storage backends.** `'memory'` (default) is per-process. For multi-instance servers, switch to `'redis'` so all instances share a cache.
4. **`importTranslations` needs a different API key scope** (`write:translations`). Don't reuse the read key for imports.

## Links

- npm: https://www.npmjs.com/package/kotomot-node-sdk
- platform: https://kotomot.app
- repo: https://github.com/kea0811/kotomot-node-sdk
- sibling SDKs:
  - `kotomot-react` (browser React)
  - `kotomot-react-native`
  - `kotomot_flutter`
