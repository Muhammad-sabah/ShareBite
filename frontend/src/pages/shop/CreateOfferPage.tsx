import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImagePlus, MapPin, Store, Upload } from 'lucide-react';
import { shopApi, parseApiError } from '../../services/api';
import { FOOD_CATEGORIES, FoodCategory } from '../../types';
import { formatIQD, PRESET_FOOD_IMAGES, todayDateInputValue } from '../../utils/format';
import { resolveImageUrl } from '../../utils/imageUrl';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const CreateOfferPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const defaultCat = user?.shop?.category || 'Bakery';
  const [foodName, setFoodName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<FoodCategory>(defaultCat);
  const [imageUrl, setImageUrl] = useState<string>(
    PRESET_FOOD_IMAGES.find((p) => p.category === defaultCat)?.url || PRESET_FOOD_IMAGES[0].url
  );
  const [originalPrice, setOriginalPrice] = useState('');
  const [discountedPrice, setDiscountedPrice] = useState('');
  const [availableQuantity, setAvailableQuantity] = useState('');
  const [pickupDate, setPickupDate] = useState(todayDateInputValue());
  const [pickupStartTime, setPickupStartTime] = useState('16:00');
  const [pickupEndTime, setPickupEndTime] = useState('21:00');

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
      showToast('success', 'Food image uploaded.');
    } catch (err) {
      showToast('error', parseApiError(err, 'Failed to upload image.').message);
    } finally {
      setUploading(false);
    }
  };

  const validateLocal = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!foodName.trim()) errs.food_name = 'Food name cannot be empty.';

    const orig = Number(originalPrice);
    const disc = Number(discountedPrice);
    const qty = Number(availableQuantity);

    if (!originalPrice || !Number.isInteger(orig) || orig <= 0) {
      errs.original_price = 'Original price must be a whole number greater than 0 IQD.';
    }
    if (!discountedPrice || !Number.isInteger(disc) || disc <= 0) {
      errs.discounted_price = 'Discounted price must be a whole number greater than 0 IQD.';
    } else if (!errs.original_price && disc >= orig) {
      errs.discounted_price = 'Discounted price must be strictly less than the original price.';
    }

    if (!availableQuantity || !Number.isInteger(qty) || qty <= 0) {
      errs.available_quantity = 'Available quantity must be a whole number greater than 0.';
    }

    if (!pickupDate) errs.pickup_date = 'Pickup date is required.';
    if (!pickupStartTime) errs.pickup_start_time = 'Pickup start time is required.';
    if (!pickupEndTime) errs.pickup_end_time = 'Pickup end time is required.';
    else if (pickupStartTime && pickupEndTime <= pickupStartTime) {
      errs.pickup_end_time = 'Pickup end time must be strictly after the pickup start time.';
    }

    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');
    setFieldErrors({});

    const localErrors = validateLocal();
    if (Object.keys(localErrors).length > 0) {
      setFieldErrors(localErrors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await shopApi.createOffer({
        food_name: foodName.trim(),
        description: description.trim(),
        category,
        image_url: imageUrl,
        original_price: Number(originalPrice),
        discounted_price: Number(discountedPrice),
        available_quantity: Number(availableQuantity),
        pickup_date: pickupDate,
        pickup_start_time: pickupStartTime,
        pickup_end_time: pickupEndTime,
      });
      showToast('success', res.message);
      navigate('/shop/offers');
    } catch (err) {
      const parsed = parseApiError(err, 'Could not publish food offer.');
      if (parsed.field) {
        setFieldErrors({ [parsed.field]: parsed.message });
      } else {
        setGeneralError(parsed.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const origNum = Number(originalPrice);
  const discNum = Number(discountedPrice);
  const discountPct =
    origNum > 0 && discNum > 0 && discNum < origNum
      ? Math.round(((origNum - discNum) / origNum) * 100)
      : 0;

  const inputClass = (field: string) =>
    `w-full px-3.5 py-2.5 rounded-xl border text-sm bg-white text-[#0F172A] focus:outline-none focus:ring-2 ${
      fieldErrors[field]
        ? 'border-rose-400 focus:ring-rose-200'
        : 'border-[#E2E8F0] focus:ring-[#167C80]/20 focus:border-[#167C80]'
    }`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A]">Create New Food Offer</h1>
        <p className="text-sm text-[#64748B] mt-1">
          Publish surplus food items for customers in Sulaymaniyah to reserve and collect in person.
        </p>
      </div>

      {/* Auto-populated Shop Banner */}
      {user?.shop && (
        <div className="rounded-2xl bg-[#DFF2F0] border border-[#55AAA5]/25 px-5 py-3.5 flex flex-wrap items-center gap-4 text-sm font-semibold text-[#105B60]">
          <span className="inline-flex items-center gap-1.5">
            <Store className="w-4 h-4 text-[#167C80]" />
            Listing for: {user.shop.shop_name}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-[#F57C00]" />
            {user.shop.address}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-8 bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-7 space-y-5 shadow-xs"
        >
          {generalError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm font-medium text-rose-700">
              {generalError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-[#0F172A] mb-1">Food Item Name *</label>
              <input
                type="text"
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                placeholder="e.g. Evening Croissant Box (4 pcs)"
                className={inputClass('food_name')}
              />
              {fieldErrors.food_name && <p className="text-xs text-rose-600 mt-1">{fieldErrors.food_name}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-1">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as FoodCategory)}
                className={inputClass('category')}
              >
                {FOOD_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {fieldErrors.category && <p className="text-xs text-rose-600 mt-1">{fieldErrors.category}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-1">Available Quantity *</label>
              <input
                type="number"
                min={1}
                step={1}
                value={availableQuantity}
                onChange={(e) => setAvailableQuantity(e.target.value)}
                placeholder="e.g. 8"
                className={inputClass('available_quantity')}
              />
              {fieldErrors.available_quantity && (
                <p className="text-xs text-rose-600 mt-1">{fieldErrors.available_quantity}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-1">Original Price (IQD) *</label>
              <input
                type="number"
                min={1}
                step={1}
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                placeholder="e.g. 14000"
                className={inputClass('original_price')}
              />
              {fieldErrors.original_price && (
                <p className="text-xs text-rose-600 mt-1">{fieldErrors.original_price}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                Discounted Price (IQD) *
              </label>
              <input
                type="number"
                min={1}
                step={1}
                value={discountedPrice}
                onChange={(e) => setDiscountedPrice(e.target.value)}
                placeholder="e.g. 7000"
                className={inputClass('discounted_price')}
              />
              {fieldErrors.discounted_price && (
                <p className="text-xs text-rose-600 mt-1">{fieldErrors.discounted_price}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-1">Pickup Date *</label>
              <input
                type="date"
                value={pickupDate}
                min={todayDateInputValue()}
                onChange={(e) => setPickupDate(e.target.value)}
                className={inputClass('pickup_date')}
              />
              {fieldErrors.pickup_date && <p className="text-xs text-rose-600 mt-1">{fieldErrors.pickup_date}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1">Start Time *</label>
                <input
                  type="time"
                  value={pickupStartTime}
                  onChange={(e) => setPickupStartTime(e.target.value)}
                  className={inputClass('pickup_start_time')}
                />
                {fieldErrors.pickup_start_time && (
                  <p className="text-xs text-rose-600 mt-1">{fieldErrors.pickup_start_time}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0F172A] mb-1">End Time *</label>
                <input
                  type="time"
                  value={pickupEndTime}
                  onChange={(e) => setPickupEndTime(e.target.value)}
                  className={inputClass('pickup_end_time')}
                />
                {fieldErrors.pickup_end_time && (
                  <p className="text-xs text-rose-600 mt-1">{fieldErrors.pickup_end_time}</p>
                )}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-[#0F172A] mb-1">
                Short Description <span className="text-xs font-normal text-[#64748B]">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what's included in this surplus box..."
                className={inputClass('description')}
              />
            </div>

            {/* Image Picker & Upload */}
            <div className="sm:col-span-2 space-y-3 pt-2 border-t border-[#F1F5F9]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-sm font-semibold text-[#0F172A] inline-flex items-center gap-1.5">
                  <ImagePlus className="w-4 h-4 text-[#167C80]" />
                  <span>Food Visual (Select preset or upload photo)</span>
                </label>

                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#167C80] text-[#167C80] hover:bg-[#DFF2F0] text-xs font-semibold cursor-pointer transition">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploading ? 'Uploading...' : 'Upload Photo'}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {PRESET_FOOD_IMAGES.map((preset) => {
                  const selected = imageUrl === preset.url;
                  return (
                    <button
                      key={preset.url}
                      type="button"
                      onClick={() => setImageUrl(preset.url)}
                      title={preset.label}
                      className={`rounded-xl overflow-hidden border-2 transition ${
                        selected
                          ? 'border-[#167C80] ring-2 ring-[#167C80]/25'
                          : 'border-[#E2E8F0] hover:border-[#55AAA5]'
                      }`}
                    >
                      <img src={preset.url} alt={preset.label} className="w-full h-12 object-cover" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 rounded-xl bg-[#167C80] hover:bg-[#105B60] text-white text-sm font-bold transition shadow-xs disabled:opacity-60 active:scale-95"
            >
              {submitting ? 'Publishing Offer...' : 'Publish Offer'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/shop/offers')}
              className="px-5 py-3 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#475569] hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Live Card Preview */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Live Marketplace Preview</div>
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-xs">
            <div className="relative aspect-[16/10] bg-slate-100">
              <img src={resolveImageUrl(imageUrl)} alt="Offer preview" className="w-full h-full object-cover" />
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#DFF2F0] text-[#167C80] border border-[#55AAA5]/20">
                {category}
              </span>
              {discountPct > 0 && (
                <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md text-xs font-black bg-[#F57C00] text-white shadow-xs">
                  -{discountPct}%
                </span>
              )}
            </div>
            <div className="p-4 space-y-2">
              <div className="font-bold text-[#0F172A] truncate">{foodName || 'Your Food Item Name'}</div>
              <div className="text-xs text-[#64748B] line-clamp-2">
                {description || 'Optional short description appears here.'}
              </div>
              <div className="text-xs text-[#167C80] font-medium">
                {user?.shop?.shop_name} • {user?.shop?.address}
              </div>
              <div className="pt-2 border-t border-[#F1F5F9] flex items-baseline justify-between">
                <div>
                  <span className="text-xs text-[#94A3B8] line-through mr-2">
                    {origNum > 0 ? formatIQD(origNum) : '0 IQD'}
                  </span>
                  <span className="text-base font-black text-[#F57C00]">
                    {discNum > 0 ? formatIQD(discNum) : '0 IQD'}
                  </span>
                </div>
                <span className="text-xs font-bold text-[#0F172A]">
                  {availableQuantity || 0} left
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
