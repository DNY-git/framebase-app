import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth-store';
import { LandingNavbar } from '../features/landing/LandingNavbar';
import { HeroSection } from '../features/landing/HeroSection';
import { CapabilitySection } from '../features/landing/CapabilitySection';
import { ProblemSection } from '../features/landing/ProblemSection';
import { SolutionSection } from '../features/landing/SolutionSection';
import { DashboardShowcase } from '../features/landing/DashboardShowcase';
import { HowItWorks } from '../features/landing/HowItWorks';
import { RolesSection } from '../features/landing/RolesSection';
import { FinancialSection } from '../features/landing/FinancialSection';
import { ResourcesSection } from '../features/landing/ResourcesSection';
import { DocumentsSection } from '../features/landing/DocumentsSection';
import { AuditSection } from '../features/landing/AuditSection';
import { UseCasesSection } from '../features/landing/UseCasesSection';
import { TestimonialPlaceholder } from '../features/landing/TestimonialPlaceholder';
import { PricingCTA } from '../features/landing/PricingCTA';
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" aria-label="Loading" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen scroll-smooth bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-action focus:px-4 focus:py-2 focus:text-sm focus:text-action-foreground"
      >
        Skip to content
      </a>
      <LandingNavbar />
      <main id="main">
        <HeroSection />
        <CapabilitySection />
        <ProblemSection />
        <SolutionSection />
        <DashboardShowcase />
        <HowItWorks />
        <RolesSection />
        <FinancialSection />
        <ResourcesSection />
        <DocumentsSection />
        <AuditSection />
        <UseCasesSection />
        <TestimonialPlaceholder />
        <PricingCTA />
        <FAQSection />
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
