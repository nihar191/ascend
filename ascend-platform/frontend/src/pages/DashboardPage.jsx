// frontend/src/pages/DashboardPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { matchesAPI, leaguesAPI } from '../services/api';
import socketService from '../services/socket';
import { Play, Trophy, Clock, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [queueing, setQueueing] = useState(false);
  const [activeMatches, setActiveMatches] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState('medium');

  // Fetch dashboard data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [matchesRes, leaguesRes] = await Promise.all([
        matchesAPI.getActive(),
        leaguesAPI.getAll(),
      ]);
      setActiveMatches(matchesRes.data.matches);
      setLeagues(leaguesRes.data.leagues);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  // Socket handler for "match found": redirect both players
  useEffect(() => {
    const handler = (data) => {
      console.log('Received matchmaking:match_found event:', data); // <--- ADD THIS LINE
      toast.success('Match found!');
      setQueueing(false);
      navigate(`/match/${data.matchId}`);
    };
    socketService.onMatchFound(handler);
    return () => {
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

      {/* Active Matches */}
      {activeMatches.length > 0 && (
        <div className="card">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Active Matches</h2>
          <div className="space-y-3">
            {activeMatches.map((match) => (
              <div
                key={match.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                onClick={() => navigate(`/match/${match.id}`)}
              >
                <div>
                  <p className="font-semibold text-gray-900">{match.problem_title}</p>
                  <p className="text-sm text-gray-600">
                    Status: {match.status} • {match.match_type}
                  </p>
                </div>
                <button className="btn-primary text-sm">
                  Join Match
                </button>
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
