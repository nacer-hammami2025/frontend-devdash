import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { requestPasswordReset } from '../api';
import DynamicBackground from '../components/DynamicBackground';
import ThemeAsset from '../components/ThemeAsset';
import ThemePicker from '../components/ThemePicker';
import { useAnimationIntensity } from '../hooks/useAnimationIntensity';
import { useAuth } from '../hooks/useAuth';
import { useSoundFx } from '../hooks/useSoundFx';
import { useTheme } from '../hooks/useTheme';

// NOTE: Refonte UI Login (pro look)
// Améliorations incluses:
// - Carte centrale avec header branding et gradient subtil
// - Toggle visibilité mot de passe
// - Focus states renforcés & a11y (aria-live pour erreurs)
// - Barre de progression fine pendant loading
// - Bouton retour étape 2FA + lien aide
// - Zones de messages cohérentes (session expirée / erreur)
// - Préparation future: lien "Mot de passe oublié" (placeholder)

export default function Login() {
  const animIntensity = useAnimationIntensity();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [devResetLink, setDevResetLink] = useState(null);
  const [attemptsInfo, setAttemptsInfo] = useState(null); // {attemptsRemaining, lockedUntil}
  const [rememberMe, setRememberMe] = useState(false);

  const { login } = useAuth();
  const { theme, setTheme, themes } = useTheme();
  const { playClick, playHover, enabled: soundEnabled, playSuccess } = useSoundFx();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('expired') === 'true') {
      setSessionExpired(true);
      setErr('Your session has expired. Please log in again.');
    }
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    playClick();
    setLoading(true);
    setErr(null);

    try {
      if (showTwoFactor) {
        const tempToken = localStorage.getItem('tempToken');
        const result = await login({ code, tempToken });
        if (result.user) {
          setSessionExpired(false);
          setErr(null);
          localStorage.removeItem('tempToken');
          setTimeout(() => navigate('/dashboard', { replace: true }), 100);
        } else {
          setErr('Code 2FA invalide');
        }
      } else {
        const result = await login({ email, password, rememberMe });
        if (result.requires2FA) {
          localStorage.setItem('tempToken', result.tempToken);
          setErr(null);
          if (result.setupRequired) {
            navigate('/security', { replace: true });
          } else {
            setShowTwoFactor(true);
            setCode('');
          }
        } else if (result.user) {
          setSessionExpired(false);
          setErr(null);
          setTimeout(() => navigate('/dashboard', { replace: true }), 100);
        } else {
          setErr('Échec de la connexion');
        }
      }
    } catch (e) {
      console.error('Login error:', e);
      const msg = e.meta?.attemptsRemaining !== undefined ? `${e.message} (tentatives restantes: ${e.meta.attemptsRemaining})` : (e.response?.data?.message || e.message || 'Connection error');
      setErr(msg);
      if (e.meta) setAttemptsInfo(e.meta);
      if (e.response?.status === 429) setErr('Too many login attempts. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const submitForgot = async (e) => {
    e.preventDefault();
    playClick();
    if (!resetEmail) return;
    setLoading(true); setErr(null); setResetSent(false);
    try {
      const res = await requestPasswordReset(resetEmail);
      setResetSent(true);
      playSuccess();
      if (res.devResetLink) {
        setDevResetLink(res.devResetLink);
        console.log('Lien de réinitialisation (dev):', res.devResetLink);
      } else if (res.token) {
        console.log('Dev token (fallback):', res.token);
      }
    } catch (err) {
      setErr(err.response?.data?.message || 'Erreur envoi lien');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center px-4 py-10 sm:px-6 lg:px-8 bg-[var(--color-bg)]" onMouseEnter={() => soundEnabled && playHover()}>
      <DynamicBackground />
      {/* Sélecteur de thème (coin supérieur) */}
      <div className="absolute top-4 right-4 z-20"><ThemePicker /></div>
      {/* Subtle background accent */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-96 h-96 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(var(--color-focus-ring)/0.18),transparent_70%)]" />
        <div className="absolute -bottom-48 -left-40 w-[520px] h-[520px] rounded-full bg-[radial-gradient(circle_at_60%_60%,rgba(var(--color-focus-ring)/0.15),transparent_75%)]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="flex items-center justify-center mb-8">
          <ThemeAsset type="logo" variant="full" size={70} />
        </div>

        <div className="relative group rounded-2xl shadow-xl shadow-slate-900/5 dark:shadow-black/30 border border-[var(--color-border)] dark:border-[var(--color-border)] bg-[var(--color-surface)] dark:bg-[var(--color-surface)] p-7 sm:p-8">
          {loading && (
            <div className="absolute top-0 left-0 h-0.5 w-full overflow-hidden rounded-t-2xl">
              <div className="h-full w-full origin-left animate-[progress_1.2s_ease_infinite] progress-accent" />
            </div>
          )}
          <style>{`@keyframes progress {0%{transform:scaleX(0)}50%{transform:scaleX(1)}100%{transform:scaleX(0)}}`}</style>
          <h1 id="login-title" className="text-[1.65rem] font-semibold text-[var(--color-text)] tracking-tight">
            {showForgot ? 'Réinitialisation du mot de passe' : showTwoFactor ? 'Authentification à deux facteurs' : 'Connexion à DevDash'}
          </h1>
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
            {showForgot ? 'Entrez votre e-mail pour recevoir un lien de réinitialisation.' : showTwoFactor ? 'Saisissez votre code pour finaliser la connexion.' : 'Accédez à votre tableau de bord sécurisé.'}
          </p>

          <div aria-live="polite" className="space-y-3 mt-5">
            {sessionExpired && (
              <div className="alert-warn">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-[var(--color-warning)]" />
                <span>Session expirée. Veuillez vous reconnecter.</span>
              </div>
            )}
            {err && (
              <div className="alert-error">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-[var(--color-danger)]" />
                <span>{err}</span>
              </div>
            )}
          </div>

          {!showForgot && (
            <form onSubmit={submit} className="mt-7 space-y-5" noValidate>
              {!showTwoFactor ? (
                <>
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="block text-xs font-medium tracking-wide text-slate-600 dark:text-slate-300 uppercase">Adresse e-mail</label>
                    <div className="relative">
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="ex: contact@exemple.com"
                        autoComplete="email"
                        required
                        className="field-base"
                      />
                      <div className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-transparent peer-focus:ring-[var(--color-accent)]/30 peer-focus:border-[var(--color-accent)]/60" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="password" className="block text-xs font-medium tracking-wide text-slate-600 dark:text-slate-300 uppercase">Mot de passe</label>
                    <div className="relative group/password">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Votre mot de passe"
                        required
                        autoComplete="current-password"
                        className="field-base pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                        className="absolute inset-y-0 right-0 px-2 text-[11px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      >{showPassword ? 'Hide' : 'Show'}</button>
                    </div>
                    <div className="flex justify-between pt-1">
                      <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                        Sécurisé par HTTPS
                      </div>
                      <button type="button" onClick={() => { setShowForgot(true); setErr(null); }} className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                        Mot de passe oublié ?
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-1.5">
                  <label htmlFor="code" className="block text-xs font-medium tracking-wide text-[var(--color-text-muted)] uppercase">Code d’authentification</label>
                  <input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="Code 6 chiffres ou secours"
                    required
                    autoComplete="one-time-code"
                    className="field-base tracking-widest font-mono"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Code généré par votre application TOTP ou un code de secours.</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-accent"
                >
                  {loading && <span className="h-3 w-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  {loading ? 'Connexion…' : showTwoFactor ? 'Vérifier' : 'Se connecter'}
                </button>
                {!showTwoFactor && (
                  <label className="flex items-center gap-2 text-[11px] text-[var(--color-text-muted)] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]/40"
                    />
                    <span>Se souvenir de moi</span>
                  </label>
                )}
                {showTwoFactor && (
                  <button
                    type="button"
                    onClick={() => { setShowTwoFactor(false); setCode(''); setErr(null); }}
                    className="btn-ghost"
                  >Retour</button>
                )}
                <div className="flex-1" />
                <div className="text-[11px] text-slate-500 dark:text-slate-400">v1.0{attemptsInfo?.attemptsRemaining !== undefined && !showTwoFactor && !showForgot ? ` · Tentatives: ${attemptsInfo.attemptsRemaining}` : ''}</div>
              </div>
            </form>
          )}

          {showForgot && (
            <form onSubmit={submitForgot} className="mt-7 space-y-5" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="resetEmail" className="block text-xs font-medium tracking-wide text-[var(--color-text-muted)] uppercase">Adresse e-mail</label>
                <input id="resetEmail" type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} required placeholder="ex: contact@exemple.com" className="field-base" />
                {resetSent && <p className="text-[11px] text-[var(--color-success)] mt-1">Si ce compte existe, un lien a été envoyé.</p>}
                {devResetLink && (
                  <p className="text-[11px] mt-2 break-words text-[var(--color-text-muted)]">Lien direct (dev): <a className="underline text-[var(--color-accent)]" href={devResetLink}>Ouvrir</a></p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
                <button type="submit" disabled={loading} className="btn-accent">
                  {loading ? 'Envoi…' : 'Envoyer le lien'}
                </button>
                <button type="button" onClick={() => { setShowForgot(false); setResetEmail(''); setResetSent(false); }} className="btn-ghost">Retour</button>
                <div className="flex-1" />
                <div className="text-[11px] text-slate-500 dark:text-slate-400">v1.0</div>
              </div>
            </form>
          )}
        </div>
        <div className="mt-6 text-center">
          <p className="text-[11px] text-slate-500 dark:text-slate-500/80">© {new Date().getFullYear()} DevDash. Sécurité & productivité unifiées.</p>
        </div>
      </div>
    </div>
  );
}