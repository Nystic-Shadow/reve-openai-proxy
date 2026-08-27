const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const config = require('../config');
const accountManager = require('../accountManager');
const reveClient = require('../reveClient');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
});

function uuidv4() {
  return crypto.randomUUID();
}

// In-memory image cache for response_format='url'
const imageCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function cacheImage(buffer, mimeType = 'image/webp') {
  const id = uuidv4();
  imageCache.set(id, {
    buffer,
    mimeType,
    createdAt: Date.now(),
  });
  // Auto-cleanup
  setTimeout(() => imageCache.delete(id), CACHE_TTL_MS);
  return id;
}

/**
 * Image Cache serving route
 */
router.get('/images/cache/:id.png', (req, res) => {
  const item = imageCache.get(req.params.id);
  if (!item) {
    return res.status(404).json({
      error: {
        message: 'Image not found or expired from cache',
        type: 'invalid_request_error',
        code: 'not_found',
      },
    });
  }
  res.setHeader('Content-Type', item.mimeType);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.send(item.buffer);
});

/**
 * Ultra-High-Quality (UHQ) Dimension Resolver
 * Renders native high-definition canvases for maximum clarity and detail
 */
function resolveDimensions(sizeStr, aspectRatioStr, quality = 'hd') {
  const isHd = quality === 'hd' || quality === 'uhd' || quality === 'high' || !quality;

  if (aspectRatioStr && config.aspectRatios[aspectRatioStr]) {
    const base = config.aspectRatios[aspectRatioStr];
    return isHd ? { width: base.width * (base.width <= 1280 ? 2 : 1), height: base.height * (base.height <= 1280 ? 2 : 1) } : base;
  }

  if (sizeStr) {
    const s = sizeStr.toLowerCase().trim();
    if (config.aspectRatios[s]) {
      const base = config.aspectRatios[s];
      return isHd ? { width: base.width * (base.width <= 1280 ? 2 : 1), height: base.height * (base.height <= 1280 ? 2 : 1) } : base;
    }
    if (s === '1792x1024' || s === 'landscape') {
      return { width: 2560, height: 1440 }; // 2K QHD Widescreen
    }
    if (s === '1024x1792' || s === 'portrait') {
      return { width: 1440, height: 2560 }; // 2K QHD Portrait
    }
    if (s === '1024x1024' || s === 'square') {
      return { width: 2048, height: 2048 }; // 2K Square UHD
    }
    if (s === '512x512' || s === '256x256') {
      return { width: 1024, height: 1024 };
    }
    if (s.includes('x')) {
      const [wStr, hStr] = s.split('x');
      const w = parseInt(wStr, 10);
      const h = parseInt(hStr, 10);
      if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
        return { width: w, height: h };
      }
    }
  }

  // Default Ultra High Quality 2K Canvas
  return { width: 2048, height: 2048 };
}

/**
 * Model version resolver
 */
function resolveModelVersion(modelName) {
  const m = (modelName || '').toLowerCase();
  if (m === 'reve-2' || m === 'reve-preview') {
    return 'v2';
  }
  return 'v1';
}

/**
 * Helper to generate a single image with multi-account retry & failover
 */
async function generateSingleWithRetry({ prompt, width, height, modelVersion, referenceImageId = null }) {
  let lastError = null;
  const excludedAccountIds = [];

  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    const account = accountManager.getAccount(excludedAccountIds);
    if (!account) {
      throw new Error('No active Reve accounts available with sufficient energy');
    }

    try {
      let projectId = account.defaultProject;
      if (!projectId) {
        const cfg = await reveClient.getFeatureConfig(account.token);
        projectId = cfg.user_info?.default_project;
        account.defaultProject = projectId;
      }

      if (!projectId) {
        throw new Error(`Account ${account.id} has no default_project configured on Reve`);
      }

      const result = await reveClient.generateImageWorkflow({
        token: account.token,
        projectId,
        prompt,
        width,
        height,
        modelVersion,
        referenceImageId,
      });

      accountManager.recordSuccess(account.id, 15000);
      return { result, accountId: account.id };
    } catch (err) {
      lastError = err;
      accountManager.recordFailure(account.id, err);
      excludedAccountIds.push(account.id);
      console.warn(
        `⚠️  [Attempt ${attempt + 1}] Account ${account.id} (${account.envKey}) failed: ${err.message}. Failing over to next account...`
      );
    }
  }

  throw new Error(`Image generation failed after ${config.maxRetries} attempts across accounts: ${lastError?.message}`);
}

/**
 * GET /v1/models
 */
router.get('/models', (req, res) => {
  res.json({
    object: 'list',
    data: config.models,
  });
});

/**
 * GET /v1/models/:modelId
 */
router.get('/models/:modelId', (req, res) => {
  const model = config.models.find(
    (m) => m.id.toLowerCase() === req.params.modelId.toLowerCase()
  );
  if (!model) {
    return res.status(404).json({
      error: {
        message: `Model '${req.params.modelId}' does not exist`,
        type: 'invalid_request_error',
        param: 'model',
        code: 'model_not_found',
      },
    });
  }
  res.json(model);
});

