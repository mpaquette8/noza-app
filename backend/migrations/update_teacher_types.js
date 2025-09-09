const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrateTeacherTypes() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Mapping des anciens types vers les nouveaux
    const mappings = [
      { old: 'calculator', new: 'direct' },
      { old: 'experimenter', new: 'immersif' },
      { old: 'memorizer', new: 'structure' }
    ];
    
    for (const { old, new: newType } of mappings) {
      await client.query(
        'UPDATE courses SET teacher_type = $1 WHERE teacher_type = $2',
        [newType, old]
      );
    }
    
    // Mettre tous les types invalides vers le type par défaut
    await client.query(
      'UPDATE courses SET teacher_type = $1 WHERE teacher_type NOT IN ($1, $2, $3)',
      ['direct', 'structure', 'immersif']
    );
    
    await client.query('COMMIT');
    console.log('Migration terminée avec succès');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erreur migration:', error);
    throw error;
  } finally {
    client.release();
    pool.end();
  }
}

migrateTeacherTypes();
