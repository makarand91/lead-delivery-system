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
  const [codeId, setCodeId] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(false);

  useEffect(() => {
    if (id) {
      loadCustomer();
      loadExistingCode();
    }
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

  const loadExistingCode = async () => {
    try {
      setLoadingExisting(true);
      const existingCode = await apiService.getLatestIntegrationCode(id!);
      if (existingCode && existingCode.code) {
        setGeneratedCode(existingCode.code);
        setCodeId(existingCode.codeId);
      }
    } catch (error) {
      // No existing code, that's fine
      console.log('No existing integration code found');
    } finally {
      setLoadingExisting(false);
    }
  };

  const handleGenerateCode = async () => {
    setGeneratingCode(true);
    try {
      const result = await apiService.generateIntegrationCode({
        customerId: id,
        crmType: customer.crmType,
        crmEndpoint: customer.crmEndpoint,
        authMethod: 'Bearer Token',
        customRequirements: customer.customContext?.requirements,
      });
      setGeneratedCode(result.code);
      setCodeId(result.codeId);
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

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    toast.success('Code copied to clipboard!');
  };

  const handleDownloadCode = () => {
    const blob = new Blob([generatedCode], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${customer.name.replace(/\s+/g, '-')}-integration-${codeId}.js`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Code downloaded!');
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
          <p className="mt-1 text-sm text-gray-500">Generate and deploy custom integration code for this customer's CRM</p>
        </div>
        <div className="px-4 py-5 sm:px-6">
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={handleGenerateCode}
              disabled={generatingCode}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
            >
              {generatingCode ? 'Generating...' : 'Generate New Code'}
            </button>
            {generatedCode && (
              <>
                <button
                  onClick={handleCopyCode}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Copy Code
                </button>
                <button
                  onClick={handleDownloadCode}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Download
                </button>
                <button
                  onClick={handleDeployLambda}
                  disabled={deploying}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                >
                  {deploying ? 'Deploying...' : 'Deploy to Lambda'}
                </button>
              </>
            )}
          </div>

          {loadingExisting && (
            <div className="text-sm text-gray-500 mb-4">Loading existing code...</div>
          )}

          {generatedCode && (
            <>
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Generated Code:</h4>
                <div className="relative">
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs max-h-96 overflow-y-auto">
                    <code>{generatedCode}</code>
                  </pre>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="text-sm font-medium text-blue-900 mb-2">How to Use This Code:</h4>
                <ol className="list-decimal list-inside text-sm text-blue-800 space-y-2">
                  <li>
                    <strong>Deploy to Lambda:</strong> Click the "Deploy to Lambda" button above to automatically deploy this code as an AWS Lambda function.
                  </li>
                  <li>
                    <strong>Manual Deployment:</strong> Download the code and deploy it manually to AWS Lambda or your preferred serverless platform.
                  </li>
                  <li>
                    <strong>Configure Environment Variables:</strong> Set the following environment variables in your Lambda:
                    <ul className="list-disc list-inside ml-6 mt-1">
                      <li><code className="bg-white px-1 rounded">CRM_ENDPOINT</code>: {customer.crmEndpoint}</li>
                      <li><code className="bg-white px-1 rounded">CRM_API_KEY</code>: Your CRM API key</li>
                      <li><code className="bg-white px-1 rounded">CRM_TYPE</code>: {customer.crmType}</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Test the Function:</strong> Use the AWS Lambda test console or invoke via API Gateway.
                  </li>
                  <li>
                    <strong>Integration:</strong> This Lambda will be automatically invoked when deliveries are processed for this customer.
                  </li>
                </ol>
              </div>

              {codeId && (
                <div className="mt-4 text-xs text-gray-500">
                  Code ID: {codeId}
                </div>
              )}
            </>
          )}

          {!generatedCode && !loadingExisting && (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-2">No integration code generated yet.</p>
              <p className="text-sm">Click "Generate New Code" to create AI-powered integration code for this customer's CRM.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerDetail;
