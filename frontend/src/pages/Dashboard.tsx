import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiService from '../services/api';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalDeliveries: 0,
    pendingDeliveries: 0,
    completedDeliveries: 0,
  });
  const [recentDeliveries, setRecentDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      apiService.setTokenProvider(getToken);

      const [customers, deliveries] = await Promise.all([
        apiService.getCustomers(),
        apiService.getDeliveries(),
      ]);

      setStats({
        totalCustomers: customers.length,
        totalDeliveries: deliveries.length,
        pendingDeliveries: deliveries.filter((d: any) => d.status === 'PENDING').length,
        completedDeliveries: deliveries.filter((d: any) => d.status === 'COMPLETED').length,
      });

      setRecentDeliveries(deliveries.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-primary-600 text-2xl">👥</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Customers</dt>
                  <dd className="text-3xl font-semibold text-gray-900">{stats.totalCustomers}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-primary-600 text-2xl">📦</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Deliveries</dt>
                  <dd className="text-3xl font-semibold text-gray-900">{stats.totalDeliveries}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-yellow-600 text-2xl">⏳</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                  <dd className="text-3xl font-semibold text-gray-900">{stats.pendingDeliveries}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="text-green-600 text-2xl">✓</div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                  <dd className="text-3xl font-semibold text-gray-900">{stats.completedDeliveries}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Deliveries */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Deliveries</h3>
        </div>
        <div className="px-4 py-5 sm:p-6">
          {recentDeliveries.length === 0 ? (
            <p className="text-gray-500">No deliveries yet</p>
          ) : (
            <div className="space-y-4">
              {recentDeliveries.map((delivery) => (
                <Link
                  key={delivery.deliveryId}
                  to={`/deliveries/${delivery.deliveryId}`}
                  className="block hover:bg-gray-50 p-4 border rounded-lg"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Delivery #{delivery.deliveryId.slice(0, 8)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {delivery.totalLeads} leads • {delivery.status}
                      </p>
                    </div>
                    <div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          delivery.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-800'
                            : delivery.status === 'FAILED'
                            ? 'bg-red-100 text-red-800'
                            : delivery.status === 'PROCESSING'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {delivery.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
