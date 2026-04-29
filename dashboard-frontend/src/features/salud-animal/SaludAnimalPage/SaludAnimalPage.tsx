import { useState, useEffect } from 'react';
import { Scissors, Syringe, Shield, BookOpen, HeartPulse, Building2, Stethoscope, Filter, ChevronDown } from 'lucide-react';
import { StatCard, PageHeader } from '@/components/shared';
import { GroupedBarChart } from '@/components/charts';
import styles from './SaludAnimalPage.module.css';

interface SaludCompletaData {
  kpis: {
    tasa_vacunacion: number;
    tasa_castracion: number;
    tasa_desparasitacion: number;
    conocimiento_plan_vacunacion: number;
    conocimiento_castracion_gratis: number;
    participacion_municipal_castraciones: number;
    participacion_privado_castraciones: number;
  };
  vacunacion_vs_castracion: {
    vacunacion_si: number;
    vacunacion_no: number;
    castracion_si: number;
    castracion_no: number;
  };
  vacunacion_por_tipo_mascota: { tipo: string; si: number; no: number }[];
  castracion_por_tipo_mascota: { tipo: string; si: number; no: number }[];
  lugar_castracion_por_tipo_mascota: { tipo: string; municipio: number; privado: number; ambos: number }[];
  vacunacion_por_tipo_vivienda: { tipo: string; si: number; no: number }[];
  castracion_por_tipo_vivienda: { tipo: string; si: number; no: number }[];
}

interface FiltrosData {
  ciudades: string[];
  barrios: string[];
  tipos_vivienda: string[];
  tipos_mascota: string[];
}

