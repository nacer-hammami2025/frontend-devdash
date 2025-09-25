import { useEffect, useState } from 'react';
import {
  disable2FA as apiDisable2FA,
  get2FAStatus as apiGet2FAStatus,
  getAuditLogs as apiGetAuditLogs,
  getSessions as apiGetSessions,
  login as apiLogin,
  logout as apiLogout,
  revokeOtherSessions as apiRevokeOtherSessions,
  revokeSession as apiRevokeSession,
  setup2FA as apiSetup2FA,
  verify2FA as apiVerify2FA
} from '../api';

export function useAuth() {
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [twoFactor, setTwoFactor] = useState({ enabled: false });
  const [sessions, setSessions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    const verifyAuth = async () => {
      console.log('🔍 Verifying authentication...');

      try {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        const sessionExpiry = localStorage.getItem('sessionExpiry');

        // Clear state if no data is present
        if (!token || !storedUser || !sessionExpiry) {
          console.log('❌ No valid session found');
          setIsAuthenticated(false);
          setUser(null);
          // Important: do not leave verifying stuck
          setIsVerifying(false);
          return;
        }

        // Check if session has expired
        if (new Date(sessionExpiry) < new Date()) {
          console.log('❌ Session expired');
          handleLogout();
          // Important: mark verifying complete even on early exit
          setIsVerifying(false);
          return;
        }

        // Load user data from storage
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setIsAuthenticated(true);

        // Fetch active sessions and audit logs (best-effort)
        const results = await Promise.allSettled([
          apiGetSessions(),
          apiGetAuditLogs(),
          apiGet2FAStatus()
        ]);

        if (results[0].status === 'fulfilled') {
          setSessions(results[0].value);
        }
        if (results[2].status === 'fulfilled') {
          setTwoFactor({ enabled: !!results[2].value?.enabled });
        }
        if (results[1].status === 'fulfilled') {
          setAuditLogs(results[1].value);
        }
      } catch (error) {
        console.error('❌ Verification failed:', error);
        handleLogout();
      } finally {
        setIsVerifying(false);
      }
    };

    verifyAuth();
  }, []);

  const handleLogout = async () => {
    await apiLogout();
    setIsAuthenticated(false);
    setUser(null);
    setSessions([]);
    setAuditLogs([]);
  };

  const login = async (credentials) => {
    try {
      // Pass the entire credentials object to API layer
      const result = await apiLogin(credentials);

      if (result.requires2FA) {
        // Preserve tempToken and setupRequired for enforced 2FA
        return { requires2FA: true, tempToken: result.tempToken, setupRequired: result.setupRequired };
      }

      if (result.user) {
        // Mettre à jour l'état d'authentification et les données utilisateur
        setUser(result.user);
        setIsAuthenticated(true);

        // Fetch initial sessions and audit logs (best-effort)
        const results = await Promise.allSettled([
          apiGetSessions(),
          apiGetAuditLogs(),
          apiGet2FAStatus()
        ]);

        if (results[0].status === 'fulfilled') {
          setSessions(results[0].value);
        }
        if (results[1].status === 'fulfilled') {
          setAuditLogs(results[1].value);
        }
        if (results[2].status === 'fulfilled') {
          setTwoFactor({ enabled: !!results[2].value?.enabled });
        }

        return { user: result.user };
      }

      return false;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  // 2FA management
  const setup2FA = async () => {
    try {
      return await apiSetup2FA();
    } catch (error) {
      console.error('2FA setup failed:', error);
      throw error;
    }
  };

  const verify2FA = async (code) => {
    try {
      return await apiVerify2FA(code);
    } catch (error) {
      console.error('2FA verification failed:', error);
      throw error;
    }
  };

  const disable2FA = async (code) => {
    try {
      return await apiDisable2FA(code);
    } catch (error) {
      console.error('2FA disable failed:', error);
      throw error;
    }
  };

  // Session management
  const refreshSessions = async () => {
    try {
      const sessionsData = await apiGetSessions();
      setSessions(sessionsData);
      return sessionsData;
    } catch (error) {
      console.error('Failed to refresh sessions:', error);
      throw error;
    }
  };

  const revokeSession = async (sessionId) => {
    try {
      await apiRevokeSession(sessionId);
      await refreshSessions();
    } catch (error) {
      console.error('Session revocation failed:', error);
      throw error;
    }
  };

  const revokeOtherSessions = async () => {
    try {
      await apiRevokeOtherSessions();
      await refreshSessions();
    } catch (error) {
      console.error('Failed to revoke other sessions:', error);
      throw error;
    }
  };

  // Audit log management
  const refreshAuditLogs = async () => {
    try {
      const logsData = await apiGetAuditLogs();
      setAuditLogs(logsData);
      return logsData;
    } catch (error) {
      console.error('Failed to refresh audit logs:', error);
      throw error;
    }
  };

  return {
    // Authentication state
    isVerifying,
    isAuthenticated,
    user,
    twoFactor,

    // Core authentication functions
    login,
    logout: handleLogout,

    // 2FA management
    setup2FA,
    verify2FA,
    disable2FA,

    // Session management
    sessions,
    refreshSessions,
    revokeSession,
    revokeOtherSessions,

    // Audit logs
    auditLogs,
    refreshAuditLogs
  };
}
