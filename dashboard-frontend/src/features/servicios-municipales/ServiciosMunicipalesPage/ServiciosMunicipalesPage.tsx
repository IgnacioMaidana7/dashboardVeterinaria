import { useState, useEffect } from 'react';
import { Filter, ChevronDown, Info, Building2, Stethoscope, TrendingDown, BookOpen, HeartPulse, Users, MapPin } from 'lucide-react';
import { StatCard, Card, PageHeader } from '@/components/shared';
import { HorizontalBarChart, GroupedBarChart } from '@/components/charts';
import styles from './ServiciosMunicipalesPage.module.css';

interface ServiciosMunicipalesData {
  kpis: {
    conocimiento_general_servicios: number;
    conocimiento_castracion_gratis: number;
    respuestas_castracion: number;
    conocimiento_plan_vacunacion: number;
    respuestas_vacunacion: number;
    accedieron_servicios_municipales: number;
    participacion_municipal_castraciones: number;
    participacion_municipal_count: number;
    participacion_municipal_total: number;
    solo_municipio: number;
    ambos_municipio_privado: number;
    brecha_conocimiento_acceso: number;
    satisfaccion_utilidad: number;
  };
  conocimiento_vs_acceso: {
    conocen_si: number;
    conocen_no: number;
    accedieron_si: number;
    accedieron_no: number;
  };
  conocimiento_vacunacion: {
    si: number;
    no: number;
  };
  conoce_castracion_por_tipo_mascota: { tipo: string; total: number; conoce_pct: number }[];
  lugar_castracion_por_tipo_mascota: { tipo: string; solo_municipio: number; solo_privado: number; ambos: number }[];
  conocimiento_por_ciudad: { ciudad: string; total: number; castracion_pct: number; vacunacion_pct: number }[];
  barrios_uso: { barrio: string; total: number; uso_pct: number }[];
  funnel: {
    conocen: number;
    conocen_y_accedieron: number;
    accedieron: number;
  };
}

interface FiltrosData {
  ciudades: string[];
  barrios: string[];
  tipos_vivienda: string[];
  tipos_mascota: string[];
}

const tipoMascotaLabels: Record<string, string> = {
  'Perros': 'Solo Perros',
  'Gatos': 'Solo Gatos',
  'Gatos | Perros': 'Mixto',
};

