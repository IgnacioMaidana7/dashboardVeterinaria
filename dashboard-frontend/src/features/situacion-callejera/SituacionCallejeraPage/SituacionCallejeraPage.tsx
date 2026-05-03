import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Download,
  Filter,
  ChevronDown,
  MapPin,
  Dog,
  Activity,
} from 'lucide-react';
import { StatCard, PageHeader, Button } from '@/components/shared';
import { HorizontalBarChart, GroupedBarChart } from '@/components/charts';
import styles from './SituacionCallejeraPage.module.css';

interface CallejerosCompletoData {
  total_respuestas: number;
  kpis: {
    pct_avistan: number;
    pct_todo_el_tiempo: number;
    pct_nunca: number;
    pct_animal_perros: number;
    pct_animal_gatos: number;
    barrio_mayor_avistamiento: string;
    pct_exigen_medidas_de_avistan: number;
  };
  frecuencia_avistamiento: { respuesta: string; cantidad: number; porcentaje: number }[];
  tipo_animal_reportado: { tipo: string; cantidad: number; porcentaje: number }[];
  frecuencia_por_barrio: {
    barrio: string;
    todo_el_tiempo: number;
    a_veces: number;
    nunca: number;
    raramente: number;
    total: number;
  }[];
  tipo_animal_por_barrio: {
    barrio: string;
    perros: number;
    gatos: number;
    ambos: number;
    total: number;
  }[];
  frecuencia_por_ciudad: {
    ciudad: string;
    todo_el_tiempo: number;
    a_veces: number;
    nunca: number;
    raramente: number;
    total: number;
  }[];
  frecuencia_por_tipo_vivienda: {
    tipo_vivienda: string;
    todo_el_tiempo: number;
    a_veces: number;
    nunca: number;
    raramente: number;
    total: number;
  }[];
  tipo_animal_por_tipo_vivienda: {
    tipo_vivienda: string;
    perros: number;
    gatos: number;
    ambos: number;
    total: number;
  }[];
  avistamiento_vs_medidas: {
    frecuencia: string;
    total: number;
    exigen_medidas: number;
    pct_exigen: number;
  }[];
  mapa_barrios: {
    barrio: string;
    total_respuestas: number;
    todo_el_tiempo: number;
    avistan: number;
    intensidad: number;
  }[];
  filtros_disponibles: {
    ciudades: string[];
    barrios: string[];
    tipos_vivienda: string[];
  };
}

const COLOR_TODO_TIEMPO = '#C0392B';
const COLOR_A_VECES = '#E8913A';
const COLOR_NUNCA = '#2D8659';
const COLOR_RARAMENTE = '#2980B9';

