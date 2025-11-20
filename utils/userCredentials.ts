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
          console.warn(`[Credentials] Invalid format in ${key}: missing username or password`);
        }
      } else {
        console.warn(`[Credentials] Invalid format in ${key}: expected format "username:password"`);
      }
    }
  }

  if (users.length === 0) {
    console.warn('[Credentials] No USER_* secrets found. Fallback to SP_USERNAME/SP_PASSWORD if available.');
  } else {
    console.log(`[Credentials] Loaded ${users.length} user credential(s) from GitHub Secrets`);
  }

  return users;
}

/**
 * Get the first available user credentials
 * Priority: GitHub Secrets (USER_*) → Fallback to SP_USERNAME/SP_PASSWORD
 */
export function getPrimaryCredentials(): { username: string; password: string } | null {
  // Try GitHub Secrets first
  const users = loadUserCredentialsFromSecrets();
  if (users.length > 0) {
    const primary = users[0];
    console.log(`[Credentials] Using ${primary.source}: ${primary.username}`);
    return { username: primary.username, password: primary.password };
  }

  // Fallback to traditional environment variables
  const username = process.env.SP_USERNAME;
  const password = process.env.SP_PASSWORD;

  if (username && password) {
    console.log('[Credentials] Using fallback SP_USERNAME/SP_PASSWORD');
    return { username, password };
  }

  console.error('[Credentials] No credentials found! Set USER_* secrets or SP_USERNAME/SP_PASSWORD');
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
