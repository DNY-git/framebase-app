import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth-store';
import { LandingPage as LandingDesign } from '../features/landing/LandingPage';

/**
 * Root route: unauthenticated visitors see the (ported) public landing page;
 * already-authenticated users are redirected into the app.
 */
export function LandingPage(): React.JSX.Element {
  const { isAuthenticated, user, isLoadingUser } = useAuthStore();

  // Only redirect to dashboard when we have a verified session (user loaded).
  // A stale token in localStorage alone should not be considered authenticated
  // — fetchUser will validate it and clear isAuthenticated on 401.
  if (isLoadingUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-stone-200 border-t-stone-900"
          aria-label="Loading"
        />
      </div>
    );
  }

  if (isAuthenticated && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LandingDesign />;
}
