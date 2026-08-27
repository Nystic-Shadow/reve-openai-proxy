const crypto = require('crypto');
const https = require('https');
const axios = require('axios');
const FormData = require('form-data');
const config = require('./config');

const BASE_URL = config.baseUrl;

// 1x1 Transparent PNG for bootstrapping fresh projects
const DUMMY_1X1_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// High-performance HTTP Keep-Alive Agent
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 100,
  maxFreeSockets: 20,
  timeout: 60000,
});

const apiClient = axios.create({
  baseURL: BASE_URL,
  httpsAgent,
  maxBodyLength: 50 * 1024 * 1024,
  maxContentLength: 50 * 1024 * 1024,
});

function uuidv4() {
  return crypto.randomUUID();
}

/**
 * Standard browser-mimicking headers required by Reve API
 */
function getHeaders(token, extra = {}) {
  return {
    'Authorization': `Bearer ${token}`,
    'Origin': BASE_URL,
    'Referer': `${BASE_URL}/`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    ...extra,
  };
}

/**
 * Fetch user profile and project configuration
 */
async function getFeatureConfig(token) {
  const resp = await apiClient.get('/api/misc/feature_config', {
    headers: getHeaders(token),
    timeout: 15000,
  });
  return resp.data;
}

/**
 * Upload an image buffer to Reve for image-to-image / edits or bootstrapping
 * Returns the resulting image node_id (UUID)
 */
async function uploadImage(token, projectId, imageBuffer, mimeType = 'image/png') {
  const form = new FormData();
  form.append('project_id', projectId);
  form.append('user_file', imageBuffer, {
    filename: 'input.png',
    contentType: mimeType,
  });

  const uploadResp = await apiClient.post('/api/misc/user_upload', form, {
    headers: getHeaders(token, form.getHeaders()),
    timeout: 30000,
  });

  const uploadId = uploadResp.data?.upload_id;
  if (!uploadId) {
    throw new Error('Reve upload did not return an upload_id');
  }

  // Poll upload status until ready
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    try {
      const pollResp = await apiClient.get(
        `/api/project/${projectId}/user_upload/${uploadId}`,
        {
          headers: getHeaders(token),
          timeout: 10000,
        }
      );

      const itemData = pollResp.data?.item?.data || {};
      if (itemData.status === 'ready_for_use' && itemData.resulting_image) {
        return itemData.resulting_image;
      }
      if (itemData.status === 'failed' || itemData.status === 'error') {
        throw new Error(`Reve upload processing failed: ${JSON.stringify(itemData)}`);
      }
    } catch (pollErr) {
      if (i === maxAttempts - 1) throw pollErr;
    }
  }

  throw new Error('Image upload processing timed out on Reve backend');
}

/**
 * Ensures an account has a valid root node ID on Reve, bootstrapping with a 1x1 image if needed
 */
async function ensureRootNode(token, projectId) {
  try {
    return await uploadImage(token, projectId, DUMMY_1X1_PNG, 'image/png');
  } catch (err) {
    console.warn(`[Bootstrap] Warning: could not auto-create root node: ${err.message}`);
    return null;
  }
}

/**
 * Executes wf-e-create-doc-stream SSE workflow and extracts the final image buffer
 */
