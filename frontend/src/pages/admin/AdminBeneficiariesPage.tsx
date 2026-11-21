import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  PlusCircle,
  Users,
  Search,
  Phone,
  MapPin,
} from 'lucide-react';
import { adminApi, parseApiError } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { BeneficiaryProfile, BeneficiaryType } from '../../types';

export const AdminBeneficiariesPage: React.FC = () => {
  const { showToast } = useToast();
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('Pending');
  const [searchTerm, setSearchTerm] = useState('');

  // Rejection modal
  const [rejectingItem, setRejectingItem] = useState<BeneficiaryProfile | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  // Referral modal
  const [referralOpen, setReferralOpen] = useState(false);
  const [refFullName, setRefFullName] = useState('');
  const [refPhone, setRefPhone] = useState('');
  const [refUsername, setRefUsername] = useState('');
  const [refPassword, setRefPassword] = useState('pass123');
  const [refOrgName, setRefOrgName] = useState('');
  const [refType, setRefType] = useState<BeneficiaryType>('Family');
  const [refFamilyCount, setRefFamilyCount] = useState(4);
  const [refAddress, setRefAddress] = useState('');
  const [refPartnerName, setRefPartnerName] = useState('Red Crescent Society');
  const [refNotes, setRefNotes] = useState('');
  const [submittingRef, setSubmittingRef] = useState(false);

  const loadBeneficiaries = async () => {
    setLoading(true);
    try {
      const data = await adminApi.listBeneficiaries(activeTab !== 'All' ? activeTab : undefined);
      setBeneficiaries(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBeneficiaries();
  }, [activeTab]);

  const handleApprove = async (item: BeneficiaryProfile) => {
    try {
      await adminApi.verifyBeneficiary(item.id, 'Approved');
      showToast('success', `Beneficiary ${item.user?.full_name || item.id} approved successfully!`);
      await loadBeneficiaries();
    } catch (err) {
      const parsed = parseApiError(err, 'Could not approve beneficiary.');
      showToast('error', parsed.message);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    setSubmittingReject(true);
    try {
      await adminApi.verifyBeneficiary(
        rejectingItem.id,
        'Rejected',
        rejectReason.trim() || undefined
      );
      showToast('info', `Beneficiary ${rejectingItem.user?.full_name || rejectingItem.id} marked as Rejected.`);
      setRejectingItem(null);
      setRejectReason('');
      await loadBeneficiaries();
    } catch (err) {
      const parsed = parseApiError(err, 'Could not reject beneficiary.');
      showToast('error', parsed.message);
    } finally {
      setSubmittingReject(false);
    }
  };

  const handleCreateReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refFullName.trim() || !refPhone.trim() || !refUsername.trim() || !refPartnerName.trim()) {
      showToast('error', 'Please fill out all required referral fields.');
      return;
    }

    setSubmittingRef(true);
    try {
      await adminApi.createBeneficiaryReferral({
        full_name: refFullName.trim(),
        phone_number: refPhone.trim(),
        username: refUsername.trim(),
        password: refPassword,
        organization_name: refOrgName.trim() || undefined,
        beneficiary_type: refType,
        family_member_count: Number(refFamilyCount) || 1,
        address: refAddress.trim(),
        partner_name: refPartnerName.trim(),
        notes: refNotes.trim() || undefined,
      });

      showToast('success', `Partner referral created and auto-approved for ${refFullName}!`);
      setReferralOpen(false);
      // Reset form
      setRefFullName('');
      setRefPhone('');
      setRefUsername('');
      setRefAddress('');
      setRefNotes('');
      await loadBeneficiaries();
    } catch (err) {
      const parsed = parseApiError(err, 'Failed to create partner referral.');
      showToast('error', parsed.message);
    } finally {
      setSubmittingRef(false);
    }
  };

  const filtered = beneficiaries.filter((b) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (b.user?.full_name && b.user.full_name.toLowerCase().includes(term)) ||
      (b.user?.username && b.user.username.toLowerCase().includes(term)) ||
      (b.organization_name && b.organization_name.toLowerCase().includes(term)) ||
      b.address.toLowerCase().includes(term) ||
      b.phone_number.includes(term)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            Approved
          </span>
        );
      case 'Rejected':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-[#167C80] text-white shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#DFF2F0] text-[#167C80] mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin Control Panel</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black">Beneficiary Verifications</h1>
          <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-xl">
            Review applicant identities, manage community eligibility, and record official partner
            organization referrals.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setReferralOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-[#167C80] text-sm font-bold hover:bg-[#DFF2F0] transition shadow-xs shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Partner Referral</span>
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2 sm:pb-0 sm:border-0 overflow-x-auto">
          {(['Pending', 'Approved', 'Rejected', 'All'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-[#167C80] text-white shadow-xs'
                  : 'bg-white text-[#475569] border border-[#E2E8F0] hover:bg-[#F1F5F9]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px] sm:min-w-[300px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, phone, address..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-[#E2E8F0] bg-white text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#167C80]/20"
          />
        </div>
      </div>

      {/* Table / List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="bg-white rounded-3xl border border-[#E2E8F0] p-6 animate-pulse h-28"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-[#E2E8F0] p-8">
          <Users className="w-12 h-12 text-[#167C80] mx-auto mb-3 opacity-60" />
          <h2 className="text-lg font-bold text-[#0F172A]">No Beneficiaries Found</h2>
          <p className="text-sm text-[#64748B] mt-1 max-w-md mx-auto">
            There are no applications under the current &quot;{activeTab}&quot; tab matching your filter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl border border-[#E2E8F0] p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
            >
              <div className="flex-1 space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm text-[#0F172A]">
                    {item.user?.full_name || 'Beneficiary Applicant'}
                  </span>
                  <span className="text-xs text-[#64748B]">(@{item.user?.username})</span>
                  {getStatusBadge(item.verification_status)}
                  {item.is_partner_referral && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#DFF2F0] text-[#167C80] border border-[#167C80]/30">
                      Partner Referral: {item.partner_name || 'NGO Partner'}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-[#475569]">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#167C80]" />
                    <span>{item.phone_number}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#167C80]" />
                    <span>
                      Type: <strong>{item.beneficiary_type}</strong>{' '}
                      {item.beneficiary_type === 'Charity' && item.organization_name
                        ? `(${item.organization_name})`
                        : `(${item.family_member_count} members)`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#F57C00]" />
                    <span className="truncate">{item.address}</span>
                  </div>

                  {item.id_document_ref && (
                    <div className="font-mono text-slate-500">
                      Doc Ref: {item.id_document_ref}
                    </div>
                  )}
                </div>

                {item.notes && (
                  <p className="text-xs text-[#64748B] bg-[#F8FAF9] p-2.5 rounded-xl border border-[#E2E8F0]">
                    <strong>Notes:</strong> {item.notes}
                  </p>
                )}

                {item.verification_status === 'Rejected' && item.rejection_reason && (
                  <p className="text-xs text-rose-800 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                    <strong>Rejection reason:</strong> {item.rejection_reason}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {item.verification_status !== 'Approved' && (
                  <button
                    type="button"
                    onClick={() => handleApprove(item)}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                )}

                {item.verification_status !== 'Rejected' && (
                  <button
                    type="button"
                    onClick={() => {
                      setRejectingItem(item);
                      setRejectReason('');
                    }}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 text-xs font-bold transition"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl border border-[#E2E8F0] space-y-4">
            <h3 className="text-lg font-black text-[#0F172A] flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600" />
              <span>Reject Beneficiary Application</span>
            </h3>

            <p className="text-xs text-[#64748B]">
              You are rejecting the application for{' '}
              <strong className="text-[#0F172A]">
                {rejectingItem.user?.full_name || rejectingItem.id}
              </strong>
              . You may provide a reason visible to the applicant.
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                Rejection Reason (Optional)
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Incomplete address, unable to verify identity documents, or out of assistance zone."
                className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#64748B] hover:bg-[#F1F5F9]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={submittingReject}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-60"
              >
                {submittingReject ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partner Referral Modal */}
      {referralOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-xl border border-[#E2E8F0] space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-[#0F172A] flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-[#167C80]" />
              <span>Register Partner Referral</span>
            </h3>

            <p className="text-xs text-[#64748B]">
              Enter details for a beneficiary referred by an authorized partner NGO. Reffered
              beneficiaries are <strong>automatically approved</strong> for immediate assistance.
            </p>

            <form onSubmit={handleCreateReferral} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Partner / Referring Organization *
                  </label>
                  <input
                    type="text"
                    value={refPartnerName}
                    onChange={(e) => setRefPartnerName(e.target.value)}
                    placeholder="e.g. Red Crescent Society / Barzani Charity Foundation"
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#167C80]/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Beneficiary Full Name *
                  </label>
                  <input
                    type="text"
                    value={refFullName}
                    onChange={(e) => setRefFullName(e.target.value)}
                    placeholder="e.g. Dara Othman"
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#167C80]/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={refPhone}
                    onChange={(e) => setRefPhone(e.target.value)}
                    placeholder="07709876543"
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#167C80]/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={refUsername}
                    onChange={(e) => setRefUsername(e.target.value)}
                    placeholder="dara_ref"
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#167C80]/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Temporary Password *
                  </label>
                  <input
                    type="text"
                    value={refPassword}
                    onChange={(e) => setRefPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#167C80]/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Category
                  </label>
                  <select
                    value={refType}
                    onChange={(e) => setRefType(e.target.value as BeneficiaryType)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#167C80]/20"
                  >
                    <option value="Family">Family</option>
                    <option value="Individual">Individual</option>
                    <option value="Charity">Charity</option>
                  </select>
                </div>

                {refType === 'Charity' ? (
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      Charity Name
                    </label>
                    <input
                      type="text"
                      value={refOrgName}
                      onChange={(e) => setRefOrgName(e.target.value)}
                      placeholder="e.g. Al-Amal Charity"
                      className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#167C80]/20"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                      Family Members Count
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={refFamilyCount}
                      onChange={(e) => setRefFamilyCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#167C80]/20"
                    />
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Street Address / City *
                  </label>
                  <input
                    type="text"
                    value={refAddress}
                    onChange={(e) => setRefAddress(e.target.value)}
                    placeholder="e.g. Sarchinar, Sulaymaniyah"
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#167C80]/20"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                    Partner Referral Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={refNotes}
                    onChange={(e) => setRefNotes(e.target.value)}
                    placeholder="Referral case ID or special notes"
                    className="w-full px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#167C80]/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setReferralOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#64748B] hover:bg-[#F1F5F9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRef}
                  className="px-5 py-2 rounded-xl bg-[#167C80] hover:bg-[#105B60] text-white text-xs font-bold transition shadow-xs disabled:opacity-60"
                >
                  {submittingRef ? 'Registering...' : 'Register & Auto-Approve'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
