import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from '../shared/components/icons';

export function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <FileQuestion className="mb-4 h-16 w-16 text-foreground-muted/40" />
      <h1 className="mb-2 text-3xl font-bold text-foreground">404</h1>
      <p className="mb-6 text-lg text-foreground-muted">Page not found</p>
      <p className="mb-8 max-w-md text-sm text-foreground-muted">
        The page you are looking for does not exist or has been moved.
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
