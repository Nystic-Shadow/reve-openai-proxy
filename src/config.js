require('dotenv').config();

// Automatically scan for all TOKEN_1, TOKEN_2, TOKEN_3, ... in environment
function loadTokensFromEnv() {
  const tokens = [];

  // Look for TOKEN_1 .. TOKEN_100
  let index = 1;
  while (process.env[`TOKEN_${index}`]) {
    const token = process.env[`TOKEN_${index}`].trim();
    if (token) {
      tokens.push({
        envKey: `TOKEN_${index}`,
        token,
      });
    }
    index++;
  }

  // Fallback for REVE_TOKEN / REVE_BEARER_TOKEN / TOKEN
  if (tokens.length === 0) {
    const fallback =
      process.env.REVE_TOKEN ||
      process.env.REVE_BEARER_TOKEN ||
      process.env.TOKEN;
    if (fallback && fallback.trim()) {
      tokens.push({
        envKey: 'TOKEN',
        token: fallback.trim(),
      });
    }
  }

  return tokens;
}

const config = {
  port: parseInt(process.env.PORT || '5674', 10),
  host: process.env.HOST || '0.0.0.0',
  apiKey: process.env.PROXY_API_KEY || null, // Optional secret key (if null, any dummy key is accepted)
  tokens: loadTokensFromEnv(),
  baseUrl: 'https://app.reve.com',
  syncIntervalMinutes: parseInt(process.env.SYNC_INTERVAL_MINUTES || '30', 10),
  maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),

  // OpenAI-Compatible Native Reve Models Catalog
  models: [
    {
      id: 'reve-1',
      object: 'model',
      created: 1714521600,
      owned_by: 'reve',
      permission: [],
      root: 'reve-1',
      parent: null,
    },
    {
      id: 'reve-2',
      object: 'model',
      created: 1714521600,
      owned_by: 'reve',
      permission: [],
      root: 'reve-2',
      parent: null,
    },
    {
      id: 'reve-preview',
      object: 'model',
      created: 1714521600,
      owned_by: 'reve',
      permission: [],
      root: 'reve-preview',
      parent: null,
    },
    {
      id: 'reve-fast',
      object: 'model',
      created: 1714521600,
      owned_by: 'reve',
      permission: [],
      root: 'reve-fast',
      parent: null,
    },
  ],

  // Aspect ratio to resolution mapping
  aspectRatios: {
    '1:1': { width: 1024, height: 1024 },
    'square': { width: 1024, height: 1024 },
    '16:9': { width: 1280, height: 720 },
    'landscape': { width: 1280, height: 720 },
    '9:16': { width: 720, height: 1280 },
    'portrait': { width: 720, height: 1280 },
    '21:9': { width: 1680, height: 720 },
    '4:3': { width: 1024, height: 768 },
    '3:4': { width: 768, height: 1024 },
    '3:2': { width: 1200, height: 800 },
    '2:3': { width: 800, height: 1200 },
  },
};

module.exports = config;
