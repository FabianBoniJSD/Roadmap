# Auth-Modus Änderungen: Service Account statt User Login

**Datum**: November 2025  
**Grund**: Temporäre Deaktivierung der Kerberos/Windows-basierten User-Authentifizierung

---

## 🔄 Übersicht der Änderungen

Die Anwendung verwendet nun ausschließlich **Service Account Authentifizierung** für Admin-Zugriff. Es gibt kein User-Login-Interface mehr - der Service Account aus den Environment Variables authentifiziert sich direkt bei SharePoint.

### Vorher (User Login)
- Benutzer öffnet `/admin/login`
- Popup-Fenster für Windows-Authentifizierung
- JWT-Token wird in `sessionStorage` gespeichert
- Token-basierte Session-Verwaltung

### Nachher (Service Account)
- Service Account aus `.env.local` / `.env.vault.json`
- Direkter Admin-Check via `/api/auth/check-admin`
- Keine User-Sessions, keine Tokens
- Login-Seite zeigt nur Status an und leitet weiter

---

## 📝 Geänderte Dateien

### 1. `pages/admin/login.tsx`
**Änderungen**:
- ❌ Entfernt: User-Login-Formular
- ❌ Entfernt: Popup-Fenster für Windows-Auth
- ❌ Entfernt: Token-Management (sessionStorage)
- ✅ Neu: Direkter Service Account Admin-Check
- ✅ Neu: Status-Anzeige während Prüfung
- ✅ Neu: "Erneut prüfen" Button bei Fehler

**Verhalten**:
```
Benutzer → /admin/login
   ↓
Service Account Admin Check
   ↓
Admin? → JA  → Weiterleitung zu /admin
       → NEIN → Fehlermeldung + "Erneut prüfen"
```

### 2. `utils/auth.ts`
**Änderungen**:
- ❌ Entfernt: Token-Validierung via `/api/auth/check-admin-session`
- ❌ Entfernt: sessionStorage Token-Management
- ✅ Neu: Direkter Call zu `/api/auth/check-admin` (Service Account)
- ✅ Aktualisiert: `logout()` ist nun ein No-Op (keine Session zu löschen)
- ✅ Aktualisiert: `getAdminUsername()` gibt "Service Account" zurück

**API**:
```typescript
// Vorher: Token-basiert
hasAdminAccess() → check sessionStorage → validate token → return bool

// Nachher: Service Account
hasAdminAccess() → call /api/auth/check-admin → return bool
```

### 3. `components/withAdminAuth.tsx`
**Änderungen**:
- ✅ Aktualisiert: Kommentare für Service Account Auth
- ✅ Verhalten: Bei fehlendem Admin-Zugriff → Redirect zu Login (zeigt Fehler)

**HOC-Verhalten**:
```typescript
withAdminAuth(Component)
   ↓
Service Account Check
   ↓
Admin? → JA  → Render Component
       → NEIN → Redirect /admin/login (Fehlerseite)
```

### 4. `.env.example`
**Änderungen**:
- ✅ Aktualisiert: Kommentare für Service Account
- ✅ Hinweis: Kein User-Login-Interface mehr
- ✅ Klarstellung: Service Account braucht Admin-Rechte

---

## 🔐 Admin-Berechtigungen

Der **Service Account** (aus `SP_USERNAME` / `SP_PASSWORD`) muss eine der folgenden Berechtigungen haben:

1. **Site Collection Administrator** (empfohlen)
   - SharePoint Site Settings → Site Collection Administrators
   
2. **Associated Owners Group**
   - SharePoint Site Permissions → Owners Group
   
3. **Gruppe mit "Owner" oder "Besitzer" im Namen** (Fallback)

**Prüf-Logik** in `utils/clientDataService.ts`:
```typescript
isCurrentUserAdmin() {
  1. Check: IsSiteAdmin property
  2. Check: AssociatedOwnerGroup membership
  3. Check: Groups with "Owner"/"Besitzer" in title
}
```

---

## 🚀 Verwendung

### Entwicklung (lokal)

```bash
# .env.local erstellen
cp .env.example .env.local

# Service Account eintragen
SP_USERNAME=DOMAIN\\admin-service-account
SP_PASSWORD=SuperSecurePassword123
SP_STRATEGY=onprem

# Anwendung starten
npm run dev
```

Beim Aufruf von `/admin` oder Admin-geschützten Seiten:
1. `withAdminAuth` HOC prüft Service Account
2. Bei Admin-Rechten → Seite wird geladen
3. Ohne Admin-Rechte → Redirect zu `/admin/login` (Fehlerseite)

