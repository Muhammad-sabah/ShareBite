import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#DFF2F0] border-t-[#167C80] rounded-full animate-spin" />
          <p className="text-sm font-medium text-[#64748B]">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname, role: requiredRole }} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    const fallback = user.role === 'shop_owner' ? '/shop/dashboard' : '/marketplace';
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};

