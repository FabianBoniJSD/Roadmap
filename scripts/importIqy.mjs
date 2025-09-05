#!/usr/bin/env node
/**
 * Importiert Daten aus einer SharePoint .iqy (owssvr.dll?XMLDATA=1) Abfrage
 * und schreibt sie in die lokale JSON Struktur (DATA_MODE=local) für das
 * Roadmap-Projekt.
 *
 * Nutzung:
 *   node scripts/importIqy.mjs path/to/query.iqy [--out local-data/projects.json]
 *
 * Optionen über Umgebungsvariablen:
 *   SP_USERNAME / SP_PASSWORD   -> Falls Basic Auth benötigt
 *   LOCAL_DATA_DIR              -> Zielverzeichnis für JSON (Default: ./local-data)
 *
 * Hinweis: Skript macht KEINE echte Feld-Mapping-Intelligenz; es entfernt das Präfix 'ows_'
 * und wandelt SharePoint Attributnamen zu flachen Keys. Basis-Feld-Mapping kann unten angepasst werden.
 */

import fs from 'fs';
import path from 'path';

// Node 18+ fetch vorhanden

function log(...a){ console.log('[importIqy]', ...a); }
function warn(...a){ console.warn('[importIqy]', ...a); }
function fail(msg){ console.error('[importIqy] ERROR:', msg); process.exit(1); }

const iqyPath = process.argv[2];
if(!iqyPath) fail('Pfad zur .iqy Datei angeben');
if(!fs.existsSync(iqyPath)) fail('Datei nicht gefunden: ' + iqyPath);

const outFlagIndex = process.argv.indexOf('--out');
let outFile = outFlagIndex > -1 ? process.argv[outFlagIndex+1] : undefined;

const raw = fs.readFileSync(iqyPath, 'utf8').split(/\r?\n/).filter(Boolean);
// IQY Format: Zeile mit URL (dritte Zeile bei Standardstruktur)
const urlLine = raw.find(l => l.startsWith('http://') || l.startsWith('https://'));
if(!urlLine) fail('Keine URL Zeile gefunden');
const sourceUrl = urlLine.trim();
log('Gefundene URL:', sourceUrl);

// Ziel für JSON
const baseDir = process.env.LOCAL_DATA_DIR || path.join(process.cwd(),'local-data');
if(!fs.existsSync(baseDir)) fs.mkdirSync(baseDir,{recursive:true});
if(!outFile){ outFile = path.join(baseDir,'projects.json'); }

// Basic Auth Header optional
let headers = { 'Accept': 'application/xml,text/xml' };
if(process.env.SP_USERNAME && process.env.SP_PASSWORD){
  const auth = Buffer.from(`${process.env.SP_USERNAME}:${process.env.SP_PASSWORD}`,'utf8').toString('base64');
  headers['Authorization'] = 'Basic ' + auth;
  log('Basic Auth Header gesetzt');
}

async function fetchXml(){
  const res = await fetch(sourceUrl, { headers });
  if(!res.ok){
    const text = await res.text().catch(()=> '');
    fail(`HTTP ${res.status} beim Laden. BodySnippet: ${text.slice(0,200).replace(/\s+/g,' ')}`);
  }
  return await res.text();
}

function parseRows(xml){
  // Sehr einfache Extraktion der <z:row ... /> Einträge
  const rows = [];
  const rowRegex = /<z:row[^>]*\/>/gi;
  const attrRegex = /(ows_[A-Za-z0-9_]+)="([^"]*)"/g;
  const matches = xml.match(rowRegex) || [];
  for(const tag of matches){
    const obj = {};
    let m;
    while((m = attrRegex.exec(tag))){
      const keyRaw = m[1];
      const val = m[2];
      const key = keyRaw.replace(/^ows_/,'');
      obj[key] = val;
    }
    rows.push(obj);
  }
  return rows;
}

// Optionale Feld-Mapping Konfiguration von SharePoint Attributen -> interne Felder
// Passen Sie dies an Ihr Schema an.
const fieldMap = {
  // SharePointKey: internalField
  'ID': 'id',
  'Title': 'title',
  'Category': 'category',
  'StartQuarter': 'startQuarter',
  'EndQuarter': 'endQuarter',
  'Description': 'description',
  'Status': 'status',
  'Projektleitung': 'projektleitung',
  'Bisher': 'bisher',
  'Zukunft': 'zukunft',
  'Fortschritt': 'fortschritt',
  'GeplantUmsetzung': 'geplante_umsetzung',
  'Budget': 'budget'
};

function transform(rows){
  return rows.map(r => {
    const obj = {};
    for(const [spKey, localKey] of Object.entries(fieldMap)){
      if(r[spKey] !== undefined) obj[localKey] = r[spKey];
    }
    // ID fallback
    if(!obj['id']) obj['id'] = r['ID'] || r['Title'] || Math.random().toString(36).slice(2);
    return obj;
  });
}

async function run(){
  log('Lade XML ...');
  const xml = await fetchXml();
  log('Parse rows ...');
  const rows = parseRows(xml);
  log(`Gefundene Zeilen: ${rows.length}`);
  const data = transform(rows);

  // Falls bereits Datei existiert: Backup
  if(fs.existsSync(outFile)){
    const backup = outFile + '.bak';
    fs.copyFileSync(outFile, backup);
    log('Backup erstellt:', backup);
  }
  fs.writeFileSync(outFile, JSON.stringify(data, null, 2), 'utf8');
  log('Geschrieben:', outFile);
  log('Felder Beispiel (erste 1):', data[0]);
}

run().catch(e => { fail(e.message); });
