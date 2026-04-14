# Microsoft Entra SSO Implementation

Diese Datei beschreibt, wie Microsoft Entra SSO in diesem Repo umgesetzt ist und welche Teile du fuer andere Repos direkt uebernehmen kannst.

## Zielbild

Dieses Repo verwendet **kein NextAuth** und **kein clientseitiges MSAL-Setup**. Stattdessen laeuft der Login als serverseitiger OIDC Authorization Code Flow mit PKCE:

1. Browser startet Login ueber eine interne Next.js API-Route.
2. Die API-Route erzeugt `state`, `nonce` und PKCE-Daten und leitet zu Microsoft Entra weiter.
3. Der Callback tauscht den `code` gegen Tokens, liest das Benutzerprofil ueber Microsoft Graph und signiert daraus ein repo-eigenes JWT.
4. Das Repo verwendet dieses JWT danach fuer seine eigenen API-Guards und Rechtepruefungen.

Wichtig: In diesem Repo sind **Authentifizierung** und **Autorisierung** klar getrennt. Ein erfolgreicher Entra-Login bedeutet nur: "Benutzer ist bekannt". Ob der Benutzer danach Admin- oder Instanzrechte hat, wird erst serverseitig je Request entschieden.

## Architekturueberblick

### 1. Wiederverwendbare Entra-Bausteine

Das Monorepo bringt ein eigenes Workspace-Paket mit:

- [`@roadmap/entra-sso` ueber `packages/entra-sso`](../packages/entra-sso/package.json)
- OIDC/PKCE/Graph-Helfer in [`packages/entra-sso/src/core`](../packages/entra-sso/src/core/index.ts)
- Next.js-Helfer fuer Cookies und Redirect-URIs in [`packages/entra-sso/src/next`](../packages/entra-sso/src/next/index.ts)

Die wichtigsten Bausteine darin:

- [`packages/entra-sso/src/core/oidc.ts`](../packages/entra-sso/src/core/oidc.ts): baut die Authorize-URL und tauscht den Authorization Code gegen Tokens.
- [`packages/entra-sso/src/core/pkce.ts`](../packages/entra-sso/src/core/pkce.ts): erzeugt PKCE `verifier` und `challenge`.
- [`packages/entra-sso/src/core/graph.ts`](../packages/entra-sso/src/core/graph.ts): liest `/me` und optional Gruppen aus Microsoft Graph.
- [`packages/entra-sso/src/next/cookies.ts`](../packages/entra-sso/src/next/cookies.ts): Cookie-Parsing und `Set-Cookie`-Builder.
- [`packages/entra-sso/src/next/redirectUri.ts`](../packages/entra-sso/src/next/redirectUri.ts): berechnet die Callback-URL aus Forwarded-Headern und Base Path.

Das Paket wird in [`next.config.mjs`](../next.config.mjs) ueber `transpilePackages: ['@roadmap/entra-sso']` eingebunden.

### 2. Repo-spezifischer Entra-Wrapper

[`utils/entraSso.ts`](../utils/entraSso.ts) ist die schmale Repo-Schicht ueber dem Paket. Sie kapselt:

- "Ist Entra SSO ueberhaupt konfiguriert?"
- Redirect-URI-Berechnung fuer Next.js Requests
- die lokale Policy `isEntraUserAllowed()`

Aktueller Stand in diesem Repo:

- `isEntraUserAllowed()` ist **offen per Default**.
- Ein Entra-Benutzer gilt als erlaubt, sobald `id`, `userPrincipalName` oder `mail` vorhanden ist.
- Eine feste UPN-Allowlist ist aktuell **nicht aktiv**, auch wenn es im Paket dafuer bereits Helfer gibt.

### 3. App-spezifische Auth-Routen

Die eigentliche Integration lebt in:

- [`pages/api/auth/entra/login.ts`](../pages/api/auth/entra/login.ts)
- [`pages/api/auth/entra/callback.ts`](../pages/api/auth/entra/callback.ts)
- [`pages/api/auth/entra/status.ts`](../pages/api/auth/entra/status.ts)

Diese Routen bilden den eigentlichen Entra-Login fuer die Anwendung.

### 4. Client-Session und Guards

- [`utils/auth.ts`](../utils/auth.ts): speichert das App-JWT im Browser, baut API-URLs mit Instanzkontext und prueft bestehende Sessions.
- [`components/withAdminAuth.tsx`](../components/withAdminAuth.tsx): schuetzt Admin-Seiten im Client.
- [`pages/admin/login.tsx`](../pages/admin/login.tsx): manueller Login mit Popup.
- [`pages/admin/instances.tsx`](../pages/admin/instances.tsx): produktiver Landing-Flow inkl. optionalem Auto-Redirect zu SSO.

### 5. Serverseitige Session- und Rechtepruefung

