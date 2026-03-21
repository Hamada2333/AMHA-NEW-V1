// ─── IN-MEMORY CACHE (Redis substitute) ───
// Provides same API surface as Redis for:
//   - Session storage
//   - Dashboard caching
//   - Recent actions per user (memory layer)
//   - Processing state tracking
// Swap to ioredis for production Redis deployment.

class MemoryCache {
  constructor() {
    this.store = new Map();
    this.lists = new Map();
    this.ttls = new Map();
  }

  // ─── Key-Value Operations ───

  set(key, value, ttlMs = null) {
    this.store.set(key, JSON.stringify(value));
    if (ttlMs) {
      const existing = this.ttls.get(key);
      if (existing) clearTimeout(existing);
      this.ttls.set(key, setTimeout(() => this.del(key), ttlMs));
    }
  }

  get(key) {
    const val = this.store.get(key);
    return val ? JSON.parse(val) : null;
  }

  del(key) {
    this.store.delete(key);
    this.lists.delete(key);
    const timer = this.ttls.get(key);
    if (timer) {
      clearTimeout(timer);
      this.ttls.delete(key);
    }
  }

  exists(key) {
    return this.store.has(key) || this.lists.has(key);
  }

  // ─── List Operations (for recent actions) ───

  lpush(key, ...values) {
    if (!this.lists.has(key)) this.lists.set(key, []);
    const list = this.lists.get(key);
    for (const v of values) {
      list.unshift(JSON.stringify(v));
    }
    return list.length;
  }

  ltrim(key, start, stop) {
    const list = this.lists.get(key);
    if (!list) return;
    const trimmed = list.slice(start, stop + 1);
    this.lists.set(key, trimmed);
  }

  lrange(key, start, stop) {
    const list = this.lists.get(key);
    if (!list) return [];
    const end = stop === -1 ? list.length : stop + 1;
    return list.slice(start, end).map(v => JSON.parse(v));
  }

  llen(key) {
    const list = this.lists.get(key);
    return list ? list.length : 0;
  }

  // ─── Hash Operations (for processing state) ───

  hset(key, field, value) {
    if (!this.store.has(key)) this.store.set(key, '{}');
    const hash = JSON.parse(this.store.get(key));
    hash[field] = value;
    this.store.set(key, JSON.stringify(hash));
  }

  hget(key, field) {
    const val = this.store.get(key);
    if (!val) return null;
    const hash = JSON.parse(val);
    return hash[field] || null;
  }

  hgetall(key) {
    const val = this.store.get(key);
    return val ? JSON.parse(val) : null;
  }

  // ─── Memory Layer: User Actions ───

  async recordUserAction(userId, action) {
    const key = `user:${userId}:actions`;
    this.lpush(key, {
      ...action,
      timestamp: new Date().toISOString(),
    });
    this.ltrim(key, 0, 99); // Keep last 100 actions
  }

  async getUserActions(userId, limit = 50) {
    const key = `user:${userId}:actions`;
    return this.lrange(key, 0, limit - 1);
  }

  // ─── Memory Layer: System Activity ───

  async recordSystemActivity(activity) {
    const key = 'system:activity';
    this.lpush(key, {
      ...activity,
      timestamp: new Date().toISOString(),
    });
    this.ltrim(key, 0, 199); // Keep last 200 system activities
  }

  async getSystemActivity(limit = 50) {
    const key = 'system:activity';
    return this.lrange(key, 0, limit - 1);
  }

  // ─── Dashboard Cache ───

  async cacheDashboard(data) {
    this.set('dashboard:cache', data, 30000); // TTL: 30 seconds
  }

  async getCachedDashboard() {
    return this.get('dashboard:cache');
  }

  // ─── Processing State ───

  async setProcessingState(jobId, state) {
    this.set(`job:${jobId}`, state, 300000); // TTL: 5 minutes
  }

  async getProcessingState(jobId) {
    return this.get(`job:${jobId}`);
  }

  // ─── Stats ───

  getStats() {
    return {
      keys: this.store.size,
      lists: this.lists.size,
      timers: this.ttls.size,
    };
  }
}

// Singleton instance
const cache = new MemoryCache();
export default cache;
