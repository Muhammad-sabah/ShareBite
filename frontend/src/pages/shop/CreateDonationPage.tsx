import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Gift,
  Upload,
  Clock,
  Truck,
  HeartHandshake,
  CheckCircle2,
} from 'lucide-react';
import { donorShopApi, parseApiError, shopApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { FOOD_CATEGORIES, FoodCategory } from '../../types';

export const CreateDonationPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [foodName, setFoodName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<FoodCategory>('Bakery');
  const [quantity, setQuantity] = useState<number>(10);
  const [imageUrl, setImageUrl] = useState('');
  const [pickupDate, setPickupDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [pickupStartTime, setPickupStartTime] = useState('18:00');
  const [pickupEndTime, setPickupEndTime] = useState('21:00');
  const [isDeliveryAvailable, setIsDeliveryAvailable] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState('');

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await shopApi.uploadImage(file);
      setImageUrl(url);
      showToast('success', 'Image uploaded successfully!');
    } catch {
      showToast('error', 'Failed to upload image. Please enter a URL or try again.');
    } finally {
      setUploading(false);
    }
  };

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!foodName.trim()) errs.food_name = 'Food item name is required.';
    if (quantity < 1) errs.quantity = 'Quantity must be at least 1.';
    if (!pickupDate) errs.pickup_date = 'Pickup date is required.';
    if (!pickupStartTime) errs.pickup_start_time = 'Start time is required.';
    if (!pickupEndTime) errs.pickup_end_time = 'End time is required.';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError('');

    const localErrors = validate();
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      return;
    }

    setSubmitting(true);
    try {
      await donorShopApi.createDonation({
        food_name: foodName.trim(),
        description: description.trim(),
        category,
        quantity: Number(quantity),
        image_url: imageUrl.trim() || undefined,
        pickup_date: pickupDate,
        pickup_start_time: pickupStartTime,
        pickup_end_time: pickupEndTime,
        is_delivery_available: isDeliveryAvailable,
        delivery_notes: isDeliveryAvailable ? deliveryNotes.trim() : undefined,
      });

      showToast('success', 'Surplus food donation published! Verified beneficiaries can now claim it.');
      navigate('/shop/donations', { replace: true });
    } catch (err) {
      const parsed = parseApiError(err, 'Failed to create food donation.');
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
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        to="/shop/donations"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#167C80] transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Donations</span>
      </Link>

      <div className="bg-white rounded-3xl border border-[#E2E8F0] p-6 sm:p-8 shadow-sm">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#DFF2F0] text-[#167C80] mb-2">
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Community Donation Program</span>
          </div>
          <h1 className="text-2xl font-black text-[#0F172A]">Donate Surplus Food</h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1">
            Food donations are offered <strong>100% free of charge</strong> exclusively to verified
            beneficiaries (families in need and registered charities).
          </p>
        </div>

        {generalError && (
          <div className="mb-6 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm font-medium text-rose-700">
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Item Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                Food Item Title *
              </label>
              <input
                type="text"
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                placeholder="e.g. Fresh Baguette & Pastry Assortment"
                className={inputClass('food_name')}
              />
              {fieldErrors.food_name && (
                <p className="text-xs text-rose-600 mt-1">{fieldErrors.food_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                Description &amp; Food Details
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the food package, freshness, handling advice, or allergen information..."
                className={inputClass('description')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1">Category</label>
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
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                  Donation Quantity (Meal Packages) *
                </label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className={inputClass('quantity')}
                />
                {fieldErrors.quantity && (
                  <p className="text-xs text-rose-600 mt-1">{fieldErrors.quantity}</p>
                )}
              </div>
            </div>

            {/* Image upload */}
            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                Food Image (Optional)
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.example.com/food.jpg"
                  className={inputClass('image_url')}
                />
                <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#E2E8F0] hover:bg-[#F8FAF9] text-xs font-bold text-[#0F172A] cursor-pointer shrink-0 transition">
                  <Upload className="w-3.5 h-3.5 text-[#167C80]" />
                  <span>{uploading ? 'Uploading...' : 'Upload Image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Pickup Window */}
          <div className="p-4 rounded-2xl bg-[#F8FAF9] border border-[#E2E8F0] space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#167C80] flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>Pickup Schedule</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Pickup Date *</label>
                <input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className={inputClass('pickup_date')}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">Start Time *</label>
                <input
                  type="time"
                  value={pickupStartTime}
                  onChange={(e) => setPickupStartTime(e.target.value)}
                  className={inputClass('pickup_start_time')}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">End Time *</label>
                <input
                  type="time"
                  value={pickupEndTime}
                  onChange={(e) => setPickupEndTime(e.target.value)}
                  className={inputClass('pickup_end_time')}
                />
              </div>
            </div>
          </div>

          {/* Delivery Option Toggle */}
          <div className="p-4 rounded-2xl bg-[#F8FAF9] border border-[#E2E8F0] space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isDeliveryAvailable}
                onChange={(e) => setIsDeliveryAvailable(e.target.checked)}
                className="w-4 h-4 rounded border-[#E2E8F0] text-[#167C80] focus:ring-[#167C80]"
              />
              <span className="text-sm font-bold text-[#0F172A] flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-emerald-600" />
                <span>Delivery can be arranged for this donation (Manual arrangement)</span>
              </span>
            </label>

            {isDeliveryAvailable && (
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Delivery Arrangement Details / Constraints
                </label>
                <input
                  type="text"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="e.g. Can drop off within 3km after 8 PM, or coordinate with volunteer drivers."
                  className={inputClass('delivery_notes')}
                />
              </div>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-[#DFF2F0]/60 border border-[#55AAA5]/30 text-xs text-[#105B60] flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#167C80] shrink-0 mt-0.5" />
            <div>
              <strong>Pure Community Giving:</strong> This donation will not affect or mix with your
              commercial offers. It will be surfaced only to approved beneficiaries.
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-[#167C80] hover:bg-[#105B60] text-white font-bold text-sm transition shadow-xs disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Gift className="w-4 h-4" />
            <span>{submitting ? 'Publishing Donation...' : 'Publish Food Donation'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
