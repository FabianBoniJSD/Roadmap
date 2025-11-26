# GitHub Actions Runner mit Administrator-Rechten einrichten

## Problem
Der Runner kann keine Prozesse beenden, die von anderen Benutzern gestartet wurden, weil er nicht die nötigen Berechtigungen hat.

## Lösung: Runner als Administrator ausführen

### Option 1: Runner-Service mit Admin-Account neu installieren

1. **Stoppe den aktuellen Runner-Service:**
   ```powershell
   # Als Administrator ausführen
   cd C:\roadmap-runner  # Pfad zu deinem Runner-Verzeichnis
   .\svc.ps1 stop
   .\svc.ps1 uninstall
   ```

2. **Installiere den Service mit Admin-Rechten:**
   ```powershell
   # Als Administrator ausführen
   .\svc.ps1 install
   .\svc.ps1 start
   ```

   Der Service wird jetzt unter dem SYSTEM-Account laufen, der volle Berechtigungen hat.

### Option 2: Runner-Service-Account ändern

1. **Öffne Services:** `services.msc`

2. **Finde den GitHub Actions Runner Service** (z.B. "actions.runner.FabianBoniJSD-Next-JS-Roadmap.COMPUTERNAME")

3. **Rechtsklick → Properties → Log On Tab**

4. **Wähle eine dieser Optionen:**
   - **Local System account** (empfohlen) - Hat volle Admin-Rechte
   - Oder: **This account** mit einem Admin-Benutzer

5. **Starte den Service neu:**
   ```powershell
   Restart-Service -Name "actions.runner.*"  # Tatsächlichen Namen verwenden
   ```

### Option 3: Dem aktuellen Runner-User Admin-Rechte geben

Wenn der Runner als spezifischer User läuft:

```powershell
# Als Administrator
# Füge den User zur Administrators-Gruppe hinzu
net localgroup Administrators "RUNNER_USERNAME" /add

# Oder zur Power Users Gruppe (weniger Rechte)
net localgroup "Power Users" "RUNNER_USERNAME" /add
```

## Verifizierung

Nach der Änderung, teste mit diesem PowerShell-Befehl im Workflow:

```powershell
# Im Workflow
Write-Output "Current user: $env:USERNAME"
Write-Output "Is Admin: $(([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator))"
```

## Empfohlene Lösung für dieses Projekt

Da der Runner nur für dieses Projekt verwendet wird und Prozesse verwalten muss:

```powershell
# 1. Als Administrator auf dem Server ausführen
cd C:\roadmap-runner

# 2. Service stoppen und deinstallieren
.\svc.ps1 stop
.\svc.ps1 uninstall

# 3. Service neu installieren (wird als SYSTEM laufen)
.\svc.ps1 install

# 4. Service starten
.\svc.ps1 start

# 5. Service-Status prüfen
.\svc.ps1 status
```

## Sicherheitshinweis

⚠️ **Wichtig:** Einen Runner mit Admin-Rechten zu betreiben bedeutet, dass jeder Code im Workflow mit Admin-Rechten läuft. Stelle sicher:
- Der Runner ist self-hosted und nicht öffentlich
- Nur vertrauenswürdige Personen haben Push-Zugriff auf das Repository
- Branch-Protection-Rules sind aktiviert für den `main` Branch

## Alternative: Prozess unter gleichem User starten

Wenn du die Runner-Rechte nicht ändern willst, stelle sicher dass:
1. Der PM2-Prozess unter dem gleichen User läuft wie der Runner
2. Verwende die PM2_HOME im Workspace (bereits implementiert)
3. PM2 wird vom Workflow gestartet, nicht manuell

Dann können die Prozesse gegenseitig verwaltet werden.
