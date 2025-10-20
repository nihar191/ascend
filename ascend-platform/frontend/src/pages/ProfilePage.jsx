// frontend/src/pages/ProfilePage.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { adminAPI } from '../services/api';
import { Trophy, Target, Award, RefreshCw, TrendingUp, Clock, Zap } from 'lucide-react';

const ProfilePage = () => {
  const { user, refreshProfile } = useAuth();
  const [userDetails, setUserDetails] = useState(null);
  const [recentMatches, setRecentMatches] = useState([]);
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);

  const winRate = user?.stats?.totalMatches > 0
    ? ((user.stats.wins / user.stats.totalMatches) * 100).toFixed(1)
    : 0;

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUserDetails();
    }
  }, [user]);

  const fetchUserDetails = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getUserDetails(user.id);
      setUserDetails(response.data.user);
      setRecentMatches(response.data.recentMatches);
      setRecentSubmissions(response.data.recentSubmissions);
    } catch (error) {
      console.error('Failed to fetch user details:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-start space-x-6">
          <div className="h-24 w-24 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-4xl font-bold text-primary-600">
              {user?.username?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">
              {user?.displayName || user?.username}
            </h1>
            <p className="text-gray-600">@{user?.username}</p>
            <p className="text-sm text-gray-500 mt-1">{user?.email}</p>
            <button
              onClick={refreshProfile}
              className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Stats
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="card text-center">
          <Trophy className="h-12 w-12 text-primary-600 mx-auto mb-3" />
          <p className="text-3xl font-bold text-gray-900">{user?.rating || 1000}</p>
          <p className="text-sm text-gray-600">Rating</p>
        </div>
        <div className="card text-center">
          <Target className="h-12 w-12 text-green-600 mx-auto mb-3" />
          <p className="text-3xl font-bold text-gray-900">{user?.stats?.totalMatches || 0}</p>
          <p className="text-sm text-gray-600">Total Matches</p>
        </div>
        <div className="card text-center">
          <Award className="h-12 w-12 text-yellow-600 mx-auto mb-3" />
          <p className="text-3xl font-bold text-gray-900">{winRate}%</p>
          <p className="text-sm text-gray-600">Win Rate</p>
        </div>
        <div className="card text-center">
          <Zap className="h-12 w-12 text-purple-600 mx-auto mb-3" />
          <p className="text-3xl font-bold text-gray-900">{user?.stats?.wins || 0}</p>
          <p className="text-sm text-gray-600">Wins</p>
        </div>
      </div>

      {/* Statistics */}
      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Statistics</h2>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Total Wins</span>
            <span className="font-semibold text-green-600">{user?.stats?.wins || 0}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Total Losses</span>
            <span className="font-semibold text-red-600">{user?.stats?.losses || 0}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-600">Member Since</span>
            <span className="font-semibold">
              {new Date(user?.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Activity - Only for admin users */}
      {user?.role === 'admin' && userDetails && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Matches */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Recent Matches
            </h3>
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              </div>
            ) : recentMatches.length > 0 ? (
              <div className="space-y-3">
                {recentMatches.map((match) => (
                  <div key={match.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{match.problem_title || 'Unknown Problem'}</p>
                      <p className="text-sm text-gray-600">
                        {match.difficulty} • Rank: {match.rank} • Score: {match.score || 0}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        match.status === 'completed' 
                          ? 'bg-green-100 text-green-800'
                          : match.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {match.status}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(match.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No recent matches</p>
            )}
          </div>

          {/* Recent Submissions */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Recent Submissions
            </h3>
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              </div>
            ) : recentSubmissions.length > 0 ? (
              <div className="space-y-3">
                {recentSubmissions.map((submission) => (
                  <div key={submission.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{submission.problem_title || 'Unknown Problem'}</p>
                      <p className="text-sm text-gray-600">
                        {submission.difficulty} • Score: {submission.score || 0}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        submission.status === 'accepted' 
                          ? 'bg-green-100 text-green-800'
                          : submission.status === 'wrong_answer'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {submission.status}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(submission.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No recent submissions</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