/**
 * POST /v1/images/generations
 * Ultra High Quality (UHQ) Text-to-Image with parallel multi-account batching
 */
router.post('/images/generations', async (req, res) => {
  try {
    const {
      prompt,
      model = 'reve-1',
      n = 1,
      size = '1024x1024',
      quality = 'hd',
      aspect_ratio,
      response_format = 'b64_json',
    } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({
        error: {
          message: "'prompt' is required and cannot be empty",
          type: 'invalid_request_error',
          param: 'prompt',
          code: 'missing_required_parameter',
        },
      });
    }

    const numImages = Math.min(Math.max(parseInt(n, 10) || 1, 1), 10);
    const { width, height } = resolveDimensions(size, aspect_ratio, quality);
    const modelVersion = resolveModelVersion(model);
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // Parallel multi-account image generation
    const tasks = Array.from({ length: numImages }).map(() =>
      generateSingleWithRetry({
        prompt: prompt.trim(),
        width,
        height,
        modelVersion,
      })
    );

    const outcomes = await Promise.all(tasks);

    // Save used account IDs for rich logger
    req._usedAccountId = outcomes.map((o) => o.accountId).join(', ');

    const generatedItems = outcomes.map(({ result }) => {
      if (response_format === 'url') {
        const cacheId = cacheImage(result.buffer, result.mimeType);
        return {
          url: `${baseUrl}/v1/images/cache/${cacheId}.png`,
        };
      }
      return {
        b64_json: result.base64,
      };
    });

    return res.json({
      created: Math.floor(Date.now() / 1000),
      data: generatedItems,
    });
  } catch (err) {
    console.error('❌ /v1/images/generations Error:', err.message);
    return res.status(500).json({
      error: {
        message: err.message || 'Internal server error during image generation',
        type: 'api_error',
        code: 'generation_failed',
      },
    });
  }
});

/**
 * POST /v1/images/edits
 * Ultra High Quality Image Edits (Supports multipart/form-data & JSON payloads)
 */
router.post('/images/edits', upload.single('image'), async (req, res) => {
  try {
    let prompt = req.body.prompt;
    let model = req.body.model || 'reve-1';
    let size = req.body.size || '1024x1024';
    let quality = req.body.quality || 'hd';
    let aspect_ratio = req.body.aspect_ratio;
    let response_format = req.body.response_format || 'b64_json';
    let rawImage = req.body.image;

    let imageBuffer = null;
    let mimeType = 'image/png';

    // 1. Check if uploaded via multipart/form-data file
    if (req.file) {
      imageBuffer = req.file.buffer;
      mimeType = req.file.mimetype || 'image/png';
    } else if (rawImage && typeof rawImage === 'string') {
      // 2. Check if passed as URL or Base64 in JSON body
      if (rawImage.startsWith('http://') || rawImage.startsWith('https://')) {
        const dlResp = await axios.get(rawImage, {
          responseType: 'arraybuffer',
          timeout: 30000,
        });
        imageBuffer = Buffer.from(dlResp.data);
        mimeType = dlResp.headers['content-type'] || 'image/png';
      } else {
        const cleanB64 = rawImage.replace(/^data:image\/\w+;base64,/, '');
        imageBuffer = Buffer.from(cleanB64, 'base64');
      }
    }

    if (!imageBuffer) {
      return res.status(400).json({
        error: {
          message: "'image' is required as a file upload or base64/url string",
          type: 'invalid_request_error',
          param: 'image',
          code: 'missing_required_parameter',
        },
      });
    }

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({
        error: {
          message: "'prompt' is required and cannot be empty",
          type: 'invalid_request_error',
          param: 'prompt',
          code: 'missing_required_parameter',
        },
      });
    }

    const { width, height } = resolveDimensions(size, aspect_ratio, quality);
    const modelVersion = resolveModelVersion(model);
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // Pick active account for reference upload & edit
    const account = accountManager.getAccount();
    if (!account) {
      throw new Error('No active Reve accounts available');
    }

    let projectId = account.defaultProject;
    if (!projectId) {
      const cfg = await reveClient.getFeatureConfig(account.token);
      projectId = cfg.user_info?.default_project;
      account.defaultProject = projectId;
    }

    // Upload source image
    const refNodeId = await reveClient.uploadImage(
      account.token,
      projectId,
      imageBuffer,
      mimeType
    );

    // Run edit workflow with reference node ID
    const { result, accountId } = await generateSingleWithRetry({
      prompt: prompt.trim(),
      width,
      height,
      modelVersion,
      referenceImageId: refNodeId,
    });

    req._usedAccountId = accountId;

    const itemData = {};
    if (response_format === 'url') {
      const cacheId = cacheImage(result.buffer, result.mimeType);
      itemData.url = `${baseUrl}/v1/images/cache/${cacheId}.png`;
    } else {
      itemData.b64_json = result.base64;
    }

    return res.json({
      created: Math.floor(Date.now() / 1000),
      data: [itemData],
    });
  } catch (err) {
    console.error('❌ /v1/images/edits Error:', err.message);
    return res.status(500).json({
      error: {
        message: err.message || 'Internal server error during image edit',
        type: 'api_error',
        code: 'edit_failed',
      },
    });
  }
});

module.exports = router;
