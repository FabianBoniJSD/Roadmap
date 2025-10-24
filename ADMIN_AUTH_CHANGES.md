# Admin-Authentifizierung: Änderungen

## Zusammenfassung
Die Admin-Berechtigung wurde von der `RoadmapUsers` Liste auf die **SharePoint Site Collection Admins** und **Site Owners Group** umgestellt.

## Was wurde geändert

### 1. Entfernte Liste
- **`RoadmapUsers`** Liste wird nicht mehr verwendet und wurde aus allen Konfigurationen entfernt

### 2. Neue Admin-Logik
Admin-Zugriff wird jetzt gewährt für:

1. **Site Collection Administratoren** (primär)
   - Benutzer mit `IsSiteAdmin = true` in SharePoint
   
2. **Site Owners Group** (sekundär)
   - Mitglieder der "Associated Owners Group" der Site
   
3. **Heuristik-Fallback** (tertiär)
   - Mitglieder von Gruppen mit "Owner" oder "Besitzer" im Titel

### 3. Geänderte Dateien

#### `utils/clientDataService.ts`
- ✅ `SP_LISTS.USERS` entfernt
- ✅ `isCurrentUserAdmin()` prüft jetzt Site Collection Admins und Owners Group

#### `utils/spConfig.ts`
- ✅ `SP_LISTS.USERS` entfernt

#### `utils/auth.ts`
- ✅ `authenticateUser()` als deprecated markiert (gibt immer `null` zurück)
- ℹ️ Alte Token-Funktionen behalten für Backward-Kompatibilität

#### `utils/authService.ts`
- ✅ `authenticateWithSharePoint()` als deprecated markiert

#### `pages/api/sharepoint/[...sp].ts`
- ✅ `RoadmapUsers` aus `ALLOWED_LISTS` entfernt

#### `.github/copilot-instructions.md`
- ✅ Dokumentation aktualisiert mit neuer Admin-Logik
- ✅ Liste der aktiven SharePoint-Listen aktualisiert

## Admin-Zugriff einrichten

### Option 1: Site Collection Administrator (empfohlen)
1. Öffnen Sie die SharePoint Site Settings
2. Navigieren Sie zu "Site Collection Administrators"
3. Fügen Sie Benutzer hinzu

### Option 2: Site Owners Group
1. Öffnen Sie die SharePoint Site Settings
2. Navigieren Sie zu "Site Permissions"
3. Fügen Sie Benutzer zur "Owners" Gruppe hinzu

## Migration

### Für bestehende Admins:
- Stellen Sie sicher, dass alle aktuellen Admins entweder als **Site Collection Admins** oder in der **Owners Group** eingetragen sind
- Die `RoadmapUsers` Liste kann nach erfolgreicher Migration gelöscht werden

### Kompatibilität:
- Die alten Auth-Funktionen (`authenticateUser`, `authenticateWithSharePoint`) sind noch vorhanden aber deprecated
- Sie geben immer Fehler zurück und loggen Warnungen
- Können in einer zukünftigen Version entfernt werden

## API-Nutzung

Die Admin-Prüfung erfolgt weiterhin über:

```typescript
const isAdmin = await clientDataService.isCurrentUserAdmin();
```

Diese Methode prüft automatisch alle drei Admin-Quellen (Site Admin, Owners Group, Heuristik).

## Siehe auch
- `utils/clientDataService.ts` - Zeile ~2151 für die vollständige `isCurrentUserAdmin()` Implementierung
- `.github/copilot-instructions.md` - Vollständige Architektur-Dokumentation
