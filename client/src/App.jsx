import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import ExamsPage from './pages/ExamsPage';
import CreateExam from './pages/CreateExam';
import ExamRoom from './pages/ExamRoom';
import SessionReview from './pages/SessionReview';
import MonitorPage from './pages/MonitorPage';

const PrivateRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex-center" style={{ height: '100vh', color: 'var(--text-muted)' }}>Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/exam/:examId/room" element={
            <PrivateRoute roles={['student']}>
              <ExamRoom />
            </PrivateRoute>
          } />
          <Route path="/" element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="exams" element={<ExamsPage />} />
            <Route path="exams/create" element={
              <PrivateRoute roles={['instructor', 'admin']}>
                <CreateExam />
              </PrivateRoute>
            } />
            <Route path="sessions/:sessionId" element={<SessionReview />} />
            <Route path="monitor/:examId" element={
              <PrivateRoute roles={['instructor', 'admin']}>
                <MonitorPage />
              </PrivateRoute>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
