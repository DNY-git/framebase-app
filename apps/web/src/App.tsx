import { useEffect, useState } from 'react';
import { Dashboard } from './features/dashboard/Dashboard';
import { EquipmentList } from './features/equipment/EquipmentList';

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
  const [token, setToken] = useState<string>('');
  const [email, setEmail] = useState('admin@tenant.local');
  const [password, setPassword] = useState('Password123!');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'equipment'>('dashboard');

  useEffect(() => {
    fetch('/api/v1/health')
      .then((res) => res.json() as Promise<HealthResponse>)
      .then(setHealth)
      .catch((err: Error) => setError(err.message));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error('Login failed');
      const data = await res.json();
      setToken(data.data.accessToken);
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <header className="max-w-4xl mx-auto mb-8 bg-white p-4 rounded shadow flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ConstructTrack</h1>
          <p className="text-sm text-gray-500">System Status: {health?.status || error || 'Checking...'}</p>
        </div>
        {token ? (
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className={`text-sm ${activeTab === 'dashboard' ? 'font-bold' : 'text-gray-600'}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('equipment')} 
              className={`text-sm ${activeTab === 'equipment' ? 'font-bold' : 'text-gray-600'}`}
            >
              Equipment
            </button>
            <button onClick={() => setToken('')} className="text-sm text-blue-600 underline ml-4">Logout</button>
          </div>
        ) : null}
      </header>

      <main className="max-w-4xl mx-auto">
        {!token ? (
          <div className="bg-white p-6 rounded shadow max-w-sm mx-auto">
            <h2 className="text-lg font-bold mb-4">Login</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700">Email</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700">Password</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded p-2"
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={isLoggingIn}
                className="w-full bg-blue-600 text-white rounded p-2 font-medium disabled:opacity-50"
              >
                {isLoggingIn ? 'Logging in...' : 'Log in'}
              </button>
            </form>
          </div>
        ) : activeTab === 'dashboard' ? (
          <Dashboard token={token} />
        ) : (
          <EquipmentList token={token} />
        )}
      </main>
    </div>
  );
}
