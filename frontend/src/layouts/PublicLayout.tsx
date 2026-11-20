import React from 'react';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF9]">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
};

