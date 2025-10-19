// backend/scripts/seedDefaultLeagues.js
import dotenv from 'dotenv';
import League from '../models/League.js';
import Season from '../models/Season.js';

dotenv.config();

/**
 * Create default leagues and seasons for the platform
 */
async function seedDefaultLeagues() {
  console.log('🏆 Seeding default leagues and seasons...\n');

  try {
    // Check if leagues already exist
    const existingLeagues = await League.findAll();
    if (existingLeagues.length > 0) {
      console.log('✓ Leagues already exist, skipping creation');
      return;
    }

    // Create default leagues
    const leagues = [
      {
        name: 'Bronze League',
        description: 'For beginners and newcomers to competitive programming',
        minRating: 0,
        maxRating: 1200,
        icon: '🥉'
      },
      {
        name: 'Silver League',
        description: 'For intermediate programmers looking to improve',
        minRating: 1200,
        maxRating: 1600,
        icon: '🥈'
      },
      {
        name: 'Gold League',
        description: 'For advanced programmers and experienced competitors',
        minRating: 1600,
        maxRating: 2000,
        icon: '🥇'
      },
      {
        name: 'Platinum League',
        description: 'For expert programmers and top performers',
        minRating: 2000,
        maxRating: null, // No upper limit
        icon: '💎'
      }
    ];

    const createdLeagues = [];
    for (const leagueData of leagues) {
      const league = await League.create(leagueData);
      createdLeagues.push(league);
      console.log(`  ✓ Created ${league.name} (${league.min_rating} - ${league.max_rating || '∞'})`);
    }

    // Create active seasons for each league
    const now = new Date();
    const seasonStart = new Date(now.getFullYear(), now.getMonth(), 1); // Start of current month
    const seasonEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of current month

    for (const league of createdLeagues) {
      const season = await Season.create({
        leagueId: league.id,
        seasonNumber: 1,
        startDate: seasonStart.toISOString(),
        endDate: seasonEnd.toISOString(),
        isActive: true
      });
      console.log(`  ✓ Created Season 1 for ${league.name}`);
    }

    console.log('\n✓ Default leagues and seasons created successfully!');
    console.log('🎮 Matchmaking should now work properly.');

  } catch (error) {
    console.error('❌ Failed to seed default leagues:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDefaultLeagues()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export default seedDefaultLeagues;
