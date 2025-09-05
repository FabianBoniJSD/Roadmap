import { clientDataService } from '@/utils/clientDataService';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';

interface FooterProps {
  version?: string;
}

const Footer: React.FC<FooterProps> = ({ version = 'Beta' }) => {
  const [appTitle, setAppTitle] = useState('IT + Digital Roadmap');

  useEffect(() => {
    // Laden des App-Titels beim Mounten der Komponente
    const loadAppTitle = async () => {
      try {
        const title = await clientDataService.getSettingByKey('roadmapTitle');
        setAppTitle(title?.value || 'IT + Digital Roadmap');
      } catch (error) {
        console.error('Fehler beim Laden des App-Titels:', error);
      }
    };

    loadAppTitle();
  }, []);

  return (
    <footer className="py-4 md:py-6 px-4 md:px-10 border-t border-gray-700">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0 text-center md:text-left">
            <h3 className="text-base md:text-lg font-semibold text-yellow-400 mb-2">{appTitle}</h3>
            <p className="text-xs md:text-sm text-gray-400">© {new Date().getFullYear()} Justiz- und Sicherheitsdepartement Basel-Stadt</p>
          </div>

          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-6">
            <div className="text-center md:text-left">
              <h4 className="text-xs md:text-sm font-medium text-gray-300 mb-1">Kontakt</h4>
              <Link href="mailto:info@jsd.bs.ch" className="text-xs text-gray-400 hover:text-yellow-400 transition-colors">
                fabian.boni@jsd.bs.ch
              </Link>
            </div>

            <div className="text-center md:text-left">
              <h4 className="text-xs md:text-sm font-medium text-gray-300 mb-1">Ressourcen</h4>
              <div className="flex flex-col space-y-1">
                <Link href="/admin" className="text-xs text-gray-400 hover:text-yellow-400 transition-colors">Admin</Link>
                <Link href="/help" className="text-xs text-gray-400 hover:text-yellow-400 transition-colors">Hilfe</Link>
              </div>
            </div>

            <div className="text-center md:text-left">
              <h4 className="text-xs md:text-sm font-medium text-gray-300 mb-1">Version</h4>
              <span className="text-xs text-gray-400">{version}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 md:mt-6 pt-4 border-t border-gray-800 text-xs text-center text-gray-500">
          Diese Roadmap ist für interne Planungsprozesse. Zuletzt aktualisiert am: {new Date().toLocaleDateString()}
        </div>
      </div>
    </footer>
  );
};

export default Footer;