### Produktion

```bash
# Service Account Credentials verschlüsseln
npm run secrets:generate-key
export SECRETS_MASTER_KEY="generated-key"
npm run secrets:encrypt

# Auf dem Server
# Nur SECRETS_MASTER_KEY als Environment Variable setzen
SECRETS_MASTER_KEY=your-master-key

# Credentials werden automatisch entschlüsselt
npm run build
npm run start
```

---

## 🔍 Testing

### Admin-Check testen

```bash
# Mit korrektem Service Account
curl http://localhost:3000/api/auth/check-admin
# → {"isAdmin": true}

# Ohne Credentials oder falsche Credentials
# → {"isAdmin": false}
```

### Login-Flow testen

1. Browser öffnen: `http://localhost:3000/admin`
2. Automatischer Redirect zu `/admin/login`
3. Status: "Prüfe Service Account Berechtigung..."
4. Ergebnis:
   - ✅ Admin-Rechte → Weiterleitung zu `/admin`
   - ❌ Keine Rechte → Fehlermeldung + "Erneut prüfen" Button

---

## ⚠️ Einschränkungen

### Keine User-spezifischen Aktionen mehr

Da alle Admin-Operationen über den Service Account laufen:
- ❌ Kein User-Tracking für Änderungen
- ❌ Keine individuellen Permissions
- ❌ Alle Änderungen erscheinen als "Service Account"

**Empfehlung für Audit-Trail**:
```typescript
// In API Routes, z.B. pages/api/projects/[id].ts
const metadata = {
  modifiedBy: 'Service Account',
  modifiedAt: new Date().toISOString(),
  // Optional: Client IP für Logging
  clientIp: req.headers['x-forwarded-for'] || req.socket.remoteAddress
};
```

### Shared Admin Access

Jeder mit Zugriff auf den Server (oder `.env.local`) hat Admin-Rechte.

**Sicherheitsmaßnahmen**:
1. ✅ `.env.local` nie committen (in `.gitignore`)
2. ✅ Verschlüsselte `.env.vault.json` für Produktion
3. ✅ Master-Key separat speichern (Password Manager, Key Vault)
4. ✅ Server-Zugriff einschränken
5. ✅ SharePoint Audit-Logging aktivieren

---

## 🔄 Rückgängig machen (Falls nötig)

Um zur User-Login-Authentifizierung zurückzukehren:

```bash
# Git Revert der Änderungen
git log --oneline  # Finde Commit-Hash
git revert <commit-hash>

# Oder manuell:
# 1. pages/admin/login.tsx → User-Login-Formular wiederherstellen
# 2. utils/auth.ts → Token-basierte hasAdminAccess() wiederherstellen
# 3. components/withAdminAuth.tsx → Token-Check wiederherstellen
```

---

## 📚 Weiterführende Dokumentation

- [Secrets Management](./README_SECRETS.md) - Verschlüsselung & Deployment
- [Quick Start Secrets](./QUICKSTART_SECRETS.md) - 5-Minuten Setup
- [Admin Auth Changes](./docs/ADMIN_AUTH_CHANGES.md) - Original Auth-Migration
- [Copilot Instructions](./.github/copilot-instructions.md) - Architektur-Übersicht

---

## 🆘 Troubleshooting

### "Service Account hat keine Admin-Berechtigung"

**Ursachen**:
1. Service Account ist nicht Site Collection Admin
2. Service Account nicht in Owners Group
3. SharePoint-Verbindung fehlgeschlagen

**Lösung**:
```bash
# 1. Credentials prüfen
echo $SP_USERNAME
echo $SP_PASSWORD  # (nur prüfen ob gesetzt, nicht anzeigen!)

# 2. SharePoint-Verbindung testen
npm run ntlm:diag

# 3. Admin-API direkt testen
curl -v http://localhost:3000/api/auth/check-admin

# 4. Debug-Logging aktivieren
# In .env.local:
SP_PROXY_DEBUG=true
NEXT_PUBLIC_DEBUG_AUTH=true
```

### "Fehler bei der Admin-Prüfung"

**Ursachen**:
- SharePoint nicht erreichbar
- Falsche Credentials
- Netzwerk-/Firewall-Probleme

**Lösung**:
1. Server-Logs prüfen: `npm run dev` Output
2. SharePoint Health Check: `http://localhost:3000/api/health/sharepoint`
3. Authentication Strategy prüfen: `SP_STRATEGY=onprem` (für On-Premises)

---

**Erstellt**: November 2025  
**Maintainer**: DevOps Team
