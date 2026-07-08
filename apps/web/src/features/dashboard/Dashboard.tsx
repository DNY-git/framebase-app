import { useEffect, useState } from 'react';
import type { ApiResponse, DashboardOverview } from '@constructtrack/types';

export function Dashboard({ token }: { token: string }): JSX.Element {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/dashboard/overview', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Failed to fetch dashboard overview: ${text}`);
        }
        return res.json() as Promise<ApiResponse<DashboardOverview>>;
      })
      .then((json) => setData(json.data))
      .catch((err: Error) => setError(err.message));
  }, [token]);

  if (error) {
    return <div className="text-red-600 p-4 bg-white rounded shadow m-4">Error: {error}</div>;
  }

  if (!data) {
    return <div className="p-4 text-gray-500 bg-white rounded shadow m-4">Loading dashboard...</div>;
  }

  return (
    <div className="p-4 grid gap-4 grid-cols-1 md:grid-cols-2">
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 className="text-lg font-bold mb-4 text-gray-900">Projects Overview</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-600">Active</dt>
            <dd className="font-medium text-gray-900">{data.projects.active}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">On Hold</dt>
            <dd className="font-medium text-gray-900">{data.projects.onHold}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">Completing Soon</dt>
            <dd className="font-medium text-gray-900">{data.projects.completingSoon}</dd>
          </div>
        </dl>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 className="text-lg font-bold mb-4 text-gray-900">Tasks</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-600">At Risk (High/Crit or Overdue)</dt>
            <dd className="font-medium text-red-600">{data.tasks.atRisk}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-600">My Tasks Today</dt>
            <dd className="font-medium text-blue-600">{data.tasks.mineToday}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
