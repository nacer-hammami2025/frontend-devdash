import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';

// Enregistrer les composants Chart.js nécessaires
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export function ProjectProgress({ data }) {
  const chartData = {
    labels: data.map(p => p.name),
    datasets: [
      {
        label: 'Progression (%)',
        data: data.map(p => p.progress),
        backgroundColor: 'rgba(37, 99, 235, 0.5)',
        borderColor: 'rgb(37, 99, 235)',
        borderWidth: 1
      }
    ]
  };

  return (
    <Bar
      data={chartData}
      options={{
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Progression des Projets'
          }
        }
      }}
    />
  );
}

export function TaskDistribution({ tasks }) {
  const statuses = ['todo', 'in_progress', 'in_review', 'done'];
  const statusLabels = {
    todo: 'À faire',
    in_progress: 'En cours',
    in_review: 'En revue',
    done: 'Terminé'
  };

  const data = {
    labels: statuses.map(s => statusLabels[s]),
    datasets: [{
      data: statuses.map(status => 
        tasks.filter(t => t.status === status).length
      ),
      backgroundColor: [
        'rgba(148, 163, 184, 0.7)',
        'rgba(37, 99, 235, 0.7)',
        'rgba(202, 138, 4, 0.7)',
        'rgba(22, 163, 74, 0.7)'
      ],
      borderColor: [
        'rgb(148, 163, 184)',
        'rgb(37, 99, 235)',
        'rgb(202, 138, 4)',
        'rgb(22, 163, 74)'
      ],
      borderWidth: 1
    }]
  };

  return (
    <Pie
      data={data}
      options={{
        responsive: true,
        plugins: {
          legend: {
            position: 'right',
          },
          title: {
            display: true,
            text: 'Distribution des Tâches'
          }
        }
      }}
    />
  );
}

export function ActivityTimeline({ activities }) {
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  const data = {
    labels: last7Days.map(date => new Date(date).toLocaleDateString('fr-FR', { weekday: 'short' })),
    datasets: [{
      label: 'Activités',
      data: last7Days.map(date => 
        activities.filter(a => a.createdAt.split('T')[0] === date).length
      ),
      borderColor: 'rgb(37, 99, 235)',
      backgroundColor: 'rgba(37, 99, 235, 0.5)',
      tension: 0.4
    }]
  };

  return (
    <Line
      data={data}
      options={{
        responsive: true,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Activité des 7 derniers jours'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }}
    />
  );
}
