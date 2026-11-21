import { UserRole } from '../types';

export interface DemoAccount {
  role: UserRole;
  roleLabel: string;
  username: string;
  password: string;
  name: string;
  badgeColor: string;
  description: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'customer',
    roleLabel: 'Customer',
    username: import.meta.env.VITE_DEMO_CUSTOMER_USER || 'customer1',
    password: import.meta.env.VITE_DEMO_CUSTOMER_PASS || 'pass123',
    name: 'Sara Ahmed',
    badgeColor: 'bg-[#DFF2F0] text-[#167C80] border-[#167C80]/30',
    description: 'Browse surplus offers & reserve food',
  },
  {
    role: 'shop_owner',
    roleLabel: 'Shop Owner',
    username: import.meta.env.VITE_DEMO_SHOP_USER || 'bakery1',
    password: import.meta.env.VITE_DEMO_SHOP_PASS || 'pass123',
    name: 'City Star Bakery',
    badgeColor: 'bg-[#FFF3E0] text-[#F57C00] border-[#F57C00]/30',
    description: 'Post discounts & donate free surplus food',
  },
  {
    role: 'admin',
    roleLabel: 'Admin',
    username: import.meta.env.VITE_DEMO_ADMIN_USER || 'admin',
    password: import.meta.env.VITE_DEMO_ADMIN_PASS || 'Admin@ShareBite2026',
    name: 'Platform Administrator',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    description: 'Review beneficiaries & platform oversight',
  },
  {
    role: 'beneficiary',
    roleLabel: 'Beneficiary (Approved)',
    username: import.meta.env.VITE_DEMO_BENEFICIARY_USER || 'beneficiary1',
    password: import.meta.env.VITE_DEMO_BENEFICIARY_PASS || 'pass123',
    name: 'Dara Othman (Family)',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: 'Claim free food assistance packages',
  },
];
