// frontend/src/pages/DashboardPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { matchesAPI, leaguesAPI } from '../services/api';
import socketService from '../services/socket';
import { Play, Trophy, Clock, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const DashboardPage = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [queueing, setQueueing] = useState(false);
  const [activeMatches, setActiveMatches] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState('medium');
  const [userRank, setUserRank] = useState(null);

  // Fetch dashboard data on mount and when returning from match
  useEffect(() => {
    fetchData();
    
    // Refresh data when returning from a match
    const handleFocus = () => {
      console.log('🔄 Dashboard focused, refreshing data...');
      fetchData();
      refreshProfile(); // Also refresh user profile data
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const fetchData = async () => {
    try {
      const [matchesRes, leaguesRes, leaderboardRes] = await Promise.all([
        matchesAPI.getActive(),
        leaguesAPI.getAll(),
        leaguesAPI.getGlobalLeaderboard({ limit: 1000 }), // Get all users to find rank
      ]);
      setActiveMatches(matchesRes.data.matches);
      setLeagues(leaguesRes.data.leagues);
      
      // Find user's rank in global leaderboard
      if (user && leaderboardRes.data.leaderboard) {
        const userRankIndex = leaderboardRes.data.leaderboard.findIndex(
          player => player.userId === user.id
        );
        setUserRank(userRankIndex >= 0 ? userRankIndex + 1 : null);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  // Socket handler for "match found": redirect both players
  useEffect(() => {
    console.log('🎯 Setting up match_found listener in DashboardPage');
    const handler = (data) => {
      console.log('🎉 MATCH FOUND! Received matchmaking:match_found event:', data);
      toast.success('Match found!');
      setQueueing(false);
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
    try {
      await matchesAPI.joinQueue({
        matchType: '1v1',
        preferences: { difficulty: selectedDifficulty },
      });
      socketService.joinMatchmaking({
        matchType: '1v1',
        preferences: { difficulty: selectedDifficulty, rating: user?.rating },
      });
      toast.success('Searching for opponent...');
    } catch (error) {
      toast.error('Failed to join queue');
      setQueueing(false);
    }
  };

  // Leave queue
  const handleLeaveQueue = async () => {
    try {
      await matchesAPI.leaveQueue();
      socketService.leaveMatchmaking();
      setQueueing(false);
      toast.success('Left queue');
    } catch (error) {
      toast.error('Failed to leave queue');
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="card">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.displayName || user?.username}!
        </h1>
        <div className="flex items-center space-x-6 text-sm text-gray-600">
          <div className="flex items-center">
            <Trophy className="h-5 w-5 mr-2 text-primary-600" />
            Rating: <span className="font-semibold ml-1">{user?.rating || 1000}</span>
          </div>
          <div className="flex items-center">
            <Users className="h-5 w-5 mr-2 text-green-600" />
            Matches: <span className="font-semibold ml-1">{user?.stats?.totalMatches || 0}</span>
          </div>
          <div className="flex items-center">
            <Trophy className="h-5 w-5 mr-2 text-yellow-600" />
            Wins: <span className="font-semibold ml-1">{user?.stats?.wins || 0}</span>
          </div>
          {userRank && (
            <div className="flex items-center">
              <Trophy className="h-5 w-5 mr-2 text-purple-600" />
              Global Rank: <span className="font-semibold ml-1">#{userRank}</span>
            </div>
          )}
        </div>
      </div>

      {/* Matchmaking Section */}
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Match</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Difficulty
            </label>
            <div className="flex space-x-4">
              {['easy', 'medium', 'hard'].map((diff) => (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedDifficulty === diff
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {diff.charAt(0).toUpperCase() + diff.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {!queueing ? (
            <button onClick={handleJoinQueue} className="btn-primary w-full py-3">
              <Play className="h-5 w-5 mr-2 inline" />
              Find Match
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-center space-x-3 text-primary-600">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                <span className="font-medium">Searching for opponent...</span>
              </div>
              <button onClick={handleLeaveQueue} className="btn-secondary w-full py-3">
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Active Matches - Only show if user has active matches */}
      {activeMatches.length > 0 && (
        <div className="card">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
            <Clock className="h-6 w-6 mr-2 text-primary-600" />
            Your Active Matches
          </h2>
          <div className="space-y-3">
            {activeMatches.map((match) => (
              <div
                key={match.id}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg hover:from-blue-100 hover:to-indigo-100 cursor-pointer transition-all duration-200 border border-blue-200"
                onClick={() => navigate(`/match/${match.id}`)}
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{match.problem_title || 'Live Problem'}</p>
                  <p className="text-sm text-gray-600">
                    {match.status === 'in_progress' ? '🟢 In Progress' : '⏳ Waiting'} • {match.match_type?.toUpperCase() || '1v1'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Difficulty: {match.problem_difficulty || 'Medium'}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">
                    {match.status === 'in_progress' ? 'Continue' : 'Join'}
                  </span>
                  <button className="btn-primary text-sm px-4 py-2">
                    {match.status === 'in_progress' ? 'Continue' : 'Join Match'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leagues */}
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Leagues</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {leagues.map((league) => (
            <div key={league.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
              <div className="text-3xl mb-2">{league.icon}</div>
              <h3 className="font-bold text-lg">{league.name}</h3>
              <p className="text-sm text-gray-600 mb-2">{league.description}</p>
              <p className="text-xs text-gray-500">
                Rating: {league.min_rating} - {league.max_rating}
              </p>
              {league.stats && (
                <p className="text-xs text-gray-500 mt-1">
                  {league.stats.total_users} players
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
