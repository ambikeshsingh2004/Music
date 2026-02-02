const { createClient } = require('redis');

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
  console.error('❌ Redis Client Error', err);
});

redisClient.on('connect', () => {
  console.log('✅ Connected to Redis');
});

// Connect to Redis
(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error('Failed to connect to Redis:', err);
  }
})();

// Cache helper functions
const cacheHelpers = {
  // Get cached project version
  async getProjectCache(projectId) {
    try {
      const cached = await redisClient.get(`project:${projectId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (err) {
      console.error('Redis get error:', err);
      return null;
    }
  },

  // Set project cache (expires in 1 hour)
  async setProjectCache(projectId, data) {
    try {
      await redisClient.setEx(
        `project:${projectId}`,
        3600, // 1 hour TTL
        JSON.stringify(data)
      );
    } catch (err) {
      console.error('Redis set error:', err);
    }
  },

  // Invalidate project cache
  async invalidateProjectCache(projectId) {
    try {
      await redisClient.del(`project:${projectId}`);
    } catch (err) {
      console.error('Redis delete error:', err);
    }
  }
};

module.exports = {
  redisClient,
  ...cacheHelpers
};
