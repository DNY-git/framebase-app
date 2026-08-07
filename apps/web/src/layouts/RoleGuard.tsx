import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../stores/auth-store';

const ROLES_HIERARCHY: Record<string, number> = {
  admin: 7,
  project_manager: 6,
  site_engineer: 5,
  fleet_manager: 4,
  procurement: 3,
  crew: 2,
  viewer: 1,
};

interface RoleGuardProps {
  roles?: string[];
  minRole?: string;
}

export function RoleGuard({ roles, minRole }: RoleGuardProps) {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.role) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (minRole) {
    const userLevel = ROLES_HIERARCHY[user.role] ?? 0;
    const requiredLevel = ROLES_HIERARCHY[minRole] ?? 0;
    if (userLevel < requiredLevel) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <Outlet />;
}

export function useHasRole(role: string): boolean {
  const { user } = useAuthStore();
  return user?.role === role;
}

export function useHasMinRole(minRole: string): boolean {
  const { user } = useAuthStore();
  if (!user?.role) return false;
  const userLevel = ROLES_HIERARCHY[user.role] ?? 0;
  const requiredLevel = ROLES_HIERARCHY[minRole] ?? 0;
  return userLevel >= requiredLevel;
}
