// frontend/src/pages/LeaderboardPage.jsx
import { useState, useEffect } from 'react';
import { leaguesAPI } from '../services/api';
import { Trophy, Medal, Crown } from 'lucide-react';

const LeaderboardPage = () => {
  const [leagues, setLeagues] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeagues();
  }, []);

  useEffect(() => {
    if (selectedSeason) {
      fetchLeaderboard();
    }
  }, [selectedSeason]);

  const fetchLeagues = async () => {
    try {
      const response = await leaguesAPI.getAll();
      setLeagues(response.data.leagues);
      if (response.data.leagues[0]?.activeSeason) {
        setSelectedSeason(response.data.leagues[0].activeSeason.id);
      }
    } catch (error) {
      console.error('Failed to fetch leagues:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await leaguesAPI.getLeaderboard(selectedSeason, { limit: 50 });
      setLeaderboard(response.data.leaderboard);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-orange-600" />;
    return <span className="font-bold text-gray-600">#{rank}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <Trophy className="h-8 w-8 mr-3 text-primary-600" />
          Global Leaderboard
        </h1>

        {/* Season Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select League
          </label>
          <select
            className="input-field max-w-xs"
            value={selectedSeason || ''}
            onChange={(e) => setSelectedSeason(e.target.value)}
          >
            {leagues.map((league) => (
              league.activeSeason && (
                <option key={league.activeSeason.id} value={league.activeSeason.id}>
                  {league.name} - Season {league.activeSeason.season_number}
                </option>
              )
            ))}
          </select>
        </div>

        {/* Leaderboard */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No participants yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((player) => (
              <div
                key={player.userId}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  player.rank <= 3 ? 'bg-gradient-to-r from-yellow-50 to-white' : 'bg-gray-50'
                } hover:shadow-md transition-shadow`}
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className="w-8 flex justify-center">
                    {getRankIcon(player.rank)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {player.displayName || player.username}
                    </p>
                    <p className="text-sm text-gray-600">
                      Rating: {player.rating} • Matches: {player.matches_played}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary-600">
                    {player.points}
                  </p>
                  <p className="text-xs text-gray-500">points</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
