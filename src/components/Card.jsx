import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

export function Card({ title, children, linkTo, actions }) {
  return (
    <div className="bg-white/90 backdrop-blur p-6 rounded-xl shadow-soft">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
        <div className="flex gap-2">
          {actions}
          {linkTo && (
            <Link to={linkTo} className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] text-sm">
              Voir tout →
            </Link>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

Card.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  linkTo: PropTypes.string,
  actions: PropTypes.node
};
