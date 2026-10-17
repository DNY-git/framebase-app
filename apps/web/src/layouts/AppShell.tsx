import { Outlet } from 'react-router-dom';
import { BubbleNav } from './BubbleNav';
import { TopNav } from './TopNav';
import { MobileBubbleNav } from './MobileBubbleNav';
import { AiAssistantPanel } from '../features/ai/AiAssistantPanel';
import { useAuthStore } from '../stores/auth-store';
import { useSidebarStore } from '../stores/sidebar-store';

export function AppShell() {
  const { token } = useAuthStore();
  const collapsed = useSidebarStore((s) => s.collapsed);

  return (
    <div className="min-h-screen bg-background">
      <BubbleNav />

      {/*
        Left offset clears the floating bubble nav (inset 20px + panel width +
        20px gap) and animates with the panel's collapse transition:
        lg:pl-70 = 280px expanded, lg:pl-25 = 100px collapsed.
      */}
      <div
        className={`transition-[padding] duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none ${collapsed ? 'lg:pl-25' : 'lg:pl-70'}`}
      >
        <TopNav />
        <main className="px-4 pb-28 pt-6 lg:px-6 lg:pb-8 lg:pt-8">
          <Outlet context={{ token }} />
        </main>
      </div>

      <MobileBubbleNav />
      <AiAssistantPanel />
    </div>
  );
}
