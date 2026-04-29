import { useState, useEffect } from 'react';
import { AlertTriangle, Eye, EyeOff, CheckCircle, Download } from 'lucide-react';
import { StatCard, Card, PageHeader, Button } from '@/components/shared';
import styles from './SituacionCallejeraPage.module.css';

interface CallejerosData {
  total_respuestas: number;
  frecuencia: { respuesta: string; cantidad: number; porcentaje: number }[];
  mapa_barrios: { barrio: string; total_respuestas: number; ve_todo_el_tiempo: number }[];
}

export function SituacionCallejeraPage() {
  const [data, setData] = useState<CallejerosData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/stats/page-callejeros')
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

  const freqMapping: Record<string, { color: string; icon: React.ReactNode; id: string }> = {
    'Todo el tiempo': { color: '#C0392B', icon: <AlertTriangle size={18} />, id: 'siempre' },
    'A veces': { color: 'var(--color-amber-500)', icon: <Eye size={18} />, id: 'aveces' },
    'Raramente': { color: 'var(--color-info)', icon: <EyeOff size={18} />, id: 'raravez' },
    'Rara vez': { color: 'var(--color-info)', icon: <EyeOff size={18} />, id: 'raravez' },
    'Nunca': { color: 'var(--color-success)', icon: <CheckCircle size={18} />, id: 'nunca' },
  };

  const freqData = data.frecuencia.map(f => {
    const meta = freqMapping[f.respuesta] || { color: '#ccc', icon: <Eye size={18} />, id: f.respuesta.toLowerCase().replace(/\s/g, '') };
    return {
      label: f.respuesta,
      value: Math.round(f.porcentaje * 10) / 10,
      color: meta.color,
      icon: meta.icon,
      id: meta.id
    };
  });

  // Sort freqData by typical order or let it be sorted by what we got.
  // Actually, we can just sort by value descending as a generic fallback.
  freqData.sort((a, b) => b.value - a.value);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Percepción de Animales en Situación de Calle"
        subtitle="Análisis de la frecuencia de avistamientos reportados por los ciudadanos en la zona metropolitana."
        actions={
          <Button variant="outline" size="sm" icon={<Download size={14} />} id="btn-exportar-pdf-calle">
            Exportar PDF
          </Button>
        }
      />

      {/* KPI stat cards */}
      <div className={styles.kpiRow}>
        {freqData.map((item) => (
          <StatCard
            key={item.id}
            id={`stat-calle-${item.id}`}
            label={`Avistamiento: ${item.label}`}
            value={`${item.value}%`}
            progressBar={{ value: item.value, color: item.color }}
          />
        ))}
      </div>

      {/* Charts row */}
      <div className={styles.chartsRow}>
        {/* Stacked bar */}
        <Card padding="md" className={styles.barCard}>
          <h3 className={styles.cardTitle}>Distribución de Frecuencia de Avistamientos</h3>
          <p className={styles.cardSub}>
            Porcentaje de respuestas ciudadanas respecto a la presencia de animales abandonados.
          </p>
          <div className={styles.stackedBar}>
            {freqData.map((item) => (
              <div
                key={item.id}
                className={styles.stackSegment}
                style={{ width: `${item.value}%`, backgroundColor: item.color }}
                title={`${item.label}: ${item.value}%`}
              >
                {item.value > 15 && (
                  <span className={styles.segmentLabel}>{item.value}%</span>
                )}
              </div>
            ))}
          </div>
          <div className={styles.legend}>
            {freqData.map((item) => (
              <div key={item.id} className={styles.legendItem}>
                <div className={styles.legendDot} style={{ backgroundColor: item.color }} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Heat map placeholder */}
        <Card padding="md" className={styles.mapCard}>
          <h3 className={styles.cardTitle}>Mapa de Calor Urbano</h3>
          <p className={styles.cardSub}>Zonas de mayor concentración percibida.</p>
          <div className={styles.heatMapWrap}>
            <HeatMapPlaceholder />
          </div>
        </Card>
      </div>
    </div>
  );
}

function HeatMapPlaceholder() {
  return (
    <div className={styles.heatMap}>
      <svg viewBox="0 0 300 200" className={styles.heatMapSvg} aria-label="Mapa de calor urbano">
        <rect width="300" height="200" fill="#2a3a4a" rx="8" />
        {/* Street grid */}
        {Array.from({ length: 15 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 14} x2="300" y2={i * 14} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
        ))}
        {Array.from({ length: 22 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 14} y1="0" x2={i * 14} y2="200" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
        ))}
        {/* Heat spots */}
        <radialGradient id="heat1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#C0392B" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#C0392B" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="heat2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E8913A" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#E8913A" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="heat3" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F5C48A" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#F5C48A" stopOpacity="0" />
        </radialGradient>
        <circle cx="150" cy="90" r="55" fill="url(#heat1)" />
        <circle cx="210" cy="60" r="35" fill="url(#heat2)" />
        <circle cx="90" cy="130" r="40" fill="url(#heat3)" />
        <circle cx="240" cy="140" r="28" fill="url(#heat2)" opacity="0.6" />
      </svg>
    </div>
  );
}
