import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { CartProvider } from '@/context/CartContext';
import { Toaster } from '@/components/ui/toaster';
import { MobileBottomNav } from '@/components/common/MobileBottomNav';

// Pages
import { POSPage } from '@/pages/POSPage';
import { CounterPage } from '@/pages/CounterPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { InventoryPage } from '@/pages/InventoryPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <AuthProvider>
          <CartProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Routes>
                {/* Device 1: Mobile Phone & Fast Billing */}
                <Route path="/" element={<POSPage />} />

                {/* Device 2: Desktop Billing Counter & Tokens */}
                <Route path="/tokens" element={<CounterPage />} />

                {/* Sales & Orders Audit */}
                <Route path="/orders" element={<OrdersPage />} />

                {/* Inventory Management & Restock */}
                <Route path="/inventory" element={<InventoryPage />} />

                {/* Sales Analytics & Reports */}
                <Route path="/reports" element={<ReportsPage />} />

                {/* Supabase & Terminal Settings */}
                <Route path="/settings" element={<SettingsPage />} />

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>

              {/* Mobile Bottom Navigation Bar (Visible on mobile screens) */}
              <MobileBottomNav />

              {/* Toast Notifications */}
              <Toaster />
            </BrowserRouter>
          </CartProvider>
        </AuthProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
}

export default App;

