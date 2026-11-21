/**
 * Professional Styled Excel & Spreadsheet Export Engine
 * Generates rich-formatted Excel documents (.xls) with full CSS colors,
 * executive KPI summary cards, profit highlights, and clean typography
 * that Microsoft Excel, Google Sheets, Apple Numbers, and LibreOffice render natively.
 */

import { Product, Order } from './types';
import { formatCurrency, formatClockTime } from './utils';

// Helper to wrap content in full Excel-compatible HTML format
function buildExcelDocument(title: string, bodyContent: string): string {
  return `\uFEFF<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" 
      xmlns:x="urn:schemas-microsoft-com:office:excel" 
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>${title.slice(0, 31).replace(/[:\\\/\?\*\[\]]/g, '')}</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body {
      font-family: 'Segoe UI', Calibri, Arial, sans-serif;
      font-size: 10pt;
      color: #1e293b;
      margin: 0;
      padding: 16px;
    }
    .report-title {
      font-size: 15pt;
      font-weight: bold;
      color: #0f172a;
      margin-bottom: 2px;
    }
    .report-meta {
      font-size: 9pt;
      color: #64748b;
      margin-bottom: 14px;
    }
    .section-title {
      font-size: 11pt;
      font-weight: bold;
      color: #0f172a;
      padding-top: 10px;
      padding-bottom: 6px;
    }
    .kpi-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 18px 0;
    }
    .kpi-card {
      background-color: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 10px 14px;
      text-align: center;
      vertical-align: top;
    }
    .kpi-profit-card {
      background-color: #f0fdf4;
      border: 2px solid #22c55e;
      padding: 10px 14px;
      text-align: center;
      vertical-align: top;
    }
    .kpi-label {
      font-size: 8.5pt;
      font-weight: bold;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .kpi-val {
      font-size: 15pt;
      font-weight: bold;
      color: #0f172a;
    }
    .kpi-profit-val {
      font-size: 16pt;
      font-weight: bold;
      color: #16a34a;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 9.5pt;
    }
    .data-table th {
      background-color: #1e293b;
      color: #ffffff;
      font-weight: bold;
      padding: 9px 12px;
      border: 1px solid #334155;
      text-align: left;
    }
    .data-table th.num {
      text-align: right;
    }
    .data-table th.center {
      text-align: center;
    }
    .data-table td {
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    .data-table tr.even {
      background-color: #f8fafc;
    }
    .data-table tr.odd {
      background-color: #ffffff;
    }
    .num {
      text-align: right;
      font-family: 'Consolas', 'Courier New', monospace;
    }
    .center {
      text-align: center;
    }
    .bold {
      font-weight: bold;
    }
    .profit-positive {
      background-color: #dcfce7;
      color: #15803d;
      font-weight: bold;
      text-align: right;
    }
    .profit-negative {
      background-color: #fee2e2;
      color: #b91c1c;
      font-weight: bold;
      text-align: right;
    }
    .revenue-col {
      background-color: #f0fdf4;
      font-weight: bold;
      text-align: right;
    }
    .badge-in-stock {
      background-color: #dcfce7;
      color: #15803d;
      font-weight: bold;
      padding: 2px 8px;
      border-radius: 4px;
      display: inline-block;
      text-align: center;
    }
    .badge-low-stock {
      background-color: #fef9c3;
      color: #854d0e;
      font-weight: bold;
      padding: 2px 8px;
      border-radius: 4px;
      display: inline-block;
      text-align: center;
    }
    .badge-out-of-stock {
      background-color: #fee2e2;
      color: #991b1b;
      font-weight: bold;
      padding: 2px 8px;
      border-radius: 4px;
      display: inline-block;
      text-align: center;
    }
    .badge-cash {
      background-color: #dcfce7;
      color: #15803d;
      font-weight: bold;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .badge-upi {
      background-color: #e0f2fe;
      color: #0369a1;
      font-weight: bold;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .total-row td {
      background-color: #f1f5f9;
      border-top: 2px solid #0f172a;
      border-bottom: 3px double #0f172a;
      font-weight: bold;
      font-size: 10.5pt;
      color: #0f172a;
    }
  </style>
</head>
<body>
  ${bodyContent}
</body>
</html>`;
}

