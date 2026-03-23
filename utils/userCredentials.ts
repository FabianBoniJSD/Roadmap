/**
 * Resolve SharePoint service-account credentials from environment variables.
 * Priority: SP_KERBEROS_SERVICE_* → SP_USERNAME/SP_PASSWORD.
 */
export function getPrimaryCredentials(): { username: string; password: string } | null {
  const serviceUsername = (process.env.SP_KERBEROS_SERVICE_USER ?? '').trim();
  const servicePassword = process.env.SP_KERBEROS_SERVICE_PASSWORD ?? '';
  const legacyUsername = (process.env.SP_USERNAME ?? '').trim();
  const legacyPassword = process.env.SP_PASSWORD ?? '';

  const usernameEnv = (serviceUsername || legacyUsername || '').trim();
  const passwordEnv = servicePassword || legacyPassword;

  if (usernameEnv && passwordEnv) {
    const source =
      serviceUsername && servicePassword
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
