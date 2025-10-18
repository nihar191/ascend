// frontend/src/pages/ProblemsPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { problemsAPI } from '../services/api';
import { Code2, Search } from 'lucide-react';

const ProblemsPage = () => {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    difficulty: '',
    search: '',
    page: 1,
  });

  useEffect(() => {
    fetchProblems();
  }, [filters]);

  const fetchProblems = async () => {
    setLoading(true);
    try {
      const response = await problemsAPI.getAll(filters);
      setProblems(response.data.problems);
    } catch (error) {
      console.error('Failed to fetch problems:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      easy: 'badge-easy',
      medium: 'badge-medium',
      hard: 'badge-hard',
    };
    return colors[difficulty] || 'badge';
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Problems</h1>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search problems..."
              className="input-field pl-10"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
            />
          </div>

          <select
            className="input-field sm:w-48"
            value={filters.difficulty}
            onChange={(e) => setFilters({ ...filters, difficulty: e.target.value, page: 1 })}
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        {/* Problems List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : problems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Code2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No problems found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {problems.map((problem) => (
              <Link
                key={problem.id}
                to={`/problems/${problem.id}`}
                className="block p-4 border rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 mb-1">
                      {problem.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className={`badge ${getDifficultyColor(problem.difficulty)}`}>
                        {problem.difficulty}
                      </span>
                      <span className="text-gray-600">
                        {problem.points} points
                      </span>
                      {problem.is_ai_generated && (
                        <span className="badge bg-purple-100 text-purple-800">
                          AI Generated
                        </span>
                      )}
                    </div>
                    {problem.tags && problem.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {problem.tags.slice(0, 3).map((tag, idx) => (
                          <span key={idx} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button className="btn-primary text-sm ml-4">
                    Solve
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProblemsPage;
