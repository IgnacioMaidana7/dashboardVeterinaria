import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  PawPrint,
  MapPin,
  Building2,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { Card } from '@/components/shared';
import styles from './HomePage.module.css';

const MODULES = [
  {
    to: '/panorama',
    label: 'Panorama General',
    description:
      'Resumen ejecutivo de métricas clave: tendencias de incidentes, gestión financiera y performance general del sistema.',
    icon: <LayoutDashboard size={22} />,
    color: 'navy' as const,
    colorClass: styles.colorNavy,
  },
  {
    to: '/salud-animal',
    label: 'Salud Animal',
    description:
      'Seguimiento de registros clínicos, campañas de vacunación, brotes de enfermedades endémicas y datos por especie.',
    icon: <PawPrint size={22} />,
    color: 'teal' as const,
    colorClass: styles.colorTeal,
  },
  {
    to: '/situacion-callejera',
    label: 'Situación Callejera',
    description:
      'Mapeo geoespacial de poblaciones callejeras, incidentes reportados, operativos de rescate y zonas de alto riesgo.',
    icon: <MapPin size={22} />,
    color: 'amber' as const,
    colorClass: styles.colorAmber,
  },
  {
    to: '/servicios-municipales',
    label: 'Servicios Municipales',
    description:
      'Asignación de recursos en clínicas públicas, seguimiento de unidades móviles, inventario y planificación de personal.',
    icon: <Building2 size={22} />,
    color: 'navy' as const,
    colorClass: styles.colorNavy2,
  },
];

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      {/* Hero banner */}
      <Card variant="hero" padding="none" className={styles.heroBanner}>
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <div className={styles.heroPill}>
              <Activity size={13} />
              <span>Sistema activo</span>
            </div>
            <h1 className={styles.heroTitle}>Intelligence Hub</h1>
            <p className={styles.heroDesc}>
              Seleccioná un módulo para acceder a métricas en tiempo real,
              análisis geográficos e información crítica sobre la infraestructura
              veterinaria regional y el bienestar animal.
            </p>
          </div>
          <div className={styles.heroVisual} aria-hidden="true">
            <HeroChart />
          </div>
        </div>
      </Card>

      {/* Module grid */}
      <section aria-label="Módulos del dashboard">
        <h2 className={styles.sectionTitle}>Módulos</h2>
        <div className={styles.moduleGrid}>
          {MODULES.map((mod) => (
            <ModuleCard key={mod.to} {...mod} onNavigate={() => navigate(mod.to)} />
          ))}
        </div>
      </section>
    </div>
  );
}

/* ── Sub-components ── */

interface ModuleCardProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  colorClass: string;
  onNavigate: () => void;
}

function ModuleCard({ label, description, icon, colorClass, onNavigate }: ModuleCardProps) {
  return (
    <Card
      hoverable
      onClick={onNavigate}
      padding="md"
      className={styles.moduleCard}
    >
      <div className={styles.moduleHeader}>
        <div className={`${styles.moduleIcon} ${colorClass}`}>{icon}</div>
        <ArrowRight size={16} className={styles.moduleArrow} />
      </div>
      <h3 className={styles.moduleLabel}>{label}</h3>
      <p className={styles.moduleDesc}>{description}</p>
    </Card>
  );
}

function HeroChart() {
  const bars = [40, 65, 45, 80, 55, 70, 90, 60, 75, 85, 50, 95, 65, 78, 88, 55, 72];
  return (
    <div className={styles.chartWrap}>
      <div className={styles.chartBars}>
        {bars.map((h, i) => (
          <div
            key={i}
            className={styles.bar}
            style={{
              height: `${h}%`,
              animationDelay: `${i * 60}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