export function SituacionCallejeraPage() {
  const [data, setData] = useState<CallejerosCompletoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtros
  const [tipoAnimal, setTipoAnimal] = useState('');
  const [frecuencia, setFrecuencia] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [tipoVivienda, setTipoVivienda] = useState('');
  const [barrio, setBarrio] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Cargar datos cuando cambian los filtros
  useEffect(() => {
    setLoading(true);
    setErrorMsg(null);
    const params = new URLSearchParams();
    if (tipoAnimal) params.append('tipo_animal', tipoAnimal);
    if (frecuencia) params.append('frecuencia', frecuencia);
    if (ciudad) params.append('ciudad', ciudad);
    if (tipoVivienda) params.append('tipo_vivienda', tipoVivienda);
    if (barrio) params.append('barrio', barrio);

    const url = `http://localhost:5000/api/stats/callejeros-completa?${params.toString()}`;

    fetch(url)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok || json.error) {
          throw new Error(json.error || `Error ${r.status}`);
        }
        return json as CallejerosCompletoData;
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching data:', err);
        setErrorMsg(err.message || 'Error al cargar los datos');
        setLoading(false);
      });
  }, [tipoAnimal, frecuencia, ciudad, tipoVivienda, barrio, retryCount]);

  const handleFilterChange = (setter: (val: string) => void, val: string) => {
    setRefreshing(true);
    setter(val);
    setTimeout(() => setRefreshing(false), 600);
  };

  if (loading) return <div>Cargando...</div>;
  if (errorMsg) {
    return (
      <div className={styles.page}>
        <PageHeader title="Percepción de Animales en Situación de Calle" />
        <div className={styles.errorBox}>
          <AlertTriangle size={24} />
          <p>Error al cargar los datos: {errorMsg}</p>
          <button
            className={styles.retryBtn}
            onClick={() => {
              setRetryCount((c) => c + 1);
            }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }
  if (!data) return <div>Sin datos disponibles</div>;

  const { kpis, total_respuestas } = data;
  const pocosDatos = total_respuestas < 30;

  // ── Datos para gráficos ──

  // 1. Frecuencia de avistamiento (barras horizontales grandes)
  const frecuenciaChartData = data.frecuencia_avistamiento.map((f) => ({
    name: f.respuesta,
    value: f.porcentaje,
    pct: f.porcentaje,
    color:
      f.respuesta === 'Todo el tiempo'
        ? COLOR_TODO_TIEMPO
        : f.respuesta === 'A veces'
        ? COLOR_A_VECES
        : f.respuesta === 'Nunca'
        ? COLOR_NUNCA
        : COLOR_RARAMENTE,
  }));

  // 2. Tipo de animal callejero más reportado
  const tipoAnimalChartData = data.tipo_animal_reportado.map((t) => ({
    name: t.tipo,
    value: t.porcentaje,
    pct: t.porcentaje,
    color:
      t.tipo === 'Perros'
        ? '#1B3A4B'
        : t.tipo === 'Gatos'
        ? '#E8913A'
        : '#2D8659',
  }));

  // 3. Frecuencia por barrio (top 12)
  const frecuenciaPorBarrioData = data.frecuencia_por_barrio.map((b) => ({
    name: b.barrio,
    'Todo el tiempo': b.todo_el_tiempo,
    'A veces': b.a_veces,
    Nunca: b.nunca,
    Raramente: b.raramente,
  }));

  // 4. Tipo de animal por barrio (top 10)
  const tipoAnimalPorBarrioData = data.tipo_animal_por_barrio.map((b) => ({
    name: b.barrio,
    Perros: b.perros,
    Gatos: b.gatos,
    Ambos: b.ambos,
  }));

  // 5. Frecuencia por tipo de vivienda
  const frecuenciaPorTipoViviendaData = data.frecuencia_por_tipo_vivienda.map((v) => ({
    name: v.tipo_vivienda,
    'Todo el tiempo': v.todo_el_tiempo,
    'A veces': v.a_veces,
    Nunca: v.nunca,
    Raramente: v.raramente,
  }));

  // 6. Frecuencia por ciudad
  const frecuenciaPorCiudadData = data.frecuencia_por_ciudad.map((c) => ({
    name: c.ciudad,
    'Todo el tiempo': c.todo_el_tiempo,
    'A veces': c.a_veces,
    Nunca: c.nunca,
    Raramente: c.raramente,
  }));

  // 7. Tipo de animal por tipo de vivienda
  const tipoAnimalPorTipoViviendaData = data.tipo_animal_por_tipo_vivienda.map((v) => ({
    name: v.tipo_vivienda,
    Perros: v.perros,
    Gatos: v.gatos,
    Ambos: v.ambos,
  }));

  // 8. Relación avistamiento vs demanda de medidas
  const avistamientoVsMedidasData = data.avistamiento_vs_medidas.map((a) => ({
    name: a.frecuencia,
    'Exigen medidas': a.exigen_medidas,
    'No exigen': a.total - a.exigen_medidas,
  }));

  // Título dinámico según filtros
  const filtrosActivos = [
    tipoAnimal && `Animal: ${tipoAnimal}`,
    frecuencia && `Frecuencia: ${frecuencia}`,
    ciudad && `Ciudad: ${ciudad}`,
    tipoVivienda && `Vivienda: ${tipoVivienda}`,
    barrio && `Barrio: ${barrio}`,
  ].filter(Boolean);

  const tituloDinamico =
    filtrosActivos.length > 0
      ? `Situación Callejera — ${filtrosActivos.join(' · ')}`
      : 'Situación Callejera — Panorama General';

  return (
    <div className={styles.page}>
      <PageHeader
        title="Percepción de Animales en Situación de Calle"
        subtitle={tituloDinamico}
        actions={
          <Button variant="outline" size="sm" icon={<Download size={14} />} id="btn-exportar-pdf-calle">
            Exportar PDF
          </Button>
        }
      />

      {/* Contador de registros y advertencia */}
      <div className={styles.metaRow}>
        <span className={styles.recordCount}>N = {total_respuestas} registros</span>
        {pocosDatos && (
          <span className={styles.warningBadge}>
            <AlertTriangle size={12} />
            Pocos datos — interpretar con precaución
          </span>
        )}
      </div>

      {/* Filtros dinámicos */}
      <div className={styles.filterBar}>
        <div className={styles.filterLabel}>
          <Filter size={14} />
          <span>Filtrar por</span>
        </div>

        <div className={styles.selectWrap}>
          <select
            className={styles.select}
            value={tipoAnimal}
            onChange={(e) => handleFilterChange(setTipoAnimal, e.target.value)}
          >
            <option value="">Todos los animales</option>
            <option value="perros">Perros</option>
            <option value="gatos">Gatos</option>
            <option value="ambos">Ambos</option>
          </select>
          <ChevronDown size={14} className={styles.selectIcon} />
        </div>

        <div className={styles.selectWrap}>
          <select
            className={styles.select}
            value={frecuencia}
            onChange={(e) => handleFilterChange(setFrecuencia, e.target.value)}
          >
            <option value="">Todas las frecuencias</option>
            <option value="todo_el_tiempo">Todo el tiempo</option>
            <option value="a_veces">A veces</option>
            <option value="nunca">Nunca</option>
            <option value="raramente">Raramente</option>
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
            {data.filtros_disponibles.ciudades.map((c) => (
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
            value={tipoVivienda}
            onChange={(e) => handleFilterChange(setTipoVivienda, e.target.value)}
          >
            <option value="">Todos los tipos de vivienda</option>
            {data.filtros_disponibles.tipos_vivienda.map((v) => (
              <option key={v} value={v}>
                {v}
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
            {data.filtros_disponibles.barrios.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className={styles.selectIcon} />
        </div>
      </div>

      {/* Contenido con animación */}
      <div className={`${styles.chartsContainer} ${refreshing ? styles.refreshing : ''}`}>
        {/* KPIs */}
        <div className={styles.kpiRow}>
          <StatCard
            id="stat-calle-avistan"
            label="Ciudadanos que Avistan Animales Callejeros"
            value={`${kpis.pct_avistan}%`}
            icon={<Eye size={16} />}
            iconColor="danger"
            progressBar={{ value: kpis.pct_avistan, color: COLOR_TODO_TIEMPO }}
            badge={{ text: "Suma de 'Todo el tiempo' + 'A veces'", variant: 'neutral' }}
          />
          <StatCard
            id="stat-calle-predominante"
            label='Frecuencia Predominante: "Todo el tiempo"'
            value={`${kpis.pct_todo_el_tiempo}%`}
            icon={<AlertTriangle size={16} />}
            iconColor="warning"
            progressBar={{ value: kpis.pct_todo_el_tiempo, color: COLOR_A_VECES }}
            badge={{ text: 'Percepción de problema constante', variant: 'warning' }}
          />
          <StatCard
            id="stat-calle-animal"
            label="Animal Callejero Más Reportado: Perros"
            value={`${kpis.pct_animal_perros}%`}
            icon={<Dog size={16} />}
            iconColor="navy"
            progressBar={{ value: kpis.pct_animal_perros, color: '#1B3A4B' }}
            badge={{ text: 'Vs Gatos y mixtos', variant: 'info' }}
          />
          <StatCard
            id="stat-calle-nunca"
            label="Ciudadanos que NUNCA ven animales callejeros"
            value={`${kpis.pct_nunca}%`}
            icon={<EyeOff size={16} />}
            iconColor="success"
            progressBar={{ value: kpis.pct_nunca, color: COLOR_NUNCA }}
            badge={{ text: 'Contraste: zonas sin problema percibido', variant: 'success' }}
          />
          <StatCard
            id="stat-calle-barrio"
            label="Zona de Mayor Avistamiento (Barrio)"
            value={kpis.barrio_mayor_avistamiento}
            icon={<MapPin size={16} />}
            iconColor="info"
            badge={{ text: 'Identificar puntos críticos', variant: 'info' }}
          />
          <StatCard
            id="stat-calle-accion"
            label="Relación Problemática/Acción"
            value={`${kpis.pct_exigen_medidas_de_avistan}%`}
            icon={<Activity size={16} />}
            iconColor="amber"
            progressBar={{ value: kpis.pct_exigen_medidas_de_avistan, color: '#E8913A' }}
            badge={{ text: 'Correlación demanda-percepción', variant: 'neutral' }}
          />
        </div>

        {/* Charts row 1: Frecuencia general + Tipo animal */}
        <div className={styles.chartsRow}>
          <div className={styles.chartLarge}>
            <HorizontalBarChart
              title="Frecuencia de Avistamiento de Animales Callejeros"
              subtitle="Panorama general de percepción ciudadana"
              data={frecuenciaChartData}
              xAxisLabel="Porcentaje de respuestas (%)"
              valueFormatter={(value) => `${Number(value).toFixed(1)}%`}
            />
          </div>
          <HorizontalBarChart
            title="Tipo de Animal Callejero Más Reportado"
            subtitle="Distribución por especie reportada"
            data={tipoAnimalChartData}
            xAxisLabel="Porcentaje de reportes (%)"
            valueFormatter={(value) => `${Number(value).toFixed(1)}%`}
          />
        </div>

        {/* Full-width: Frecuencia por barrio */}
        <div className={styles.fullWidthChart}>
          <GroupedBarChart
            title="Frecuencia de Avistamiento por Barrio"
            subtitle="Top barrios con mayor intensidad de problema"
            data={frecuenciaPorBarrioData}
            bars={[
              { key: 'Todo el tiempo', name: 'Todo el tiempo', color: COLOR_TODO_TIEMPO },
              { key: 'A veces', name: 'A veces', color: COLOR_A_VECES },
              { key: 'Nunca', name: 'Nunca', color: COLOR_NUNCA },
              { key: 'Raramente', name: 'Raramente', color: COLOR_RARAMENTE },
            ]}
            xAxisKey="name"
            yAxisLabel="Número de respuestas"
            height={450}
            xAxisAngle={-45}
            legendPosition="top-right"
          />
        </div>

        {/* Full-width: Tipo animal por barrio */}
        <div className={styles.fullWidthChart}>
          <GroupedBarChart
            title="Tipo de Animal Callejero Reportado por Barrio"
            subtitle="Variación del tipo de animal según zona"
            data={tipoAnimalPorBarrioData}
            bars={[
              { key: 'Perros', name: 'Perros', color: '#1B3A4B' },
              { key: 'Gatos', name: 'Gatos', color: '#E8913A' },
              { key: 'Ambos', name: 'Ambos', color: '#2D8659' },
            ]}
            xAxisKey="name"
            yAxisLabel="Número de reportes"
            height={450}
            xAxisAngle={-45}
            legendPosition="top-right"
          />
        </div>

        {/* Charts row 3: Frecuencia por ciudad + Frecuencia por tipo vivienda */}
        <div className={styles.chartsRow}>
          <GroupedBarChart
            title="Frecuencia de Avistamiento por Ciudad"
            subtitle="Variación geográfica del problema"
            data={frecuenciaPorCiudadData}
            bars={[
              { key: 'Todo el tiempo', name: 'Todo el tiempo', color: COLOR_TODO_TIEMPO },
              { key: 'A veces', name: 'A veces', color: COLOR_A_VECES },
              { key: 'Nunca', name: 'Nunca', color: COLOR_NUNCA },
              { key: 'Raramente', name: 'Raramente', color: COLOR_RARAMENTE },
            ]}
            xAxisKey="name"
            yAxisLabel="Número de respuestas"
          />
          <GroupedBarChart
            title="Frecuencia de Avistamiento por Tipo de Vivienda"
            subtitle="Impacto según contexto habitacional"
            data={frecuenciaPorTipoViviendaData}
            bars={[
              { key: 'Todo el tiempo', name: 'Todo el tiempo', color: COLOR_TODO_TIEMPO },
              { key: 'A veces', name: 'A veces', color: COLOR_A_VECES },
              { key: 'Nunca', name: 'Nunca', color: COLOR_NUNCA },
              { key: 'Raramente', name: 'Raramente', color: COLOR_RARAMENTE },
            ]}
            xAxisKey="name"
            yAxisLabel="Número de respuestas"
          />
        </div>

        {/* Charts row 4: Tipo animal por vivienda + Relación avistamiento vs demanda */}
        <div className={styles.chartsRow}>
          <GroupedBarChart
            title="Tipo de Animal por Tipo de Vivienda"
            subtitle="Preferencia de especie según tipo de hogar"
            data={tipoAnimalPorTipoViviendaData}
            bars={[
              { key: 'Perros', name: 'Perros', color: '#1B3A4B' },
              { key: 'Gatos', name: 'Gatos', color: '#E8913A' },
              { key: 'Ambos', name: 'Ambos', color: '#2D8659' },
            ]}
            xAxisKey="name"
            yAxisLabel="Número de reportes"
          />
          <GroupedBarChart
            title="Relación: Avistamiento vs Demanda de Medidas"
            subtitle="Correlación entre percepción y exigencia de acción municipal"
            data={avistamientoVsMedidasData}
            bars={[
              { key: 'Exigen medidas', name: 'Exigen medidas', color: COLOR_TODO_TIEMPO },
              { key: 'No exigen', name: 'No exigen', color: '#ADB5BD' },
            ]}
            xAxisKey="name"
            yAxisLabel="Número de ciudadanos"
          />
        </div>
      </div>
    </div>
  );
}
