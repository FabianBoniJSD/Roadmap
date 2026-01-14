#!/usr/bin/env bash

# Sofort abbrechen bei Fehlern
set -euo pipefail

# ==========================================
# 1. PROXY KONFIGURATION (CNTLM)
# ==========================================
PROXY_URL="http://127.0.0.1:3128"

# Umgebungsvariablen für curl, dnf, yum
export http_proxy="$PROXY_URL"
export https_proxy="$PROXY_URL"
export HTTP_PROXY="$PROXY_URL"
export HTTPS_PROXY="$PROXY_URL"
export no_proxy="localhost,127.0.0.1,::1,.bs.ch"

# Umgebungsvariablen speziell für NPM und Corepack
export NPM_CONFIG_PROXY="$PROXY_URL"
export NPM_CONFIG_HTTPS_PROXY="$PROXY_URL"

# ==========================================
# 2. SYSTEM CHECKS
# ==========================================

if [ "$(id -u)" -ne 0 ]; then
  echo "Bitte als root (sudo) ausführen." >&2
  exit 1
fi

log() { echo "[setup] $*"; }

log "Installiere Voraussetzungen (curl, ca-certificates, lsof, iproute)..."

if command -v dnf >/dev/null 2>&1; then
  dnf -y install curl ca-certificates lsof iproute >/dev/null
elif command -v yum >/dev/null 2>&1; then
  yum -y install curl ca-certificates lsof iproute >/dev/null
else
  echo "Weder dnf noch yum gefunden." >&2
  exit 1
fi

# ==========================================
# 3. NODE.JS INSTALLATION
# ==========================================

install_node_via_module() {
  local pm="$1"
  if command -v dnf >/dev/null 2>&1; then
    dnf -y module reset nodejs || true
    dnf -y module enable "$pm"
    dnf -y module install "$pm"
  else
    yum -y module reset nodejs || true
    yum -y module enable "$pm"
    yum -y module install "$pm"
  fi
}

log "Installiere Node.js 20..."

if command -v node >/dev/null 2>&1; then
  log "Node ist bereits installiert: $(node -v)"
else
  # Prüfen ob RHEL das Modul nativ anbietet
  if command -v dnf >/dev/null 2>&1 && dnf -q module list nodejs 2>/dev/null | grep -qE '^nodejs\s+20'; then
    log "Nutze RHEL AppStream module nodejs:20"
    install_node_via_module "nodejs:20"
  elif command -v yum >/dev/null 2>&1 && yum -q module list nodejs 2>/dev/null | grep -qE '^nodejs\s+20'; then
    log "Nutze RHEL AppStream module nodejs:20"
    install_node_via_module "nodejs:20"
  else
    log "nodejs:20 Modul nicht gefunden; nutze NodeSource setup_20.x"
    # Proxy explizit an curl übergeben (-x)
    curl -x "$PROXY_URL" -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    
    if command -v dnf >/dev/null 2>&1; then
      dnf -y install nodejs
    else
      yum -y install nodejs
    fi
  fi
fi

log "Verifiziere node/npm/npx..."
node -v
npm -v
npx --version

# ==========================================
# 4. COREPACK & YARN (MIT PATH FIX)
# ==========================================

log "Aktiviere Corepack und Yarn Classic 1.22.22..."

# Prüfung: Ist Corepack da?
if ! command -v corepack >/dev/null 2>&1; then
  log "Corepack Binary nicht gefunden. Installiere via npm..."
  npm install -g corepack
  
  # Cache leeren
  hash -r 2>/dev/null || true

  # RHEL FIX: Wenn corepack immer noch nicht gefunden wird (weil sudo Pfade einschränkt)
  if ! command -v corepack >/dev/null 2>&1; then
      # NPM installiert global meistens nach /usr/local/bin
      if [ -f "/usr/local/bin/corepack" ]; then
          log "RHEL Fix: Erstelle Symlink von /usr/local/bin/corepack nach /usr/bin/corepack"
          ln -sf /usr/local/bin/corepack /usr/bin/corepack
      else
          # Fallback: Suche über NPM Prefix
          NPM_GLOBAL_PREFIX=$(npm prefix -g)
          if [ -f "$NPM_GLOBAL_PREFIX/bin/corepack" ]; then
             log "RHEL Fix: Erstelle Symlink von $NPM_GLOBAL_PREFIX/bin/corepack nach /usr/bin/corepack"
             ln -sf "$NPM_GLOBAL_PREFIX/bin/corepack" /usr/bin/corepack
          else
             log "ERROR: Corepack wurde installiert, konnte aber nicht gefunden werden."
             exit 1
          fi
      fi
  fi
fi

# Jetzt sollte es sicher da sein
corepack enable
corepack prepare yarn@1.22.22 --activate
yarn --version

# ==========================================
# 5. PM2 INSTALLATION
# ==========================================

log "Installiere PM2 global..."
npm install -g pm2

# Gleicher Fix für PM2, falls nötig
if ! command -v pm2 >/dev/null 2>&1; then
    if [ -f "/usr/local/bin/pm2" ]; then
        log "RHEL Fix: Symlink für PM2"
        ln -sf /usr/local/bin/pm2 /usr/bin/pm2
    fi
fi

pm2 --version

log "Fertig. PM2, Yarn und Node sind bereit."
log "Tipp: Um PM2 Autostart einzurichten, führe als dein User aus:"
log "  pm2 startup systemd"