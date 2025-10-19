// frontend/src/pages/MatchPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { matchesAPI } from '../services/api';
import socketService from '../services/socket';
import CodeEditor from '../components/match/CodeEditor';
import { Clock, Users, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';

const MatchPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [match, setMatch] = useState(null);
  const [problem, setProblem] = useState(null);
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(() => {
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
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-4">
      {/* Left Panel - Problem & Scoreboard */}
      <div className="lg:w-1/3 space-y-4 overflow-y-auto">
        {/* Timer */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-primary-600" />
              <span className="font-semibold">Time Remaining</span>
            </div>
            <span className={`text-2xl font-bold ${timeLeft < 60 ? 'text-red-600' : 'text-primary-600'}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        {/* Problem */}
        {loadingProblem ? (
          <div className="card">
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Generating Problem...</h3>
                <p className="text-sm text-gray-500">Please wait while we prepare your coding challenge</p>
              </div>
            </div>
          </div>
        ) : problem ? (
          <div className="card">
            <h2 className="text-xl font-bold mb-3">{problem.title}</h2>
            <span className={`badge badge-${problem.difficulty} mb-3`}>
              {problem.difficulty}
            </span>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap">{problem.description}</p>
            </div>
            <div className="mt-4 space-y-2">
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-xs font-semibold text-gray-600 mb-1">Sample Input:</p>
                <code className="text-sm">{problem.sampleInput}</code>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-xs font-semibold text-gray-600 mb-1">Sample Output:</p>
                <code className="text-sm">{problem.sampleOutput}</code>
              </div>
            </div>
          </div>
        ) : null}

        {/* Scoreboard */}
        <div className="card">
          <h3 className="font-bold mb-3 flex items-center">
            <Trophy className="h-5 w-5 mr-2 text-yellow-600" />
            Live Scoreboard
          </h3>
          {scoreboard.length === 0 ? (
            <p className="text-sm text-gray-500">No submissions yet</p>
          ) : (
            <div className="space-y-2">
              {scoreboard.map((player, idx) => (
                <div key={player.userId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-gray-600">#{idx + 1}</span>
                    <span className="font-medium">{player.username}</span>
                  </div>
                  <span className="font-bold text-primary-600">{player.score}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Code Editor */}
      <div className="lg:w-2/3">
        <div className="card h-full p-0">
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
  );
};

export default MatchPage;