export function SaludAnimalPage() {
  const [data, setData] = useState<SaludCompletaData | null>(null);
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

    const url = `http://localhost:5000/api/stats/salud-completa?${params.toString()}`;

    fetch(url)
      .then((r) => r.json())
      .then((json: SaludCompletaData) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error cargando salud:', err);
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
  const vacunacionVsCastracionData = [
    { name: 'Vacunación', si: data.vacunacion_vs_castracion.vacunacion_si, no: data.vacunacion_vs_castracion.vacunacion_no },
    { name: 'Castración', si: data.vacunacion_vs_castracion.castracion_si, no: data.vacunacion_vs_castracion.castracion_no },
  ];

  const tipoMascotaLabels: Record<string, string> = {
    'Perros': 'Solo Perros',
    'Gatos': 'Solo Gatos',
    'Gatos | Perros': 'Mixto',
  };

  const vacunacionPorTipoMascotaData = data.vacunacion_por_tipo_mascota.map((d) => ({
    name: tipoMascotaLabels[d.tipo] || d.tipo,
    si: d.si,
    no: d.no,
  }));

  const castracionPorTipoMascotaData = data.castracion_por_tipo_mascota.map((d) => ({
    name: tipoMascotaLabels[d.tipo] || d.tipo,
    si: d.si,
    no: d.no,
  }));

  const lugarCastracionPorTipoMascotaData = data.lugar_castracion_por_tipo_mascota.map((d) => ({
    name: tipoMascotaLabels[d.tipo] || d.tipo,
    municipio: d.municipio,
    privado: d.privado,
    ambos: d.ambos,
  }));

  const vacunacionPorTipoViviendaData = data.vacunacion_por_tipo_vivienda.map((d) => ({
    name: d.tipo,
    si: d.si,
    no: d.no,
  }));

  const castracionPorTipoViviendaData = data.castracion_por_tipo_vivienda.map((d) => ({
    name: d.tipo,
    si: d.si,
    no: d.no,
  }));

  return (
    <div className={styles.page}>
      <PageHeader
        title="Salud Animal (Tenencia Responsable)"
        subtitle="Detalle del estado de salud de las mascotas y conocimiento de sus dueños."
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
            label="Tasa de Vacunación"
            value={`${Math.round(kpis.tasa_vacunacion * 10) / 10}%`}
            icon={<Syringe size={16} />}
            iconColor="amber"
            progressBar={{ value: kpis.tasa_vacunacion, color: 'var(--color-amber-500)' }}
            id="stat-salud-vacunacion"
          />
          <StatCard
            label="Tasa de Castración"
            value={`${Math.round(kpis.tasa_castracion * 10) / 10}%`}
            icon={<Scissors size={16} />}
            iconColor="navy"
            progressBar={{ value: kpis.tasa_castracion, color: 'var(--color-navy-700)' }}
            id="stat-salud-castracion"
          />
          <StatCard
            label="Tasa de Desparasitación"
            value={`${Math.round(kpis.tasa_desparasitacion * 10) / 10}%`}
            icon={<Shield size={16} />}
            iconColor="success"
            progressBar={{ value: kpis.tasa_desparasitacion, color: 'var(--color-success)' }}
            id="stat-salud-desparasitacion"
          />
          <StatCard
            label="Conocimiento Plan Vacunación"
            value={`${Math.round(kpis.conocimiento_plan_vacunacion * 10) / 10}%`}
            icon={<BookOpen size={16} />}
            iconColor="info"
            progressBar={{ value: kpis.conocimiento_plan_vacunacion, color: 'var(--color-info)' }}
            id="stat-salud-conocimiento-plan"
          />
          <StatCard
            label="Conocimiento Castración Gratis"
            value={`${Math.round(kpis.conocimiento_castracion_gratis * 10) / 10}%`}
            icon={<HeartPulse size={16} />}
            iconColor="teal"
            progressBar={{ value: kpis.conocimiento_castracion_gratis, color: 'var(--color-teal)' }}
            id="stat-salud-conocimiento-gratis"
          />
          <StatCard
            label="Participación Municipal"
            value={`${Math.round(kpis.participacion_municipal_castraciones * 10) / 10}%`}
            icon={<Building2 size={16} />}
            iconColor="warning"
            progressBar={{ value: kpis.participacion_municipal_castraciones, color: 'var(--color-amber-600)' }}
            id="stat-salud-part-municipal"
          />
          <StatCard
            label="Participación Sector Privado"
            value={`${Math.round(kpis.participacion_privado_castraciones * 10) / 10}%`}
            icon={<Stethoscope size={16} />}
            iconColor="danger"
            progressBar={{ value: kpis.participacion_privado_castraciones, color: 'var(--color-danger)' }}
            id="stat-salud-part-privado"
          />
        </div>

        {/* Charts row 1: Vacunación vs Castración + Vacunación por tipo mascota */}
        <div className={styles.chartsRow}>
          <GroupedBarChart
            title="Vacunación vs Castración"
            subtitle="Comparativa general de adopción de medidas sanitarias (conteos absolutos)"
            data={vacunacionVsCastracionData}
            bars={[
              { key: 'si', name: 'Sí (Cumple)', color: '#2D8659' },
              { key: 'no', name: 'No (No cumple)', color: '#C0392B' },
            ]}
            xAxisKey="name"
            yAxisLabel="Número de hogares"
          />
          <GroupedBarChart
            title="Vacunación por Tipo de Mascota"
            subtitle="Distribución de mascotas vacunadas según tipo de tenencia"
            data={vacunacionPorTipoMascotaData}
            bars={[
              { key: 'si', name: 'Vacunadas', color: '#2D8659' },
              { key: 'no', name: 'No vacunadas', color: '#C0392B' },
            ]}
            xAxisKey="name"
            yAxisLabel="Número de mascotas"
          />
        </div>

        {/* Charts row 2: Castración por tipo mascota + Lugar castración por tipo mascota */}
        <div className={styles.chartsRow}>
          <GroupedBarChart
            title="Castración por Tipo de Mascota"
            subtitle="Distribución de mascotas castradas según tipo de tenencia"
            data={castracionPorTipoMascotaData}
            bars={[
              { key: 'si', name: 'Castradas', color: '#1B3A4B' },
              { key: 'no', name: 'No castradas', color: '#E8913A' },
            ]}
            xAxisKey="name"
            yAxisLabel="Número de mascotas"
          />
          <GroupedBarChart
            title="Lugar de Castración por Tipo de Mascota"
            subtitle="Participación municipal vs. sector privado según tipo de mascota"
            data={lugarCastracionPorTipoMascotaData}
            bars={[
              { key: 'municipio', name: 'Solo Municipal', color: '#1B3A4B' },
              { key: 'privado', name: 'Solo Privado', color: '#E8913A' },
              { key: 'ambos', name: 'Ambos', color: '#2D8659' },
            ]}
            xAxisKey="name"
            yAxisLabel="Número de castraciones"
          />
        </div>

        {/* Charts row 3: Vacunación por tipo vivienda + Castración por tipo vivienda */}
        <div className={styles.chartsRow}>
          <GroupedBarChart
            title="Vacunación por Tipo de Vivienda"
            subtitle="Distribución de mascotas vacunadas según tipo de vivienda del hogar"
            data={vacunacionPorTipoViviendaData}
            bars={[
              { key: 'si', name: 'Vacunadas', color: '#2D8659' },
              { key: 'no', name: 'No vacunadas', color: '#C0392B' },
            ]}
            xAxisKey="name"
            yAxisLabel="Número de mascotas"
          />
          <GroupedBarChart
            title="Castración por Tipo de Vivienda"
            subtitle="Distribución de mascotas castradas según tipo de vivienda del hogar"
            data={castracionPorTipoViviendaData}
            bars={[
              { key: 'si', name: 'Castradas', color: '#1B3A4B' },
              { key: 'no', name: 'No castradas', color: '#E8913A' },
            ]}
            xAxisKey="name"
            yAxisLabel="Número de mascotas"
          />
        </div>
      </div>
    </div>
  );
}
