import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const AdminLogin: React.FC = () => {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Überprüfe Admin-Berechtigung...');
  const returnUrl = router.query.returnUrl as string || '/admin';

  // Check service account admin access directly
  useEffect(() => {
    checkAdminAccess();
  }, [router, returnUrl]);

  async function checkAdminAccess() {
    try {
      setStatus('Prüfe Service Account Berechtigung...');
      
      const response = await fetch('/api/auth/check-admin');
      const data = await response.json();
      
      if (data.isAdmin) {
        setStatus('✓ Admin-Zugriff gewährt');
        // Small delay to show success message
        setTimeout(() => {
          router.push(returnUrl);
        }, 500);
      } else {
        setError('Service Account hat keine Admin-Berechtigung. Bitte prüfen Sie die SharePoint-Berechtigungen.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Admin check failed:', err);
      setError('Fehler bei der Admin-Prüfung. Bitte überprüfen Sie die SharePoint-Verbindung.');
      setLoading(false);
    }
  }



  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-6">
            <h2 className="text-3xl font-bold text-white text-center">
              Admin Login
            </h2>
            <p className="text-blue-100 text-center mt-2 text-sm">
              Roadmap Administrator
            </p>
          </div>

          <div className="px-8 py-8 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            <div className="text-center">
              {loading ? (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <svg className="animate-spin h-12 w-12 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <p className="text-gray-700 text-lg font-medium">{status}</p>
                  <p className="text-gray-500 text-sm">
                    Service Account wird geprüft...
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-700">
                    Der Service Account hat keine Admin-Berechtigung.
                  </p>
                  <button
                    onClick={() => checkAdminAccess()}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    🔄 Erneut prüfen
                  </button>
                </div>
              )}
            </div>

            <div className="mt-6 text-center border-t pt-6">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Service Account Authentifizierung</strong>
              </p>
              <p className="text-xs text-gray-500">
                Der Service Account muss <strong>Site Collection Admin</strong> oder Mitglied der <strong>Owners Group</strong> sein.
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Zugangsdaten werden über Environment Variables (SP_USERNAME, SP_PASSWORD) verwaltet.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-blue-200 hover:text-white text-sm transition"
          >
            ← Zurück zur Startseite
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
