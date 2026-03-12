# Koto Node.js SDK

> **Koto** (言) — Japanese for "word." Every translation starts with a single word. Koto bridges languages one word at a time.

A powerful Node.js SDK for integrating with the Koto Translation Management System. Perfect for backend services, CLI tools, and server-side applications.

## Features

- 💾 **Smart Caching**: Built-in caching with memory, Redis, or custom storage
- 🌐 **Full API Coverage**: Complete access to all Koto API endpoints
- 🔄 **Retry Logic**: Automatic retry with exponential backoff
- 🔐 **Secure Authentication**: API key management with proper auth headers
- 📦 **TypeScript Support**: Full type definitions included
- 🛠️ **Flexible Configuration**: Extensive configuration options
- 📊 **Logging Support**: Built-in logger interface

## Installation

```bash
npm install koto-node-sdk
# or
yarn add koto-node-sdk
# or
pnpm add koto-node-sdk
```

## Quick Start

```javascript
const { KotoClient } = require('koto-node-sdk');

// Initialize client
const client = new KotoClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.your-koto-instance.com',
  projectId: 'your-project-id'
});

// Fetch translations
async function getTranslations() {
  const translations = await client.getTranslations('project-id', {
    locale: 'en',
    namespace: 'common'
  });
  
  console.log(translations);
}
```

## TypeScript Usage

```typescript
import { KotoClient, TranslationOptions } from 'koto-node-sdk';

const client = new KotoClient({
  apiKey: process.env.KOTO_API_KEY!,
  baseUrl: process.env.KOTO_API_URL,
  cache: {
    enabled: true,
    ttl: 3600,
    storage: 'memory'
  }
});

async function fetchTranslations(): Promise<void> {
  const options: TranslationOptions = {
    locale: 'en',
    namespace: 'dashboard',
    includeMetadata: true
  };

  try {
    const translations = await client.getTranslations('project-id', options);
    console.log('Translations:', translations);
  } catch (error) {
    console.error('Failed to fetch translations:', error);
  }
}
```

## Configuration Options

```javascript
const client = new KotoClient({
  // Required
  apiKey: 'your-api-key',
  
  // Optional
  baseUrl: 'https://api.koto.dev',       // Default API URL
  projectId: 'default-project-id',       // Default project ID
  timeout: 30000,                        // Request timeout in ms
  retryAttempts: 3,                      // Number of retry attempts
  retryDelay: 1000,                      // Initial retry delay in ms
  
  // Additional headers
  headers: {
    'X-Custom-Header': 'value'
  },
  
  // Cache configuration
  cache: {
    enabled: true,
    ttl: 3600,                           // Time to live in seconds
    storage: 'memory',                   // 'memory', 'redis', or 'custom'
    redisClient: redisInstance,          // If using Redis
    customStorage: myCustomStorage       // If using custom storage
  }
});
```

## API Methods

### Fetching Translations

```javascript
// Get translations for a locale
const translations = await client.getTranslations('project-id', {
  locale: 'en',
  namespace: 'common',
  fallbackLocale: 'en',
  includeMetadata: true,
  skipEmpty: true
});
```

### Updating Translations

```javascript
// Update a single translation
await client.updateTranslation({
  projectId: 'project-id',
  keyPath: 'common.welcome',
  locale: 'fr',
  translation: 'Bienvenue'
});

// Batch update translations
await client.batchUpdateTranslations({
  projectId: 'project-id',
  locale: 'fr',
  translations: {
    common: {
      welcome: 'Bienvenue',
      goodbye: 'Au revoir'
    }
  }
});
```

### Managing Translation Keys

```javascript
// Create a new translation key
await client.createTranslationKey(
  'project-id',
  'common.newKey',
  {
    en: 'English text',
    fr: 'Texte français',
    es: 'Texto español'
  },
  'common' // namespace
);

// Delete a translation key
await client.deleteTranslationKey(
  'project-id',
  'common.oldKey',
  'common' // namespace
);
```

### Import/Export

```javascript
// Export translations
const exportedData = await client.exportTranslations(
  'project-id',
  'en',
  'json' // or 'yaml', 'csv', 'xliff'
);

// Import translations
await client.importTranslations(
  'project-id',
  'fr',
  translationData,
  'json',
  {
    replace: false,      // Merge instead of replace
    namespace: 'common'
  }
);
```

### Project Information

