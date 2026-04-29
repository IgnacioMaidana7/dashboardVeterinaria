const express = require('express');
const cors = require('cors');
const path = require('path');

const { createSchema } = require('./db/schema');
const { seedDatabase } = require('./db/seed');
const statsRouter = require('./routes/stats');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'],
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());

// ─── Inicialización de DB ─────────────────────
async function initDatabase() {
  try {
    createSchema();
    await seedDatabase();
    console.log('🗄️  Base de datos lista.');
  } catch (err) {
    console.error('❌ Error al inicializar la base de datos:', err);
    process.exit(1);
  }
}

// ─── Rutas ────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    message: '🐾 API Dashboard Veterinaria',
    version: '1.0.0',
    endpoints: {
      resumen: 'GET /api/stats/resumen',
      por_ciudad: 'GET /api/stats/por-ciudad',
      por_barrio: 'GET /api/stats/por-barrio?limit=20&ciudad=San Francisco',
      tipos_mascota: 'GET /api/stats/tipos-mascota',
      castracion: 'GET /api/stats/castracion',
      salud: 'GET /api/stats/salud',
      estilo_vida: 'GET /api/stats/estilo-vida',
      callejeros: 'GET /api/stats/callejeros',
      medidas_municipio: 'GET /api/stats/medidas-municipio',
      tipo_vivienda: 'GET /api/stats/tipo-vivienda',
      evolucion_temporal: 'GET /api/stats/evolucion-temporal',
      registros: 'GET /api/stats/registros?page=1&limit=50&ciudad=&barrio=&castrada=',
      filtros: 'GET /api/stats/filtros',
    },
  });
});

app.use('/api/stats', statsRouter);

// ─── 404 Handler ─────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

// ─── Error Handler ───────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor', detail: err.message });
});

// ─── Start ────────────────────────────────────
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📊 API disponible en http://localhost:${PORT}/api/stats/resumen\n`);
  });
});