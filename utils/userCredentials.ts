/**
 * Parse credentials from GitHub Secrets in format USER_<name>
 * Each secret contains: <username>:<password>
 * All users found automatically have admin rights
 */

interface UserCredentials {
  username: string;
  password: string;
  source: string; // e.g., "USER_FABIAN"
}

/**
 * Scan environment variables for USER_* secrets and parse credentials
 */
export function loadUserCredentialsFromSecrets(): UserCredentials[] {
  const users: UserCredentials[] = [];

  // Scan all environment variables for USER_* pattern
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('USER_') && value && typeof value === 'string') {
      const parts = value.split(':');
      if (parts.length >= 2) {
        const username = parts[0].trim();
        const password = parts.slice(1).join(':').trim(); // Handle passwords with ':'

        if (username && password) {
          users.push({
            username,
            password,
            source: key,
          });
        } else {
          // eslint-disable-next-line no-console
          console.warn(`[Credentials] Invalid format in ${key}: missing username or password`);
        }
      } else {
        // eslint-disable-next-line no-console
        console.warn(`[Credentials] Invalid format in ${key}: expected format "username:password"`);
      }
    }
  }

  if (users.length === 0) {
    // eslint-disable-next-line no-console
    console.warn(
      '[Credentials] No USER_* secrets found. Admin panel logins will rely on SP_USERNAME/SP_PASSWORD.'
    );
  } else {
    // eslint-disable-next-line no-console
    console.log(`[Credentials] Loaded ${users.length} user credential(s) from GitHub Secrets`);
  }

  return users;
}

/**
 * Get the first available user credentials
 * Priority: SP_USERNAME/SP_PASSWORD → Fallback to GitHub Secrets (USER_*)
 */
export function getPrimaryCredentials(): { username: string; password: string } | null {
  const usernameEnv = (process.env.SP_USERNAME || '').trim();
  const passwordEnv = process.env.SP_PASSWORD;

  if (usernameEnv && passwordEnv) {
    // eslint-disable-next-line no-console
    console.log('[Credentials] Using SP_USERNAME/SP_PASSWORD for SharePoint proxy');
    return { username: usernameEnv, password: passwordEnv };
  }

  // Fallback to USER_* only if legacy deployments rely on it (admin panel still reads USER_* directly)
  const users = loadUserCredentialsFromSecrets();
  if (users.length > 0) {
    const primary = users[0];
    // eslint-disable-next-line no-console
    console.warn(
      `[Credentials] SP_USERNAME/SP_PASSWORD not set. Falling back to ${primary.source} for SharePoint proxy access (intended for admin panel only).`
    );
    return { username: primary.username, password: primary.password };
  }

  // eslint-disable-next-line no-console
  console.error(
    '[Credentials] No credentials found! Set SP_USERNAME/SP_PASSWORD (preferred) or USER_* secrets.'
  );
  return null;
}

/**
 * Get all available users (for admin list display)
 */
export function getAllAvailableUsers(): string[] {
  const users = loadUserCredentialsFromSecrets();
  return users.map((u) => u.username);
}

/**
 * Check if a specific username has credentials available
 */
export function hasCredentialsForUser(username: string): boolean {
  const users = loadUserCredentialsFromSecrets();
  return users.some((u) => u.username.toLowerCase() === username.toLowerCase());
}

/**
 * Get credentials for a specific user (by username)
 */
export function getCredentialsForUser(
  username: string
): { username: string; password: string } | null {
  const users = loadUserCredentialsFromSecrets();
  const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  return user ? { username: user.username, password: user.password } : null;
}
