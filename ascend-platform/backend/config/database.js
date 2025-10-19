// backend/config/database.js
import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const { Pool } = pg;

// Database connection pool for efficient connection management
const isProduction = process.env.NODE_ENV === 'production';
const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
const shouldUseSsl = (process.env.DB_SSL === 'true') || (isProduction && hasDatabaseUrl);

const basePoolOptions = {
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

const pool = hasDatabaseUrl
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
      ...basePoolOptions,
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'ascend_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
      ...basePoolOptions,
    });

// Test database connection
pool.on('connect', () => {
  console.log('✓ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  process.exit(-1);
});

// Helper function to run migrations
export async function runMigrations() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const migrationsDir = path.join(__dirname, '../migrations');

  try {
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

    console.log('Running migrations...');
    
    for (const file of sqlFiles) {
      const filePath = path.join(migrationsDir, file);
      const sql = await fs.readFile(filePath, 'utf-8');
      
      console.log(`  → Running ${file}`);
      await pool.query(sql);
      console.log(`  ✓ ${file} completed`);
    }
    
    console.log('✓ All migrations completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

export default pool;
