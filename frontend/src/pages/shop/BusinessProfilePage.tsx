import React, { useState } from 'react';
import { MapPin, Phone, Save, Store, User } from 'lucide-react';
import { shopApi, parseApiError } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const BusinessProfilePage: React.FC = () => {
  const { user, updateShopInSession } = useAuth();
  const { showToast } = useToast();

  const [contactNumber, setContactNumber] = useState(user?.shop?.contact_number || '');
  const [address, setAddress] = useState(user?.shop?.address || '');
  const [description, setDescription] = useState(user?.shop?.description || '');
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (!user?.shop) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    const errs: Record<string, string> = {};
    if (!/^\d{10,15}$/.test(contactNumber.trim())) {
      errs.contact_number = 'Shop contact number must be digits only (10 to 15 digits).';
    }
    if (!address.trim()) {
      errs.address = 'Shop address cannot be empty.';
    }
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setSaving(true);
    try {
      const updated = await shopApi.updateProfile({
        contact_number: contactNumber.trim(),
        address: address.trim(),
        description: description.trim(),
      });
      updateShopInSession(updated);
      showToast('success', 'Business profile updated successfully.');
    } catch (err) {
      const parsed = parseApiError(err, 'Failed to update business profile.');
      if (parsed.field) {
        setFieldErrors({ [parsed.field]: parsed.message });
      } else {
        showToast('error', parsed.message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A]">Business Profile</h1>
        <p className="text-sm text-[#64748B] mt-1">
          Manage your shop details displayed on food offers and customer pickup confirmations.
        </p>
      </div>

      {/* Immutable Identity Summary */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <div className="text-xs font-bold uppercase text-[#64748B] flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5 text-[#167C80]" />
            <span>Shop Name</span>
          </div>
          <div className="text-base font-bold text-[#0F172A] mt-1">{user.shop.shop_name}</div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase text-[#64748B]">Category</div>
          <div className="text-base font-black text-[#167C80] mt-1">{user.shop.category}</div>
        </div>
        <div>
          <div className="text-xs font-bold uppercase text-[#64748B] flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[#167C80]" />
            <span>Owner</span>
          </div>
          <div className="text-base font-bold text-[#0F172A] mt-1">
            {user.full_name} <span className="text-xs font-normal text-[#64748B]">(@{user.username})</span>
          </div>
        </div>
      </div>

      {/* Editable Form */}
      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-7 space-y-5 shadow-xs"
      >
        <div>
          <label className="block text-sm font-semibold text-[#0F172A] mb-1.5 flex items-center gap-1.5">
            <Phone className="w-4 h-4 text-[#167C80]" />
            <span>Shop Contact Number (10–15 digits)</span>
          </label>
          <input
            type="tel"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#167C80]/20 focus:border-[#167C80]"
          />
          {fieldErrors.contact_number && (
            <p className="text-xs text-rose-600 mt-1">{fieldErrors.contact_number}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#0F172A] mb-1.5 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-[#F57C00]" />
            <span>Physical Street Address</span>
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#167C80]/20 focus:border-[#167C80]"
          />
          {fieldErrors.address && <p className="text-xs text-rose-600 mt-1">{fieldErrors.address}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
            About Your Shop <span className="text-xs font-normal text-[#64748B]">(optional)</span>
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Share pickup instructions or details about your shop..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#167C80]/20 focus:border-[#167C80]"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#167C80] hover:bg-[#105B60] text-white text-sm font-bold transition shadow-xs disabled:opacity-60 active:scale-95"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving Changes...' : 'Save Business Profile'}</span>
        </button>
      </form>
    </div>
  );
};
