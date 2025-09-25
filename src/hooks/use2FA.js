import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import API, { setup2FA as apiSetup2FA, verify2FA as apiVerify2FA, verify2FASetup as apiVerify2FASetup } from '../api';

export const use2FA = () => {
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isEnabling2FA, setIsEnabling2FA] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [backupCodes, setBackupCodes] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  // Dev diagnostics: store last debug info from failed verify
  const [lastVerifyDebug, setLastVerifyDebug] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [lastRedirectAt, setLastRedirectAt] = useState(0);

  const safeNavigate = useCallback((path, replace = true) => {
    if (location.pathname === path) return; // already there
    const now = Date.now();
    if (now - lastRedirectAt < 300) return; // throttle rapid redirects
    setLastRedirectAt(now);
    navigate(path, { replace });
  }, [location.pathname, lastRedirectAt, navigate]);

  // Vérifier le statut 2FA
  const check2FAStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await API.get('/api/2fa/status');
      const payload = response?.data?.data ?? response?.data; // unwrap envelope
      setIs2FAEnabled(!!payload?.enabled);
      setError(null);
      return payload;
    } catch (err) {
      setError('Erreur lors de la vérification du statut 2FA');
      console.error('Erreur 2FA:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Activer 2FA
  const enable2FA = useCallback(async () => {
    try {
      setError(null);
      setQrCodeUrl(null);
      setBackupCodes([]);
      setIsEnabling2FA(true);

      console.log('🔐 Initialisation de la 2FA...');
      const response = await apiSetup2FA();

      // Déjà activée côté serveur (HTTP 409 mappé par api.setup2FA)
      if (response?.alreadyEnabled) {
        setIs2FAEnabled(true);
        setIsEnabling2FA(false);
        setQrCodeUrl(null);
        setBackupCodes([]);
        return { alreadyEnabled: true };
      }

      // backend returns { qrCode, backupCodes }
      if (!response?.qrCode || !response?.backupCodes) {
        throw new Error('Données de configuration 2FA invalides');
      }

      console.log('✅ QR Code et codes de secours générés');
      setQrCodeUrl(response.qrCode);
      setBackupCodes(response.backupCodes);

      return {
        qrCode: response.qrCode,
        backupCodes: response.backupCodes
      };
    } catch (err) {
      console.error('❌ Erreur lors de l\'activation de la 2FA:', err);
      setError(err?.response?.data?.message || 'Erreur lors de l\'activation de la 2FA');
      setIsEnabling2FA(false);
      throw err;
    }
  }, []);

  // Vérifier le code 2FA
  const verify2FACode = useCallback(async (code) => {
    try {
      console.log('🔍 Vérification du code 2FA...');
      // During setup, verify against the temporary secret
      await apiVerify2FASetup(code);

      console.log('✅ Code 2FA vérifié');
      setIs2FAEnabled(true);
      setIsEnabling2FA(false);
      setQrCodeUrl(null);
      setBackupCodes([]);
      // Finalize login if a tempToken exists (get full JWT/session)
      try {
        const hasTemp = typeof window !== 'undefined' && !!localStorage.getItem('tempToken');
        if (hasTemp) {
          const result = await apiVerify2FA(code);
          if (result?.user) {
            console.log('🎟️ Connexion finalisée avec 2FA → redirection /dashboard');
            safeNavigate('/dashboard');
          }
        }
      } catch (finalizeErr) {
        console.warn('Finalisation 2FA non effectuée:', finalizeErr?.message || finalizeErr);
      }

      return true;
    } catch (err) {
      console.error('❌ Erreur de vérification 2FA:', err);
      const debug = err?.response?.data?.debug;
      if (debug) {
        setLastVerifyDebug(debug);
        console.groupCollapsed('🛠️ Debug 2FA (échec vérification)');
        console.log('Code saisi:', code);
        console.log('matchedOffset:', debug.matchedOffset);
        console.log('delta:', debug.delta);
        console.log('codeLength:', debug.codeLength);
        console.log('tokens fenêtre -2..+2:', debug.tokens);
        console.groupEnd();
      }
      setError(err.response?.data?.message || 'Code invalide');
      throw err;
    }
  }, []);

  // Désactiver 2FA
  const disable2FA = useCallback(async (code) => {
    try {
      console.log('🔓 Désactivation de la 2FA...');
      const resp = await API.post('/api/2fa/disable', { code });
      const ok = (resp?.data?.message || '').toLowerCase().includes('disabled successfully');
      // Force a re-check to align with authoritative backend state
      await check2FAStatus();
      if (ok) {
        console.log('✅ 2FA désactivée');
        setBackupCodes([]);
        setError(null);
      }
      return ok;
    } catch (err) {
      console.error('❌ Erreur de désactivation 2FA:', err);
      setError(err.response?.data?.message || 'Code invalide');
      throw err;
    }
  }, [check2FAStatus]);

  // Générer de nouveaux codes de secours
  const generateBackupCodes = useCallback(async () => {
    try {
      console.log('🔄 Génération de nouveaux codes de secours...');
      const response = await API.post('/api/2fa/backup-codes');

      if (!response.data.backupCodes) {
        throw new Error('Pas de codes de secours générés');
      }

      console.log('✅ Nouveaux codes de secours générés');
      setBackupCodes(response.data.backupCodes);
      setError(null);
      return response.data.backupCodes;
    } catch (err) {
      console.error('❌ Erreur de génération des codes:', err);
      setError(err.response?.data?.message || 'Erreur lors de la génération des codes de secours');
      throw err;
    }
  }, []);

  // Vérifier un code de secours
  const verifyBackupCode = useCallback(async (backupCode) => {
    try {
      await API.post('/api/2fa/verify-backup', { code: backupCode });
      return true;
    } catch (err) {
      return false;
    }
  }, []);

  // Vérifier le statut au montage
  useEffect(() => {
    check2FAStatus();
  }, [check2FAStatus]);

  return {
    is2FAEnabled,
    isEnabling2FA,
    qrCodeUrl,
    backupCodes,
    error,
    loading,
    check2FAStatus,
    enable2FA,
    verify2FACode,
    disable2FA,
    generateBackupCodes,
    verifyBackupCode,
    lastVerifyDebug
  };
};
