# 🚀 Quick Setup: Multi-User GitHub Secrets

**Ziel**: Mehrere User mit automatischen Admin-Rechten in 3 Minuten einrichten

---

## Option 1: GitHub Secrets (Produktion)

### Schritt 1: Secrets erstellen

1. Gehe zu: **Repository → Settings → Secrets and variables → Actions**
2. Klicke **"New repository secret"**
3. Erstelle für jeden User ein Secret:

```
Name:  USER_FABIAN
Value: fabian:SecurePassword123

Name:  USER_STEFAN  
Value: stefan:AnotherPass456

Name:  USER_ADMIN
Value: admin:AdminPass789
```

### Schritt 2: Workflow aktualisieren

Öffne `.github/workflows/deploy.yml` und füge die Secrets hinzu:

```yaml
- name: Build application
  env:
    NODE_ENV: production
    USER_FABIAN: ${{ secrets.USER_FABIAN }}
    USER_STEFAN: ${{ secrets.USER_STEFAN }}
    USER_ADMIN: ${{ secrets.USER_ADMIN }}
  run: npm run build
```

### Schritt 3: Deployen

```bash
git add .github/workflows/deploy.yml
git commit -m "Add multi-user secrets"
git push
```

✅ **Fertig!** Alle konfigurierten User haben Admin-Rechte.

---

## Option 2: Lokale Entwicklung

### PowerShell (Windows)

```powershell
# USER_* Secrets setzen
$env:USER_FABIAN="fabian:password"
$env:USER_STEFAN="stefan:secure"

# Anwendung starten
npm run dev
```

### Bash (Linux/Mac)

```bash
# USER_* Secrets setzen
export USER_FABIAN="fabian:password"
export USER_STEFAN="stefan:secure"

# Anwendung starten
npm run dev
```

### .env.local (Alle Plattformen)

```bash
# .env.local erstellen
USER_FABIAN=fabian:password
USER_STEFAN=stefan:secure
USER_ADMIN=admin:admin

# Anwendung starten
npm run dev
```

⚠️ **Wichtig**: `.env.local` ist in `.gitignore` und wird NICHT committed!

---

## 📋 Format-Regeln

### Secret-Name
```
USER_<NAME>
```
- Muss mit `USER_` beginnen
- `<NAME>` kann beliebig sein
- Beispiele: `USER_FABIAN`, `USER_STEFAN`, `USER_ADMIN`

### Secret-Value
```
<username>:<password>
```
- Format: `username:password`
- Username kann beliebig sein
- Passwort kann Sonderzeichen enthalten (auch `:`)
- Beispiele:
  - `fabian:MyPass123`
  - `stefan:SecurePass!`
  - `admin:Pass:With:Colons` ✅ (funktioniert!)

---

## ✅ Testen

### Admin-Zugriff prüfen

```bash
# API aufrufen
curl http://localhost:3000/api/auth/check-admin

# Erwartete Antwort:
{
  "isAdmin": true,
  "mode": "github-secrets",
  "users": ["fabian", "stefan"]
}
```

### Admin-Seite öffnen

1. Browser öffnen: `http://localhost:3000/admin`
2. Login-Seite erscheint
3. Status: "Prüfe Service Account Berechtigung..."
4. Erfolg: Automatische Weiterleitung zum Admin-Dashboard

---

## 🔄 User hinzufügen

### Neue User hinzufügen:

1. **GitHub Secret erstellen**: `USER_NEWUSER` mit `newuser:password`
2. **Workflow updaten**: Secret in `.github/workflows/deploy.yml` hinzufügen
3. **Push**: Änderungen committen und pushen

### User entfernen:

1. **GitHub Secret löschen**: Repository → Settings → Secrets → Delete
2. **Workflow bereinigen**: Zeile aus Workflow entfernen (optional)
3. **Push**: Änderungen committen

---

## 🆘 Häufige Probleme

### "No credentials found"

```bash
# Prüfen ob USER_* gesetzt ist
env | grep USER_

# Oder in PowerShell:
Get-ChildItem env: | Where-Object { $_.Name -like "USER_*" }

# Nichts gefunden? → Secret setzen!
```

### "Invalid format in USER_XYZ"

```bash
# Format prüfen - muss "username:password" sein
echo $USER_FABIAN

# Richtig: "username:password"
# Falsch:  "password" (kein Username)
# Falsch:  "username" (kein Passwort)
```

### Admin-Zugriff verweigert

```bash
# Debug-Logging aktivieren
$env:SP_PROXY_DEBUG="true"
$env:NEXT_PUBLIC_DEBUG_AUTH="true"

npm run dev

# Logs prüfen für Fehler
```

---

## 📚 Vorteile

| Feature | Single Account | Multi-User |
|---------|---------------|------------|
| User-Anzahl | 1 | Unbegrenzt |
| Auto-Admin | ❌ (SharePoint Check) | ✅ Automatisch |
| Passwort-Rotation | 🔴 Betrifft alle | 🟢 Pro User |
| User-Trennung | ❌ | ✅ |
| Flexibilität | 🔴 Niedrig | 🟢 Hoch |

---

## 🔗 Vollständige Dokumentation

- **Detailliert**: [Multi-User GitHub Secrets](./MULTI_USER_GITHUB_SECRETS.md)
- **Service Account**: [Auth Mode Docs](./AUTH_MODE_SERVICE_ACCOUNT.md)
- **Secrets Encryption**: [Secrets Management](../README_SECRETS.md)

---

**Setup-Zeit**: ~3 Minuten  
**Schwierigkeit**: ⭐ Einfach  
**Status**: ✅ Production Ready
