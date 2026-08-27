/**
 * Rich Terminal UI Engine for Node.js
 * Implements Python 'rich'-style panels, tables, badges, and progress bars.
 * Credits & Maintainer: https://github.com/Nystic-Shadow
 */

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',

  // Foreground Colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',

  // Background Colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
  bgGray: '\x1b[100m',
};

// Full ANSI regex to clean strings for accurate length calculations
function stripAnsi(str) {
  return String(str || '').replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

/**
 * Generates an ASCII / Unicode Progress Bar
 */
function progressBar(current, max = 120000, width = 14) {
  const safeMax = Math.max(max, current, 1);
  const percent = Math.min(Math.max(current / safeMax, 0), 1);
  const filled = Math.round(width * percent);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const pctStr = `${Math.round(percent * 100)}%`.padStart(4);

  let color = ANSI.brightGreen;
  if (percent < 0.25) color = ANSI.brightRed;
  else if (percent < 0.5) color = ANSI.brightYellow;

  return `${color}${bar}${ANSI.reset} ${ANSI.bold}${pctStr}${ANSI.reset}`;
}

/**
 * Creates a Rich Bordered Panel
 */
function panel(title, lines, borderColor = ANSI.brightCyan, minWidth = 82) {
  const rawLines = Array.isArray(lines) ? lines : [lines];
  const flatLines = [];

  // Flatten multiline strings
  for (const item of rawLines) {
    if (typeof item === 'string' && item.includes('\n')) {
      flatLines.push(...item.split('\n'));
    } else {
      flatLines.push(String(item));
    }
  }

  let maxContentLen = title ? stripAnsi(title).length + 4 : 0;
  for (const line of flatLines) {
    const len = stripAnsi(line).length;
    if (len > maxContentLen) maxContentLen = len;
  }

  const width = Math.max(maxContentLen + 2, minWidth);
  const titleClean = title ? ` ${title} ` : '';
  const titleLen = stripAnsi(titleClean).length;
  const topBorderLeft = '─'.repeat(2);
  const topBorderRight = '─'.repeat(Math.max(width - titleLen - 4, 2));

  let out = '';
  // Top Border
  out += `${borderColor}┌${topBorderLeft}${ANSI.bold}${ANSI.brightWhite}${titleClean}${ANSI.reset}${borderColor}${topBorderRight}┐${ANSI.reset}\n`;

  // Body
  for (const line of flatLines) {
    const cleanLen = stripAnsi(line).length;
    const padding = ' '.repeat(Math.max(width - cleanLen - 2, 0));
    out += `${borderColor}│${ANSI.reset} ${line}${padding} ${borderColor}│${ANSI.reset}\n`;
  }

  // Bottom Border
  out += `${borderColor}└${'─'.repeat(width)}┘${ANSI.reset}`;
  return out;
}

/**
 * Formats a clean Rich Table
 */
function table(headers, rows) {
  const colWidths = headers.map((h, i) => {
    let max = stripAnsi(h).length;
    for (const row of rows) {
      const cellLen = stripAnsi(String(row[i] || '')).length;
      if (cellLen > max) max = cellLen;
    }
    return max + 2;
  });

  const sep = '+' + colWidths.map((w) => '-'.repeat(w + 2)).join('+') + '+';
  const headerRow =
    '| ' +
    headers
      .map((h, i) => {
        const pad = colWidths[i] - stripAnsi(h).length;
        return `${ANSI.bold}${ANSI.brightCyan}${h}${ANSI.reset}${' '.repeat(pad)}`;
      })
      .join(' | ') +
    ' |';

  const lines = [`${ANSI.gray}${sep}${ANSI.reset}`, headerRow, `${ANSI.gray}${sep}${ANSI.reset}`];

  for (const row of rows) {
    const rowStr =
      '| ' +
      row
        .map((cell, i) => {
          const str = String(cell || '');
          const pad = colWidths[i] - stripAnsi(str).length;
          return `${str}${' '.repeat(Math.max(pad, 0))}`;
        })
        .join(' | ') +
      ' |';
    lines.push(rowStr);
  }

  lines.push(`${ANSI.gray}${sep}${ANSI.reset}`);
  return lines.join('\n');
}

/**
 * Returns formatted status badges
 */
function statusBadge(status) {
  switch (status) {
    case 'active':
      return `${ANSI.bgGreen}${ANSI.black}${ANSI.bold} ACTIVE ${ANSI.reset}`;
    case 'low_energy':
      return `${ANSI.bgYellow}${ANSI.black}${ANSI.bold} LOW ${ANSI.reset}`;
    case 'exhausted':
      return `${ANSI.bgRed}${ANSI.white}${ANSI.bold} EXHAUSTED ${ANSI.reset}`;
    case 'invalid_token':
      return `${ANSI.bgRed}${ANSI.white}${ANSI.bold} INVALID ${ANSI.reset}`;
    default:
      return `${ANSI.bgGray}${ANSI.white}${ANSI.bold} ${status.toUpperCase()} ${ANSI.reset}`;
  }
}

/**
 * Formats method badge
 */
function methodBadge(method) {
  switch (method.toUpperCase()) {
    case 'GET':
      return `${ANSI.bgBlue}${ANSI.white}${ANSI.bold} GET ${ANSI.reset}`;
    case 'POST':
      return `${ANSI.bgMagenta}${ANSI.white}${ANSI.bold} POST ${ANSI.reset}`;
    default:
      return `${ANSI.bgGray}${ANSI.white}${ANSI.bold} ${method} ${ANSI.reset}`;
  }
}

/**
 * Formats status code
 */
function statusCode(code) {
  if (code >= 200 && code < 300) return `${ANSI.bold}${ANSI.brightGreen}${code} OK${ANSI.reset}`;
  if (code >= 400 && code < 500) return `${ANSI.bold}${ANSI.brightYellow}${code} WARN${ANSI.reset}`;
  return `${ANSI.bold}${ANSI.brightRed}${code} ERR${ANSI.reset}`;
}

/**
 * Prints the Full Startup Banner
 */
function printBanner({ port, accounts, mode }) {
  const logo = [
    `${ANSI.brightCyan}  ██████╗ ███████╗██╗   ██╗███████╗    ██████╗ ██████╗  ██████╗ ██╗  ██╗██╗   ██╗${ANSI.reset}`,
    `${ANSI.brightCyan}  ██╔══██╗██╔════╝██║   ██║██╔════╝    ██╔══██╗██╔══██╗██╔═══██╗╚██╗██╔╝╚██╗ ██╔╝${ANSI.reset}`,
    `${ANSI.brightBlue}  ██████╔╝█████╗  ██║   ██║█████╗      ██████╔╝██████╔╝██║   ██║ ╚███╔╝  ╚████╔╝ ${ANSI.reset}`,
    `${ANSI.brightBlue}  ██╔══██╗██╔══╝  ╚██╗ ██╔╝██╔══╝      ██╔═══╝ ██╔══██╗██║   ██║ ██╔██╗   ╚██╔╝  ${ANSI.reset}`,
    `${ANSI.brightMagenta}  ██║  ██║███████╗ ╚████╔╝ ███████╗    ██║     ██║  ██║╚██████╔╝██╔╝ ██╗   ██║   ${ANSI.reset}`,
    `${ANSI.brightMagenta}  ╚═╝  ╚═╝╚══════╝  ╚═══╝  ╚══════╝    ╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ${ANSI.reset}`,
    ``,
    `  ${ANSI.bold}${ANSI.brightWhite}OpenAI-Compatible Image Generation API Proxy${ANSI.reset}  ${ANSI.dim}•  v2.1.0${ANSI.reset}`,
    `  ${ANSI.dim}Author / GitHub: ${ANSI.reset}${ANSI.cyan}https://github.com/Nystic-Shadow${ANSI.reset}`,
  ];

  console.log('\n' + logo.join('\n') + '\n');

  const modeBadge =
    accounts.length > 1
      ? `${ANSI.bgGreen}${ANSI.black}${ANSI.bold} MULTI-ACCOUNT POOL (Auto Round-Robin) ${ANSI.reset}`
      : accounts.length === 1
      ? `${ANSI.bgBlue}${ANSI.white}${ANSI.bold} SINGLE ACCOUNT MODE ${ANSI.reset}`
      : `${ANSI.bgRed}${ANSI.white}${ANSI.bold} NO ACCOUNTS DETECTED ${ANSI.reset}`;

  const infoLines = [
    `${ANSI.bold}Server Port:${ANSI.reset}     ${ANSI.brightYellow}${port}${ANSI.reset} ${ANSI.dim}(Default: 5674)${ANSI.reset}`,
    `${ANSI.bold}Routing Mode:${ANSI.reset}    ${modeBadge}`,
    `${ANSI.bold}Auth Mode:${ANSI.reset}       ${ANSI.brightGreen}Dummy / Any API Key Accepted${ANSI.reset} ${ANSI.dim}(sk-dummy, etc.)${ANSI.reset}`,
    `${ANSI.bold}Models Active:${ANSI.reset}   ${ANSI.brightCyan}dall-e-3, dall-e-2, reve-1, reve-2, reve-preview, reve-fast${ANSI.reset}`,
    `${ANSI.bold}GitHub Repo:${ANSI.reset}     ${ANSI.cyan}https://github.com/Nystic-Shadow${ANSI.reset}`,
    ``,
    `${ANSI.bold}${ANSI.underline}Available API Endpoints:${ANSI.reset}`,
    `  ${ANSI.brightMagenta}POST${ANSI.reset}  http://localhost:${port}${ANSI.bold}/v1/images/generations${ANSI.reset}  ${ANSI.dim}(Text to Image)${ANSI.reset}`,
    `  ${ANSI.brightMagenta}POST${ANSI.reset}  http://localhost:${port}${ANSI.bold}/v1/images/edits${ANSI.reset}        ${ANSI.dim}(Image Edits / Inpaint)${ANSI.reset}`,
    `  ${ANSI.brightBlue}GET${ANSI.reset}   http://localhost:${port}${ANSI.bold}/v1/models${ANSI.reset}              ${ANSI.dim}(OpenAI Model List)${ANSI.reset}`,
    `  ${ANSI.brightBlue}GET${ANSI.reset}   http://localhost:${port}${ANSI.bold}/health${ANSI.reset}                 ${ANSI.dim}(Health Status JSON)${ANSI.reset}`,
  ];

  console.log(panel('PROXY CONFIGURATION', infoLines, ANSI.brightBlue, 82));

  if (accounts.length > 0) {
    const tableHeaders = ['ID', 'Env Key', 'User Name', 'Plan', 'Energy Balance', 'Live Credits', 'Status'];
    const tableRows = accounts.map((a) => {
      const maxCap = a.initial_energy || a.battery_size || 120000;
      return [
        `${ANSI.bold}${a.id}${ANSI.reset}`,
        `${ANSI.cyan}${a.env_key}${ANSI.reset}`,
        `${ANSI.brightWhite}${a.name}${ANSI.reset}`,
        `${ANSI.dim}${a.plan}${ANSI.reset}`,
        progressBar(a.energy, maxCap, 12),
        `${(a.energy || 0).toLocaleString()} / ${(maxCap).toLocaleString()}`,
        statusBadge(a.status),
      ];
    });

    const renderedTable = table(tableHeaders, tableRows);
    console.log('\n' + panel('ACCOUNT POOL STATUS', renderedTable, ANSI.brightCyan, 82) + '\n');
  } else {
    console.log(
      '\n' +
        panel(
          '⚠️  SETUP REQUIRED',
          [
            `${ANSI.brightYellow}No Reve account tokens detected in .env!${ANSI.reset}`,
            `Add tokens in your ${ANSI.bold}.env${ANSI.reset} file:`,
            `  ${ANSI.cyan}TOKEN_1=v2.login-...${ANSI.reset}`,
            `  ${ANSI.cyan}TOKEN_2=v2.login-...${ANSI.reset}`,
          ],
          ANSI.brightYellow,
          82
        ) +
        '\n'
    );
  }
}

/**
 * Rich Live Request Logger
 */
function logRequest({ method, url, status, durationMs, accountId = null }) {
  const timeStr = `${ANSI.dim}${new Date().toLocaleTimeString()}${ANSI.reset}`;
  const mBadge = methodBadge(method);
  const sCode = statusCode(status);
  const dStr = durationMs > 1000 ? `${ANSI.brightYellow}${(durationMs / 1000).toFixed(2)}s${ANSI.reset}` : `${ANSI.dim}${durationMs}ms${ANSI.reset}`;
  const accStr = accountId ? ` ${ANSI.dim}•${ANSI.reset} Account: ${ANSI.brightCyan}${accountId}${ANSI.reset}` : '';

  console.log(`[${timeStr}] ${mBadge} ${ANSI.bold}${url}${ANSI.reset} -> ${sCode} (${dStr})${accStr}`);
}

module.exports = {
  ANSI,
  panel,
  table,
  progressBar,
  statusBadge,
  methodBadge,
  statusCode,
  printBanner,
  logRequest,
};
