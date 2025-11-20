# Sichere Verwaltung von Zugangsdaten und Secrets

## 🔒 Übersicht

Dieses Dokument beschreibt Best Practices für die sichere Verwaltung von SharePoint-Zugangsdaten und anderen sensiblen Konfigurationswerten in diesem Projekt.

## ⚠️ Sicherheitswarnung

**NIEMALS** die folgenden Dateien in Git committen:
- `.env.local`
- `.env.production`
- `.env` (wenn sie Passwörter enthält)
- Jegliche Dateien mit Zugangsdaten im Klartext

Diese Dateien sind bereits in `.gitignore` eingetragen.

---

## 🎯 Empfohlene Lösung: dotenv-vault

**dotenv-vault** ist eine sichere, kostenlose Lösung zur Verschlüsselung und Verwaltung von Environment Variables.

### Installation

```bash
npm install dotenv-vault-core --save
```

### Setup-Anleitung

#### 1. Vault initialisieren

```bash
npx dotenv-vault new
```

Dies erstellt eine verschlüsselte `.env.vault` Datei.

#### 2. Secrets hinzufügen

Erstellen Sie eine `.env.local` mit Ihren echten Zugangsdaten:

```bash
# .env.local (wird NICHT committed)
SP_USERNAME=DOMAIN\\serviceaccount
SP_PASSWORD=Ihr-Sicheres-Passwort-Hier
JWT_SECRET=sehr-langer-zufälliger-string-mindestens-32-zeichen
```

#### 3. Vault verschlüsseln

```bash
npx dotenv-vault local build
```

Dies verschlüsselt Ihre `.env.local` und erstellt `.env.vault`.

#### 4. Vault-Schlüssel sichern

Der Entschlüsselungs-Schlüssel wird angezeigt. **Speichern Sie diesen sicher!**

```bash
# Für Produktion (auf dem Server setzen)
DOTENV_KEY="dotenv://:key_1234...@dotenv.local/vault/.env.vault?environment=production"
```

#### 5. In der Anwendung verwenden

Ändern Sie `next.config.mjs` (am Anfang der Datei):

```javascript
// dotenv-vault laden BEVOR andere Environment Variables gelesen werden
if (process.env.DOTENV_KEY) {
  require('dotenv-vault-core').config();
}

const deploymentEnv = process.env.NEXT_PUBLIC_DEPLOYMENT_ENV || process.env.NODE_ENV || 'development';
// ... rest of config
```

### Für Team-Mitglieder

Jedes Team-Mitglied braucht nur:
1. Den `DOTENV_KEY` (einmalig vom Admin erhalten)
2. Schlüssel als Environment Variable setzen oder in `.env` (ohne Secrets):

```bash
# .env (kann committed werden)
DOTENV_KEY="dotenv://:key_1234...@dotenv.local/vault/.env.vault?environment=development"
```

---

## 🔧 Alternative Lösungen

### Option 1: Manuelle Verschlüsselung mit Node.js Crypto

Erstellen Sie ein einfaches Verschlüsselungs-Script:

#### `scripts/encrypt-secrets.mjs`

```javascript
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const algorithm = 'aes-256-gcm';
const MASTER_KEY_ENV = 'SECRETS_MASTER_KEY'; // Muss extern gesetzt werden (32 bytes)

function encrypt(text, masterKey) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(masterKey, 'hex'), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
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

// Master Key generieren (einmalig!)
function generateMasterKey() {
  return crypto.randomBytes(32).toString('hex');
}

// Verwendung
if (process.argv[2] === 'generate-key') {
  console.log('Master Key (SICHER SPEICHERN!):', generateMasterKey());
} else if (process.argv[2] === 'encrypt') {
  const masterKey = process.env[MASTER_KEY_ENV];
  if (!masterKey) {
    console.error(`Error: ${MASTER_KEY_ENV} environment variable not set`);
    process.exit(1);
  }
  
  const envFile = fs.readFileSync('.env.local', 'utf8');
  const encrypted = encrypt(envFile, masterKey);
  
  fs.writeFileSync('.env.vault.json', JSON.stringify(encrypted, null, 2));
  console.log('✅ Secrets encrypted to .env.vault.json');
} else if (process.argv[2] === 'decrypt') {
  const masterKey = process.env[MASTER_KEY_ENV];
  if (!masterKey) {
    console.error(`Error: ${MASTER_KEY_ENV} environment variable not set`);
    process.exit(1);
  }
  
  const encryptedData = JSON.parse(fs.readFileSync('.env.vault.json', 'utf8'));
  const decrypted = decrypt(encryptedData, masterKey);
  
  console.log('Decrypted content:');
  console.log(decrypted);
}

export { encrypt, decrypt, generateMasterKey };
```

