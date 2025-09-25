import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip
} from 'chart.js';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import QuickCreate from '../components/QuickCreate';
import RecentActivity from '../components/RecentActivity';
import Sparkline from '../components/Sparkline';
// New dashboard components (progressive refactor)
import MetricCard from '../components/dashboard/MetricCard';
import ProjectOverview from '../components/dashboard/ProjectOverview';
import Section from '../components/dashboard/Section';
import UpcomingDeadlines from '../components/dashboard/UpcomingDeadlines';
import ThemePicker from '../components/ThemePicker';
import { useApp } from '../context/AppContext';
import { useDashboardData } from '../hooks/useDashboardData';
import { useTheme } from '../hooks/useTheme';
// Tailwind-based styling replaces custom CSS
import { ArrowUpOnSquareStackIcon, ClockIcon, Cog6ToothIcon, FireIcon, FolderIcon } from '@heroicons/react/24/outline';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function Dashboard() {
  const { user } = useApp();
  const [timeframe, setTimeframe] = useState(7);
  const { theme, setTheme, themes } = useTheme();
  const [projectId, setProjectId] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState('all'); // all|active|completed|on_hold|cancelled
  const { data, loading, trendsLoading, error, reload } = useDashboardData({ days: timeframe, projectId: projectId || undefined });
  const [showCreate, setShowCreate] = useState(false);
  const [anim, setAnim] = useState({ projects: 0, activeTasks: 0, highPriority: 0, overdue: 0 });
  // version key to retrigger card animations when trends update completes
  const [trendVersion, setTrendVersion] = useState(0);
  // Ref used to scroll into view when a project is focused
  const tasksSectionRef = useRef(null);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      }
    }
  };
  // Animate KPI counters when data loads
  useEffect(() => {
    if (!data) return;
    const duration = 600;
    const start = performance.now();
    const from = { projects: 0, activeTasks: 0, highPriority: 0, overdue: 0 };
    const to = {
      projects: data.projects.total || 0,
      activeTasks: data.tasks.inProgress || 0,
      highPriority: data.tasks.priority.high || 0,
      overdue: data.tasks.overdue || 0
    };
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setAnim({
        projects: Math.round(from.projects + (to.projects - from.projects) * ease),
        activeTasks: Math.round(from.activeTasks + (to.activeTasks - from.activeTasks) * ease),
        highPriority: Math.round(from.highPriority + (to.highPriority - from.highPriority) * ease),
        overdue: Math.round(from.overdue + (to.overdue - from.overdue) * ease)
      });
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [data]);

  // Bump version when trendsLoading transitions from true -> false
  useEffect(() => {
    setTrendVersion((v) => (trendsLoading ? v : v + 1));
  }, [trendsLoading]);

  const insights = useMemo(() => {
    if (!data?.trends) return [];
    const avg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    const items = [
      { title: `Créations (${data.trends.days?.length || timeframe}j)`, value: `${avg(data.trends.created)} /j`, trend: data.trends.created, color: '#0ea5e9' },
      { title: `Terminées (${data.trends.days?.length || timeframe}j)`, value: `${avg(data.trends.completed)} /j`, trend: data.trends.completed, color: '#10b981' },
      { title: `En revue (${data.trends.days?.length || timeframe}j)`, value: `${avg(data.trends.inReview)} /j`, trend: data.trends.inReview, color: '#f59e0b' },
    ];
    if (Array.isArray(data.trends.overdue)) {
      items.push({ title: `Retards (${data.trends.days?.length || timeframe}j)`, value: `${avg(data.trends.overdue)} /j`, trend: data.trends.overdue, color: '#ef4444' });
    }
    if (Array.isArray(data.trends.reopened)) {
      items.push({ title: `Réouvertes (${data.trends.days?.length || timeframe}j)`, value: `${avg(data.trends.reopened)} /j`, trend: data.trends.reopened, color: '#6366f1' });
    }
    return items;
  }, [data, timeframe]);

  const projectStatusData = data ? {
    labels: ['En cours', 'Terminés', 'Non démarrés', 'En retard'],
    datasets: [{
      data: [
        data.projects.inProgress,
        data.projects.completed,
        data.projects.notStarted,
        data.projects.delayed
      ],
      backgroundColor: [
        '#3b82f6',
        '#059669',
        '#6b7280',
        '#dc2626'
      ]
    }]
  } : null;

  const taskPriorityData = data ? {
    labels: ['Haute', 'Moyenne', 'Basse'],
    datasets: [{
      label: 'Tâches par priorité',
      data: [
        data.tasks.priority.high,
        data.tasks.priority.medium,
        data.tasks.priority.low
      ],
      backgroundColor: [
        '#fee2e2',
        '#fef3c7',
        '#dcfce7'
      ],
      borderColor: [
        '#dc2626',
        '#d97706',
        '#15803d'
      ],
      borderWidth: 1
    }]
  } : null;

  // IMPORTANT: Hooks (useMemo/useEffect) must appear before any conditional early return.
  // This was previously placed after the early returns (loading/error/no data), which caused
  // "Rendered more hooks than during the previous render" when one render returned early
  // (fewer hooks) and the next reached the additional useMemo. Keeping it here ensures
  // consistent hook order across renders.
  const upcomingItems = useMemo(() => {
    if (!data) return [];
    const now = new Date();
    const projects = (data.projectList || []).map(p => ({
      type: 'project',
      id: p._id || p.id,
      name: p.name,
      deadline: p.deadline || p.dueDate,
      status: p.status,
      taskCount: p.taskCount || 0
    })).filter(p => p.deadline && new Date(p.deadline) >= now);
    const tasks = (data.taskList || []).map(t => ({
      type: 'task',
      id: t._id || t.id,
      title: t.title,
      deadline: t.dueDate || t.deadline,
      status: t.status,
      priority: t.priority
    })).filter(t => t.deadline && new Date(t.deadline) >= now);
    const merged = [
      ...projects.map(p => ({
        type: 'project',
        id: p.id,
        title: p.name,
        due: p.deadline,
        status: p.status,
        priority: undefined,
        taskCount: p.taskCount
      })),
      ...tasks.map(t => ({
        type: 'task',
        id: t.id,
        title: t.title,
        due: t.deadline,
        status: t.status,
        priority: t.priority,
        taskCount: undefined
      }))
    ];
    return merged.sort((a, b) => new Date(a.due) - new Date(b.due)).slice(0, 8);
  }, [data]);

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 w-60 bg-slate-200 rounded animate-pulse" />
          <div className="h-8 w-24 bg-slate-200 rounded animate-pulse" />
        </div>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 mb-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-soft">
              <div className="h-4 w-32 bg-slate-200 rounded mb-3 animate-pulse" />
              <div className="h-8 w-1/2 bg-slate-200 rounded mb-2 animate-pulse" />
              <div className="h-3 w-1/3 bg-slate-200 rounded animate-pulse" />
            </div>
          ))}
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mb-6">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-soft h-[360px]">
              <div className="h-4 w-40 bg-slate-200 rounded mb-4 animate-pulse" />
              <div className="h-full bg-slate-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1400px] mx-auto p-6">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Erreur de chargement
              </h3>
              <p className="mt-2 text-sm text-red-700">
                {error}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-[1400px] mx-auto p-6">
        <div className="text-sm text-slate-500">Chargement des données du tableau de bord...</div>
      </div>
    );
  }


  return (
    <div className="max-w-[1400px] mx-auto p-6 sm:p-6 p-4">
      {/* En-tête moderne */}
      <div className="relative overflow-hidden rounded-2xl mb-5">
        <div className="absolute inset-0 bg-gradient-to-r from-sky-500/10 via-violet-500/10 to-fuchsia-500/10" />
        <div className="relative backdrop-blur-[2px] bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/50 rounded-2xl p-5 sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Bonjour, {user?.username || 'Utilisateur'}</h1>
                <p className="text-slate-600 dark:text-slate-300 text-sm">Synthèse en temps réel de vos projets et activités</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex items-center gap-2 mr-2">
                  <span className="text-sm text-slate-600">Période:</span>
                  <select
                    value={timeframe}
                    onChange={(e) => setTimeframe(Number(e.target.value))}
                    className="text-sm border border-slate-200 rounded-md px-2 py-1 bg-white dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value={7}>7 jours</option>
                    <option value={14}>14 jours</option>
                    <option value={30}>30 jours</option>
                  </select>
                </div>
                <div className="inline-flex items-center gap-2 mr-2"><ThemePicker /></div>
                <div className="inline-flex items-center gap-2 mr-2">
                  <span className="text-sm text-slate-600">Projet:</span>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="text-sm border border-slate-200 rounded-md px-2 py-1 bg-white dark:bg-slate-900 dark:text-slate-100 min-w-[180px]"
                  >
                    <option value="">Tous</option>
                    {(data?.projectList || []).map(p => (
                      <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>
                    ))}
                  </select>
                  {projectId && (
                    <button
                      onClick={() => setProjectId('')}
                      className="text-xs px-2 py-1 rounded border border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
                      title="Effacer le filtre projet"
                    >
                      Effacer
                    </button>
                  )}
                </div>
                <button onClick={reload} className="px-4 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">Actualiser</button>
                <button
                  onClick={() => setShowCreate(v => !v)}
                  className="px-4 py-2 rounded-md bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)] flex items-center gap-1"
                  title="Créer rapidement projet ou tâche"
                >
                  {showCreate ? 'Fermer' : 'Créer'}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {[
                { key: 'all', label: 'Tous' },
                { key: 'active', label: 'Actifs' },
                { key: 'completed', label: 'Terminés' },
                { key: 'on_hold', label: 'En attente' },
                { key: 'cancelled', label: 'Annulés' }
              ].map(f => {
                const active = projectStatusFilter === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setProjectStatusFilter(f.key)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition ${active ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white' : 'bg-white/60 dark:bg-slate-800/60 border-slate-300 dark:border-slate-600 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                  >{f.label}</button>
                );
              })}
            </div>
          </div>
          {showCreate && (
            <div className="mt-5 border-t border-slate-200 dark:border-slate-700 pt-5 animate-fade-in">
              <QuickCreate onCreated={() => { reload(); setShowCreate(false); }} />
            </div>
          )}
        </div>
      </div>


      {/* Cartes de statistiques (nouvelle version MetricCard) */}
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        <MetricCard
          icon={<FolderIcon className="h-5 w-5" />}
          label="Projets"
          value={anim.projects}
          sub={`${data.projects.completed} terminés`}
          variant="primary"
        />
        <MetricCard
          icon={<Cog6ToothIcon className="h-5 w-5" />}
          label="Tâches actives"
          value={anim.activeTasks}
          sub={`Sur ${data.tasks.total} tâches`}
          variant="neutral"
        />
        <MetricCard
          icon={<ArrowUpOnSquareStackIcon className="h-5 w-5" />}
          label="Prioritaires"
          value={anim.highPriority}
          sub="Haute priorité"
          variant="warning"
        />
        <MetricCard
          icon={<ClockIcon className="h-5 w-5" />}
          label="En retard"
          value={anim.overdue}
          sub="À traiter vite"
          variant="danger"
        />
      </div>

      {/* Aperçu projets + échéances */}
      <div className="grid gap-8 grid-cols-1 xl:grid-cols-3 mb-10 items-start">
        <div className="xl:col-span-2 space-y-6">
          <Section title="Projets en cours" description="Vue condensée des projets les plus actifs" actions={
            <button onClick={() => window.location.assign('/projects')} className="text-xs px-3 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800">Tous</button>
          }>
            <ProjectOverview
              projects={(data.projectList || []).filter(p => {
                if (projectStatusFilter === 'all') return true;
                return p.status === projectStatusFilter;
              })}
              max={6}
              onFocus={(id) => {
                setProjectId(id);
                // Custom smooth scroll (more consistent across browsers + adjustable offset)
                setTimeout(() => {
                  const el = tasksSectionRef.current;
                  if (!el) return;
                  const startY = window.scrollY;
                  const targetY = el.getBoundingClientRect().top + window.scrollY - 12; // slight offset
                  const distance = targetY - startY;
                  const duration = 520;
                  const startTime = performance.now();
                  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
                  function step(now) {
                    const t = Math.min(1, (now - startTime) / duration);
                    const eased = easeOutCubic(t);
                    window.scrollTo(0, startY + distance * eased);
                    if (t < 1) requestAnimationFrame(step);
                  }
                  requestAnimationFrame(step);
                }, 40);
              }}
              focusedId={projectId}
            />
          </Section>
        </div>
        <div className="space-y-6">
          <Section title="Échéances à venir" description="Projets & tâches" actions={
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500"><FireIcon className="h-4 w-4 text-rose-500" />Priorité temps</span>
          }>
            <UpcomingDeadlines items={upcomingItems} />
          </Section>
        </div>
      </div>

      {/* Graphiques (encapsulés prochainement dans <Section>) */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mb-8">
        <Section title="État des projets">
          <div style={{ height: '300px' }}>
            <Doughnut data={projectStatusData} options={chartOptions} />
          </div>
        </Section>
        <Section title="Tâches par priorité">
          <div style={{ height: '300px' }}>
            <Bar data={taskPriorityData} options={chartOptions} />
          </div>
        </Section>
      </div>

      {/* Insights avec sparklines */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-600">Insights</h3>
        {projectId && (
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200" title="Filtre projet appliqué">
            Projet :
            <strong className="font-medium">
              {(data?.projectList || []).find(p => (p._id || p.id) === projectId)?.name || 'Sélectionné'}
            </strong>
          </span>
        )}
      </div>
      <div className="grid gap-5 grid-cols-1 md:grid-cols-3 mb-8 animate-fade-in-stagger" key={`insights-${trendVersion}`}>
        {trendsLoading
          ? Array.from({ length: 3 }).map((_, idx) => (
            <div key={`sk-${idx}`} className="bg-white/70 dark:bg-slate-900/70 backdrop-blur rounded-xl shadow-soft border border-slate-200/60 dark:border-slate-700/50 p-5">
              <div className="h-3 w-28 bg-slate-200 rounded mb-3 animate-pulse" />
              <div className="h-6 w-20 bg-slate-200 rounded mb-4 animate-pulse" />
              <div className="h-9 w-full bg-slate-100 rounded animate-pulse" />
            </div>
          ))
          : insights.map((ins, idx) => (
            <div key={`${trendVersion}-${idx}`} className="bg-white/70 dark:bg-slate-900/70 backdrop-blur rounded-xl shadow-soft border border-slate-200/60 dark:border-slate-700/50 p-5 animate-fade-in">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-slate-600">{ins.title}</div>
                  <div className="text-xl font-semibold text-slate-900 dark:text-slate-100">{ins.value}</div>
                </div>
                <Sparkline data={ins.trend} stroke={ins.color} width={120} height={36} />
              </div>
            </div>
          ))}
      </div>

      {/* Activité récente + Tâches récentes */}
      <div id="tasks-section" className="grid gap-8 grid-cols-1 lg:[grid-template-columns:1.2fr_1fr]" ref={tasksSectionRef}>
        <Section title="Activité récente" description="Dernières actions sur les projets & tâches">
          <RecentActivity items={data.activities?.slice(0, 12) || []} />
        </Section>

        <Section title="Tâches récentes" description={projectId ? `Focus sur le projet sélectionné` : 'Les 10 dernières créées ou mises à jour'} actions={
          projectId ? (
            <button
              onClick={() => setProjectId('')}
              className="text-xs px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-700"
            >Annuler focus</button>
          ) : null
        }>
          <div className="grid gap-3">
            {(data.recentTasks || []).filter(t => {
              if (!projectId) return true;
              const pid = t.project && (t.project._id || t.project.id || t.project);
              return pid === projectId;
            }).slice(0, projectId ? 15 : 10).map(task => (
              <div key={task._id || task.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-white/70 dark:bg-slate-800/60">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs mr-2 ${task.priority === 'high'
                  ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                  : task.priority === 'medium'
                    ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                    : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                  }`}>
                  {task.priority === 'high' ? 'Haute' : task.priority === 'medium' ? 'Moyenne' : 'Basse'}
                </span>
                <h4 className="font-medium mt-2 mb-1 text-slate-800 dark:text-slate-100">{task.title}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 line-clamp-2">{task.description}</p>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">{new Date(task.dueDate || task.deadline || task.createdAt).toLocaleDateString()}</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${task.status === 'done'
                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                    : (task.status === 'in_progress' || task.status === 'doing')
                      ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300'
                      : task.status === 'review'
                        ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                        : 'bg-slate-100 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200'
                    }`}>
                    {task.status === 'done' ? 'Terminée' : (task.status === 'in_progress' || task.status === 'doing') ? 'En cours' : task.status === 'review' ? 'En revue' : 'À faire'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}