// Downloads the formatted HTML document as .xls Excel file
function triggerExcelDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const dateStr = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `${filename}_${dateStr}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 1. EXPORT FULL SALES & PROFIT REPORT (Full Color Table with Executive KPIs)
 */
export function exportStyledSalesReport(metrics: {
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
  profitMargin: number;
  cashRevenue: number;
  upiRevenue: number;
  completedOrdersCount: number;
  cancelledOrdersCount: number;
  totalProductsSold: number;
  topSellingToys: Array<{
    name: string;
    quantity: number;
    revenue: number;
    cost: number;
    profit: number;
  }>;
}, orders: Order[]) {
  const timestamp = new Date().toLocaleString();

  let body = `
    <!-- Clean Professional Title -->
    <div class="report-title">Exhibition Sales & Profit Audit Report</div>
    <div class="report-meta">Generated on ${timestamp} • Exhibition Sales Tracking</div>

    <!-- Executive Financial KPI Summary -->
    <div class="section-title">Executive Financial Summary</div>
    <table class="kpi-table">
      <tr>
        <td class="kpi-card" width="20%">
          <div class="kpi-label">Today's Revenue</div>
          <div class="kpi-val">${formatCurrency(metrics.totalRevenue)}</div>
          <div style="font-size:8pt; color:#64748b; margin-top:3px;">Gross Collections</div>
        </td>
        <td class="kpi-card" width="20%">
          <div class="kpi-label">Wholesale Cost (COGS)</div>
          <div class="kpi-val">${formatCurrency(metrics.totalCost)}</div>
          <div style="font-size:8pt; color:#64748b; margin-top:3px;">Buying Capital Sold</div>
        </td>
        <td class="kpi-profit-card" width="25%">
          <div class="kpi-label" style="color:#15803d;">Net Gross Profit</div>
          <div class="kpi-profit-val">+${formatCurrency(metrics.netProfit)}</div>
          <div style="font-size:8.5pt; font-weight:bold; color:#16a34a; margin-top:3px;">${metrics.profitMargin}% Profit Margin</div>
        </td>
        <td class="kpi-card" width="18%">
          <div class="kpi-label">Cash vs UPI</div>
          <div style="font-size:10pt; font-weight:bold; color:#15803d;">Cash: ${formatCurrency(metrics.cashRevenue)}</div>
          <div style="font-size:10pt; font-weight:bold; color:#0284c7; margin-top:2px;">UPI: ${formatCurrency(metrics.upiRevenue)}</div>
        </td>
        <td class="kpi-card" width="17%">
          <div class="kpi-label">Total Volume</div>
          <div class="kpi-val">${metrics.totalProductsSold}</div>
          <div style="font-size:8pt; color:#64748b; margin-top:3px;">${metrics.completedOrdersCount} Orders (${metrics.cancelledOrdersCount} Void)</div>
        </td>
      </tr>
    </table>
    <br/>

    <!-- Section 1: Top Toys Sales & Profit Ranking -->
    <div class="section-title">Toy Sales & Net Profit Performance Ranking</div>
    <table class="data-table">
      <thead>
        <tr>
          <th width="6%" class="center">Rank</th>
          <th width="32%">Toy Name</th>
          <th width="12%" class="num">Units Sold</th>
          <th width="12%" class="num">Wholesale Cost</th>
          <th width="13%" class="num">Gross Revenue</th>
          <th width="14%" class="num">Net Profit</th>
          <th width="11%" class="center">Margin %</th>
        </tr>
      </thead>
      <tbody>
  `;

  let totalQty = 0;
  let totalRev = 0;
  let totalWholesale = 0;
  let totalNet = 0;

  metrics.topSellingToys.forEach((toy, idx) => {
    totalQty += toy.quantity;
    totalRev += toy.revenue;
    totalWholesale += toy.cost;
    totalNet += toy.profit;

    const rowClass = idx % 2 === 0 ? 'even' : 'odd';
    const margin = toy.revenue > 0 ? Math.round((toy.profit / toy.revenue) * 100) : 0;
    const profitClass = toy.profit >= 0 ? 'profit-positive' : 'profit-negative';

    body += `
      <tr class="${rowClass}">
        <td class="center bold">#${idx + 1}</td>
        <td class="bold">${toy.name}</td>
        <td class="num bold">${toy.quantity} pcs</td>
        <td class="num">${formatCurrency(toy.cost)}</td>
        <td class="num revenue-col">${formatCurrency(toy.revenue)}</td>
        <td class="${profitClass}">+${formatCurrency(toy.profit)}</td>
        <td class="center bold">${margin}%</td>
      </tr>
    `;
  });

  const overallMargin = totalRev > 0 ? Math.round((totalNet / totalRev) * 100) : 0;

  body += `
      <tr class="total-row">
        <td colspan="2" class="bold">TOTAL SALES AUDIT</td>
        <td class="num bold">${totalQty} pcs</td>
        <td class="num bold">${formatCurrency(totalWholesale)}</td>
        <td class="num bold">${formatCurrency(totalRev)}</td>
        <td class="num bold" style="background-color:#bbf7d0; color:#15803d;">+${formatCurrency(totalNet)}</td>
        <td class="center bold" style="background-color:#bbf7d0; color:#15803d;">${overallMargin}%</td>
      </tr>
      </tbody>
    </table>
    <br/><br/>

    <!-- Section 2: Complete Orders Transaction Ledger -->
    <div class="section-title">Complete Exhibition Order Log</div>
    <table class="data-table">
      <thead>
        <tr>
          <th width="10%">Token</th>
          <th width="12%">Time</th>
          <th width="12%">Status</th>
          <th width="12%">Payment</th>
          <th width="38%">Purchased Toys</th>
          <th width="16%" class="num">Order Amount</th>
        </tr>
      </thead>
      <tbody>
  `;

  orders.forEach((ord, idx) => {
    const rowClass = idx % 2 === 0 ? 'even' : 'odd';
    const paymentMethod = ord.payments?.[0]?.payment_method || (ord.status === 'COMPLETED' ? 'CASH' : 'PENDING');
    const paymentBadge = paymentMethod === 'CASH'
      ? '<span class="badge-cash">💵 CASH</span>'
      : paymentMethod === 'UPI'
      ? '<span class="badge-upi">📱 UPI</span>'
      : `<span class="badge-cash">${paymentMethod}</span>`;

    const statusBadge = ord.status === 'COMPLETED'
      ? '<span class="badge-in-stock">✔ COMPLETED</span>'
      : ord.status === 'VOID'
      ? '<span class="badge-out-of-stock">✖ CANCELLED</span>'
      : '<span class="badge-low-stock">⏳ PENDING</span>';

    const itemsSummary = ord.items?.map(i => `${i.quantity}x ${i.product_name}`).join(', ') || 'N/A';

    body += `
      <tr class="${rowClass}">
        <td class="bold">${ord.token_number}</td>
        <td>${formatClockTime(ord.created_at)}</td>
        <td>${statusBadge}</td>
        <td>${paymentBadge}</td>
        <td>${itemsSummary}</td>
        <td class="num bold">${formatCurrency(ord.total_amount)}</td>
      </tr>
    `;
  });

  body += `
      </tbody>
    </table>
  `;

  const html = buildExcelDocument('Exhibition Sales Report', body);
  triggerExcelDownload('exhibition_sales_report', html);
}

/**
 * 2. EXPORT FULL INVENTORY VALUATION & MARGINS REPORT (Full Color Table)
 */
export function exportStyledInventoryReport(products: Product[]) {
  const timestamp = new Date().toLocaleString();

  const totalUnits = products.reduce((sum, p) => sum + p.stock, 0);
  const totalCost = products.reduce((sum, p) => sum + p.stock * (p.cost_price ?? Math.round(p.price * 0.6)), 0);
  const totalRetail = products.reduce((sum, p) => sum + p.stock * p.price, 0);
  const totalPotentialProfit = totalRetail - totalCost;
  const projectedMargin = totalRetail > 0 ? Math.round((totalPotentialProfit / totalRetail) * 100) : 0;

  const outOfStock = products.filter(p => p.stock <= 0).length;
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= 5).length;
  const healthyStock = products.length - outOfStock - lowStock;

  let body = `
    <!-- Clean Professional Title -->
    <div class="report-title">Toy Inventory Valuation & Margins Report</div>
    <div class="report-meta">Generated on ${timestamp} • Real Buying Cost vs Selling Retail Price</div>

    <!-- Executive Inventory Valuation Cards -->
    <div class="section-title">Inventory Capital & Valuation Summary</div>
    <table class="kpi-table">
      <tr>
        <td class="kpi-card" width="25%">
          <div class="kpi-label">Total Stock Capital Invested</div>
          <div class="kpi-val">${formatCurrency(totalCost)}</div>
          <div style="font-size:8pt; color:#64748b; margin-top:3px;">Money locked in inventory</div>
        </td>
        <td class="kpi-card" width="25%">
          <div class="kpi-label">Total Retail Selling Value</div>
          <div class="kpi-val">${formatCurrency(totalRetail)}</div>
          <div style="font-size:8pt; color:#64748b; margin-top:3px;">Revenue if all items sold</div>
        </td>
        <td class="kpi-profit-card" width="25%">
          <div class="kpi-label" style="color:#15803d;">Projected Gross Profit</div>
          <div class="kpi-profit-val">+${formatCurrency(totalPotentialProfit)}</div>
          <div style="font-size:8.5pt; font-weight:bold; color:#16a34a; margin-top:3px;">${projectedMargin}% Projected Profit Margin</div>
        </td>
        <td class="kpi-card" width="25%">
          <div class="kpi-label">Stock Status Distribution</div>
          <div style="font-size:9.5pt; font-weight:bold; color:#15803d;">Healthy: ${healthyStock} items</div>
          <div style="font-size:9.5pt; font-weight:bold; color:#d97706;">Low (≤5): ${lowStock} items</div>
          <div style="font-size:9.5pt; font-weight:bold; color:#dc2626;">Out of Stock: ${outOfStock} items</div>
        </td>
      </tr>
    </table>
    <br/>

    <!-- Inventory Data Table -->
    <div class="section-title">Complete Toy Catalog, Margins & Stock Levels</div>
    <table class="data-table">
      <thead>
        <tr>
          <th width="5%" class="center">#</th>
          <th width="24%">Toy Name</th>
          <th width="15%">Category</th>
          <th width="9%" class="num">Real Cost</th>
          <th width="9%" class="num">Selling Price</th>
          <th width="9%" class="num">Profit/Unit</th>
          <th width="8%" class="center">Margin</th>
          <th width="9%" class="num">Stock</th>
          <th width="12%" class="center">Status</th>
        </tr>
      </thead>
      <tbody>
  `;

  products.forEach((p, idx) => {
    const rowClass = idx % 2 === 0 ? 'even' : 'odd';
    const cost = p.cost_price ?? Math.round(p.price * 0.6);
    const profit = p.price - cost;
    const margin = p.price > 0 ? Math.round((profit / p.price) * 100) : 0;
    const isProfit = profit >= 0;

    const statusBadge = p.stock <= 0
      ? '<span class="badge-out-of-stock">OUT OF STOCK (0)</span>'
      : p.stock <= 5
      ? `<span class="badge-low-stock">LOW STOCK (${p.stock})</span>`
      : `<span class="badge-in-stock">IN STOCK (${p.stock})</span>`;

    const profitClass = isProfit ? 'profit-positive' : 'profit-negative';

    body += `
      <tr class="${rowClass}">
        <td class="center bold">${idx + 1}</td>
        <td class="bold">${p.name}</td>
        <td>${p.category}</td>
        <td class="num">${formatCurrency(cost)}</td>
        <td class="num bold">${formatCurrency(p.price)}</td>
        <td class="${profitClass}">+${formatCurrency(profit)}</td>
        <td class="center bold">${margin}%</td>
        <td class="num bold">${p.stock}</td>
        <td class="center">${statusBadge}</td>
      </tr>
    `;
  });

  body += `
      <tr class="total-row">
        <td colspan="3" class="bold">TOTAL PORTFOLIO (${products.length} TOYS)</td>
        <td colspan="2" class="num bold">Capital: ${formatCurrency(totalCost)}</td>
        <td class="num bold" style="background-color:#bbf7d0; color:#15803d;">+${formatCurrency(totalPotentialProfit)}</td>
        <td class="center bold" style="background-color:#bbf7d0; color:#15803d;">${projectedMargin}%</td>
        <td class="num bold">${totalUnits} pcs</td>
        <td class="center bold">${healthyStock} Active</td>
      </tr>
      </tbody>
    </table>
  `;

  const html = buildExcelDocument('Toy Inventory Valuation', body);
  triggerExcelDownload('toy_inventory_valuation_report', html);
}

/**
 * 3. EXPORT COMPLETE ORDERS & SALES LEDGER (Full Color Table)
 */
export function exportStyledOrdersReport(orders: Order[]) {
  const timestamp = new Date().toLocaleString();
  const completedOrders = orders.filter(o => o.status === 'COMPLETED');
  const voidOrders = orders.filter(o => o.status === 'VOID');
  const pendingOrders = orders.filter(o => o.status === 'NEW' || o.status === 'ACCEPTED');

  const totalRev = completedOrders.reduce((sum, o) => sum + o.total_amount, 0);
  const totalItems = completedOrders.reduce((sum, o) => sum + o.items_count, 0);

  let cashRev = 0;
  let upiRev = 0;
  completedOrders.forEach(o => {
    o.payments?.forEach(p => {
      if (p.payment_method === 'CASH') cashRev += p.amount;
      else if (p.payment_method === 'UPI') upiRev += p.amount;
      else if (p.payment_method === 'SPLIT') {
        cashRev += p.cash_amount || 0;
        upiRev += p.upi_amount || 0;
      }
    });
  });

  let body = `
    <!-- Clean Professional Title -->
    <div class="report-title">Complete Orders & Sales Audit Ledger</div>
    <div class="report-meta">Generated on ${timestamp} • Full Order History & Verification Log</div>

    <!-- Executive Orders Summary Cards -->
    <table class="kpi-table">
      <tr>
        <td class="kpi-card" width="25%">
          <div class="kpi-label">Completed Sales Revenue</div>
          <div class="kpi-val" style="color:#15803d;">${formatCurrency(totalRev)}</div>
          <div style="font-size:8pt; color:#64748b; margin-top:3px;">${completedOrders.length} completed orders</div>
        </td>
        <td class="kpi-card" width="25%">
          <div class="kpi-label">Payment Channels</div>
          <div style="font-size:9.5pt; font-weight:bold; color:#15803d;">Cash: ${formatCurrency(cashRev)}</div>
          <div style="font-size:9.5pt; font-weight:bold; color:#0284c7; margin-top:2px;">UPI: ${formatCurrency(upiRev)}</div>
        </td>
        <td class="kpi-card" width="25%">
          <div class="kpi-label">Volume & Order Breakdown</div>
          <div class="kpi-val">${totalItems} Toys Sold</div>
          <div style="font-size:8pt; color:#64748b; margin-top:3px;">Avg: ${formatCurrency(completedOrders.length > 0 ? Math.round(totalRev / completedOrders.length) : 0)} / order</div>
        </td>
        <td class="kpi-card" width="25%">
          <div class="kpi-label">Audit Status Log</div>
          <div style="font-size:9.5pt; font-weight:bold; color:#15803d;">${completedOrders.length} Completed</div>
          <div style="font-size:9.5pt; font-weight:bold; color:#d97706;">${pendingOrders.length} Pending</div>
          <div style="font-size:9.5pt; font-weight:bold; color:#dc2626;">${voidOrders.length} Void / Cancelled</div>
        </td>
      </tr>
    </table>
    <br/>

    <!-- Orders Data Table -->
    <div class="section-title">Complete Exhibition Transaction Log</div>
    <table class="data-table">
      <thead>
        <tr>
          <th width="10%">Token #</th>
          <th width="12%">Date & Time</th>
          <th width="12%">Order Status</th>
          <th width="12%">Payment Mode</th>
          <th width="38%">Purchased Toy Breakdown</th>
          <th width="16%" class="num">Grand Total</th>
        </tr>
      </thead>
      <tbody>
  `;

  orders.forEach((ord, idx) => {
    const rowClass = idx % 2 === 0 ? 'even' : 'odd';
    const paymentMethod = ord.payments?.[0]?.payment_method || (ord.status === 'COMPLETED' ? 'CASH' : 'PENDING');
    const paymentBadge = paymentMethod === 'CASH'
      ? '<span class="badge-cash">💵 CASH</span>'
      : paymentMethod === 'UPI'
      ? '<span class="badge-upi">📱 UPI</span>'
      : `<span class="badge-cash">${paymentMethod}</span>`;

    const statusBadge = ord.status === 'COMPLETED'
      ? '<span class="badge-in-stock">✔ COMPLETED</span>'
      : ord.status === 'VOID'
      ? '<span class="badge-out-of-stock">✖ CANCELLED</span>'
      : '<span class="badge-low-stock">⏳ PENDING</span>';

    const itemsSummary = ord.items?.map(i => `${i.quantity}x ${i.product_name} (${formatCurrency(i.subtotal)})`).join(', ') || 'N/A';

    body += `
      <tr class="${rowClass}">
        <td class="bold">${ord.token_number}</td>
        <td>${formatClockTime(ord.created_at)}</td>
        <td>${statusBadge}</td>
        <td>${paymentBadge}</td>
        <td>${itemsSummary}</td>
        <td class="num bold">${formatCurrency(ord.total_amount)}</td>
      </tr>
    `;
  });

  body += `
      <tr class="total-row">
        <td colspan="4" class="bold">TOTAL COMPLETED REVENUE AUDIT</td>
        <td class="bold">${totalItems} Items Sold (${completedOrders.length} Orders)</td>
        <td class="num bold" style="background-color:#bbf7d0; color:#15803d;">${formatCurrency(totalRev)}</td>
      </tr>
      </tbody>
    </table>
  `;

  const html = buildExcelDocument('Exhibition Orders Ledger', body);
  triggerExcelDownload('exhibition_orders_ledger', html);
}
