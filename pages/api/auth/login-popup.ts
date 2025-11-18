import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Serves the login popup HTML that authenticates with SharePoint
 * and sends the result back to the parent window
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SharePoint Authentifizierung</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
      color: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .container {
      text-align: center;
      max-width: 500px;
    }
    .spinner {
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top: 4px solid white;
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
      margin: 20px auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .status {
      margin-top: 20px;
      padding: 15px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      font-size: 14px;
    }
    .error {
      background: rgba(220, 38, 38, 0.2);
      border: 1px solid rgba(220, 38, 38, 0.5);
    }
    .success {
      background: rgba(34, 197, 94, 0.2);
      border: 1px solid rgba(34, 197, 94, 0.5);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>SharePoint Authentifizierung</h1>
    <div class="spinner" id="spinner"></div>
    <div id="status" class="status">Verbinde mit SharePoint...</div>
  </div>

  <script>
    const statusEl = document.getElementById('status');
    const spinnerEl = document.getElementById('spinner');

    async function authenticate() {
      try {
        statusEl.textContent = 'Verbinde mit SharePoint...';
        
        // Use our SharePoint proxy that forwards browser credentials
        // The proxy endpoint uses the browser's cookies/auth
        const response = await fetch('/api/sharepoint/_api/web/currentuser?$expand=Groups', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json;odata=nometadata'
          }
        });

        if (!response.ok) {
          throw new Error('SharePoint-Authentifizierung fehlgeschlagen (Status: ' + response.status + ')');
        }

        const userData = await response.json();
        
        statusEl.textContent = 'Überprüfe Admin-Berechtigung...';
        
        // Check if user is site admin
        const isSiteAdmin = userData.IsSiteAdmin === true;
        
        // Check if user is in admin groups
        const groups = userData.Groups || [];
        const adminGroupRegex = /\\b(owner|besitzer|roadmapadmin|roadadmin)\\b/i;
        const isInAdminGroup = groups.some(group => {
          const title = group.Title || group.title || group;
          return adminGroupRegex.test(title);
        });
        
        if (!isSiteAdmin && !isInAdminGroup) {
          throw new Error('Sie sind nicht Mitglied der Roadmapadmin-Gruppe');
        }

        statusEl.textContent = 'Erstelle Session-Token...';
        
        // Send user data to server to create JWT token
        const tokenResponse = await fetch('/api/auth/create-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: userData.LoginName,
            displayName: userData.Title,
            isSiteAdmin,
            groups: groups.map(g => g.Title)
          })
        });

        if (!tokenResponse.ok) {
          throw new Error('Token-Erstellung fehlgeschlagen');
        }

        const tokenData = await tokenResponse.json();

        statusEl.textContent = 'Authentifizierung erfolgreich! Fenster wird geschlossen...';
        statusEl.classList.add('success');
        spinnerEl.style.display = 'none';

        // Send success message to parent window
        if (window.opener) {
          window.opener.postMessage({
            type: 'AUTH_SUCCESS',
            token: tokenData.token,
            username: userData.Title || userData.LoginName
          }, window.location.origin);
        }

        // Close popup after short delay
        setTimeout(() => {
          window.close();
        }, 1500);

      } catch (error) {
        console.error('Auth error:', error);
        statusEl.textContent = error.message || 'Authentifizierung fehlgeschlagen';
        statusEl.classList.add('error');
        spinnerEl.style.display = 'none';

        // Send error to parent
        if (window.opener) {
          window.opener.postMessage({
            type: 'AUTH_ERROR',
            error: error.message || 'Authentifizierung fehlgeschlagen'
          }, window.location.origin);
        }

        // Close after 3 seconds
        setTimeout(() => {
          window.close();
        }, 3000);
      }
    }

    // Start authentication
    authenticate();
  </script>
</body>
</html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}
