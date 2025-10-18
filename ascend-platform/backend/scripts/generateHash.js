// backend/scripts/generateHash.js
import bcrypt from 'bcryptjs';

const password = process.argv[2] || 'Admin@123';

bcrypt.hash(password, 10).then(hash => {
  console.log('\nGenerated password hash:');
  console.log(hash);
  console.log('\nUse this in your seed.sql file for the admin user\n');
}).catch(err => {
  console.error('Error generating hash:', err);
});
