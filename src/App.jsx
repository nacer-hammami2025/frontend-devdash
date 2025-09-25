import { Suspense, useEffect, useRef } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import TaskListOffline from './components/TaskListOffline';
import { useAuth } from './hooks/useAuth';

import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ProjectDetails from './pages/ProjectDetails';
import Projects from './pages/Projects';
import ResetPassword from './pages/ResetPassword';
import Security from './pages/Security';
import ShortcutsHelp from './pages/ShortcutsHelp';
import TaskNew from './pages/TaskNew';

function PrivateRoute({ children, allowTempToken = false }) {
  const { isVerifying, isAuthenticated, user, twoFactor } = useAuth();
  const location = useLocation();
  const hasTempToken = typeof window !== 'undefined' && !!localStorage.getItem('tempToken');

  if (isVerifying) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (allowTempToken && hasTempToken) {
      // Allow access when only tempToken exists (2FA setup flow)
      return <Layout>{children}</Layout>;
    }
    return <Navigate to="/login" state={{ from: location }} replace={true} />;
  }
  // Enforce admin 2FA only once twoFactor object is loaded (avoid undefined race)
  if (!allowTempToken && user?.role === 'admin' && twoFactor && !twoFactor.enabled && location.pathname !== '/security') {
    return <Navigate to="/security" replace={true} />;
  }

  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }) {
  const { isVerifying, isAuthenticated } = useAuth();

  if (isVerifying) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace={true} />;
  }

  return children;
}

export default function App() {
  const { isAuthenticated, isVerifying } = useAuth();
  const navigate = useNavigate();
  const redirectedRef = useRef(false);

  // Dev helper: allow forcing a fresh login + MFA via query params (single-run)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if ((params.has('forceLogin') || params.has('logout')) && !redirectedRef.current) {
      redirectedRef.current = true;
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('tempToken');
        localStorage.removeItem('user');
        localStorage.removeItem('sessionId');
        localStorage.removeItem('sessionExpiry');
      } catch { }
      if (window.location.pathname !== '/login') {
        navigate('/login', { replace: true });
      }
    }
  }, [navigate]);

  if (isVerifying) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="loading-spinner" />
      </div>
    );
  }

  // Composant de chargement pour Suspense
  const LoadingFallback = () => (
    <div className="flex items-center justify-center h-screen">
      <div className="loading-spinner" />
    </div>
  );

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path='/login' element={
          isAuthenticated ? <Navigate to="/dashboard" replace={true} /> : <Login />
        } />
        <Route path='/' element={
          isAuthenticated ? <Navigate to="/dashboard" replace={true} /> : <Navigate to="/login" replace={true} />
        } />
        <Route path='/dashboard' element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } />
        <Route path='/projects' element={
          <PrivateRoute>
            <Projects />
          </PrivateRoute>
        } />
        <Route path='/projects/:id' element={
          <PrivateRoute>
            <ProjectDetails />
          </PrivateRoute>
        } />
        <Route path='/security' element={
          <PrivateRoute allowTempToken>
            <Security />
          </PrivateRoute>
        } />
        <Route path='/reset-password' element={
          <PublicRoute>
            <ResetPassword />
          </PublicRoute>
        } />
        <Route path='/shortcuts' element={
          <PrivateRoute>
            <ShortcutsHelp />
          </PrivateRoute>
        } />
        <Route path='/tasks/new' element={
          <PrivateRoute>
            <TaskNew />
          </PrivateRoute>
        } />
        <Route path='/tasks' element={
          <PrivateRoute>
            <TaskListOffline />
          </PrivateRoute>
        } />
        <Route path="*" element={
          isAuthenticated ? <Navigate to="/dashboard" replace={true} /> : <Navigate to="/login" replace={true} />
        } />
      </Routes>
    </Suspense>
  );
}