#### Verwendung:

```bash
# 1. Master Key generieren (einmalig, sicher speichern!)
node scripts/encrypt-secrets.mjs generate-key

# 2. Master Key als Environment Variable setzen
export SECRETS_MASTER_KEY="your-generated-key-here"

# 3. .env.local verschlüsseln
node scripts/encrypt-secrets.mjs encrypt

# 4. .env.vault.json ins Repository committen
git add .env.vault.json
```

#### Beim Deployment entschlüsseln:

Ändern Sie `pages/_app.tsx` oder erstellen Sie `utils/loadSecrets.ts`:

```typescript
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export function loadEncryptedSecrets() {
  const masterKey = process.env.SECRETS_MASTER_KEY;
  if (!masterKey) {
    console.warn('SECRETS_MASTER_KEY not set, skipping encrypted secrets');
    return;
  }
  
  try {
    const vaultPath = path.join(process.cwd(), '.env.vault.json');
    if (!fs.existsSync(vaultPath)) {
      console.warn('.env.vault.json not found');
      return;
    }
    
    const encryptedData = JSON.parse(fs.readFileSync(vaultPath, 'utf8'));
    
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(masterKey, 'hex'),
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    // Parse und setze Environment Variables
    decrypted.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2];
      }
    });
    
    console.log('✅ Encrypted secrets loaded successfully');
  } catch (error) {
    console.error('❌ Failed to load encrypted secrets:', error);
  }
}
```

Dann in `next.config.mjs`:

```javascript
// Am Anfang der Datei
if (typeof require !== 'undefined' && process.env.SECRETS_MASTER_KEY) {
  const { loadEncryptedSecrets } = require('./utils/loadSecrets');
  loadEncryptedSecrets();
}
```

### Option 2: Azure Key Vault (Für Enterprise)

Wenn Ihre Organisation Azure verwendet:

```bash
npm install @azure/identity @azure/keyvault-secrets
```

```typescript
// utils/azureSecrets.ts
import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';

export async function loadFromKeyVault() {
  if (!process.env.AZURE_KEY_VAULT_NAME) return;
  
  const vaultUrl = `https://${process.env.AZURE_KEY_VAULT_NAME}.vault.azure.net`;
  const credential = new DefaultAzureCredential();
  const client = new SecretClient(vaultUrl, credential);
  
  try {
    const secrets = [
      'SP-USERNAME',
      'SP-PASSWORD',
      'JWT-SECRET'
    ];
    
    for (const secretName of secrets) {
      const secret = await client.getSecret(secretName);
      const envName = secretName.replace(/-/g, '_');
      if (!process.env[envName]) {
        process.env[envName] = secret.value;
      }
    }
    
    console.log('✅ Secrets loaded from Azure Key Vault');
  } catch (error) {
    console.error('❌ Failed to load secrets from Key Vault:', error);
  }
}
```

### Option 3: Windows Credential Manager (Nur für Windows Server)

Für selbst-gehostete Windows-Umgebungen:

```bash
npm install node-credential-manager
```

```typescript
// utils/windowsSecrets.ts
import * as credManager from 'node-credential-manager';

