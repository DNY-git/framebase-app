import { useEffect, useState } from 'react';

interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
  checks: {
    database: { status: string; error: string | null };
  };
}

export function App(): JSX.Element {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/health')
      .then((res) => res.json() as Promise<HealthResponse>)
      .then(setHealth)
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <main className="max-w-md w-full bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold text-gray-900">ConstructTrack</h1>
        <p className="mt-2 text-gray-600">Construction Tracking Platform</p>

        <div className="mt-6 border-t border-gray-200 pt-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            System Health
          </h2>
          {error && <p className="mt-2 text-red-600 text-sm">Error: {error}</p>}
          {!health && !error && <p className="mt-2 text-gray-500 text-sm">Checking…</p>}
          {health && (
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Status</dt>
                <dd className="font-medium text-gray-900">{health.status}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Version</dt>
                <dd className="font-medium text-gray-900">{health.version}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Database</dt>
                <dd className="font-medium text-gray-900">{health.checks.database.status}</dd>
              </div>
            </dl>
          )}
        </div>
      </main>
    </div>
  );
}
