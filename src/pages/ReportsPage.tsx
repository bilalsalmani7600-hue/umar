import React, { useMemo, useState } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { useProducts } from '@/hooks/useProducts';
import { Navbar } from '@/components/common/Navbar';
import { Sidebar } from '@/components/common/Sidebar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency, downloadCSV, formatClockTime } from '@/lib/utils';
import {
  PieChart,
  IndianRupee,
  ShoppingBag,
  TrendingUp,
  Download,
  Printer,
  XCircle,
  PackageCheck,
  CheckCircle2,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { orders } = useOrders();
  const { products } = useProducts();
  const [showZReport, setShowZReport] = useState(false);

  // Compute analytics from orders
  const metrics = useMemo(() => {
    const completedOrders = orders.filter((o) => o.status === 'COMPLETED');
    const cancelledOrders = orders.filter((o) => o.status === 'VOID');

    let totalRevenue = 0;
    let cashRevenue = 0;
    let upiRevenue = 0;
    let totalProductsSold = 0;

    const productSalesMap: Record<string, { name: string; quantity: number; revenue: number; image?: string }> = {};

    completedOrders.forEach((ord) => {
      totalRevenue += ord.total_amount;

      ord.payments?.forEach((pay) => {
        if (pay.payment_method === 'CASH') {
          cashRevenue += pay.amount;
        } else if (pay.payment_method === 'UPI') {
          upiRevenue += pay.amount;
        } else if (pay.payment_method === 'SPLIT') {
          cashRevenue += pay.cash_amount || 0;
          upiRevenue += pay.upi_amount || 0;
        }
      });

      ord.items?.forEach((item) => {
        totalProductsSold += item.quantity;
        if (!productSalesMap[item.product_id]) {
          productSalesMap[item.product_id] = {
            name: item.product_name,
            quantity: 0,
            revenue: 0,
            image: item.image,
          };
        }
        productSalesMap[item.product_id].quantity += item.quantity;
        productSalesMap[item.product_id].revenue += item.subtotal;
      });
    });

    const topSellingToys = Object.values(productSalesMap).sort(
      (a, b) => b.quantity - a.quantity
    );

    const averageOrderValue = completedOrders.length > 0 ? Math.round(totalRevenue / completedOrders.length) : 0;
    const remainingInventory = products.reduce((sum, p) => sum + p.stock, 0);

    return {
      totalRevenue,
      cashRevenue,
      upiRevenue,
      totalOrders: orders.length,
      completedOrdersCount: completedOrders.length,
      cancelledOrdersCount: cancelledOrders.length,
      totalProductsSold,
      averageOrderValue,
      remainingInventory,
      topSellingToys,
    };
  }, [orders, products]);

  const handleExportCSV = () => {
    const rows = metrics.topSellingToys.map((t, idx) => ({
      Rank: idx + 1,
      Toy_Name: t.name,
      Units_Sold: t.quantity,
      Revenue_Generated: t.revenue,
    }));
    downloadCSV('exhibition_toy_sales_report', rows);
  };

  return (
    <div className="h-screen max-h-screen w-full flex flex-col bg-background text-foreground overflow-hidden">
      <Navbar />

      <div className="flex-1 flex overflow-hidden min-h-0 w-full">
        <Sidebar />

        <main className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-6 gap-5 min-h-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
                <PieChart className="h-5 w-5 text-brand" /> Exhibition Sales & Analytics
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time financial performance and toy movement metrics
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowZReport(true)}
                variant="outline"
                className="h-10 px-4 rounded-xl font-bold flex items-center gap-1.5"
              >
                <Printer className="h-4 w-4" /> Day-End Z-Report
              </Button>
              <Button
                onClick={handleExportCSV}
                variant="default"
                className="h-10 px-4 rounded-xl font-bold flex items-center gap-1.5 shadow-md"
              >
                <Download className="h-4 w-4" /> Download Sales CSV
              </Button>
            </div>
          </div>

          {/* Metric KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Revenue */}
            <div className="p-4 rounded-2xl border border-border bg-card">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-black uppercase tracking-wider">Today's Revenue</span>
                <IndianRupee className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-foreground">
                {formatCurrency(metrics.totalRevenue)}
              </div>
              <div className="mt-2 flex items-center gap-2 text-[11px] font-bold text-muted-foreground">
                <span className="text-emerald-400">Cash: {formatCurrency(metrics.cashRevenue)}</span>
                <span>•</span>
                <span className="text-sky-400">UPI: {formatCurrency(metrics.upiRevenue)}</span>
              </div>
            </div>

            {/* Orders Completed */}
            <div className="p-4 rounded-2xl border border-border bg-card">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-black uppercase tracking-wider">Orders</span>
                <ShoppingBag className="h-4 w-4 text-brand" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-foreground">
                {metrics.completedOrdersCount}
              </div>
              <div className="mt-2 text-[11px] font-bold text-muted-foreground flex items-center gap-2">
                <span>Total Generated: {metrics.totalOrders}</span>
                <span>•</span>
                <span className="text-red-400">Void: {metrics.cancelledOrdersCount}</span>
              </div>
            </div>

            {/* Average Order Value */}
            <div className="p-4 rounded-2xl border border-border bg-card">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-black uppercase tracking-wider">Avg Order Value</span>
                <TrendingUp className="h-4 w-4 text-amber-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-foreground">
                {formatCurrency(metrics.averageOrderValue)}
              </div>
              <div className="mt-2 text-[11px] font-bold text-muted-foreground">
                Per checkout customer
              </div>
            </div>

            {/* Products Sold */}
            <div className="p-4 rounded-2xl border border-border bg-card">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-xs font-black uppercase tracking-wider">Products Sold</span>
                <PackageCheck className="h-4 w-4 text-purple-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-foreground">
                {metrics.totalProductsSold}
              </div>
              <div className="mt-2 text-[11px] font-bold text-muted-foreground">
                Remaining Stock: {metrics.remainingInventory} units
              </div>
            </div>
          </div>

          {/* Payment Split & Top Selling Toys */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Top Selling Toys (8 cols) */}
            <div className="lg:col-span-8 rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-extrabold text-sm sm:text-base text-foreground">
                  Top Selling Toys Ranking
                </h3>
                <span className="text-xs text-muted-foreground font-semibold">
                  By units sold
                </span>
              </div>

              {metrics.topSellingToys.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-xs font-bold">
                  No toy sales completed yet today.
                </div>
              ) : (
                <div className="space-y-3">
                  {metrics.topSellingToys.slice(0, 8).map((toy, index) => {
                    const percentage = Math.round(
                      (toy.quantity / (metrics.totalProductsSold || 1)) * 100
                    );
                    return (
                      <div key={toy.name} className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-lg bg-muted text-foreground flex items-center justify-center font-black text-xs shrink-0">
                          #{index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-xs font-extrabold mb-1">
                            <span className="truncate">{toy.name}</span>
                            <span>{toy.quantity} units ({formatCurrency(toy.revenue)})</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-brand rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Payment Mode Breakdown (4 cols) */}
            <div className="lg:col-span-4 rounded-2xl border border-border bg-card p-5 flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-foreground mb-3">
                  Payment Channels
                </h3>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl border border-border bg-muted/40">
                    <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
                      <span>Cash Collections</span>
                      <span className="text-emerald-400 font-black">
                        {metrics.totalRevenue > 0
                          ? Math.round((metrics.cashRevenue / metrics.totalRevenue) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="text-lg font-black text-foreground mt-1">
                      {formatCurrency(metrics.cashRevenue)}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border bg-muted/40">
                    <div className="flex justify-between items-center text-xs font-bold text-muted-foreground">
                      <span>UPI & QR Payments</span>
                      <span className="text-sky-400 font-black">
                        {metrics.totalRevenue > 0
                          ? Math.round((metrics.upiRevenue / metrics.totalRevenue) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="text-lg font-black text-foreground mt-1">
                      {formatCurrency(metrics.upiRevenue)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border text-[11px] text-muted-foreground">
                All metrics update in real-time as Desktop counter completes each order.
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Day-End Z-Report Printable Modal */}
      <Dialog open={showZReport} onOpenChange={setShowZReport}>
        <DialogContent className="max-w-sm p-5 font-mono text-xs bg-white text-black dark:bg-zinc-900 dark:text-zinc-100" onClose={() => setShowZReport(false)}>
          <DialogHeader>
            <DialogTitle className="text-center font-black">EXHIBITION DAY Z-REPORT</DialogTitle>
          </DialogHeader>

          <div className="border border-dashed border-zinc-400 p-4 rounded text-center my-2 space-y-2">
            <div className="text-base font-black">🧸 TOY STALL POS</div>
            <div className="text-[10px] text-zinc-500">Day-End Financial Audit Summary</div>
            <div className="border-b border-dashed border-zinc-300 py-1" />

            <div className="space-y-1.5 text-left text-xs">
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Time:</span>
                <span>{formatClockTime(new Date().toISOString())}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Orders:</span>
                <span className="font-bold">{metrics.completedOrdersCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Void Orders:</span>
                <span>{metrics.cancelledOrdersCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Toys Sold:</span>
                <span className="font-bold">{metrics.totalProductsSold}</span>
              </div>
              <div className="flex justify-between">
                <span>Average Order:</span>
                <span>{formatCurrency(metrics.averageOrderValue)}</span>
              </div>
              <div className="border-b border-dashed border-zinc-300 py-1" />
              <div className="flex justify-between font-bold">
                <span>Cash Revenue:</span>
                <span>{formatCurrency(metrics.cashRevenue)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>UPI Revenue:</span>
                <span>{formatCurrency(metrics.upiRevenue)}</span>
              </div>
              <div className="border-b-2 border-black dark:border-white py-1" />
              <div className="flex justify-between text-sm font-black pt-1">
                <span>TOTAL REVENUE:</span>
                <span>{formatCurrency(metrics.totalRevenue)}</span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <Button onClick={() => window.print()} variant="default" className="w-full font-bold">
              <Printer className="h-4 w-4 mr-1.5" /> Print Z-Report
            </Button>
            <Button onClick={() => setShowZReport(false)} variant="outline">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

