import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, HeartHandshake, ShieldCheck } from 'lucide-react';
import { authApi, parseApiError } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { BeneficiaryType } from '../../types';
import { ShareBiteLogo } from '../../components/ShareBiteLogo';

export const BeneficiaryRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [beneficiaryType, setBeneficiaryType] = useState<BeneficiaryType>('Family');
  const [organizationName, setOrganizationName] = useState('');
  const [familyMemberCount, setFamilyMemberCount] = useState<number>(4);
  const [address, setAddress] = useState('');
  const [idDocumentRef, setIdDocumentRef] = useState('');
  const [notes, setNotes] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const clearErrors = () => {
    setFieldErrors({});
    setGeneralError('');
  };

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.full_name = 'Full name is required.';
    if (!phoneNumber.trim()) errs.phone_number = 'Phone number is required.';
    else if (!/^\d{10,15}$/.test(phoneNumber.trim()))
      errs.phone_number = 'Phone number must be digits only (10 to 15 digits).';

    if (beneficiaryType === 'Charity' && !organizationName.trim()) {
      errs.organization_name = 'Organization/Charity name is required.';
    }

    if (!address.trim()) errs.address = 'Current address is required for pickup proximity.';
    if (!username.trim()) errs.username = 'Username is required.';
    else if (/\s/.test(username.trim())) errs.username = 'Username cannot contain spaces.';

    if (password.length < 6) errs.password = 'Password must be at least 6 characters.';

    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    const localErrors = validate();
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await authApi.registerBeneficiary({
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim(),
        username: username.trim(),
        password,
        organization_name: organizationName.trim() || undefined,
        beneficiary_type: beneficiaryType,
        family_member_count: Number(familyMemberCount) || 1,
        address: address.trim(),
        id_document_ref: idDocumentRef.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      setSession(res);
      showToast(
        'info',
        'Beneficiary application submitted! Our team will review your application shortly.'
      );
      navigate('/beneficiary/status', { replace: true });
    } catch (err) {
      const parsed = parseApiError(err, 'Failed to submit application. Please check your inputs.');
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
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-[#E2E8F0] shadow-md p-6 sm:p-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#167C80] mb-5 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>

        {/* Brand & Title */}
        <div className="mb-6">
          <ShareBiteLogo variant="horizontal" size="md" showTagline={false} />
          <div className="flex items-center gap-2 mt-3">
            <HeartHandshake className="w-6 h-6 text-[#167C80]" />
            <h1 className="text-xl sm:text-2xl font-black text-[#0F172A]">
              Beneficiary Food Assistance Application
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1">
            ShareBite provides free surplus food to eligible individuals, families, and registered charities.
            All applications are verified by our team to protect community integrity.
          </p>
        </div>

        {generalError && (
          <div className="mb-6 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm font-medium text-rose-700">
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section: Applicant Type */}
          <div className="p-4 rounded-2xl bg-[#F8FAF9] border border-[#E2E8F0] space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#167C80] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Assistance Category</span>
            </h2>

            <div className="grid grid-cols-3 gap-2">
              {(['Individual', 'Family', 'Charity'] as BeneficiaryType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setBeneficiaryType(type)}
                  className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold border transition ${
                    beneficiaryType === type
                      ? 'bg-[#167C80] text-white border-[#167C80] shadow-xs'
                      : 'bg-white text-[#475569] border-[#E2E8F0] hover:border-[#167C80]/50'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {beneficiaryType === 'Charity' ? (
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                  Organization / Charity Name *
                </label>
                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="e.g. Hope Community Relief"
                  className={inputClass('organization_name')}
                />
                {fieldErrors.organization_name && (
                  <p className="text-xs text-rose-600 mt-1">{fieldErrors.organization_name}</p>
                )}
              </div>
            ) : beneficiaryType === 'Family' ? (
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                  Family Members Count
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={familyMemberCount}
                  onChange={(e) => setFamilyMemberCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className={inputClass('family_member_count')}
                />
              </div>
            ) : null}
          </div>

          {/* Section: Contact & Personal Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                Full Name / Representative Name *
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ahmed Salim"
                className={inputClass('full_name')}
              />
              {fieldErrors.full_name && (
                <p className="text-xs text-rose-600 mt-1">{fieldErrors.full_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                Phone Number * <span className="text-xs font-normal text-[#64748B]">(10–15 digits)</span>
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

            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                Address / Neighborhood *
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Neighborhood, City (e.g. Bakrajo, Sulaymaniyah)"
                className={inputClass('address')}
              />
              {fieldErrors.address && (
                <p className="text-xs text-rose-600 mt-1">{fieldErrors.address}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                National ID / Document Reference (Optional)
              </label>
              <input
                type="text"
                value={idDocumentRef}
                onChange={(e) => setIdDocumentRef(e.target.value)}
                placeholder="e.g. ID-982124"
                className={inputClass('id_document_ref')}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                Additional Notes / Household Needs (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special dietary needs or circumstances"
                className={inputClass('notes')}
              />
            </div>
          </div>

          {/* Section: Account Credentials */}
          <div className="p-4 rounded-2xl bg-[#F8FAF9] border border-[#E2E8F0] space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#167C80]">
              Account Login Credentials
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                  Username * <span className="text-xs font-normal text-[#64748B]">(no spaces)</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ahmed_salim"
                  className={inputClass('username')}
                />
                {fieldErrors.username && (
                  <p className="text-xs text-rose-600 mt-1">{fieldErrors.username}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                  Password * <span className="text-xs font-normal text-[#64748B]">(min 6 characters)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Choose secure password"
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
                {fieldErrors.password && (
                  <p className="text-xs text-rose-600 mt-1">{fieldErrors.password}</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-[#DFF2F0]/60 border border-[#55AAA5]/30 p-3.5 text-xs text-[#105B60] flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 shrink-0 text-[#167C80] mt-0.5" />
            <div>
              <strong>Privacy Assurance:</strong> Your information is strictly used for eligibility
              verification by authorized administrators and will never be shared publicly or sold.
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-[#167C80] hover:bg-[#105B60] text-white font-bold text-sm transition shadow-xs disabled:opacity-60 active:scale-95"
          >
            {submitting ? 'Submitting Application...' : 'Submit Application for Review'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#64748B]">
          Already applied?{' '}
          <Link to="/login" className="font-bold text-[#167C80] hover:underline">
            Login to check status
          </Link>
        </p>
      </div>
    </div>
  );
};
