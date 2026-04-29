const db = require('./database');

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS registros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha_registro TEXT,
      ciudad TEXT,
      barrio_original TEXT,
      barrio_estandarizado TEXT,
      altura_domicilio TEXT,
      tipo_vivienda TEXT,
      integrantes_familia INTEGER,
      tipo_mascota TEXT,
      tiene_gatos INTEGER DEFAULT 0,
      tiene_perros INTEGER DEFAULT 0,
      perros_macho TEXT,
      perros_hembra TEXT,
      total_perros TEXT,
      gatos_macho TEXT,
      gatos_hembra TEXT,
      total_gatos TEXT,
      total_mascotas TEXT,
      mascota_castrada TEXT,
      lugar_castracion TEXT,
      lugar_castracion_particular INTEGER DEFAULT 0,
      lugar_castracion_municipio INTEGER DEFAULT 0,
      lugar_castracion_no_castrada INTEGER DEFAULT 0,
      conoce_castracion_gratis TEXT,
      mascotas_vacunadas TEXT,
      mascotas_desparasitadas TEXT,
      conoce_plan_vacunacion TEXT,
      estilo_vida_mascota TEXT,
      estilo_salen_solos INTEGER DEFAULT 0,
      estilo_tienen_identificador INTEGER DEFAULT 0,
      estilo_viven_dentro INTEGER DEFAULT 0,
      frecuencia_callejeros TEXT,
      tipo_animal_abandonado TEXT,
      animal_abandonado_gatos INTEGER DEFAULT 0,
      animal_abandonado_perros INTEGER DEFAULT 0,
      medidas_exigidas TEXT,
      medida_castraciones INTEGER DEFAULT 0,
      medida_identificacion INTEGER DEFAULT 0,
      medida_educacion INTEGER DEFAULT 0,
      medida_no_necesaria INTEGER DEFAULT 0,
      autopercepcion_responsabilidad TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_ciudad ON registros(ciudad);
    CREATE INDEX IF NOT EXISTS idx_barrio ON registros(barrio_estandarizado);
    CREATE INDEX IF NOT EXISTS idx_fecha ON registros(fecha_registro);
    CREATE INDEX IF NOT EXISTS idx_tipo_mascota ON registros(tipo_mascota);
    CREATE INDEX IF NOT EXISTS idx_castrada ON registros(mascota_castrada);
  `);

  console.log('✅ Schema creado exitosamente');
}

module.exports = { createSchema };
