import { useLocation } from 'react-router-dom';
import styles from './TopBar.module.css';

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Dashboard Veterinaria Cassina',
  '/panorama': 'Panorama General',
  '/salud-animal': 'Salud Animal',
  '/situacion-callejera': 'Situación Callejera',
  '/servicios-municipales': 'Conocimiento y Acceso',
};

const ROUTE_SUBTITLES: Record<string, string> = {
  '/panorama': '',
  '/salud-animal': 'Tenencia Responsable',
  '/situacion-callejera': '',
  '/servicios-municipales': 'Servicios Municipales',
};

export function TopBar() {
  const { pathname } = useLocation();
  const title = ROUTE_TITLES[pathname] ?? 'Dashboard Veterinaria Cassina';
  const subtitle = ROUTE_SUBTITLES[pathname];

  return (
    <header className={styles.topbar} role="banner">
      <div className={styles.titleArea}>
        <h2 className={styles.title}>{title}</h2>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>

    </header>
  );
}
