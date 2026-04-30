const express = require('express');
const router = express.Router();
const db = require('../../db/database');

// ─────────────────────────────────────────────
// GET /estilo-vida
// Estilo de vida de las mascotas
// ─────────────────────────────────────────────
router.get('/estilo-vida', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT 
        SUM(estilo_salen_solos) as salen_solos,
        SUM(estilo_tienen_identificador) as tienen_identificador,
        SUM(estilo_viven_dentro) as viven_dentro,
        COUNT(*) as total
      FROM registros
    `).get();

    const frecuencia = db.prepare(`
      SELECT 
        frecuencia_callejeros as frecuencia,
        COUNT(*) as total
      FROM registros
      WHERE frecuencia_callejeros IS NOT NULL
      GROUP BY frecuencia_callejeros
      ORDER BY total DESC
    `).all();

    res.json({
      estilos: [
        { estilo: 'Salen solos a la calle', total: rows.salen_solos },
        { estilo: 'Tienen identificador', total: rows.tienen_identificador },
        { estilo: 'Viven dentro del hogar', total: rows.viven_dentro },
      ],
      frecuencia_callejeros: frecuencia,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /callejeros
// Animales abandonados/callejeros
// ─────────────────────────────────────────────
router.get('/callejeros', (req, res) => {
  try {
    const totales = db.prepare(`
      SELECT 
        SUM(animal_abandonado_gatos) as gatos_callejeros,
        SUM(animal_abandonado_perros) as perros_callejeros,
        COUNT(*) as total_hogares,
        SUM(estilo_salen_solos) as mascotas_que_salen
      FROM registros
    `).get();

    const porBarrio = db.prepare(`
      SELECT 
        barrio_estandarizado as barrio,
        COUNT(*) as hogares,
        SUM(animal_abandonado_perros) as perros,
        SUM(animal_abandonado_gatos) as gatos,
        SUM(estilo_salen_solos) as salen_solos
      FROM registros
      WHERE barrio_estandarizado IS NOT NULL
      GROUP BY barrio_estandarizado
      ORDER BY (SUM(animal_abandonado_perros) + SUM(animal_abandonado_gatos)) DESC
      LIMIT 15
    `).all();

    res.json({
      resumen: totales,
      por_barrio: porBarrio,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PÁGINA 3: SITUACIÓN CALLEJERA
router.get('/page-callejeros', (req, res) => {
  try {
    const total = db.prepare("SELECT COUNT(*) as total FROM registros WHERE frecuencia_callejeros IS NOT NULL AND frecuencia_callejeros != ''").get().total;
    
    const frecuencia = db.prepare(`
      SELECT 
        frecuencia_callejeros as respuesta,
        COUNT(*) as cantidad
      FROM registros
      WHERE frecuencia_callejeros IS NOT NULL AND frecuencia_callejeros != ''
      GROUP BY frecuencia_callejeros
    `).all();

    const frecuenciaFormat = frecuencia.map(f => ({
      respuesta: f.respuesta,
      cantidad: f.cantidad,
      porcentaje: total > 0 ? (f.cantidad / total) * 100 : 0
    }));

    const mapa = db.prepare(`
      SELECT 
        barrio_estandarizado as barrio,
        COUNT(*) as total_respuestas,
        SUM(CASE WHEN frecuencia_callejeros LIKE '%Todo el tiempo%' THEN 1 ELSE 0 END) as ve_todo_el_tiempo
      FROM registros
      WHERE barrio_estandarizado IS NOT NULL
      GROUP BY barrio_estandarizado
      ORDER BY ve_todo_el_tiempo DESC
    `).all();

    res.json({
      total_respuestas: total,
      frecuencia: frecuenciaFormat,
      mapa_barrios: mapa
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /callejeros-completa
// Dashboard completo de Situación Callejera con filtros dinámicos
// Query params: tipo_animal, frecuencia, ciudad, tipo_vivienda, barrio
// ─────────────────────────────────────────────
router.get('/callejeros-completa', (req, res) => {
  try {
    const tipoAnimal = req.query.tipo_animal || null;
    const frecuencia = req.query.frecuencia || null;
    const ciudad = req.query.ciudad || null;
    const tipoVivienda = req.query.tipo_vivienda || null;
    const barrio = req.query.barrio || null;

    let where = 'WHERE frecuencia_callejeros IS NOT NULL AND frecuencia_callejeros != \'\'';
    const params = [];

    if (tipoAnimal) {
      if (tipoAnimal === 'perros') { where += ' AND (tipo_animal_abandonado LIKE ? OR animal_abandonado_perros = 1)'; params.push('%Perros%'); }
      else if (tipoAnimal === 'gatos') { where += ' AND (tipo_animal_abandonado LIKE ? OR animal_abandonado_gatos = 1)'; params.push('%Gatos%'); }
      else if (tipoAnimal === 'ambos') { where += ' AND (tipo_animal_abandonado LIKE ? OR (animal_abandonado_perros = 1 AND animal_abandonado_gatos = 1))'; params.push('%Ambos%'); }
    }
    if (frecuencia) {
      const frecMap = {
        'todo_el_tiempo': 'Todo el tiempo',
        'a_veces': 'A veces',
        'nunca': 'Nunca',
        'raramente': 'Raramente'
      };
      if (frecMap[frecuencia]) { where += ' AND frecuencia_callejeros = ?'; params.push(frecMap[frecuencia]); }
    }
    if (ciudad) { where += ' AND ciudad = ?'; params.push(ciudad); }
    if (tipoVivienda) { where += ' AND tipo_vivienda = ?'; params.push(tipoVivienda); }
    if (barrio) { where += ' AND barrio_estandarizado = ?'; params.push(barrio); }

    // Base queries helper
    const run = (sql, extraParams = []) => db.prepare(sql).all(...params, ...extraParams);
    const runGet = (sql, extraParams = []) => db.prepare(sql).get(...params, ...extraParams);

    // ── Total base ──
    const totalBase = runGet(`SELECT COUNT(*) as total FROM registros ${where}`).total || 1;

    // ── 1. KPIs ──
    const kpisRow = runGet(`
      SELECT
        SUM(CASE WHEN frecuencia_callejeros IN ('Todo el tiempo','A veces') THEN 1 ELSE 0 END) as avistan,
        SUM(CASE WHEN frecuencia_callejeros = 'Todo el tiempo' THEN 1 ELSE 0 END) as todo_el_tiempo,
        SUM(CASE WHEN frecuencia_callejeros = 'Nunca' THEN 1 ELSE 0 END) as nunca,
        SUM(CASE WHEN tipo_animal_abandonado = 'Perros' THEN 1 ELSE 0 END) as reportan_perros,
        SUM(CASE WHEN tipo_animal_abandonado = 'Gatos' THEN 1 ELSE 0 END) as reportan_gatos,
        SUM(CASE WHEN tipo_animal_abandonado = 'Gatos | Perros' THEN 1 ELSE 0 END) as reportan_ambos,
        SUM(CASE WHEN frecuencia_callejeros IN ('Todo el tiempo','A veces') AND (medida_castraciones = 1 OR medida_identificacion = 1 OR medida_educacion = 1) THEN 1 ELSE 0 END) as avistan_y_exigen
      FROM registros ${where}
    `);

    const barrioMayor = runGet(`
      SELECT barrio_estandarizado as barrio,
        SUM(CASE WHEN frecuencia_callejeros IN ('Todo el tiempo','A veces') THEN 1 ELSE 0 END) as avistan
      FROM registros
      ${where} AND barrio_estandarizado IS NOT NULL
      GROUP BY barrio_estandarizado
      ORDER BY avistan DESC
      LIMIT 1
    `);

    // ── 2. Frecuencia de avistamiento ──
    const frecuenciaRows = run(`
      SELECT frecuencia_callejeros as respuesta, COUNT(*) as cantidad
      FROM registros
      ${where}
      GROUP BY frecuencia_callejeros
      ORDER BY cantidad DESC
    `);
    const totalFrec = frecuenciaRows.reduce((s, r) => s + r.cantidad, 0) || 1;

    // ── 3. Tipo de animal reportado ──
    const tipoAnimalRows = [
      { tipo: 'Perros', cantidad: kpisRow.reportan_perros || 0 },
      { tipo: 'Gatos', cantidad: kpisRow.reportan_gatos || 0 },
      { tipo: 'Ambos', cantidad: kpisRow.reportan_ambos || 0 },
    ];
    const totalTipoAnimal = (kpisRow.reportan_perros || 0) + (kpisRow.reportan_gatos || 0) + (kpisRow.reportan_ambos || 0) || 1;

    // ── 4. Frecuencia por barrio ──
    const frecuenciaPorBarrio = run(`
      SELECT
        barrio_estandarizado as barrio,
        SUM(CASE WHEN frecuencia_callejeros = 'Todo el tiempo' THEN 1 ELSE 0 END) as todo_el_tiempo,
        SUM(CASE WHEN frecuencia_callejeros = 'A veces' THEN 1 ELSE 0 END) as a_veces,
        SUM(CASE WHEN frecuencia_callejeros = 'Nunca' THEN 1 ELSE 0 END) as nunca,
        SUM(CASE WHEN frecuencia_callejeros = 'Raramente' THEN 1 ELSE 0 END) as raramente,
        COUNT(*) as total
      FROM registros
      ${where} AND barrio_estandarizado IS NOT NULL
      GROUP BY barrio_estandarizado
      ORDER BY (todo_el_tiempo + a_veces) DESC
      LIMIT 12
    `);

    // ── 5. Tipo de animal por barrio ──
    const tipoAnimalPorBarrio = run(`
      SELECT
        barrio_estandarizado as barrio,
        SUM(CASE WHEN tipo_animal_abandonado = 'Perros' THEN 1 ELSE 0 END) as perros,
        SUM(CASE WHEN tipo_animal_abandonado = 'Gatos' THEN 1 ELSE 0 END) as gatos,
        SUM(CASE WHEN tipo_animal_abandonado = 'Gatos | Perros' THEN 1 ELSE 0 END) as ambos,
        COUNT(*) as total
      FROM registros
      ${where} AND barrio_estandarizado IS NOT NULL
      GROUP BY barrio_estandarizado
      ORDER BY total DESC
      LIMIT 10
    `);

    // ── 6. Frecuencia por ciudad ──
    const frecuenciaPorCiudad = run(`
      SELECT
        ciudad,
        SUM(CASE WHEN frecuencia_callejeros = 'Todo el tiempo' THEN 1 ELSE 0 END) as todo_el_tiempo,
        SUM(CASE WHEN frecuencia_callejeros = 'A veces' THEN 1 ELSE 0 END) as a_veces,
        SUM(CASE WHEN frecuencia_callejeros = 'Nunca' THEN 1 ELSE 0 END) as nunca,
        SUM(CASE WHEN frecuencia_callejeros = 'Raramente' THEN 1 ELSE 0 END) as raramente,
        COUNT(*) as total
      FROM registros
      ${where} AND ciudad IS NOT NULL
      GROUP BY ciudad
      ORDER BY total DESC
    `);

    // ── 7. Frecuencia por tipo de vivienda ──
    const frecuenciaPorTipoVivienda = run(`
      SELECT
        tipo_vivienda,
        SUM(CASE WHEN frecuencia_callejeros = 'Todo el tiempo' THEN 1 ELSE 0 END) as todo_el_tiempo,
        SUM(CASE WHEN frecuencia_callejeros = 'A veces' THEN 1 ELSE 0 END) as a_veces,
        SUM(CASE WHEN frecuencia_callejeros = 'Nunca' THEN 1 ELSE 0 END) as nunca,
        SUM(CASE WHEN frecuencia_callejeros = 'Raramente' THEN 1 ELSE 0 END) as raramente,
        COUNT(*) as total
      FROM registros
      ${where} AND tipo_vivienda IS NOT NULL
      GROUP BY tipo_vivienda
      ORDER BY total DESC
    `);

    // ── 8. Tipo de animal por tipo de vivienda ──
    const tipoAnimalPorTipoVivienda = run(`
      SELECT
        tipo_vivienda,
        SUM(CASE WHEN tipo_animal_abandonado = 'Perros' THEN 1 ELSE 0 END) as perros,
        SUM(CASE WHEN tipo_animal_abandonado = 'Gatos' THEN 1 ELSE 0 END) as gatos,
        SUM(CASE WHEN tipo_animal_abandonado = 'Gatos | Perros' THEN 1 ELSE 0 END) as ambos,
        COUNT(*) as total
      FROM registros
      ${where} AND tipo_vivienda IS NOT NULL
      GROUP BY tipo_vivienda
      ORDER BY total DESC
    `);

    // ── 9. Avistamiento vs demanda de medidas ──
    const avistamientoVsMedidas = run(`
      SELECT
        frecuencia_callejeros as frecuencia,
        COUNT(*) as total,
        SUM(CASE WHEN (medida_castraciones = 1 OR medida_identificacion = 1 OR medida_educacion = 1) THEN 1 ELSE 0 END) as exigen_medidas
      FROM registros
      ${where}
      GROUP BY frecuencia_callejeros
      ORDER BY total DESC
    `);

    // ── 10. Mapa de calor (barrios con intensidad) ──
    const mapaBarrios = run(`
      SELECT
        barrio_estandarizado as barrio,
        COUNT(*) as total_respuestas,
        SUM(CASE WHEN frecuencia_callejeros = 'Todo el tiempo' THEN 1 ELSE 0 END) as todo_el_tiempo,
        SUM(CASE WHEN frecuencia_callejeros IN ('Todo el tiempo','A veces') THEN 1 ELSE 0 END) as avistan,
        ROUND(AVG(CASE WHEN frecuencia_callejeros = 'Todo el tiempo' THEN 1.0 ELSE 0.0 END) * 100, 1) as intensidad
      FROM registros
      ${where} AND barrio_estandarizado IS NOT NULL
      GROUP BY barrio_estandarizado
      ORDER BY intensidad DESC
      LIMIT 15
    `);

    // ── Filtros disponibles ──
    const ciudadesFiltro = db.prepare(`SELECT DISTINCT ciudad FROM registros WHERE ciudad IS NOT NULL ORDER BY ciudad`).all().map(r => r.ciudad);
    const barriosFiltro = db.prepare(`SELECT DISTINCT barrio_estandarizado as barrio FROM registros WHERE barrio_estandarizado IS NOT NULL ORDER BY barrio_estandarizado`).all().map(r => r.barrio);
    const tiposViviendaFiltro = db.prepare(`SELECT DISTINCT tipo_vivienda FROM registros WHERE tipo_vivienda IS NOT NULL ORDER BY tipo_vivienda`).all().map(r => r.tipo_vivienda);

    res.json({
      total_respuestas: totalBase,
      kpis: {
        pct_avistan: totalBase > 0 ? Math.round(((kpisRow.avistan || 0) / totalBase) * 100) : 0,
        pct_todo_el_tiempo: totalBase > 0 ? Math.round(((kpisRow.todo_el_tiempo || 0) / totalBase) * 100) : 0,
        pct_nunca: totalBase > 0 ? Math.round(((kpisRow.nunca || 0) / totalBase) * 100) : 0,
        pct_animal_perros: totalTipoAnimal > 0 ? Math.round(((kpisRow.reportan_perros || 0) / totalTipoAnimal) * 100) : 0,
        pct_animal_gatos: totalTipoAnimal > 0 ? Math.round(((kpisRow.reportan_gatos || 0) / totalTipoAnimal) * 100) : 0,
        barrio_mayor_avistamiento: barrioMayor?.barrio || '-',
        pct_exigen_medidas_de_avistan: (kpisRow.avistan || 0) > 0 ? Math.round(((kpisRow.avistan_y_exigen || 0) / (kpisRow.avistan || 0)) * 100) : 0,
      },
      frecuencia_avistamiento: frecuenciaRows.map(r => ({
        respuesta: r.respuesta,
        cantidad: r.cantidad,
        porcentaje: totalFrec > 0 ? Math.round((r.cantidad / totalFrec) * 1000) / 10 : 0,
      })),
      tipo_animal_reportado: tipoAnimalRows.map(r => ({
        tipo: r.tipo,
        cantidad: r.cantidad,
        porcentaje: totalTipoAnimal > 0 ? Math.round((r.cantidad / totalTipoAnimal) * 1000) / 10 : 0,
      })),
      frecuencia_por_barrio: frecuenciaPorBarrio.map(r => ({
        barrio: r.barrio,
        todo_el_tiempo: r.todo_el_tiempo,
        a_veces: r.a_veces,
        nunca: r.nunca,
        raramente: r.raramente,
        total: r.total,
      })),
      tipo_animal_por_barrio: tipoAnimalPorBarrio.map(r => ({
        barrio: r.barrio,
        perros: r.perros,
        gatos: r.gatos,
        ambos: r.ambos,
        total: r.total,
      })),
      frecuencia_por_ciudad: frecuenciaPorCiudad.map(r => ({
        ciudad: r.ciudad,
        todo_el_tiempo: r.todo_el_tiempo,
        a_veces: r.a_veces,
        nunca: r.nunca,
        raramente: r.raramente,
        total: r.total,
      })),
      frecuencia_por_tipo_vivienda: frecuenciaPorTipoVivienda.map(r => ({
        tipo_vivienda: r.tipo_vivienda,
        todo_el_tiempo: r.todo_el_tiempo,
        a_veces: r.a_veces,
        nunca: r.nunca,
        raramente: r.raramente,
        total: r.total,
      })),
      tipo_animal_por_tipo_vivienda: tipoAnimalPorTipoVivienda.map(r => ({
        tipo_vivienda: r.tipo_vivienda,
        perros: r.perros,
        gatos: r.gatos,
        ambos: r.ambos,
        total: r.total,
      })),
      avistamiento_vs_medidas: avistamientoVsMedidas.map(r => ({
        frecuencia: r.frecuencia,
        total: r.total,
        exigen_medidas: r.exigen_medidas,
        pct_exigen: r.total > 0 ? Math.round((r.exigen_medidas / r.total) * 1000) / 10 : 0,
      })),
      mapa_barrios: mapaBarrios,
      filtros_disponibles: {
        ciudades: ciudadesFiltro,
        barrios: barriosFiltro,
        tipos_vivienda: tiposViviendaFiltro,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
