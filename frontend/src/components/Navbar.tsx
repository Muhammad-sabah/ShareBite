import React, { useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  LogOut,
  ShoppingBag,
  Store,
  LayoutDashboard,
  ClipboardList,
  User,
  Bell,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ShareBiteLogo } from './ShareBiteLogo';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    setProfileOpen(false);
    navigate('/');
  };

  const isHome = location.pathname === '/';

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-xl text-sm font-semibold transition ${
      isActive
        ? 'bg-[#DFF2F0] text-[#167C80]'
        : 'text-[#475569] hover:text-[#167C80] hover:bg-[#F1F5F9]'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-18 flex items-center justify-between gap-4">
          {/* Brand */}
          <Link
            to="/"
            className="flex items-center group transition"
            onClick={() => setMobileOpen(false)}
            aria-label="ShareBite Home"
          >
            <ShareBiteLogo variant="horizontal" size="md" showTagline={false} />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1.5">
            <NavLink to="/" end className={navLinkClass}>
              Home
            </NavLink>

            <NavLink to="/marketplace" className={navLinkClass}>
              Marketplace
            </NavLink>

            <a
              href="/#how-it-works"
              className="px-4 py-2 rounded-xl text-sm font-semibold text-[#475569] hover:text-[#167C80] hover:bg-[#F1F5F9] transition"
            >
              How it Works
            </a>

            <a
              href="/#for-shops"
              className="px-4 py-2 rounded-xl text-sm font-semibold text-[#475569] hover:text-[#167C80] hover:bg-[#F1F5F9] transition"
            >
              For Shops
            </a>

            {user?.role === 'customer' && (
              <NavLink to="/my-reservations" className={navLinkClass}>
                My Reservations
              </NavLink>
            )}

            {user?.role === 'shop_owner' && (
              <NavLink to="/shop/dashboard" className={navLinkClass}>
                Shop Portal
              </NavLink>
            )}
          </nav>

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2.5 relative">
                {/* Notification Bell */}
                <button
                  type="button"
                  className="p-2 rounded-xl text-slate-500 hover:text-[#167C80] hover:bg-[#DFF2F0]/50 transition relative"
                  title="Notifications"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#F57C00]" />
                </button>

                {/* User Dropdown Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setProfileOpen((prev) => !prev)}
                    className="flex items-center gap-2.5 pl-2.5 pr-3 py-1.5 rounded-full bg-[#F8FAF9] hover:bg-[#DFF2F0]/40 border border-[#E2E8F0] transition"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#167C80] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      {user.role === 'shop_owner' ? (
                        <Store className="w-4 h-4" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </div>
                    <div className="text-left leading-none">
                      <div className="text-sm font-bold text-[#0F172A] max-w-[130px] truncate">
                        {user.role === 'shop_owner'
                          ? user.shop?.shop_name || user.full_name
                          : user.full_name}
                      </div>
                      <div className="text-[11px] font-medium text-[#64748B] mt-0.5">
                        {user.role === 'shop_owner' ? 'Shop Owner' : 'Customer'}
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Profile Dropdown Menu */}
                  {profileOpen && (
                    <div
                      className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-[#E2E8F0] shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                      onMouseLeave={() => setProfileOpen(false)}
                    >
                      <div className="px-4 py-2 border-b border-[#F1F5F9]">
                        <p className="text-xs text-slate-400">Signed in as</p>
                        <p className="text-sm font-bold text-[#0F172A] truncate">{user.full_name}</p>
                      </div>

                      {user.role === 'customer' ? (
                        <Link
                          to="/my-reservations"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#475569] hover:bg-[#DFF2F0] hover:text-[#167C80] transition"
                        >
                          <ClipboardList className="w-4 h-4" />
                          <span>My Reservations</span>
                        </Link>
                      ) : (
                        <>
                          <Link
                            to="/shop/dashboard"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#475569] hover:bg-[#DFF2F0] hover:text-[#167C80] transition"
                          >
                            <LayoutDashboard className="w-4 h-4" />
                            <span>Shop Dashboard</span>
                          </Link>
                          <Link
                            to="/shop/profile"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-sm text-[#475569] hover:bg-[#DFF2F0] hover:text-[#167C80] transition"
                          >
                            <Store className="w-4 h-4" />
                            <span>Business Profile</span>
                          </Link>
                        </>
                      )}

                      <div className="border-t border-[#F1F5F9] my-1" />

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-[#167C80] hover:bg-[#DFF2F0] transition"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-5 py-2.5 rounded-xl bg-[#167C80] hover:bg-[#105B60] text-white text-sm font-semibold transition shadow-xs active:scale-95"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="md:hidden p-2 rounded-xl text-[#475569] hover:bg-[#F1F5F9] transition"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#E2E8F0] bg-white px-4 py-4 space-y-2 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <Link
            to="/"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold ${
              isHome ? 'bg-[#DFF2F0] text-[#167C80]' : 'text-[#0F172A] hover:bg-[#F1F5F9]'
            }`}
          >
            <span>Home</span>
          </Link>

          <Link
            to="/marketplace"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[#0F172A] hover:bg-[#DFF2F0] hover:text-[#167C80]"
          >
            <ShoppingBag className="w-4 h-4 text-[#167C80]" />
            <span>Browse Food Offers</span>
          </Link>

          <a
            href="/#how-it-works"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[#0F172A] hover:bg-[#F1F5F9]"
          >
            <span>How it Works</span>
          </a>

          <a
            href="/#for-shops"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[#0F172A] hover:bg-[#F1F5F9]"
          >
            <span>For Shops</span>
          </a>

          {user?.role === 'customer' && (
            <Link
              to="/my-reservations"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[#0F172A] hover:bg-[#DFF2F0] hover:text-[#167C80]"
            >
              <ClipboardList className="w-4 h-4 text-[#167C80]" />
              <span>My Reservations</span>
            </Link>
          )}

          {user?.role === 'shop_owner' && (
            <Link
              to="/shop/dashboard"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[#0F172A] hover:bg-[#DFF2F0] hover:text-[#167C80]"
            >
              <LayoutDashboard className="w-4 h-4 text-[#167C80]" />
              <span>Shop Dashboard</span>
            </Link>
          )}

          <div className="pt-3 border-t border-[#E2E8F0]">
            {user ? (
              <div className="space-y-2.5">
                <div className="px-3 py-1.5 text-xs text-[#64748B]">
                  Signed in as <strong className="text-[#0F172A]">{user.full_name}</strong> (
                  {user.role === 'shop_owner' ? 'Shop Owner' : 'Customer'})
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 text-rose-600 text-sm font-semibold hover:bg-rose-100 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="text-center px-4 py-2.5 rounded-xl border border-[#167C80] text-[#167C80] text-sm font-semibold hover:bg-[#DFF2F0] transition"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="text-center px-4 py-2.5 rounded-xl bg-[#167C80] text-white text-sm font-semibold hover:bg-[#105B60] transition"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
