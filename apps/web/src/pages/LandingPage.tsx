import { Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth-store';
import { ThemeSwitcher } from '../shared/components/ThemeSwitcher';
import {
  HardHat,
  FolderKanban,
  Users,
  CheckSquare,
  Wrench,
  Package,
  FileText,
  Bot,
  ArrowRight,
} from '../shared/components/icons';

const FEATURES = [
  {
    icon: FolderKanban,
    title: 'Projects',
    description:
      'Track every construction project from planning to completion. Manage budgets, phases, timelines, and locations in one place.',
  },
  {
    icon: Users,
    title: 'Team',
    description:
      'Organize your organization with roles, invitations, and member management. Assign managers and control access by project.',
  },
  {
    icon: CheckSquare,
    title: 'Tasks',
    description:
      'Plan and execute work with a structured task board. Dependencies, priorities, and assignments keep crews aligned.',
  },
  {
    icon: Wrench,
    title: 'Equipment',
    description:
      'Maintain a registry of machinery and tools. Track assignments, utilization, and upcoming maintenance schedules.',
  },
  {
    icon: Package,
    title: 'Inventory',
    description:
      'Manage materials and stock levels. Record deliveries, monitor reorder points, and follow every transaction.',
  },
  {
    icon: FileText,
    title: 'Reports',
    description:
      'Turn project data into clear summaries. Monitor spending, progress, and utilization across the portfolio.',
  },
  {
    icon: Bot,
    title: 'AI Assistant',
    description:
      'Ask questions and generate drafts grounded in your project data. Citations keep every answer traceable.',
  },
] as const;

export function LandingPage(): React.JSX.Element {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top navigation */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <HardHat className="h-5 w-5 text-primary-foreground" />
            </span>
            <span className="text-lg font-bold tracking-tight">FrameBase</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeSwitcher />
            <Link
              to="/login"
              className="hidden text-sm font-medium text-foreground-muted transition-colors hover:text-foreground sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 rounded-lg bg-action px-4 py-2 text-sm font-medium text-action-foreground shadow-sm transition-colors hover:bg-action/90"
            >
              Get Started <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-12 sm:px-6 sm:pt-16 lg:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-sm">
            <HardHat className="h-7 w-7 text-primary-foreground" />
          </div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
            Construction tracking platform
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Build smarter. Track every detail.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-foreground-muted sm:text-base">
            FrameBase brings projects, budgets, equipment, and inventory together so your team can plan, execute,
            and deliver with confidence. Purpose-built for construction operations.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-action px-6 py-3 text-sm font-medium text-action-foreground shadow-sm transition-colors hover:bg-action/90 sm:w-auto"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex w-full items-center justify-center rounded-lg border border-border bg-surface px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted sm:w-auto"
            >
              Sign in
            </Link>
          </div>

          {/* Subtle visual band — hints at product without fabricating screenshots */}
          <div className="mt-12 rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-6">
            <div className="grid gap-3 text-left sm:grid-cols-3">
              <div className="rounded-lg bg-surface-muted px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Active projects</p>
                <p className="mt-2 text-lg font-bold text-foreground">Managed in one place</p>
                <p className="mt-1 text-xs text-foreground-muted">Budgets, timelines, and locations tracked together</p>
              </div>
              <div className="rounded-lg bg-surface-muted px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Resources</p>
                <p className="mt-2 text-lg font-bold text-foreground">Equipment & inventory</p>
                <p className="mt-1 text-xs text-foreground-muted">Stock levels, assignments, and maintenance</p>
              </div>
              <div className="rounded-lg bg-surface-muted px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Insights</p>
                <p className="mt-2 text-lg font-bold text-foreground">Reports & assistant</p>
                <p className="mt-1 text-xs text-foreground-muted">Real data, clear summaries, grounded AI</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-surface-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Everything your operations need</h2>
            <p className="mt-2 text-sm text-foreground-muted">
              Seven core modules that cover the full lifecycle of a construction project — no extra tooling required.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-xl border border-border bg-surface p-5 shadow-sm transition-colors hover:bg-surface/80"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
                <p className="mt-1.5 text-sm leading-5 text-foreground-muted">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-10 text-center sm:px-6 sm:py-12 lg:flex-row lg:justify-between lg:text-left">
          <div>
            <h2 className="text-lg font-bold text-foreground sm:text-xl">Ready to get started?</h2>
            <p className="mt-1 text-sm text-foreground-muted">Sign in to your organization or create a new one in seconds.</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-action px-6 py-2.5 text-sm font-medium text-action-foreground shadow-sm transition-colors hover:bg-action/90"
            >
              Create account <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <HardHat className="h-4 w-4 text-primary-foreground" />
              </span>
              <span className="text-sm font-bold">FrameBase</span>
              <span className="text-xs text-foreground-muted">© {new Date().getFullYear()}</span>
            </div>

            <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <Link to="/login" className="text-foreground-muted transition-colors hover:text-foreground">
                Sign in
              </Link>
              <Link to="/register" className="text-foreground-muted transition-colors hover:text-foreground">
                Sign up
              </Link>
              <span className="text-foreground-muted/60">About — coming soon</span>
              <span className="text-foreground-muted/60">Contact — coming soon</span>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
