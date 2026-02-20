type EnvLike = Record<string, string | undefined>;

const normalizeBasePath = (raw: string): string => {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  if (trimmed === '/') return '';
  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeading.replace(/\/+$/, '');
};

export function resolveNextBasePathFromEnvLike(env: EnvLike): string {
  const deploymentEnv = env.NEXT_PUBLIC_DEPLOYMENT_ENV || env.NODE_ENV || 'development';
  const rawBasePath =
    deploymentEnv === 'production'
      ? env.NEXT_PUBLIC_BASE_PATH_PROD || ''
      : env.NEXT_PUBLIC_BASE_PATH_DEV || '';
  return normalizeBasePath(rawBasePath || '');
}

export function resolveNextBasePath(): string {
  return resolveNextBasePathFromEnvLike(process.env as EnvLike);
}

export function prefixBasePath(path: string, basePath?: string): string {
  const bp = typeof basePath === 'string' ? basePath : resolveNextBasePath();
  if (!bp) return path;
  if (!path || typeof path !== 'string') return path;
  if (/^https?:\/\//i.test(path)) return path;
  if (!path.startsWith('/')) return path;
  if (path === bp || path.startsWith(bp + '/')) return path;
  return `${bp}${path}`;
}
