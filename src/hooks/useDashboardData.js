import { useEffect, useState } from "react";
import API from "../api";
import { useApp } from "../context/AppContext";
import { unwrapList } from "../utils/unwrap";

export function useDashboardData({ days = 7, projectId } = {}) {
  const { isOnline } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadData = async () => {
    if (!isOnline) {
      setError("Pas de connexion internet");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [projectsResponse, tasksResponse, auditResponse] = await Promise.all([
        API.get("/projects"),
        API.get("/tasks"),
        API.get("/auth/audit-logs")
      ]);
      let trends = { days: [], created: [], completed: [], inReview: [] };
      try {
        const params = new URLSearchParams();
        if (days) params.set('days', String(days));
        if (projectId) params.set('projectId', projectId);
        const trendsResponse = await API.get(`/analytics/trends?${params.toString()}`);
        trends = trendsResponse?.data || trends;
      } catch (e) {
        console.warn('Analytics trends not available yet:', e?.response?.status || e?.message);
      }

      const projects = unwrapList(projectsResponse);
      const tasks = unwrapList(tasksResponse);

      // Construire un index de comptage des tâches par projet
      const taskCountMap = tasks.reduce((acc, t) => {
        const pid = t.project && (t.project._id || t.project.id || t.project);
        if (pid) acc[pid] = (acc[pid] || 0) + 1;
        return acc;
      }, {});
      // Enrichir chaque projet avec un champ taskCount (non persistant, juste pour affichage)
      const enrichedProjects = projects.map(p => ({
        ...p,
        taskCount: taskCountMap[p._id || p.id] || 0
      }));
      const activities = Array.isArray(auditResponse.data) ? auditResponse.data : [];
      // trends already set above

      // Map backend enums to dashboard categories
      const stats = {
        projects: {
          total: projects.length,
          inProgress: projects.filter(p => p.status === "active").length,
          completed: projects.filter(p => p.status === "completed").length,
          notStarted: projects.filter(p => p.status === "on_hold").length,
          delayed: projects.filter(p => p.status === "cancelled").length
        },
        tasks: {
          total: tasks.length,
          inProgress: tasks.filter(t => t.status === "in_progress" || t.status === "doing").length,
          completed: tasks.filter(t => t.status === "done").length,
          notStarted: tasks.filter(t => t.status === "todo").length,
          overdue: tasks.filter(t => {
            const d = new Date(t.dueDate || t.deadline);
            return t.status !== "done" && d.toString() !== "Invalid Date" && d < new Date();
          }).length,
          priority: {
            high: tasks.filter(t => t.priority === "high").length,
            medium: tasks.filter(t => t.priority === "medium").length,
            low: tasks.filter(t => t.priority === "low").length
          }
        },
        recentTasks: tasks
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 10),
        activities,
        projectList: enrichedProjects,
        taskList: tasks,
        trends
      };

      setData(stats);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch only trends for smoother UI during filter changes
  const loadTrends = async () => {
    if (!isOnline) return;
    try {
      setTrendsLoading(true);
      let trends = { days: [], created: [], completed: [], inReview: [] };
      const params = new URLSearchParams();
      if (days) params.set('days', String(days));
      if (projectId) params.set('projectId', projectId);
      try {
        const trendsResponse = await API.get(`/analytics/trends?${params.toString()}`);
        trends = trendsResponse?.data || trends;
      } catch (e) {
        console.warn('Analytics trends not available yet:', e?.response?.status || e?.message);
      }
      setData(prev => prev ? { ...prev, trends } : prev);
    } finally {
      setTrendsLoading(false);
    }
  };

  // Initial/full load
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      if (!isMounted) return;
      await loadData();
    };

    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOnline]);

  // Trends-only reload when timeframe or project changes (after initial data is present)
  useEffect(() => {
    if (!data) return;
    loadTrends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, projectId]);

  return {
    data,
    loading,
    trendsLoading,
    error,
    reload: loadData
  };
}
