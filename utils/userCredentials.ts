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
 * Priority: explicit overrides → SP_USERNAME/SP_PASSWORD.
 */
export function getPrimaryCredentials(
  overrides?: CredentialOverrides
): { username: string; password: string } | null {
  const usernameEnv = (overrides?.username ?? process.env.SP_USERNAME ?? '').trim();
  const passwordEnv = overrides?.password ?? process.env.SP_PASSWORD;

  if (usernameEnv && passwordEnv) {
    const usingOverrides = Boolean(overrides?.username || overrides?.password);
    // eslint-disable-next-line no-console
    console.log(
      `[Credentials] Using ${
        usingOverrides ? 'instance-specific' : 'SP_USERNAME/SP_PASSWORD'
      } credentials for SharePoint proxy`
    );
    return { username: usernameEnv, password: passwordEnv };
  }

  // eslint-disable-next-line no-console
  console.error('[Credentials] No credentials found! Set SP_USERNAME/SP_PASSWORD.');
  return null;
}
