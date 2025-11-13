import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [deploying, setDeploying] = useState(false);

  useEffect(() => {
    if (id) loadCustomer();
  }, [id]);

  const loadCustomer = async () => {
    try {
      apiService.setTokenProvider(getToken);
      const data = await apiService.getCustomer(id!);
      setCustomer(data);
    } catch (error) {
      toast.error('Failed to load customer');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCode = async () => {
    setGeneratingCode(true);
    try {
      const result = await apiService.generateIntegrationCode({
        crmType: customer.crmType,
        crmEndpoint: customer.crmEndpoint,
        authMethod: 'Bearer Token',
        customRequirements: customer.customContext?.requirements,
      });
      setGeneratedCode(result.code);
      toast.success('Integration code generated successfully!');
    } catch (error) {
      toast.error('Failed to generate code');
      console.error(error);
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleDeployLambda = async () => {
    if (!generatedCode) {
      toast.error('Please generate code first');
      return;
    }

    setDeploying(true);
    try {
      await apiService.deployLambda({
        customerId: id,
        code: generatedCode,
      });
      toast.success('Lambda deployed successfully!');
      await loadCustomer(); // Reload to get updated Lambda ARN
    } catch (error) {
      toast.error('Failed to deploy Lambda');
      console.error(error);
    } finally {
      setDeploying(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!customer) {
    return <div className="text-center py-12">Customer not found</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate('/customers')}
          className="text-primary-600 hover:text-primary-800 mb-4"
        >
          ← Back to Customers
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Customer Information</h3>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">CRM Type</dt>
              <dd className="mt-1 text-sm text-gray-900">{customer.crmType}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">CRM Endpoint</dt>
              <dd className="mt-1 text-sm text-gray-900">{customer.crmEndpoint}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Lambda Status</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {customer.lambdaArn ? (
                  <span className="text-green-600">✓ Deployed</span>
                ) : (
                  <span className="text-yellow-600">Not Deployed</span>
                )}
              </dd>
            </div>
            {customer.lambdaArn && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Lambda ARN</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono break-all">
                  {customer.lambdaArn}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">AI-Generated Integration Code</h3>
        </div>
        <div className="px-4 py-5 sm:px-6">
          <div className="mb-4">
            <button
              onClick={handleGenerateCode}
              disabled={generatingCode}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 mr-2"
            >
              {generatingCode ? 'Generating...' : 'Generate Integration Code'}
            </button>
            {generatedCode && (
              <button
                onClick={handleDeployLambda}
                disabled={deploying}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
              >
                {deploying ? 'Deploying...' : 'Deploy to Lambda'}
              </button>
            )}
          </div>
          {generatedCode && (
            <div className="mt-4">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                <code>{generatedCode}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerDetail;
