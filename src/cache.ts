import { CacheStorage, CacheConfig } from './types';

export class MemoryCache implements CacheStorage {
  private cache: Map<string, { value: any; expiry: number }> = new Map();

  async get(key: string): Promise<any> {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    const expiry = Date.now() + (ttl * 1000);
    this.cache.set(key, { value, expiry });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

export class CacheManager {
  private storage: CacheStorage;
  private enabled: boolean;
  private defaultTTL: number;

  constructor(config: CacheConfig = {}) {
    this.enabled = config.enabled !== false;
    this.defaultTTL = config.ttl || 3600;

    if (config.customStorage) {
      this.storage = config.customStorage;
    } else if (config.storage === 'redis' && config.redisClient) {
      this.storage = new RedisCache(config.redisClient);
    } else {
      this.storage = new MemoryCache();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled) return null;
    
    try {
      const cached = await this.storage.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Cache get error:', error);
    }
    
    return null;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.enabled) return;
    
    try {
      const serialized = JSON.stringify(value);
      await this.storage.set(key, serialized, ttl || this.defaultTTL);
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.enabled) return;
    
    try {
      await this.storage.delete(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async clear(): Promise<void> {
    if (!this.enabled) return;
    
    try {
      await this.storage.clear();
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  getCacheKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join(':');
    return `${prefix}:${sortedParams}`;
  }
}

class RedisCache implements CacheStorage {
  private client: any;

  constructor(redisClient: any) {
    this.client = redisClient;
  }

  async get(key: string): Promise<any> {
    return await this.client.get(key);
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async clear(): Promise<void> {
    await this.client.flushdb();
  }
}