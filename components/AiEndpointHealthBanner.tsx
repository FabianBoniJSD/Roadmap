import { useCallback, useEffect, useRef, useState } from 'react';
import { prefixBasePath } from '@/utils/nextBasePath';
import styles from './AiEndpointHealthBanner.module.css';
import { FiAlertTriangle } from 'react-icons/fi';

type AiHealthPayload = {
  ok?: boolean;
  enabled?: boolean;
  endpoints?: Array<{ label?: string; ok?: boolean }>;
};

type BannerState = {
  unavailable: boolean;
  affectedLabels: string[];
};

export type AiEndpointHealthBannerProps = {
  healthPath?: string;
  intervalMs?: number;
  requestTimeoutMs?: number;
  message?: string;
};

const readPositiveInteger = (value: string | undefined, fallback: number, minimum: number) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) ? Math.max(minimum, parsed) : fallback;
};

export default function AiEndpointHealthBanner({
  healthPath = '/api/health/ai',
  intervalMs = readPositiveInteger(process.env.NEXT_PUBLIC_AI_HEARTBEAT_INTERVAL_MS, 30_000, 5_000),
  requestTimeoutMs = readPositiveInteger(
    process.env.NEXT_PUBLIC_AI_HEARTBEAT_REQUEST_TIMEOUT_MS,
    12_000,
    1_000
  ),
  message = process.env.NEXT_PUBLIC_AI_HEARTBEAT_MESSAGE ||
    'Die KI-Dienste sind momentan nicht erreichbar. KI-Funktionen stehen vorübergehend nicht zur Verfügung.',
}: AiEndpointHealthBannerProps) {
  const [state, setState] = useState<BannerState>({
    unavailable: false,
    affectedLabels: [],
  });
  const [checking, setChecking] = useState(false);
  const requestSequence = useRef(0);

  const checkHealth = useCallback(async () => {
    const sequence = ++requestSequence.current;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), requestTimeoutMs);
    setChecking(true);

    try {
      const response = await fetch(prefixBasePath(healthPath), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal: controller.signal,
      });
      const payload = (await response.json().catch(() => null)) as AiHealthPayload | null;
      if (sequence !== requestSequence.current) return;

      if (response.ok && payload?.ok === true) {
        setState({ unavailable: false, affectedLabels: [] });
        return;
      }

      const affectedLabels = Array.isArray(payload?.endpoints)
        ? payload.endpoints
            .filter((endpoint) => endpoint?.ok === false && endpoint.label)
            .map((endpoint) => String(endpoint.label))
            .slice(0, 3)
        : [];
      setState({ unavailable: true, affectedLabels });
    } catch {
      if (sequence === requestSequence.current) {
        setState({ unavailable: true, affectedLabels: [] });
      }
    } finally {
      window.clearTimeout(timeout);
      if (sequence === requestSequence.current) setChecking(false);
    }
  }, [healthPath, requestTimeoutMs]);

  useEffect(() => {
    void checkHealth();
    const interval = window.setInterval(() => void checkHealth(), intervalMs);
    const handleOnline = () => void checkHealth();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void checkHealth();
    };
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      requestSequence.current += 1;
      window.clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [checkHealth, intervalMs]);

  if (!state.unavailable) return null;

  return (
    <aside className={styles.root} role="alert" aria-live="assertive" data-ai-health="down">
      <div className={styles.content}>
        <span className={styles.icon} aria-hidden="true">
          <FiAlertTriangle />
        </span>
        <p className={styles.message}>
          {message}
          {state.affectedLabels.length > 0 && (
            <span className={styles.details}> Betroffen: {state.affectedLabels.join(', ')}.</span>
          )}
        </p>
        <button
          className={styles.retry}
          type="button"
          onClick={() => void checkHealth()}
          disabled={checking}
        >
          {checking ? 'Prüfe…' : 'Erneut prüfen'}
        </button>
      </div>
    </aside>
  );
}
