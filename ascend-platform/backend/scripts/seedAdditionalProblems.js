// backend/scripts/seedAdditionalProblems.js
import fs from 'fs';
import path from 'path';
import pool from '../config/database.js';

async function seedAdditionalProblems() {
  try {
    console.log('🌱 Seeding additional problems...');
    
    // Read the SQL file
    const sqlPath = path.join(process.cwd(), 'seeds', 'additional_problems.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the SQL
    await pool.query(sqlContent);
    
    console.log('✅ Additional problems seeded successfully!');
    
    // Verify the problems were added
    const result = await pool.query('SELECT COUNT(*) FROM problems WHERE is_active = true');
    console.log(`📊 Total active problems: ${result.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error seeding additional problems:', error);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAdditionalProblems();
}

export default seedAdditionalProblems;
