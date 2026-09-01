import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { MobileNav } from './MobileNav';
import { MobileSidebar } from './MobileSidebar';
import { AiAssistantPanel } from '../features/ai/AiAssistantPanel';
import { useAuthStore } from '../stores/auth-store';

export function AppShell() {
  const { token } = useAuthStore();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileSidebar />

      <div className="lg:pl-64">
        <TopNav />
        <main className="px-4 pb-20 pt-6 lg:px-6 lg:pb-8 lg:pt-8">
          <Outlet context={{ token }} />
        </main>
      </div>

      <MobileNav />
      <AiAssistantPanel />
    </div>
  );
}
