import { useParams } from 'react-router-dom';

const DeliveryLogs = () => {
  const { deliveryId } = useParams();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Delivery Logs</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-gray-500">Logs for delivery #{deliveryId} will be displayed here...</p>
      </div>
    </div>
  );
};

export default DeliveryLogs;
