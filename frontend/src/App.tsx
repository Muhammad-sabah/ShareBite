import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { PublicLayout } from './layouts/PublicLayout';
import { ShopLayout } from './layouts/ShopLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { MarketplacePage } from './pages/customer/MarketplacePage';
import { OfferDetailPage } from './pages/customer/OfferDetailPage';
import { ReservationConfirmationPage } from './pages/customer/ReservationConfirmationPage';
import { MyReservationsPage } from './pages/customer/MyReservationsPage';

import { ShopDashboardPage } from './pages/shop/ShopDashboardPage';
import { CreateOfferPage } from './pages/shop/CreateOfferPage';
import { MyOffersPage } from './pages/shop/MyOffersPage';
import { ShopOfferDetailPage } from './pages/shop/ShopOfferDetailPage';
import { ShopReservationsPage } from './pages/shop/ShopReservationsPage';
import { BusinessProfilePage } from './pages/shop/BusinessProfilePage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public & Customer Routes */}
            <Route
              path="/"
              element={
                <PublicLayout>
                  <LandingPage />
                </PublicLayout>
              }
            />
            <Route
              path="/login"
              element={
                <PublicLayout>
                  <LoginPage />
                </PublicLayout>
              }
            />
            <Route
              path="/register"
              element={
                <PublicLayout>
                  <RegisterPage />
                </PublicLayout>
              }
            />
            <Route
              path="/marketplace"
              element={
                <PublicLayout>
                  <MarketplacePage />
                </PublicLayout>
              }
            />
            <Route
              path="/offers/:id"
              element={
                <PublicLayout>
                  <OfferDetailPage />
                </PublicLayout>
              }
            />

            {/* Customer Protected Routes */}
            <Route
              path="/my-reservations"
              element={
                <ProtectedRoute requiredRole="customer">
                  <PublicLayout>
                    <MyReservationsPage />
                  </PublicLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reservations/confirmed/:id"
              element={
                <ProtectedRoute requiredRole="customer">
                  <PublicLayout>
                    <ReservationConfirmationPage />
                  </PublicLayout>
                </ProtectedRoute>
              }
            />

            {/* Shop Owner Protected Routes */}
            <Route
              path="/shop/dashboard"
              element={
                <ProtectedRoute requiredRole="shop_owner">
                  <ShopLayout>
                    <ShopDashboardPage />
                  </ShopLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/shop/offers"
              element={
                <ProtectedRoute requiredRole="shop_owner">
                  <ShopLayout>
                    <MyOffersPage />
                  </ShopLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/shop/offers/new"
              element={
                <ProtectedRoute requiredRole="shop_owner">
                  <ShopLayout>
                    <CreateOfferPage />
                  </ShopLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/shop/offers/:id"
              element={
                <ProtectedRoute requiredRole="shop_owner">
                  <ShopLayout>
                    <ShopOfferDetailPage />
                  </ShopLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/shop/reservations"
              element={
                <ProtectedRoute requiredRole="shop_owner">
                  <ShopLayout>
                    <ShopReservationsPage />
                  </ShopLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/shop/profile"
              element={
                <ProtectedRoute requiredRole="shop_owner">
                  <ShopLayout>
                    <BusinessProfilePage />
                  </ShopLayout>
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};

export default App;

