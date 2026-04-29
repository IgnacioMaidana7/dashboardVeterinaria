const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const db = require('./database');

const CSV_PATH = path.join(__dirname, '..', 'Base_Mascotas_estandarizada.csv');

function boolCol(val) {
  if (!val || val.trim() === '') return 0;
  return val.trim().toLowerCase() !== '' ? 1 : 0;
}

function containsWord(str, word) {
  if (!str) return 0;
  return str.toLowerCase().includes(word.toLowerCase()) ? 1 : 0;
}

function safeInt(val) {
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? 0 : parsed;
}

async function seedDatabase() {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM registros').get();
  if (count.cnt > 0) {
    console.log(`⚠️  La base de datos ya contiene ${count.cnt} registros. Saltando seed.`);
    return;
  }

  console.log('📥 Importando CSV a SQLite...');

  const insert = db.prepare(`
    INSERT INTO registros (
      fecha_registro, ciudad, barrio_original, barrio_estandarizado,
      altura_domicilio, tipo_vivienda, integrantes_familia,
      tipo_mascota, tiene_gatos, tiene_perros,
      perros_macho, perros_hembra, total_perros,
      gatos_macho, gatos_hembra, total_gatos, total_mascotas,
      mascota_castrada, lugar_castracion,
      lugar_castracion_particular, lugar_castracion_municipio, lugar_castracion_no_castrada,
      conoce_castracion_gratis, mascotas_vacunadas, mascotas_desparasitadas,
      conoce_plan_vacunacion, estilo_vida_mascota,
      estilo_salen_solos, estilo_tienen_identificador, estilo_viven_dentro,
      frecuencia_callejeros, tipo_animal_abandonado,
      animal_abandonado_gatos, animal_abandonado_perros,
      medidas_exigidas,
      medida_castraciones, medida_identificacion, medida_educacion, medida_no_necesaria,
      autopercepcion_responsabilidad
    ) VALUES (
      @fecha_registro, @ciudad, @barrio_original, @barrio_estandarizado,
      @altura_domicilio, @tipo_vivienda, @integrantes_familia,
      @tipo_mascota, @tiene_gatos, @tiene_perros,
      @perros_macho, @perros_hembra, @total_perros,
      @gatos_macho, @gatos_hembra, @total_gatos, @total_mascotas,
      @mascota_castrada, @lugar_castracion,
      @lugar_castracion_particular, @lugar_castracion_municipio, @lugar_castracion_no_castrada,
      @conoce_castracion_gratis, @mascotas_vacunadas, @mascotas_desparasitadas,
      @conoce_plan_vacunacion, @estilo_vida_mascota,
      @estilo_salen_solos, @estilo_tienen_identificador, @estilo_viven_dentro,
      @frecuencia_callejeros, @tipo_animal_abandonado,
      @animal_abandonado_gatos, @animal_abandonado_perros,
      @medidas_exigidas,
      @medida_castraciones, @medida_identificacion, @medida_educacion, @medida_no_necesaria,
      @autopercepcion_responsabilidad
    )
  `);

  const rows = [];

  await new Promise((resolve, reject) => {
    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on('data', (row) => {
        rows.push({
          fecha_registro: row['fecha_registro'] || null,
          ciudad: row['ciudad'] || null,
          barrio_original: row['barrio_original'] || null,
          barrio_estandarizado: row['barrio_estandarizado'] || null,
          altura_domicilio: row['altura_domicilio'] || null,
          tipo_vivienda: row['tipo_vivienda'] || null,
          integrantes_familia: safeInt(row['integrantes_familia']),
          tipo_mascota: row['tipo_mascota'] || null,
          tiene_gatos: boolCol(row['tipo_mascota_[Gatos]']),
          tiene_perros: boolCol(row['tipo_mascota_[Perros]']),
          perros_macho: row['perros_macho'] || '0',
          perros_hembra: row['perros_hembra'] || '0',
          total_perros: row['total_perros'] || '0',
          gatos_macho: row['gatos_macho'] || '0',
          gatos_hembra: row['gatos_hembra'] || '0',
          total_gatos: row['total_gatos'] || '0',
          total_mascotas: row['total_mascotas'] || '0',
          mascota_castrada: row['mascota_castrada'] || null,
          lugar_castracion: row['lugar_castracion'] || null,
          lugar_castracion_particular: boolCol(row['lugar_castracion_[En forma particular]']),
          lugar_castracion_municipio: boolCol(row['lugar_castracion_[Municipio]']),
          lugar_castracion_no_castrada: boolCol(row['lugar_castracion_[No se encuentra castrada.]']),
          conoce_castracion_gratis: row['conoce_castracion_gratis'] || null,
          mascotas_vacunadas: row['mascotas_vacunadas'] || null,
          mascotas_desparasitadas: row['mascotas_desparasitadas'] || null,
          conoce_plan_vacunacion: row['conoce_plan_vacunacion'] || null,
          estilo_vida_mascota: row['estilo_vida_mascota'] || null,
          estilo_salen_solos: boolCol(row['estilo_vida_mascota_[Salen solos a la calle]']),
          estilo_tienen_identificador: boolCol(row['estilo_vida_mascota_[Tienen identificador]']),
          estilo_viven_dentro: boolCol(row['estilo_vida_mascota_[Viven dentro de su hogar]']),
          frecuencia_callejeros: row['frecuencia_callejeros'] || null,
          tipo_animal_abandonado: row['tipo_animal_abandonado'] || null,
          animal_abandonado_gatos: boolCol(row['tipo_animal_abandonado_[Gatos]']),
          animal_abandonado_perros: boolCol(row['tipo_animal_abandonado_[Perros]']),
          medidas_exigidas: row['medidas_exigidas_municipio'] || null,
          medida_castraciones: boolCol(row['medidas_exigidas_municipio_[Castraciones masivas]']),
          medida_identificacion: boolCol(row['medidas_exigidas_municipio_[Control de identificación]']),
          medida_educacion: boolCol(row['medidas_exigidas_municipio_[Educación]']),
          medida_no_necesaria: boolCol(row['medidas_exigidas_municipio_[No es necesaria la participación del municipio]']),
          autopercepcion_responsabilidad: row['autopercepcion_responsabilidad'] || null,
        });
      })
      .on('end', resolve)
      .on('error', reject);
  });

  // Bulk insert using transaction for performance
  const bulkInsert = db.transaction((records) => {
    for (const row of records) {
      insert.run(row);
    }
  });

  bulkInsert(rows);
  console.log(`✅ ${rows.length} registros importados exitosamente a SQLite.`);
}

module.exports = { seedDatabase };
