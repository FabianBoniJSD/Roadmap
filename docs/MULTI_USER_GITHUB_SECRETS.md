# Multi-User GitHub Secrets Integration

**Datum**: November 2025  
**Feature**: Dynamische User-Verwaltung über GitHub Secrets

---

## 🎯 Übersicht

Die Anwendung unterstützt jetzt **mehrere User über GitHub Secrets** statt einem einzelnen Service Account. Jeder konfigurierte User hat automatisch Admin-Rechte.

### Vorteile

✅ **Mehrere User**: Jedes Team-Mitglied kann eigene Credentials haben  
✅ **Auto-Admin**: Alle USER_* Secrets haben automatisch Admin-Rechte  
✅ **Einfache Rotation**: Einzelne User-Credentials ändern ohne andere zu beeinflussen  
✅ **Flexibel**: Dynamische Erkennung aller USER_* Environment Variables  
✅ **Fallback**: Unterstützt weiterhin SP_USERNAME/SP_PASSWORD als Fallback

---

## 📝 GitHub Secrets Format

### Secret-Naming-Pattern

```
USER_<NAME>
```

Beispiele:
- `USER_FABIAN`
- `USER_STEFAN`
- `USER_ADMIN`
- `USER_SERVICEACCOUNT`

### Secret-Value-Format

```
<username>:<password>
```

Beispiele:
- `fabian:SecurePassword123`
- `stefan:MyPass456`
- `admin:ServicePass789`

**Wichtig**: Wenn das Passwort einen Doppelpunkt (`:`) enthält, ist das kein Problem - alles nach dem ersten `:` wird als Passwort behandelt.

---

## 🔧 Setup

### GitHub Repository Secrets

1. Gehe zu: **Repository → Settings → Secrets and variables → Actions**

2. Klicke auf **"New repository secret"**

3. Füge User hinzu:

   | Name | Value |
   |------|-------|
   | `USER_FABIAN` | `fabian:password123` |
   | `USER_STEFAN` | `stefan:secure456` |
   | `USER_ADMIN` | `admin:admin789` |

4. Secrets werden automatisch beim Deployment als Environment Variables verfügbar

### GitHub Actions Workflow

Die Secrets werden im Workflow automatisch geladen:

```yaml
- name: Build application
  env:
    USER_FABIAN: ${{ secrets.USER_FABIAN }}
    USER_STEFAN: ${{ secrets.USER_STEFAN }}
    USER_ADMIN: ${{ secrets.USER_ADMIN }}
  run: npm run build
```

**Hinweis**: Neue User einfach in `.github/workflows/deploy.yml` hinzufügen!

### Lokale Entwicklung

Für lokales Testen:

**PowerShell**:
```powershell
$env:USER_FABIAN="fabian:password"
$env:USER_STEFAN="stefan:secure"
npm run dev
```

**Bash/Linux**:
```bash
export USER_FABIAN="fabian:password"
export USER_STEFAN="stefan:secure"
npm run dev
```

**Oder in `.env.local`**:
```bash
USER_FABIAN=fabian:password
USER_STEFAN=stefan:secure
```

---

## 🔐 Wie es funktioniert

### 1. Credential-Loading

```typescript
// utils/userCredentials.ts
loadUserCredentialsFromSecrets()
  → Scannt alle Environment Variables
  → Findet USER_* Pattern
  → Parsed "username:password"
  → Gibt Array aller verfügbaren User zurück
```

### 2. Credential-Auswahl

```typescript
// utils/userCredentials.ts
getPrimaryCredentials()
  → Sucht USER_* Secrets
  → Wählt ersten verfügbaren User
  → Fallback zu SP_USERNAME/SP_PASSWORD
  → Gibt { username, password } zurück
```

### 3. Admin-Check

```typescript
// pages/api/auth/check-admin.ts
if (githubUsers.length > 0) {
  // Alle USER_* haben automatisch Admin-Rechte
  return { isAdmin: true, mode: 'github-secrets' }
} else {
  // Fallback: SharePoint Permission Check
  return { isAdmin: await checkSharePointPermissions() }
}
```

### 4. SharePoint-Authentifizierung

```typescript
// utils/spAuth.ts
getSharePointAuthHeaders()
  → Ruft getPrimaryCredentials() auf
  → Verwendet ersten verfügbaren User
  → Erstellt Auth-Header für SharePoint
  → Cached für Performance
```

---

## 🚀 Verwendung

### Automatische User-Auswahl

Die Anwendung wählt automatisch den ersten verfügbaren User:

```
Environment Variables:
  USER_FABIAN=fabian:pass1
  USER_STEFAN=stefan:pass2

→ Verwendet: fabian (erster gefunden)
```

### Admin-Zugriff

Alle konfigurierten USER_* haben automatisch Admin-Rechte:

```bash
# Admin-Check
curl http://localhost:3000/api/auth/check-admin

# Response:
{
  "isAdmin": true,
  "mode": "github-secrets",
  "users": ["fabian", "stefan"]
}
```

### User-Liste anzeigen

```typescript
import { getAllAvailableUsers } from '@/utils/userCredentials';

const users = getAllAvailableUsers();
console.log('Available users:', users);
// → ["fabian", "stefan", "admin"]
```

---

## 📊 Vergleich: Vorher vs. Nachher

### Vorher (Single Service Account)

```bash
# .env.local
SP_USERNAME=serviceaccount
SP_PASSWORD=ServicePassword123
```

**Einschränkungen**:
- ❌ Nur ein User
- ❌ Bei Passwort-Änderung: Gesamte Anwendung betroffen
- ❌ Keine User-Trennung
- ❌ SharePoint Permission Check erforderlich

