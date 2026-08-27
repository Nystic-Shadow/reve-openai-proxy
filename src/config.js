const dotenv = require('dotenv');
dotenv.config();

/**
 * Parses all tokens configured in process.env
 * Matches TOKEN_1, TOKEN_2, TOKEN_3, ..., TOKEN_N, or REVE_TOKEN_*, etc.
 */
function extractTokens() {
  const tokens = [];
  const tokenMap = {};

  // Sort keys so TOKEN_1, TOKEN_2, TOKEN_10 are ordered sensibly
  const keys = Object.keys(process.env).sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, '') || '0', 10);
    const numB = parseInt(b.replace(/\D/g, '') || '0', 10);
    return numA - numB;
  });

  for (const key of keys) {
    if (/^(TOKEN_\d+|REVE_TOKEN_\d+|TOKEN_[A-Z0-9_]+|REVE_TOKEN)$/i.test(key)) {
      const val = (process.env[key] || '').trim();
      if (val && !tokenMap[val]) {
        tokenMap[val] = true;
        tokens.push({
          envKey: key,
          token: val,
        });
      }
    }
  }

  // Also support comma-separated REVE_TOKENS
  if (process.env.REVE_TOKENS) {
    const splitTokens = process.env.REVE_TOKENS.split(',');
    for (let i = 0; i < splitTokens.length; i++) {
      const val = splitTokens[i].trim();
      if (val && !tokenMap[val]) {
        tokenMap[val] = true;
        tokens.push({
          envKey: `REVE_TOKENS[${i + 1}]`,
          token: val,
        });
      }
    }
  }

  return tokens;
}

const config = {
  port: parseInt(process.env.PORT || '5674', 10),
  host: process.env.HOST || '0.0.0.0',
  proxyApiKey: process.env.PROXY_API_KEY ? process.env.PROXY_API_KEY.trim() : null,
  maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
  syncIntervalMinutes: parseInt(process.env.SYNC_INTERVAL_MINUTES || '15', 10),
  baseUrl: 'https://app.reve.com',
  tokens: extractTokens(),

  aspectRatios: {
    '1:1': { width: 1024, height: 1024 },
    '16:9': { width: 1280, height: 720 },
    '9:16': { width: 720, height: 1280 },
    '4:3': { width: 1280, height: 960 },
    '3:4': { width: 960, height: 1280 },
    '3:2': { width: 1248, height: 832 },
    '2:3': { width: 832, height: 1248 },
    '4:5': { width: 1024, height: 1280 },
    '5:4': { width: 1280, height: 1024 },
    '2:1': { width: 1440, height: 720 },
    '1:2': { width: 720, height: 1440 },
    '21:9': { width: 1680, height: 720 },
    '17:9': { width: 1360, height: 720 },
  },

  models: [
    {
      id: 'dall-e-3',
      object: 'model',
      created: 1700000000,
      owned_by: 'openai',
      description: 'DALL-E 3 flagship image generation model (Routed to Reve engine)',
      capabilities: ['text2image', 'img2img', 'edits'],
    },
    {
      id: 'dall-e-2',
      object: 'model',
      created: 1680000000,
      owned_by: 'openai',
      description: 'DALL-E 2 standard image model (Routed to Reve engine)',
      capabilities: ['text2image', 'img2img', 'edits'],
    },
    {
      id: 'reve-1',
      object: 'model',
      created: 1700000000,
      owned_by: 'reve',
      description: 'Default stable Reve text-to-image and image editing model',
      max_aspect_ratios: ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '4:5', '5:4', '2:1', '1:2', '21:9', '17:9'],
      capabilities: ['text2image', 'img2img', 'edits'],
    },
    {
      id: 'reve-2',
      object: 'model',
      created: 1715000000,
      owned_by: 'reve',
      description: 'Reve Next-Gen flagship model with enhanced composition',
      max_aspect_ratios: ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '4:5', '5:4', '2:1', '1:2', '21:9', '17:9'],
      capabilities: ['text2image', 'img2img', 'edits'],
    },
    {
      id: 'reve-preview',
      object: 'model',
      created: 1715000000,
      owned_by: 'reve',
      description: 'Alias for Reve 2.0 preview engine',
      capabilities: ['text2image', 'img2img', 'edits'],
    },
    {
      id: 'reve-fast',
      object: 'model',
      created: 1710000000,
      owned_by: 'reve',
      description: 'Fast turbo generation model for rapid iterations',
      capabilities: ['text2image'],
    },
  ],
};

module.exports = config;