- [`utils/apiAuth.ts`](../utils/apiAuth.ts): liest das JWT aus `Authorization: Bearer ...` oder aus dem Cookie `roadmap-admin-token`.
- [`pages/api/auth/check-admin-session.ts`](../pages/api/auth/check-admin-session.ts): prueft, ob die Session gueltig ist und ob daraus Admin- oder Superadmin-Rechte abgeleitet werden.
- [`utils/instanceAccessServer.ts`](../utils/instanceAccessServer.ts): entscheidet, ob eine Session fuer eine Instanz lesen oder administrieren darf.
- [`utils/superAdminAccessServer.ts`](../utils/superAdminAccessServer.ts): Superadmin-Aufloesung ueber DB und SharePoint-Fallback.

## End-to-End Flow

### 1. Feature aktivieren / Status pruefen

Der Client prueft zunaechst [`pages/api/auth/entra/status.ts`](../pages/api/auth/entra/status.ts).

Die Route liefert unter anderem:

- ob `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID` und `ENTRA_CLIENT_SECRET` gesetzt sind
- die berechnete Redirect-URI
- ob `ENTRA_REDIRECT_URI` gesetzt ist und plausibel auf `/api/auth/entra/callback` zeigt

Das wird im Frontend genutzt, um SSO-Buttons nur dann anzuzeigen, wenn die Konfiguration vollstaendig ist.

### 2. Login starten

Der Login wird ueber eine interne URL gestartet:

```text
/api/auth/entra/login?returnUrl=/admin/instances
```

Optional gibt es zwei Betriebsarten:

- `popup=1` fuer Popup-Login, z. B. auf [`pages/admin/login.tsx`](../pages/admin/login.tsx)
- Full-Page-Redirect, z. B. auf [`pages/admin/instances.tsx`](../pages/admin/instances.tsx)

Die Route [`pages/api/auth/entra/login.ts`](../pages/api/auth/entra/login.ts) macht dabei Folgendes:

1. Validiert, dass Entra SSO konfiguriert ist.
2. Berechnet die Redirect-URI ueber `ENTRA_REDIRECT_URI` oder aus Request-Origin plus Next.js `basePath`.
3. Erkennt eine typische Fehlkonfiguration: `ENTRA_REDIRECT_URI` zeigt auf eine App-Seite statt auf `/api/auth/entra/callback`.
4. Normalisiert `returnUrl`, damit nur relative Pfade erlaubt sind. Das verhindert Open Redirects.
5. Erzeugt:
   - `state`
   - `nonce`
   - PKCE `verifier`
   - PKCE `challenge`
6. Legt temporaere Cookies fuer den Callback an:
   - `entra_state`
   - `entra_nonce`
   - `entra_pkce_verifier`
   - `entra_return_url`
   - `entra_popup`
7. Leitet zu Microsoft Entra weiter.

Verwendete Scopes:

- `openid`
- `profile`
- `email`
- `User.Read`

Der Login fordert bewusst `prompt=select_account` an.

### 3. Callback verarbeiten

Nach dem Login kommt Microsoft Entra auf [`pages/api/auth/entra/callback.ts`](../pages/api/auth/entra/callback.ts) zurueck.

Die Route:

1. liest die zuvor gesetzten Cookies
2. validiert `state`, `code` und den PKCE `verifier`
3. tauscht den Authorization Code gegen Tokens ueber den `/token` Endpoint
4. liest das Profil des angemeldeten Benutzers ueber Graph `/me`
5. versucht zusaetzlich Gruppennamen ueber Graph `me/transitiveMemberOf` zu laden
6. faellt bei fehlenden Graph-Gruppen optional auf die `groups` Claim im ID Token zurueck
7. baut daraus ein anwendungsinternes JWT

Wichtig dabei:

- Der Graph-Gruppenabruf ist **best effort**. Wenn die Tenant-Berechtigungen fehlen, scheitert der Login **nicht**.
- Die eigentliche Freigabe entscheidet **nicht** ueber eine fest verdrahtete Allowlist, sondern spaeter ueber die Repo-spezifische Rechtepruefung.

### 4. App-eigenes JWT erzeugen

Die Callback-Route signiert ein eigenes JWT mit [`jsonwebtoken`](../package.json). Das Token enthaelt u. a.:

- `username`
- `displayName`
- `source: 'entra'`
- `groups`
- `entra.id`
- `entra.upn`
- `entra.mail`
- `entra.department`

Wichtige Designentscheidung dieses Repos:

- Das Entra-Callback setzt **`isAdmin: false`**.
- Der Login vergibt also **keine** Admin-Rolle.
- Ob der Benutzer spaeter Admin ist, wird je Request serverseitig berechnet.

Das trennt Login-Identitaet sauber von den eigentlichen Fachrechten.

### 5. Rueckgabe an den Browser

Danach gibt es zwei Pfade:

