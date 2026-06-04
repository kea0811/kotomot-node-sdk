import fetch, { RequestInit } from 'node-fetch';
import {
  KotoConfig,
  TranslationOptions,
  ImportOptions,
  LocalesResponse,
  ApiResponse,
  RequestOptions,
  Logger,
  LogLevel,
} from './types';
import { CacheManager } from './cache';

/**
 * Server-side client for the Kotomot translation API.
 *
 * Reads the published translations a project serves to its apps, and (with a
 * key that has `write:translations`) imports translations back. Designed for
 * SSR, build tooling, and CLIs.
 */
export class KotoClient {
  private config: KotoConfig;
  private cache: CacheManager;
  private logger: Logger | null = null;

  constructor(config: KotoConfig) {
    if (!config.apiKey) {
      throw new Error('API key is required');
    }

    this.config = {
      baseUrl: 'https://api.kotomot.app',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config,
    };

    this.cache = new CacheManager(config.cache);
  }

  /** Install a custom logger. */
  setLogger(logger: Logger): void {
    this.logger = logger;
  }

  /**
   * Fetch the published translations for a locale.
   * GET /v1/translations
   * @returns a flat map of `{ keyPath: value }`.
   */
  async getTranslations(
    projectId: string,
    options: TranslationOptions
  ): Promise<Record<string, string>> {
    const cacheKey = this.cache.getCacheKey('translations', { projectId, ...options });

    const cached = await this.cache.get<Record<string, string>>(cacheKey);
    if (cached) {
      this.log('debug', 'Returning cached translations', { cacheKey });
      return cached;
    }

    const res = await this.request('/v1/translations', {
      method: 'GET',
      query: {
        projectId,
        locale: options.locale,
        ...(options.namespace ? { namespace: options.namespace } : {}),
        ...(options.environment ? { environment: options.environment } : {}),
      },
    });

    if (!res.success) {
      throw new Error(res.error || 'Failed to fetch translations');
    }

    const translations: Record<string, string> = (res.data && res.data.translations) || {};
    await this.cache.set(cacheKey, translations);
    return translations;
  }

  /**
   * The project's current published version string (or null).
   * GET /v1/translations/version
   */
  async getVersion(projectId: string): Promise<string | null> {
    const res = await this.request('/v1/translations/version', {
      method: 'GET',
      query: { projectId },
    });
    return res.success && res.data ? (res.data.version ?? null) : null;
  }

  /**
   * The locales a project supports (source-first), for building a picker.
   * GET /v1/locales
   */
  async getLocales(projectId: string): Promise<LocalesResponse> {
    const res = await this.request('/v1/locales', {
      method: 'GET',
      query: { projectId },
    });
    if (!res.success) {
      throw new Error(res.error || 'Failed to fetch locales');
    }
    return res.data as LocalesResponse;
  }

  /**
   * Import translations into a project. Requires a key with `write:translations`.
   * POST /projects/:projectId/import/apply
   *
   * `content` is a JSON/CSV string in the same shape the dashboard import
   * accepts (the locales are encoded in the content).
   */
  async importTranslations(projectId: string, options: ImportOptions): Promise<ApiResponse> {
    const res = await this.request(`/projects/${encodeURIComponent(projectId)}/import/apply`, {
      method: 'POST',
      body: {
        format: options.format,
        content: options.content,
        ...(options.namespace ? { namespace: options.namespace } : {}),
        conflictResolution: options.conflictResolution ?? 'replace',
        createMissingKeys: options.createMissingKeys ?? true,
      },
    });
    // The imported content is now live — drop any cached reads for this project.
    await this.cache.clear();
    return res;
  }

  /**
   * Make an HTTP request with retry/backoff. Returns the raw parsed JSON in
   * `data`; callers unwrap the field they need.
   */
  private async request(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse> {
    const url = new URL(endpoint, this.config.baseUrl);

    if (options.query) {
      Object.entries(options.query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const requestOptions: RequestInit = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        ...this.config.headers,
        ...options.headers,
      },
      timeout: options.timeout || this.config.timeout,
    };

    if (options.body) {
      requestOptions.body = JSON.stringify(options.body);
    }

    let lastError: Error | null = null;
    const retryAttempts = this.config.retryAttempts || 3;
    const retryDelay = this.config.retryDelay || 1000;

    for (let attempt = 0; attempt < retryAttempts; attempt++) {
      try {
        this.log('debug', `Request ${requestOptions.method} ${url.toString()}`, { attempt: attempt + 1 });

        const response = await fetch(url.toString(), requestOptions);
        const data: any = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        return { success: true, data };
      } catch (error) {
        lastError = error as Error;
        this.log('warn', `Request failed (attempt ${attempt + 1}/${retryAttempts})`, { error: lastError.message });
        if (attempt < retryAttempts - 1) {
          await this.delay(retryDelay * Math.pow(2, attempt));
        }
      }
    }

    this.log('error', 'All request attempts failed', { error: lastError?.message });
    return { success: false, error: lastError?.message || 'Request failed after all retry attempts' };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (this.logger) {
      this.logger[level](message, data);
    } else if (process.env.NODE_ENV === 'development') {
      console[level](`[Kotomot SDK] ${message}`, data || '');
    }
  }
}
