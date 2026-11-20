import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Banknote, Store } from 'lucide-react';
import { ShareBiteLogo } from './ShareBiteLogo';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-[#E2E8F0] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-[#F1F5F9]">
          {/* Brand info */}
          <div className="space-y-3">
            <ShareBiteLogo variant="horizontal" size="md" showTagline={false} />
            <p className="text-xs font-bold uppercase tracking-wider text-[#167C80]">
              Turn Surplus Food into Shared Value.
            </p>
            <p className="text-sm text-[#64748B] leading-relaxed max-w-sm">
              Connecting local bakeries, cafés, restaurants, and groceries in Sulaymaniyah with customers to rescue delicious surplus food at fair, discounted prices.
            </p>
          </div>

          {/* Platform Rules */}
          <div>
            <h4 className="text-sm font-bold text-[#0F172A] mb-3.5 tracking-tight">How ShareBite Works</h4>
            <ul className="space-y-2.5 text-sm text-[#64748B]">
              <li className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-[#DFF2F0] text-[#167C80] flex items-center justify-center shrink-0">
                  <Store className="w-3.5 h-3.5" />
                </div>
                <span>In-person pickup directly from local shops</span>
              </li>
              <li className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-[#FFF3E0] text-[#F57C00] flex items-center justify-center shrink-0">
                  <Banknote className="w-3.5 h-3.5" />
                </div>
                <span>Cash payment at the shop upon collection (IQD)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-[#DFF2F0] text-[#167C80] flex items-center justify-center shrink-0">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <span>Serving Sulaymaniyah, Kurdistan Region of Iraq</span>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-bold text-[#0F172A] mb-3.5 tracking-tight">Quick Links</h4>
            <div className="flex flex-col space-y-2 text-sm">
              <Link to="/marketplace" className="text-[#64748B] hover:text-[#167C80] transition font-medium">
                Browse Marketplace Offers
              </Link>
              <Link to="/login" className="text-[#64748B] hover:text-[#167C80] transition font-medium">
                Sign In to Account
              </Link>
              <Link to="/register" className="text-[#64748B] hover:text-[#167C80] transition font-medium">
                Register Customer or Shop
              </Link>
              <a href="/#how-it-works" className="text-[#64748B] hover:text-[#167C80] transition font-medium">
                How It Works
              </a>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#94A3B8]">
          <p>
            <strong>Showcase Notice:</strong> Demonstration platform developed for university innovation presentation. Sample listings represent demonstration businesses in Sulaymaniyah.
          </p>
          <p className="shrink-0 font-medium text-[#64748B]">
            &copy; {new Date().getFullYear()} ShareBite. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
