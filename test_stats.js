// Test script to verify stats update
import User from './ascend-platform/backend/models/User.js';
import pool from './ascend-platform/backend/config/database.js';

async function testStatsUpdate() {
  try {
    console.log('🧪 Testing stats update...');
    
    // Find a user to test with
    const user = await User.findByUsername('nihar_191');
    if (!user) {
      console.log('❌ User nihar_191 not found');
      return;
    }
    
    console.log('👤 Current user stats:', {
      id: user.id,
      username: user.username,
      total_matches: user.total_matches,
      wins: user.wins,
      losses: user.losses
    });
    
    // Update stats
    console.log('🔄 Updating stats...');
    const updatedStats = await User.updateStats(user.id, { won: true });
    
    console.log('✅ Updated stats:', updatedStats);
    
    // Verify the update
    const updatedUser = await User.findById(user.id);
    console.log('🔍 Verification - new stats:', {
      total_matches: updatedUser.total_matches,
      wins: updatedUser.wins,
      losses: updatedUser.losses
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

testStatsUpdate();
