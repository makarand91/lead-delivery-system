import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

interface DeliveryLog {
  logId: string;
  deliveryId: string;
  leadId: string;
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
  timestamp: string;
  leadData?: any;
}

const DeliveryLogs = () => {
  const { deliveryId } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [failedLogs, setFailedLogs] = useState<DeliveryLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFailed, setShowFailed] = useState(false);

  useEffect(() => {
    if (deliveryId) {
      loadLogs();
    }
  }, [deliveryId]);

  const loadLogs = async () => {
    try {
      apiService.setTokenProvider(getToken);

      // Load all logs
      const allLogs = await apiService.getDeliveryLogs(deliveryId!);
      setLogs(Array.isArray(allLogs) ? allLogs : []);

      // Load failed logs
      const failed = await apiService.getFailedDeliveryLogs(deliveryId!);
      setFailedLogs(Array.isArray(failed) ? failed : []);
    } catch (error) {
      console.error('Error loading logs:', error);
      toast.error('Failed to load delivery logs');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading logs...</div>;
  }

  const successLogs = logs.filter(log => log.status === 'SUCCESS');
  const displayLogs = showFailed ? failedLogs : logs;

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate('/deliveries')}
          className="text-primary-600 hover:text-primary-800 mb-4"
        >
          ← Back to Deliveries
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Delivery Logs</h1>
        <p className="mt-2 text-sm text-gray-600">
          Detailed logs for delivery #{deliveryId?.substring(0, 8)}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500">Total Processed</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{logs.length}</p>
            </div>
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 text-xl">📊</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500">Successful</p>
              <p className="mt-2 text-3xl font-bold text-green-600">{successLogs.length}</p>
            </div>
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-xl">✓</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500">Failed</p>
              <p className="mt-2 text-3xl font-bold text-red-600">{failedLogs.length}</p>
            </div>
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 text-xl">✕</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setShowFailed(false)}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              !showFailed
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            All Logs ({logs.length})
          </button>
          <button
            onClick={() => setShowFailed(true)}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              showFailed
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Failed Only ({failedLogs.length})
          </button>
        </nav>
      </div>

      {/* Logs Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {displayLogs.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <p>No logs found</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lead ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayLogs.map((log) => (
                <tr key={log.logId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(log.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                    {log.leadId.substring(0, 12)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        log.status === 'SUCCESS'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {log.errorMessage ? (
                      <div className="text-red-600">{log.errorMessage}</div>
                    ) : (
                      <div className="text-green-600">Processed successfully</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default DeliveryLogs;
