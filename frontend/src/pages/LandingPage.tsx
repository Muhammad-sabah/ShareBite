import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Banknote,
  Clock,
  Heart,
  Leaf,
  Play,
  Recycle,
  Search,
  ShoppingBag,
  Store,
  Users,
} from 'lucide-react';
import { marketplaceApi } from '../services/api';
import { Offer } from '../types';
import { OfferCard } from '../components/OfferCard';
import { OfferGridSkeleton } from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import { ShareBiteLogo } from '../components/ShareBiteLogo';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const [featuredOffers, setFeaturedOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    marketplaceApi
      .listOffers()
      .then((list) => {
        if (active) setFeaturedOffers(list.slice(0, 4));
      })
      .catch(() => {
        if (active) setFeaturedOffers([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-12 sm:space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white border-b border-[#E2E8F0] pt-8 pb-14 sm:pt-12 sm:pb-20 lg:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column: Headline & CTAs */}
            <div className="lg:col-span-7 space-y-6 sm:space-y-7">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#DFF2F0] text-[#167C80] text-xs sm:text-sm font-bold border border-[#55AAA5]/20 shadow-2xs">
                <Leaf className="w-4 h-4 text-[#167C80]" />
                <span>Reduce Food Waste</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#0F172A] tracking-tight leading-[1.12]">
                Turn Surplus Food into{' '}
                <span className="text-[#F57C00] block sm:inline">Shared Value.</span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-[#475569] leading-relaxed max-w-2xl font-normal">
                A local marketplace that connects shops with surplus food to people who can enjoy it at a lower price. Save delicious bakery items, café meals, and fresh groceries in Sulaymaniyah.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <Link
                  to="/marketplace"
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#167C80] hover:bg-[#105B60] text-white font-bold text-sm sm:text-base transition-all shadow-sm active:scale-95"
                >
                  <Search className="w-4 h-4" />
                  <span>Browse Offers</span>
                </Link>

                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border-2 border-[#167C80] text-[#167C80] hover:bg-[#DFF2F0] font-bold text-sm sm:text-base transition-all"
                >
                  <Play className="w-4 h-4 fill-[#167C80]" />
                  <span>How it Works</span>
                </a>

                {!user && (
                  <Link
                    to="/register?role=shop_owner"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-[#475569] hover:text-[#167C80] text-sm font-semibold transition"
                  >
                    <Store className="w-4 h-4 text-[#167C80]" />
                    <span>Partner Your Shop</span>
                  </Link>
                )}
              </div>

              {/* Value Prop Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#F1F5F9]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#DFF2F0] text-[#167C80] flex items-center justify-center shrink-0 shadow-2xs">
                    <Leaf className="w-4 h-4" />
                  </div>
                  <div className="leading-tight">
                    <div className="text-xs sm:text-sm font-bold text-[#0F172A]">Less Waste</div>
                    <div className="text-[11px] text-[#64748B]">Save food, save resources</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#DFF2F0] text-[#167C80] flex items-center justify-center shrink-0 shadow-2xs">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="leading-tight">
                    <div className="text-xs sm:text-sm font-bold text-[#0F172A]">More Value</div>
                    <div className="text-[11px] text-[#64748B]">Great food at lower prices</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FFF3E0] text-[#F57C00] flex items-center justify-center shrink-0 shadow-2xs">
                    <Heart className="w-4 h-4" />
                  </div>
                  <div className="leading-tight">
                    <div className="text-xs sm:text-sm font-bold text-[#0F172A]">Stronger Community</div>
                    <div className="text-[11px] text-[#64748B]">Support local businesses</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Visual Showcase */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-md lg:max-w-none">
                {/* Background Soft Teal Blob */}
                <div className="absolute -top-6 -right-6 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-[#DFF2F0]/80 blur-2xl -z-10" />

                {/* Hero Showcase Composition */}
                <div className="relative bg-gradient-to-br from-[#F8FAF9] to-[#E8F5F4] rounded-3xl border border-[#55AAA5]/25 p-6 sm:p-8 shadow-lg overflow-hidden">
                  {/* Decorative Header Badge */}
                  <div className="flex items-center justify-between mb-6">
                    <ShareBiteLogo variant="horizontal" size="sm" showTagline={false} />
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-white text-[#167C80] border border-[#55AAA5]/30 shadow-2xs">
                      Sulaymaniyah Marketplace
                    </span>
                  </div>

                  {/* Visual Centerpiece */}
                  <div className="relative rounded-2xl bg-white p-5 border border-[#E2E8F0] shadow-sm space-y-4">
                    {/* Simulated Paper Bag with ShareBite branding */}
                    <div className="relative rounded-xl overflow-hidden bg-gradient-to-b from-[#EFE5D3] to-[#DFCDB3] p-5 border border-[#D5C1A3] shadow-inner text-center">
                      <div className="inline-block bg-white/90 backdrop-blur-xs px-4 py-2 rounded-xl border border-[#CDB593] shadow-xs mb-2">
                        <ShareBiteLogo variant="horizontal" size="sm" />
                      </div>
                      <p className="text-[11px] font-semibold text-[#6E5736] tracking-tight">
                        Rescued Surplus • Fresh Everyday
                      </p>

                      {/* Floating Food Badges */}
                      <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#F57C00] text-white shadow-xs">
                          Up to 50% OFF
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#167C80] text-white shadow-xs">
                          Cash at Counter
                        </span>
                      </div>
                    </div>

                    {/* Features list in card */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-xs text-[#475569] p-2 rounded-lg bg-[#F8FAF9]">
                        <span className="flex items-center gap-2 font-medium">
                          <Store className="w-3.5 h-3.5 text-[#167C80]" />
                          Local bakeries, cafés &amp; eateries
                        </span>
                        <span className="font-bold text-[#167C80]">120+ Shops</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-[#475569] p-2 rounded-lg bg-[#F8FAF9]">
                        <span className="flex items-center gap-2 font-medium">
                          <Banknote className="w-3.5 h-3.5 text-[#F57C00]" />
                          Payment currency
                        </span>
                        <span className="font-bold text-[#0F172A]">Iraqi Dinar (IQD)</span>
                      </div>
                    </div>
                  </div>

                  {/* University Showcase Notice */}
                  <div className="mt-4 p-3 rounded-xl bg-white/80 border border-[#DFF2F0] text-center">
                    <p className="text-[11px] text-[#64748B]">
                      🎓 University Innovation Showcase Edition • Kurdish &amp; Iraqi Local Market
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Today's Offers Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F57C00] animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#167C80]">
                Live Surplus Marketplace
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] mt-1">
              Today's Offers
            </h2>
            <p className="text-sm text-[#64748B] mt-1">
              Fresh surplus food from local shops at great prices.
            </p>
          </div>
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#167C80] hover:text-[#105B60] transition group"
          >
            <span>View All Offers</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {loading ? (
          <OfferGridSkeleton count={4} />
        ) : featuredOffers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredOffers.map((offer) => (
              <OfferCard key={offer.id} offer={offer} readOnlyRole={user?.role === 'shop_owner'} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-10 text-center text-sm text-[#64748B]">
            No surplus offers are active at this moment. Register a partner shop to publish today's first offer!
          </div>
        )}
      </section>

      {/* Impact Metrics Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#DFF2F0]/80 border border-[#55AAA5]/30 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-xs">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 items-center text-center">
            {/* Stat 1 */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-white text-[#167C80] flex items-center justify-center shadow-xs mb-3">
                <Leaf className="w-6 h-6 text-[#167C80]" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">1,240 kg</div>
              <div className="text-xs sm:text-sm font-semibold text-[#167C80] mt-0.5">Food Saved</div>
            </div>

            {/* Stat 2 */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-white text-[#167C80] flex items-center justify-center shadow-xs mb-3">
                <Users className="w-6 h-6 text-[#167C80]" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">3,850+</div>
              <div className="text-xs sm:text-sm font-semibold text-[#167C80] mt-0.5">Happy Users</div>
            </div>

            {/* Stat 3 */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-white text-[#167C80] flex items-center justify-center shadow-xs mb-3">
                <Store className="w-6 h-6 text-[#167C80]" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">120+</div>
              <div className="text-xs sm:text-sm font-semibold text-[#167C80] mt-0.5">Partner Shops</div>
            </div>

            {/* Stat 4 */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-white text-[#167C80] flex items-center justify-center shadow-xs mb-3">
                <Recycle className="w-6 h-6 text-[#167C80]" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">~3,200 kg</div>
              <div className="text-xs sm:text-sm font-semibold text-[#167C80] mt-0.5">CO₂ Reduced</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="bg-white border-y border-[#E2E8F0] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#167C80]">
              Simple &amp; Transparent
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#0F172A] mt-1.5">
              How ShareBite Works
            </h2>
            <p className="text-sm sm:text-base text-[#64748B] mt-2">
              Three straightforward steps — direct local pickup, zero online card fees.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                step: '01',
                icon: ShoppingBag,
                title: 'Browse Local Surplus',
                desc: 'Explore active food items from bakeries, cafés, and restaurants with transparent original vs. discounted IQD prices and live countdowns.',
              },
              {
                step: '02',
                icon: Clock,
                title: 'Reserve Before Pickup Ends',
                desc: 'Select your quantity and lock in your reservation before the pickup window closes. Stock updates instantly to prevent overselling.',
              },
              {
                step: '03',
                icon: Banknote,
                title: 'Collect & Pay Cash at Shop',
                desc: 'Visit the shop during the pickup window, show your Reservation Code, collect your delicious food, and pay cash at the counter.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="rounded-3xl border border-[#E2E8F0] bg-[#F8FAF9] hover:bg-white hover:border-[#55AAA5]/40 p-7 flex flex-col transition-all duration-200 shadow-2xs hover:shadow-sm"
                >
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-[#DFF2F0] text-[#167C80] flex items-center justify-center shadow-xs">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-extrabold text-[#F57C00] bg-[#FFF3E0] px-3 py-1 rounded-full border border-[#FFE0B2]">
                      STEP {item.step}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#0F172A] mb-2">{item.title}</h3>
                  <p className="text-sm text-[#475569] leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits for Customers & Shops */}
      <section id="for-shops" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Customers */}
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-7 sm:p-9 flex flex-col justify-between shadow-xs">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#DFF2F0] text-[#167C80] text-xs font-bold mb-4">
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>FOR CUSTOMERS</span>
              </div>
              <h3 className="text-2xl font-bold text-[#0F172A] mb-3">
                Great food at everyday savings
              </h3>
              <ul className="space-y-2.5 text-sm text-[#475569] mb-8">
                <li className="flex items-center gap-2">
                  <span className="text-[#167C80] font-bold">✓</span>
                  <span>Save 30% to 50% on fresh bakery items, café meals, and desserts</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#167C80] font-bold">✓</span>
                  <span>See exact food descriptions, quantities, and shop addresses upfront</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#167C80] font-bold">✓</span>
                  <span>Instant reservation codes to present on arrival</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#167C80] font-bold">✓</span>
                  <span>Zero online card requirements — pay straightforward cash at the shop</span>
                </li>
              </ul>
            </div>
            <Link
              to="/register?role=customer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#167C80] hover:bg-[#105B60] text-white text-sm font-bold transition shadow-xs w-full sm:w-auto"
            >
              <span>Create Customer Account</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Local Shops */}
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-7 sm:p-9 flex flex-col justify-between shadow-xs">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF3E0] text-[#F57C00] text-xs font-bold mb-4">
                <Store className="w-3.5 h-3.5" />
                <span>FOR LOCAL SHOPS</span>
              </div>
              <h3 className="text-2xl font-bold text-[#0F172A] mb-3">
                Turn surplus food into shared value
              </h3>
              <ul className="space-y-2.5 text-sm text-[#475569] mb-8">
                <li className="flex items-center gap-2">
                  <span className="text-[#F57C00] font-bold">✓</span>
                  <span>List surplus food in under 60 seconds with custom pickup windows</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#F57C00] font-bold">✓</span>
                  <span>Automated inventory tracking prevents overselling</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#F57C00] font-bold">✓</span>
                  <span>Quick customer pickup verification via unique reservation codes</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[#F57C00] font-bold">✓</span>
                  <span>Recover food production costs and introduce new local foot traffic</span>
                </li>
              </ul>
            </div>
            <Link
              to="/register?role=shop_owner"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border-2 border-[#167C80] bg-white hover:bg-[#DFF2F0] text-[#167C80] text-sm font-bold transition w-full sm:w-auto"
            >
              <span>Register Your Shop</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
