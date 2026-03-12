export interface KotoConfig {
  apiKey: string;
  baseUrl?: string;
  projectId?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
  cache?: CacheConfig;
}

export interface CacheConfig {
  enabled?: boolean;
  ttl?: number; // Time to live in seconds
  storage?: 'memory' | 'redis' | 'custom';
  redisClient?: any; // Redis client instance if using redis
  customStorage?: CacheStorage;
}

export interface CacheStorage {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface TranslationOptions {
  locale: string;
  namespace?: string;
  fallbackLocale?: string;
  includeMetadata?: boolean;
  skipEmpty?: boolean;
}

export interface UpdateTranslationOptions {
  projectId: string;
  keyPath: string;
  locale: string;
  translation: string;
  namespace?: string;
}

export interface BatchUpdateOptions {
  projectId: string;
  locale: string;
  translations: Record<string, any>;
  namespace?: string;
  replace?: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface Translation {
  key: string;
  value: string;
  locale: string;
  namespace?: string;
  metadata?: TranslationMetadata;
}

export interface TranslationMetadata {
  lastModified?: Date;
  author?: string;
  version?: string;
  status?: 'draft' | 'published' | 'archived';
  tags?: string[];
}

export interface ProjectInfo {
  id: string;
  name: string;
  locales: string[];
  defaultLocale: string;
  namespaces?: string[];
  createdAt: Date;
  updatedAt: Date;
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