- Popup-Flow: Der Callback sendet per `window.opener.postMessage(...)` eine `AUTH_SUCCESS` oder `AUTH_ERROR` Nachricht an das Hauptfenster.
- Redirect-Flow: Der Callback setzt das Cookie `roadmap-admin-token` und leitet zur `returnUrl` weiter.

Zusatzinfo:

- Das Cookie `roadmap-admin-token` ist in diesem Repo **nicht `HttpOnly`**.
- Grund: Das Frontend liest und persistiert das Token aktiv in `sessionStorage` und haengt es als Bearer Token an interne Requests.

Wenn du das in einem neuen Repo nachbaust, ist das ein bewusster Architekturpunkt:

- Wenn der Client das Token nicht selbst lesen muss, ist `HttpOnly` in der Regel die bessere Wahl.
- Wenn du explizit Bearer-Header aus dem Browser senden willst, brauchst du ein client-lesbares Token oder eine andere Session-Strategie.

### 6. Client-Session persistieren

[`utils/auth.ts`](../utils/auth.ts) kapselt die Browser-Seite:

- `persistAdminSession(token, username)` speichert das Token in `sessionStorage` und im Cookie.
- `getAdminSessionToken()` liefert das aktuelle Token.
- `hasValidAdminSession()` ruft [`pages/api/auth/check-admin-session.ts`](../pages/api/auth/check-admin-session.ts) auf.
- `buildInstanceAwareUrl()` haengt den aktuellen `roadmapInstance` Kontext an API-Requests an.

Der letzte Punkt ist in diesem Repo wichtig, weil Rechte nicht nur benutzerbezogen, sondern auch **instanzbezogen** sind.

### 7. Session serverseitig validieren

[`utils/apiAuth.ts`](../utils/apiAuth.ts) liest das JWT serverseitig aus:

- `Authorization: Bearer <token>`
- oder Cookie `roadmap-admin-token`

Der zentrale Extractor ist `extractAdminSession()`.

Viele API-Routen verwenden **nicht** `requireAdminSession()`, sondern `requireUserSession()`. Beispiel:

- [`pages/api/instance-admin-users.ts`](../pages/api/instance-admin-users.ts)

Das ist Absicht: Erst wird die Session bestaetigt, danach wird mit einer zweiten Pruefung entschieden, ob diese Session fuer die konkrete Aktion und Instanz ausreichend ist.

### 8. Autorisierung getrennt aufloesen

Die eigentliche Rechteentscheidung passiert in [`utils/instanceAccessServer.ts`](../utils/instanceAccessServer.ts) und [`utils/superAdminAccessServer.ts`](../utils/superAdminAccessServer.ts).

Die wichtigsten Regeln:

- Superadmin wird zuerst ueber die `SuperAdmin` Tabelle geprueft.
- Falls dort kein Treffer vorliegt, gibt es einen SharePoint-Fallback ueber die Gruppe `superadmin`.
- Instanz-Adminrechte koennen ueber direkte Benutzerfreigaben in der Instanz-Metadatenstruktur kommen.
- Fuer Leserechte koennen auch Department-Zuordnungen relevant sein.
- Als weitere Absicherung prueft das Repo SharePoint-Gruppen wie `admin-<instanceSlug>`.

Das bedeutet fuer den Nachbau:

- Entra SSO liefert in diesem Repo nur die **Identitaet**.
- Die **Berechtigung** wird danach ueber eigene Fachlogik entschieden.

## Frontend-Einstiegspunkte

### `pages/admin/login.tsx`

Diese Seite bietet einen manuellen Login mit Popup.

Flow:

1. `GET /api/auth/entra/status`
2. bei Klick: `window.open('/api/auth/entra/login?popup=1&returnUrl=...')`
3. Warten auf `postMessage`
4. `persistAdminSession(...)`
5. Redirect zur Zielseite

### `pages/admin/instances.tsx`

Diese Seite nutzt eher den produktiven Redirect-Flow:

- optionales Auto-Login ueber `NEXT_PUBLIC_ENTRA_AUTO_LOGIN=true`
- Full-Page-Redirect zu `/api/auth/entra/login?returnUrl=...`
- Session-Check ueber `/api/auth/check-admin-session`
- Superadmin-Ermittlung fuer Instanzverwaltung

### `components/withAdminAuth.tsx`

Der HOC schuetzt Admin-Seiten, indem er:

1. einen gueltigen User-Token erwartet
2. den Entra-Callback-Hash konsumieren kann
3. anschliessend per `hasAdminAccessToCurrentInstance()` prueft, ob fuer die aktuelle Instanz Zugriff besteht

## Umgebungsvariablen

Mindestens relevant fuer Entra SSO in diesem Repo:

- `ENTRA_TENANT_ID`
- `ENTRA_CLIENT_ID`
- `ENTRA_CLIENT_SECRET`
- `JWT_SECRET`

