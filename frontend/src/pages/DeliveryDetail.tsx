import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiService from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

interface Delivery {
  deliveryId: string;
  customerId: string;
  s3FileKey: string;
  mappingId?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalLeads: number;
  successCount: number;
  failedCount: number;
  scheduledAt: string;
  processedAt?: string;
  createdAt: string;
  createdBy: string;
}

const DeliveryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadDelivery();
  }, [id]);

  const loadDelivery = async () => {
    try {
      apiService.setTokenProvider(getToken);
      const data = await apiService.getDelivery(id!);
      setDelivery(data);
    } catch (error) {
      console.error('Error loading delivery:', error);
      toast.error('Failed to load delivery');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const calculateSuccessRate = () => {
    if (!delivery || delivery.totalLeads === 0) return 0;
    return ((delivery.successCount / delivery.totalLeads) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading delivery...</div>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Delivery not found</p>
        <button
          onClick={() => navigate('/deliveries')}
          className="text-primary-600 hover:text-primary-800"
        >
          ← Back to Deliveries
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate('/deliveries')}
          className="text-primary-600 hover:text-primary-800 mb-4"
        >
          ← Back to Deliveries
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Delivery Details</h1>
            <p className="mt-1 text-sm text-gray-500">ID: {delivery.deliveryId}</p>
          </div>
          <span
            className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusColor(
              delivery.status
            )}`}
          >
            {delivery.status}
          </span>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white shadow rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Total Leads</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">
            {delivery.totalLeads}
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Successful</div>
          <div className="mt-1 text-2xl font-semibold text-green-600">
            {delivery.successCount}
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Failed</div>
          <div className="mt-1 text-2xl font-semibold text-red-600">
            {delivery.failedCount}
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-4">
          <div className="text-sm font-medium text-gray-500">Success Rate</div>
          <div className="mt-1 text-2xl font-semibold text-primary-600">
            {calculateSuccessRate()}%
          </div>
        </div>
      </div>

      {/* Delivery Information */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Delivery Information</h3>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Customer ID</dt>
              <dd className="mt-1 text-sm text-gray-900">{delivery.customerId}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">File Key</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono break-all">
                {delivery.s3FileKey}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Mapping ID</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {delivery.mappingId || 'Default mapping'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created By</dt>
              <dd className="mt-1 text-sm text-gray-900">{delivery.createdBy}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created At</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(delivery.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Scheduled At</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(delivery.scheduledAt)}</dd>
            </div>
            {delivery.processedAt && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Processed At</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(delivery.processedAt)}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Actions */}
      {(delivery.status === 'COMPLETED' || delivery.status === 'FAILED') && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">View Logs</h3>
          <div className="space-y-2">
            <Link
              to={`/logs/${delivery.deliveryId}`}
              className="inline-block bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              View All Logs
            </Link>
            {delivery.failedCount > 0 && (
              <Link
                to={`/logs/${delivery.deliveryId}?filter=failed`}
                className="inline-block ml-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                View Failed Leads ({delivery.failedCount})
              </Link>
            )}
          </div>
        </div>
      )}

      {delivery.status === 'PENDING' && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                This delivery is pending and will be processed at the scheduled time.
              </p>
            </div>
          </div>
        </div>
      )}

      {delivery.status === 'PROCESSING' && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                This delivery is currently being processed. Refresh to see the latest status.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryDetail;
