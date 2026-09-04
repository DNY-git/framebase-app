import { Link } from 'react-router-dom';
import { Logo } from '../../shared/components/Logo';

function Soon({ children }: { children: string }) {
  return <span className="text-foreground-muted/60">{children} — soon</span>;
}

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div>
            <Link to="/" aria-label="FrameBase home" className="inline-flex items-center">
              <Logo className="h-8 w-auto" />
            </Link>
            <p className="mt-3 text-sm font-medium text-foreground">Build Smart. Manage Better.</p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-foreground-muted">
              Everything your construction team needs, connected in one workspace.
            </p>
          </div>

          <nav aria-label="Product">
            <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-foreground">Product</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a href="#features" className="text-foreground-muted transition-colors hover:text-foreground">Features</a></li>
              <li><a href="#product" className="text-foreground-muted transition-colors hover:text-foreground">Projects</a></li>
              <li><a href="#how-it-works" className="text-foreground-muted transition-colors hover:text-foreground">Tasks</a></li>
              <li><a href="#solutions" className="text-foreground-muted transition-colors hover:text-foreground">Resources</a></li>
              <li><a href="#showcase" className="text-foreground-muted transition-colors hover:text-foreground">Reports</a></li>
            </ul>
          </nav>

          <nav aria-label="Company">
            <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-foreground">Company</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Soon>About</Soon></li>
              <li><Soon>Contact</Soon></li>
            </ul>
          </nav>

          <nav aria-label="Resources">
            <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-foreground">Resources</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Soon>Documentation</Soon></li>
              <li><Soon>Help Center</Soon></li>
              <li><a href="#pricing" className="text-foreground-muted transition-colors hover:text-foreground">FAQ</a></li>
            </ul>
          </nav>

          <nav aria-label="Legal">
            <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-foreground">Legal</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Soon>Privacy</Soon></li>
              <li><Soon>Terms</Soon></li>
              <li><Soon>Security</Soon></li>
            </ul>
          </nav>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-foreground-muted">© 2026 FrameBase</p>
          <div className="flex gap-4 text-sm">
            <Link to="/login" className="font-medium text-foreground-muted transition-colors hover:text-foreground">
              Log in
            </Link>
            <Link to="/register" className="font-medium text-primary hover:underline">
              Get started
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
