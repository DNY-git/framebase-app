import { useEffect } from 'react';

/*
 * Landing page fonts — self-hosted @fontsource packages, scoped to this feature
 * (the app itself keeps its Geist/Poppins stacks from main.tsx; the Google
 * Fonts CDN links were removed from index.html).
 */
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';

import './landing.css';
import { LandingNav } from './LandingNav';
import { Hero } from './Hero';
import { ProblemSection } from './ProblemSection';
import { FourStages } from './FourStages';
import { RolesConsole } from './RolesConsole';
import { MaterialEquipment } from './MaterialEquipment';
import { Faq } from './Faq';
import { CtaSection } from './CtaSection';
import { LandingFooter } from './LandingFooter';

const PAGE_TITLE = 'FrameBase — Your Entire Construction Project. One Powerful Workspace.';

/**
 * Exact React port of the supplied reference landing page.
 * Fixed light design — renders identically regardless of the app theme.
 */
export function LandingPage(): React.JSX.Element {
  // Document title, smooth scrolling, and body background only while mounted.
  // The reference page's body is white; the app's global body background
  // (#fafafa, black in dark mode) would otherwise paint the canvas below the
  // document and flash during overscroll.
  useEffect(() => {
    const prevTitle = document.title;
    document.title = PAGE_TITLE;
    const root = document.documentElement;
    root.classList.add('scroll-smooth');
    const prevBodyBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = '#ffffff';
    return () => {
      document.title = prevTitle;
      root.classList.remove('scroll-smooth');
      document.body.style.backgroundColor = prevBodyBg;
    };
  }, []);

  return (
    <div
      className="landing-page font-sans antialiased text-stone-900 selection:bg-stone-900 selection:text-white"
      style={{ backgroundColor: 'rgb(255, 255, 255)' }}
    >
      <LandingNav />
      <main>
        <Hero />
        <ProblemSection />
        <FourStages />
        <RolesConsole />
        <MaterialEquipment />
        <Faq />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
