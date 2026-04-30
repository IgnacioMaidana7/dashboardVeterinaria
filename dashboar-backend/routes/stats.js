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
      SELECT barrio_estandarizado as barrio, COUNT(*) as cantidad
      FROM registros 
      WHERE barrio_estandarizado IS NOT NULL
      GROUP BY barrio_estandarizado
      ORDER BY cantidad DESC, barrio ASC
    `).all().map(r => r.barrio);

    const tiposVivienda = db.prepare(`
      SELECT DISTINCT tipo_vivienda FROM registros WHERE tipo_vivienda IS NOT NULL ORDER BY tipo_vivienda
    `).all().map(r => r.tipo_vivienda);

    const tiposMascota = db.prepare(`
      SELECT DISTINCT tipo_mascota FROM registros WHERE tipo_mascota IS NOT NULL ORDER BY tipo_mascota
    `).all().map(r => r.tipo_mascota);

    res.json({ ciudades, barrios, tipos_vivienda: tiposVivienda, tipos_mascota: tiposMascota });
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

// ─────────────────────────────────────────────
// GET /api/stats/integrantes-familia
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
// GET /api/stats/combinaciones-medidas
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
// GET /api/stats/panorama
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

// ─────────────────────────────────────────────
// GET /api/stats/salud-completa
// Dashboard completo de Salud Animal con filtros
// Query params: tipo_mascota, ciudad, barrio, tipo_vivienda
// ─────────────────────────────────────────────
router.get('/salud-completa', (req, res) => {
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
        SUM(CASE WHEN mascotas_vacunadas = 'Si' THEN 1 ELSE 0 END) as vacunadas_si,
        SUM(CASE WHEN mascota_castrada = 'Si' THEN 1 ELSE 0 END) as castradas_si,
        SUM(CASE WHEN mascotas_desparasitadas = 'Si' THEN 1 ELSE 0 END) as desparasitadas_si,
        SUM(CASE WHEN conoce_plan_vacunacion = 'Si' THEN 1 ELSE 0 END) as conoce_plan_si,
        SUM(CASE WHEN conoce_castracion_gratis = 'Si' THEN 1 ELSE 0 END) as conoce_castracion_gratis_si,
        SUM(CASE WHEN lugar_castracion_municipio = 1 THEN 1 ELSE 0 END) as uso_municipio,
        SUM(CASE WHEN lugar_castracion_particular = 1 THEN 1 ELSE 0 END) as uso_privado,
        SUM(CASE WHEN mascota_castrada = 'Si' THEN 1 ELSE 0 END) as total_castradas
      FROM registros
      ${where}
    `).get(...params);

    const total = kpis.total || 1;
    const totalCastradas = kpis.total_castradas || 1;

    // ── Vacunación vs Castración (conteos absolutos) ──
    const vacunacionCastracion = {
      vacunacion_si: kpis.vacunadas_si || 0,
      vacunacion_no: total - (kpis.vacunadas_si || 0),
      castracion_si: kpis.castradas_si || 0,
      castracion_no: total - (kpis.castradas_si || 0),
    };

    // ── Vacunación por tipo de mascota ──
    const vacunacionPorTipoMascota = db.prepare(`
      SELECT
        tipo_mascota as tipo,
        SUM(CASE WHEN mascotas_vacunadas = 'Si' THEN 1 ELSE 0 END) as si,
        SUM(CASE WHEN mascotas_vacunadas = 'No' THEN 1 ELSE 0 END) as no
      FROM registros
      ${where}
      AND tipo_mascota IS NOT NULL
      GROUP BY tipo_mascota
    `).all(...params);

    // ── Castración por tipo de mascota ──
    const castracionPorTipoMascota = db.prepare(`
      SELECT
        tipo_mascota as tipo,
        SUM(CASE WHEN mascota_castrada = 'Si' THEN 1 ELSE 0 END) as si,
        SUM(CASE WHEN mascota_castrada = 'No' THEN 1 ELSE 0 END) as no
      FROM registros
      ${where}
      AND tipo_mascota IS NOT NULL
      GROUP BY tipo_mascota
    `).all(...params);

    // ── Lugar de castración por tipo de mascota ──
    const lugarCastracionPorTipoMascota = db.prepare(`
      SELECT
        tipo_mascota as tipo,
        SUM(CASE WHEN lugar_castracion_municipio = 1 AND lugar_castracion_particular = 0 THEN 1 ELSE 0 END) as municipio,
        SUM(CASE WHEN lugar_castracion_particular = 1 AND lugar_castracion_municipio = 0 THEN 1 ELSE 0 END) as privado,
        SUM(CASE WHEN lugar_castracion_municipio = 1 AND lugar_castracion_particular = 1 THEN 1 ELSE 0 END) as ambos
      FROM registros
      ${where}
      AND tipo_mascota IS NOT NULL
      AND mascota_castrada = 'Si'
      GROUP BY tipo_mascota
    `).all(...params);

    // ── Vacunación por tipo de vivienda ──
    const vacunacionPorTipoVivienda = db.prepare(`
      SELECT
        tipo_vivienda as tipo,
        SUM(CASE WHEN mascotas_vacunadas = 'Si' THEN 1 ELSE 0 END) as si,
        SUM(CASE WHEN mascotas_vacunadas = 'No' THEN 1 ELSE 0 END) as no
      FROM registros
      ${where}
      AND tipo_vivienda IS NOT NULL
      GROUP BY tipo_vivienda
    `).all(...params);

    // ── Castración por tipo de vivienda ──
    const castracionPorTipoVivienda = db.prepare(`
      SELECT
        tipo_vivienda as tipo,
        SUM(CASE WHEN mascota_castrada = 'Si' THEN 1 ELSE 0 END) as si,
        SUM(CASE WHEN mascota_castrada = 'No' THEN 1 ELSE 0 END) as no
      FROM registros
      ${where}
      AND tipo_vivienda IS NOT NULL
      GROUP BY tipo_vivienda
    `).all(...params);

    res.json({
      kpis: {
        tasa_vacunacion: total > 0 ? (kpis.vacunadas_si / total) * 100 : 0,
        tasa_castracion: total > 0 ? (kpis.castradas_si / total) * 100 : 0,
        tasa_desparasitacion: total > 0 ? (kpis.desparasitadas_si / total) * 100 : 0,
        conocimiento_plan_vacunacion: total > 0 ? (kpis.conoce_plan_si / total) * 100 : 0,
        conocimiento_castracion_gratis: total > 0 ? (kpis.conoce_castracion_gratis_si / total) * 100 : 0,
        participacion_municipal_castraciones: totalCastradas > 0 ? (kpis.uso_municipio / totalCastradas) * 100 : 0,
        participacion_privado_castraciones: totalCastradas > 0 ? (kpis.uso_privado / totalCastradas) * 100 : 0,
      },
      vacunacion_vs_castracion: vacunacionCastracion,
      vacunacion_por_tipo_mascota: vacunacionPorTipoMascota,
      castracion_por_tipo_mascota: castracionPorTipoMascota,
      lugar_castracion_por_tipo_mascota: lugarCastracionPorTipoMascota,
      vacunacion_por_tipo_vivienda: vacunacionPorTipoVivienda,
      castracion_por_tipo_vivienda: castracionPorTipoVivienda,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/stats/callejeros-completa
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
