// frontend/src/pages/MatchPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { matchesAPI } from '../services/api';
import socketService from '../services/socket';
import { AppPersistence } from '../utils/persistence';
import CodeEditor from '../components/match/CodeEditor';
import { Clock, Users, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';

const MatchPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [match, setMatch] = useState(null);
  const [problem, setProblem] = useState(null);
  const [language, setLanguage] = useState(() => {
    const prefs = AppPersistence.getUserPreferences();
    return prefs.language || 'javascript';
  });
  const [code, setCode] = useState(() => {
    // Try to restore saved code for this match
    const savedState = AppPersistence.getMatchState(id);
    if (savedState && savedState.code) {
      return savedState.code;
    }
    // Initialize with JavaScript template
    return '// Write your solution here\n\n';
  });

  // Language-specific code templates
  const getCodeTemplate = (lang) => {
    switch (lang) {
      case 'python':
        return '# Write your solution here\n\ndef solution():\n    pass\n';
      case 'java':
        return '// Write your solution here\n\npublic class Solution {\n    public static void main(String[] args) {\n        \n    }\n}\n';
      case 'cpp':
        return '// Write your solution here\n\n#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n';
      case 'javascript':
      default:
        return '// Write your solution here\n\n';
    }
  };
  const [timeLeft, setTimeLeft] = useState(null);
  const [scoreboard, setScoreboard] = useState([]);
  const [matchStatus, setMatchStatus] = useState('waiting');
  const [submitting, setSubmitting] = useState(false);
  const [loadingProblem, setLoadingProblem] = useState(false);
  const [submissionReceived, setSubmissionReceived] = useState(false);

  useEffect(() => {
    fetchMatch();
    setupSocketListeners();

    return () => {
      socketService.off('match:started');
      socketService.off('match:time_sync');
      socketService.off('submission:result');
      socketService.off('match:scoreboard_update');
      socketService.off('match:ended');
    };
  }, [id]);

  // Save code changes to persistence
  useEffect(() => {
    if (code && match) {
      AppPersistence.saveMatchState(id, {
        code,
        language,
        matchStatus,
        timeLeft
      });
    }
  }, [code, language, matchStatus, timeLeft, id]);

  // Save language preference
  useEffect(() => {
    AppPersistence.saveUserPreferences({ language });
  }, [language]);

  // Timer countdown effect
  useEffect(() => {
    if (timeLeft && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setMatchStatus('completed');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  const fetchMatch = async () => {
    try {
      const response = await matchesAPI.getOne(id);
      setMatch(response.data);
      
      if (response.data.status === 'waiting') {
        setLoadingProblem(true);
        socketService.joinLobby(id);
      }
    } catch (error) {
      toast.error('Failed to load match');
      navigate('/dashboard');
    }
  };

  const setupSocketListeners = () => {
    socketService.onMatchStarted((data) => {
      setMatchStatus('in_progress');
      setProblem(data.problem);
      setTimeLeft(Math.floor(data.duration / 1000)); // Convert milliseconds to seconds
      setLoadingProblem(false);
      toast.success('Match started!');
    });

    socketService.onTimeSync((data) => {
      setTimeLeft(Math.floor(data.timeLeft / 1000));
    });

    socketService.onSubmissionResult((data) => {
      setSubmitting(false);
      console.log('📥 Received submission result:', data);
      if (data.status === 'accepted') {
        toast.success(`Accepted! Score: ${data.score}`);
        // End the match when someone gets accepted
        setMatchStatus('completed');
        setTimeLeft(0);
        toast.success('Match completed! Redirecting to dashboard...', { duration: 3000 });
        // Refresh profile before redirecting
        refreshProfile();
        setTimeout(() => navigate('/dashboard'), 3000);
      } else {
        toast.error(`${data.status} - ${data.passedTests}/${data.totalTests} tests passed`);
      }
    });

    // Add handler for submission received confirmation
    socketService.on('submission:received', (data) => {
      console.log('📥 Submission received confirmation:', data);
      if (!submissionReceived) {
        setSubmissionReceived(true);
        toast.loading('Submission received, judging...', { duration: 2000 });
      }
    });

    // Add handler for submission errors
    socketService.on('submission:error', (data) => {
      setSubmitting(false);
      console.log('❌ Submission error:', data);
      toast.error(`Submission failed: ${data.message}`);
    });

    socketService.onScoreboardUpdate((data) => {
      setScoreboard(data);
    });

    socketService.onMatchEnded((data) => {
      setMatchStatus('completed');
      console.log('🏆 Match ended:', data);
      
      // Clear match state when match ends
      AppPersistence.clearMatchState(id);
      
      if (data.winner) {
        toast.success(`🏆 ${data.winner.username} won the match!`, { duration: 5000 });
      } else {
        toast.success('Match ended!', { duration: 3000 });
      }
      
      // Show final scoreboard
      if (data.finalScoreboard && data.finalScoreboard.length > 0) {
        console.log('📊 Final scoreboard:', data.finalScoreboard);
        setScoreboard(data.finalScoreboard);
      }
      
      // Refresh profile when match ends
      refreshProfile();
      
      setTimeout(() => navigate('/dashboard'), 5000);
    });
  };

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    // Update code template when language changes
    setCode(getCodeTemplate(newLanguage));
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      toast.error('Code cannot be empty');
      return;
    }

    // Frontend validation
    if (code.length > 50000) {
      toast.error('Code exceeds maximum length (50KB)');
      return;
    }

    // Language-specific validation
    const validationError = validateCodeFrontend(code, language);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    console.log('Submitting code:', { matchId: id, language, codeLength: code.length });
    setSubmitting(true);
    setSubmissionReceived(false); // Reset submission received flag
    socketService.submitCode(id, code, language);
    toast.loading('Submitting code...', { duration: 1000 });
  };

  const validateCodeFrontend = (code, language) => {
    console.log(`🔍 Frontend validation for ${language} code (${code.length} chars)`);
    
    // DISABLED: Frontend validation for testing
    console.log(`✅ Frontend validation passed - sending to backend (validation disabled)`);
    return null;

    /*
    const forbiddenPatterns = getForbiddenPatternsFrontend(language);
    console.log(`🔍 Checking ${forbiddenPatterns.length} obvious patterns`);
    
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(code)) {
        console.log(`❌ Frontend detected obvious security issue: ${pattern}`);
        return 'Code contains obvious security issues';
      }
    }
    
    console.log(`✅ Frontend validation passed - sending to backend`);
    return null;
    */
  };

  const getForbiddenPatternsFrontend = (language) => {
    // Only catch the most obvious security issues in frontend
    // Let backend handle detailed validation
    const obviousPatterns = [
      /eval\s*\(/gi,        // eval function
      /exec\s*\(/gi,        // exec function
      /spawn\s*\(/gi,       // spawn function
    ];

    // Very minimal frontend validation - just the most dangerous patterns
    return obviousPatterns;
  };

  const formatTime = (seconds) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!match) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="h-screen flex flex-col lg:flex-row gap-2 lg:gap-6 p-2 lg:p-6">
        {/* Left Panel - Problem & Scoreboard */}
        <div className="w-full lg:w-2/5 space-y-2 lg:space-y-6 overflow-y-auto">
          {/* Timer */}
          <div className="bg-white rounded-xl lg:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-pink-500 px-3 lg:px-6 py-3 lg:py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 lg:space-x-3">
                  <Clock className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
                  <span className="font-bold text-white text-sm lg:text-lg">Time Remaining</span>
                </div>
                <div className="text-right">
                  <span className={`text-xl lg:text-3xl font-bold ${timeLeft < 60 ? 'text-yellow-300' : 'text-white'}`}>
                    {formatTime(timeLeft)}
                  </span>
                  {timeLeft < 60 && (
                    <p className="text-yellow-200 text-xs lg:text-sm">Hurry up!</p>
                  )}
                </div>
              </div>
            </div>
            <div className="p-2 lg:p-4">
              <div className="w-full bg-gray-200 rounded-full h-1 lg:h-2">
                <div 
                  className={`h-1 lg:h-2 rounded-full transition-all duration-1000 ${
                    timeLeft < 60 ? 'bg-gradient-to-r from-red-500 to-pink-500' : 
                    timeLeft < 300 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 
                    'bg-gradient-to-r from-green-500 to-emerald-500'
                  }`}
                  style={{ width: `${Math.max(0, (timeLeft / 900) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Problem */}
          {loadingProblem ? (
            <div className="bg-white rounded-xl lg:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-3 lg:px-6 py-3 lg:py-4">
                <h3 className="text-sm lg:text-lg font-bold text-white">Generating Problem...</h3>
              </div>
              <div className="p-4 lg:p-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 lg:h-12 lg:w-12 border-b-2 border-blue-600 mx-auto mb-2 lg:mb-4"></div>
                  <h3 className="text-sm lg:text-lg font-semibold text-gray-700 mb-1 lg:mb-2">Preparing Challenge</h3>
                  <p className="text-xs lg:text-sm text-gray-500">Please wait while we prepare your coding challenge</p>
                </div>
              </div>
            </div>
          ) : problem ? (
            <div className="bg-white rounded-xl lg:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-3 lg:px-6 py-3 lg:py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm lg:text-xl font-bold text-white truncate">{problem.title}</h2>
                  <span className={`px-2 lg:px-3 py-1 rounded-full text-xs lg:text-sm font-semibold ${
                    problem.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                    problem.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {problem.difficulty?.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="p-3 lg:p-6 max-h-64 lg:max-h-96 overflow-y-auto">
                <div className="prose prose-sm max-w-none mb-3 lg:mb-6">
                  <p className="whitespace-pre-wrap text-gray-700 leading-relaxed text-xs lg:text-sm">{problem.description}</p>
                </div>
                <div className="space-y-2 lg:space-y-4">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg lg:rounded-xl p-2 lg:p-4 border border-blue-200">
                    <p className="text-xs lg:text-sm font-semibold text-blue-800 mb-1 lg:mb-2 flex items-center">
                      <span className="w-1 h-1 lg:w-2 lg:h-2 bg-blue-500 rounded-full mr-1 lg:mr-2"></span>
                      Sample Input
                    </p>
                    <code className="text-xs lg:text-sm bg-white p-2 lg:p-3 rounded-lg block font-mono text-gray-800">{problem.sampleInput}</code>
                  </div>
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg lg:rounded-xl p-2 lg:p-4 border border-green-200">
                    <p className="text-xs lg:text-sm font-semibold text-green-800 mb-1 lg:mb-2 flex items-center">
                      <span className="w-1 h-1 lg:w-2 lg:h-2 bg-green-500 rounded-full mr-1 lg:mr-2"></span>
                      Sample Output
                    </p>
                    <code className="text-xs lg:text-sm bg-white p-2 lg:p-3 rounded-lg block font-mono text-gray-800">{problem.sampleOutput}</code>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Scoreboard */}
          <div className="bg-white rounded-xl lg:rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-3 lg:px-6 py-3 lg:py-4">
              <h3 className="font-bold text-white text-sm lg:text-lg flex items-center">
                <Trophy className="h-4 w-4 lg:h-6 lg:w-6 mr-2 lg:mr-3" />
                Live Scoreboard
              </h3>
            </div>
            <div className="p-3 lg:p-6 max-h-48 lg:max-h-64 overflow-y-auto">
              {scoreboard.length === 0 ? (
                <div className="text-center py-4 lg:py-8">
                  <Trophy className="h-8 w-8 lg:h-12 lg:w-12 text-gray-300 mx-auto mb-2 lg:mb-3" />
                  <p className="text-gray-500 text-xs lg:text-sm">No submissions yet</p>
                </div>
              ) : (
                <div className="space-y-2 lg:space-y-3">
                  {scoreboard.map((player, idx) => (
                    <div key={player.userId} className={`flex items-center justify-between p-2 lg:p-4 rounded-lg lg:rounded-xl transition-all duration-200 ${
                      idx === 0 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200' :
                      idx === 1 ? 'bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200' :
                      idx === 2 ? 'bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200' :
                      'bg-gray-50 border border-gray-200'
                    }`}>
                      <div className="flex items-center space-x-2 lg:space-x-4">
                        <div className={`w-6 h-6 lg:w-8 lg:h-8 rounded-full flex items-center justify-center font-bold text-xs lg:text-sm ${
                          idx === 0 ? 'bg-yellow-500 text-white' :
                          idx === 1 ? 'bg-gray-400 text-white' :
                          idx === 2 ? 'bg-orange-500 text-white' :
                          'bg-gray-300 text-gray-700'
                        }`}>
                          {idx + 1}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900 text-xs lg:text-sm">{player.username}</span>
                          {idx < 3 && (
                            <div className="flex items-center space-x-1">
                              {idx === 0 && <span className="text-yellow-500 text-xs">👑</span>}
                              {idx === 1 && <span className="text-gray-500 text-xs">🥈</span>}
                              {idx === 2 && <span className="text-orange-500 text-xs">🥉</span>}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-sm lg:text-lg text-gray-900">{player.score || 0}</span>
                        <p className="text-xs text-gray-500">points</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Code Editor */}
        <div className="w-full lg:w-3/5 flex flex-col">
          <div className="bg-white rounded-xl lg:rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex-1 flex flex-col">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-3 lg:px-6 py-2 lg:py-4">
              <h3 className="font-bold text-white text-sm lg:text-lg">Code Editor</h3>
            </div>
            <div className="flex-1 min-h-0">
              <CodeEditor
                code={code}
                onChange={setCode}
                onSubmit={handleSubmit}
                language={language}
                onLanguageChange={handleLanguageChange}
                disabled={matchStatus !== 'in_progress' || submitting}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchPage;
