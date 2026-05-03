const express = require('express');
const router = express.Router();
const db = require('../../db/database');

// ─────────────────────────────────────────────
// GET /tipos-mascota
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
// GET /castracion
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
// GET /salud
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

// ─────────────────────────────────────────────
// GET /salud-completa
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
    const lugarCastracionRaw = db.prepare(`
      SELECT
        lugar_castracion as lugar,
        tipo_mascota,
        COUNT(*) as cantidad
      FROM registros
      ${where}
      AND lugar_castracion IS NOT NULL
      AND tipo_mascota IS NOT NULL
      GROUP BY lugar_castracion, tipo_mascota
    `).all(...params);

    // Pivot: filas = lugar, columnas = tipo_mascota
    const lugarCastracionPivot = lugarCastracionRaw.reduce((acc, curr) => {
      const { lugar, tipo_mascota, cantidad } = curr;
      if (!acc[lugar]) {
        acc[lugar] = { name: lugar, Perros: 0, Gatos: 0, 'Gatos | Perros': 0 };
      }
      if (tipo_mascota in acc[lugar]) {
        acc[lugar][tipo_mascota] = cantidad;
      }
      return acc;
    }, {});
    const lugarCastracionPorTipoMascota = Object.values(lugarCastracionPivot);


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

    // ── Tipo de mascota por tipo de vivienda (pivot) ──
    const tipoMascotaPorViviendaRaw = db.prepare(`
      SELECT
        tipo_vivienda,
        tipo_mascota,
        COUNT(*) as cantidad
      FROM registros
      ${where}
      AND tipo_vivienda IS NOT NULL
      AND tipo_mascota IS NOT NULL
      GROUP BY tipo_vivienda, tipo_mascota
    `).all(...params);

    const tipoMascotaPorViviendaPivot = tipoMascotaPorViviendaRaw.reduce((acc, curr) => {
      const { tipo_vivienda, tipo_mascota, cantidad } = curr;
      if (!acc[tipo_vivienda]) {
        acc[tipo_vivienda] = { name: tipo_vivienda, Perros: 0, Gatos: 0, 'Gatos | Perros': 0 };
      }
      if (tipo_mascota in acc[tipo_vivienda]) {
        acc[tipo_vivienda][tipo_mascota] = cantidad;
      }
      return acc;
    }, {});
    const tipoMascotaPorTipoVivienda = Object.values(tipoMascotaPorViviendaPivot);

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
      tipo_mascota_por_tipo_vivienda: tipoMascotaPorTipoVivienda,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
