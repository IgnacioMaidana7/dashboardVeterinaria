const express = require('express');
const router = express.Router();
const db = require('../../db/database');

// ─────────────────────────────────────────────
// GET /medidas-municipio
// Medidas que la comunidad exige al municipio
// ─────────────────────────────────────────────
router.get('/medidas-municipio', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT 
        SUM(medida_castraciones) as castraciones,
        SUM(medida_identificacion) as identificacion,
        SUM(medida_educacion) as educacion,
        SUM(medida_no_necesaria) as no_necesaria,
        COUNT(*) as total
      FROM registros
    `).get();

    const autopercepcion = db.prepare(`
      SELECT 
        autopercepcion_responsabilidad as nivel,
        COUNT(*) as total
      FROM registros
      WHERE autopercepcion_responsabilidad IS NOT NULL
      GROUP BY autopercepcion_responsabilidad
      ORDER BY total DESC
    `).all();

    res.json({
      medidas: [
        { medida: 'Castraciones masivas', total: rows.castraciones },
        { medida: 'Control de identificación', total: rows.identificacion },
        { medida: 'Educación', total: rows.educacion },
        { medida: 'No es necesaria participación', total: rows.no_necesaria },
      ],
      autopercepcion_responsabilidad: autopercepcion,
      total_encuestados: rows.total,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PÁGINA 4: SERVICIOS MUNICIPALES (legacy)
router.get('/page-municipio', (req, res) => {
  try {
    const cascade = db.prepare(`
      SELECT 
        COUNT(*) as total_encuestados,
        SUM(CASE WHEN mascota_castrada = 'Si' THEN 1 ELSE 0 END) as castraron,
        SUM(CASE WHEN conoce_castracion_gratis = 'Si' THEN 1 ELSE 0 END) as conocen_castracion_gratis,
        SUM(CASE WHEN lugar_castracion_municipio = 1 THEN 1 ELSE 0 END) as usan_castracion_municipal,
        SUM(CASE WHEN conoce_plan_vacunacion = 'Si' THEN 1 ELSE 0 END) as conocen_plan_vacunacion
      FROM registros
    `).get();

    const responsabilidad = db.prepare(`
      SELECT 
        autopercepcion_responsabilidad as nivel,
        COUNT(*) as cantidad
      FROM registros
      WHERE autopercepcion_responsabilidad IS NOT NULL AND autopercepcion_responsabilidad != ''
      GROUP BY autopercepcion_responsabilidad
    `).all();

    const tabla_barrios = db.prepare(`
      SELECT 
        barrio_estandarizado as barrio,
        COUNT(*) as total,
        SUM(CASE WHEN mascota_castrada = 'Si' THEN 1 ELSE 0 END) as castradas,
        SUM(CASE WHEN mascotas_vacunadas = 'Si' THEN 1 ELSE 0 END) as vacunadas,
        SUM(CASE WHEN conoce_castracion_gratis = 'Si' THEN 1 ELSE 0 END) as conocen_gratis
      FROM registros
      WHERE barrio_estandarizado IS NOT NULL
      GROUP BY barrio_estandarizado
      ORDER BY total DESC
    `).all();

    res.json({
      cascade,
      responsabilidad,
      tabla_barrios: tabla_barrios.map(b => ({
        barrio: b.barrio,
        total: b.total,
        pct_castradas: b.total > 0 ? (b.castradas / b.total) * 100 : 0,
        pct_vacunadas: b.total > 0 ? (b.vacunadas / b.total) * 100 : 0,
        pct_conocen_gratis: b.total > 0 ? (b.conocen_gratis / b.total) * 100 : 0,
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /combinaciones-medidas
// Combinaciones de medidas exigidas al municipio
// ─────────────────────────────────────────────
router.get('/combinaciones-medidas', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT 
        medida_castraciones,
        medida_identificacion,
        medida_educacion,
        medida_no_necesaria,
        COUNT(*) as cantidad
      FROM registros
      GROUP BY medida_castraciones, medida_identificacion, medida_educacion, medida_no_necesaria
      ORDER BY cantidad DESC
    `).all();

    const combinaciones = rows.map((r) => {
      const partes = [];
      if (r.medida_castraciones) partes.push('Castraciones');
      if (r.medida_identificacion) partes.push('Identificación');
      if (r.medida_educacion) partes.push('Educación');
      if (r.medida_no_necesaria) partes.push('No necesaria');

      const nombre =
        partes.length === 0
          ? 'Ninguna medida'
          : partes.length === 1
          ? partes[0]
          : partes.length === 4
          ? 'Todas las medidas'
          : partes.join(' + ');

      return {
        nombre,
        cantidad: r.cantidad,
        castraciones: r.medida_castraciones,
        identificacion: r.medida_identificacion,
        educacion: r.medida_educacion,
        no_necesaria: r.medida_no_necesaria,
      };
    });

    res.json(combinaciones);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /servicios-municipales
