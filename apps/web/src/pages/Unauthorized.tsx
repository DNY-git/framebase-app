import { Link } from 'react-router-dom';
import { ShieldOff, ArrowLeft } from '../shared/components/icons';

export function Unauthorized() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <ShieldOff className="mb-4 h-16 w-16 text-foreground-muted/40" />
      <h1 className="mb-2 text-3xl font-bold text-foreground">403</h1>
      <p className="mb-6 text-lg text-foreground-muted">Access Denied</p>
      <p className="mb-8 max-w-md text-sm text-foreground-muted">
        You do not have permission to access this page. Contact your administrator if you believe this is an error.
      </p>
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>
    </div>
  );
}
