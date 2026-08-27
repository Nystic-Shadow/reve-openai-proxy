const config = require('./config');
const reveClient = require('./reveClient');

class AccountManager {
  constructor() {
    this.accounts = [];
    this.currentIndex = 0;
    this.syncTimer = null;
    this.isInitialized = false;
  }

  /**
   * Load tokens from config and initialize pool
   */
  async initialize() {
    this.accounts = config.tokens.map((item, idx) => ({
      id: `acc_${idx + 1}`,
      envKey: item.envKey,
      token: item.token,
      name: `Account #${idx + 1}`,
      plan: 'free',
      energy: 0,
      initialEnergy: 120000,
      batterySize: 120000,
      defaultProject: null,
      status: 'uninitialized', // 'active' | 'low_energy' | 'invalid_token' | 'unreachable' | 'exhausted'
      stats: {
        totalGenerations: 0,
        successfulGenerations: 0,
        failedGenerations: 0,
        lastUsed: null,
      },
      lastSync: null,
      lastError: null,
    }));

    if (this.accounts.length === 0) {
      this.isInitialized = true;
      return;
    }

    // Verify and sync all accounts concurrently
    await this.syncAll();
    this.isInitialized = true;

    // Start background sync interval if configured
    if (config.syncIntervalMinutes > 0) {
      this.syncTimer = setInterval(
        () => this.syncAll().catch(() => {}),
        config.syncIntervalMinutes * 60 * 1000
      );
    }
  }

  /**
   * Sync single account status with Reve API via /api/misc/userinfo
   */
  async syncAccount(account) {
    try {
      const data = await reveClient.getUserInfo(account.token);
      const user = data.user || data.user_info || {};
      const projects = data.projects || [];

      account.name = user.name || account.name;
      account.plan = user.plan_type || 'free';
      account.energy = typeof user.regular_energy === 'number' ? user.regular_energy : 0;
      account.batterySize = typeof user.battery_size === 'number' ? user.battery_size : 120000;
      account.initialEnergy = Math.max(account.batterySize, account.energy);
      account.defaultProject = user.default_project || (projects[0] ? projects[0].id : null) || null;
      account.lastSync = new Date().toISOString();
      account.lastError = null;

      if (account.energy <= 0) {
        account.status = 'exhausted';
      } else if (account.energy < 15000) {
        account.status = 'low_energy';
      } else {
        account.status = 'active';
      }
    } catch (err) {
      account.lastSync = new Date().toISOString();
      account.lastError = err.response?.data?.message || err.message;

      if (err.response?.status === 401 || err.response?.status === 403) {
        account.status = 'invalid_token';
      } else {
        account.status = 'unreachable';
      }
    }
  }

  /**
   * Sync all accounts concurrently
   */
  async syncAll() {
    await Promise.all(this.accounts.map((acc) => this.syncAccount(acc)));
  }

  /**
   * Select account: Auto-detects single vs multi-account round-robin
   */
  getAccount(excludedIds = []) {
    if (this.accounts.length === 0) return null;

    // Single account mode: Return the single account directly
    if (this.accounts.length === 1) {
      const single = this.accounts[0];
      if (excludedIds.includes(single.id) || single.status === 'invalid_token') {
        return null;
      }
      return single;
    }

    // Multi-account mode: Filter healthy eligible candidates
    const eligible = this.accounts.filter(
      (acc) =>
        !excludedIds.includes(acc.id) &&
        acc.status !== 'invalid_token' &&
        acc.status !== 'exhausted' &&
        acc.token &&
        acc.token.length > 5
    );

    if (eligible.length === 0) {
      // Fallback: Check for any non-invalid accounts
      const fallback = this.accounts.filter(
        (acc) => !excludedIds.includes(acc.id) && acc.status !== 'invalid_token' && acc.token
      );
      if (fallback.length > 0) return fallback[0];
      return null;
    }

    // Multi-account auto Round-Robin
    const index = this.currentIndex % eligible.length;
    this.currentIndex = (this.currentIndex + 1) % eligible.length;
    return eligible[index];
  }

  /**
   * Mark success and deduct energy tracker
   */
  recordSuccess(accountId, energyCost = 15000) {
    const acc = this.accounts.find((a) => a.id === accountId);
    if (acc) {
      acc.stats.totalGenerations += 1;
      acc.stats.successfulGenerations += 1;
      acc.stats.lastUsed = new Date().toISOString();
      if (acc.energy >= energyCost) {
        acc.energy -= energyCost;
      }
      if (acc.energy < 15000 && acc.status === 'active') {
        acc.status = 'low_energy';
      }
    }
  }

  /**
   * Mark failure and update account status if token failed
   */
  recordFailure(accountId, error) {
    const acc = this.accounts.find((a) => a.id === accountId);
    if (acc) {
      acc.stats.totalGenerations += 1;
      acc.stats.failedGenerations += 1;
      acc.stats.lastUsed = new Date().toISOString();
      acc.lastError = error?.message || String(error);

      if (error?.response?.status === 401) {
        acc.status = 'invalid_token';
      } else if (error?.response?.status === 429) {
        acc.status = 'exhausted';
      }
    }
  }

  /**
   * Summary for API / Health status
   */
  getSummary() {
    const totalEnergy = this.accounts.reduce((sum, a) => sum + (a.energy || 0), 0);
    const activeCount = this.accounts.filter((a) => a.status === 'active' || a.status === 'low_energy').length;
    const mode = this.accounts.length > 1 ? 'multi-account round-robin' : this.accounts.length === 1 ? 'single-account direct' : 'no-accounts';

    return {
      mode,
      pool_size: this.accounts.length,
      active_accounts: activeCount,
      total_energy_credits: totalEnergy,
      approx_remaining_generations: Math.floor(totalEnergy / 15000),
      accounts: this.accounts.map((a) => ({
        id: a.id,
        env_key: a.envKey,
        name: a.name,
        plan: a.plan,
        energy: a.energy,
        battery_size: a.batterySize || 120000,
        initial_energy: a.initialEnergy || 120000,
        status: a.status,
        project_id: a.defaultProject,
        masked_token: a.token ? `${a.token.slice(0, 10)}...${a.token.slice(-6)}` : 'EMPTY',
        stats: a.stats,
        last_sync: a.lastSync,
        last_error: a.lastError,
      })),
    };
  }
}

const manager = new AccountManager();
module.exports = manager;
