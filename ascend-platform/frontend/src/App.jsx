// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';

// Components
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminRoute from './components/auth/AdminRoute';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProblemsPage from './pages/ProblemsPage';
import ProblemDetailPage from './pages/ProblemDetailPage';
import LeaderboardPage from './pages/LeaderboardPage';
import MatchPage from './pages/MatchPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboardPage from './pages/AdminDashboardPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/problems" element={<ProblemsPage />} />
            <Route path="/problems/:id" element={<ProblemDetailPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/match/:id" element={<MatchPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* Admin routes */}
          <Route element={<AdminRoute><Layout /></AdminRoute>}>
            <Route path="/admin" element={<AdminDashboardPage />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
