import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Store,
  Eye,
  EyeOff,
  ArrowLeft,
  HeartHandshake,
  ShieldCheck,
} from 'lucide-react';
import { authApi, parseApiError } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { UserRole } from '../../types';
import { ShareBiteLogo } from '../../components/ShareBiteLogo';
import { DEMO_ACCOUNTS } from '../../config/demoAccounts';

export const LoginPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const { showToast } = useToast();

  const initialState = (location.state as { role?: UserRole; from?: string } | null) || {};
  const [role, setRole] = useState<UserRole>(initialState.role || 'customer');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password) {
      setErrorMsg('Please enter both your username and password.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await authApi.login({ role, username: username.trim(), password });
      setSession(res);
      showToast(
        'success',
        res.user.role === 'shop_owner'
          ? `Welcome back to ${res.user.shop?.shop_name || res.user.full_name}!`
          : `Welcome back, ${res.user.full_name}!`
      );

      if (res.user.role === 'shop_owner') {
        navigate('/shop/dashboard', { replace: true });
      } else if (res.user.role === 'admin') {
        navigate('/admin/beneficiaries', { replace: true });
      } else if (res.user.role === 'beneficiary') {
        if (res.user.beneficiary?.verification_status === 'Approved') {
          navigate('/donations', { replace: true });
        } else {
          navigate('/beneficiary/status', { replace: true });
        }
      } else {
        navigate(
          initialState.from && !initialState.from.startsWith('/shop') && !initialState.from.startsWith('/admin')
            ? initialState.from
            : '/marketplace',
          { replace: true }
        );
      }
    } catch (err) {
      const parsed = parseApiError(err, 'Invalid username or password.');
      setErrorMsg(parsed.message);
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (demoRole: UserRole, demoUser: string, demoPass = 'pass123') => {
    setRole(demoRole);
    setUsername(demoUser);
    setPassword(demoPass);
    setErrorMsg('');
  };

  const getRoleLabel = () => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'beneficiary':
        return 'Beneficiary';
      case 'shop_owner':
        return 'Shop Owner';
      default:
        return 'Customer';
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-[#E2E8F0] shadow-md p-6 sm:p-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#167C80] mb-5 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>

        {/* Brand Header */}
        <div className="mb-4">
          <ShareBiteLogo variant="horizontal" size="md" showTagline={false} />
          <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] mt-3">
            Sign in to ShareBite
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Turn Surplus Food into Shared Value.
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-2xl bg-[#F8FAF9] border border-[#E2E8F0] mb-6">
          <button
            type="button"
            onClick={() => {
              setRole('customer');
              setErrorMsg('');
            }}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              role === 'customer'
                ? 'bg-white text-[#167C80] shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span>Customer</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRole('shop_owner');
              setErrorMsg('');
            }}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              role === 'shop_owner'
                ? 'bg-white text-[#167C80] shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Store className="w-4 h-4 shrink-0" />
            <span>Shop</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRole('beneficiary');
              setErrorMsg('');
            }}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              role === 'beneficiary'
                ? 'bg-white text-[#167C80] shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <HeartHandshake className="w-4 h-4 shrink-0" />
            <span>Beneficiary</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRole('admin');
              setErrorMsg('');
            }}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              role === 'admin'
                ? 'bg-white text-[#167C80] shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Admin</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm font-medium text-rose-700">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-username" className="block text-sm font-semibold text-[#0F172A] mb-1.5">
              Username
            </label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={
                role === 'customer'
                  ? 'e.g. customer1'
                  : role === 'shop_owner'
                  ? 'e.g. bakery1'
                  : role === 'admin'
                  ? 'e.g. admin'
                  : 'e.g. beneficiary username'
              }
              autoComplete="username"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#167C80]/20 focus:border-[#167C80]"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-semibold text-[#0F172A] mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-[#E2E8F0] bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#167C80]/20 focus:border-[#167C80]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0F172A]"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-[#167C80] hover:bg-[#105B60] text-white font-bold text-sm transition shadow-xs disabled:opacity-60 active:scale-95"
          >
            {submitting ? 'Signing in...' : `Login as ${getRoleLabel()}`}
          </button>
        </form>

        {/* Demo Quick Fill Helper */}
        <div className="mt-6 pt-5 border-t border-[#F1F5F9]">
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              Event Quick Fill Demo Accounts
            </p>
            <span className="text-[10px] text-[#94A3B8] font-medium">1-Click Auto-Fill</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.username}
                type="button"
                onClick={() => fillDemo(acc.role, acc.username, acc.password)}
                className="flex flex-col text-left p-2.5 rounded-xl border border-[#E2E8F0] hover:border-[#167C80]/50 hover:bg-[#F8FAF9] transition group"
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${acc.badgeColor}`}>
                    {acc.roleLabel}
                  </span>
                  <span className="text-xs font-mono text-[#64748B] group-hover:text-[#167C80]">
                    @{acc.username}
                  </span>
                </div>
                <div className="text-xs font-bold text-[#0F172A] mt-1.5 truncate">
                  {acc.name}
                </div>
                <div className="text-[11px] text-[#64748B] truncate">
                  {acc.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[#F1F5F9] flex flex-col sm:flex-row items-center justify-between text-xs text-[#64748B] gap-2">
          <span>Don&apos;t have an account?</span>
          <div className="flex items-center gap-3">
            <Link to="/register" className="font-bold text-[#167C80] hover:underline">
              Register Customer/Shop
            </Link>
            <span>•</span>
            <Link to="/register/beneficiary" className="font-bold text-[#F57C00] hover:underline">
              Apply as Beneficiary
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
