import { Link } from 'react-router-dom';
import { ChevronRight, Home } from './icons';
import { useBreadcrumbs } from '../hooks/use-breadcrumbs';

export function Breadcrumbs() {
  const items = useBreadcrumbs();

  if (items.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      {items.map((item, index) => (
        <span key={item.path} className="flex items-center gap-1">
          {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-foreground-muted" />}
          {item.isCurrentPage ? (
            <span className="font-medium text-foreground">{item.label}</span>
          ) : (
            <Link
              to={item.path}
              className="flex items-center gap-1 text-foreground-muted transition-colors hover:text-foreground"
            >
              {index === 0 && <Home className="h-3.5 w-3.5" />}
              {item.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
