import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  ClipboardList,
  Store,
  LogOut,
  Menu,
  X,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ShareBiteLogo } from '../components/ShareBiteLogo';

export const ShopLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { to: '/shop/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/shop/offers', label: 'My Offers', icon: Package },
    { to: '/shop/offers/new', label: 'Create Offer', icon: PlusCircle },
    { to: '/shop/reservations', label: 'Reservations', icon: ClipboardList },
    { to: '/shop/profile', label: 'Business Profile', icon: Store },
  ];

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
      isActive
        ? 'bg-[#DFF2F0] text-[#167C80]'
        : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
    }`;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white">
      <div className="p-5 border-b border-[#E2E8F0]">
        <Link to="/" className="flex items-center gap-2 mb-3">
          <ShareBiteLogo variant="horizontal" size="sm" showTagline={false} />
        </Link>
        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DFF2F0] text-[#167C80] uppercase tracking-wider mb-3">
          Partner Portal
        </span>

        {user?.shop && (
          <div className="p-3 rounded-xl bg-[#F8FAF9] border border-[#E2E8F0]">
            <div className="text-sm font-bold text-[#0F172A] truncate">{user.shop.shop_name}</div>
            <div className="flex items-center gap-1 text-xs text-[#64748B] mt-1">
              <MapPin className="w-3.5 h-3.5 text-[#F57C00] shrink-0" />
              <span className="truncate">{user.shop.address}</span>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/shop/offers'}
              className={linkClass}
              onClick={() => setDrawerOpen(false)}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        <div className="pt-4 mt-4 border-t border-[#F1F5F9]">
          <Link
            to="/marketplace"
            onClick={() => setDrawerOpen(false)}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition"
          >
            <ExternalLink className="w-4 h-4 shrink-0 text-[#167C80]" />
            <span>Public Marketplace</span>
          </Link>
        </div>
      </nav>

      <div className="p-4 border-t border-[#E2E8F0]">
        <div className="px-3 mb-3 text-xs text-[#64748B]">
          Signed in as <span className="font-semibold text-[#0F172A]">{user?.full_name}</span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-rose-200 bg-rose-50/70 text-rose-600 text-sm font-semibold hover:bg-rose-100 transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 bg-white border-r border-[#E2E8F0] shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex animate-in fade-in duration-200">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setDrawerOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] bg-white h-full z-10 shadow-2xl">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] px-4 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="p-2 -ml-2 rounded-xl text-[#475569] hover:bg-[#F1F5F9]"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#167C80] truncate max-w-[180px]">
              {user?.shop?.shop_name || 'ShareBite Partner'}
            </span>
          </div>
          <Link
            to="/shop/offers/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#167C80] text-white text-xs font-semibold hover:bg-[#105B60] transition shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Offer</span>
          </Link>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
};
