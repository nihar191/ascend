// frontend/src/pages/ProblemDetailPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { problemsAPI } from '../services/api';
import { ArrowLeft, Code2, Clock, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

const ProblemDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('// Write your solution here\n\n');
  const [language, setLanguage] = useState('javascript');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProblem();
  }, [id]);

  const fetchProblem = async () => {
    try {
      setLoading(true);
      const response = await problemsAPI.getById(id);
      setProblem(response.data);
    } catch (error) {
      console.error('Failed to fetch problem:', error);
      toast.error('Failed to load problem');
      navigate('/problems');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      toast.error('Please write some code before submitting');
      return;
    }

    setSubmitting(true);
    try {
      const response = await problemsAPI.submit(id, {
        code,
        language
      });
      
      if (response.data.status === 'accepted') {
        toast.success('Solution accepted! 🎉');
      } else {
        toast.error(`Solution failed: ${response.data.error || 'Wrong answer'}`);
      }
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Failed to submit solution');
    } finally {
      setSubmitting(false);
    }
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      easy: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      hard: 'bg-red-100 text-red-800',
    };
    return colors[difficulty] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Problem not found</p>
        <button 
          onClick={() => navigate('/problems')}
          className="btn-primary mt-4"
        >
          Back to Problems
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/problems')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Problems
            </button>
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getDifficultyColor(problem.difficulty)}`}>
                {problem.difficulty}
              </span>
              <span className="text-sm text-gray-600">{problem.points} points</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Problem Description */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-4">
                  <h1 className="text-2xl font-bold text-white">{problem.title}</h1>
                </div>
                <div className="p-6 space-y-6">
                  {/* Problem Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <Clock className="h-5 w-5 mx-auto text-gray-600 mb-1" />
                      <p className="text-sm text-gray-600">Time Limit</p>
                      <p className="font-semibold">{problem.time_limit_ms}ms</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <Zap className="h-5 w-5 mx-auto text-gray-600 mb-1" />
                      <p className="text-sm text-gray-600">Memory Limit</p>
                      <p className="font-semibold">{problem.memory_limit_mb}MB</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <Code2 className="h-5 w-5 mx-auto text-gray-600 mb-1" />
                      <p className="text-sm text-gray-600">Difficulty</p>
                      <p className="font-semibold capitalize">{problem.difficulty}</p>
                    </div>
                  </div>

                  {/* Problem Description */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                    <div className="prose max-w-none">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
                        {problem.description}
                      </pre>
                    </div>
                  </div>

                  {/* Sample Input/Output */}
                  {(problem.sample_input || problem.sample_output) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {problem.sample_input && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Sample Input</h4>
                          <pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-sm overflow-x-auto">
                            {problem.sample_input}
                          </pre>
                        </div>
                      )}
                      {problem.sample_output && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Sample Output</h4>
                          <pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-sm overflow-x-auto">
                            {problem.sample_output}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tags */}
                  {problem.tags && problem.tags.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {problem.tags.map((tag, idx) => (
                          <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Code Editor */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-4">
                  <h3 className="text-lg font-bold text-white">Code Editor</h3>
                </div>
                <div className="p-4 space-y-4">
                  {/* Language Selector */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <label className="text-sm font-medium text-gray-700">Language:</label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-sm"
                      >
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                        <option value="java">Java</option>
                        <option value="cpp">C++</option>
                        <option value="c">C</option>
                      </select>
                    </div>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="btn-primary text-sm disabled:opacity-50"
                    >
                      {submitting ? 'Submitting...' : 'Submit'}
                    </button>
                  </div>

                  {/* Code Editor */}
                  <div className="border border-gray-300 rounded-lg overflow-hidden">
                    <textarea
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full h-96 p-4 font-mono text-sm resize-none focus:outline-none bg-gray-50"
                      placeholder="Write your solution here..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProblemDetailPage;
