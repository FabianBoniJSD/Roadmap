import React from 'react';
import DocsLayout from '../../../components/DocsLayout';

const ApiDocsPage: React.FC = () => {
  return (
    <DocsLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">API-Referenz</h1>

        <div className="prose prose-invert max-w-none">
          <p>
            Die Roadmap JSD-Anwendung bietet eine umfassende REST-API, mit der Sie programmatisch
            auf alle Funktionen der Anwendung zugreifen können. Diese Dokumentation beschreibt die
            verfügbaren Endpunkte, Parameter und Antwortformate.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">API-Übersicht</h2>

          <p>Die API ist in mehrere Hauptbereiche unterteilt:</p>

          <ul className="list-disc pl-6 my-4">
            <li>
              <strong>Projekte</strong>: Verwaltung von Roadmap-Projekten
            </li>
            <li>
              <strong>Kategorien</strong>: Verwaltung von Projektkategorien
            </li>
            <li>
              <strong>Feldtypen</strong>: Verwaltung von benutzerdefinierten Feldtypen
            </li>
            <li>
              <strong>Authentifizierung</strong>: Benutzeranmeldung und -verwaltung
            </li>
          </ul>

          <h2 className="text-2xl font-bold mt-8 mb-4">Authentifizierung</h2>

          <p>
            Die meisten API-Endpunkte erfordern eine Authentifizierung. Admin-Zugriff wird über
            SharePoint-Berechtigungen (Service Account) oder Microsoft Entra SSO gesteuert.
          </p>

          <h3 className="text-xl font-bold mt-6 mb-3">Admin-Status prüfen</h3>

          <pre className="bg-gray-800 p-4 rounded-md overflow-x-auto">
            <code>GET /api/auth/check-admin</code>
          </pre>

          <p className="mt-4">
            <strong>Typische Antwort</strong>:
          </p>

          <pre className="bg-gray-800 p-4 rounded-md overflow-x-auto">
            <code>{`{
  "isAdmin": true,
  "mode": "sharepoint-permissions",
  "requiresUserSession": false,
  "instanceSlug": "bdm-projekte"
}`}</code>
          </pre>

          <h2 className="text-2xl font-bold mt-8 mb-4">Projekte API</h2>

          <p>
            Die Projekte-API ermöglicht es Ihnen, Projekte im Roadmap JSD-System zu erstellen, zu
            lesen, zu aktualisieren und zu löschen.
          </p>

          <h3 className="text-xl font-bold mt-6 mb-3">Alle Projekte abrufen</h3>

          <pre className="bg-gray-800 p-4 rounded-md overflow-x-auto">
            <code>GET /api/projects</code>
          </pre>

          <h3 className="text-xl font-bold mt-6 mb-3">Ein einzelnes Projekt abrufen</h3>

          <pre className="bg-gray-800 p-4 rounded-md overflow-x-auto">
            <code>GET /api/projects/:id</code>
          </pre>

          <h3 className="text-xl font-bold mt-6 mb-3">Ein Projekt erstellen</h3>

          <pre className="bg-gray-800 p-4 rounded-md overflow-x-auto">
            <code>POST /api/projects</code>
          </pre>

          <h3 className="text-xl font-bold mt-6 mb-3">Ein Projekt aktualisieren</h3>

          <pre className="bg-gray-800 p-4 rounded-md overflow-x-auto">
            <code>PUT /api/projects/:id</code>
          </pre>

          <h3 className="text-xl font-bold mt-6 mb-3">Ein Projekt löschen</h3>

          <pre className="bg-gray-800 p-4 rounded-md overflow-x-auto">
            <code>DELETE /api/projects/:id</code>
          </pre>

          <h2 className="text-2xl font-bold mt-8 mb-4">Kategorien API</h2>

          <p>Die Kategorien-API ermöglicht es Ihnen, Projektkategorien zu verwalten.</p>

          <h3 className="text-xl font-bold mt-6 mb-3">Alle Kategorien abrufen</h3>

          <pre className="bg-gray-800 p-4 rounded-md overflow-x-auto">
            <code>GET /api/categories</code>
          </pre>

          <h2 className="text-2xl font-bold mt-8 mb-4">Feldtypen API</h2>

          <p>Die Feldtypen-API ermöglicht es Ihnen, benutzerdefinierte Feldtypen zu verwalten.</p>

          <h3 className="text-xl font-bold mt-6 mb-3">Alle Feldtypen abrufen</h3>

          <pre className="bg-gray-800 p-4 rounded-md overflow-x-auto">
            <code>GET /api/fieldTypes</code>
          </pre>
        </div>
      </div>
    </DocsLayout>
  );
};

export default ApiDocsPage;
