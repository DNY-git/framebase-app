import { useLocation } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  path: string;
  isCurrentPage: boolean;
}

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  projects: 'Projects',
  tasks: 'Tasks',
  equipment: 'Equipment',
  inventory: 'Inventory',
  reports: 'Reports',
  notifications: 'Notifications',
  ai: 'AI Assistant',
  settings: 'Settings',
  audit: 'Audit Log',
  profile: 'Profile',
  login: 'Login',
  register: 'Register',
};

export function useBreadcrumbs(): BreadcrumbItem[] {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return [{ label: 'Dashboard', path: '/', isCurrentPage: true }];
  }

  const items: BreadcrumbItem[] = [
    { label: 'Home', path: '/', isCurrentPage: false },
  ];

  let accumulated = '';
  segments.forEach((segment, index) => {
    accumulated += `/${segment}`;
    const isLast = index === segments.length - 1;
    items.push({
      label: ROUTE_LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
      path: accumulated,
      isCurrentPage: isLast,
    });
  });

  return items;
}
