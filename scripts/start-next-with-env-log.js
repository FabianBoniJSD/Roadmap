/* eslint-disable no-console */

async function loadNextEnvironment() {
  try {
    const [{ resolve }, { loadEnvConfig }] = await Promise.all([
      import('node:path'),
      import('@next/env'),
    ]);
    const projectDir = resolve(__dirname, '..');
    loadEnvConfig(projectDir, process.env.NODE_ENV !== 'production');
    console.log(`[startup env] Loaded Next env files from ${projectDir}`);
  } catch (error) {
    console.warn('[startup env] Failed to preload Next env files', error);
  }
}

function normalizeSharePointStrategy(raw, fallbackRaw) {
  const normalize = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');
  const modern = new Set(['kerberos', 'basic', 'delegated']);
  const delegatedAliases = new Set(['delegate', 'kcd', 'userdelegation']);
  const legacyKerberosAliases = new Set(['onprem', 'ntlm', 'online']);
  const value = normalize(raw);
  const fallback = normalize(fallbackRaw);

  if (modern.has(value)) return value;
  if (delegatedAliases.has(value)) return 'delegated';
  if (modern.has(fallback)) return fallback;
  if (delegatedAliases.has(fallback)) return 'delegated';
  if (legacyKerberosAliases.has(value) || legacyKerberosAliases.has(fallback)) return 'kerberos';
  return 'kerberos';
}

function maskSecret(value) {
  if (!value) return '<not set>';
  if (value.length <= 4) return '****';
  return `${value.slice(0, 2)}${'*'.repeat(Math.max(4, value.length - 4))}${value.slice(-2)}`;
}

function logValue(name, value, options = {}) {
  const { mask = false } = options;
  const raw = typeof value === 'string' ? value : '';
  const normalized = raw.trim();
  const present = normalized.length > 0;
  const rendered = mask ? maskSecret(normalized) : present ? normalized : '<not set>';
  console.log(`[startup env] ${name}: present=${present} value=${rendered}`);
}

function logStartupEnvironment() {
  console.log('[startup env] ===============================================');
  console.log('[startup env] Roadmap app starting with environment snapshot');
  logValue('NODE_ENV', process.env.NODE_ENV);
  logValue('NEXT_PUBLIC_DEPLOYMENT_ENV', process.env.NEXT_PUBLIC_DEPLOYMENT_ENV);
  logValue('SP_STRATEGY', process.env.SP_STRATEGY);
  logValue('SP_STRATEGY_NORMALIZED', normalizeSharePointStrategy(process.env.SP_STRATEGY));
  logValue('SP_KERBEROS_SERVICE_USER', process.env.SP_KERBEROS_SERVICE_USER);
  logValue('SP_KERBEROS_SERVICE_PASSWORD', process.env.SP_KERBEROS_SERVICE_PASSWORD, {
    mask: true,
  });
  logValue('SP_USERNAME', process.env.SP_USERNAME);
  logValue('SP_PASSWORD', process.env.SP_PASSWORD, { mask: true });
  console.log('[startup env] ===============================================');
}

async function main() {
  await loadNextEnvironment();
  logStartupEnvironment();

  try {
    await import('next/dist/bin/next');
  } catch (error) {
    console.error('[startup env] Failed to start Next.js', error);
    process.exit(1);
  }
}

void main(); /* eslint-disable no-console */

async function loadNextEnvironment() {
  try {
    const [{ resolve }, { loadEnvConfig }] = await Promise.all([
      import('node:path'),
      import('@next/env'),
    ]);
    const projectDir = resolve(__dirname, '..');
    loadEnvConfig(projectDir, process.env.NODE_ENV !== 'production');
    console.log(`[startup env] Loaded Next env files from ${projectDir}`);
  } catch (error) {
    console.warn('[startup env] Failed to preload Next env files', error);
  }
}

function normalizeSharePointStrategy(raw, fallbackRaw) {
  const normalize = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');
  const modern = new Set(['kerberos', 'basic', 'delegated']);
  const delegatedAliases = new Set(['delegate', 'kcd', 'userdelegation']);
  const legacyKerberosAliases = new Set(['onprem', 'ntlm', 'online']);
  const value = normalize(raw);
  const fallback = normalize(fallbackRaw);

  if (modern.has(value)) return value;
  if (delegatedAliases.has(value)) return 'delegated';
  if (modern.has(fallback)) return fallback;
  if (delegatedAliases.has(fallback)) return 'delegated';
  if (legacyKerberosAliases.has(value) || legacyKerberosAliases.has(fallback)) return 'kerberos';

  return 'kerberos';
}

function maskSecret(value) {
  if (!value) return '<not set>';
  if (value.length <= 4) return '****';
  return `${value.slice(0, 2)}${'*'.repeat(Math.max(4, value.length - 4))}${value.slice(-2)}`;
}

function logValue(name, value, options = {}) {
  const { mask = false } = options;
  const raw = typeof value === 'string' ? value : '';
  const normalized = raw.trim();
  const present = normalized.length > 0;
  const rendered = mask ? maskSecret(normalized) : present ? normalized : '<not set>';
  console.log(`[startup env] ${name}: present=${present} value=${rendered}`);
}

function logStartupEnvironment() {
  console.log('[startup env] ===============================================');
  console.log('[startup env] Roadmap app starting with environment snapshot');
  logValue('NODE_ENV', process.env.NODE_ENV);
  logValue('NEXT_PUBLIC_DEPLOYMENT_ENV', process.env.NEXT_PUBLIC_DEPLOYMENT_ENV);
  logValue('SP_STRATEGY', process.env.SP_STRATEGY);
  logValue('SP_STRATEGY_NORMALIZED', normalizeSharePointStrategy(process.env.SP_STRATEGY));
  logValue('SP_KERBEROS_SERVICE_USER', process.env.SP_KERBEROS_SERVICE_USER);
  logValue('SP_KERBEROS_SERVICE_PASSWORD', process.env.SP_KERBEROS_SERVICE_PASSWORD, {
    mask: true,
  });
  logValue('SP_USERNAME', process.env.SP_USERNAME);
  logValue('SP_PASSWORD', process.env.SP_PASSWORD, { mask: true });
  console.log('[startup env] ===============================================');
}

async function main() {
  await loadNextEnvironment();
  logStartupEnvironment();

  try {
    await import('next/dist/bin/next');
  } catch (error) {
    console.error('[startup env] Failed to start Next.js', error);
    process.exit(1);
  }
}

void main();
