# kotomot-node-sdk

Server-side Node.js client for the [Kotomot](https://kotomot.app) translation API. Read the published translations your apps use — for SSR, build tooling, and CLIs — and import translations back.

## For AI coding agents

Drop [`SKILL.md`](./SKILL.md) into your AI editor / Claude Code workspace and it learns how to use this library. Tells the agent when to reach for it, the install + canonical pattern, the public API, and the gotchas that are easy to miss.

## Install

```bash
npm install kotomot-node-sdk
```

## Quick start

```js
const { KotoClient } = require('kotomot-node-sdk');

const koto = new KotoClient({
  apiKey: process.env.KOTOMOT_API_KEY, // generated in the dashboard
  // baseUrl defaults to https://api.kotomot.app
});

// A flat map: { 'home.hero.title': 'Welcome', ... }
const translations = await koto.getTranslations('your-project', {
  locale: 'en',
  namespace: 'common', // optional
});
```

## Config — `new KotoClient(config)`

| Option | Type | Default | |
|---|---|---|---|
| `apiKey` | `string` | — | **required** |
| `baseUrl` | `string` | `https://api.kotomot.app` | API host |
| `timeout` | `number` (ms) | `30000` | |
| `retryAttempts` | `number` | `3` | |
| `retryDelay` | `number` (ms) | `1000` | exponential backoff base |
| `headers` | `Record<string,string>` | — | merged into every request |
| `cache` | `CacheConfig` | `{ enabled: true, ttl: 3600 }` | `storage: 'memory' \| 'redis' \| 'custom'` |

## Methods

```ts
// Read the published translations for a locale → { keyPath: value }
getTranslations(projectId, { locale, namespace?, environment? }): Promise<Record<string,string>>

// Current published version string (or null)
getVersion(projectId): Promise<string | null>

// Supported locales (source-first), for building a picker
getLocales(projectId): Promise<{ projectId, defaultLocale, locales: LocaleInfo[] }>

// Import translations (requires a key with write:translations)
importTranslations(projectId, { format, content, namespace?, conflictResolution?, createMissingKeys? }): Promise<ApiResponse>
```

Also exported: `CacheManager`, `MemoryCache`, and all types.

## Example: write each locale to disk at build time

```js
const fs = require('fs');
const { KotoClient } = require('kotomot-node-sdk');

const koto = new KotoClient({ apiKey: process.env.KOTOMOT_API_KEY });

const { locales } = await koto.getLocales('your-project');
for (const { code } of locales) {
  const map = await koto.getTranslations('your-project', { locale: code });
  fs.writeFileSync(`./locales/${code}.json`, JSON.stringify(map, null, 2));
}
```

## Notes

- Reads come from the **published** set (what your apps receive). Dashboard edits go live after you publish a version.
- `environment` pins reads to the version deployed to that environment slug.
- CommonJS / Node ≥ 14 (depends on `node-fetch`).

MIT