export function ServiciosMunicipalesPage() {
  const [data, setData] = useState<ServiciosMunicipalesData | null>(null);
  const [filtros, setFiltros] = useState<FiltrosData>({ ciudades: [], barrios: [], tipos_vivienda: [], tipos_mascota: [] });
  const [tipoMascota, setTipoMascota] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [barrio, setBarrio] = useState('');
  const [tipoVivienda, setTipoVivienda] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Cargar opciones de filtros una sola vez
  useEffect(() => {
    fetch('http://localhost:5000/api/stats/filtros')
      .then((r) => r.json())
      .then((json: FiltrosData) => {
        setFiltros(json);
      })
      .catch((err) => console.error('Error cargando filtros:', err));
  }, []);

  // Cargar datos cada vez que cambia un filtro
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (tipoMascota) params.append('tipo_mascota', tipoMascota);
    if (ciudad) params.append('ciudad', ciudad);
    if (barrio) params.append('barrio', barrio);
    if (tipoVivienda) params.append('tipo_vivienda', tipoVivienda);

    const url = `http://localhost:5000/api/stats/servicios-municipales?${params.toString()}`;

    fetch(url)
      .then((r) => r.json())
      .then((json: ServiciosMunicipalesData) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error cargando servicios municipales:', err);
        setLoading(false);
      });
  }, [tipoMascota, ciudad, barrio, tipoVivienda]);

  const handleFilterChange = (setter: (val: string) => void, val: string) => {
    setRefreshing(true);
    setter(val);
    setTimeout(() => setRefreshing(false), 600);
  };

  if (loading || !data) return <div>Cargando...</div>;

  const { kpis } = data;

  // ── Datos para gráficos ──
  const conocimientoVsAccesoData = [
    { name: 'Conocen Castración Gratis', si: data.conocimiento_vs_acceso.conocen_si, no: data.conocimiento_vs_acceso.conocen_no },
    { name: 'Accedieron a Castración Municipal', si: data.conocimiento_vs_acceso.accedieron_si, no: data.conocimiento_vs_acceso.accedieron_no },
  ];

  const conocimientoVacunacionData = [
    { name: 'Conocen Plan Vacunación', si: data.conocimiento_vacunacion.si, no: data.conocimiento_vacunacion.no },
  ];

  const conoceCastracionPorTipoData = data.conoce_castracion_por_tipo_mascota.map((d) => ({
    name: tipoMascotaLabels[d.tipo] || d.tipo,
    conoce: Number(d.conoce_pct.toFixed(1)),
    noConoce: Number((100 - d.conoce_pct).toFixed(1)),
  }));

  const lugarCastracionPorTipoData = data.lugar_castracion_por_tipo_mascota.map((d) => ({
    name: tipoMascotaLabels[d.tipo] || d.tipo,
    municipio: d.solo_municipio,
    privado: d.solo_privado,
    ambos: d.ambos,
  }));

  const conocimientoPorCiudadData = data.conocimiento_por_ciudad.map((d) => ({
    name: d.ciudad,
    castracion: Number(d.castracion_pct.toFixed(1)),
    vacunacion: Number(d.vacunacion_pct.toFixed(1)),
  }));

  const barriosUsoData = data.barrios_uso.map((d) => ({
    name: d.barrio,
    value: Number(d.uso_pct.toFixed(1)),
    pct: Number(d.uso_pct.toFixed(1)),
  }));

  // Colores gradiente para barrios (verde claro a verde oscuro)
  const barrioColors = ['#a8e6cf', '#7fd8b8', '#56caa1', '#2dbc8a', '#1e9e74', '#188a64', '#137654', '#0d6244', '#084e34', '#033a24', '#022e1c', '#012216'];

  const funnelSteps = [
    {
      label: 'Conocen Castración Gratuita',
      value: data.funnel.conocen,
      pct: 100,
      color: '#1B3A4B',
    },
    {
      label: 'De los que conocen, accedieron',
      value: data.funnel.conocen_y_accedieron,
      pct: data.funnel.conocen > 0 ? (data.funnel.conocen_y_accedieron / data.funnel.conocen) * 100 : 0,
      color: '#234A5E',
    },
    {
      label: 'Total que accedieron al servicio',
      value: data.funnel.accedieron,
      pct: data.funnel.conocen > 0 ? (data.funnel.accedieron / data.funnel.conocen) * 100 : 0,
      color: '#2D8659',
    },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        title="Servicios Municipales"
        subtitle="Conocimiento, acceso y uso de servicios públicos veterinarios."
      />

      {/* Filtros */}
      <div className={styles.filterBar}>
        <div className={styles.filterLabel}>
          <Filter size={14} />
          <span>Filtrar por</span>
        </div>

        <div className={styles.selectWrap}>
          <select
            className={styles.select}
            value={tipoMascota}
            onChange={(e) => handleFilterChange(setTipoMascota, e.target.value)}
          >
            <option value="">Todos los tipos de mascota</option>
            {filtros.tipos_mascota.map((t) => (
              <option key={t} value={t}>
                {tipoMascotaLabels[t] || t}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className={styles.selectIcon} />
        </div>

        <div className={styles.selectWrap}>
          <select
            className={styles.select}
            value={ciudad}
            onChange={(e) => handleFilterChange(setCiudad, e.target.value)}
          >
            <option value="">Todas las ciudades</option>
            {filtros.ciudades.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className={styles.selectIcon} />
        </div>

        <div className={styles.selectWrap}>
          <select
            className={styles.select}
            value={barrio}
            onChange={(e) => handleFilterChange(setBarrio, e.target.value)}
          >
            <option value="">Todos los barrios</option>
            {filtros.barrios.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className={styles.selectIcon} />
        </div>

        <div className={styles.selectWrap}>
          <select
            className={styles.select}
            value={tipoVivienda}
            onChange={(e) => handleFilterChange(setTipoVivienda, e.target.value)}
          >
            <option value="">Todos los tipos de vivienda</option>
            {filtros.tipos_vivienda.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className={styles.selectIcon} />
        </div>
      </div>

      {/* Contenido con animación */}
      <div className={`${styles.chartsContainer} ${refreshing ? styles.refreshing : ''}`}>
        {/* KPI row: 7 KPIs */}
        <div className={styles.kpiRow}>
          <StatCard
            label="Conocimiento General de Servicios Municipales"
            value={`${Math.round(kpis.conocimiento_general_servicios * 10) / 10}%`}
            icon={<Info size={16} />}
            iconColor="info"
            progressBar={{ value: kpis.conocimiento_general_servicios, color: 'var(--color-info)' }}
            id="stat-svc-conocimiento-general"
          />
          <StatCard
            label="Tasa de Conocimiento de Castración Gratuita"
            value={`${Math.round(kpis.conocimiento_castracion_gratis * 10) / 10}%`}
            trend={{ value: `Aprox. ${kpis.respuestas_castracion} respuestas`, direction: 'neutral' }}
            icon={<HeartPulse size={16} />}
            iconColor="danger"
            progressBar={{ value: kpis.conocimiento_castracion_gratis, color: 'var(--color-danger)' }}
            id="stat-svc-conocimiento-castracion"
          />
          <StatCard
            label="Tasa de Conocimiento de Plan de Vacunación"
            value={`${Math.round(kpis.conocimiento_plan_vacunacion * 10) / 10}%`}
            trend={{ value: `Aprox. ${kpis.respuestas_vacunacion} respuestas`, direction: 'neutral' }}
            icon={<BookOpen size={16} />}
            iconColor="amber"
            progressBar={{ value: kpis.conocimiento_plan_vacunacion, color: 'var(--color-amber-500)' }}
            id="stat-svc-conocimiento-vacunacion"
          />
          <StatCard
            label="Ciudadanos que Accedieron a Servicios Municipales"
            value={`${Math.round(kpis.accedieron_servicios_municipales * 10) / 10}%`}
            icon={<Building2 size={16} />}
            iconColor="navy"
            progressBar={{ value: kpis.accedieron_servicios_municipales, color: 'var(--color-navy-700)' }}
            id="stat-svc-acceso-municipal"
          />
          <StatCard
            label="Participación Municipal en Castraciones"
            value={`${Math.round(kpis.participacion_municipal_castraciones * 10) / 10}%`}
            trend={{ value: `${kpis.solo_municipio} solo municipio + ${kpis.ambos_municipio_privado} combinado`, direction: 'neutral' }}
            icon={<Users size={16} />}
            iconColor="success"
            progressBar={{ value: kpis.participacion_municipal_castraciones, color: 'var(--color-success)' }}
            id="stat-svc-participacion-municipal"
          />
          <StatCard
            label="Brecha Conocimiento-Acceso"
            value={`${Math.round(kpis.brecha_conocimiento_acceso * 10) / 10} pp`}
            icon={<TrendingDown size={16} />}
            iconColor="warning"
            badge={{ text: 'Δ Brecha', variant: 'warning' }}
            id="stat-svc-brecha"
          />
          <StatCard
            label="Satisfacción / Utilidad Percibida"
            value={`${Math.round(kpis.satisfaccion_utilidad * 10) / 10}%`}
            icon={<Stethoscope size={16} />}
            iconColor="teal"
            progressBar={{ value: kpis.satisfaccion_utilidad, color: 'var(--color-teal)' }}
            id="stat-svc-satisfaccion"
          />
        </div>

        {/* Charts row 1: Conocimiento vs Acceso + Conocimiento Vacunación */}
        <div className={styles.chartsRow}>
          <GroupedBarChart
            title="Comparativa: Conocimiento vs Acceso a Castración Gratuita"
            subtitle="Diferencia entre quiénes conocen el servicio y quiénes lo usaron"
            data={conocimientoVsAccesoData}
            bars={[
              { key: 'si', name: 'Sí', color: '#2D8659' },
              { key: 'no', name: 'No', color: '#C0392B' },
            ]}
            xAxisKey="name"
            yAxisLabel="Número de hogares"
          />
          <GroupedBarChart
            title="Conocimiento de Plan de Vacunación Municipal"
            subtitle="Programa municipal de vacunación"
            data={conocimientoVacunacionData}
            bars={[
              { key: 'si', name: 'Conoce', color: '#2980B9' },
              { key: 'no', name: 'No conoce', color: '#6C757D' },
            ]}
            xAxisKey="name"
            yAxisLabel="Número de hogares"
          />
        </div>

        {/* Charts row 2: Conocimiento por tipo mascota + Lugar castración por tipo mascota */}
        <div className={styles.chartsRow}>
          <GroupedBarChart
            title="Conocimiento de Castración Gratuita por Tipo de Mascota"
            subtitle="¿Hay grupos menos informados según mascota?"
            data={conoceCastracionPorTipoData}
            bars={[
              { key: 'conoce', name: 'Conoce (%)', color: '#1B3A4B' },
              { key: 'noConoce', name: 'No conoce (%)', color: '#E8913A' },
            ]}
            xAxisKey="name"
            yAxisLabel="Porcentaje"
          />
          <GroupedBarChart
            title="Lugar de Castración por Tipo de Mascota"
            subtitle="Sector público vs privado según especie"
            data={lugarCastracionPorTipoData}
            bars={[
              { key: 'municipio', name: 'Solo Municipio', color: '#1B3A4B' },
              { key: 'privado', name: 'Solo Privado', color: '#E8913A' },
              { key: 'ambos', name: 'Ambos', color: '#2D8659' },
            ]}
            xAxisKey="name"
            yAxisLabel="Número de castraciones"
          />
        </div>

        {/* Charts row 3: Conocimiento por ciudad + Barrios uso */}
        <div className={styles.chartsRow}>
          <GroupedBarChart
            title="Conocimiento de Servicios por Ciudad"
            subtitle="Variación geográfica en comunicación municipal"
            data={conocimientoPorCiudadData}
            bars={[
              { key: 'castracion', name: 'Castración Gratuita (%)', color: '#1B3A4B' },
              { key: 'vacunacion', name: 'Plan Vacunación (%)', color: '#2980B9' },
            ]}
            xAxisKey="name"
            yAxisLabel="Porcentaje de conocimiento"
          />
          <HorizontalBarChart
            title="Barrios con Mayor Uso de Servicios Municipales"
            subtitle="Geografía del uso de servicios (top barrios)"
            data={barriosUsoData.map((d, i) => ({
              ...d,
              color: barrioColors[Math.min(i, barrioColors.length - 1)],
            }))}
            xAxisLabel="% de hogares que accedió a servicios municipales"
            valueFormatter={(value) => `${value}%`}
          />
        </div>

        {/* Funnel: Conocimiento → Acceso → Utilización */}
        <div className={styles.chartsRow}>
          <Card padding="md" className={styles.funnelCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Funnel: Conocimiento → Acceso → Utilización</h3>
            </div>
            <div className={styles.funnel}>
              {funnelSteps.map((step, index) => {
                const width = Math.max(step.pct, 8);
                return (
                  <div key={step.label} className={styles.funnelStep}>
                    <div className={styles.funnelBarTrack}>
                      <div
                        className={styles.funnelBarFill}
                        style={{ width: `${width}%`, backgroundColor: step.color }}
                      />
                    </div>
                    <div className={styles.funnelMeta}>
                      <span className={styles.funnelValue}>
                        {step.value} ({Math.round(step.pct * 10) / 10}%)
                      </span>
                      <span className={styles.funnelLabel}>{step.label}</span>
                    </div>
                    {index < funnelSteps.length - 1 && (
                      <div className={styles.funnelArrow}>
                        <span className={styles.funnelLoss}>
                          -{Math.round((funnelSteps[index].pct - funnelSteps[index + 1].pct) * 10) / 10}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Tarjeta de insight */}
          <Card padding="md" className={styles.insightCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Insights Clave</h3>
            </div>
            <div className={styles.insightsList}>
              <div className={styles.insightItem}>
                <div className={styles.insightIcon} style={{ background: 'var(--color-navy-700)' }}>
                  <Info size={16} color="#fff" />
                </div>
                <div>
                  <div className={styles.insightLabel}>Conocimiento General</div>
                  <div className={styles.insightValue}>
                    {Math.round(kpis.conocimiento_general_servicios * 10) / 10}% de los encuestados conoce al menos un servicio municipal
                  </div>
                </div>
              </div>
              <div className={styles.insightItem}>
                <div className={styles.insightIcon} style={{ background: 'var(--color-danger)' }}>
                  <TrendingDown size={16} color="#fff" />
                </div>
                <div>
                  <div className={styles.insightLabel}>Brecha Principal</div>
                  <div className={styles.insightValue}>
                    La brecha entre conocimiento y acceso es de {Math.round(kpis.brecha_conocimiento_acceso * 10) / 10} puntos porcentuales
                  </div>
                </div>
              </div>
              <div className={styles.insightItem}>
                <div className={styles.insightIcon} style={{ background: 'var(--color-success)' }}>
                  <Building2 size={16} color="#fff" />
                </div>
                <div>
                  <div className={styles.insightLabel}>Participación Municipal</div>
                  <div className={styles.insightValue}>
                    {kpis.solo_municipio} castraciones solo municipal + {kpis.ambos_municipio_privado} combinado con privado
                  </div>
                </div>
              </div>
              <div className={styles.insightItem}>
                <div className={styles.insightIcon} style={{ background: 'var(--color-amber-500)' }}>
                  <MapPin size={16} color="#fff" />
                </div>
                <div>
                  <div className={styles.insightLabel}>Variación Geográfica</div>
                  <div className={styles.insightValue}>
                    {data.conocimiento_por_ciudad.length} ciudades analizadas con diferentes niveles de conocimiento
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
