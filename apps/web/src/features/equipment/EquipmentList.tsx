import { useEffect, useState } from 'react';

interface EquipmentDomain {
  id: string;
  name: string;
  serialNumber: string;
  category: string;
  status: string;
}

export function EquipmentList({ token }: { token: string }) {
  const [equipment, setEquipment] = useState<EquipmentDomain[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/equipment', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to fetch equipment');
        const json = await res.json();
        setEquipment(json.data);
      })
      .catch((err) => setError(err.message));
  }, [token]);

  return (
    <div className="bg-white p-6 rounded shadow mt-6">
      <h2 className="text-xl font-bold mb-4">Equipment Registry</h2>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Name</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Serial #</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Category</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {equipment.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-4 text-center text-sm text-gray-500">
                No equipment found.
              </td>
            </tr>
          ) : (
            equipment.map((eq) => (
              <tr key={eq.id}>
                <td className="px-4 py-2 text-sm text-gray-900">{eq.name}</td>
                <td className="px-4 py-2 text-sm text-gray-500">{eq.serialNumber}</td>
                <td className="px-4 py-2 text-sm text-gray-500">{eq.category}</td>
                <td className="px-4 py-2 text-sm">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    eq.status === 'available' ? 'bg-green-100 text-green-800' :
                    eq.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                    eq.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {eq.status}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
