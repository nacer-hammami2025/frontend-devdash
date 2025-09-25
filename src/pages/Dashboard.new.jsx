import { Menu } from '@headlessui/react';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip
} from 'chart.js';
import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import API from '../api';
import { unwrapList } from '../utils/unwrap';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    projects: {
      total: 0,
      inProgress: 0,
      completed: 0,
      notStarted: 0,
      delayed: 0
    },
    tasks: {
      total: 0,
      inProgress: 0,
      completed: 0,
      notStarted: 0,
      priority: {
        high: 0,
        medium: 0,
        low: 0
      }
    },
    chart: {
      labels: [],
      datasets: []
    }
  });

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [projectsRes, tasksRes] = await Promise.all([
        API.get('/projects'),
        API.get('/tasks')
      ]);

      const projects = unwrapList(projectsRes);
      const tasks = unwrapList(tasksRes);

      // Calculer les statistiques des projets
      const projectStats = {
        total: projects.length,
        inProgress: projects.filter(p => p.status === 'in_progress').length,
        completed: projects.filter(p => p.status === 'completed').length,
        notStarted: projects.filter(p => p.status === 'not_started').length,
        delayed: projects.filter(p => p.status === 'delayed').length
      };

      // Calculer les statistiques des tâches
      const taskStats = {
        total: tasks.length,
        inProgress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        notStarted: tasks.filter(t => t.status === 'not_started').length,
        priority: {
          high: tasks.filter(t => t.priority === 'high').length,
          medium: tasks.filter(t => t.priority === 'medium').length,
          low: tasks.filter(t => t.priority === 'low').length
        }
      };

      // Préparer les données pour le graphique
      const chartData = {
        labels: ['Non démarré', 'En cours', 'Terminé', 'En retard'],
        datasets: [
          {
            label: 'Projets par statut',
            data: [
              projectStats.notStarted,
              projectStats.inProgress,
              projectStats.completed,
              projectStats.delayed
            ],
            backgroundColor: [
              'rgba(54, 162, 235, 0.5)',
              'rgba(255, 206, 86, 0.5)',
              'rgba(75, 192, 192, 0.5)',
              'rgba(255, 99, 132, 0.5)'
            ],
            borderColor: [
              'rgba(54, 162, 235, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(255, 99, 132, 1)'
            ],
            borderWidth: 1
          }
        ]
      };

      setStats({
        projects: projectStats,
        tasks: taskStats,
        chart: chartData
      });
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleExport = (type, format) => {
    // TODO: Implémenter l'export
    console.log(`Exporting ${type} in ${format} format`);
  };

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Tableau de bord</h2>
        <div className="dashboard-actions">
          <Menu as="div" className="export-menu">
            <Menu.Button className="button button-primary">
              Exporter <span className="icon">↓</span>
            </Menu.Button>
            <Menu.Items className="export-menu-items">
              <Menu.Item>
                <button onClick={() => handleExport('projects', 'pdf')}>
                  Projets en PDF
                </button>
              </Menu.Item>
              <Menu.Item>
                <button onClick={() => handleExport('projects', 'csv')}>
                  Projets en CSV
                </button>
              </Menu.Item>
              <Menu.Item>
                <button onClick={() => handleExport('tasks', 'pdf')}>
                  Tâches en PDF
                </button>
              </Menu.Item>
              <Menu.Item>
                <button onClick={() => handleExport('tasks', 'csv')}>
                  Tâches en CSV
                </button>
              </Menu.Item>
            </Menu.Items>
          </Menu>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Projets</h3>
          <div className="stat-value">{stats.projects.total}</div>
          <div className="stat-details">
            <div>En cours: {stats.projects.inProgress}</div>
            <div>Terminés: {stats.projects.completed}</div>
            <div>Non démarrés: {stats.projects.notStarted}</div>
            <div>En retard: {stats.projects.delayed}</div>
          </div>
        </div>

        <div className="stat-card">
          <h3>Tâches</h3>
          <div className="stat-value">{stats.tasks.total}</div>
          <div className="stat-details">
            <div>En cours: {stats.tasks.inProgress}</div>
            <div>Terminées: {stats.tasks.completed}</div>
            <div>Non démarrées: {stats.tasks.notStarted}</div>
          </div>
        </div>

        <div className="stat-card">
          <h3>Priorités des tâches</h3>
          <div className="stat-details">
            <div>Haute: {stats.tasks.priority.high}</div>
            <div>Moyenne: {stats.tasks.priority.medium}</div>
            <div>Basse: {stats.tasks.priority.low}</div>
          </div>
        </div>
      </div>

      <div className="chart-container">
        <Bar
          data={stats.chart}
          options={{
            responsive: true,
            plugins: {
              legend: {
                position: 'top',
              },
              title: {
                display: true,
                text: 'Distribution des projets par statut'
              }
            }
          }}
        />
      </div>
    </div>
  );
}
