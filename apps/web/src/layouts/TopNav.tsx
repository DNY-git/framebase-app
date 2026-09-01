import { Bot, Menu } from '../shared/components/icons';
import { NotificationBell } from '../shared/components/NotificationBell';
import { UserProfileMenu } from '../shared/components/UserProfileMenu';
import { usePageTitleStore } from '../stores/page-title-store';
import { useSidebarStore } from '../stores/sidebar-store';
import { useAiPanelStore } from '../stores/ai-panel-store';

export function TopNav() {
  const { toggleMobile } = useSidebarStore();
  const { togglePanel } = useAiPanelStore();
  const pageTitle = usePageTitleStore((s) => s.pageTitle);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 bg-background/80 px-4 backdrop-blur-sm lg:px-6">
      <button
        onClick={toggleMobile}
        aria-label="Toggle navigation"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {pageTitle?.title && (
        <div className="flex min-w-0 flex-col justify-center leading-tight">
          <h1 className="truncate text-xl font-bold text-foreground">{pageTitle.title}</h1>
          {pageTitle.subtitle && (
            <p className="truncate text-xs text-foreground-muted">{pageTitle.subtitle}</p>
          )}
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={togglePanel}
          aria-label="Open AI Assistant"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          <Bot className="h-5 w-5" />
        </button>
        <NotificationBell />
        <UserProfileMenu />
      </div>
    </header>
  );
}
