import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const algorithm = 'aes-256-gcm';
const MASTER_KEY_ENV = 'SECRETS_MASTER_KEY';

function encrypt(text, masterKey) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    algorithm,
    Buffer.from(masterKey, 'hex'),
    iv
  );

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    algorithm: algorithm,
    version: '1.0'
  };
}

function decrypt(encryptedData, masterKey) {
  const decipher = crypto.createDecipheriv(
    algorithm,
    Buffer.from(masterKey, 'hex'),
    Buffer.from(encryptedData.iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

function generateMasterKey() {
  return crypto.randomBytes(32).toString('hex');
}

function validateMasterKey(key) {
  if (!key || key.length !== 64) {
    console.error('❌ Invalid master key format. Must be 64 hex characters (32 bytes).');
    return false;
  }
  return true;
}

// CLI Interface
const command = process.argv[2];

try {
  if (command === 'generate-key') {
    console.log('\n🔑 Generating new master key...\n');
    const key = generateMasterKey();
    console.log('Master Key (SICHER SPEICHERN - NIEMALS COMMITTEN!):\n');
    console.log(`  ${key}\n`);
    console.log('Verwendung:');
    console.log(`  export ${MASTER_KEY_ENV}="${key}"`);
    console.log(`  # Oder in .env (ohne andere Secrets):`);
    console.log(`  echo "${MASTER_KEY_ENV}=${key}" > .env\n`);
  } else if (command === 'encrypt') {
    const sourceFile = process.argv[3] || '.env.local';
    const targetFile = process.argv[4] || '.env.vault.json';

    const masterKey = process.env[MASTER_KEY_ENV];
    if (!masterKey) {
      console.error(`\n❌ Error: ${MASTER_KEY_ENV} environment variable not set`);
      console.error(`   Set it with: export ${MASTER_KEY_ENV}="your-key-here"\n`);
      process.exit(1);
    }

    if (!validateMasterKey(masterKey)) {
      process.exit(1);
    }

    const sourcePath = path.resolve(process.cwd(), sourceFile);
    if (!fs.existsSync(sourcePath)) {
      console.error(`\n❌ Error: Source file not found: ${sourcePath}\n`);
      process.exit(1);
    }

    console.log(`\n🔒 Encrypting ${sourceFile}...`);
    const envContent = fs.readFileSync(sourcePath, 'utf8');

    // Remove comments and empty lines for security
    const cleanedContent = envContent
      .split('\n')
      .filter((line) => {
        const trimmed = line.trim();
        return trimmed && !trimmed.startsWith('#');
      })
      .join('\n');

    const encrypted = encrypt(cleanedContent, masterKey);
    const targetPath = path.resolve(process.cwd(), targetFile);

    fs.writeFileSync(targetPath, JSON.stringify(encrypted, null, 2));
    console.log(`✅ Secrets encrypted successfully to: ${targetFile}`);
    console.log(`   You can now safely commit ${targetFile} to version control.\n`);
  } else if (command === 'decrypt') {
    const sourceFile = process.argv[3] || '.env.vault.json';
    const outputMode = process.argv[4] || 'print'; // 'print' or 'file'

    const masterKey = process.env[MASTER_KEY_ENV];
    if (!masterKey) {
      console.error(`\n❌ Error: ${MASTER_KEY_ENV} environment variable not set\n`);
      process.exit(1);
    }

    if (!validateMasterKey(masterKey)) {
      process.exit(1);
    }

    const sourcePath = path.resolve(process.cwd(), sourceFile);
    if (!fs.existsSync(sourcePath)) {
      console.error(`\n❌ Error: Encrypted file not found: ${sourcePath}\n`);
      process.exit(1);
    }

    console.log(`\n🔓 Decrypting ${sourceFile}...`);
    const encryptedData = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    const decrypted = decrypt(encryptedData, masterKey);

    if (outputMode === 'file') {
      const outputFile = process.argv[5] || '.env.local';
      const outputPath = path.resolve(process.cwd(), outputFile);
      fs.writeFileSync(outputPath, decrypted);
      console.log(`✅ Secrets decrypted to: ${outputFile}\n`);
    } else {
      console.log('\n📄 Decrypted content:\n');
      console.log('─'.repeat(60));
      console.log(decrypted);
      console.log('─'.repeat(60));
      console.log('');
    }
  } else if (command === 'verify') {
    const vaultFile = process.argv[3] || '.env.vault.json';

    const masterKey = process.env[MASTER_KEY_ENV];
    if (!masterKey) {
      console.error(`\n❌ Error: ${MASTER_KEY_ENV} environment variable not set\n`);
      process.exit(1);
    }

    const vaultPath = path.resolve(process.cwd(), vaultFile);
    if (!fs.existsSync(vaultPath)) {
      console.error(`\n❌ Error: Vault file not found: ${vaultPath}\n`);
      process.exit(1);
    }

    console.log(`\n🔍 Verifying ${vaultFile}...`);
    const encryptedData = JSON.parse(fs.readFileSync(vaultPath, 'utf8'));

    try {
      const decrypted = decrypt(encryptedData, masterKey);
      const lines = decrypted.split('\n').filter((l) => l.trim());
      console.log(`✅ Vault is valid and decryptable`);
      console.log(`   Contains ${lines.length} environment variable(s)\n`);
    } catch (error) {
      console.error('❌ Decryption failed. Master key is incorrect or vault is corrupted.\n');
      process.exit(1);
    }
  } else {
    console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║                     Secrets Management Tool                          ║
║              Secure Encryption for Environment Variables             ║
╚══════════════════════════════════════════════════════════════════════╝

Usage:
  node scripts/encrypt-secrets.mjs <command> [options]

Commands:
  generate-key                     Generate a new master encryption key
  encrypt [source] [target]        Encrypt .env file (default: .env.local → .env.vault.json)
  decrypt [source] [mode] [file]   Decrypt vault file
                                   mode: 'print' (default) or 'file'
  verify [vault]                   Verify vault can be decrypted

Examples:
  # 1. Generate master key (run once, store securely!)
  node scripts/encrypt-secrets.mjs generate-key

  # 2. Set the master key
  export SECRETS_MASTER_KEY="your-generated-key"

  # 3. Encrypt your local credentials
  node scripts/encrypt-secrets.mjs encrypt

  # 4. Verify encryption worked
  node scripts/encrypt-secrets.mjs verify

  # 5. Decrypt to console (for debugging)
  node scripts/encrypt-secrets.mjs decrypt

  # 6. Decrypt to file (for deployment)
  node scripts/encrypt-secrets.mjs decrypt .env.vault.json file .env.local

Environment Variables:
  SECRETS_MASTER_KEY    The 64-character hex master key for encryption/decryption

Security Notes:
  ⚠️  NEVER commit .env.local or .env.production
  ✓  You CAN commit .env.vault.json (it's encrypted)
  ⚠️  Store SECRETS_MASTER_KEY securely (password manager, Key Vault, etc.)
  ✓  Rotate keys regularly
  ✓  Use different keys for dev/staging/production

`);
  }
} catch (error) {
  console.error('\n❌ Error:', error.message);
  if (process.env.DEBUG) {
    console.error(error);
  }
  process.exit(1);
}
