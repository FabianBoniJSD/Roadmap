/**
 * Credentials overrides allow multi-instance providers (e.g., Prisma) to supply
 * SharePoint service-account usernames/passwords per tenant.
 */
export type CredentialOverrides = {
  username?: string | null;
  password?: string | null;
};

/**
 * Resolve SharePoint service-account credentials.
 * Priority: explicit overrides → SP_KERBEROS_SERVICE_* → SP_USERNAME/SP_PASSWORD.
 */
export function getPrimaryCredentials(
  overrides?: CredentialOverrides
): { username: string; password: string } | null {
  const hasOverrideUsername = typeof overrides?.username === 'string' && overrides.username.trim();
  const hasOverridePassword =
    typeof overrides?.password === 'string' && overrides.password.length > 0;
  const serviceUsername = (process.env.SP_KERBEROS_SERVICE_USER ?? '').trim();
  const servicePassword = process.env.SP_KERBEROS_SERVICE_PASSWORD ?? '';
  const legacyUsername = (process.env.SP_USERNAME ?? '').trim();
  const legacyPassword = process.env.SP_PASSWORD ?? '';

  const usernameEnv = (overrides?.username ?? serviceUsername ?? legacyUsername ?? '').trim();
  const passwordEnv = overrides?.password ?? servicePassword ?? legacyPassword;

  if (usernameEnv && passwordEnv) {
    const usingOverrides = Boolean(hasOverrideUsername || hasOverridePassword);
    const source = usingOverrides
      ? 'instance-specific'
      : serviceUsername && servicePassword
        ? 'SP_KERBEROS_SERVICE_USER/SP_KERBEROS_SERVICE_PASSWORD'
        : 'SP_USERNAME/SP_PASSWORD';
    // eslint-disable-next-line no-console
    console.log(`[Credentials] Using ${source} credentials for SharePoint proxy`);
    return { username: usernameEnv, password: passwordEnv };
  }

  // eslint-disable-next-line no-console
  console.error(
    '[Credentials] No credentials found! Set SP_KERBEROS_SERVICE_USER/SP_KERBEROS_SERVICE_PASSWORD.'
  );
  return null;
}
