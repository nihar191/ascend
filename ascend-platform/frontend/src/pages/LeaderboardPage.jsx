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
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="space-y-4 sm:space-y-8">
          {/* Hero Section */}
          <div className="relative overflow-hidden bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative px-4 sm:px-8 py-6 sm:py-12 text-center">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2 sm:mb-4 flex items-center justify-center">
                <Trophy className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 mr-2 sm:mr-4" />
                Leaderboard
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-orange-100 mb-4 sm:mb-8">
                Top competitive programmers
              </p>
              <div className="flex justify-center">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl sm:rounded-2xl px-4 sm:px-6 py-2 sm:py-3">
                  <span className="text-white font-semibold text-sm sm:text-base">
                    {leaderboard.length} {leaderboard.length === 1 ? 'Player' : 'Players'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl border border-gray-100 overflow-hidden">

            {/* View Mode Selector */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-3 sm:px-6 py-3 sm:py-4">
              <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:gap-4">
                <div className="flex space-x-2">
                  <button
                    onClick={() => setViewMode('global')}
                    className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all duration-200 text-sm sm:text-base ${
                      viewMode === 'global'
                        ? 'bg-white text-blue-600 shadow-lg'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    🌍 Global
                  </button>
                  <button
                    onClick={() => setViewMode('season')}
                    className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all duration-200 text-sm sm:text-base ${
                      viewMode === 'season'
                        ? 'bg-white text-purple-600 shadow-lg'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    🏆 Season
                  </button>
                </div>
                
                {viewMode === 'season' && (
                  <div className="flex-1">
                    <select
                      className="w-full bg-white/20 backdrop-blur-sm text-white border border-white/30 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm sm:text-base"
                      value={selectedSeason || ''}
                      onChange={(e) => setSelectedSeason(e.target.value)}
                    >
                      <option value="" className="text-gray-800">Select League Season</option>
                      {leagues.map((league) => (
                        league.activeSeason && (
                          <option key={league.activeSeason.id} value={league.activeSeason.id} className="text-gray-800">
                            {league.name} - S{league.activeSeason.season_number}
                          </option>
                        )
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Leaderboard */}
            <div className="p-3 sm:p-6">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="text-center py-12">
                  <Trophy className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2">No participants yet</h3>
                  <p className="text-sm sm:text-base text-gray-500">Be the first to join the competition!</p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-4">
                  {leaderboard.map((player, index) => (
                    <div
                      key={player.userId}
                      className={`group relative overflow-hidden rounded-xl sm:rounded-2xl transition-all duration-300 ${
                        player.rank <= 3 
                          ? player.rank === 1 
                            ? 'bg-gradient-to-r from-yellow-100 via-yellow-50 to-orange-50 border-2 border-yellow-300 shadow-md sm:shadow-lg' 
                            : player.rank === 2
                            ? 'bg-gradient-to-r from-gray-100 via-gray-50 to-slate-50 border-2 border-gray-300 shadow-md sm:shadow-lg'
                            : 'bg-gradient-to-r from-orange-100 via-orange-50 to-red-50 border-2 border-orange-300 shadow-md sm:shadow-lg'
                          : 'bg-gradient-to-r from-white to-gray-50 border border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      {/* Rank Badge */}
                      <div className={`absolute top-2 left-2 sm:top-4 sm:left-4 w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-sm sm:text-lg ${
                        player.rank === 1 ? 'bg-yellow-500 text-white' :
                        player.rank === 2 ? 'bg-gray-400 text-white' :
                        player.rank === 3 ? 'bg-orange-500 text-white' :
                        'bg-blue-500 text-white'
                      }`}>
                        {player.rank}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 pl-12 sm:p-6 sm:pl-20 space-y-3 sm:space-y-0">
                        <div className="flex items-center space-x-3 sm:space-x-6 flex-1 min-w-0">
                          <div className="w-10 h-10 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-base sm:text-lg lg:text-xl font-bold flex-shrink-0">
                            {(player.displayName || player.username).charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1 sm:mb-2">
                              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 truncate">
                                {player.displayName || player.username}
                              </h3>
                              {player.rank <= 3 && (
                                <div className="flex items-center flex-shrink-0">
                                  {player.rank === 1 && <span className="text-lg sm:text-xl lg:text-2xl">👑</span>}
                                  {player.rank === 2 && <span className="text-lg sm:text-xl lg:text-2xl">🥈</span>}
                                  {player.rank === 3 && <span className="text-lg sm:text-xl lg:text-2xl">🥉</span>}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                              <span className="flex items-center whitespace-nowrap">
                                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full mr-1 sm:mr-2"></span>
                                <span className="font-semibold">{player.rating}</span>
                              </span>
                              <span className="flex items-center whitespace-nowrap">
                                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full mr-1 sm:mr-2"></span>
                                {player.matches_played} <span className="hidden sm:inline ml-1">matches</span>
                              </span>
                              {viewMode === 'global' && player.win_rate !== undefined && (
                                <span className="flex items-center whitespace-nowrap">
                                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-500 rounded-full mr-1 sm:mr-2"></span>
                                  {player.win_rate}% <span className="hidden sm:inline ml-1">wins</span>
                                </span>
                              )}
                              {viewMode === 'season' && (
                                <span className="flex items-center whitespace-nowrap">
                                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-orange-500 rounded-full mr-1 sm:mr-2"></span>
                                  {player.points || 0} <span className="hidden sm:inline ml-1">pts</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right sm:pl-4">
                          <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-0.5 sm:mb-1">
                            {viewMode === 'global' ? player.rating : player.points || 0}
                          </div>
                          <p className="text-xs sm:text-sm text-gray-500 font-medium">
                            {viewMode === 'global' ? 'rating' : 'points'}
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