export function loadFromWindowsCredentials() {
  if (process.platform !== 'win32') return;
  
  try {
    const credentials = [
      { env: 'SP_USERNAME', target: 'roadmap-app-sp-username' },
      { env: 'SP_PASSWORD', target: 'roadmap-app-sp-password' },
      { env: 'JWT_SECRET', target: 'roadmap-app-jwt-secret' }
    ];
    
    for (const cred of credentials) {
      if (!process.env[cred.env]) {
        const stored = credManager.getCredential(cred.target);
        if (stored) {
          process.env[cred.env] = stored.password;
        }
      }
    }
    
    console.log('✅ Secrets loaded from Windows Credential Manager');
  } catch (error) {
    console.error('❌ Failed to load from Credential Manager:', error);
  }
}
```

Credentials speichern via PowerShell:

```powershell
# Interaktiv speichern
cmdkey /add:roadmap-app-sp-username /user:roadmap-app /pass
cmdkey /add:roadmap-app-sp-password /user:roadmap-app /pass
cmdkey /add:roadmap-app-jwt-secret /user:roadmap-app /pass
```

---

## 📋 Deployment Checklist

### Entwicklungsumgebung

- [ ] `.env.example` nach `.env.local` kopieren
- [ ] Echte Zugangsdaten in `.env.local` eintragen
- [ ] `.env.local` ist in `.gitignore` eingetragen
- [ ] Anwendung startet erfolgreich mit `npm run dev`

### Produktion

- [ ] Secrets-Management-Lösung gewählt (dotenv-vault empfohlen)
- [ ] Master-Key / Vault-Key sicher gespeichert (nicht im Repository!)
- [ ] `.env.vault` oder verschlüsselte Secrets im Repository
- [ ] Entschlüsselungs-Key als Environment Variable auf dem Server gesetzt
- [ ] Test-Deployment durchgeführt
- [ ] Zugangsdaten rotieren nach Initial-Setup
- [ ] Audit-Logging in SharePoint aktiviert für Service Account

### GitHub Actions

Fügen Sie Repository Secrets hinzu:
1. GitHub Repository → Settings → Secrets and variables → Actions
2. Fügen Sie hinzu:
   - `DOTENV_KEY` (für dotenv-vault)
   - Oder `SECRETS_MASTER_KEY` (für manuelle Verschlüsselung)

Im Workflow (`.github/workflows/deploy.yml`):

```yaml
- name: Build application
  env:
    NODE_ENV: production
    DOTENV_KEY: ${{ secrets.DOTENV_KEY }}
  run: npm run build
```

---

## 🔍 Häufige Fehler

### "SP_USERNAME / SP_PASSWORD not set"

**Lösung**: 
- Entwicklung: `.env.local` existiert und enthält Zugangsdaten
- Produktion: Vault-Key korrekt gesetzt und Secrets entschlüsselt

### "Authentication failed" trotz korrekter Zugangsdaten

**Lösung**:
- Prüfen Sie `SP_STRATEGY` (muss zu SharePoint-Version passen)
- Bei Domain-Accounts: Format `DOMAIN\\username` verwenden
- NTLM-Diagnostics aktivieren: `SP_NTLM_DIAG=true`

### Secrets werden nicht geladen

**Lösung**:
- Überprüfen Sie, dass Secrets VOR Next.js-Config geladen werden
- Fügen Sie Debug-Logging hinzu: `console.log('SP_USERNAME:', process.env.SP_USERNAME ? '✓ Set' : '✗ Missing')`

---

## 📚 Weiterführende Links

- [dotenv-vault Dokumentation](https://www.dotenv.org/docs/security/env-vault)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [Azure Key Vault Best Practices](https://learn.microsoft.com/en-us/azure/key-vault/general/best-practices)
- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)

---

## 🆘 Support

Bei Problemen mit der Secrets-Verwaltung:
1. Überprüfen Sie die `.env.example` für korrekte Variable-Namen
2. Aktivieren Sie Debug-Logging: `SP_PROXY_DEBUG=true`
3. Prüfen Sie Server-Logs für Fehler beim Secrets-Laden
4. Kontaktieren Sie das DevOps-Team für Produktions-Credentials

---

**Letzte Aktualisierung**: November 2025
