// frontend/src/pages/LeaderboardPage.jsx
import { useState, useEffect } from 'react';
import { leaguesAPI } from '../services/api';
import { Trophy, Medal, Crown } from 'lucide-react';

const LeaderboardPage = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('global'); // 'global' or 'season'
  const [leagues, setLeagues] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);

  useEffect(() => {
    fetchGlobalLeaderboard();
    fetchLeagues();
  }, []);

  useEffect(() => {
    if (selectedSeason && viewMode === 'season') {
      fetchSeasonLeaderboard();
    }
  }, [selectedSeason, viewMode]);

  const fetchLeagues = async () => {
    try {
      const response = await leaguesAPI.getAll();
      setLeagues(response.data.leagues);
      if (response.data.leagues[0]?.activeSeason) {
        setSelectedSeason(response.data.leagues[0].activeSeason.id);
      }
    } catch (error) {
      console.error('Failed to fetch leagues:', error);
    }
  };

  const fetchGlobalLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await leaguesAPI.getGlobalLeaderboard({ limit: 50 });
      setLeaderboard(response.data.leaderboard);
    } catch (error) {
      console.error('Failed to fetch global leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSeasonLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await leaguesAPI.getLeaderboard(selectedSeason, { limit: 50 });
      setLeaderboard(response.data.leaderboard);
    } catch (error) {
      console.error('Failed to fetch season leaderboard:', error);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Hero Section */}
          <div className="relative overflow-hidden bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-3xl shadow-2xl">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative px-8 py-12 text-center">
              <h1 className="text-5xl font-bold text-white mb-4 flex items-center justify-center">
                <Trophy className="h-12 w-12 mr-4" />
                Global Leaderboard
              </h1>
              <p className="text-xl text-orange-100 mb-8">
                See how you stack up against the best competitive programmers
              </p>
              <div className="flex justify-center">
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-3">
                  <span className="text-white font-semibold">
                    {leaderboard.length} {leaderboard.length === 1 ? 'Player' : 'Players'} Competing
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">

            {/* View Mode Selector */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex space-x-2">
                  <button
                    onClick={() => setViewMode('global')}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 ${
                      viewMode === 'global'
                        ? 'bg-white text-blue-600 shadow-lg'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    🌍 Global Leaderboard
                  </button>
                  <button
                    onClick={() => setViewMode('season')}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 ${
                      viewMode === 'season'
                        ? 'bg-white text-purple-600 shadow-lg'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    🏆 Season Leaderboard
                  </button>
                </div>
                
                {viewMode === 'season' && (
                  <div className="flex-1">
                    <select
                      className="w-full sm:max-w-xs bg-white/20 backdrop-blur-sm text-white border border-white/30 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/50"
                      value={selectedSeason || ''}
                      onChange={(e) => setSelectedSeason(e.target.value)}
                    >
                      <option value="" className="text-gray-800">Select League Season</option>
                      {leagues.map((league) => (
                        league.activeSeason && (
                          <option key={league.activeSeason.id} value={league.activeSeason.id} className="text-gray-800">
                            {league.name} - Season {league.activeSeason.season_number}
                          </option>
                        )
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Leaderboard */}
            <div className="p-6">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No participants yet</h3>
                  <p className="text-gray-500">Be the first to join the competition!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {leaderboard.map((player, index) => (
                    <div
                      key={player.userId}
                      className={`group relative overflow-hidden rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-xl ${
                        player.rank <= 3 
                          ? player.rank === 1 
                            ? 'bg-gradient-to-r from-yellow-100 via-yellow-50 to-orange-50 border-2 border-yellow-300 shadow-lg' 
                            : player.rank === 2
                            ? 'bg-gradient-to-r from-gray-100 via-gray-50 to-slate-50 border-2 border-gray-300 shadow-lg'
                            : 'bg-gradient-to-r from-orange-100 via-orange-50 to-red-50 border-2 border-orange-300 shadow-lg'
                          : 'bg-gradient-to-r from-white to-gray-50 border border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      {/* Rank Badge */}
                      <div className={`absolute top-4 left-4 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                        player.rank === 1 ? 'bg-yellow-500 text-white' :
                        player.rank === 2 ? 'bg-gray-400 text-white' :
                        player.rank === 3 ? 'bg-orange-500 text-white' :
                        'bg-blue-500 text-white'
                      }`}>
                        {player.rank}
                      </div>

                      <div className="flex items-center justify-between p-6 pl-20">
                        <div className="flex items-center space-x-6 flex-1">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
                            {(player.displayName || player.username).charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-xl font-bold text-gray-900">
                                {player.displayName || player.username}
                              </h3>
                              {player.rank <= 3 && (
                                <div className="flex items-center space-x-1">
                                  {player.rank === 1 && <span className="text-2xl">👑</span>}
                                  {player.rank === 2 && <span className="text-2xl">🥈</span>}
                                  {player.rank === 3 && <span className="text-2xl">🥉</span>}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center">
                                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                Rating: <span className="font-semibold ml-1">{player.rating}</span>
                              </span>
                              <span className="flex items-center">
                                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                Matches: <span className="font-semibold ml-1">{player.matches_played}</span>
                              </span>
                              {viewMode === 'global' && player.win_rate !== undefined && (
                                <span className="flex items-center">
                                  <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                                  Win Rate: <span className="font-semibold ml-1">{player.win_rate}%</span>
                                </span>
                              )}
                              {viewMode === 'season' && (
                                <span className="flex items-center">
                                  <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                                  Points: <span className="font-semibold ml-1">{player.points || 0}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-gray-900 mb-1">
                            {viewMode === 'global' ? player.rating : player.points || 0}
                          </div>
                          <p className="text-sm text-gray-500 font-medium">
                            {viewMode === 'global' ? 'rating points' : 'season points'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;
