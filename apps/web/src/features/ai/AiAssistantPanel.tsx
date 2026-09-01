import { useEffect } from 'react';
import { X } from '../../shared/components/icons';
import { useAiPanelStore } from '../../stores/ai-panel-store';
import { useAuthStore } from '../../stores/auth-store';
import { AiAssistant } from './AiAssistant';

export function AiAssistantPanel(): React.JSX.Element | null {
  const { open, closePanel } = useAiPanelStore();
  const { token } = useAuthStore();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closePanel();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, closePanel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={closePanel} aria-hidden="true" />
      <div className="relative flex h-dvh w-[480px] max-w-[92vw] flex-col border-l border-border bg-surface shadow-2xl">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
          <h2 className="text-sm font-semibold text-foreground">AI Assistant</h2>
          <button
            onClick={closePanel}
            aria-label="Close AI Assistant"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col p-3">
          <AiAssistant token={token} className="flex h-full flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm" />
        </div>
      </div>
    </div>
  );
}
