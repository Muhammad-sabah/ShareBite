import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ShoppingBag, Store, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { authApi, parseApiError } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { FOOD_CATEGORIES, FoodCategory, UserRole } from '../../types';
import { ShareBiteLogo } from '../../components/ShareBiteLogo';

export const RegisterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') === 'shop_owner' ? 'shop_owner' : 'customer';

  const navigate = useNavigate();
  const { setSession } = useAuth();
  const { showToast } = useToast();

  const [role, setRole] = useState<UserRole>(initialRole);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');

  // Customer fields
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Shop Owner fields
  const [ownerName, setOwnerName] = useState('');
  const [shopName, setShopName] = useState('');
  const [category, setCategory] = useState<FoodCategory>('Bakery');
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');

  // Shared credentials
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const clearErrors = () => {
    setFieldErrors({});
    setGeneralError('');
  };

  const validateCustomerLocal = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.full_name = 'Full name cannot be empty.';
    else if (!/^[\p{L}\s]+$/u.test(fullName.trim())) errs.full_name = 'Full name must contain letters and spaces only.';

    if (!phoneNumber.trim()) errs.phone_number = 'Phone number cannot be empty.';
    else if (!/^\d{10,15}$/.test(phoneNumber.trim())) errs.phone_number = 'Phone number must be digits only (10 to 15 digits).';

    if (!username.trim()) errs.username = 'Username cannot be empty.';
    else if (/\s/.test(username.trim())) errs.username = 'Username cannot contain spaces.';

    if (password.length < 6) errs.password = 'Password must be at least 6 characters long.';
    return errs;
  };

  const validateShopLocal = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!ownerName.trim()) errs.owner_name = 'Owner name cannot be empty.';
    else if (!/^[\p{L}\s]+$/u.test(ownerName.trim())) errs.owner_name = 'Owner name must contain letters and spaces only.';

    if (!shopName.trim()) errs.shop_name = 'Shop name cannot be empty.';
    if (!category) errs.category = 'Shop category is required.';

    if (!contactNumber.trim()) errs.contact_number = 'Contact number cannot be empty.';
    else if (!/^\d{10,15}$/.test(contactNumber.trim())) errs.contact_number = 'Contact number must be digits only (10 to 15 digits).';

    if (!address.trim()) errs.address = 'Shop address cannot be empty.';

    if (!username.trim()) errs.username = 'Username cannot be empty.';
    else if (/\s/.test(username.trim())) errs.username = 'Username cannot contain spaces.';

    if (password.length < 6) errs.password = 'Password must be at least 6 characters long.';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    const localErrors = role === 'customer' ? validateCustomerLocal() : validateShopLocal();
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      return;
    }

    setSubmitting(true);
    try {
      if (role === 'customer') {
        const res = await authApi.registerCustomer({
          full_name: fullName.trim(),
          phone_number: phoneNumber.trim(),
          username: username.trim(),
          password,
        });
        setSession(res);
        showToast('success', `Welcome to ShareBite, ${res.user.full_name}!`);
        navigate('/marketplace', { replace: true });
      } else {
        const res = await authApi.registerShopOwner({
          owner_name: ownerName.trim(),
          shop_name: shopName.trim(),
          category,
          contact_number: contactNumber.trim(),
          address: address.trim(),
          username: username.trim(),
          password,
        });
        setSession(res);
        showToast('success', `Welcome ${res.user.shop?.shop_name || res.user.full_name} to ShareBite Partner Portal!`);
        navigate('/shop/dashboard', { replace: true });
      }
    } catch (err) {
      const parsed = parseApiError(err, 'Registration failed. Please check your details.');
      if (parsed.field) {
        setFieldErrors({ [parsed.field]: parsed.message });
      } else {
        setGeneralError(parsed.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white text-[#0F172A] focus:outline-none focus:ring-2 ${
      fieldErrors[field]
        ? 'border-rose-400 focus:ring-rose-200'
        : 'border-[#E2E8F0] focus:ring-[#167C80]/20 focus:border-[#167C80]'
    }`;

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-10">
      <div
        className={`w-full ${
          role === 'shop_owner' ? 'max-w-2xl' : 'max-w-md'
        } bg-white rounded-3xl border border-[#E2E8F0] shadow-md p-6 sm:p-8 transition-all duration-200`}
      >
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
            Join ShareBite
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">
            Turn Surplus Food into Shared Value.
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[#F8FAF9] border border-[#E2E8F0] mb-6">
          <button
            type="button"
            onClick={() => {
              setRole('customer');
              clearErrors();
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition ${
              role === 'customer'
                ? 'bg-white text-[#167C80] shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>I&apos;m a Customer</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setRole('shop_owner');
              clearErrors();
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition ${
              role === 'shop_owner'
                ? 'bg-white text-[#167C80] shadow-xs'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>I&apos;m a Shop Owner</span>
          </button>
        </div>

        {generalError && (
          <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm font-medium text-rose-700">
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {role === 'customer' ? (
            <>
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                  Full Name <span className="text-xs font-normal text-[#64748B]">(letters &amp; spaces only)</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Sara Ahmed"
                  className={inputClass('full_name')}
                />
                {fieldErrors.full_name && <p className="text-xs text-rose-600 mt-1">{fieldErrors.full_name}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                  Phone Number <span className="text-xs font-normal text-[#64748B]">(10–15 digits)</span>
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="07701234567"
                  className={inputClass('phone_number')}
                />
                {fieldErrors.phone_number && (
                  <p className="text-xs text-rose-600 mt-1">{fieldErrors.phone_number}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                  Username <span className="text-xs font-normal text-[#64748B]">(no spaces)</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="sara_ahmed"
                  className={inputClass('username')}
                />
                {fieldErrors.username && <p className="text-xs text-rose-600 mt-1">{fieldErrors.username}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                  Password <span className="text-xs font-normal text-[#64748B]">(min 6 characters)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className={`${inputClass('password')} pr-10`}
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
                {fieldErrors.password && <p className="text-xs text-rose-600 mt-1">{fieldErrors.password}</p>}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Info Column */}
              <div className="space-y-4 p-4 rounded-2xl bg-[#F8FAF9] border border-[#E2E8F0]">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#167C80]">
                  Personal Information
                </h2>

                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1">Owner Name</label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Karwan Ibrahim"
                    className={inputClass('owner_name')}
                  />
                  {fieldErrors.owner_name && (
                    <p className="text-xs text-rose-600 mt-1">{fieldErrors.owner_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                    Username <span className="text-xs font-normal text-[#64748B]">(no spaces)</span>
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="bakery_karwan"
                    className={inputClass('username')}
                  />
                  {fieldErrors.username && <p className="text-xs text-rose-600 mt-1">{fieldErrors.username}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                    Password <span className="text-xs font-normal text-[#64748B]">(min 6 chars)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className={`${inputClass('password')} pr-10`}
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
                  {fieldErrors.password && <p className="text-xs text-rose-600 mt-1">{fieldErrors.password}</p>}
                </div>
              </div>

              {/* Shop Info Column */}
              <div className="space-y-4 p-4 rounded-2xl bg-[#F8FAF9] border border-[#E2E8F0]">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#167C80]">
                  Shop Information
                </h2>

                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1">Shop Name</label>
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="City Star Bakery"
                    className={inputClass('shop_name')}
                  />
                  {fieldErrors.shop_name && <p className="text-xs text-rose-600 mt-1">{fieldErrors.shop_name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1">Shop Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as FoodCategory)}
                    className={inputClass('category')}
                  >
                    {FOOD_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.category && <p className="text-xs text-rose-600 mt-1">{fieldErrors.category}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                    Shop Contact Number <span className="text-xs font-normal text-[#64748B]">(10–15 digits)</span>
                  </label>
                  <input
                    type="tel"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="07701112233"
                    className={inputClass('contact_number')}
                  />
                  {fieldErrors.contact_number && (
                    <p className="text-xs text-rose-600 mt-1">{fieldErrors.contact_number}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                    Shop Street Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Salim Street, Sulaymaniyah"
                    className={inputClass('address')}
                  />
                  {fieldErrors.address && <p className="text-xs text-rose-600 mt-1">{fieldErrors.address}</p>}
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-[#167C80] hover:bg-[#105B60] text-white font-bold text-sm transition shadow-xs disabled:opacity-60 active:scale-95"
          >
            {submitting
              ? 'Creating account...'
              : role === 'customer'
              ? 'Register Customer Account'
              : 'Register Shop & Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#64748B]">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-[#167C80] hover:underline">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
};
