// frontend/src/pages/ProfilePage.jsx
import { useAuth } from '../contexts/AuthContext';
import { Trophy, Target, Award } from 'lucide-react';

const ProfilePage = () => {
  const { user } = useAuth();

  const winRate = user?.stats?.totalMatches > 0
    ? ((user.stats.wins / user.stats.totalMatches) * 100).toFixed(1)
    : 0;

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
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6">
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
      </div>

      {/* Match History */}
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
    </div>
  );
};

export default ProfilePage;
