import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  allowedRoles,
}) => {
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
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname, role: requiredRole || (allowedRoles && allowedRoles[0]) }}
        replace
      />
    );
  }

  // Determine authorized roles
  const effectiveRoles: UserRole[] = allowedRoles
    ? allowedRoles
    : requiredRole
    ? [requiredRole]
    : [];

  if (effectiveRoles.length > 0 && !effectiveRoles.includes(user.role)) {
    let fallback = '/marketplace';
    if (user.role === 'shop_owner') {
      fallback = '/shop/dashboard';
    } else if (user.role === 'admin') {
      fallback = '/admin/beneficiaries';
    } else if (user.role === 'beneficiary') {
      fallback = user.beneficiary?.verification_status === 'Approved' ? '/donations' : '/beneficiary/status';
    }
    return <Navigate to={fallback} replace />;
  }

  // Beneficiary verification check:
  // If user is beneficiary, and accessing donation/claims pages, they must be Approved.
  // If they are not approved and not already on /beneficiary/status, redirect to /beneficiary/status.
  if (user.role === 'beneficiary' && location.pathname !== '/beneficiary/status') {
    if (user.beneficiary && user.beneficiary.verification_status !== 'Approved') {
      return <Navigate to="/beneficiary/status" replace />;
    }
  }

  return <>{children}</>;
};
