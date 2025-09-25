import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { resetPassword } from '../api';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const strengthRules = [
  { re: /.{8,}/, label: '≥8 caractères' },
  { re: /[A-Z]/, label: 'Majuscule' },
  { re: /[a-z]/, label: 'Minuscule' },
  { re: /\d/, label: 'Chiffre' },
  { re: /[^A-Za-z0-9]/, label: 'Symbole' }
];

export default function ResetPassword() {
  const q = useQuery();
  const token = q.get('token') || '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) setErr('Lien invalide ou token manquant.');
  }, [token]);

  const score = strengthRules.reduce((acc, r) => acc + (r.re.test(password) ? 1 : 0), 0);
  const percent = Math.round((score / strengthRules.length) * 100);
  const barColor = percent < 40 ? 'bg-red-500' : percent < 70 ? 'bg-amber-500' : 'bg-emerald-500';

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setErr(null);
    if (!token) return setErr('Token absent.');
    if (password !== confirm) return setErr('Les mots de passe ne correspondent pas.');
    setSubmitting(true);
    try {
      const res = await resetPassword({ token, password });
      if (res.success) {
        setDone(true);
        setTimeout(() => navigate('/login', { replace: true }), 1800);
      } else {
        setErr(res.message || 'Erreur inconnue');
      }
    } catch (e) {
      setErr(e.response?.data?.message || e.message || 'Échec de la réinitialisation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-[var(--color-bg)]">
      <div className="w-full max-w-md relative z-10">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-[var(--color-text)]">Réinitialiser le mot de passe</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Définissez un nouveau mot de passe sécurisé.</p>
        </div>
        <form onSubmit={submit} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm space-y-5">
          {err && <div className="alert-error"><span className="h-2 w-2 rounded-full bg-[var(--color-danger)]" /> <span>{err}</span></div>}
          {done && <div className="alert-warn !text-[var(--color-success)]"><span className="h-2 w-2 rounded-full bg-[var(--color-success)]" /> <span>Mot de passe mis à jour. Redirection…</span></div>}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium tracking-wide text-slate-600 dark:text-slate-300 uppercase">Nouveau mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="field-base" placeholder="••••••••" autoComplete="new-password" />
            <div className="mt-2">
              <div className="h-1.5 w-full rounded bg-[var(--color-surface-alt)] overflow-hidden">
                <div className={`h-full ${barColor} transition-all`} style={{ width: `${percent}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
                {strengthRules.map(r => (
                  <span key={r.label} className={`text-[11px] flex items-center gap-1 ${r.re.test(password) ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'}`}>
                    <span className={`h-2 w-2 rounded-full ${r.re.test(password) ? 'bg-[var(--color-success)]' : 'bg-[var(--color-border-strong)]'}`} /> {r.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium tracking-wide text-slate-600 dark:text-slate-300 uppercase">Confirmer</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required className="field-base" placeholder="••••••••" autoComplete="new-password" />
          </div>
          <button type="submit" disabled={submitting || done} className="btn-accent w-full">
            {submitting ? 'Mise à jour…' : 'Mettre à jour'}
          </button>
          <div className="text-[11px] text-center text-[var(--color-text-muted)] pt-2">Le lien expire après 15 minutes.</div>
        </form>
        <div className="mt-6 text-center">
          <button type="button" onClick={() => navigate('/login')} className="text-[11px] text-[var(--color-accent)] hover:underline">Retour connexion</button>
        </div>
      </div>
    </div>
  );
}
