import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { PieChart } from 'lucide-react';
import LoginForm from '../../components/auth/LoginForm';
import { useAuthStore } from '../../store/authStore';

const LoginPage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex justify-center items-center mb-4 text-primary-600 hover:text-primary-700">
          ← Back to Home
        </Link>
        <div className="flex justify-center">
          <PieChart className="h-12 w-12 text-primary-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to Caply
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Your complete resource and capacity planning solution
        </p>
      </div>
      
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <LoginForm />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;