import React, { useState, useMemo } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { Navbar } from '@/components/common/Navbar';
import { Sidebar } from '@/components/common/Sidebar';
import { ThermalReceiptModal } from '@/components/common/ThermalReceiptModal';
import { Order, OrderStatus } from '@/lib/types';
import { formatCurrency, formatTimeAgo, formatClockTime, downloadCSV, cn } from '@/lib/utils';
import { FileText, Download, Printer, Search, CheckCircle2, Clock, XCircle, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const OrdersPage: React.FC = () => {
  const { orders, isLoading } = useOrders();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;
      const matchSearch =
        search.trim() === '' ||
        o.token_number.toLowerCase().includes(search.toLowerCase()) ||
        o.items?.some((i) => i.product_name.toLowerCase().includes(search.toLowerCase()));
      return matchStatus && matchSearch;
    });
  }, [orders, statusFilter, search]);

  const handleExportCSV = () => {
    const rows = orders.map((o) => ({
      Token: o.token_number,
      Sequence: o.token_sequence,
      Status: o.status,
      Items_Count: o.items_count,
      Total_Amount: o.total_amount,
      Counter: o.counter_id,
      Created_At: o.created_at,
      Completed_At: o.completed_at || '',
      Payment_Method: o.payments?.[0]?.payment_method || 'N/A',
    }));
    downloadCSV('exhibition_orders', rows);
  };

  return (
    <div className="h-screen max-h-screen w-full flex flex-col bg-background text-foreground overflow-hidden">
      <Navbar />

      <div className="flex-1 flex overflow-hidden min-h-0 w-full">
        <Sidebar />

        <main className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-6 gap-4 min-h-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand" /> Orders & Sales Ledger
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Complete audit trail of all exhibition tokens and transactions
              </p>
            </div>

            <Button
              onClick={handleExportCSV}
              variant="outline"
              className="h-10 px-4 rounded-xl font-bold flex items-center gap-2"
            >
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-3 rounded-2xl bg-card border border-border">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search token or item..."
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-input bg-background text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {['ALL', 'NEW', 'ACCEPTED', 'PAID', 'COMPLETED', 'VOID'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap',
                    statusFilter === st
                      ? 'bg-brand text-white shadow-sm'
                      : 'bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Orders Table */}
          <div className="rounded-2xl border border-border bg-card flex flex-col min-h-0 shadow-sm overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[65vh]">
              <table className="w-full text-left text-xs relative">
                <thead className="bg-muted/95 backdrop-blur-md border-b border-border font-black text-muted-foreground uppercase tracking-wider sticky top-0 z-10 shadow-xs">
                  <tr>
                    <th className="py-3 px-4">Token</th>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Items</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Counter</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground font-semibold">
                        No orders matching current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-black text-sm text-foreground">
                          {ord.token_number}
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground">
                          {formatClockTime(ord.created_at)}
                          <span className="text-[10px] block opacity-70">
                            {formatTimeAgo(ord.created_at)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-extrabold text-foreground">
                            {ord.items_count} items
                          </span>
                          <span className="text-[11px] text-muted-foreground block truncate max-w-xs">
                            {ord.items?.map((i) => `${i.quantity}x ${i.product_name}`).join(', ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-black text-sm text-foreground">
                          {formatCurrency(ord.total_amount)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold',
                              ord.status === 'COMPLETED' && 'bg-emerald-500/15 text-emerald-400',
                              ord.status === 'NEW' && 'bg-amber-500/15 text-amber-500',
                              ord.status === 'ACCEPTED' && 'bg-sky-500/15 text-sky-400',
                              ord.status === 'PAID' && 'bg-purple-500/15 text-purple-400',
                              ord.status === 'VOID' && 'bg-red-500/15 text-red-400'
                            )}
                          >
                            {ord.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground font-medium">
                          {ord.counter_id}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            onClick={() => setSelectedReceiptOrder(ord)}
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 font-bold flex items-center gap-1.5"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            <span>Slip</span>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      <ThermalReceiptModal
        order={selectedReceiptOrder}
        open={Boolean(selectedReceiptOrder)}
        onClose={() => setSelectedReceiptOrder(null)}
      />
    </div>
  );
};