Zusaetzlich wichtig:

- `ENTRA_REDIRECT_URI`
  - empfohlen als explizite absolute Callback-URL
  - muss auf `/api/auth/entra/callback` zeigen
- `JWT_EXPIRES_IN`
  - optional, Default: `24h`
- `NEXT_PUBLIC_ENTRA_AUTO_LOGIN`
  - optional fuer automatischen Redirect ins SSO
- `NEXT_PUBLIC_DEPLOYMENT_ENV`
- `NEXT_PUBLIC_BASE_PATH_DEV`
- `NEXT_PUBLIC_BASE_PATH_PROD`

Graph-Rechte in Entra:

- `User.Read` ist faktisch Pflicht, weil das Repo immer `/me` abfragt.
- Fuer Gruppennamen ist zusaetzlich eine passende Gruppen-Leseberechtigung noetig, typischerweise `GroupMember.Read.All` mit Admin Consent.
- Fehlt die Gruppen-Leseberechtigung, bleibt der Login trotzdem funktionsfaehig.

## CI/CD und Deployment

Die Workflows injizieren Entra-Secrets explizit in die erzeugte `.env` Datei:

- [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)
- [`.github/workflows/branch-build.yml`](../.github/workflows/branch-build.yml)

Wichtige Details aus den Workflows:

- Bereits vorhandene `ENTRA_*` Werte werden vor dem Anhaengen entfernt.
- Dadurch gibt es keine stillen Doppeldefinitionen in `.env`.
- `deploy.yml` nutzt `ENTRA_REDIRECT_URI`.
- `branch-build.yml` nutzt `TEST_ENTRA_REDIRECT_URI`.

Das ist wichtig, weil die Redirect-URI in Reverse-Proxy-Setups schnell die haeufigste Fehlerquelle ist.

## Nachbau in einem anderen Repo

Wenn du das Muster uebernehmen willst, kopiere nicht blind die komplette Auth-Logik. Uebernimm die Struktur in Schichten:

### 1. Generische OIDC-Schicht

Uebernehmen oder neu bauen:

- PKCE-Erzeugung
- Authorize-URL Builder
- Token-Exchange
- Redirect-URI-Aufloesung hinter Reverse Proxy
- Cookie-Utilities fuer `state`, `nonce`, `verifier`, `returnUrl`

### 2. App-spezifische Callback-Schicht

Im Ziel-Repo individuell definieren:

- welche Claims aus Entra uebernommen werden
- ob du Graph `/me` brauchst
- ob du Gruppen live ueber Graph laedst
- wie dein internes App-Token aussieht

### 3. Session-Schicht

Entscheide frueh, welches Modell du willst:

- client-lesbares JWT plus Bearer Header, so wie in diesem Repo
- oder `HttpOnly` Cookie-Session ohne clientseitiges Token-Lesen

### 4. Autorisierung getrennt halten

Das ist die wichtigste Lehre aus diesem Repo:

- Login prueft Identitaet.
- Rollen und Fachrechte werden spaeter separat aufgeloest.

Das macht die Integration robuster, wenn Rollen aus Datenbank, SharePoint, Fachsystemen oder Instanzkonfiguration kommen.

### 5. Robustheit von Anfang an einbauen

Diese Schutzmassnahmen aus dem Repo solltest du mitnehmen:

- `returnUrl` nur als relativen Pfad erlauben
- Redirect-URI aktiv auf Callback-Route validieren
- `state` und PKCE immer serverseitig pruefen
- Gruppenabruf nur "best effort" behandeln
- Duplicate-Env-Werte in CI bereinigen
- `x-forwarded-proto` und `x-forwarded-host` fuer Redirects und Secure Cookies beruecksichtigen

## Was repo-spezifisch ist

Folgende Teile solltest du **nicht** 1:1 in ein anderes Repo kopieren, ohne sie bewusst anzupassen:

- SharePoint-Fallback fuer `superadmin` und `admin-<instanceSlug>` Gruppen
- Instanzmodell mit `roadmapInstance`
- Department-basierte Leserechte
- die aktuelle Policy "jeder erfolgreiche Entra-Login ist zulaessig"
- das client-lesbare Cookie `roadmap-admin-token`

## Kurzfassung

Wenn du nur das Kernmuster uebernehmen willst, ist es dieses:

1. Next.js API-Route fuer Entra Login bauen.
2. `state` plus PKCE in Cookies halten.
3. Callback gegen Entra `/token` austauschen.
4. Graph `/me` lesen.
5. Eigenes App-JWT signieren.
6. Session im Browser oder Cookie persistieren.
7. Rechte erst danach serverseitig aus deinen echten Fachregeln ableiten.

Genau diese Trennung macht die SSO-Integration dieses Repos gut wiederverwendbar.
