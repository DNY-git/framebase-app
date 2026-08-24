import { useState, useRef, useEffect } from 'react';
import { Plus, Mic, ArrowUp } from '../../shared/components/icons';

interface AiAssistantProps {
  token: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{ entityType: string; entityId: string; label: string }>;
  createdAt: string;
}

const JOB_STATUS_STYLES: Record<string, string> = {
  succeeded: 'text-success',
  failed: 'text-danger',
  pending: 'text-warning',
  processing: 'text-info',
};

/** Extract a readable message from the standard API error envelope. */
async function readApiError(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  if (body && typeof body === 'object' && typeof body.message === 'string') {
    return body.errors?.length
      ? `${body.message} (${body.errors.map((e: { field: string }) => e.field).join(', ')})`
      : body.message;
  }
  return `Request failed (${res.status})`;
}

export function AiAssistant({ token }: AiAssistantProps): React.JSX.Element {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant. Ask me questions about your projects, tasks, or anything in your construction data.',
      createdAt: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [jobs, setJobs] = useState<Array<{ id: string; type: string; status: string }>>([]);
  const [showJobs, setShowJobs] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/v1/ai/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: userMsg.content, mode: 'sync' }),
      });

      if (!res.ok) {
        throw new Error(await readApiError(res));
      }

      const json = await res.json();
      const answer = json.data?.answer ?? 'Sorry, I couldn\'t process that.';
      const citations = json.data?.citations;

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: answer,
          citations,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Error: ${(err as Error).message}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSummarize = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/ai/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: 'summarize' }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const json = await res.json();
      const job = json.data;
      setMessages((prev) => [
        ...prev,
        {
          id: `system-${Date.now()}`,
          role: 'assistant',
          content: `Summarization job started (ID: ${job.id}). Check back shortly for results.`,
          createdAt: new Date().toISOString(),
        },
      ]);
      void loadJobs();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Failed to start summarization: ${(err as Error).message}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDraftReport = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/ai/draft-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: 'draft_report' }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const json = await res.json();
      const job = json.data;
      setMessages((prev) => [
        ...prev,
        {
          id: `system-${Date.now()}`,
          role: 'assistant',
          content: `Report draft started (ID: ${job.id}). Check back shortly for the generated report.`,
          createdAt: new Date().toISOString(),
        },
      ]);
      void loadJobs();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Failed to start report draft: ${(err as Error).message}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadJobs = async () => {
    try {
      const res = await fetch('/api/v1/ai/jobs?perPage=10', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      const items = json.data?.data ?? json.data ?? [];
      setJobs(items);
    } catch {
      // silent
    }
  };

  return (
    <div className="flex h-[600px] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-bold text-foreground">AI Assistant</h2>
        <div className="flex gap-2">
          <button
            onClick={handleSummarize}
            disabled={isLoading}
            className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted disabled:opacity-50"
          >
            Summarize
          </button>
          <button
            onClick={handleDraftReport}
            disabled={isLoading}
            className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted disabled:opacity-50"
          >
            Draft Report
          </button>
          <button
            onClick={async () => { setShowJobs(!showJobs); if (!showJobs) await loadJobs(); }}
            className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted"
          >
            {showJobs ? 'Hide Jobs' : 'Jobs'}
          </button>
        </div>
      </div>

      {showJobs && (
        <div className="max-h-40 overflow-y-auto border-b border-border bg-surface-muted/50 p-3">
          <h3 className="mb-2 text-xs font-bold uppercase text-foreground-muted">Recent Jobs</h3>
          {jobs.length === 0 ? (
            <p className="text-xs text-foreground-muted">No jobs found.</p>
          ) : (
            jobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between py-1 text-xs">
                <span className="text-foreground">{job.type}</span>
                <span className={`font-medium ${JOB_STATUS_STYLES[job.status] ?? 'text-foreground-muted'}`}>
                  {job.status}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-surface-muted text-foreground'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-2 border-t border-border pt-1">
                  <p className="text-xs font-medium text-foreground-muted">Citations:</p>
                  {msg.citations.map((c, i) => (
                    <span key={i} className="mr-2 text-xs text-primary underline">
                      {c.label}
                    </span>
                  ))}
                </div>
              )}
              <p className={`mt-1 text-xs ${msg.role === 'user' ? 'text-primary-foreground/70' : 'text-foreground-muted'}`}>
                {new Date(msg.createdAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-surface-muted px-4 py-2 text-sm text-foreground-muted">
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border p-3">
        <div className="flex flex-1 items-center gap-1 rounded-full border border-border bg-surface-muted px-2 py-1">
          <button
            type="button"
            aria-label="Attach file"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-surface hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            disabled={isLoading}
            className="flex-1 bg-transparent px-1 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            aria-label="Voice input"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-90"
          >
            <Mic className="h-4 w-4" />
          </button>
        </div>
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          aria-label="Send message"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-foreground text-background shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
