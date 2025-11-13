import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import FieldMappingForm from '../components/FieldMappingForm';

interface FieldMapping {
  sourceField: string;
  targetField: string;
  required?: boolean;
}

const DeliveryForm = () => {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [showMapping, setShowMapping] = useState(false);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [formData, setFormData] = useState({
    customerId: '',
    file: null as File | null,
    s3FileKey: '',
    mappingId: '',
    scheduledAt: '',
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (formData.customerId) {
      loadMappings(formData.customerId);
    }
  }, [formData.customerId]);

  const loadCustomers = async () => {
    try {
      apiService.setTokenProvider(getToken);
      const data = await apiService.getCustomers();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error('Failed to load customers');
    }
  };

  const loadMappings = async (customerId: string) => {
    try {
      const data = await apiService.getMappingsByCustomer(customerId);
      setMappings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading mappings:', error);
      setMappings([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.match(/\.(xlsx|xls)$/)) {
        toast.error('Please select an Excel file (.xlsx or .xls)');
        return;
      }
      setFormData({ ...formData, file });
    }
  };

  const handleUploadFile = async () => {
    if (!formData.file || !formData.customerId) {
      toast.error('Please select a customer and file first');
      return;
    }

    setUploading(true);
    try {
      // Upload file via backend (more secure)
      const response = await apiService.uploadDeliveryFile({
        file: formData.file,
        customerId: formData.customerId,
      });

      setFormData({ ...formData, s3FileKey: response.s3Key });

      // If headers are returned, show field mapping
      if (response.headers && Array.isArray(response.headers) && response.headers.length > 0) {
        setExcelHeaders(response.headers);
        setShowMapping(true);
        toast.success('File uploaded successfully! Please map the fields.');
      } else {
        toast.success('File uploaded successfully!');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleMappingComplete = (mappings: FieldMapping[]) => {
    setFieldMappings(mappings);
    setShowMapping(false);
    toast.success('Field mapping saved!');
  };

  const handleSkipMapping = () => {
    setShowMapping(false);
    setFieldMappings([]);
    toast.info('Using default field mapping');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerId || !formData.s3FileKey) {
      toast.error('Please select a customer and upload a file');
      return;
    }

    setLoading(true);
    try {
      const deliveryData: any = {
        customerId: formData.customerId,
        s3FileKey: formData.s3FileKey,
      };

      // Include field mappings if user mapped the fields
      if (fieldMappings.length > 0) {
        deliveryData.fieldMappings = fieldMappings;
      }

      if (formData.mappingId) {
        deliveryData.mappingId = formData.mappingId;
      }

      if (formData.scheduledAt) {
        deliveryData.scheduledAt = new Date(formData.scheduledAt).toISOString();
      }

      await apiService.createDelivery(deliveryData);
      toast.success('Delivery created successfully!');
      navigate('/deliveries');
    } catch (error) {
      console.error('Error creating delivery:', error);
      toast.error('Failed to create delivery');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate('/deliveries')}
          className="text-primary-600 hover:text-primary-800 mb-4"
        >
          ← Back to Deliveries
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Create New Delivery</h1>
        <p className="mt-2 text-sm text-gray-600">
          Upload an Excel file with lead data to deliver to a customer's CRM
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
        {/* Customer Selection */}
        <div className="mb-6">
          <label htmlFor="customerId" className="block text-sm font-medium text-gray-700 mb-2">
            Customer <span className="text-red-500">*</span>
          </label>
          <select
            id="customerId"
            value={formData.customerId}
            onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          >
            <option value="">Select a customer...</option>
            {customers.map((customer) => (
              <option key={customer.customerId} value={customer.customerId}>
                {customer.name} ({customer.crmType})
              </option>
            ))}
          </select>
        </div>

        {/* File Upload */}
        <div className="mb-6">
          <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-2">
            Lead File (Excel) <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="file"
              id="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              disabled={!formData.customerId}
            />
            <button
              type="button"
              onClick={handleUploadFile}
              disabled={!formData.file || uploading || !formData.customerId}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
          {!formData.customerId && (
            <p className="mt-1 text-sm text-gray-500">Please select a customer first</p>
          )}
          {formData.s3FileKey && !showMapping && (
            <p className="mt-2 text-sm text-green-600">
              ✓ File uploaded successfully
              {fieldMappings.length > 0 && ` (${fieldMappings.filter(m => m.targetField !== 'unmapped').length} fields mapped)`}
            </p>
          )}
        </div>

        {/* Field Mapping Form */}
        {showMapping && excelHeaders.length > 0 && (
          <FieldMappingForm
            excelHeaders={excelHeaders}
            onMappingComplete={handleMappingComplete}
            onSkip={handleSkipMapping}
          />
        )}

        {/* Custom Field Mapping Status */}
        {formData.s3FileKey && !showMapping && fieldMappings.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Custom field mapping applied
                </p>
                <p className="text-sm text-blue-700">
                  {fieldMappings.filter(m => m.targetField !== 'unmapped').length} of {fieldMappings.length} columns mapped
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMapping(true)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Edit Mapping
              </button>
            </div>
          </div>
        )}

        {/* Field Mapping Selection (Saved Templates) */}
        {!showMapping && fieldMappings.length === 0 && (
          <div className="mb-6">
            <label htmlFor="mappingId" className="block text-sm font-medium text-gray-700 mb-2">
              Saved Field Mapping Template (Optional)
            </label>
            <select
              id="mappingId"
              value={formData.mappingId}
              onChange={(e) => setFormData({ ...formData, mappingId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={!formData.customerId}
            >
              <option value="">Use default mapping...</option>
              {mappings.map((mapping) => (
                <option key={mapping.mappingId} value={mapping.mappingId}>
                  {mapping.name || mapping.mappingId}
                </option>
              ))}
            </select>
            {!formData.customerId && (
              <p className="mt-1 text-sm text-gray-500">Please select a customer first</p>
            )}
            {formData.s3FileKey && excelHeaders.length > 0 && (
              <button
                type="button"
                onClick={() => setShowMapping(true)}
                className="mt-2 text-sm text-primary-600 hover:text-primary-800 font-medium"
              >
                Or create custom field mapping for this delivery
              </button>
            )}
          </div>
        )}

        {/* Scheduled Date/Time */}
        <div className="mb-6">
          <label htmlFor="scheduledAt" className="block text-sm font-medium text-gray-700 mb-2">
            Schedule For (Optional)
          </label>
          <input
            type="datetime-local"
            id="scheduledAt"
            value={formData.scheduledAt}
            onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <p className="mt-1 text-sm text-gray-500">Leave empty to start processing immediately</p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/deliveries')}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !formData.s3FileKey}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Delivery'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DeliveryForm;
