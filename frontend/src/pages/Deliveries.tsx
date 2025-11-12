import { useState } from 'react';
import { Link } from 'react-router-dom';

const Deliveries = () => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Deliveries</h1>
        <Link
          to="/deliveries/new"
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Create Delivery
        </Link>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <p className="text-gray-500">Deliveries list will be displayed here...</p>
      </div>
    </div>
  );
};

export default Deliveries;
