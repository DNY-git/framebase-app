import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { EquipmentDomain } from '@constructtrack/types';
import { authFetch } from '../../auth-fetch';
import { useAuthStore } from '../../stores/auth-store';
import { EquipmentDetail } from './EquipmentDetail';
import { Skeleton } from '../../shared/components/Skeleton';
import { ArrowLeft } from '../../shared/components/icons';

interface EquipmentEnvelope {
  data: EquipmentDomain | { data: EquipmentDomain };
}

export function EquipmentDetailPage({ token }: { token: string }): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { token: storeToken } = useAuthStore();
  const activeToken = token || storeToken || '';
  const [equipment, setEquipment] = useState<EquipmentDomain | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEquipment = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/v1/equipment/${id}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? `Failed to load equipment (${res.status})`);
      }
      const json = (await res.json()) as EquipmentEnvelope;
      const eq = (json.data && typeof json.data === 'object' && 'data' in json.data
        ? json.data.data
        : json.data) as EquipmentDomain;
      setEquipment(eq);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchEquipment();
  }, [fetchEquipment]);

  return (
    <div className="space-y-6">
      <Link
        to="/equipment"
        className="inline-flex items-center gap-2 text-sm font-medium text-foreground-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to equipment
      </Link>

      {isLoading ? (
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-4 h-40 w-full" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
          {error}
          <button onClick={() => void fetchEquipment()} className="ml-2 font-medium underline">
            Retry
          </button>
        </div>
      ) : equipment ? (
        <EquipmentDetail token={activeToken} equipment={equipment} />
      ) : (
        <div className="rounded-lg border border-border bg-surface p-6 text-sm text-foreground-muted">
          Equipment not found.
        </div>
      )}
    </div>
  );
}
