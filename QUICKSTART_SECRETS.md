# 🚀 Quick Start: Zugangsdaten sicher einrichten

Diese Anleitung zeigt Ihnen, wie Sie in **5 Minuten** die SharePoint-Zugangsdaten sicher konfigurieren.

---

## Option A: Entwicklung (Einfach, Lokal)

**Für Entwickler, die lokal arbeiten:**

### Schritt 1: .env.local erstellen

```bash
# Kopieren Sie die Beispiel-Datei
cp .env.example .env.local
```

### Schritt 2: Zugangsdaten eintragen

Öffnen Sie `.env.local` und tragen Sie Ihre Zugangsdaten ein:

```bash
# SharePoint-Zugangsdaten
SP_USERNAME=DOMAIN\\ihr-benutzername
SP_PASSWORD=IhrPasswort
SP_STRATEGY=onprem

# JWT Secret (für Admin-Login)
JWT_SECRET=generieren-sie-einen-langen-zufaelligen-string-hier

# SharePoint Site URLs
NEXT_PUBLIC_SHAREPOINT_SITE_URL_DEV=https://your-sharepoint.domain.com/sites/yoursite
```

### Schritt 3: Anwendung starten

```bash
npm install
npm run dev
```

✅ **Fertig!** Die Anwendung läuft auf http://localhost:3000

> ⚠️ **WICHTIG**: `.env.local` wird NICHT ins Git committed (bereits in .gitignore)

---

## Option B: Produktion (Verschlüsselt)

**Für Produktion oder Teamarbeit:**

### Schritt 1: Master-Key generieren

```bash
npm run secrets:generate-key
```

Kopieren Sie den generierten Key und **speichern Sie ihn sicher** (Passwort-Manager!).

### Schritt 2: Master-Key setzen

**Windows (PowerShell):**
```powershell
$env:SECRETS_MASTER_KEY="ihr-generierter-key-hier"
```

**Linux/Mac (Bash):**
```bash
export SECRETS_MASTER_KEY="ihr-generierter-key-hier"
```

### Schritt 3: .env.local mit Zugangsdaten erstellen

```bash
# .env.local (temporär, wird verschlüsselt)
SP_USERNAME=DOMAIN\\serviceaccount
SP_PASSWORD=ProduktionsPasswort
JWT_SECRET=sehr-langer-zufaelliger-string-fuer-produktion
NEXT_PUBLIC_SHAREPOINT_SITE_URL_PROD=https://sharepoint-prod.domain.com
```

### Schritt 4: Secrets verschlüsseln

```bash
npm run secrets:encrypt
```

Dies erstellt `.env.vault.json` (verschlüsselt, kann ins Git committed werden).

### Schritt 5: Verifizieren

```bash
npm run secrets:verify
```

### Schritt 6: .env.local löschen

```bash
# Windows
Remove-Item .env.local

# Linux/Mac
rm .env.local
```

### Schritt 7: Auf dem Server deployen

1. `.env.vault.json` ist bereits im Repository
2. Auf dem Server nur Master-Key setzen:

```bash
# In .env (ohne andere Secrets)
SECRETS_MASTER_KEY=ihr-master-key-hier
```

3. Anwendung starten - Secrets werden automatisch entschlüsselt!

```bash
npm run build
npm run start
```

---

## 🔧 Troubleshooting

### "SP_USERNAME / SP_PASSWORD not set"

**Lösung**:
- Entwicklung: `.env.local` existiert und enthält Zugangsdaten
- Produktion: `SECRETS_MASTER_KEY` ist gesetzt und `.env.vault.json` existiert

### "Failed to decrypt production secrets"

**Lösung**:
- Master-Key ist falsch oder nicht gesetzt
- `.env.vault.json` ist beschädigt oder veraltet
- Neu verschlüsseln: `npm run secrets:encrypt`

### Secrets werden nicht geladen

**Lösung**:
```bash
# Überprüfen Sie die Konfiguration
npm run secrets:decrypt
```

---

## 📋 Befehle im Überblick

| Befehl | Beschreibung |
|--------|-------------|
| `npm run secrets:generate-key` | Neuen Master-Key generieren |
| `npm run secrets:encrypt` | .env.local verschlüsseln → .env.vault.json |
| `npm run secrets:decrypt` | .env.vault.json entschlüsseln (anzeigen) |
| `npm run secrets:verify` | Prüfen ob Entschlüsselung funktioniert |

---

## 🔐 Sicherheits-Checkliste

### Entwicklung
- [x] `.env.local` erstellt mit echten Zugangsdaten
- [x] `.env.local` ist in `.gitignore`
- [x] Anwendung startet erfolgreich

### Produktion
- [x] Master-Key generiert und sicher gespeichert
- [x] `.env.vault.json` erstellt und ins Git committed
- [x] `.env.local` gelöscht
- [x] Master-Key auf Server als Environment Variable gesetzt
- [x] Deployment erfolgreich getestet

---

## 💡 Tipps

1. **Für Team-Mitglieder**: Jeder braucht nur den Master-Key, keine Passwörter ins Git!
2. **Unterschiedliche Keys**: Verwenden Sie verschiedene Master-Keys für Dev/Staging/Prod
3. **Key-Rotation**: Generieren Sie regelmäßig neue Master-Keys und verschlüsseln neu
4. **Backup**: Speichern Sie den Master-Key an 2+ sicheren Orten

---

## 📚 Weitere Hilfe

- Detaillierte Anleitung: `README_SECRETS.md`
- Alle Umgebungsvariablen: `.env.example`
- Architektur-Dokumentation: `.github/copilot-instructions.md`

---

**Bei Problemen**: Aktivieren Sie Debug-Logging in `.env.local`:
```bash
SP_PROXY_DEBUG=true
NEXT_PUBLIC_DEBUG_AUTH=true
```
