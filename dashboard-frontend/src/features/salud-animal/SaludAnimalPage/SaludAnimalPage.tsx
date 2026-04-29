import { useState, useEffect } from 'react';
import { Scissors, Syringe, Shield, BookOpen, MoreVertical } from 'lucide-react';
import { StatCard, Card, PageHeader, Button } from '@/components/shared';
import styles from './SaludAnimalPage.module.css';

interface SaludData {
  tasa_castracion: number;
  tasa_vacunacion: number;
  tasa_desparasitacion: number;
  conocen_vacunas_si: number;
  conocen_vacunas_no: number;
  conocen_vacunas_pct: number;
  lugar_castracion: {
    solo_municipio: number;
    solo_particular: number;
    ambos: number;
    no_castradas: number;
    total_castradas: number;
  };
}

export function SaludAnimalPage() {
  const [data, setData] = useState<SaludData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/stats/page-salud')
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

  const total = data.lugar_castracion.solo_municipio + data.lugar_castracion.solo_particular + data.lugar_castracion.ambos + data.lugar_castracion.no_castradas;
  const lugarCastracion = [
    { label: 'Municipal', value: total > 0 ? Math.round((data.lugar_castracion.solo_municipio / total) * 100) : 0, color: 'var(--color-navy-700)' },
    { label: 'Privado', value: total > 0 ? Math.round((data.lugar_castracion.solo_particular / total) * 100) : 0, color: 'var(--color-amber-500)' },
    { label: 'No Castrado', value: total > 0 ? Math.round((data.lugar_castracion.no_castradas / total) * 100) : 0, color: 'var(--color-gray-300)' },
    { label: 'Ambos', value: total > 0 ? Math.round((data.lugar_castracion.ambos / total) * 100) : 0, color: 'var(--color-success)' },
  ];

  const indicadores = [
    { label: 'Desparasitación', value: Math.round(data.tasa_desparasitacion * 10) / 10, color: 'var(--color-success)' },
    { label: 'Vacunación', value: Math.round(data.tasa_vacunacion * 10) / 10, color: 'var(--color-amber-600)' },
    { label: 'Castración', value: Math.round(data.tasa_castracion * 10) / 10, color: 'var(--color-navy-700)' },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        title="Salud Animal (Tenencia Responsable)"
        subtitle="Detalle del estado de salud de las mascotas y conocimiento de sus dueños."
        actions={
          <Button variant="outline" size="sm" icon={<Shield size={14} />} id="btn-exportar-pdf-salud">
            Exportar PDF
          </Button>
        }
      />

      {/* KPI row */}
      <div className={styles.kpiRow}>
        <StatCard
          label="Tasa de Castración"
          value={`${Math.round(data.tasa_castracion * 10) / 10}%`}
          icon={<Scissors size={16} />}
          iconColor="navy"
          progressBar={{ value: data.tasa_castracion, color: 'var(--color-navy-700)' }}
          id="stat-salud-castracion"
        />
        <StatCard
          label="Tasa de Vacunación"
          value={`${Math.round(data.tasa_vacunacion * 10) / 10}%`}
          icon={<Syringe size={16} />}
          iconColor="amber"
          progressBar={{ value: data.tasa_vacunacion, color: 'var(--color-amber-500)' }}
          id="stat-salud-vacunacion"
        />
        <StatCard
          label="Tasa de Desparasitación"
          value={`${Math.round(data.tasa_desparasitacion * 10) / 10}%`}
          icon={<Shield size={16} />}
          iconColor="success"
          progressBar={{ value: data.tasa_desparasitacion, color: 'var(--color-success)' }}
          id="stat-salud-desparasitacion"
        />
        <StatCard
          label="Conocimiento del Dueño"
          value={`${Math.round(data.conocen_vacunas_pct * 10) / 10}%`}
          icon={<BookOpen size={16} />}
          iconColor="neutral"
          progressBar={{ value: data.conocen_vacunas_pct, color: 'var(--color-gray-400)' }}
          id="stat-salud-conocimiento"
        />
      </div>

      {/* Middle row */}
      <div className={styles.midRow}>
        {/* Indicadores globales */}
        <Card padding="md" className={styles.indicadoresCard}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>Indicadores de Salud Globales</h3>
              <p className={styles.cardSub}>Comparativa de cumplimiento de prácticas básicas</p>
            </div>
            <button className={styles.menuBtn} aria-label="Opciones"><MoreVertical size={16} /></button>
          </div>
          <div className={styles.indicadoresList}>
            {indicadores.map((ind) => (
              <div key={ind.label} className={styles.indicadorRow}>
                <div className={styles.indicadorMeta}>
                  <span className={styles.indicadorLabel}>{ind.label}</span>
                  <span className={styles.indicadorValue}>{ind.value}%</span>
                </div>
                <div className={styles.indicadorTrack}>
                  <div
                    className={styles.indicadorBar}
                    style={{ width: `${ind.value}%`, backgroundColor: ind.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Lugar de castración */}
        <Card padding="md" className={styles.lugarCard}>
          <h3 className={styles.cardTitle}>Lugar de Castración</h3>
          <p className={styles.cardSub}>Distribución por sector</p>
          <div className={styles.donutWrap}>
            <MultiDonut segments={lugarCastracion} />
            <div className={styles.donutCenter}>
              <div className={styles.donutLabel}>TOTAL CASTRADAS</div>
              <div className={styles.donutValue}>{Math.round(data.tasa_castracion * 10) / 10}%</div>
            </div>
          </div>
          <div className={styles.legend}>
            {lugarCastracion.map((item) => (
              <div key={item.label} className={styles.legendItem}>
                <div className={styles.legendDot} style={{ backgroundColor: item.color }} />
                <span>{item.label} ({item.value}%)</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Conocimiento vacunación */}
      <Card padding="md">
        <h3 className={styles.cardTitle}>Conocimiento sobre Plan de Vacunación</h3>
        <p className={styles.cardSub}>¿El dueño conoce qué vacunas necesita su mascota?</p>
        <div className={styles.vacSplit}>
          <div className={styles.vacPercent}>
            <span className={styles.vacValue} style={{ color: 'var(--color-amber-600)' }}>{Math.round(data.conocen_vacunas_pct)}%</span>
            <span className={styles.vacLabel}>Conoce</span>
          </div>
          <div className={styles.vacBarOuter}>
            <div className={styles.vacBarInner} style={{ width: `${data.conocen_vacunas_pct}%`, background: 'var(--color-amber-500)' }} />
          </div>
          <div className={styles.vacPercent}>
            <span className={styles.vacValue}>{Math.round(100 - data.conocen_vacunas_pct)}%</span>
            <span className={styles.vacLabel}>No conoce</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ── Multi-segment donut ── */
function MultiDonut({ segments }: { segments: { value: number; color: string }[] }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  let cumulative = 0;

  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      {segments.map((seg, i) => {
        const dash = (seg.value / 100) * circ;
        const gap = circ - dash;
        const rotation = -90 + (cumulative / 100) * 360;
        cumulative += seg.value;
        return (
          <circle
            key={i}
            cx="60" cy="60" r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth="10"
            strokeDasharray={`${dash} ${gap}`}
            strokeLinecap="butt"
            transform={`rotate(${rotation} 60 60)`}
          />
        );
      })}
    </svg>
  );
}
