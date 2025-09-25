import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ClipboardIcon,
  ClockIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  DocumentArrowDownIcon,
  EyeIcon,
  KeyIcon,
  ShieldCheckIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../components/ConfirmDialog';
import { use2FA } from '../hooks/use2FA';
import { useAuditLog } from '../hooks/useAuditLog';
import { useSession } from '../hooks/useSession';
// Tailwind styles used; legacy CSS removed for design coherence

const SecurityPage = () => {
  const navigate = useNavigate();
  const {
    is2FAEnabled,
    isEnabling2FA,
    qrCodeUrl,
    backupCodes,
    enable2FA,
    verify2FACode,
    disable2FA,
    generateBackupCodes,
    check2FAStatus,
    error
  } = use2FA();

  const {
    activeSessions,
    currentSession,
    loading: sessionsLoading,
    revokeSession,
    revokeAllOtherSessions,
    loadSessions
  } = useSession();

  const {
    logs,
    loading: logsLoading,
    loadLogs,
    exportLogs
  } = useAuditLog();

  const [verificationCode, setVerificationCode] = useState('');
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [activeTab, setActiveTab] = useState('2fa');
  const [verifying, setVerifying] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [disabling2FA, setDisabling2FA] = useState(false);
  const [revokingId, setRevokingId] = useState(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [exporting, setExporting] = useState(null); // 'csv' | 'pdf'
  const [confirm, setConfirm] = useState(null); // { type, payload?, title, message, confirmText }
  const [logType, setLogType] = useState('');
  const [logQuery, setLogQuery] = useState('');

  const Spinner = ({ className = 'h-4 w-4' }) => (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
    </svg>
  );

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Charger les sessions au montage de la page
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Removed local Modal in favor of shared ConfirmDialog

  const copyBackupCodes = async () => {
    try {
      await navigator.clipboard.writeText((backupCodes || []).join('\n'));
    } catch (e) {
      // no-op
    }
  };

  const downloadBackupCodes = () => {
    try {
      const blob = new Blob([(backupCodes || []).join('\n')], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'devdash-backup-codes.txt';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      // no-op
    }
  };

  const renderTwoFactorSection = () => (
    <section className="bg-white dark:bg-slate-900 rounded-xl shadow-soft border border-slate-200/60 dark:border-slate-700/50 p-6 animate-fade-in">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-2">
        <DevicePhoneMobileIcon className="h-5 w-5 text-slate-700 dark:text-slate-300" />
        Authentification à deux facteurs
      </h2>
      <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">Renforcez la sécurité de votre compte avec un second facteur d’authentification.</p>

      {!is2FAEnabled ? (
        <div>
          {!isEnabling2FA ? (
            <button
              className="px-4 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 inline-flex items-center gap-2"
              onClick={async () => {
                try {
                  await enable2FA();
                } catch (error) {
                  console.error('Erreur lors de l\'activation de la 2FA:', error);
                }
              }}
            >
              <ShieldCheckIcon className="h-5 w-5" /> Activer l'authentification à deux facteurs
            </button>
          ) : (
            <div className="flex flex-col items-center gap-4">
              {qrCodeUrl && (
                <>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                    {qrCodeUrl.startsWith('data:image') ? (
                      // Backend already returned a full QR Code data URL; render directly to avoid re-encoding 'Data too long'
                      <img src={qrCodeUrl} alt="QR 2FA" className="w-[200px] h-[200px] object-contain" />
                    ) : (
                      <QRCodeSVG value={qrCodeUrl} size={200} />
                    )}
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-sm">
                    Scannez ce QR code avec votre application d'authentification
                    (Google Authenticator, Authy, etc.)
                  </p>
                  {process.env.NODE_ENV !== 'production' && qrCodeUrl && qrCodeUrl.length > 500 && (
                    <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">
                      (Mode dev) Le QR est fourni déjà encodé. Si l'application ne parvient pas à le scanner, basculez sur l'affichage direct ou utilisez le secret affiché ci‑dessous.
                    </p>
                  )}
                  <div className="flex gap-2 w-full max-w-md">
                    <input
                      type="text"
                      placeholder="Code de vérification"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      maxLength={6}
                      className="flex-1 px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400"
                    />
                    <button
                      className="px-4 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 inline-flex items-center gap-2 disabled:opacity-70"
                      disabled={verifying || verificationCode.length < 6}
                      onClick={async () => {
                        try {
                          setVerifying(true);
                          await verify2FACode(verificationCode);
                          setVerificationCode('');
                          // Promote to full session and redirect to dashboard
                          navigate('/dashboard', { replace: true });
                        } catch (error) {
                          console.error('Erreur de vérification:', error);
                        } finally {
                          setVerifying(false);
                        }
                      }}
                    >
                      {verifying ? <Spinner className="h-4 w-4" /> : null}
                      {verifying ? 'Vérification…' : 'Vérifier'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 mb-4">
            <ShieldCheckIcon className="h-5 w-5" />
            L'authentification à deux facteurs est activée
          </div>
          <div className="mt-6">
            <h3 className="text-slate-900 dark:text-slate-100 font-medium flex items-center gap-2 mb-2">
              <KeyIcon className="h-5 w-5 text-slate-700 dark:text-slate-300" />
              Codes de secours
            </h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm">
              Conservez ces codes dans un endroit sûr. Ils vous permettront
              de vous connecter si vous perdez l'accès à votre application
              d'authentification.
            </p>
            <div className="mt-4">
              {showBackupCodes ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded text-center font-mono text-sm py-2 text-slate-900 dark:text-slate-100">
                      {code}
                    </div>
                  ))}
                </div>
              ) : (
                <button className="px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 inline-flex items-center gap-2" onClick={() => setShowBackupCodes(true)}>
                  <EyeIcon className="h-5 w-5" /> Afficher les codes
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {showBackupCodes && (
                <>
                  <button onClick={copyBackupCodes} className="px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 inline-flex items-center gap-2">
                    <ClipboardIcon className="h-5 w-5" /> Copier
                  </button>
                  <button onClick={downloadBackupCodes} className="px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 inline-flex items-center gap-2">
                    <DocumentArrowDownIcon className="h-5 w-5" /> Télécharger
                  </button>
                </>
              )}
              <button
                className="px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 inline-flex items-center gap-2 disabled:opacity-70"
                disabled={generating}
                onClick={() => setConfirm({ type: 'regenCodes', title: 'Générer de nouveaux codes', message: 'Les anciens codes seront invalidés. Voulez-vous continuer ?', confirmText: 'Générer' })}
              >
                {generating ? <Spinner /> : <ArrowPathIcon className="h-5 w-5" />} {generating ? 'Génération…' : 'Générer de nouveaux codes'}
              </button>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={e => setVerificationCode(e.target.value.replace(/\s+/g, '').slice(0, 10))}
                  placeholder="Code / backup"
                  className="px-2 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm w-32"
                />
                <button
                  className="px-3 py-2 rounded-md bg-rose-600 hover:bg-rose-700 text-white inline-flex items-center gap-2 disabled:opacity-70"
                  disabled={disabling2FA || verificationCode.length < 6}
                  onClick={() => setConfirm({ type: 'disable2FA', title: 'Désactiver la 2FA', message: 'Cela réduira la sécurité de votre compte. Entrez le code courant (ou un code de secours) pour confirmer.', confirmText: 'Désactiver' })}
                >
                  {disabling2FA ? <Spinner /> : <TrashIcon className="h-5 w-5" />} {disabling2FA ? 'Désactivation…' : 'Désactiver la 2FA'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );

  const renderSessionsSection = () => (
    <section className="bg-white dark:bg-slate-900 rounded-xl shadow-soft border border-slate-200/60 dark:border-slate-700/50 p-6 animate-fade-in">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
        <ClockIcon className="h-5 w-5 text-slate-700 dark:text-slate-300" />
        Sessions actives
      </h2>

      {sessionsLoading ? (
        <div className="text-center text-slate-500 py-6">Chargement des sessions...</div>
      ) : !Array.isArray(activeSessions) ? (
        <div className="text-center text-slate-500 py-6 text-sm">Aucune donnée de session disponible (encore). Réessayez plus tard.</div>
      ) : activeSessions.length === 0 ? (
        <div className="text-center text-slate-500 py-6 text-sm">Aucune session active.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {activeSessions.map(session => (
            <div key={session.id} className={`flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 ${session.id === currentSession?.id ? 'ring-1 ring-slate-300 dark:ring-slate-600' : ''}`}>
              <div className="flex items-start gap-3">
                <ComputerDesktopIcon className="h-5 w-5 text-slate-500 mt-0.5" />
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    {session.userAgent || 'Appareil inconnu'}
                    {session.id === currentSession?.id && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300">Actuelle</span>
                    )}
                  </div>
                  <div className="text-sm text-slate-500">Dernière activité: {session.lastActiveAt ? new Date(session.lastActiveAt).toLocaleString() : '—'}</div>
                </div>
              </div>
              {session.id !== currentSession?.id && (
                <button
                  className="px-3 py-2 rounded-md bg-rose-600 hover:bg-rose-700 text-white inline-flex items-center gap-2 disabled:opacity-70"
                  disabled={revokingId === session.id}
                  onClick={() => setConfirm({ type: 'revokeSession', payload: session.id, title: 'Révoquer la session', message: 'Êtes-vous sûr de vouloir révoquer cette session ?', confirmText: 'Révoquer' })}
                >
                  {revokingId === session.id ? <Spinner /> : null}
                  {revokingId === session.id ? 'Révocation…' : 'Révoquer'}
                </button>
              )}
            </div>
          ))}
          {activeSessions.length > 1 && (
            <button
              className="px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 self-start inline-flex items-center gap-2 disabled:opacity-70"
              disabled={revokingAll}
              onClick={() => setConfirm({ type: 'revokeAll', title: 'Révoquer les autres sessions', message: 'Toutes les sessions sauf celle-ci seront fermées. Continuer ?', confirmText: 'Révoquer tout' })}
            >
              {revokingAll ? <Spinner /> : null}
              {revokingAll ? 'Révocation…' : 'Révoquer toutes les autres sessions'}
            </button>
          )}
        </div>
      )}
    </section>
  );

  const typeBadge = (type) => {
    if (!type) return 'bg-slate-100 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200';
    // Use neutral high-contrast colors for auth to avoid low-contrast blue
    if (type.startsWith('auth')) return 'bg-slate-100 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200';
    if (type.startsWith('security')) return 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300';
    if (type.startsWith('project')) return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300';
    if (type.startsWith('task')) return 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300';
    return 'bg-slate-100 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200';
  };

  const renderAuditSection = () => (
    <section className="bg-white dark:bg-slate-900 rounded-xl shadow-soft border border-slate-200/60 dark:border-slate-700/50 p-6 animate-fade-in">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4">
        <ClockIcon className="h-5 w-5 text-slate-700 dark:text-slate-300" />
        Journal d'audit
      </h2>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <select value={logType} onChange={(e) => setLogType(e.target.value)} className="text-sm border border-slate-200 rounded-md px-2 py-1 bg-white dark:bg-slate-900 dark:text-slate-100">
            <option value="">Tous les types</option>
            <option value="auth">auth*</option>
            <option value="security">security*</option>
            <option value="project">project*</option>
            <option value="task">task*</option>
          </select>
          <input value={logQuery} onChange={(e) => setLogQuery(e.target.value)} placeholder="Rechercher…" className="text-sm border border-slate-200 rounded-md px-2 py-1 bg-white dark:bg-slate-900 dark:text-slate-100 w-56" />
        </div>
        <div className="flex gap-2">
          <button
            className="px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 inline-flex items-center gap-2 disabled:opacity-70"
            disabled={exporting === 'csv'}
            onClick={async () => {
              try {
                setExporting('csv');
                await exportLogs('csv');
              } finally {
                setExporting(null);
              }
            }}
          >
            {exporting === 'csv' ? <Spinner /> : <ArrowDownTrayIcon className="h-5 w-5" />} {exporting === 'csv' ? 'Export…' : 'CSV'}
          </button>
          <button
            className="px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 inline-flex items-center gap-2 disabled:opacity-70"
            disabled={exporting === 'pdf'}
            onClick={async () => {
              try {
                setExporting('pdf');
                await exportLogs('pdf');
              } finally {
                setExporting(null);
              }
            }}
          >
            {exporting === 'pdf' ? <Spinner /> : <ArrowDownTrayIcon className="h-5 w-5" />} {exporting === 'pdf' ? 'Export…' : 'PDF'}
          </button>
        </div>
      </div>

      {logsLoading ? (
        <div className="grid gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-[180px_160px_160px_1fr] px-4 py-2 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300">
            <div>Date</div>
            <div>Type</div>
            <div>Utilisateur</div>
            <div>Détails</div>
          </div>
          <div>
            {logs
              .filter(l => (logType ? (l.type || '').startsWith(logType) : true))
              .filter(l => (logQuery ? ((l.details || '') + (l.user || '')).toLowerCase().includes(logQuery.toLowerCase()) : true))
              .map((log, idx) => (
                <div key={log.id || idx} className="grid grid-cols-[180px_160px_160px_1fr] px-4 py-3 text-sm text-slate-700 dark:text-slate-200 border-t border-slate-200/70 dark:border-slate-700/60 odd:bg-slate-50/60 dark:odd:bg-slate-800/40">
                  <div className="text-slate-500">{new Date(log.timestamp).toLocaleString()}</div>
                  <div><span className={`px-2 py-0.5 text-xs rounded ${typeBadge(log.type)}`}>{log.type}</span></div>
                  <div className="font-medium">{log.user}</div>
                  <div className="truncate" title={log.details}>{log.details}</div>
                </div>
              ))}
          </div>
        </div>
      )}
    </section>
  );

  return (
    <div className="max-w-[1200px] mx-auto p-6">
      <header className="mb-6 relative overflow-hidden rounded-2xl">
        {/* Removed blue-tinted gradient overlay to maximize text contrast */}
        <div className="relative bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/50 rounded-2xl p-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheckIcon className="h-6 w-6 text-slate-700 dark:text-slate-300" />
            Sécurité
          </h1>
          <p className="text-slate-700 dark:text-slate-300 text-sm">Gérez l’authentification à deux facteurs, les sessions actives et le journal d’audit.</p>
        </div>
      </header>

      <div className="mb-6">
        <nav className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1" aria-label="Tabs">
          {[
            { id: '2fa', label: '2FA' },
            { id: 'sessions', label: 'Sessions' },
            { id: 'audit', label: "Journal d'audit" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="grid gap-6">
        {activeTab === '2fa' && renderTwoFactorSection()}
        {activeTab === 'sessions' && renderSessionsSection()}
        {activeTab === 'audit' && renderAuditSection()}
      </div>

      {/* Unified Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        variant={confirm?.type === 'disable2FA' || confirm?.type === 'revokeSession' || confirm?.type === 'revokeAll' ? 'danger' : 'warning'}
        confirmText={confirm?.confirmText || 'Confirmer'}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          if (!confirm) return;
          try {
            if (confirm.type === 'disable2FA') {
              if (!verificationCode || verificationCode.length < 6) {
                return; // simple guard; dialog will just close if code insufficient
              }
              setDisabling2FA(true);
              await disable2FA(verificationCode);
              setVerificationCode('');
            } else if (confirm.type === 'regenCodes') {
              setGenerating(true);
              await generateBackupCodes(verificationCode);
            } else if (confirm.type === 'revokeSession') {
              setRevokingId(confirm.payload);
              await revokeSession(confirm.payload);
            } else if (confirm.type === 'revokeAll') {
              setRevokingAll(true);
              await revokeAllOtherSessions();
            }
          } finally {
            setGenerating(false);
            setDisabling2FA(false);
            setRevokingId(null);
            setRevokingAll(false);
            setConfirm(null);
          }
        }}
      />
    </div>
  );
};

export default SecurityPage;
