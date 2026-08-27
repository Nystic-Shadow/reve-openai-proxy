const express = require('express');
const cors = require('cors');
const config = require('./config');
const accountManager = require('./accountManager');
const v1Router = require('./routes/v1');
const rich = require('./rich');

const app = express();

// Disable x-powered-by header
app.disable('x-powered-by');

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rich Live Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (!req.path.startsWith('/v1/images/cache')) {
      const durationMs = Date.now() - start;
      rich.logRequest({
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        durationMs,
        accountId: req._usedAccountId || null,
      });
    }
  });
  next();
});

// Authentication Middleware: Accepts ANY random dummy API key (e.g. sk-dummy, not-used, etc.)
app.use((req, res, next) => {
  if (process.env.ENFORCE_PROXY_KEY === 'true' && config.proxyApiKey) {
    const authHeader = req.headers.authorization || '';
    const apiKeyHeader = req.headers['x-api-key'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : apiKeyHeader.trim();

    if (token !== config.proxyApiKey) {
      return res.status(401).json({
        error: {
          message: 'Invalid API key.',
          type: 'authentication_error',
          code: 'invalid_api_key',
        },
      });
    }
  }
  // Any dummy key / no key accepted
  next();
});

// Mount Core API Routes
app.use('/v1', v1Router);

// Favicon handler
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Health / Status JSON Endpoint
app.get(['/', '/health'], (req, res) => {
  const summary = accountManager.getSummary();
  res.json({
    status: summary.active_accounts > 0 ? 'online' : 'degraded',
    service: 'reve-openai-proxy',
    uptime: Math.floor(process.uptime()),
    port: config.port,
    mode: summary.mode,
    active_accounts: summary.active_accounts,
    total_accounts: summary.pool_size,
    total_energy_credits: summary.total_energy_credits,
    approx_remaining_generations: summary.approx_remaining_generations,
    accounts: summary.accounts,
  });
});

// Direct /models JSON endpoint (browser & API friendly)
app.get('/models', (req, res) => {
  res.json({
    object: 'list',
    data: config.models,
  });
});

// Manual Sync Trigger
app.post('/sync', async (req, res) => {
  try {
    await accountManager.syncAll();
    const summary = accountManager.getSummary();
    res.json({ success: true, summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: `Path ${req.method} ${req.path} not found`,
      type: 'invalid_request_error',
      code: 'not_found',
    },
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(rich.ANSI.brightRed + 'Unhandled Server Error:' + rich.ANSI.reset, err);
  res.status(500).json({
    error: {
      message: err.message || 'Internal Server Error',
      type: 'api_error',
      code: 'internal_error',
    },
  });
});

// Start Server
async function start() {
  // Initialize Account Pool in background
  await accountManager.initialize();

  const summary = accountManager.getSummary();

  // Print Rich Startup Dashboard
  rich.printBanner({
    port: config.port,
    accounts: summary.accounts,
    mode: summary.mode,
  });

  app.listen(config.port, config.host);
}

start();
