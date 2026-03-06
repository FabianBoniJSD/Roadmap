import React from 'react';
import DocsLayout from '../../../components/DocsLayout';
import Link from 'next/link';

const KonfigurationDocsPage: React.FC = () => {
  return (
    <DocsLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Konfiguration von Roadmap JSD</h1>

        <div className="prose prose-invert max-w-none">
          <p>
            Nach der Installation von Roadmap JSD können Sie verschiedene Aspekte der Anwendung
            konfigurieren, um sie an Ihre Bedürfnisse anzupassen.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">Umgebungsvariablen</h2>

          <p>
            Die Hauptkonfiguration erfolgt über Umgebungsvariablen in der <code>.env</code>-Datei im
            Stammverzeichnis des Projekts.
          </p>

          <h3 className="text-xl font-bold mt-6 mb-3">Datenbankkonfiguration</h3>

          <pre className="bg-gray-800 p-4 rounded-md overflow-x-auto">
            <code>
              DATABASE_URL=&quot;postgresql://benutzername:passwort@localhost:5432/roadmap_jsd&quot;
            </code>
          </pre>

          <p className="mt-4">
            Diese Variable definiert die Verbindung zur Datenbank. Passen Sie sie entsprechend Ihrer
            Datenbankeinrichtung an.
          </p>

          <h3 className="text-xl font-bold mt-6 mb-3">Weitere Konfigurationsoptionen</h3>

          <pre className="bg-gray-800 p-4 rounded-md overflow-x-auto">
            <code>
              # Anwendungsport (Standard: 3000) PORT=3000 # Umgebung (development, production)
              NODE_ENV=development # Secret für JWT-Token (für die Authentifizierung)
              JWT_SECRET=ihr_geheimes_token
            </code>
          </pre>

          <h2 className="text-2xl font-bold mt-8 mb-4">Anpassung des Erscheinungsbilds</h2>

          <h3 className="text-xl font-bold mt-6 mb-3">Farben und Thema</h3>

          <p>
            Sie können das Erscheinungsbild der Anwendung anpassen, indem Sie die
            Tailwind-Konfiguration in der Datei <code>tailwind.config.js</code> ändern:
          </p>

          <pre className="bg-gray-800 p-4 rounded-md overflow-x-auto">
            <code>{`module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          // ... weitere Farbtöne
          900: '#0c4a6e',
        },
        // Weitere benutzerdefinierte Farben
      },
    },
  },
  // Weitere Konfigurationen
};`}</code>
          </pre>

          <h3 className="text-xl font-bold mt-6 mb-3">Logo und Branding</h3>

          <p>Um das Logo und Branding anzupassen:</p>

          <ol className="list-decimal pl-6 my-4">
            <li>
              Ersetzen Sie die Datei <code>public/logo.png</code> mit Ihrem eigenen Logo
            </li>
            <li>
              Aktualisieren Sie den Anwendungsnamen in der Datei <code>components/Header.tsx</code>
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-8 mb-4">Standarddaten</h2>

          <h3 className="text-xl font-bold mt-6 mb-3">Admin-Benutzer</h3>

          <p>
            Der Standard-Admin-Benutzer wird während der ersten Migration erstellt. Sie können die
            Anmeldedaten in der Datei <code>prisma/seed.ts</code> ändern:
          </p>

          <pre className="bg-gray-800 p-4 rounded-md overflow-x-auto">
            <code>{`const adminUser = await prisma.user.create({
  data: {
    name: 'Admin',
    email: 'admin@jsd.bs.ch',
    password: '***hashed-password***',
    role: 'ADMIN',
  },
});`}</code>
          </pre>

          <h3 className="text-xl font-bold mt-6 mb-3">Standardkategorien</h3>

          <p>
            Standardkategorien werden ebenfalls während der Seed-Phase erstellt. Sie können diese in
            der Datei <code>prisma/seed.ts</code> anpassen:
          </p>

          <pre className="bg-gray-800 p-4 rounded-md overflow-x-auto">
            <code>{`const categories = await Promise.all([
  prisma.category.create({
    data: {
      id: 'cat1',
      name: 'Digital Workplace',
      color: '#4299E1',
      icon: 'ComputerIcon',
    },
  }),
  // Weitere Kategorien
]);`}</code>
          </pre>

          <h2 className="text-2xl font-bold mt-8 mb-4">Erweiterte Konfiguration</h2>

          <h3 className="text-xl font-bold mt-6 mb-3">API-Endpunkte</h3>

          <p>
            Wenn Sie benutzerdefinierte API-Endpunkte hinzufügen möchten, erstellen Sie neue Dateien
            im Verzeichnis <code>pages/api/</code>:
          </p>

          <pre className="bg-gray-800 p-4 rounded-md overflow-x-auto">
            <code>{`// pages/api/custom/endpoint.ts
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Ihre benutzerdefinierte API-Logik hier
}`}</code>
          </pre>

          <h3 className="text-xl font-bold mt-6 mb-3">Authentifizierung anpassen</h3>

          <p>
            Um die Authentifizierungslogik anzupassen, bearbeiten Sie die Dateien im Verzeichnis{' '}
            <code>pages/api/auth/</code>:
          </p>

          <ul className="list-disc pl-6 my-4">
            <li>
              <code>login.ts</code>: Anmeldelogik
            </li>
            <li>
              <code>register.ts</code>: Registrierungslogik (falls implementiert)
            </li>
          </ul>

          <h2 className="text-2xl font-bold mt-8 mb-4">Produktionsbereitstellung</h2>

          <p>Für die Bereitstellung in einer Produktionsumgebung:</p>

          <ol className="list-decimal pl-6 my-4">
            <li>
              Setzen Sie <code>NODE_ENV=production</code> in Ihrer <code>.env</code>-Datei
            </li>
            <li>
              Erstellen Sie einen optimierten Build:
              <pre className="bg-gray-800 p-4 rounded-md overflow-x-auto mt-2">
                <code>npm run build # oder yarn build</code>
              </pre>
            </li>
            <li>
              Starten Sie den Produktionsserver:
              <pre className="bg-gray-800 p-4 rounded-md overflow-x-auto mt-2">
                <code>npm start # oder yarn start</code>
              </pre>
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-8 mb-4">Fehlerbehebung</h2>

          <h3 className="text-xl font-bold mt-6 mb-3">Datenbankverbindungsprobleme</h3>

          <p>Wenn Sie Probleme mit der Datenbankverbindung haben:</p>

          <ol className="list-decimal pl-6 my-4">
            <li>Überprüfen Sie, ob Ihre Datenbank läuft</li>
            <li>
              Stellen Sie sicher, dass die <code>DATABASE_URL</code> in der <code>.env</code>-Datei
              korrekt ist
            </li>
            <li>
              Führen Sie <code>npx prisma db push</code> aus, um die Datenbankschema zu
              aktualisieren
            </li>
          </ol>

          <h3 className="text-xl font-bold mt-6 mb-3">Anwendungsfehler</h3>

          <p>Bei Anwendungsfehlern:</p>

          <ol className="list-decimal pl-6 my-4">
            <li>Überprüfen Sie die Konsolenausgabe auf Fehlermeldungen</li>
            <li>Überprüfen Sie die Browserkonsole auf Frontend-Fehler</li>
            <li>
              Stellen Sie sicher, dass alle Abhängigkeiten installiert sind (
              <code>npm install</code>)
            </li>
          </ol>

          <h2 className="text-2xl font-bold mt-8 mb-4">Nächste Schritte</h2>

          <p>Nach der Konfiguration können Sie:</p>

          <ul className="list-disc pl-6 my-4">
            <li>
              <Link href="/docs/funktionen" className="text-blue-400 hover:text-blue-300">
                Die Funktionen von Roadmap JSD erkunden
              </Link>
            </li>
            <li>
              <Link href="/docs/admin" className="text-blue-400 hover:text-blue-300">
                Das Admin-Dashboard verwenden
              </Link>
            </li>
            <li>
              <Link href="/docs/api" className="text-blue-400 hover:text-blue-300">
                Die API-Referenz einsehen
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </DocsLayout>
  );
};

export default KonfigurationDocsPage;
