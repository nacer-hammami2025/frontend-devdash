import React, { useState } from 'react';
import { 
  FaChartLine, 
  FaCalendar, 
  FaUsers, 
  FaTasks,
  FaClock,
  FaCheckCircle,
  FaExclamationCircle
} from 'react-icons/fa';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar,
  PieChart,
  Pie,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer 
} from 'recharts';
import { useAnalytics } from '../hooks/useAnalytics';
import DateRangePicker from '../components/analytics/DateRangePicker';
import MetricCard from '../components/analytics/MetricCard';
import '../styles/Analytics.css';

const AnalyticsPage = () => {
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date()
  });

  const {
    metrics,
    taskCompletion,
    teamPerformance,
    projectProgress,
    loading,
    error
  } = useAnalytics(dateRange);

  if (loading) {
    return <div className="analytics-loading">Chargement des analyses...</div>;
  }

  if (error) {
    return <div className="analytics-error">{error}</div>;
  }

  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <h1>
          <FaChartLine /> Tableau de bord analytique
        </h1>
        <DateRangePicker 
          startDate={dateRange.start}
          endDate={dateRange.end}
          onChange={setDateRange}
        />
      </header>

      <div className="metrics-grid">
        <MetricCard
          icon={<FaTasks />}
          title="Tâches complétées"
          value={metrics.completedTasks}
          trend={metrics.taskCompletionTrend}
          comparisonLabel="vs période précédente"
        />
        <MetricCard
          icon={<FaClock />}
          title="Temps moyen par tâche"
          value={`${metrics.avgTaskTime}h`}
          trend={metrics.taskTimeTrend}
          comparisonLabel="vs moyenne"
        />
        <MetricCard
          icon={<FaUsers />}
          title="Performance équipe"
          value={`${metrics.teamPerformance}%`}
          trend={metrics.teamPerformanceTrend}
          comparisonLabel="vs objectif"
        />
        <MetricCard
          icon={<FaCheckCircle />}
          title="Taux de réussite"
          value={`${metrics.successRate}%`}
          trend={metrics.successRateTrend}
          comparisonLabel="vs attendu"
        />
      </div>

      <div className="charts-grid">
        <div className="chart-container">
          <h3>Progression des tâches</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={taskCompletion}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="completed" 
                stroke="#4CAF50" 
                name="Complétées"
              />
              <Line 
                type="monotone" 
                dataKey="created" 
                stroke="#2196F3" 
                name="Créées"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>Performance par équipe</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="team" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar 
                dataKey="completed" 
                fill="#4CAF50" 
                name="Tâches complétées"
              />
              <Bar 
                dataKey="inProgress" 
                fill="#FFC107" 
                name="En cours"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>État des projets</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={projectProgress}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                label
              >
                {projectProgress.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color} 
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="insights-section">
        <h3>
          <FaExclamationCircle /> Points d'attention
        </h3>
        <ul className="insights-list">
          {metrics.insights.map((insight, index) => (
            <li key={index} className={`insight-item ${insight.type}`}>
              {insight.message}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AnalyticsPage;