```javascript
// Get project info
const projectInfo = await client.getProjectInfo('project-id');
console.log('Available locales:', projectInfo.locales);
console.log('Default locale:', projectInfo.defaultLocale);
```

## Caching

### Memory Cache (Default)

```javascript
const client = new KotoClient({
  apiKey: 'your-api-key',
  cache: {
    enabled: true,
    ttl: 3600,
    storage: 'memory'
  }
});
```

### Redis Cache

```javascript
const redis = require('redis');
const redisClient = redis.createClient();

const client = new KotoClient({
  apiKey: 'your-api-key',
  cache: {
    enabled: true,
    ttl: 3600,
    storage: 'redis',
    redisClient: redisClient
  }
});
```

### Custom Cache Storage

```javascript
class MyCustomCache {
  async get(key) {
    // Your implementation
  }
  
  async set(key, value, ttl) {
    // Your implementation
  }
  
  async delete(key) {
    // Your implementation
  }
  
  async clear() {
    // Your implementation
  }
}

const client = new KotoClient({
  apiKey: 'your-api-key',
  cache: {
    enabled: true,
    customStorage: new MyCustomCache()
  }
});
```

## Logging

```javascript
// Custom logger implementation
const logger = {
  debug: (message, data) => console.debug(`[DEBUG] ${message}`, data),
  info: (message, data) => console.info(`[INFO] ${message}`, data),
  warn: (message, data) => console.warn(`[WARN] ${message}`, data),
  error: (message, error) => console.error(`[ERROR] ${message}`, error)
};

client.setLogger(logger);
```

## Error Handling

```javascript
try {
  const translations = await client.getTranslations('project-id', {
    locale: 'en'
  });
} catch (error) {
  if (error.message.includes('401')) {
    console.error('Authentication failed: Invalid API key');
  } else if (error.message.includes('404')) {
    console.error('Project not found');
  } else if (error.message.includes('timeout')) {
    console.error('Request timed out');
  } else {
    console.error('An error occurred:', error.message);
  }
}
```

## Environment Variables

```javascript
// .env file
KOTO_API_KEY=your-api-key
KOTO_API_URL=https://api.your-koto-instance.com
KOTO_PROJECT_ID=your-project-id

// Usage
const client = new KotoClient({
  apiKey: process.env.KOTO_API_KEY,
  baseUrl: process.env.KOTO_API_URL,
  projectId: process.env.KOTO_PROJECT_ID
});
```

## CLI Usage Example

```javascript
#!/usr/bin/env node

const { KotoClient } = require('koto-node-sdk');
const fs = require('fs').promises;

async function syncTranslations() {
  const client = new KotoClient({
    apiKey: process.env.KOTO_API_KEY
  });

  // Download translations
  const translations = await client.getTranslations('project-id', {
    locale: 'en',
    namespace: 'common'
  });

  // Save to file
  await fs.writeFile(
    './translations/en.json',
    JSON.stringify(translations, null, 2)
  );

  console.log('Translations synced successfully!');
}

syncTranslations().catch(console.error);
```

## Express.js Middleware Example

```javascript
const express = require('express');
const { KotoClient } = require('koto-node-sdk');

const app = express();
const kotoClient = new KotoClient({
  apiKey: process.env.KOTO_API_KEY
});

// Middleware to inject translations
app.use(async (req, res, next) => {
  const locale = req.headers['accept-language']?.split('-')[0] || 'en';
  
  try {
    req.translations = await kotoClient.getTranslations('project-id', {
      locale,
      fallbackLocale: 'en'
    });
  } catch (error) {
    console.error('Failed to load translations:', error);
    req.translations = {};
  }
  
  next();
});

// Use translations in routes
app.get('/api/greeting', (req, res) => {
  const greeting = req.translations?.common?.greeting || 'Hello';
  res.json({ message: greeting });
});
```

## Testing

```javascript
// Mock the client for testing
jest.mock('koto-node-sdk');

const { KotoClient } = require('koto-node-sdk');

describe('Translation Service', () => {
  it('should fetch translations', async () => {
    const mockClient = {
      getTranslations: jest.fn().mockResolvedValue({
        common: { welcome: 'Welcome' }
      })
    };
    
    KotoClient.mockImplementation(() => mockClient);
    
    // Your test code
  });
});
```

## Requirements

- Node.js >= 14.0.0
- npm >= 6.0.0

## License

MIT