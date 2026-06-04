export interface KotoConfig {
  /** A key generated in the dashboard. Required. */
  apiKey: string;
  /** API host. Defaults to https://api.kotomot.app. */
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
  cache?: CacheConfig;
}

export interface CacheConfig {
  enabled?: boolean;
  ttl?: number; // seconds
  storage?: 'memory' | 'redis' | 'custom';
  redisClient?: any;
  customStorage?: CacheStorage;
}

export interface CacheStorage {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

/** Options for {@link KotoClient.getTranslations}. */
export interface TranslationOptions {
  locale: string;
  /** Filter to a single namespace. */
  namespace?: string;
  /** Serve the version pinned to this environment slug. */
  environment?: string;
}

/** Options for {@link KotoClient.importTranslations}. */
export interface ImportOptions {
  /** Content format, e.g. 'json' or 'csv'. */
  format: string;
  /** The file contents as a string (locales are encoded in the content). */
  content: string;
  /** Assign imported keys to this namespace. */
  namespace?: string;
  /** What to do when a key already exists. Defaults to 'replace'. */
  conflictResolution?: 'replace' | 'skip';
  /** Create keys that don't exist yet. Defaults to true. */
  createMissingKeys?: boolean;
}

export interface LocaleInfo {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  direction: 'ltr' | 'rtl';
  isDefault: boolean;
}

export interface LocalesResponse {
  projectId: string;
  defaultLocale: string | null;
  locales: LocaleInfo[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  query?: Record<string, any>;
  timeout?: number;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, error?: any): void;
}
