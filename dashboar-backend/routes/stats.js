const express = require('express');
const router = express.Router();
const db = require('../db/database');

// ─────────────────────────────────────────────
// GET /api/stats/resumen
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
// GET /api/stats/por-ciudad
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
// GET /api/stats/por-barrio
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
// GET /api/stats/tipos-mascota
// Distribución por tipo de mascota
// ─────────────────────────────────────────────
router.get('/tipos-mascota', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT 
        SUM(tiene_perros) as solo_perros_count,
        SUM(tiene_gatos) as solo_gatos_count,
        SUM(CASE WHEN tiene_perros = 1 AND tiene_gatos = 1 THEN 1 ELSE 0 END) as mixto_count,
        COUNT(*) as total
      FROM registros
    `).get();

    res.json({
      labels: ['Solo Perros', 'Solo Gatos', 'Mixto (Perros y Gatos)'],
      data: [
        rows.solo_perros_count - rows.mixto_count,
        rows.solo_gatos_count - rows.mixto_count,
        rows.mixto_count,
      ],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/stats/castracion
// Distribución de castraciones
// ─────────────────────────────────────────────
router.get('/castracion', (req, res) => {
  try {
    const porEstado = db.prepare(`
      SELECT 
        mascota_castrada as estado,
        COUNT(*) as total
      FROM registros
      WHERE mascota_castrada IS NOT NULL
      GROUP BY mascota_castrada
      ORDER BY total DESC
    `).all();

    const porLugar = db.prepare(`
      SELECT 
        SUM(lugar_castracion_particular) as particular,
        SUM(lugar_castracion_municipio) as municipio,
        SUM(lugar_castracion_no_castrada) as no_castrada
      FROM registros
    `).get();

    const conoceGratis = db.prepare(`
      SELECT 
        conoce_castracion_gratis as respuesta,
        COUNT(*) as total
      FROM registros
      WHERE conoce_castracion_gratis IS NOT NULL
      GROUP BY conoce_castracion_gratis
    `).all();

    res.json({
      por_estado: porEstado,
      por_lugar: [
        { lugar: 'En forma particular', total: porLugar.particular },
        { lugar: 'Municipio', total: porLugar.municipio },
        { lugar: 'No castrada', total: porLugar.no_castrada },
      ],
      conoce_castracion_gratis: conoceGratis,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/stats/salud
// Datos de salud: vacunación y desparasitación
// ─────────────────────────────────────────────
router.get('/salud', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT 
        SUM(CASE WHEN mascotas_vacunadas = 'Si' THEN 1 ELSE 0 END) as vacunadas_si,
        SUM(CASE WHEN mascotas_vacunadas = 'No' THEN 1 ELSE 0 END) as vacunadas_no,
        SUM(CASE WHEN mascotas_desparasitadas = 'Si' THEN 1 ELSE 0 END) as desparasitadas_si,
        SUM(CASE WHEN mascotas_desparasitadas = 'No' THEN 1 ELSE 0 END) as desparasitadas_no,
        SUM(CASE WHEN conoce_plan_vacunacion = 'Si' THEN 1 ELSE 0 END) as conoce_plan_si,
        SUM(CASE WHEN conoce_plan_vacunacion = 'No' THEN 1 ELSE 0 END) as conoce_plan_no,
        COUNT(*) as total
      FROM registros
    `).get();

    res.json({
      vacunacion: {
        si: rows.vacunadas_si,
        no: rows.vacunadas_no,
        porcentaje: Math.round((rows.vacunadas_si / rows.total) * 100),
      },
      desparasitacion: {
        si: rows.desparasitadas_si,
        no: rows.desparasitadas_no,
        porcentaje: Math.round((rows.desparasitadas_si / rows.total) * 100),
      },
      conoce_plan_vacunacion: {
        si: rows.conoce_plan_si,
        no: rows.conoce_plan_no,
        porcentaje: Math.round((rows.conoce_plan_si / rows.total) * 100),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/stats/estilo-vida
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
// GET /api/stats/callejeros
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

// ─────────────────────────────────────────────
// GET /api/stats/medidas-municipio
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

// ─────────────────────────────────────────────
// GET /api/stats/tipo-vivienda
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
// GET /api/stats/evolucion-temporal
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

// ─────────────────────────────────────────────
// GET /api/stats/registros
// Lista paginada de registros individuales
// ─────────────────────────────────────────────
router.get('/registros', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = (page - 1) * limit;
    const ciudad = req.query.ciudad || null;
    const barrio = req.query.barrio || null;
    const castrada = req.query.castrada || null;

    let where = 'WHERE 1=1';
    const params = [];

    if (ciudad) { where += ' AND ciudad = ?'; params.push(ciudad); }
    if (barrio) { where += ' AND barrio_estandarizado = ?'; params.push(barrio); }
    if (castrada) { where += ' AND mascota_castrada = ?'; params.push(castrada); }

    const total = db.prepare(`SELECT COUNT(*) as cnt FROM registros ${where}`).get(...params);
    const rows = db.prepare(`
      SELECT id, fecha_registro, ciudad, barrio_estandarizado, tipo_vivienda,
             integrantes_familia, tipo_mascota, total_mascotas,
             mascota_castrada, mascotas_vacunadas, mascotas_desparasitadas,
             estilo_vida_mascota, autopercepcion_responsabilidad
      FROM registros ${where}
      ORDER BY fecha_registro DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.json({
      data: rows,
      pagination: {
        total: total.cnt,
        page,
        limit,
        total_pages: Math.ceil(total.cnt / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/stats/filtros
// Valores únicos para usar en filtros del frontend
// ─────────────────────────────────────────────
router.get('/filtros', (req, res) => {
  try {
    const ciudades = db.prepare(`
      SELECT DISTINCT ciudad FROM registros WHERE ciudad IS NOT NULL ORDER BY ciudad
    `).all().map(r => r.ciudad);

    const barrios = db.prepare(`
      SELECT DISTINCT barrio_estandarizado as barrio FROM registros 
      WHERE barrio_estandarizado IS NOT NULL ORDER BY barrio
    `).all().map(r => r.barrio);

    const tiposVivienda = db.prepare(`
      SELECT DISTINCT tipo_vivienda FROM registros WHERE tipo_vivienda IS NOT NULL ORDER BY tipo_vivienda
    `).all().map(r => r.tipo_vivienda);

    res.json({ ciudades, barrios, tipos_vivienda: tiposVivienda });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// NUEVOS ENDPOINTS POR PÁGINA (resumen.md)
// ─────────────────────────────────────────────

// PÁGINA 1: PANORAMA GENERAL
router.get('/page-resumen', (req, res) => {
  try {
    const totales = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN mascotas_vacunadas = 'Si' THEN 1 ELSE 0 END) as vacunadas,
        SUM(CASE WHEN mascotas_vacunadas = 'No' THEN 1 ELSE 0 END) as no_vacunadas,
        SUM(CASE WHEN mascota_castrada = 'Si' THEN 1 ELSE 0 END) as castradas,
        SUM(CASE WHEN mascota_castrada = 'No' THEN 1 ELSE 0 END) as no_castradas,
        SUM(CASE WHEN mascotas_desparasitadas = 'Si' THEN 1 ELSE 0 END) as desparasitadas,
        SUM(CASE WHEN mascotas_desparasitadas = 'No' THEN 1 ELSE 0 END) as no_desparasitadas
      FROM registros
    `).get();

    const barrios = db.prepare(`
      SELECT 
        barrio_estandarizado as barrio,
        COUNT(*) as encuestados,
        SUM(CASE WHEN mascota_castrada = 'Si' THEN 1 ELSE 0 END) as castradas,
        SUM(CASE WHEN mascotas_vacunadas = 'Si' THEN 1 ELSE 0 END) as vacunadas,
        SUM(CASE WHEN mascotas_desparasitadas = 'Si' THEN 1 ELSE 0 END) as desparasitadas
      FROM registros
      WHERE barrio_estandarizado IS NOT NULL
      GROUP BY barrio_estandarizado
      ORDER BY encuestados DESC
    `).all();

    res.json({
      totales: totales.total,
      tasa_vacunacion: totales.total > 0 ? (totales.vacunadas / (totales.vacunadas + totales.no_vacunadas)) * 100 : 0,
      tasa_castracion: totales.total > 0 ? (totales.castradas / totales.total) * 100 : 0,
      tasa_desparasitacion: totales.total > 0 ? (totales.desparasitadas / (totales.desparasitadas + totales.no_desparasitadas)) * 100 : 0,
      barrios
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PÁGINA 2: SALUD ANIMAL
router.get('/page-salud', (req, res) => {
  try {
    const salud = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN mascota_castrada = 'Si' THEN 1 ELSE 0 END) as castradas,
        SUM(CASE WHEN mascotas_vacunadas = 'Si' THEN 1 ELSE 0 END) as vacunadas,
        SUM(CASE WHEN mascotas_desparasitadas = 'Si' THEN 1 ELSE 0 END) as desparasitadas,
        SUM(CASE WHEN conoce_plan_vacunacion = 'Si' THEN 1 ELSE 0 END) as conocen_vacunas_si,
        SUM(CASE WHEN conoce_plan_vacunacion = 'No' THEN 1 ELSE 0 END) as conocen_vacunas_no
      FROM registros
    `).get();

    const donacastracion = db.prepare(`
      SELECT 
        SUM(CASE WHEN lugar_castracion_municipio = 1 AND lugar_castracion_particular = 0 THEN 1 ELSE 0 END) as solo_municipio,
        SUM(CASE WHEN lugar_castracion_particular = 1 AND lugar_castracion_municipio = 0 THEN 1 ELSE 0 END) as solo_particular,
        SUM(CASE WHEN lugar_castracion_municipio = 1 AND lugar_castracion_particular = 1 THEN 1 ELSE 0 END) as ambos,
        SUM(CASE WHEN mascota_castrada = 'No' THEN 1 ELSE 0 END) as no_castradas,
        SUM(CASE WHEN mascota_castrada = 'Si' THEN 1 ELSE 0 END) as total_castradas
      FROM registros
    `).get();

    res.json({
      tasa_castracion: salud.total > 0 ? (salud.castradas / salud.total) * 100 : 0,
      tasa_vacunacion: salud.total > 0 ? (salud.vacunadas / salud.total) * 100 : 0,
      tasa_desparasitacion: salud.total > 0 ? (salud.desparasitadas / salud.total) * 100 : 0,
      conocen_vacunas_si: salud.conocen_vacunas_si,
      conocen_vacunas_no: salud.conocen_vacunas_no,
      conocen_vacunas_pct: salud.total > 0 ? (salud.conocen_vacunas_si / salud.total) * 100 : 0,
      lugar_castracion: donacastracion
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

// PÁGINA 4: SERVICIOS MUNICIPALES
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

module.exports = router;
