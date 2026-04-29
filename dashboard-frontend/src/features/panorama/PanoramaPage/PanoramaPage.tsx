import { useState, useEffect } from 'react';
import { Users, Calendar, MapPin, Home, ChevronDown, Filter } from 'lucide-react';
import { PageHeader } from '@/components/shared';
import { DonutChart, HistogramChart, HorizontalBarChart, ChartCard } from '@/components/charts';
import styles from './PanoramaPage.module.css';

interface PanoramaData {
  totales: number;
  periodo_recoleccion: string;
  ciudades_cubiertas: number;
  promedio_integrantes: number;
  composicion_mascotas: {
    solo_perros: number;
    solo_gatos: number;
    mixto: number;
  };
  demanda_accion: {
    total: number;
    demandan: number;
    no_demandan: number;
    pct_demandan: number;
  };
  integrantes: {
    distribucion: { integrantes: number; frecuencia: number }[];
    media: number;
    mediana: number;
  };
  callejeros: {
    total_respuestas: number;
    frecuencia: { respuesta: string; cantidad: number; porcentaje: number }[];
  };
}

interface FiltrosData {
  barrios: string[];
}

export function PanoramaPage() {
  const [data, setData] = useState<PanoramaData | null>(null);
  const [barrios, setBarrios] = useState<string[]>([]);
  const [barrioSeleccionado, setBarrioSeleccionado] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Cargar lista de barrios una sola vez
  useEffect(() => {
    fetch('http://localhost:5000/api/stats/filtros')
      .then((r) => r.json())
      .then((json: FiltrosData) => {
        setBarrios(json.barrios || []);
      })
      .catch((err) => console.error('Error cargando barrios:', err));
  }, []);

  // Cargar datos cada vez que cambia el barrio
  useEffect(() => {
    setLoading(true);
    const url = barrioSeleccionado
      ? `http://localhost:5000/api/stats/panorama?barrio=${encodeURIComponent(barrioSeleccionado)}`
      : 'http://localhost:5000/api/stats/panorama';

    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error cargando panorama:', err);
        setLoading(false);
      });
  }, [barrioSeleccionado]);

  const handleBarrioChange = (nuevoBarrio: string) => {
    setRefreshing(true);
    setBarrioSeleccionado(nuevoBarrio);
    // La animación dura 600ms (espera a que termine el fade-out antes de mostrar los nuevos datos)
    setTimeout(() => setRefreshing(false), 600);
  };

  if (loading) return <div>Cargando...</div>;

  if (!data) return <div>Error al cargar datos</div>;

  // Donut: Composición de mascotas
  const mascotaColors = ['#1B3A4B', '#2D8659', '#E8913A'];
  const composicionData = [
    { name: 'Solo Perros', value: data.composicion_mascotas.solo_perros, color: mascotaColors[0] },
    { name: 'Solo Gatos', value: data.composicion_mascotas.solo_gatos, color: mascotaColors[1] },
    { name: 'Perros y Gatos', value: data.composicion_mascotas.mixto, color: mascotaColors[2] },
  ];

  // Histograma: Integrantes
  const histogramData = data.integrantes.distribucion.map((d) => ({
    bin: String(d.integrantes),
    count: d.frecuencia,
  }));

  // Barras horizontales: Callejeros
  const callejerosBarData = data.callejeros.frecuencia.map((f) => {
    const colorMap: Record<string, string> = {
      'Todo el tiempo': '#C0392B',
      'A veces': '#E8913A',
      'Raramente': '#2980B9',
      'Rara vez': '#2980B9',
      'Nunca': '#2D8659',
    };
    return {
      name: f.respuesta,
      value: f.cantidad,
      pct: f.porcentaje,
      color: colorMap[f.respuesta] || '#6C757D',
    };
  });

  // Demanda municipal
  const demandaData = [
    { name: 'Exigen acción municipal', value: data.demanda_accion.demandan, color: '#1B3A4B' },
    { name: 'No es necesaria', value: data.demanda_accion.no_demandan, color: '#ADB5BD' },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        title="Panorama General"
        subtitle="Encuesta sobre Tenencia Responsable de Mascotas — San Francisco, Misiones"
      />

      {/* Filtro por barrio */}
      <div className={styles.filterBar}>
        <div className={styles.filterLabel}>
          <Filter size={14} />
          <span>Filtrar por barrio</span>
        </div>
        <div className={styles.selectWrap}>
          <select
            className={styles.select}
            value={barrioSeleccionado}
            onChange={(e) => handleBarrioChange(e.target.value)}
          >
            <option value="">Todos los barrios</option>
            {barrios.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className={styles.selectIcon} />
        </div>
      </div>

      {/* Gráficos con animación de recarga */}
      <div className={`${styles.chartsContainer} ${refreshing ? styles.refreshing : ''}`}>
      <div className={styles.kpiRow}>
        <KpiCard
          icon={<Users size={20} />}
          label="Total Encuestados"
          value={data.totales.toLocaleString()}
          color="#1B3A4B"
        />
        <KpiCard
          icon={<Calendar size={20} />}
          label="Período de Recolección"
          value={data.periodo_recoleccion}
          color="#E8913A"
        />
        <KpiCard
          icon={<MapPin size={20} />}
          label="Ciudades Cubiertas"
          value={String(data.ciudades_cubiertas)}
          color="#2D8659"
        />
        <KpiCard
          icon={<Home size={20} />}
          label="Prom. Integrantes por Familia"
          value={String(data.promedio_integrantes)}
          color="#2980B9"
        />
      </div>

      {/* Donut principal */}
      <div className={styles.donutSection}>
        <DonutChart
          title="Composición de Mascotas en los Hogares"
          subtitle={`Distribución por tipo de tenencia (n=${data.totales})`}
          data={composicionData}
        />
      </div>

      {/* Histograma */}
      <HistogramChart
        title="Distribución de Integrantes por Familia"
        subtitle={`Media=${data.integrantes.media} | Mediana=${data.integrantes.mediana}`}
        data={histogramData}
        mean={data.integrantes.media}
        median={data.integrantes.mediana}
      />

      {/* Fila inferior: Callejeros + Demanda */}
      <div className={styles.bottomRow}>
        <HorizontalBarChart
          title="Percepción de Animales Callejeros"
          subtitle="Frecuencia de avistamientos reportados por los ciudadanos"
          data={callejerosBarData}
          xAxisLabel="Número de encuestados"
        />
        <ChartCard title="Demanda de Acción Municipal" subtitle="¿Consideran necesaria la participación del municipio?">
          <div className={styles.demandaWrap}>
            <ResponsiveSimpleBar data={demandaData} />
            <div className={styles.demandaMeta}>
              <div className={styles.demandaBig}>
                <span className={styles.demandaPct}>{data.demanda_accion.pct_demandan}%</span>
                <span className={styles.demandaLabel}>Exigen acción municipal</span>
              </div>
              <div className={styles.demandaSmall}>
                <span className={styles.demandaPctSmall}>{100 - data.demanda_accion.pct_demandan}%</span>
                <span className={styles.demandaLabelSmall}>Consideran que no es necesaria</span>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiCardIcon} style={{ backgroundColor: color + '12', color }}>
        {icon}
      </div>
      <div className={styles.kpiCardMeta}>
        <span className={styles.kpiCardLabel}>{label}</span>
        <span className={styles.kpiCardValue} style={{ color }}>{value}</span>
      </div>
    </div>
  );
}

function ResponsiveSimpleBar({ data }: { data: { name: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className={styles.simpleBarWrap}>
      {data.map((d) => (
        <div key={d.name} className={styles.simpleBarRow}>
          <div className={styles.simpleBarTrack}>
            <div
              className={styles.simpleBarFill}
              style={{ width: `${(d.value / max) * 100}%`, backgroundColor: d.color }}
            />
          </div>
          <div className={styles.simpleBarValue} style={{ color: d.color }}>
            {d.value}
          </div>
        </div>
      ))}
    </div>
  );
}
