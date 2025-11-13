import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const DeliveryApproval = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [delivery, setDelivery] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      apiService.setTokenProvider(getToken);

      // Load delivery details
      const deliveryData = await apiService.getDelivery(id!);
      setDelivery(deliveryData);

      // Load customer details
      const customerData = await apiService.getCustomer(deliveryData.customerId);
      setCustomer(customerData);

      // Load preview data
      const preview = await apiService.getDeliveryPreview(id!, 50);
      setPreviewData(preview);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load delivery data');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to approve this delivery? The formatted file will be moved to the warehouse.')) {
      return;
    }

    setApproving(true);
    try {
      await apiService.approveDelivery(id!);
      toast.success('Delivery approved successfully! File moved to warehouse.');
      navigate('/deliveries');
    } catch (error) {
      console.error('Error approving delivery:', error);
      toast.error('Failed to approve delivery');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setRejecting(true);
    try {
      await apiService.rejectDelivery(id!, rejectionReason);
      toast.success('Delivery rejected');
      navigate('/deliveries');
    } catch (error) {
      console.error('Error rejecting delivery:', error);
      toast.error('Failed to reject delivery');
    } finally {
      setRejecting(false);
      setShowRejectModal(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (!delivery || !previewData) {
    return <div className="text-center py-12">Delivery not found</div>;
  }

  const canApprove = delivery.approvalStatus === 'PENDING';

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate('/deliveries')}
          className="text-primary-600 hover:text-primary-800 mb-4"
        >
          ← Back to Deliveries
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Delivery Approval</h1>
        <p className="mt-2 text-sm text-gray-600">
          Review and approve formatted data before moving to warehouse
        </p>
      </div>

      {/* Delivery Information */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Delivery Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Delivery ID</p>
            <p className="mt-1 text-sm text-gray-900">{delivery.deliveryId}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Customer</p>
            <p className="mt-1 text-sm text-gray-900">{customer?.name}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Uploaded By</p>
            <p className="mt-1 text-sm text-gray-900">{delivery.uploadedBy}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Upload Date</p>
            <p className="mt-1 text-sm text-gray-900">
              {new Date(delivery.createdAt).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Leads</p>
            <p className="mt-1 text-sm text-gray-900">{previewData.totalRows}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Approval Status</p>
            <p className="mt-1">
              <span
                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  delivery.approvalStatus === 'APPROVED'
                    ? 'bg-green-100 text-green-800'
                    : delivery.approvalStatus === 'REJECTED'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {delivery.approvalStatus}
              </span>
            </p>
          </div>
        </div>

        {delivery.approvedBy && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-500">Approved By</p>
            <p className="mt-1 text-sm text-gray-900">
              {delivery.approvedBy} on {new Date(delivery.approvedAt).toLocaleString()}
            </p>
          </div>
        )}

        {delivery.rejectedBy && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-500">Rejected By</p>
            <p className="mt-1 text-sm text-gray-900">
              {delivery.rejectedBy} on {new Date(delivery.rejectedAt).toLocaleString()}
            </p>
            {delivery.rejectionReason && (
              <>
                <p className="mt-2 text-sm font-medium text-gray-500">Reason</p>
                <p className="mt-1 text-sm text-gray-900">{delivery.rejectionReason}</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Field Mappings */}
      {previewData.mappings && previewData.mappings.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Field Mappings Applied</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {previewData.mappings
              .filter((m: any) => m.targetField !== 'unmapped')
              .map((mapping: any, index: number) => (
                <div key={index} className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-600">{mapping.sourceField}</span>
                  <span className="text-gray-400">→</span>
                  <span className="font-medium text-gray-900">{mapping.targetField}</span>
                  {mapping.required && (
                    <span className="text-red-500 text-xs">*</span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Preview Data Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Data Preview (First 50 rows)</h2>
          <p className="mt-1 text-sm text-gray-500">
            Review the formatted data to ensure mappings are correct
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  #
                </th>
                {previewData.headers.map((header: string, index: number) => (
                  <th
                    key={index}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {previewData.rows.map((row: any, rowIndex: number) => (
                <tr key={rowIndex} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {rowIndex + 1}
                  </td>
                  {previewData.headers.map((header: string, colIndex: number) => (
                    <td
                      key={colIndex}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                    >
                      {row[header] || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
          Showing {previewData.rows.length} of {previewData.totalRows} total rows
        </div>
      </div>

      {/* Action Buttons */}
      {canApprove && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-end space-x-4">
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={rejecting}
              className="px-6 py-2 border border-red-600 text-red-600 rounded-md text-sm font-medium hover:bg-red-50 disabled:opacity-50"
            >
              Reject
            </button>
            <button
              onClick={handleApprove}
              disabled={approving}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
            >
              {approving ? 'Approving...' : 'Approve & Move to Warehouse'}
            </button>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Reject Delivery</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Rejection <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Please provide a reason for rejection..."
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md text-sm font-medium hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={rejecting}
                  className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {rejecting ? 'Rejecting...' : 'Reject Delivery'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryApproval;
