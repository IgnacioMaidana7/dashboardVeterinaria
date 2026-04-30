const express = require('express');
const router = express.Router();
const db = require('../../db/database');

// ─────────────────────────────────────────────
// GET /resumen
// Estadísticas generales del dashboard
// ─────────────────────────────────────────────
router.get('/resumen', (req, res) => {
  try {
    const total = db.prepare('SELECT COUNT(*) as total FROM registros').get();
    const ciudades = db.prepare('SELECT COUNT(DISTINCT ciudad) as total FROM registros WHERE ciudad IS NOT NULL').get();
    const barrios = db.prepare('SELECT COUNT(DISTINCT barrio_estandarizado) as total FROM registros WHERE barrio_estandarizado IS NOT NULL').get();

    const conMascotas = db.prepare(`
      SELECT 
        SUM(CASE WHEN tiene_perros = 1 THEN 1 ELSE 0 END) as hogares_con_perros,
        SUM(CASE WHEN tiene_gatos = 1 THEN 1 ELSE 0 END) as hogares_con_gatos,
        SUM(CASE WHEN tiene_perros = 1 AND tiene_gatos = 1 THEN 1 ELSE 0 END) as hogares_mixtos,
        AVG(integrantes_familia) as promedio_integrantes
      FROM registros
    `).get();

    const castradas = db.prepare(`
      SELECT 
        SUM(CASE WHEN mascota_castrada = 'Si' THEN 1 ELSE 0 END) as castradas,
        SUM(CASE WHEN mascota_castrada = 'No' THEN 1 ELSE 0 END) as no_castradas,
        COUNT(*) as total
      FROM registros
    `).get();

    const vacunadas = db.prepare(`
      SELECT 
        SUM(CASE WHEN mascotas_vacunadas = 'Si' THEN 1 ELSE 0 END) as vacunadas,
        SUM(CASE WHEN mascotas_vacunadas = 'No' THEN 1 ELSE 0 END) as no_vacunadas
      FROM registros
    `).get();

    res.json({
      total_registros: total.total,
      ciudades_registradas: ciudades.total,
      barrios_registrados: barrios.total,
      hogares_con_perros: conMascotas.hogares_con_perros,
      hogares_con_gatos: conMascotas.hogares_con_gatos,
      hogares_mixtos: conMascotas.hogares_mixtos,
      promedio_integrantes: Math.round(conMascotas.promedio_integrantes * 10) / 10,
      castradas: castradas.castradas,
      no_castradas: castradas.no_castradas,
      porcentaje_castracion: castradas.total > 0
        ? Math.round((castradas.castradas / castradas.total) * 100)
        : 0,
      vacunadas: vacunadas.vacunadas,
      no_vacunadas: vacunadas.no_vacunadas,
      porcentaje_vacunacion: (vacunadas.vacunadas + vacunadas.no_vacunadas) > 0
        ? Math.round((vacunadas.vacunadas / (vacunadas.vacunadas + vacunadas.no_vacunadas)) * 100)
        : 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /por-ciudad
// Distribución de registros por ciudad
// ─────────────────────────────────────────────
router.get('/por-ciudad', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT 
        ciudad,
        COUNT(*) as total,
        SUM(tiene_perros) as con_perros,
        SUM(tiene_gatos) as con_gatos,
        SUM(CASE WHEN mascota_castrada = 'Si' THEN 1 ELSE 0 END) as castradas
      FROM registros
      WHERE ciudad IS NOT NULL
      GROUP BY ciudad
      ORDER BY total DESC
    `).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /por-barrio
// Top barrios con más registros
// ─────────────────────────────────────────────
router.get('/por-barrio', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const ciudad = req.query.ciudad || null;

    let query = `
      SELECT 
        barrio_estandarizado as barrio,
        ciudad,
        COUNT(*) as total,
        SUM(tiene_perros) as con_perros,
        SUM(tiene_gatos) as con_gatos,
        SUM(CASE WHEN mascota_castrada = 'Si' THEN 1 ELSE 0 END) as castradas
      FROM registros
      WHERE barrio_estandarizado IS NOT NULL
    `;

    const params = [];
    if (ciudad) {
      query += ` AND ciudad = ?`;
      params.push(ciudad);
    }

    query += ` GROUP BY barrio_estandarizado, ciudad ORDER BY total DESC LIMIT ?`;
    params.push(limit);

    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /tipo-vivienda
// Distribución por tipo de vivienda
// ─────────────────────────────────────────────
router.get('/tipo-vivienda', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT 
        tipo_vivienda as tipo,
        COUNT(*) as total,
        SUM(CASE WHEN mascota_castrada = 'Si' THEN 1 ELSE 0 END) as con_castradas,
        ROUND(AVG(integrantes_familia), 1) as promedio_integrantes
      FROM registros
      WHERE tipo_vivienda IS NOT NULL
      GROUP BY tipo_vivienda
      ORDER BY total DESC
    `).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /evolucion-temporal
// Registros agrupados por mes
// ─────────────────────────────────────────────
router.get('/evolucion-temporal', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT 
        strftime('%Y-%m', fecha_registro) as mes,
        COUNT(*) as total,
        SUM(CASE WHEN mascota_castrada = 'Si' THEN 1 ELSE 0 END) as castradas,
        SUM(CASE WHEN mascotas_vacunadas = 'Si' THEN 1 ELSE 0 END) as vacunadas
      FROM registros
      WHERE fecha_registro IS NOT NULL
      GROUP BY mes
      ORDER BY mes ASC
    `).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PÁGINA 1: PANORAMA GENERAL
router.get('/page-resumen', (req, res) => {
  try {
    const totales = db.prepare(`
      SELECT 
        COUNT(*) as total,
        AVG(integrantes_familia) as promedio_integrantes,
        COUNT(DISTINCT ciudad) as ciudades_cubiertas
      FROM registros
    `).get();

    const composicion = db.prepare(`
      SELECT 
        SUM(CASE WHEN tiene_perros = 1 AND tiene_gatos = 0 THEN 1 ELSE 0 END) as solo_perros,
        SUM(CASE WHEN tiene_perros = 0 AND tiene_gatos = 1 THEN 1 ELSE 0 END) as solo_gatos,
        SUM(CASE WHEN tiene_perros = 1 AND tiene_gatos = 1 THEN 1 ELSE 0 END) as mixto
      FROM registros
    `).get();

    const medidas = db.prepare(`
      SELECT 
        SUM(medida_no_necesaria) as no_necesaria,
        COUNT(*) as total_encuestados
      FROM registros
    `).get();

    res.json({
      totales: totales.total,
      periodo_recoleccion: 'Marzo 2026',
      ciudades_cubiertas: totales.ciudades_cubiertas,
      promedio_integrantes: totales.promedio_integrantes ? Math.round(totales.promedio_integrantes * 100) / 100 : 0,
      composicion_mascotas: {
        solo_perros: composicion.solo_perros,
        solo_gatos: composicion.solo_gatos,
        mixto: composicion.mixto,
      },
      demanda_accion: {
        total: medidas.total_encuestados,
        demandan: medidas.total_encuestados - medidas.no_necesaria,
        no_demandan: medidas.no_necesaria,
        pct_demandan: medidas.total_encuestados > 0
          ? Math.round(((medidas.total_encuestados - medidas.no_necesaria) / medidas.total_encuestados) * 100)
          : 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /integrantes-familia
// Distribución de integrantes por familia (histograma)
// ─────────────────────────────────────────────
router.get('/integrantes-familia', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT integrantes_familia as integrantes, COUNT(*) as frecuencia
      FROM registros
      WHERE integrantes_familia IS NOT NULL AND integrantes_familia > 0
      GROUP BY integrantes_familia
      ORDER BY integrantes_familia ASC
    `).all();

    const stats = db.prepare(`
      SELECT 
        AVG(integrantes_familia) as media
      FROM registros
      WHERE integrantes_familia IS NOT NULL AND integrantes_familia > 0
    `).get();

    const allValues = db.prepare(`
      SELECT integrantes_familia as val
      FROM registros
      WHERE integrantes_familia IS NOT NULL AND integrantes_familia > 0
      ORDER BY integrantes_familia
    `).all().map(r => r.val);
    const mid = Math.floor(allValues.length / 2);
    const mediana = allValues.length % 2 !== 0
      ? allValues[mid]
      : (allValues[mid - 1] + allValues[mid]) / 2;

    res.json({
      distribucion: rows,
      media: stats.media ? Math.round(stats.media * 100) / 100 : 0,
      mediana: Math.round(mediana * 100) / 100,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /panorama
// Dashboard completo de Panorama General con filtro opcional por barrio
// ─────────────────────────────────────────────
router.get('/panorama', (req, res) => {
  try {
    const barrio = req.query.barrio || null;
    const whereBarrio = barrio ? 'AND barrio_estandarizado = ?' : '';
    const paramsBarrio = barrio ? [barrio] : [];

    // ── KPIs ──
    const totales = db.prepare(`
      SELECT COUNT(*) as total, AVG(integrantes_familia) as promedio_integrantes,
             COUNT(DISTINCT ciudad) as ciudades_cubiertas
      FROM registros WHERE 1=1 ${whereBarrio}
    `).get(...paramsBarrio);

    // ── Composición de mascotas ──
    const composicion = db.prepare(`
      SELECT 
        SUM(CASE WHEN tiene_perros = 1 AND tiene_gatos = 0 THEN 1 ELSE 0 END) as solo_perros,
        SUM(CASE WHEN tiene_perros = 0 AND tiene_gatos = 1 THEN 1 ELSE 0 END) as solo_gatos,
        SUM(CASE WHEN tiene_perros = 1 AND tiene_gatos = 1 THEN 1 ELSE 0 END) as mixto
      FROM registros WHERE 1=1 ${whereBarrio}
    `).get(...paramsBarrio);

    // ── Demanda de acción municipal ──
    const medidas = db.prepare(`
      SELECT SUM(medida_no_necesaria) as no_necesaria, COUNT(*) as total
      FROM registros WHERE 1=1 ${whereBarrio}
    `).get(...paramsBarrio);

    // ── Distribución de integrantes ──
    const distribucion = db.prepare(`
      SELECT integrantes_familia as integrantes, COUNT(*) as frecuencia
      FROM registros
      WHERE integrantes_familia IS NOT NULL AND integrantes_familia > 0 ${whereBarrio}
      GROUP BY integrantes_familia
      ORDER BY integrantes_familia ASC
    `).all(...paramsBarrio);

    // Media y mediana manual
    const allValues = db.prepare(`
      SELECT integrantes_familia as val
      FROM registros
      WHERE integrantes_familia IS NOT NULL AND integrantes_familia > 0 ${whereBarrio}
      ORDER BY integrantes_familia
    `).all(...paramsBarrio).map(r => r.val);

    const media = allValues.length > 0
      ? Math.round((allValues.reduce((a, b) => a + b, 0) / allValues.length) * 100) / 100
      : 0;
    const mid = Math.floor(allValues.length / 2);
    const mediana = allValues.length > 0
      ? (allValues.length % 2 !== 0 ? allValues[mid] : (allValues[mid - 1] + allValues[mid]) / 2)
      : 0;

    // ── Frecuencia callejeros ──
    const callejerosRows = db.prepare(`
      SELECT frecuencia_callejeros as respuesta, COUNT(*) as cantidad
      FROM registros
      WHERE frecuencia_callejeros IS NOT NULL AND frecuencia_callejeros != '' ${whereBarrio}
      GROUP BY frecuencia_callejeros
    `).all(...paramsBarrio);

    const totalCallejeros = callejerosRows.reduce((sum, r) => sum + r.cantidad, 0);
    const callejeros = callejerosRows.map(r => ({
      respuesta: r.respuesta,
      cantidad: r.cantidad,
      porcentaje: totalCallejeros > 0 ? (r.cantidad / totalCallejeros) * 100 : 0,
    }));

    // ── Respuesta ──
    res.json({
      totales: totales.total,
      periodo_recoleccion: 'Marzo 2026',
      ciudades_cubiertas: totales.ciudades_cubiertas,
      promedio_integrantes: totales.promedio_integrantes ? Math.round(totales.promedio_integrantes * 100) / 100 : 0,
      composicion_mascotas: {
        solo_perros: composicion.solo_perros || 0,
        solo_gatos: composicion.solo_gatos || 0,
        mixto: composicion.mixto || 0,
      },
      demanda_accion: {
        total: medidas.total || 0,
        demandan: (medidas.total || 0) - (medidas.no_necesaria || 0),
        no_demandan: medidas.no_necesaria || 0,
        pct_demandan: medidas.total > 0
          ? Math.round(((medidas.total - medidas.no_necesaria) / medidas.total) * 100)
          : 0,
      },
      integrantes: {
        distribucion,
        media,
        mediana: Math.round(mediana * 100) / 100,
      },
      callejeros: {
        total_respuestas: totalCallejeros,
        frecuencia: callejeros,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
