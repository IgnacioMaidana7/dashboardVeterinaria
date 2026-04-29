import { useLocation } from 'react-router-dom';
import { Filter, Calendar, Bell, User } from 'lucide-react';
import styles from './TopBar.module.css';

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Cassina Veterinary Dashboard',
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
  const title = ROUTE_TITLES[pathname] ?? 'Cassina Veterinary Dashboard';
  const subtitle = ROUTE_SUBTITLES[pathname];

  return (
    <header className={styles.topbar} role="banner">
      <div className={styles.titleArea}>
        <h2 className={styles.title}>{title}</h2>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>

      <div className={styles.actions}>
        <button className={styles.iconBtn} aria-label="Filtros" id="btn-topbar-filtros">
          <Filter size={18} />
        </button>
        <button className={styles.iconBtn} aria-label="Calendario" id="btn-topbar-calendario">
          <Calendar size={18} />
        </button>
        <button className={`${styles.iconBtn} ${styles.notifBtn}`} aria-label="Notificaciones" id="btn-topbar-notificaciones">
          <Bell size={18} />
          <span className={styles.notifDot} aria-hidden="true" />
        </button>
        <button className={styles.avatarBtn} aria-label="Perfil de usuario" id="btn-topbar-perfil">
          <User size={16} />
        </button>
      </div>
    </header>
  );
}
