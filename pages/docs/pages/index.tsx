import React from 'react';
import { forceServerSideRendering } from '@/utils/serverRendering';

export const getServerSideProps = forceServerSideRendering;
import DocsLayout from '../../../components/DocsLayout';
import Link from 'next/link';

const DocsPage: React.FC = () => {
  return (
    <DocsLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Roadmap JSD Dokumentation</h1>

        <div className="prose prose-invert max-w-none">
          <p>
            Willkommen zur offiziellen Dokumentation der Roadmap JSD Anwendung. Diese Dokumentation
            führt Sie durch die Installation, Konfiguration und Nutzung der Anwendung.
          </p>

          <h2 className="text-2xl font-bold my-2">Was ist Roadmap JSD?</h2>

          <p>
            Roadmap JSD ist ein Projektmanagement- und Roadmap-Visualisierungstool, das entwickelt
            wurde, um Teams bei der Verfolgung und Kommunikation von Projektzeitplänen, Status und
            Kategorien zu unterstützen. Es bietet eine übersichtliche, intuitive Oberfläche zur
            Verwaltung von Projekten und deren Visualisierung auf einem Zeitstrahl.
          </p>

          <h2 className="text-2xl font-bold my-2">Hauptfunktionen</h2>

          <ul>
            <li>
              <strong>Projektmanagement</strong>: Erstellen, Bearbeiten und Löschen von Projekten
              mit detaillierten Informationen
            </li>
            <li>
              <strong>Kategorisierung</strong>: Organisation von Projekten nach anpassbaren
              Kategorien
            </li>
            <li>
              <strong>Zeitstrahl-Visualisierung</strong>: Anzeige von Projekten auf einem
              interaktiven Zeitstrahl
            </li>
            <li>
              <strong>Feldtypen</strong>: Definition benutzerdefinierter Feldtypen für Projekte
            </li>
            <li>
              <strong>Admin-Dashboard</strong>: Umfassende Admin-Oberfläche zur Verwaltung aller
              Aspekte des Systems
            </li>
          </ul>

          <h2 className="text-2xl font-bold my-2">Erste Schritte</h2>

          <p>
            Um mit Roadmap JSD zu beginnen, lesen Sie die{' '}
            <Link
              href="/docs/erste-schritte/installation"
              className="text-blue-400 hover:text-blue-300"
            >
              Installationsanleitung
            </Link>{' '}
            oder erkunden Sie den Abschnitt{' '}
            <Link href="/docs/funktionen" className="text-blue-400 hover:text-blue-300">
              Funktionen
            </Link>
            , um mehr darüber zu erfahren, was Roadmap JSD leisten kann.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800 p-6 rounded-lg ">
            <h2 className="text-xl font-semibold mb-4">Erste Schritte</h2>
            <p className="text-gray-300 mb-4">
              Lernen Sie, wie Sie Roadmap JSD installieren, konfigurieren und mit der Nutzung
              beginnen.
            </p>
            <Link href="/docs/erste-schritte">
              <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors">
                Mehr erfahren
              </button>
            </Link>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg ">
            <h2 className="text-xl font-semibold mb-4">Funktionen</h2>
            <p className="text-gray-300 mb-4">
              Entdecken Sie die Hauptfunktionen von Roadmap JSD und wie Sie diese effektiv nutzen
              können.
            </p>
            <Link href="/docs/funktionen">
              <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors">
                Mehr erfahren
              </button>
            </Link>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg ">
            <h2 className="text-xl font-semibold mb-4">API-Referenz</h2>
            <p className="text-gray-300 mb-4">
              Vollständige Dokumentation der API-Endpunkte für Entwickler.
            </p>
            <Link href="/docs/api">
              <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors">
                Mehr erfahren
              </button>
            </Link>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg ">
            <h2 className="text-xl font-semibold mb-4">Admin-Anleitung</h2>
            <p className="text-gray-300 mb-4">
              Umfassende Anleitung für Administratoren zur Verwaltung des Systems.
            </p>
            <Link href="/docs/admin">
              <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors">
                Mehr erfahren
              </button>
            </Link>
          </div>
        </div>
      </div>
    </DocsLayout>
  );
};

export default DocsPage;