### Nachher (Multi-User GitHub Secrets)

```bash
# GitHub Secrets
USER_FABIAN=fabian:pass1
USER_STEFAN=stefan:pass2
USER_ADMIN=admin:pass3
```

**Vorteile**:
- ✅ Mehrere User
- ✅ Individuelle Passwort-Rotation
- ✅ Auto-Admin (kein SharePoint Check)
- ✅ Flexibel erweiterbar

---

## 🔄 User hinzufügen/entfernen

### Neuen User hinzufügen

1. **GitHub Secret erstellen**:
   - Repository → Settings → Secrets → New secret
   - Name: `USER_NEWUSER`
   - Value: `newuser:password`

2. **Workflow aktualisieren** (`.github/workflows/deploy.yml`):
   ```yaml
   env:
     USER_FABIAN: ${{ secrets.USER_FABIAN }}
     USER_STEFAN: ${{ secrets.USER_STEFAN }}
     USER_NEWUSER: ${{ secrets.USER_NEWUSER }}  # ← NEU
   ```

3. **Deployment**: Beim nächsten Push ist der User aktiv

### User entfernen

1. **GitHub Secret löschen**:
   - Repository → Settings → Secrets → USER_XYZ → Delete

2. **Workflow bereinigen** (optional):
   - Zeile aus `.github/workflows/deploy.yml` entfernen

3. **Deployment**: User ist ab nächstem Deploy inaktiv

---

## 🔍 Debugging

### User-Liste prüfen

```typescript
// In einer API Route oder Server-seitigen Code
import { loadUserCredentialsFromSecrets } from '@/utils/userCredentials';

const users = loadUserCredentialsFromSecrets();
console.log('Configured users:', users.length);
users.forEach(u => {
  console.log(`  - ${u.source}: ${u.username}`);
});
```

**Erwartete Ausgabe**:
```
Configured users: 3
  - USER_FABIAN: fabian
  - USER_STEFAN: stefan
  - USER_ADMIN: admin
```

### Credential-Auswahl testen

```typescript
import { getPrimaryCredentials } from '@/utils/userCredentials';

const creds = getPrimaryCredentials();
if (creds) {
  console.log('Using:', creds.username);
} else {
  console.error('No credentials available!');
}
```

### Environment Variables prüfen

**PowerShell**:
```powershell
# Alle USER_* anzeigen
Get-ChildItem env: | Where-Object { $_.Name -like "USER_*" }
```

**Bash**:
```bash
# Alle USER_* anzeigen
env | grep "^USER_"
```

---

## ⚠️ Sicherheitshinweise

### DO's ✅

1. **GitHub Secrets verwenden** für Produktion
2. **Unterschiedliche Passwörter** für jeden User
3. **Regelmäßige Rotation** der Credentials
4. **Minimale Berechtigungen** im SharePoint (reicht Normal-User, kein Admin nötig)
5. **Audit-Logging** aktivieren

### DON'Ts ❌

1. ❌ **Nie Credentials committen** (auch nicht in .env.local)
2. ❌ **Nie Secrets in Logs ausgeben**
3. ❌ **Keine Shared Passwords** zwischen Usern
4. ❌ **Keine persönlichen Accounts** für Produktion (Service Accounts bevorzugen)

---

## 🆘 Troubleshooting

### "No credentials found"

**Problem**: Keine USER_* Secrets und kein SP_USERNAME/SP_PASSWORD

**Lösung**:
```bash
# Lokal: .env.local erstellen
USER_ADMIN=admin:password

# Oder Fallback setzen
SP_USERNAME=serviceaccount
SP_PASSWORD=password
```

### "Invalid format in USER_XYZ"

**Problem**: Secret enthält nicht "username:password"

**Lösung**: Secret-Format prüfen
```
✅ Richtig: username:password123
❌ Falsch:  username
❌ Falsch:  password123
```

### User wird nicht erkannt

**Problem**: USER_* Secret existiert, wird aber nicht gefunden

**Debugging**:
```typescript
// In check-admin.ts temporär hinzufügen:
console.log('All env vars:', Object.keys(process.env).filter(k => k.startsWith('USER_')));
```

**Mögliche Ursachen**:
1. Secret nicht im Workflow gemapped
2. Typo im Secret-Namen
3. Secret-Value ist leer

---

## 📚 API-Referenz

### `loadUserCredentialsFromSecrets()`

Scannt Environment Variables nach USER_* Pattern.

**Returns**: `UserCredentials[]`

```typescript
interface UserCredentials {
  username: string;
  password: string;
  source: string; // z.B. "USER_FABIAN"
}
```

### `getPrimaryCredentials()`

Gibt den ersten verfügbaren User zurück.

**Returns**: `{ username: string, password: string } | null`

**Fallback-Reihenfolge**:
1. USER_* Secrets
2. SP_USERNAME/SP_PASSWORD
3. null

### `getAllAvailableUsers()`

Liste aller verfügbaren Usernames.

**Returns**: `string[]`

### `hasCredentialsForUser(username)`

Prüft ob Credentials für einen bestimmten User existieren.

**Returns**: `boolean`

### `getCredentialsForUser(username)`

Gibt Credentials für einen spezifischen User zurück.

**Returns**: `{ username: string, password: string } | null`

---

## 📖 Weiterführende Dokumentation

- [Service Account Auth](./AUTH_MODE_SERVICE_ACCOUNT.md)
- [Secrets Management](../README_SECRETS.md)
- [Deployment Workflow](../.github/workflows/deploy.yml)
- [Environment Variables](../.env.example)

---

**Erstellt**: November 2025  
**Feature**: Multi-User GitHub Secrets  
**Status**: ✅ Production Ready
