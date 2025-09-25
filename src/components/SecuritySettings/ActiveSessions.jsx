import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function ActiveSessions() {
  const { sessions, refreshSessions, revokeSession, revokeOtherSessions } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revoking, setRevoking] = useState(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      await refreshSessions();
    } catch (err) {
      setError('Failed to load sessions');
      console.error('Session loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (sessionId) => {
    try {
      setRevoking(sessionId);
      await revokeSession(sessionId);
      await loadSessions();
    } catch (err) {
      setError('Failed to revoke session');
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeOthers = async () => {
    try {
      setLoading(true);
      await revokeOtherSessions();
      await loadSessions();
    } catch (err) {
      setError('Failed to revoke other sessions');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !sessions.length) {
    return (
      <div className="text-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading sessions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadSessions}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Active Sessions</h3>
        {sessions.length > 1 && (
          <button
            onClick={handleRevokeOthers}
            className="text-sm text-red-600 hover:text-red-800"
            disabled={loading}
          >
            Revoke all other sessions
          </button>
        )}
      </div>

      <div className="space-y-3">
        {sessions.map(session => (
          <div
            key={session.id}
            className="p-4 bg-white border rounded-lg shadow-sm"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-medium">
                    {session.device.browser} on {session.device.os}
                  </span>
                  {session.isCurrentSession && (
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                      Current session
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  <p>IP: {session.device.ip}</p>
                  <p>Last activity: {format(new Date(session.lastActivity), 'PPpp', { locale: fr })}</p>
                  <p>Expires: {format(new Date(session.expiresAt), 'PPpp', { locale: fr })}</p>
                </div>
              </div>

              {!session.isCurrentSession && (
                <button
                  onClick={() => handleRevoke(session.id)}
                  disabled={revoking === session.id}
                  className={`text-sm text-red-600 hover:text-red-800 ${
                    revoking === session.id ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {revoking === session.id ? 'Revoking...' : 'Revoke'}
                </button>
              )}
            </div>
          </div>
        ))}

        {sessions.length === 0 && (
          <p className="text-center text-gray-500 py-4">
            No active sessions found
          </p>
        )}
      </div>
    </div>
  );
}
