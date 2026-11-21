import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { Navbar } from '@/components/common/Navbar';
import { Sidebar } from '@/components/common/Sidebar';
import { TokenCard } from '@/components/counter/TokenCard';
import { TokenSearchInput } from '@/components/counter/TokenSearchInput';
import { OrderDetailsView } from '@/components/counter/OrderDetailsView';
import { Order, OrderStatus } from '@/lib/types';
import { Clock, CheckCircle2, XCircle, Ticket, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

export const CounterPage: React.FC = () => {
  const { orders, transitionOrder, isTransitioning, isLoading } = useOrders();
  const { currentUser } = useAuth();
  const { counterId } = useSettings();

  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED'>('PENDING');
  const [tokenSearch, setTokenSearch] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Compute stats for KPI cards (matching Screenshot 2 top right)
  const pendingCount = useMemo(
    () => orders.filter((o) => o.status === 'NEW' || o.status === 'ACCEPTED').length,
    [orders]
  );
  const completedCount = useMemo(
    () => orders.filter((o) => o.status === 'COMPLETED').length,
    [orders]
  );
  const cancelledCount = useMemo(
    () => orders.filter((o) => o.status === 'VOID').length,
    [orders]
  );

  // Filter orders according to tab & search
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Tab filter
      let matchesTab = true;
      if (activeTab === 'PENDING') {
        matchesTab = o.status === 'NEW' || o.status === 'ACCEPTED';
      } else if (activeTab === 'APPROVED') {
        matchesTab = o.status === 'COMPLETED' || o.status === 'PAID';
      }

      // Search filter (by token number like "54" or "T054")
      let matchesSearch = true;
      if (tokenSearch.trim()) {
        const query = tokenSearch.toLowerCase().trim();
        const cleanToken = o.token_number.toLowerCase().replace('t', '');
        matchesSearch =
          o.token_number.toLowerCase().includes(query) ||
          cleanToken.includes(query) ||
          o.items?.some((i) => i.product_name.toLowerCase().includes(query)) ||
          false;
      }

      return matchesTab && matchesSearch;
    });
  }, [orders, activeTab, tokenSearch]);

  // Auto-select first order if none selected or if active order is not in list
  useEffect(() => {
    if (!selectedOrderId && filteredOrders.length > 0) {
      setSelectedOrderId(filteredOrders[0].id);
    } else if (selectedOrderId && !orders.some((o) => o.id === selectedOrderId)) {
      setSelectedOrderId(filteredOrders[0]?.id || null);
    }
  }, [filteredOrders, selectedOrderId, orders]);

  const selectedOrder = useMemo(() => {
    return orders.find((o) => o.id === selectedOrderId) || null;
  }, [orders, selectedOrderId]);

  // Order state transitions
  const handleAcceptToken = async (orderId: string) => {
    try {
      await transitionOrder({
        orderId,
        targetStatus: 'ACCEPTED',
        staffId: currentUser.id,
        staffName: currentUser.name,
      });
    } catch (e) {
      // Handled in hook
    }
  };

  const handleQuickAccept = async (orderId: string) => {
    try {
      await handleAcceptToken(orderId);
      setSelectedOrderId(orderId);
      setIsMobileModalOpen(true);
    } catch (e) {
      // Handled in hook
    }
  };

  const handlePaymentConfirm = async (orderId: string, paymentData: any) => {
    try {
      await transitionOrder({
        orderId,
        targetStatus: 'PAID',
        staffId: currentUser.id,
        staffName: currentUser.name,
        payment: paymentData,
      });
    } catch (e) {
      // Handled in hook
    }
  };

  const handleCompleteOrder = async (orderId: string) => {
    try {
      await transitionOrder({
        orderId,
        targetStatus: 'COMPLETED',
        staffId: currentUser.id,
        staffName: currentUser.name,
      });
    } catch (e) {
      // Handled in hook
    }
  };

  const handleVoidOrder = async (orderId: string) => {
    const reason = window.prompt('Reason for cancelling order:', 'Customer cancelled');
    if (reason === null) return;
    try {
      await transitionOrder({
        orderId,
        targetStatus: 'VOID',
        staffId: currentUser.id,
        staffName: currentUser.name,
        notes: reason || 'Cancelled by staff',
      });
    } catch (e) {
      // Handled in hook
    }
  };

  return (
    <div className="h-screen max-h-screen w-full flex flex-col bg-background text-foreground overflow-hidden select-none">
      {/* Top Navbar */}
      <Navbar />

      <div className="flex-1 flex overflow-hidden min-h-0 w-full">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Workspace */}
        <main className="flex-1 flex flex-col overflow-hidden min-h-0 min-w-0 p-2.5 sm:p-3.5 lg:p-4 gap-2.5">
          {/* Top Title & KPI Header (Matching Image 2) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-brand/15 text-brand flex items-center justify-center shrink-0">
                <Layers className="h-4.5 w-4.5 text-brand" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-foreground leading-none flex items-center gap-2">
                  Tokens (Live)
                </h2>
                <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">
                  Real-time checkout & payment verification
                </p>
              </div>
            </div>

            {/* Top 3 KPI Cards (Matching Image 2 exact badges) */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Pending KPI */}
              <div
                onClick={() => setActiveTab('PENDING')}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl border cursor-pointer transition-all',
                  activeTab === 'PENDING'
                    ? 'border-amber-500 bg-amber-500/15 shadow-sm ring-1 ring-amber-500/50'
                    : 'border-border bg-card hover:bg-muted/40'
                )}
              >
                <div className="h-7 w-7 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold shrink-0">
                  <Clock className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="text-sm font-black text-foreground leading-none">
                    {pendingCount}
                  </div>
                  <div className="text-[10px] font-bold text-amber-500/90 mt-0.5">
                    Pending
                  </div>
                </div>
              </div>

              {/* Completed KPI */}
              <div
                onClick={() => setActiveTab('APPROVED')}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl border cursor-pointer transition-all',
                  activeTab === 'APPROVED'
                    ? 'border-emerald-500 bg-emerald-500/15 shadow-sm ring-1 ring-emerald-500/50'
                    : 'border-border bg-card hover:bg-muted/40'
                )}
              >
                <div className="h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="text-sm font-black text-foreground leading-none">
                    {completedCount}
                  </div>
                  <div className="text-[10px] font-bold text-emerald-500/90 mt-0.5">
                    Completed
                  </div>
                </div>
              </div>

              {/* Cancelled KPI */}
              <div className="flex items-center gap-2.5 px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl border border-border bg-card">
                <div className="h-7 w-7 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center font-bold shrink-0">
                  <XCircle className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="text-sm font-black text-foreground leading-none">
                    {cancelledCount}
                  </div>
                  <div className="text-[10px] font-bold text-red-400/90 mt-0.5">
                    Cancelled
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Two-Column Responsive Workspace with strict viewport containment */}
          <div className="flex-1 flex flex-col lg:flex-row gap-3 overflow-hidden min-h-0 w-full">
            {/* Left Queue Panel (Fixed width on desktop, full on mobile) */}
            <div className="w-full lg:w-[420px] xl:w-[460px] shrink-0 flex flex-col h-full min-h-0 bg-card rounded-2xl border border-border p-3 overflow-hidden">
              {/* Filter Tabs (All / Pending / Approved) */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60 mb-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('ALL')}
                  className={cn(
                    'flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all',
                    activeTab === 'ALL'
                      ? 'bg-brand text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  All ({orders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('PENDING')}
                  className={cn(
                    'flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all',
                    activeTab === 'PENDING'
                      ? 'bg-brand text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Pending ({pendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('APPROVED')}
                  className={cn(
                    'flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all',
                    activeTab === 'APPROVED'
                      ? 'bg-brand text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Approved ({completedCount})
                </button>
              </div>

              {/* Fast Token Search Input */}
              <div className="mb-2 shrink-0">
                <TokenSearchInput
                  inputRef={searchInputRef}
                  value={tokenSearch}
                  onChange={setTokenSearch}
                  placeholder="Type Token (e.g. 54 or T054)..."
                />
              </div>

              {/* Incoming Tokens Queue List (Strictly scrollable inside) */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin min-h-0">
                {isLoading ? (
                  <div className="h-40 flex items-center justify-center text-muted-foreground text-xs font-bold">
                    Syncing live orders...
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="h-40 flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
                    <Ticket className="h-8 w-8 mb-2 opacity-40 text-brand" />
                    <p className="text-sm font-bold">No tokens in this queue</p>
                    <p className="text-xs mt-1">
                      {activeTab === 'PENDING'
                        ? 'Waiting for new orders from Phone staff...'
                        : 'No orders matched your filter.'}
                    </p>
                  </div>
                ) : (
                  filteredOrders.map((order) => (
                    <TokenCard
                      key={order.id}
                      order={order}
                      isSelected={selectedOrderId === order.id}
                      onSelect={(ord) => {
                        setSelectedOrderId(ord.id);
                        setIsMobileModalOpen(true);
                      }}
                      onQuickAccept={handleQuickAccept}
                      isProcessing={isTransitioning}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Right Order Details & Cashier Actions (Desktop: Side-by-side) */}
            <div className="hidden lg:flex flex-1 flex-col h-full min-h-0 overflow-hidden">
              <OrderDetailsView
                order={selectedOrder}
                onAccept={handleAcceptToken}
                onPaymentConfirm={handlePaymentConfirm}
                onComplete={handleCompleteOrder}
                onVoid={handleVoidOrder}
                isProcessing={isTransitioning}
              />
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Order Verification & Approval Slide-Up Drawer (Mobile only) */}
      {isMobileModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          {/* Backdrop click to dismiss */}
          <div
            className="absolute inset-0"
            onClick={() => setIsMobileModalOpen(false)}
          />

          {/* Drawer Container */}
          <div className="relative z-10 w-full max-h-[92vh] h-[88vh] bg-background rounded-t-3xl border-t border-border flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2.5 border-b border-border bg-card shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-lg text-foreground">
                  {selectedOrder.token_number}
                </span>
                <span className="text-xs text-muted-foreground font-semibold">
                  • Verify & Approve
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileModalOpen(false)}
                className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground font-bold active:scale-95 transition-all"
              >
                ✕
              </button>
            </div>

            {/* Order Details Body */}
            <div className="flex-1 min-h-0 overflow-hidden p-3 bg-background">
              <OrderDetailsView
                order={selectedOrder}
                onAccept={handleAcceptToken}
                onPaymentConfirm={handlePaymentConfirm}
                onComplete={(orderId) => {
                  handleCompleteOrder(orderId);
                  setIsMobileModalOpen(false);
                }}
                onVoid={(orderId) => {
                  handleVoidOrder(orderId);
                  setIsMobileModalOpen(false);
                }}
                isProcessing={isTransitioning}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

