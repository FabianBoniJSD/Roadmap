import type { NextApiRequest } from 'next';

export type EntraRedirectEnv = {
  ENTRA_REDIRECT_URI?: string;
  NEXT_PUBLIC_DEPLOYMENT_ENV?: string;
  NODE_ENV?: string;
  NEXT_PUBLIC_BASE_PATH_DEV?: string;
  NEXT_PUBLIC_BASE_PATH_PROD?: string;
};

export function resolveNextBasePathFromEnv(env: {
  NEXT_PUBLIC_DEPLOYMENT_ENV?: string;
  NODE_ENV?: string;
  NEXT_PUBLIC_BASE_PATH_DEV?: string;
  NEXT_PUBLIC_BASE_PATH_PROD?: string;
}): string {
  const deploymentEnv = env.NEXT_PUBLIC_DEPLOYMENT_ENV || env.NODE_ENV || 'development';
  const rawBasePath =
    deploymentEnv === 'production'
      ? env.NEXT_PUBLIC_BASE_PATH_PROD || ''
      : env.NEXT_PUBLIC_BASE_PATH_DEV || '';
  return (rawBasePath || '').replace(/\/$/, '');
}

export function getRequestOrigin(req: NextApiRequest): string {
  const proto = String(req.headers['x-forwarded-proto'] || 'http');
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost');
  return `${proto}://${host}`;
}

export function getEntraRedirectUri(args: {
  req: NextApiRequest;
  env: EntraRedirectEnv;
  callbackPath?: string;
}): string {
  if (args.env.ENTRA_REDIRECT_URI && args.env.ENTRA_REDIRECT_URI.trim()) {
    return args.env.ENTRA_REDIRECT_URI.trim();
  }
  const origin = getRequestOrigin(args.req);
  const basePath = resolveNextBasePathFromEnv(args.env);
  const callback = args.callbackPath || '/api/auth/entra/callback';
  return `${origin}${basePath}${callback}`;
}
