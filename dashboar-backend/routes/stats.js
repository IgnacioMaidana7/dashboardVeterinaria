const express = require('express');
const router = express.Router();

// Importar los enrutadores modulares por vista
const panoramaRouter = require('./stats/panorama');
const saludRouter = require('./stats/salud');
const callejerosRouter = require('./stats/callejeros');
const municipioRouter = require('./stats/municipio');
const generalRouter = require('./stats/general');

// Montar las rutas en la raíz de /api/stats
router.use('/', panoramaRouter);
router.use('/', saludRouter);
router.use('/', callejerosRouter);
router.use('/', municipioRouter);
router.use('/', generalRouter);

module.exports = router;
