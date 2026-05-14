import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  LayoutDashboard,
  PawPrint,
  MapPin,
  Building2,
} from 'lucide-react';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: <Home size={18} />, end: true },
  { to: '/panorama', label: 'Panorama General', icon: <LayoutDashboard size={18} /> },
  { to: '/salud-animal', label: 'Salud Animal', icon: <PawPrint size={18} /> },
  { to: '/situacion-callejera', label: 'Situación Callejera', icon: <MapPin size={18} /> },
  { to: '/servicios-municipales', label: 'Servicios Municipales', icon: <Building2 size={18} /> },
];

export function Sidebar() {
  const location = useLocation();
  const isActive = (to: string, end = false) =>
    end ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <aside className={styles.sidebar}>
      {/* Brand */}
      <div className={styles.brand}>
        <div className={styles.brandIcon}>
          <PawPrint size={22} />
        </div>
        <div className={styles.brandText}>
          <span className={styles.brandName}>Veterinaria Cassina</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className={styles.nav} aria-label="Navegación principal">
        <ul className={styles.navList}>
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive: active }) =>
                  `${styles.navItem} ${active ? styles.navItemActive : ''}`
                }
                aria-current={isActive(item.to, item.end) ? 'page' : undefined}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

    </aside>
  );
}