// Dashboard completo de Servicios Municipales con filtros
// Query params: tipo_mascota, ciudad, barrio, tipo_vivienda
// ─────────────────────────────────────────────
router.get('/servicios-municipales', (req, res) => {
  try {
    const tipoMascota = req.query.tipo_mascota || null;
    const ciudad = req.query.ciudad || null;
    const barrio = req.query.barrio || null;
    const tipoVivienda = req.query.tipo_vivienda || null;

    let where = 'WHERE 1=1';
    const params = [];

    if (tipoMascota) { where += ' AND tipo_mascota = ?'; params.push(tipoMascota); }
    if (ciudad) { where += ' AND ciudad = ?'; params.push(ciudad); }
    if (barrio) { where += ' AND barrio_estandarizado = ?'; params.push(barrio); }
    if (tipoVivienda) { where += ' AND tipo_vivienda = ?'; params.push(tipoVivienda); }

    // ── KPIs generales ──
    const kpis = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN conoce_castracion_gratis = 'Si' OR conoce_plan_vacunacion = 'Si' THEN 1 ELSE 0 END) as conocen_algun_servicio,
        SUM(CASE WHEN conoce_castracion_gratis = 'Si' THEN 1 ELSE 0 END) as conoce_castracion_si,
        SUM(CASE WHEN conoce_castracion_gratis = 'No' THEN 1 ELSE 0 END) as conoce_castracion_no,
        SUM(CASE WHEN conoce_plan_vacunacion = 'Si' THEN 1 ELSE 0 END) as conoce_plan_si,
        SUM(CASE WHEN conoce_plan_vacunacion = 'No' THEN 1 ELSE 0 END) as conoce_plan_no,
        SUM(CASE WHEN lugar_castracion_municipio = 1 THEN 1 ELSE 0 END) as accedieron_municipio,
        SUM(CASE WHEN mascota_castrada = 'Si' THEN 1 ELSE 0 END) as total_castrados,
        SUM(CASE WHEN lugar_castracion_municipio = 1 AND lugar_castracion_particular = 0 THEN 1 ELSE 0 END) as solo_municipio,
        SUM(CASE WHEN lugar_castracion_municipio = 1 AND lugar_castracion_particular = 1 THEN 1 ELSE 0 END) as ambos_municipio_privado,
        SUM(CASE WHEN lugar_castracion_particular = 1 AND lugar_castracion_municipio = 0 THEN 1 ELSE 0 END) as solo_privado
      FROM registros
      ${where}
    `).get(...params);

    const total = kpis.total || 1;
    const totalCastrados = kpis.total_castrados || 1;

    // ── Conocimiento vs Acceso a Castración ──
    const conocimientoAccesoCastracion = db.prepare(`
      SELECT
        SUM(CASE WHEN conoce_castracion_gratis = 'Si' THEN 1 ELSE 0 END) as conocen_si,
        SUM(CASE WHEN conoce_castracion_gratis = 'No' THEN 1 ELSE 0 END) as conocen_no,
        SUM(CASE WHEN lugar_castracion_municipio = 1 THEN 1 ELSE 0 END) as accedieron_si,
        SUM(CASE WHEN lugar_castracion_municipio = 0 THEN 1 ELSE 0 END) as accedieron_no
      FROM registros
      ${where}
    `).get(...params);

    // ── Conocimiento de Plan de Vacunación ──
    const conocimientoVacunacion = db.prepare(`
      SELECT
        SUM(CASE WHEN conoce_plan_vacunacion = 'Si' THEN 1 ELSE 0 END) as si,
        SUM(CASE WHEN conoce_plan_vacunacion = 'No' THEN 1 ELSE 0 END) as no
      FROM registros
      ${where}
    `).get(...params);

    // ── Conocimiento de Castración Gratuita por Tipo de Mascota ──
    const conoceCastracionPorTipoMascota = db.prepare(`
      SELECT
        tipo_mascota as tipo,
        COUNT(*) as total,
        SUM(CASE WHEN conoce_castracion_gratis = 'Si' THEN 1 ELSE 0 END) as conoce_si
      FROM registros
      ${where}
      AND tipo_mascota IS NOT NULL
      GROUP BY tipo_mascota
    `).all(...params);

    // ── Lugar de Castración por Tipo de Mascota ──
    const lugarCastracionPorTipoMascota = db.prepare(`
      SELECT
        CASE
          WHEN mascota_castrada = 'No' THEN 'No se encuentra castrada'
          WHEN lugar_castracion_municipio = 1 AND lugar_castracion_particular = 0 THEN 'Municipio'
          WHEN lugar_castracion_particular = 1 AND lugar_castracion_municipio = 0 THEN 'En forma particular'
          WHEN lugar_castracion_municipio = 1 AND lugar_castracion_particular = 1 THEN 'En forma particular | Municipio'
          WHEN mascota_castrada = 'Si' AND lugar_castracion_municipio = 0 AND lugar_castracion_particular = 0 THEN 'Otro'
          ELSE 'No se encuentra castrada'
        END as lugar,
        tipo_mascota,
        COUNT(*) as cantidad
      FROM registros
      ${where}
      GROUP BY lugar, tipo_mascota
    `).all(...params);

    const lugarCastracionPivot = lugarCastracionPorTipoMascota.reduce((acc, curr) => {
      const { lugar, tipo_mascota, cantidad } = curr;
      if (!acc[lugar]) {
        acc[lugar] = {
          name: lugar,
          Perros: 0,
          Gatos: 0,
          'Gatos | Perros': 0,
        };
      }
      acc[lugar][tipo_mascota] = cantidad;
      return acc;
    }, {});
    const lugarCastracionData = Object.values(lugarCastracionPivot);

    // ── Conocimiento de Servicios por Ciudad ──
    const conocimientoPorCiudad = db.prepare(`
      SELECT
        ciudad,
        COUNT(*) as total,
        SUM(CASE WHEN conoce_castracion_gratis = 'Si' THEN 1 ELSE 0 END) as conoce_castracion,
        SUM(CASE WHEN conoce_plan_vacunacion = 'Si' THEN 1 ELSE 0 END) as conoce_vacunacion
      FROM registros
      ${where}
      AND ciudad IS NOT NULL
      GROUP BY ciudad
    `).all(...params);

    // ── Barrios con Mayor Uso de Servicios Municipales ──
    // Para barrios, ignoramos el filtro de barrio (no tiene sentido)
    let whereBarrios = 'WHERE 1=1';
    const paramsBarrios = [];
    if (tipoMascota) { whereBarrios += ' AND tipo_mascota = ?'; paramsBarrios.push(tipoMascota); }
    if (ciudad) { whereBarrios += ' AND ciudad = ?'; paramsBarrios.push(ciudad); }
    if (tipoVivienda) { whereBarrios += ' AND tipo_vivienda = ?'; paramsBarrios.push(tipoVivienda); }

    const barriosUso = db.prepare(`
      SELECT
        barrio_estandarizado as barrio,
        COUNT(*) as total,
        SUM(CASE WHEN lugar_castracion_municipio = 1 THEN 1 ELSE 0 END) as uso_municipio
      FROM registros
      ${whereBarrios}
      AND barrio_estandarizado IS NOT NULL
      GROUP BY barrio_estandarizado
      HAVING total >= 5
      ORDER BY (CAST(uso_municipio AS REAL) / CAST(total AS REAL)) DESC
      LIMIT 12
    `).all(...paramsBarrios);

    // ── Funnel: Conocimiento → Acceso → Reutilización ──
    // Nota: No tenemos dato directo de "volvería a usar", usamos proxy con acceso actual
    const funnelData = db.prepare(`
      SELECT
        SUM(CASE WHEN conoce_castracion_gratis = 'Si' THEN 1 ELSE 0 END) as conocen,
        SUM(CASE WHEN conoce_castracion_gratis = 'Si' AND lugar_castracion_municipio = 1 THEN 1 ELSE 0 END) as conocen_y_accedieron,
        SUM(CASE WHEN lugar_castracion_municipio = 1 THEN 1 ELSE 0 END) as accedieron
      FROM registros
      ${where}
    `).get(...params);

    res.json({
      kpis: {
        conocimiento_general_servicios: total > 0 ? (kpis.conocen_algun_servicio / total) * 100 : 0,
        conocimiento_castracion_gratis: total > 0 ? (kpis.conoce_castracion_si / total) * 100 : 0,
        respuestas_castracion: kpis.conoce_castracion_si || 0,
        conocimiento_plan_vacunacion: total > 0 ? (kpis.conoce_plan_si / total) * 100 : 0,
        respuestas_vacunacion: kpis.conoce_plan_si || 0,
        accedieron_servicios_municipales: total > 0 ? (kpis.accedieron_municipio / total) * 100 : 0,
        participacion_municipal_castraciones: totalCastrados > 0 ? ((kpis.solo_municipio + kpis.ambos_municipio_privado) / totalCastrados) * 100 : 0,
        participacion_municipal_count: (kpis.solo_municipio || 0) + (kpis.ambos_municipio_privado || 0),
        participacion_municipal_total: totalCastrados,
        solo_municipio: kpis.solo_municipio || 0,
        ambos_municipio_privado: kpis.ambos_municipio_privado || 0,
      },
      conocimiento_vs_acceso: {
        conocen_si: conocimientoAccesoCastracion.conocen_si || 0,
        conocen_no: conocimientoAccesoCastracion.conocen_no || 0,
        accedieron_si: conocimientoAccesoCastracion.accedieron_si || 0,
        accedieron_no: conocimientoAccesoCastracion.accedieron_no || 0,
      },
      conocimiento_vacunacion: {
        si: conocimientoVacunacion.si || 0,
        no: conocimientoVacunacion.no || 0,
      },
      conoce_castracion_por_tipo_mascota: conoceCastracionPorTipoMascota.map(d => ({
        tipo: d.tipo,
        total: d.total,
        conoce_pct: d.total > 0 ? (d.conoce_si / d.total) * 100 : 0,
      })),
      lugar_castracion_por_tipo_mascota: lugarCastracionData,
      conocimiento_por_ciudad: conocimientoPorCiudad.map(d => ({
        ciudad: d.ciudad,
        total: d.total,
        castracion_pct: d.total > 0 ? (d.conoce_castracion / d.total) * 100 : 0,
        vacunacion_pct: d.total > 0 ? (d.conoce_vacunacion / d.total) * 100 : 0,
      })),
      barrios_uso: barriosUso.map(d => ({
        barrio: d.barrio,
        total: d.total,
        uso_pct: d.total > 0 ? (d.uso_municipio / d.total) * 100 : 0,
      })),
      funnel: {
        total: total,
        conocen: funnelData.conocen || 0,
        conocen_y_accedieron: funnelData.conocen_y_accedieron || 0,
        accedieron: funnelData.accedieron || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