async function generateImageWorkflow({
  token,
  projectId,
  prompt,
  width = 1024,
  height = 1024,
  modelVersion = 'v1',
  referenceImageId = null,
  timeoutMs = 300000,
}) {
  // If no reference image is provided, fromNodeId must point to a real node to satisfy Postgres
  let parentNodeId = referenceImageId;
  if (!parentNodeId) {
    parentNodeId = await ensureRootNode(token, projectId);
  }

  const regionId = uuidv4();
  const generationNodeId = uuidv4();
  const regionPayload = {
    id: regionId,
    overall_prompt: prompt,
    prompt: prompt,
    negative_prompt: '',
    seed: 0,
    aspect_ratio: '1:1',
    model: 'text2image_v1',
    width: width,
    height: height,
  };

  if (referenceImageId) {
    regionPayload.image_node_id = referenceImageId;
  }

  const payload = {
    project_id: projectId,
    coid: `coid-${uuidv4().replace(/-/g, '')}`,
    inputs: {
      trajectoryId: uuidv4(),
      modelOverride: modelVersion,
      fromNodeId: parentNodeId || '',
      generationNodeId: generationNodeId,
      disableHarmonization: false,
      disableImageReferences: referenceImageId === null,
      reroll: false,
      region_count: 1,
      layoutAfter: {
        overall_prompt: prompt,
        regions: [],
        width: width,
        height: height,
      },
      regions: [regionPayload],
      bakedFilterConfig: { filter_list: [], filter_bindings: {} },
      liveFilterConfig: { filter_list: [], filter_bindings: {} },
    },
  };

  const resp = await apiClient.post(
    '/api/misc/runwf-stream/wf-e-create-doc-stream/',
    payload,
    {
      headers: getHeaders(token, {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      }),
      responseType: 'stream',
      timeout: timeoutMs,
    }
  );

  return new Promise((resolve, reject) => {
    let bufferStr = '';
    let isResolved = false;
    let latestBase64 = null;
    let latestMime = 'image/webp';

    const cleanup = () => {
      isResolved = true;
      try {
        resp.data.destroy();
      } catch (e) {}
    };

    const timer = setTimeout(() => {
      if (!isResolved) {
        if (latestBase64) {
          cleanup();
          const imgBuffer = Buffer.from(latestBase64, 'base64');
          return resolve({
            buffer: imgBuffer,
            base64: latestBase64,
            mimeType: latestMime,
          });
        }
        cleanup();
        reject(new Error(`Reve generation timed out after ${timeoutMs / 1000}s`));
      }
    }, timeoutMs);

    resp.data.on('data', async (chunk) => {
      if (isResolved) return;
      bufferStr += chunk.toString('utf-8');

      while (bufferStr.includes('\n\n')) {
        const splitIndex = bufferStr.indexOf('\n\n');
        const message = bufferStr.slice(0, splitIndex);
        bufferStr = bufferStr.slice(splitIndex + 2);

        let eventType = null;
        let dataStr = null;

        const lines = message.split('\n');
        for (const line of lines) {
          if (line.startsWith('event:')) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            dataStr = line.slice(5).trim();
          }
        }

        if (!dataStr || dataStr === 'null') {
          continue;
        }

        try {
          const parsed = JSON.parse(dataStr);

          // Handle error event from backend
          if (parsed.status_code >= 400 || parsed.error_code) {
            clearTimeout(timer);
            cleanup();
            return reject(new Error(`Reve upstream error [${parsed.error_code}]: ${parsed.message}`));
          }

          const output = parsed.output || parsed;

          // 1. Direct blobDataBase64 in intermediate-image phase
          const blobB64 = parsed.blobDataBase64 || output.blobDataBase64;
          if (blobB64) {
            latestBase64 = blobB64;
            latestMime = 'image/webp';
            // If progress reached 1.0 or final step, resolve immediately
            if (parsed.progress >= 1.0 || parsed.progress === 1) {
              clearTimeout(timer);
              cleanup();
              const imgBuffer = Buffer.from(blobB64, 'base64');
              return resolve({
                buffer: imgBuffer,
                base64: blobB64,
                mimeType: latestMime,
              });
            }
          }

          // 2. Direct Base64 PNG image in output
          const b64 = output.image_base64 || output.base64;
          if (b64) {
            latestBase64 = b64;
            latestMime = 'image/png';
          }

          // 3. Direct Image URL in output
          const imgUrl = output.image_url || output.url;
          if (imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('http')) {
            clearTimeout(timer);
            cleanup();
            try {
              const imgFetch = await axios.get(imgUrl, {
                responseType: 'arraybuffer',
                timeout: 30000,
                httpsAgent,
              });
              const imgBuffer = Buffer.from(imgFetch.data);
              return resolve({
                buffer: imgBuffer,
                base64: imgBuffer.toString('base64'),
                mimeType: imgFetch.headers['content-type'] || 'image/png',
              });
            } catch (fetchErr) {
              return reject(new Error(`Failed to download output image URL: ${fetchErr.message}`));
            }
          }
        } catch (e) {
          // Ignore JSON parse errors for incomplete chunks
        }
      }
    });

    resp.data.on('end', () => {
      clearTimeout(timer);
      if (!isResolved) {
        if (latestBase64) {
          isResolved = true;
          const imgBuffer = Buffer.from(latestBase64, 'base64');
          return resolve({
            buffer: imgBuffer,
            base64: latestBase64,
            mimeType: latestMime,
          });
        }
        isResolved = true;
        reject(new Error('SSE stream ended without delivering image data'));
      }
    });

    resp.data.on('error', (err) => {
      clearTimeout(timer);
      if (!isResolved) {
        if (latestBase64) {
          isResolved = true;
          const imgBuffer = Buffer.from(latestBase64, 'base64');
          return resolve({
            buffer: imgBuffer,
            base64: latestBase64,
            mimeType: latestMime,
          });
        }
        isResolved = true;
        reject(new Error(`Stream error: ${err.message}`));
      }
    });
  });
}

module.exports = {
  getFeatureConfig,
  uploadImage,
  ensureRootNode,
  generateImageWorkflow,
};
