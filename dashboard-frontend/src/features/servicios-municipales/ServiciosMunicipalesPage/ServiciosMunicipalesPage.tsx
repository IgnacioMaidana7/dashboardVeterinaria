import { useState, useEffect } from 'react';
import { Download, MoreVertical } from 'lucide-react';
import { StatCard, Card, PageHeader, Button } from '@/components/shared';
import styles from './ServiciosMunicipalesPage.module.css';

interface MunicipioData {
  cascade: {
    total_encuestados: number;
    castraron: number;
    conocen_castracion_gratis: number;
    usan_castracion_municipal: number;
    conocen_plan_vacunacion: number;
  };
  responsabilidad: { nivel: string; cantidad: number }[];
  tabla_barrios: {
    barrio: string;
    total: number;
    pct_castradas: number;
    pct_vacunadas: number;
    pct_conocen_gratis: number;
  }[];
}

export function ServiciosMunicipalesPage() {
  const [data, setData] = useState<MunicipioData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/stats/page-municipio')
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

  const { cascade } = data;
  const tEncuestados = cascade.total_encuestados || 1;
  const tCastraron = cascade.castraron || 1;

  const pctConocenCastracion = (cascade.conocen_castracion_gratis / tEncuestados) * 100;
  const pctUsanCastracion = (cascade.usan_castracion_municipal / tCastraron) * 100;
  const pctConocenVacunacion = (cascade.conocen_plan_vacunacion / tEncuestados) * 100;

  const brechaGeneral = pctConocenCastracion - pctUsanCastracion;

  return (
    <div className={styles.page}>
      <PageHeader title="Conocimiento y Acceso" />

      {/* KPI row */}
      <div className={styles.kpiRow}>
        <StatCard
          label="Conocen Castración Municipal"
          value={`${Math.round(pctConocenCastracion * 10) / 10}%`}
          badge={{ text: '↑ Alto', variant: 'success' }}
          progressBar={{ value: pctConocenCastracion, color: 'var(--color-navy-700)' }}
          id="stat-svc-conocen-castracion"
        />
        <StatCard
          label="Uso Castración Municipal"
          value={`${Math.round(pctUsanCastracion * 10) / 10}%`}
          badge={{ text: '△ Brecha', variant: 'warning' }}
          progressBar={{ value: pctUsanCastracion, color: 'var(--color-amber-500)' }}
          id="stat-svc-uso-castracion"
        />
        <StatCard
          label="Conocen Plan de Vacunación"
          value={`${Math.round(pctConocenVacunacion * 10) / 10}%`}
          progressBar={{ value: pctConocenVacunacion, color: 'var(--color-info)' }}
          id="stat-svc-conocen-vacunacion"
        />
      </div>

      {/* Charts row */}
      <div className={styles.chartsRow}>
        {/* Conocimiento vs Uso bar comparison */}
        <Card padding="md" className={styles.comparisonCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Conocimiento vs. Uso Real</h3>
            <button className={styles.menuBtn} aria-label="Opciones"><MoreVertical size={16} /></button>
          </div>
          <div className={styles.compBars}>
            <div className={styles.compBarGroup}>
              <div className={styles.compBarWrap}>
                <div className={styles.compBarFill} style={{ height: `${pctConocenCastracion}%`, background: 'var(--color-navy-700)' }} />
              </div>
              <div className={styles.compBarValue}>{Math.round(pctConocenCastracion * 10) / 10}%</div>
              <div className={styles.compBarLabel}>Conocimiento</div>
            </div>
            <div className={styles.compArrow}>
              <span className={styles.compDelta}>-{Math.round(brechaGeneral * 10) / 10}%</span>
              <span>→</span>
            </div>
            <div className={styles.compBarGroup}>
              <div className={styles.compBarWrap}>
                <div className={styles.compBarFill} style={{ height: `${pctUsanCastracion}%`, background: 'var(--color-amber-500)' }} />
              </div>
              <div className={styles.compBarValue} style={{ color: 'var(--color-amber-600)' }}>{Math.round(pctUsanCastracion * 10) / 10}%</div>
              <div className={styles.compBarLabel}>Uso Real</div>
            </div>
          </div>
        </Card>

        {/* Embudo de conversión */}
        <Card padding="md" className={styles.funnelCard}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Embudo de Conversión de Castración</h3>
            <button className={styles.menuBtn} aria-label="Opciones"><MoreVertical size={16} /></button>
          </div>
          <div className={styles.funnel}>
            {[
              { label: 'Total Encuestados', value: '100%', width: 100 },
              { label: 'Castraron a su mascota', value: `${Math.round((cascade.castraron / tEncuestados) * 100)}%`, width: Math.round((cascade.castraron / tEncuestados) * 100) },
              { label: 'Conocen Servicio', value: `${Math.round(pctConocenCastracion)}%`, width: Math.round(pctConocenCastracion) },
              { label: 'Usan Servicio', value: `${Math.round(pctUsanCastracion)}%`, width: Math.round(pctUsanCastracion), highlight: true },
            ].map((step) => (
              <div key={step.label} className={styles.funnelStep}>
                <div className={styles.funnelBar}>
                  <div
                    className={`${styles.funnelFill} ${step.highlight ? styles.funnelHighlight : ''}`}
                    style={{ width: `${step.width}%` }}
                  />
                </div>
                <div className={styles.funnelMeta}>
                  <span className={`${styles.funnelValue} ${step.highlight ? styles.funnelValueHighlight : ''}`}>
                    {step.value}
                  </span>
                  <span className={styles.funnelLabel}>{step.label}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Barrios table */}
      <Card padding="none">
        <div className={styles.tableHeader}>
          <h3 className={styles.tableTitle}>Comparativa por Barrio: Conocimiento vs. Uso</h3>
          <Button variant="outline" size="sm" icon={<Download size={14} />} id="btn-exportar-tabla-svc">
            Exportar
          </Button>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Barrio</th>
                <th>Conocimiento Castración</th>
                <th>Uso Castración Municipal</th>
                <th>Brecha (Conocimiento - Uso)</th>
                <th>Conocimiento Vacunación</th>
              </tr>
            </thead>
            <tbody>
              {data.tabla_barrios.map((row) => {
                const brecha = row.pct_conocen_gratis - row.pct_castradas; // Assuming pct_castradas acts as proxy for use
                const brechaHigh = brecha > 50;
                return (
                  <tr key={row.barrio}>
                    <td className={styles.barrioCell}>{row.barrio}</td>
                    <td>{Math.round(row.pct_conocen_gratis * 10) / 10}%</td>
                    <td>{Math.round(row.pct_castradas * 10) / 10}%</td>
                    <td className={brechaHigh ? styles.brechaHigh : styles.brechaMid}>
                      {Math.round(brecha * 10) / 10}%
                    </td>
                    <td>{Math.round(row.pct_vacunadas * 10) / 10}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
