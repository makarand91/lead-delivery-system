import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import apiService from '../services/api';
import { useAuth } from '../context/AuthContext';

const CustomerForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { getToken } = useAuth();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    crmType: 'SALESFORCE',
    crmEndpoint: '',
    apiKey: '',
    webhookUrl: '',
  });

  useEffect(() => {
    if (isEditMode) {
      loadCustomer();
    }
  }, [id]);

  const loadCustomer = async () => {
    try {
      apiService.setTokenProvider(getToken);
      const customer = await apiService.getCustomer(id!);
      setFormData({
        name: customer.name || '',
        crmType: customer.crmType || 'SALESFORCE',
        crmEndpoint: customer.crmEndpoint || '',
        apiKey: customer.apiKey || '',
        webhookUrl: customer.webhookUrl || '',
      });
    } catch (error) {
      toast.error('Failed to load customer');
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      apiService.setTokenProvider(getToken);

      if (isEditMode) {
        await apiService.updateCustomer(id!, formData);
        toast.success('Customer updated successfully!');
      } else {
        await apiService.createCustomer(formData);
        toast.success('Customer created successfully!');
      }

      navigate('/customers');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to save customer';
      toast.error(message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate('/customers')}
          className="text-primary-600 hover:text-primary-800 mb-4"
        >
          ← Back to Customers
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditMode ? 'Edit Customer' : 'Add New Customer'}
        </h1>
      </div>

      <div className="bg-white shadow rounded-lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Customer Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border"
              placeholder="Acme Corporation"
            />
          </div>

          <div>
            <label htmlFor="crmType" className="block text-sm font-medium text-gray-700">
              CRM Type *
            </label>
            <select
              id="crmType"
              name="crmType"
              required
              value={formData.crmType}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border"
            >
              <option value="SALESFORCE">Salesforce</option>
              <option value="HUBSPOT">HubSpot</option>
              <option value="ZOHO">Zoho CRM</option>
              <option value="PIPEDRIVE">Pipedrive</option>
              <option value="CUSTOM">Custom REST API</option>
            </select>
          </div>

          <div>
            <label htmlFor="crmEndpoint" className="block text-sm font-medium text-gray-700">
              CRM REST API Endpoint *
            </label>
            <input
              type="url"
              id="crmEndpoint"
              name="crmEndpoint"
              required
              value={formData.crmEndpoint}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border"
              placeholder="https://api.example.com/leads"
            />
            <p className="mt-1 text-sm text-gray-500">
              The REST endpoint where leads will be sent
            </p>
          </div>

          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">
              API Key / Token *
            </label>
            <input
              type="password"
              id="apiKey"
              name="apiKey"
              required
              value={formData.apiKey}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border"
              placeholder="Enter your CRM API key or token"
            />
            <p className="mt-1 text-sm text-gray-500">
              Authentication credentials for the CRM API
            </p>
          </div>

          <div>
            <label htmlFor="webhookUrl" className="block text-sm font-medium text-gray-700">
              Webhook URL (Optional)
            </label>
            <input
              type="url"
              id="webhookUrl"
              name="webhookUrl"
              value={formData.webhookUrl}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border"
              placeholder="https://your-domain.com/webhook"
            />
            <p className="mt-1 text-sm text-gray-500">
              Optional webhook to receive delivery status updates
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate('/customers')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : isEditMode ? 'Update Customer' : 'Create Customer'}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">
          What happens after you create a customer?
        </h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>You can set up field mappings to map your Excel columns to CRM fields</li>
          <li>Generate AI-powered integration code tailored to your CRM</li>
          <li>Deploy a Lambda function to handle lead deliveries automatically</li>
          <li>Upload Excel files and deliver leads to the customer's CRM</li>
        </ul>
      </div>
    </div>
  );
};

export default CustomerForm;
