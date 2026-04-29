import { useState, useEffect } from 'react';
import { Users, TrendingUp } from 'lucide-react';
import { StatCard, Card, PageHeader } from '@/components/shared';
import styles from './PanoramaPage.module.css';

interface DashboardData {
  totales: number;
  tasa_vacunacion: number;
  tasa_castracion: number;
  tasa_desparasitacion: number;
  barrios: {
    barrio: string;
    encuestados: number;
    castradas: number;
    vacunadas: number;
    desparasitadas: number;
  }[];
}

export function PanoramaPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/stats/page-resumen')
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching data:', err);
        setLoading(false);
      });
  }, []);

  if (loading || !data) return <div>Cargando...</div>;

  const coverageRings = [
    { label: 'Vacunación', value: Math.round(data.tasa_vacunacion * 10) / 10, color: 'var(--color-navy-700)' },
    { label: 'Desparasitación', value: Math.round(data.tasa_desparasitacion * 10) / 10, color: 'var(--color-amber-500)' },
    { label: 'Castración', value: Math.round(data.tasa_castracion * 10) / 10, color: 'var(--color-success)' },
  ];

  return (
    <div className={styles.page}>
      <PageHeader title="Panorama General" />

      {/* Top stats */}
      <div className={styles.topRow}>
        {/* Total encuestados */}
        <Card padding="md" className={styles.totalCard}>
          <div className={styles.totalHeader}>
            <span className={styles.totalLabel}>TOTAL ENCUESTADOS</span>
            <div className={styles.totalIcon}>
              <Users size={18} />
            </div>
          </div>
          <div className={styles.totalValue}>{data.totales.toLocaleString()}</div>
          <div className={styles.totalTrend}>
            <TrendingUp size={14} />
            <span>Datos actualizados</span>
          </div>
        </Card>

        {/* Coverage rings */}
        <Card padding="md" className={styles.coverageCard}>
          <h3 className={styles.coverageTitle}>Tasas de Cobertura Sanitaria</h3>
          <div className={styles.ringsRow}>
            {coverageRings.map((ring) => (
              <DonutRing key={ring.label} {...ring} />
            ))}
          </div>
        </Card>
      </div>

      {/* Distribution map placeholder */}
      <Card padding="md" className={styles.mapCard}>
        <div className={styles.mapHeader}>
          <h3 className={styles.mapTitle}>Distribución por Barrios</h3>
          <button className={styles.mapLink}>Ver tabla completa →</button>
        </div>
        <div className={styles.mapBody}>
          <MapPlaceholder />
        </div>
      </Card>

      {/* Stats grid */}
      <div className={styles.statsGrid}>
        <StatCard
          label="Tasa de Castración"
          value={`${Math.round(data.tasa_castracion * 10) / 10}%`}
          progressBar={{ value: data.tasa_castracion, color: 'var(--color-navy-700)' }}
          id="stat-castracion"
        />
        <StatCard
          label="Tasa de Vacunación"
          value={`${Math.round(data.tasa_vacunacion * 10) / 10}%`}
          progressBar={{ value: data.tasa_vacunacion, color: 'var(--color-amber-500)' }}
          id="stat-vacunacion"
        />
        <StatCard
          label="Tasa de Desparasitación"
          value={`${Math.round(data.tasa_desparasitacion * 10) / 10}%`}
          progressBar={{ value: data.tasa_desparasitacion, color: 'var(--color-success)' }}
          id="stat-desparasitacion"
        />
      </div>

      {/* Barrios table */}
      <Card padding="none" className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <h3 className={styles.tableTitle}>Detalle por Barrio</h3>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Barrio</th>
                <th>Encuestados</th>
                <th>Castración</th>
                <th>Vacunación</th>
                <th>Desparasitación</th>
              </tr>
            </thead>
            <tbody>
              {data.barrios.map((row) => (
                <tr key={row.barrio}>
                  <td className={styles.barrio}>{row.barrio}</td>
                  <td>{row.encuestados.toLocaleString()}</td>
                  <td>
                    <ProgressCell value={Math.round((row.castradas / row.encuestados) * 100) || 0} color="var(--color-navy-700)" />
                  </td>
                  <td>
                    <ProgressCell value={Math.round((row.vacunadas / row.encuestados) * 100) || 0} color="var(--color-amber-500)" />
                  </td>
                  <td>
                    <ProgressCell value={Math.round((row.desparasitadas / row.encuestados) * 100) || 0} color="var(--color-success)" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ── Sub-components ── */

function DonutRing({ label, value, color }: { label: string; value: number; color: string }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;

  return (
    <div className={styles.ring}>
      <div className={styles.ringSvgWrap}>
        <svg width="90" height="90" viewBox="0 0 90 90">
          <circle cx="45" cy="45" r={r} fill="none" stroke="var(--color-gray-100)" strokeWidth="8" />
          <circle
            cx="45" cy="45" r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeLinecap="round"
            transform="rotate(-90 45 45)"
          />
        </svg>
        <span className={styles.ringValue}>{value}%</span>
      </div>
      <span className={styles.ringLabel}>• {label}</span>
    </div>
  );
}

function ProgressCell({ value, color }: { value: number; color: string }) {
  return (
    <div className={styles.progressCell}>
      <span className={styles.progressCellValue}>{value}%</span>
      <div className={styles.progressCellTrack}>
        <div className={styles.progressCellBar} style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function MapPlaceholder() {
  return (
    <div className={styles.mapPlaceholder}>
      <div className={styles.mapTooltip}>
        <div className={styles.mapTooltipTitle}>Zona Norte <span>(Destacada)</span></div>
        <div className={styles.mapTooltipRow}><span>Encuestados</span><strong>450</strong></div>
        <div className={styles.mapTooltipRow}><span>Índice Castración</span><strong className={styles.highlight}>65%</strong></div>
      </div>
      {/* SVG city grid */}
      <svg viewBox="0 0 600 250" className={styles.mapSvg} aria-label="Mapa de distribución por barrios">
        <rect width="600" height="250" fill="var(--color-navy-800)" rx="8" />
        {Array.from({ length: 30 }).map((_, i) =>
          Array.from({ length: 12 }).map((_, j) => (
            <rect
              key={`${i}-${j}`}
              x={i * 20 + 2} y={j * 20 + 2}
              width="16" height="16"
              rx="2"
              fill={`rgba(100,180,200,${Math.random() * 0.15 + 0.05})`}
            />
          ))
        )}
        {/* Barrio labels */}
        <text x="80" y="60" fill="rgba(255,255,255,0.6)" fontSize="11" fontFamily="DM Sans">Norte</text>
        <text x="280" y="60" fill="rgba(255,255,255,0.6)" fontSize="11" fontFamily="DM Sans">Centro</text>
        <text x="480" y="60" fill="rgba(255,255,255,0.6)" fontSize="11" fontFamily="DM Sans">Este</text>
        <text x="80" y="200" fill="rgba(255,255,255,0.6)" fontSize="11" fontFamily="DM Sans">Oeste</text>
        <text x="280" y="200" fill="rgba(255,255,255,0.6)" fontSize="11" fontFamily="DM Sans">Sur</text>
      </svg>
    </div>
  );
}
