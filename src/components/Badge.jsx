import PropTypes from 'prop-types';

// Unified neutral + brand palette
export const badgePalette = {
  neutral: {
    bg: 'bg-slate-100 dark:bg-slate-800/60',
    text: 'text-slate-700 dark:text-slate-200'
  },
  brand: {
    bg: 'bg-sky-100 dark:bg-sky-900/40',
    text: 'text-sky-700 dark:text-sky-300'
  },
  success: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/40',
    text: 'text-emerald-700 dark:text-emerald-300'
  },
  warning: {
    bg: 'bg-amber-100 dark:bg-amber-900/40',
    text: 'text-amber-700 dark:text-amber-300'
  },
  danger: {
    bg: 'bg-rose-100 dark:bg-rose-900/40',
    text: 'text-rose-700 dark:text-rose-300'
  }
};

const statusConfig = {
  todo: { ...badgePalette.neutral, label: 'À faire' },
  in_progress: { ...badgePalette.brand, label: 'En cours' },
  in_review: { ...badgePalette.warning, label: 'En revue' },
  done: { ...badgePalette.success, label: 'Terminé' }
};

export function Badge({ status }) {
  const config = statusConfig[status] || statusConfig.todo;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

Badge.propTypes = {
  status: PropTypes.oneOf(['todo', 'in_progress', 'in_review', 'done']).isRequired
};
