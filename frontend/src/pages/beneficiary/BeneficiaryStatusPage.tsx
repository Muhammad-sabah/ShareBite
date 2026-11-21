import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Gift,
  HeartHandshake,
  MapPin,
  Users,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { beneficiaryApi } from '../../services/api';

export const BeneficiaryStatusPage: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);

  const status = user?.beneficiary?.verification_status || 'Pending';

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
      const updated = await beneficiaryApi.getProfile();
      if (updated.verification_status === 'Approved') {
        navigate('/donations', { replace: true });
      }
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl bg-white rounded-3xl border border-[#E2E8F0] shadow-md p-6 sm:p-8 text-center">
        {/* Status Graphic */}
        <div className="mb-6 flex justify-center">
          {status === 'Approved' ? (
            <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center text-emerald-600 animate-in zoom-in-75 duration-300">
              <CheckCircle2 className="w-10 h-10" />
            </div>
          ) : status === 'Rejected' ? (
            <div className="w-20 h-20 rounded-full bg-rose-50 border-4 border-rose-100 flex items-center justify-center text-rose-600 animate-in zoom-in-75 duration-300">
              <XCircle className="w-10 h-10" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-amber-50 border-4 border-amber-100 flex items-center justify-center text-amber-500 animate-pulse">
              <Clock className="w-10 h-10" />
            </div>
          )}
        </div>

        {/* Status Header */}
        {status === 'Approved' ? (
          <>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 mb-2">
              Application Approved
            </span>
            <h1 className="text-2xl font-black text-[#0F172A]">
              Welcome, {user?.full_name}!
            </h1>
            <p className="text-sm text-[#64748B] mt-2 max-w-md mx-auto">
              Your beneficiary account has been verified. You now have full access to browse and reserve
              free surplus food donations provided by our generous partner shops.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/donations"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#167C80] hover:bg-[#105B60] text-white font-bold text-sm transition shadow-xs"
              >
                <Gift className="w-4 h-4" />
                <span>Browse Food Donations</span>
              </Link>
              <Link
                to="/my-claims"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAF9] text-[#0F172A] font-bold text-sm transition"
              >
                <HeartHandshake className="w-4 h-4 text-[#167C80]" />
                <span>My Claims</span>
              </Link>
            </div>
          </>
        ) : status === 'Rejected' ? (
          <>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-800 mb-2">
              Application Not Approved
            </span>
            <h1 className="text-2xl font-black text-[#0F172A]">
              Application Status Notice
            </h1>
            <p className="text-sm text-[#64748B] mt-2 max-w-md mx-auto">
              We appreciate your interest in ShareBite. Unfortunately, your application could not be
              approved at this time.
            </p>

            {user?.beneficiary?.rejection_reason && (
              <div className="mt-4 p-4 rounded-2xl bg-rose-50/80 border border-rose-200 text-left">
                <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block mb-1">
                  Reason provided by reviewer:
                </span>
                <p className="text-sm text-rose-900 font-medium">
                  {user.beneficiary.rejection_reason}
                </p>
              </div>
            )}

            <p className="text-xs text-[#64748B] mt-4">
              If you believe this decision was made in error or if your circumstances have changed,
              please reach out through an authorized NGO partner or re-apply with additional documentation.
            </p>
          </>
        ) : (
          <>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 mb-2">
              Under Review
            </span>
            <h1 className="text-2xl font-black text-[#0F172A]">
              Application Pending Review
            </h1>
            <p className="text-sm text-[#64748B] mt-2 max-w-md mx-auto">
              Thank you for submitting your application, <strong>{user?.full_name}</strong>. Our
              admin team is reviewing your profile and eligibility. This typically takes 24 to 48 hours.
            </p>

            {/* Profile Overview Card */}
            {user?.beneficiary && (
              <div className="mt-6 p-4 rounded-2xl bg-[#F8FAF9] border border-[#E2E8F0] text-left space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-[#167C80]">
                  Submitted Profile Summary
                </div>
                <div className="flex items-center gap-2 text-xs text-[#475569]">
                  <Users className="w-3.5 h-3.5 text-[#167C80]" />
                  <span>
                    Category: <strong>{user.beneficiary.beneficiary_type}</strong> (
                    {user.beneficiary.family_member_count} household member
                    {user.beneficiary.family_member_count > 1 ? 's' : ''})
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#475569]">
                  <MapPin className="w-3.5 h-3.5 text-[#F57C00]" />
                  <span className="truncate">{user.beneficiary.address}</span>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#167C80] hover:bg-[#105B60] text-white font-bold text-sm transition shadow-xs disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? 'Checking status...' : 'Refresh Status'}</span>
              </button>
            </div>
          </>
        )}

        <div className="mt-8 pt-6 border-t border-[#F1F5F9] flex items-center justify-center gap-4 text-xs text-[#64748B]">
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="inline-flex items-center gap-1.5 text-rose-600 hover:text-rose-700 font-semibold"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
