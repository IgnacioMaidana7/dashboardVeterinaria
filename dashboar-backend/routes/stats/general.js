const express = require('express');
const router = express.Router();
const db = require('../../db/database');

// ─────────────────────────────────────────────
// GET /registros
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
// GET /filtros
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

module.exports = router;
