import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Users, Trophy, Code2, Shield, Settings, BarChart3 } from 'lucide-react';

const AdminDashboardPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentMatches, setRecentMatches] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await api.get('/admin/dashboard/stats');
        setStats(res.data.statistics);
        setRecentUsers(res.data.recentUsers || []);
        setRecentMatches(res.data.recentMatches || []);
      } catch (e) {
        setError('Failed to load admin stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="card">Loading admin dashboard…</div>;
  if (error) return <div className="card text-red-600">{error}</div>;

  return (
    <div className="space-y-8">
      <div className="card">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-gray-600">Signed in as {user?.username}</p>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/admin/users" className="card hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center space-x-3">
            <Users className="h-8 w-8 text-blue-600" />
            <div>
              <h3 className="font-semibold">User Management</h3>
              <p className="text-sm text-gray-500">Manage users and roles</p>
            </div>
          </div>
        </Link>
        
        <Link to="/admin/matches" className="card hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center space-x-3">
            <Trophy className="h-8 w-8 text-yellow-600" />
            <div>
              <h3 className="font-semibold">Match Management</h3>
              <p className="text-sm text-gray-500">Monitor and control matches</p>
            </div>
          </div>
        </Link>
        
        <Link to="/admin/problems" className="card hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center space-x-3">
            <Code2 className="h-8 w-8 text-green-600" />
            <div>
              <h3 className="font-semibold">Problem Management</h3>
              <p className="text-sm text-gray-500">Create and manage problems</p>
            </div>
          </div>
        </Link>
        
        <div className="card">
          <div className="flex items-center space-x-3">
            <Settings className="h-8 w-8 text-gray-600" />
            <div>
              <h3 className="font-semibold">Settings</h3>
              <p className="text-sm text-gray-500">Platform configuration</p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center space-x-3">
            <Users className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="font-semibold">Users</h3>
              <p className="text-2xl font-bold">{stats?.total_users ?? 0}</p>
              <p className="text-xs text-gray-500">+{stats?.new_users_week ?? 0} last 7d</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-3">
            <Code2 className="h-6 w-6 text-green-600" />
            <div>
              <h3 className="font-semibold">Problems</h3>
              <p className="text-2xl font-bold">{stats?.total_problems ?? 0}</p>
              <p className="text-xs text-gray-500">AI: {stats?.ai_problems ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center space-x-3">
            <Trophy className="h-6 w-6 text-yellow-600" />
            <div>
              <h3 className="font-semibold">Matches</h3>
              <p className="text-2xl font-bold">{stats?.total_matches ?? 0}</p>
              <p className="text-xs text-gray-500">Active: {stats?.active_matches ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="text-xl font-bold mb-2">Recent Users</h2>
          <div className="space-y-2">
            {recentUsers.map(u => (
              <div key={u.id} className="flex justify-between text-sm">
                <span className="font-medium">{u.username}</span>
                <span className="text-gray-500">{new Date(u.created_at).toLocaleString()}</span>
              </div>
            ))}
            {recentUsers.length === 0 && <p className="text-gray-500 text-sm">No recent users</p>}
          </div>
        </div>
        <div className="card">
          <h2 className="text-xl font-bold mb-2">Recent Matches</h2>
          <div className="space-y-2">
            {recentMatches.map(m => (
              <div key={m.id} className="flex justify-between text-sm">
                <span className="font-medium">{m.problem_title || 'Match'} ({m.status})</span>
                <span className="text-gray-500">{new Date(m.created_at).toLocaleString()}</span>
              </div>
            ))}
            {recentMatches.length === 0 && <p className="text-gray-500 text-sm">No recent matches</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;


