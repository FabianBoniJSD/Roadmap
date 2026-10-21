import { FiMessageCircle } from 'react-icons/fi';
import { ORBIT_URL } from '@/utils/orbit';

const OrbitLauncher = () => (
  <a
    href={ORBIT_URL}
    target="_blank"
    rel="noopener noreferrer"
    className="orbit-launcher"
    aria-label="Support in neuem Fenster öffnen"
  >
    <FiMessageCircle aria-hidden="true" />
    <span className="orbit-launcher-label">Support</span>
  </a>
);

export default OrbitLauncher;
