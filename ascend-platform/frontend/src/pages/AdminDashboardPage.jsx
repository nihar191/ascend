// frontend/src/pages/AdminDashboardPage.jsx
import { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { 
  Users, 
  Trophy, 
  Target, 
  Activity, 
  Settings, 
  Plus,
  Edit,
  Trash2,
  Ban,
  RotateCcw,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const AdminDashboardPage = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('rating');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showCreateLeague, setShowCreateLeague] = useState(false);
  const [showCreateSeason, setShowCreateSeason] = useState(false);
  const [showEditLeague, setShowEditLeague] = useState(false);
  const [editingLeague, setEditingLeague] = useState(null);
  const [leagueForm, setLeagueForm] = useState({
    name: '',
    description: '',
    maxParticipants: 1000,
    isPublic: true
  });
  const [problems, setProblems] = useState([]);
  const [showCreateProblem, setShowCreateProblem] = useState(false);
  const [problemForm, setProblemForm] = useState({
    title: '',
    description: '',
    difficulty: 'medium',
    points: 100,
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    tags: [],
    sampleInput: '',
    sampleOutput: '',
    testCases: []
  });

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'leagues', label: 'Leagues', icon: Trophy },
    { id: 'problems', label: 'Problems', icon: Target },
    { id: 'matches', label: 'Matches', icon: Target },
  ];

  useEffect(() => {
    fetchDashboardStats();
    fetchUsers();
    fetchLeagues();
    fetchMatches();
    fetchProblems();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab, searchTerm, sortBy, sortOrder, currentPage]);

  const fetchDashboardStats = async () => {
    try {
      const response = await adminAPI.getDashboardStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await adminAPI.getAllUsers({
        page: currentPage,
        limit: 20,
        search: searchTerm,
        sortBy,
        order: sortOrder
      });
      setUsers(response.data.users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchLeagues = async () => {
    try {
      const response = await adminAPI.getAllLeagues();
      setLeagues(response.data.leagues);
    } catch (error) {
      console.error('Failed to fetch leagues:', error);
    }
  };

  const fetchMatches = async () => {
    try {
      const response = await adminAPI.getAllMatches();
      setMatches(response.data.matches);
    } catch (error) {
      console.error('Failed to fetch matches:', error);
    }
  };

  const handleUserAction = async (userId, action) => {
    try {
      switch (action) {
        case 'ban':
          await adminAPI.banUser(userId, { banned: true, reason: 'Admin action' });
          break;
        case 'unban':
          await adminAPI.banUser(userId, { banned: false });
          break;
        case 'reset':
          await adminAPI.resetUserStats(userId);
          break;
        case 'delete':
          await adminAPI.deleteUser(userId);
          break;
        default:
          break;
      }
      fetchUsers();
    } catch (error) {
      console.error(`Failed to ${action} user:`, error);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedUsers.length === 0) return;

    try {
      switch (action) {
        case 'ban':
          await adminAPI.bulkUpdateUsers({
            userIds: selectedUsers,
            updates: { role: 'banned' }
          });
          break;
        case 'unban':
          await adminAPI.bulkUpdateUsers({
            userIds: selectedUsers,
            updates: { role: 'user' }
          });
          break;
        default:
          break;
      }
      setSelectedUsers([]);
      fetchUsers();
    } catch (error) {
      console.error(`Failed to bulk ${action} users:`, error);
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    setSelectedUsers(users.map(user => user.id));
  };

  const clearSelection = () => {
    setSelectedUsers([]);
  };

  // League CRUD operations
  const handleCreateLeague = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createLeague(leagueForm);
      setLeagueForm({ name: '', description: '', maxParticipants: 1000, isPublic: true });
      setShowCreateLeague(false);
      fetchLeagues();
    } catch (error) {
      console.error('Failed to create league:', error);
    }
  };

  const handleEditLeague = (league) => {
    setEditingLeague(league);
    setLeagueForm({
      name: league.name,
      description: league.description,
      maxParticipants: league.max_participants,
      isPublic: league.is_public
    });
    setShowEditLeague(true);
  };

  const handleUpdateLeague = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.updateLeague(editingLeague.id, leagueForm);
      setShowEditLeague(false);
      setEditingLeague(null);
      fetchLeagues();
    } catch (error) {
      console.error('Failed to update league:', error);
    }
  };

  const handleDeleteLeague = async (leagueId) => {
    if (window.confirm('Are you sure you want to delete this league?')) {
      try {
        await adminAPI.deleteLeague(leagueId);
        fetchLeagues();
      } catch (error) {
        console.error('Failed to delete league:', error);
      }
    }
  };

  // Problem CRUD operations
  const fetchProblems = async () => {
    try {
      const response = await adminAPI.getAllProblems?.() || { data: { problems: [] } };
      setProblems(response.data.problems || []);
    } catch (error) {
      console.error('Failed to fetch problems:', error);
    }
  };

  const handleCreateProblem = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createProblem?.(problemForm);
      setProblemForm({
        title: '',
        description: '',
        difficulty: 'medium',
        points: 100,
        timeLimitMs: 2000,
        memoryLimitMb: 256,
        tags: [],
        sampleInput: '',
        sampleOutput: '',
        testCases: []
      });
      setShowCreateProblem(false);
      fetchProblems();
    } catch (error) {
      console.error('Failed to create problem:', error);
    }
  };

  const handleBulkGenerateProblems = async () => {
    try {
      await adminAPI.bulkGenerateProblems({ count: 5, difficulty: 'medium' });
      fetchProblems();
    } catch (error) {
      console.error('Failed to generate problems:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Hero Section */}
          <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl shadow-2xl">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative px-8 py-12">
              <div className="flex items-center justify-between">
                <div className="text-white">
                  <h1 className="text-4xl font-bold mb-2 flex items-center">
                    <Settings className="h-10 w-10 mr-4" />
                    Admin Dashboard
                  </h1>
                  <p className="text-indigo-100 text-lg mb-6">
                    Manage your competitive programming platform
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3">
                      <p className="text-sm text-indigo-100">Platform Status</p>
                      <p className="text-xl font-bold text-white">Online</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3">
                      <p className="text-sm text-indigo-100">Active Users</p>
                      <p className="text-xl font-bold text-white">{stats?.statistics?.total_users || 0}</p>
                    </div>
                  </div>
                </div>
                <div className="hidden lg:block">
                  <div className="w-32 h-32 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <Settings className="h-16 w-16 text-white/80" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">

            {/* Tabs */}
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
              <nav className="flex space-x-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200 transform hover:scale-105 ${
                        activeTab === tab.id
                          ? 'bg-white text-indigo-600 shadow-lg border border-indigo-200'
                          : 'text-gray-600 hover:text-indigo-600 hover:bg-white/50'
                      }`}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && stats && (
              <div className="p-6 space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200 hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide">Total Users</p>
                        <p className="text-3xl font-bold text-blue-900 mt-2">{stats.statistics.total_users}</p>
                        <p className="text-xs text-blue-600 mt-1">+{stats.statistics.new_users_week} this week</p>
                      </div>
                      <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center">
                        <Users className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl border border-green-200 hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-green-600 uppercase tracking-wide">Total Problems</p>
                        <p className="text-3xl font-bold text-green-900 mt-2">{stats.statistics.total_problems}</p>
                        <p className="text-xs text-green-600 mt-1">{stats.statistics.ai_problems} AI generated</p>
                      </div>
                      <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center">
                        <Target className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl border border-purple-200 hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-purple-600 uppercase tracking-wide">Total Matches</p>
                        <p className="text-3xl font-bold text-purple-900 mt-2">{stats.statistics.total_matches}</p>
                        <p className="text-xs text-purple-600 mt-1">{stats.statistics.active_matches} active</p>
                      </div>
                      <div className="w-16 h-16 bg-purple-500 rounded-2xl flex items-center justify-center">
                        <Trophy className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl border border-orange-200 hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-orange-600 uppercase tracking-wide">Submissions</p>
                        <p className="text-3xl font-bold text-orange-900 mt-2">{stats.statistics.total_submissions}</p>
                        <p className="text-xs text-orange-600 mt-1">{stats.statistics.accepted_submissions} accepted</p>
                      </div>
                      <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center">
                        <Activity className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-4">
                      <h3 className="text-lg font-bold text-white flex items-center">
                        <Users className="h-5 w-5 mr-2" />
                        Recent Users
                      </h3>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        {stats.recentUsers.map((user) => (
                          <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                {(user.display_name || user.username).charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{user.display_name || user.username}</p>
                                <p className="text-sm text-gray-500">@{user.username}</p>
                              </div>
                            </div>
                            <span className="text-xs text-gray-400 bg-white px-2 py-1 rounded-lg">
                              {new Date(user.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-4">
                      <h3 className="text-lg font-bold text-white flex items-center">
                        <Trophy className="h-5 w-5 mr-2" />
                        Recent Matches
                      </h3>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        {stats.recentMatches.map((match) => (
                          <div key={match.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{match.problem_title || 'Unknown Problem'}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  match.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  match.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {match.status}
                                </span>
                              </div>
                            </div>
                            <span className="text-xs text-gray-400 bg-white px-2 py-1 rounded-lg">
                              {new Date(match.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-field pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="input-field"
                >
                  <option value="rating">Rating</option>
                  <option value="total_matches">Matches</option>
                  <option value="wins">Wins</option>
                  <option value="created_at">Join Date</option>
                </select>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="input-field"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedUsers.length > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg flex items-center justify-between">
                <span className="text-sm text-blue-700">
                  {selectedUsers.length} user(s) selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkAction('ban')}
                    className="btn-secondary text-sm"
                  >
                    Ban Selected
                  </button>
                  <button
                    onClick={() => handleBulkAction('unban')}
                    className="btn-secondary text-sm"
                  >
                    Unban Selected
                  </button>
                  <button
                    onClick={clearSelection}
                    className="btn-outline text-sm"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            )}

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        onChange={selectAllUsers}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Matches
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Win Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {(user.display_name || user.username).charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.display_name || user.username}
                            </div>
                            <div className="text-sm text-gray-500">{user.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.rating}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.total_matches}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.win_rate}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.role === 'admin' 
                            ? 'bg-red-100 text-red-800'
                            : user.role === 'banned'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleUserAction(user.id, user.role === 'banned' ? 'unban' : 'ban')}
                            className={`text-xs px-2 py-1 rounded ${
                              user.role === 'banned'
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                          >
                            {user.role === 'banned' ? 'Unban' : 'Ban'}
                          </button>
                          <button
                            onClick={() => handleUserAction(user.id, 'reset')}
                            className="text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                          >
                            Reset
                          </button>
                          <button
                            onClick={() => handleUserAction(user.id, 'delete')}
                            className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="btn-outline disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="mx-4 text-sm text-gray-700">
                  Page {currentPage}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="btn-outline"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Leagues Tab */}
        {activeTab === 'leagues' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Leagues Management</h3>
              <button
                onClick={() => setShowCreateLeague(true)}
                className="btn-primary flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create League
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {leagues.map((league) => (
                <div key={league.id} className="card">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">{league.name}</h4>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      league.is_active 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {league.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{league.description}</p>
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>{league.season_count} seasons</span>
                    <span>{league.participant_count} participants</span>
                  </div>
                  <div className="mt-4 flex space-x-2">
                    <button 
                      onClick={() => handleEditLeague(league)}
                      className="btn-outline text-sm"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteLeague(league.id)}
                      className="btn-outline text-sm text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Matches Tab */}
        {activeTab === 'matches' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Matches Management</h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Match ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Problem
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Difficulty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Participants
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {matches.map((match) => (
                    <tr key={match.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{match.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {match.problem_title || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          match.problem_difficulty === 'easy' 
                            ? 'bg-green-100 text-green-800'
                            : match.problem_difficulty === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {match.problem_difficulty || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {match.participant_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          match.status === 'completed' 
                            ? 'bg-green-100 text-green-800'
                            : match.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {match.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(match.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {match.status === 'in_progress' && (
                          <button className="text-red-600 hover:text-red-900">
                            Force End
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Problems Tab */}
        {activeTab === 'problems' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Problems Management</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowCreateProblem(true)}
                  className="btn-primary flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Problem
                </button>
                <button
                  onClick={handleBulkGenerateProblems}
                  className="btn-secondary flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Generate AI Problems
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {problems.map((problem) => (
                <div key={problem.id} className="card">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">{problem.title}</h4>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      problem.is_active 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {problem.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{problem.description}</p>
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      problem.difficulty === 'easy' 
                        ? 'bg-green-100 text-green-800'
                        : problem.difficulty === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {problem.difficulty}
                    </span>
                    <span>{problem.points} points</span>
                  </div>
                  <div className="mt-4 flex space-x-2">
                    <button className="btn-outline text-sm">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                    <button className="btn-outline text-sm text-red-600 hover:text-red-800">
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create League Modal */}
        {showCreateLeague && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Create New League</h3>
              <form onSubmit={handleCreateLeague} className="space-y-4">
                <input
                  type="text"
                  placeholder="League Name"
                  value={leagueForm.name}
                  onChange={(e) => setLeagueForm({...leagueForm, name: e.target.value})}
                  className="w-full p-2 border rounded"
                  required
                />
                <textarea
                  placeholder="Description"
                  value={leagueForm.description}
                  onChange={(e) => setLeagueForm({...leagueForm, description: e.target.value})}
                  className="w-full p-2 border rounded"
                  rows="3"
                />
                <input
                  type="number"
                  placeholder="Max Participants"
                  value={leagueForm.maxParticipants}
                  onChange={(e) => setLeagueForm({...leagueForm, maxParticipants: parseInt(e.target.value)})}
                  className="w-full p-2 border rounded"
                />
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={leagueForm.isPublic}
                    onChange={(e) => setLeagueForm({...leagueForm, isPublic: e.target.checked})}
                    className="mr-2"
                  />
                  <label>Public League</label>
                </div>
                <div className="flex space-x-2">
                  <button type="submit" className="btn-primary flex-1">Create</button>
                  <button type="button" onClick={() => setShowCreateLeague(false)} className="btn-outline flex-1">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit League Modal */}
        {showEditLeague && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Edit League</h3>
              <form onSubmit={handleUpdateLeague} className="space-y-4">
                <input
                  type="text"
                  placeholder="League Name"
                  value={leagueForm.name}
                  onChange={(e) => setLeagueForm({...leagueForm, name: e.target.value})}
                  className="w-full p-2 border rounded"
                  required
                />
                <textarea
                  placeholder="Description"
                  value={leagueForm.description}
                  onChange={(e) => setLeagueForm({...leagueForm, description: e.target.value})}
                  className="w-full p-2 border rounded"
                  rows="3"
                />
                <input
                  type="number"
                  placeholder="Max Participants"
                  value={leagueForm.maxParticipants}
                  onChange={(e) => setLeagueForm({...leagueForm, maxParticipants: parseInt(e.target.value)})}
                  className="w-full p-2 border rounded"
                />
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={leagueForm.isPublic}
                    onChange={(e) => setLeagueForm({...leagueForm, isPublic: e.target.checked})}
                    className="mr-2"
                  />
                  <label>Public League</label>
                </div>
                <div className="flex space-x-2">
                  <button type="submit" className="btn-primary flex-1">Update</button>
                  <button type="button" onClick={() => setShowEditLeague(false)} className="btn-outline flex-1">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Problem Modal */}
        {showCreateProblem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Create New Problem</h3>
              <form onSubmit={handleCreateProblem} className="space-y-4">
                <input
                  type="text"
                  placeholder="Problem Title"
                  value={problemForm.title}
                  onChange={(e) => setProblemForm({...problemForm, title: e.target.value})}
                  className="w-full p-2 border rounded"
                  required
                />
                <textarea
                  placeholder="Problem Description"
                  value={problemForm.description}
                  onChange={(e) => setProblemForm({...problemForm, description: e.target.value})}
                  className="w-full p-2 border rounded"
                  rows="4"
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <select
                    value={problemForm.difficulty}
                    onChange={(e) => setProblemForm({...problemForm, difficulty: e.target.value})}
                    className="p-2 border rounded"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Points"
                    value={problemForm.points}
                    onChange={(e) => setProblemForm({...problemForm, points: parseInt(e.target.value)})}
                    className="p-2 border rounded"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    placeholder="Time Limit (ms)"
                    value={problemForm.timeLimitMs}
                    onChange={(e) => setProblemForm({...problemForm, timeLimitMs: parseInt(e.target.value)})}
                    className="p-2 border rounded"
                  />
                  <input
                    type="number"
                    placeholder="Memory Limit (MB)"
                    value={problemForm.memoryLimitMb}
                    onChange={(e) => setProblemForm({...problemForm, memoryLimitMb: parseInt(e.target.value)})}
                    className="p-2 border rounded"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <textarea
                    placeholder="Sample Input"
                    value={problemForm.sampleInput}
                    onChange={(e) => setProblemForm({...problemForm, sampleInput: e.target.value})}
                    className="p-2 border rounded"
                    rows="3"
                  />
                  <textarea
                    placeholder="Sample Output"
                    value={problemForm.sampleOutput}
                    onChange={(e) => setProblemForm({...problemForm, sampleOutput: e.target.value})}
                    className="p-2 border rounded"
                    rows="3"
                  />
                </div>
                <div className="flex space-x-2">
                  <button type="submit" className="btn-primary flex-1">Create</button>
                  <button type="button" onClick={() => setShowCreateProblem(false)} className="btn-outline flex-1">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
