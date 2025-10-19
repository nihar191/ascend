// backend/scripts/promoteToAdmin.js
import pool from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function promoteToAdmin(username) {
  try {
    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE username = $2 RETURNING id, username, role',
      ['admin', username]
    );

    if (result.rows.length === 0) {
      console.log(`❌ User '${username}' not found`);
    } else {
      console.log(`✅ User '${username}' promoted to admin:`, result.rows[0]);
    }
  } catch (error) {
    console.error('Error promoting user:', error);
  } finally {
    process.exit(0);
  }
}

const username = process.argv[2];
if (!username) {
  console.log('Usage: node scripts/promoteToAdmin.js <username>');
  process.exit(1);
}

promoteToAdmin(username);
