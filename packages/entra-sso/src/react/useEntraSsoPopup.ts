import { useCallback, useRef, useState } from 'react';

export type EntraSsoPopupSuccess = { token: string; username?: string };
export type EntraSsoPopupError = { error: string };

type EntraPopupMessage =
  | { type: 'AUTH_SUCCESS'; token: string; username?: string }
  | { type: 'AUTH_ERROR'; error?: string }
  | { type: string; [key: string]: unknown };

export function useEntraSsoPopup(args: {
  popupUrl: string;
  returnUrl?: string;
  popupName?: string;
  features?: string;
}): {
  start: () => void;
  isOpen: boolean;
  lastError: string | null;
  lastSuccess: EntraSsoPopupSuccess | null;
} {
  const [isOpen, setIsOpen] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastSuccess, setLastSuccess] = useState<EntraSsoPopupSuccess | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const start = useCallback(() => {
    setLastError(null);
    setLastSuccess(null);

    const popup = window.open(
      args.popupUrl,
      args.popupName || 'entraSsoLogin',
      args.features ||
        'width=520,height=720,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes'
    );

    if (!popup) {
      setLastError('Popup wurde blockiert.');
      return;
    }

    setIsOpen(true);

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as unknown;
      if (!data || typeof data !== 'object') return;

      const msg = data as EntraPopupMessage;
      if (msg.type === 'AUTH_SUCCESS' && typeof msg.token === 'string') {
        const username = typeof msg.username === 'string' ? msg.username : undefined;
        setLastSuccess({ token: msg.token, username });
        try {
          popup.close();
        } catch {
          // ignore
        }
      }
      if (msg.type === 'AUTH_ERROR') {
        setLastError(String(msg.error || 'SSO fehlgeschlagen'));
      }
    };

    window.addEventListener('message', onMessage);

    const poll = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(poll);
        setIsOpen(false);
        window.removeEventListener('message', onMessage);
      }
    }, 500);

    cleanupRef.current = () => {
      window.clearInterval(poll);
      window.removeEventListener('message', onMessage);
      setIsOpen(false);
    };
  }, [args.features, args.popupName, args.popupUrl]);

  return { start, isOpen, lastError, lastSuccess };
}
