import { Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerForm from './pages/CustomerForm';
import CustomerDetail from './pages/CustomerDetail';
import Deliveries from './pages/Deliveries';
import DeliveryForm from './pages/DeliveryForm';
import DeliveryDetail from './pages/DeliveryDetail';
import DeliveryLogs from './pages/DeliveryLogs';

function App() {
  return (
    <AuthProvider>
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/new" element={<CustomerForm />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route path="customers/:id/edit" element={<CustomerForm />} />
          <Route path="deliveries" element={<Deliveries />} />
          <Route path="deliveries/new" element={<DeliveryForm />} />
          <Route path="deliveries/:id" element={<DeliveryDetail />} />
          <Route path="logs/:deliveryId" element={<DeliveryLogs />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
