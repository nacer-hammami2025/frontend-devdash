import { FolderIcon, HomeIcon, MoonIcon, ShieldCheckIcon, SunIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { FaWifi, FaBan as FaWifiSlash } from 'react-icons/fa';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import useSSERealtime from '../hooks/useSSERealtime';
import ConflictResolutionPanel from './ConflictResolutionPanel';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isOnline, registerShortcut } = useApp();
  const [dark, setDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  const { connected: sseConnected, reconnectAttempts } = useSSERealtime({
    onProjectChange: (evt) => {
      // Fire a window event so interested hooks can delta refresh
      window.dispatchEvent(new CustomEvent('realtime:project', { detail: evt }));
    },
    onTaskChange: (evt) => {
      window.dispatchEvent(new CustomEvent('realtime:task', { detail: evt }));
    }
  });

  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    const shortcuts = {
      'g d': () => navigate('/'),
      'g p': () => navigate('/projects'),
      'g t': () => navigate('/tasks'), // added tasks shortcut
      'g s': () => navigate('/security'),
      '?': () => navigate('/shortcuts'),
    };
    Object.entries(shortcuts).forEach(([key, action]) => registerShortcut(key, action));
  }, [navigate, registerShortcut]);

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sidebar */}
      <nav className="w-60 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-5 flex flex-col">
        <div className="mb-7 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-brand dark:text-white">DevDash</h1>
          <div className="flex items-center gap-2">
            <div className={isOnline ? 'text-green-600' : 'text-rose-600'}>
              {isOnline ? <FaWifi /> : <FaWifiSlash />}
            </div>
            <div title={sseConnected ? 'Realtime actif' : 'Reconnect…'} className={sseConnected ? 'w-2 h-2 rounded-full bg-emerald-500' : 'w-2 h-2 rounded-full bg-amber-500 animate-pulse'} />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Link to="/" className={`px-3 py-2 rounded-md no-underline flex items-center gap-2 ${isActive('/') ? 'text-brand bg-sky-50 dark:bg-slate-800' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>
            <HomeIcon className="h-5 w-5" /> Dashboard
          </Link>
          <Link to="/projects" className={`px-3 py-2 rounded-md no-underline flex items-center gap-2 ${isActive('/projects') ? 'text-brand bg-sky-50 dark:bg-slate-800' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>
            <FolderIcon className="h-5 w-5" /> Projets
          </Link>
          <Link to="/tasks" className={`px-3 py-2 rounded-md no-underline flex items-center gap-2 ${isActive('/tasks') ? 'text-brand bg-sky-50 dark:bg-slate-800' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>🗒️ Tâches</Link>
          <Link to="/security" className={`px-3 py-2 rounded-md no-underline flex items-center gap-2 ${isActive('/security') ? 'text-brand bg-sky-50 dark:bg-slate-800' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}>
            <ShieldCheckIcon className="h-5 w-5" /> Sécurité
          </Link>
        </div>

        <div className="mt-8">
          <button onClick={() => setDark(d => !d)} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
            {dark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />} {dark ? 'Mode clair' : 'Mode sombre'}
          </button>
        </div>

        <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 px-1">
          {sseConnected ? 'Realtime OK' : `Reco x${reconnectAttempts}`}
        </div>

        <div className="mt-4" style={{ flexGrow: 1, overflowY: 'auto' }}>
          <ConflictResolutionPanel compact limit={25} title="Conflits" autoHide />
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 p-5 bg-slate-50 dark:bg-slate-900 overflow-y-auto text-slate-900 dark:text-slate-100">
        {children}
      </main>
    </div>
  );
}
