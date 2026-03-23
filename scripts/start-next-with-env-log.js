/* eslint-disable no-console */

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
  logValue('SP_KERBEROS_SERVICE_USER', process.env.SP_KERBEROS_SERVICE_USER);
  logValue('SP_KERBEROS_SERVICE_PASSWORD', process.env.SP_KERBEROS_SERVICE_PASSWORD, {
    mask: true,
  });
  logValue('SP_USERNAME', process.env.SP_USERNAME);
  logValue('SP_PASSWORD', process.env.SP_PASSWORD, { mask: true });
  console.log('[startup env] ===============================================');
}

logStartupEnvironment();

void import('next/dist/bin/next').catch((error) => {
  console.error('[startup env] Failed to start Next.js', error);
  process.exit(1);
});
