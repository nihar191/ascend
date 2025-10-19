// backend/scripts/createInitialLeague.js
import League from '../models/League.js';
import Season from '../models/Season.js';

export async function createInitialLeague() {
  try {
    console.log('🏆 Checking for initial league and season...');
    
    // Check if any leagues already exist
    const existingLeagues = await League.findAll();
    if (existingLeagues.length > 0) {
      console.log('✓ Leagues already exist, skipping creation');
      return;
    }
    
    console.log('🏆 Creating initial league and season...');
    
    // Create Bronze League
    const league = await League.create({
      name: 'Bronze',
      description: 'Entry league for new players',
      minRating: 0,
      maxRating: null, // No upper limit
      icon: '🥉'
    });
    
    console.log(`✓ Created league: ${league.name} (ID: ${league.id})`);
    
    // Create Season 1 for Bronze League
    const season = await Season.create({
      leagueId: league.id,
      seasonNumber: 1,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      isActive: true
    });
    
    console.log(`✓ Created season: ${season.seasonNumber} for ${league.name} (ID: ${season.id})`);
    
    console.log('🎉 Initial league and season created successfully!');
    console.log('🔄 Matchmaking service should now work properly.');
    
  } catch (error) {
    console.error('❌ Error creating initial league:', error);
  }
}
