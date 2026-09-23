import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth-store';
import { LandingNavbar } from '../features/landing/LandingNavbar';
import { HeroSection } from '../features/landing/HeroSection';
import { ProblemSection } from '../features/landing/ProblemSection';
import { StagesSection } from '../features/landing/StagesSection';
import { RolesSection } from '../features/landing/RolesSection';
import { InventorySection } from '../features/landing/InventorySection';
import { FAQSection } from '../features/landing/FAQSection';
import { FinalCTA } from '../features/landing/FinalCTA';
import { LandingFooter } from '../features/landing/LandingFooter';

export function LandingPage(): React.JSX.Element {
  const { isAuthenticated, user, isLoadingUser } = useAuthStore();

  // Only redirect to dashboard when we have a verified session (user loaded).
  // A stale token in localStorage alone should not be considered authenticated
  // — fetchUser will validate it and clear isAuthenticated on 401.
  if (isLoadingUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-200 border-t-stone-900" aria-label="Loading" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    return <Navigate to="/dashboard" replace />;
  }

  // 2026-09-23 redesign: the landing page is intentionally always light-themed
  // (editorial stone/terracotta palette) regardless of the app theme.
  return (
    <div className="landing-page min-h-screen scroll-smooth bg-cream text-stone-900 antialiased selection:bg-stone-900 selection:text-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-stone-900 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>
      <LandingNavbar />
      <main id="main">
        <HeroSection />
        <ProblemSection />
        <StagesSection />
        <RolesSection />
        <InventorySection />
        <FAQSection />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
