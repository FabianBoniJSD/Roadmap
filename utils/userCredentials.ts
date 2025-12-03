/**
 * Parse credentials from GitHub Secrets in format USER_<name>
 * Each secret contains: <username>:<password or bcrypt hash>
 * All users found automatically have admin rights
 */

import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';

interface UserCredentials {
  username: string;
  password: string | null; // only present if the env value was plaintext
  passwordHash: string;
  hashed: boolean; // true if value in env was already hashed
  source: string; // e.g., "USER_FABIAN"
}

type RawEnvRecord = {
  value: string;
  file: string;
  quoted: 'single' | 'double' | 'none';
};

const BCRYPT_HASH_REGEX = /^\$2[aby]\$\d{2}\$.+/;
const HASH_ROUNDS = Math.min(
  Math.max(parseInt(process.env.USER_SECRET_HASH_ROUNDS || '12', 10), 4),
  15
);
const autoHashCache = new Map<string, string>();

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readRawEnvValue(variable: string): RawEnvRecord | null {
  for (const envFile of ['.env.local', '.env']) {
    const resolved = path.join(process.cwd(), envFile);
    if (!fs.existsSync(resolved)) continue;
    try {
      const content = fs.readFileSync(resolved, 'utf8');
      const regex = new RegExp(`^(?:export\\s+)?${escapeRegex(variable)}\\s*=\\s*(.*)$`, 'm');
      const match = content.match(regex);
      if (!match) continue;
      let raw = match[1].trim();
      // Remove inline comments after a space + #
      const hashIndex = raw.indexOf(' #');
      if (hashIndex > -1) {
        raw = raw.substring(0, hashIndex).trim();
      }
      let quoted: RawEnvRecord['quoted'] = 'none';
      if (
        (raw.startsWith('"') && raw.endsWith('"')) ||
        (raw.startsWith("'") && raw.endsWith("'"))
      ) {
        quoted = raw.startsWith("'") ? 'single' : 'double';
        raw = raw.substring(1, raw.length - 1);
      }
      return { value: raw, file: resolved, quoted };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`[Credentials] Failed to read ${envFile}:`, error);
    }
  }
  return null;
}

function updateEnvFile(variable: string, newValue: string): string | null {
  for (const envFile of ['.env.local', '.env']) {
    const resolved = path.join(process.cwd(), envFile);
    if (!fs.existsSync(resolved)) continue;
    try {
      const content = fs.readFileSync(resolved, 'utf8');
      const regex = new RegExp(
        `^(?<prefix>(?:export\\s+)?${escapeRegex(variable)}\\s*=\\s*)(?<value>.*)$`,
        'm'
      );
      if (!regex.test(content)) continue;
      const sanitized = newValue.replace(/'/g, "\\'");
      const replaced = content.replace(regex, (_line, prefix: string) => {
        return `${prefix}'${sanitized}'`;
      });
      fs.writeFileSync(resolved, replaced, 'utf8');
      return resolved;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`[Credentials] Failed to update ${envFile}:`, error);
    }
  }
  return null;
}

function hashPlaintextSecret(value: string, source: string, username: string): string {
  const cacheKey = `${source}:${value}`;
  if (autoHashCache.has(cacheKey)) {
    return autoHashCache.get(cacheKey)!;
  }
  const hashed = bcrypt.hashSync(value, HASH_ROUNDS);
  autoHashCache.set(cacheKey, hashed);
  // Update process env so subsequent reads during this runtime already use the hashed form
  process.env[source] = `${username}:${hashed}`;
  const updatedFile = updateEnvFile(source, `${username}:${hashed}`);
  // eslint-disable-next-line no-console
  console.warn(
    `[Credentials] ${source} contained plaintext. Generated bcrypt hash automatically (rounds=${HASH_ROUNDS}) and updated process env.` +
      (updatedFile
        ? ` Also rewrote ${path.relative(process.cwd(), updatedFile)}.`
        : ` Replace the secret with: ${source}=${username}:${hashed}`)
  );
  return hashed;
}

/**
 * Scan environment variables for USER_* secrets and parse credentials
 */
export function loadUserCredentialsFromSecrets(): UserCredentials[] {
  const users: UserCredentials[] = [];

  // Scan all environment variables for USER_* pattern
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('USER_') && value && typeof value === 'string') {
      const rawRecord = readRawEnvValue(key);
      const preferredValue = rawRecord?.value || value;
      const parts = preferredValue.split(':');
      if (parts.length >= 2) {
        const username = parts[0].trim();
        const passwordRaw = parts.slice(1).join(':').trim(); // Handle passwords with ':'

        if (username && passwordRaw) {
          let passwordHash = passwordRaw;
          let plaintext: string | null = null;
          let hashed = true;

          if (!BCRYPT_HASH_REGEX.test(passwordRaw)) {
            hashed = false;
            plaintext = passwordRaw;
            passwordHash = hashPlaintextSecret(passwordRaw, key, username);
          } else if (rawRecord && rawRecord.quoted !== 'single') {
            updateEnvFile(key, `${username}:${passwordHash}`);
          }

          users.push({
            username,
            password: plaintext,
            passwordHash,
            hashed,
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
 * Credentials overrides allow multi-instance providers (e.g., Prisma) to supply
 * SharePoint service-account usernames/passwords per tenant.
 */
export type CredentialOverrides = {
  username?: string | null;
  password?: string | null;
};

/**
 * Get the first available user credentials
 * Priority: explicit overrides → SP_USERNAME/SP_PASSWORD → GitHub Secrets (USER_*)
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

  // Fallback to USER_* only if legacy deployments rely on it (admin panel still reads USER_* directly)
  const users = loadUserCredentialsFromSecrets();
  if (users.length > 0) {
    const primary = users.find((user) => user.password);
    if (primary) {
      // eslint-disable-next-line no-console
      console.warn(
        `[Credentials] SP_USERNAME/SP_PASSWORD not set. Falling back to ${primary.source} for SharePoint proxy access (intended for admin panel only).`
      );
      return { username: primary.username, password: primary.password! };
    }
    // eslint-disable-next-line no-console
    console.error(
      '[Credentials] USER_* secrets are hashed only. Unable to fall back to them for SharePoint proxy access. Please configure SP_USERNAME/SP_PASSWORD.'
    );
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
): { username: string; password: string | null; passwordHash: string; hashed: boolean } | null {
  const users = loadUserCredentialsFromSecrets();
  const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  return user
    ? {
        username: user.username,
        password: user.password,
        passwordHash: user.passwordHash,
        hashed: user.hashed,
      }
    : null;
}
