import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const AdminLogin: React.FC = () => {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [authWindow, setAuthWindow] = useState<Window | null>(null);
  const returnUrl = router.query.returnUrl as string || '/admin';

  // Check if already authenticated
  useEffect(() => {
    const storedToken = sessionStorage.getItem('adminToken');
    if (storedToken) {
      router.push(returnUrl);
    }
  }, [router, returnUrl]);

  // Listen for auth success from popup
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'AUTH_SUCCESS' && event.data.token) {
        console.log('Auth success received from popup');
        sessionStorage.setItem('adminToken', event.data.token);
        sessionStorage.setItem('adminUsername', event.data.username);
        setLoading(false);
        router.push(returnUrl);
      } else if (event.data.type === 'AUTH_ERROR') {
        console.error('Auth error from popup:', event.data.error);
        setError(event.data.error || 'Authentifizierung fehlgeschlagen');
        setLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [router, returnUrl]);

  // Check if popup was closed without completing auth
  useEffect(() => {
    if (!authWindow) return;
    
    const checkClosed = setInterval(() => {
      if (authWindow.closed) {
        console.log('Auth window was closed');
        setLoading(false);
        setAuthWindow(null);
        if (!sessionStorage.getItem('adminToken')) {
          setError('Anmeldung wurde abgebrochen');
        }
      }
    }, 500);

    return () => clearInterval(checkClosed);
  }, [authWindow]);

  const handleLogin = () => {
    setError('');
    setLoading(true);

    // Open popup to SharePoint auth endpoint
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popup = window.open(
      '/api/auth/login-popup',
      'SharePointAuth',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
    
    setAuthWindow(popup);
  };

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
              <p className="text-gray-700 mb-6">
                Melden Sie sich mit Ihren Windows-Zugangsdaten an.
              </p>
              
              {loading ? (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-600">Warte auf Authentifizierung...</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Bitte schließen Sie das Popup-Fenster nicht.
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleLogin}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
                >
                  Mit Windows anmelden
                </button>
              )}
            </div>

            <div className="mt-6 text-center border-t pt-6">
              <p className="text-sm text-gray-600 mb-2">
                Sie müssen Mitglied der SharePoint-Gruppe <strong>Roadmapadmin</strong> oder <strong>roadadmin</strong> sein.
              </p>
              <p className="text-xs text-gray-500">
                Die Anmeldung erfolgt über Ihre Windows-Domain-Zugangsdaten (BS\benutzername).
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
