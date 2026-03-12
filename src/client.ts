import fetch, { RequestInit } from 'node-fetch';
import {
  KotoConfig,
  TranslationOptions, 
  UpdateTranslationOptions,
  BatchUpdateOptions,
  ApiResponse,
  ProjectInfo,
  RequestOptions,
  Logger
} from './types';
import { CacheManager } from './cache';

export class KotoClient {
  private config: KotoConfig;
  private cache: CacheManager;
  private logger: Logger | null = null;

  constructor(config: KotoConfig) {
    if (!config.apiKey) {
      throw new Error('API key is required');
    }

    this.config = {
      baseUrl: 'https://api.koto.dev',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };

    this.cache = new CacheManager(config.cache);
  }

  /**
   * Set a custom logger
   */
  setLogger(logger: Logger): void {
    this.logger = logger;
  }

  /**
   * Get translations for a project
   */
  async getTranslations(
    projectId: string,
    options: TranslationOptions
  ): Promise<any> {
    const cacheKey = this.cache.getCacheKey('translations', {
      projectId,
      ...options
    });

    // Check cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      this.log('debug', 'Returning cached translations', { cacheKey });
      return cached;
    }

    const query = new URLSearchParams({
      projectId,
      locale: options.locale,
      ...(options.namespace && { namespace: options.namespace }),
      ...(options.fallbackLocale && { fallbackLocale: options.fallbackLocale }),
      ...(options.includeMetadata && { include_metadata: 'true' }),
      ...(options.skipEmpty && { skip_empty: 'true' })
    });

    const response = await this.request('/api/v1/translations', {
      method: 'GET',
      query: Object.fromEntries(query)
    });

    if (response.success && response.data) {
      // Cache the successful response
      await this.cache.set(cacheKey, response.data);
    }

    return response.data;
  }

  /**
   * Update a single translation
   */
  async updateTranslation(options: UpdateTranslationOptions): Promise<ApiResponse> {
    const response = await this.request('/api/v1/translations/update', {
      method: 'PUT',
      body: options
    });

    // Clear related cache
    await this.clearTranslationCache(options.projectId, options.locale);

    return response;
  }

  /**
   * Batch update translations
   */
  async batchUpdateTranslations(options: BatchUpdateOptions): Promise<ApiResponse> {
    const response = await this.request('/api/v1/translations', {
      method: 'POST',
      body: options
    });

    // Clear related cache
    await this.clearTranslationCache(options.projectId, options.locale);

    return response;
  }

  /**
   * Get project information
   */
  async getProjectInfo(projectId: string): Promise<ProjectInfo> {
    const cacheKey = this.cache.getCacheKey('project', { projectId });
    
    const cached = await this.cache.get<ProjectInfo>(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await this.request(`/api/v1/projects/${projectId}`, {
      method: 'GET'
    });

    if (response.success && response.data) {
      await this.cache.set(cacheKey, response.data, 3600); // Cache for 1 hour
      return response.data;
    }

    throw new Error(response.error || 'Failed to fetch project info');
  }

  /**
   * Create a new translation key
   */
  async createTranslationKey(
    projectId: string,
    keyPath: string,
    translations: Record<string, string>,
    namespace?: string
  ): Promise<ApiResponse> {
    const response = await this.request('/api/v1/translations/key', {
      method: 'POST',
      body: {
        projectId,
        keyPath,
        translations,
        namespace
      }
    });

    // Clear cache for all affected locales
    for (const locale of Object.keys(translations)) {
      await this.clearTranslationCache(projectId, locale);
    }

    return response;
  }

  /**
   * Delete a translation key
   */
  async deleteTranslationKey(
    projectId: string,
    keyPath: string,
    namespace?: string
  ): Promise<ApiResponse> {
    const response = await this.request('/api/v1/translations/key', {
      method: 'DELETE',
      body: {
        projectId,
        keyPath,
        namespace
      }
    });

    // Clear all cache for this project
    await this.cache.clear();

    return response;
  }

  /**
   * Export translations in various formats
   */
  async exportTranslations(
    projectId: string,
    locale: string,
    format: 'json' | 'yaml' | 'csv' | 'xliff' = 'json'
  ): Promise<any> {
    const response = await this.request('/api/v1/translations/export', {
      method: 'GET',
      query: {
        projectId,
        locale,
        format
      }
    });

    return response.data;
  }

  /**
   * Import translations from file
   */
  async importTranslations(
    projectId: string,
    locale: string,
    data: any,
    format: 'json' | 'yaml' | 'csv' | 'xliff' = 'json',
    options: { replace?: boolean; namespace?: string } = {}
  ): Promise<ApiResponse> {
    const response = await this.request('/api/v1/translations/import', {
      method: 'POST',
      body: {
        projectId,
        locale,
        data,
        format,
        ...options
      }
    });

    // Clear cache for this project and locale
    await this.clearTranslationCache(projectId, locale);

    return response;
  }

  /**
   * Clear translation cache
   */
  private async clearTranslationCache(projectId: string, locale?: string): Promise<void> {
    if (locale) {
      const cacheKey = this.cache.getCacheKey('translations', { projectId, locale });
      await this.cache.delete(cacheKey);
    } else {
      // Clear all cache if no locale specified
      await this.cache.clear();
    }
  }

  /**
   * Make HTTP request with retry logic
   */
  private async request(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse> {
    const url = new URL(endpoint, this.config.baseUrl);
    
    // Add query parameters
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
        ...this.getAuthHeaders(options.method),
        ...this.config.headers,
        ...options.headers
      },
      timeout: options.timeout || this.config.timeout
    };

    if (options.body) {
      requestOptions.body = JSON.stringify(options.body);
    }

    let lastError: Error | null = null;
    const retryAttempts = this.config.retryAttempts || 3;
    const retryDelay = this.config.retryDelay || 1000;

    for (let attempt = 0; attempt < retryAttempts; attempt++) {
      try {
        this.log('debug', `Making request to ${url.toString()}`, {
          method: requestOptions.method,
          attempt: attempt + 1
        });

        const response = await fetch(url.toString(), requestOptions);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        return {
          success: true,
          data: data.translations || data
        };
      } catch (error) {
        lastError = error as Error;
        this.log('warn', `Request failed (attempt ${attempt + 1}/${retryAttempts})`, {
          error: lastError.message
        });

        if (attempt < retryAttempts - 1) {
          await this.delay(retryDelay * Math.pow(2, attempt)); // Exponential backoff
        }
      }
    }

    this.log('error', 'All request attempts failed', { error: lastError?.message });
    
    return {
      success: false,
      error: lastError?.message || 'Request failed after all retry attempts'
    };
  }

  /**
   * Get authentication headers based on request method
   */
  private getAuthHeaders(method?: string): Record<string, string> {
    if (method === 'GET') {
      return { 'X-API-Key': this.config.apiKey };
    } else {
      return { 'Authorization': `Bearer ${this.config.apiKey}` };
    }
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Internal logging
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    if (this.logger) {
      this.logger[level](message, data);
    } else if (process.env.NODE_ENV === 'development') {
      console[level](`[Koto SDK] ${message}`, data || '');
    }
  }
}