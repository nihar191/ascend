// frontend/src/pages/MatchPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { matchesAPI } from '../services/api';
import socketService from '../services/socket';
import CodeEditor from '../components/match/CodeEditor';
import { Clock, Users, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';

const MatchPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [problem, setProblem] = useState(null);
  const [code, setCode] = useState('// Write your solution here\n\n');
  const [timeLeft, setTimeLeft] = useState(null);
  const [scoreboard, setScoreboard] = useState([]);
  const [matchStatus, setMatchStatus] = useState('waiting');
  const [submitting, setSubmitting] = useState(false);

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

  const fetchMatch = async () => {
    try {
      const response = await matchesAPI.getOne(id);
      setMatch(response.data);
      
      if (response.data.status === 'waiting') {
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
      setTimeLeft(data.duration);
      toast.success('Match started!');
    });

    socketService.onTimeSync((data) => {
      setTimeLeft(Math.floor(data.timeLeft / 1000));
    });

    socketService.onSubmissionResult((data) => {
      setSubmitting(false);
      if (data.status === 'accepted') {
        toast.success(`Accepted! Score: ${data.score}`);
      } else {
        toast.error(`${data.status} - ${data.passedTests}/${data.totalTests} tests passed`);
      }
    });

    socketService.onScoreboardUpdate((data) => {
      setScoreboard(data);
    });

    socketService.onMatchEnded((data) => {
      setMatchStatus('completed');
      toast.success('Match ended!');
      setTimeout(() => navigate('/dashboard'), 5000);
    });
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      toast.error('Code cannot be empty');
      return;
    }

    setSubmitting(true);
    socketService.submitCode(id, code, 'javascript');
    toast.loading('Submitting code...', { duration: 1000 });
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
        {problem && (
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
        )}

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
            language="javascript"
            disabled={matchStatus !== 'in_progress' || submitting}
          />
        </div>
      </div>
    </div>
  );
};

export default MatchPage;
