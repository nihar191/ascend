// frontend/src/pages/DashboardPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { matchesAPI, leaguesAPI } from '../services/api';
import socketService from '../services/socket';
import { AppPersistence } from '../utils/persistence';
import { Play, Trophy, Clock, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const DashboardPage = () => {
  const { user, refreshProfile, loading } = useAuth();
  const navigate = useNavigate();
  const [queueing, setQueueing] = useState(false);
  const [activeMatches, setActiveMatches] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState(() => {
    const prefs = AppPersistence.getUserPreferences();
    return prefs.selectedDifficulty;
  });
  const [userRank, setUserRank] = useState(null);

  // Fetch dashboard data on mount and when returning from match
  useEffect(() => {
    if (user) {
      fetchData();
      // Check if user was in queue before refresh
      const queueState = AppPersistence.getQueueState();
      if (queueState && queueState.queueing) {
        setQueueing(true);
        socketService.joinMatchmaking(queueState.data);
      }
    }
    
    // Refresh data when returning from a match
    const handleFocus = () => {
      console.log('🔄 Dashboard focused, refreshing data...');
      if (user) {
        fetchData();
        refreshProfile(); // Also refresh user profile data
      }
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]); // Add user as dependency

  // Save difficulty preference when changed
  useEffect(() => {
    AppPersistence.saveUserPreferences({ selectedDifficulty });
  }, [selectedDifficulty]);

  const fetchData = async () => {
    try {
      console.log('🔄 Fetching dashboard data...');
      const [matchesRes, leaguesRes, leaderboardRes] = await Promise.all([
        matchesAPI.getActive(),
        leaguesAPI.getAll(),
        leaguesAPI.getGlobalLeaderboard({ limit: 1000 }), // Get all users to find rank
      ]);
      
      console.log('📊 Dashboard data fetched:', {
        matches: matchesRes.data,
        leagues: leaguesRes.data,
        leaderboard: leaderboardRes.data
      });
      
      setActiveMatches(matchesRes.data.matches || []);
      setLeagues(leaguesRes.data.leagues || []);
      
      // Find user's rank in global leaderboard
      if (user && leaderboardRes.data.leaderboard) {
        const userRankIndex = leaderboardRes.data.leaderboard.findIndex(
          player => player.userId === user.id
        );
        setUserRank(userRankIndex >= 0 ? userRankIndex + 1 : null);
      }
    } catch (error) {
      console.error('❌ Failed to fetch dashboard data:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error('Failed to load dashboard data');
    }
  };

  // Socket handler for "match found": redirect both players
  useEffect(() => {
    console.log('🎯 Setting up match_found listener in DashboardPage');
    const handler = (data) => {
      console.log('🎉 MATCH FOUND! Received matchmaking:match_found event:', data);
      toast.success('Match found!');
      setQueueing(false);
      AppPersistence.clearQueueState(); // Clear queue state when match is found
      navigate(`/match/${data.matchId}`);
    };

    // Set up listener immediately - socket service will handle connection timing
    socketService.onMatchFound(handler);

    return () => {
      console.log('🧹 Cleaning up match_found listener in DashboardPage');
      socketService.off('matchmaking:match_found');
    };
  }, [navigate]);
  

  // Join queue
  const handleJoinQueue = async () => {
    setQueueing(true);
    const queueData = {
      matchType: '1v1',
      preferences: { difficulty: selectedDifficulty, rating: user?.rating },
    };
    
    // Save queue state
    AppPersistence.saveQueueState({
      queueing: true,
      data: queueData
    });
    
    try {
      await matchesAPI.joinQueue({
        matchType: '1v1',
        preferences: { difficulty: selectedDifficulty },
      });
      socketService.joinMatchmaking(queueData);
      toast.success('Searching for opponent...');
    } catch (error) {
      toast.error('Failed to join queue');
      setQueueing(false);
      AppPersistence.clearQueueState();
    }
  };

  // Leave queue
  const handleLeaveQueue = async () => {
    try {
      await matchesAPI.leaveQueue();
      socketService.leaveMatchmaking();
      setQueueing(false);
      AppPersistence.clearQueueState();
      toast.success('Left queue');
    } catch (error) {
      toast.error('Failed to leave queue');
    }
  };

  // Show loading state while user is being fetched
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Loading Dashboard...</h2>
          <p className="text-gray-500">Please wait while we load your data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-3xl shadow-2xl">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative px-8 py-12">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <h1 className="text-4xl font-bold mb-2">
                  Welcome back, {user?.displayName || user?.username}! 👋
                </h1>
                <p className="text-blue-100 text-lg mb-6">
                  Ready to climb the competitive programming ladder?
                </p>
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3">
                    <Trophy className="h-6 w-6 mr-3 text-yellow-300" />
                    <div>
                      <p className="text-sm text-blue-100">Rating</p>
                      <p className="text-2xl font-bold text-white">{user?.rating || 1000}</p>
                    </div>
                  </div>
                  <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3">
                    <Users className="h-6 w-6 mr-3 text-green-300" />
                    <div>
                      <p className="text-sm text-blue-100">Matches</p>
                      <p className="text-2xl font-bold text-white">{user?.stats?.totalMatches || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3">
                    <Trophy className="h-6 w-6 mr-3 text-orange-300" />
                    <div>
                      <p className="text-sm text-blue-100">Wins</p>
                      <p className="text-2xl font-bold text-white">{user?.stats?.wins || 0}</p>
                    </div>
                  </div>
                  {userRank && (
                    <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3">
                      <Trophy className="h-6 w-6 mr-3 text-purple-300" />
                      <div>
                        <p className="text-sm text-blue-100">Global Rank</p>
                        <p className="text-2xl font-bold text-white">#{userRank}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="w-32 h-32 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <Trophy className="h-16 w-16 text-white/80" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Matchmaking Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <Play className="h-6 w-6 mr-3" />
              Quick Match
            </h2>
            <p className="text-green-100">Find your next coding challenge</p>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Select Difficulty Level
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'easy', label: 'Easy', color: 'green', icon: '🟢' },
                    { key: 'medium', label: 'Medium', color: 'yellow', icon: '🟡' },
                    { key: 'hard', label: 'Hard', color: 'red', icon: '🔴' }
                  ].map((diff) => (
                    <button
                      key={diff.key}
                      onClick={() => setSelectedDifficulty(diff.key)}
                      className={`relative p-4 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 ${
                        selectedDifficulty === diff.key
                          ? `bg-${diff.color}-500 text-white shadow-lg`
                          : `bg-${diff.color}-50 text-${diff.color}-700 hover:bg-${diff.color}-100 border-2 border-${diff.color}-200`
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-2xl mb-1">{diff.icon}</span>
                        <span>{diff.label}</span>
                      </div>
                      {selectedDifficulty === diff.key && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {!queueing ? (
                <button 
                  onClick={handleJoinQueue} 
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center justify-center"
                >
                  <Play className="h-6 w-6 mr-3" />
                  Find Match
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 text-center">
                    <div className="flex items-center justify-center space-x-3 text-blue-600 mb-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="font-semibold text-lg">Searching for opponent...</span>
                    </div>
                    <p className="text-gray-600">Please wait while we find a suitable match</p>
                  </div>
                  <button 
                    onClick={handleLeaveQueue} 
                    className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200"
                  >
                    Cancel Search
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active Matches - Only show if user has active matches */}
        {activeMatches.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Clock className="h-6 w-6 mr-3" />
                Your Active Matches
              </h2>
              <p className="text-orange-100">Continue where you left off</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {activeMatches.map((match) => (
                  <div
                    key={match.id}
                    className="group bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 hover:from-blue-100 hover:via-indigo-100 hover:to-purple-100 rounded-xl p-6 cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-lg border border-blue-200"
                    onClick={() => navigate(`/match/${match.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-bold text-lg text-gray-900">{match.problem_title || 'Live Problem'}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            match.status === 'in_progress' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {match.status === 'in_progress' ? '🟢 In Progress' : '⏳ Waiting'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span className="flex items-center">
                            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                            {match.match_type?.toUpperCase() || '1v1'}
                          </span>
                          <span className="flex items-center">
                            <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                            {match.problem_difficulty || 'Medium'} Difficulty
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            {match.status === 'in_progress' ? 'Continue' : 'Join'}
                          </p>
                        </div>
                        <button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 transform group-hover:scale-105">
                          {match.status === 'in_progress' ? 'Continue' : 'Join Match'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Leagues */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
            <h2 className="text-2xl font-bold text-white flex items-center">
              <Trophy className="h-6 w-6 mr-3" />
              Competitive Leagues
            </h2>
            <p className="text-purple-100">Join the competition</p>
          </div>
          <div className="p-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {leagues.map((league) => (
                <div 
                  key={league.id} 
                  className="group bg-gradient-to-br from-white to-gray-50 hover:from-purple-50 hover:to-pink-50 rounded-xl p-6 border border-gray-200 hover:border-purple-300 transition-all duration-300 transform hover:scale-105 hover:shadow-lg cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-4xl">{league.icon}</div>
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                  <h3 className="font-bold text-xl text-gray-900 mb-2 group-hover:text-purple-700 transition-colors">
                    {league.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{league.description}</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Rating Range</span>
                      <span className="font-semibold">{league.min_rating} - {league.max_rating}</span>
                    </div>
                    {league.stats && (
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Players</span>
                        <span className="font-semibold text-green-600">{league.stats.total_users}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
