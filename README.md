# 🧸 Toy Stall POS System

> **Production-Ready, Speed-Optimized Exhibition POS System** designed for high-traffic exhibitions (500–600 customers/day) with instant two-device real-time synchronization between Mobile (Inventory Staff) and Desktop (Billing Counter).

---

## ⚡ Key Highlights

- **Speed-First Design**: Optimized for rapid crowd turnaround with instant touch targets, zero lag, and no sluggish animations.
- **Two Devices, One Shared Brain**:
  - **Device 1 (Mobile Phone)**: Inventory Staff taps toys, builds cart optimistically, and generates sequential tokens (**T001**, **T002**, **T021**...) in **<50ms**.
  - **Device 2 (Desktop)**: Billing Counter instantly receives incoming tokens via **Supabase Realtime** with acoustic chime notification, accepts token, verifies payment (Cash / UPI / Split), and completes order.
- **Atomic Stock Deduction**: Inventory is automatically deducted in PostgreSQL *only* when an order reaches `COMPLETED` status.
- **Zero Token Duplication**: Backed by atomic row-level locks and PostgreSQL stored procedures (`create_token_order`). Cancelled orders also retain their token to ensure absolute sequence continuity.
- **Offline & Fallback Resilience**: Runs immediately in high-fidelity sync mode (via `BroadcastChannel` and `LocalStorage`) even before Supabase credentials are provided, and switches seamlessly to live Supabase once configured.
- **Built-in POS Sound Engine**: Native synthesized Web Audio API sounds for taps, token creation, real-time counter alert dings, and payment success (100% offline, zero network latency).
- **58mm / 80mm Thermal Receipt Ready**: Formatted printable token slips for standard thermal POS printers.

---

## 🏗️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components, CSS variables
- **State & Server Cache**: TanStack Query (React Query v5)
- **Backend & Database**: Supabase (PostgreSQL 15+, Supabase Realtime, Row Level Security)
- **Icons**: Lucide React
- **Sound Engine**: Web Audio API Synthesizer
- **PWA**: Installable Web App with standalone viewport controls

---

## 🔄 Strict Order State Machine

```
[ NEW ]
   │
   ├─► [ ACCEPTED ] (Cashier verifies physical token)
   │        │
   │        └─► [ PAID ] (Cash / UPI / Split payment recorded)
   │               │
   │               └─► [ COMPLETED ] (Inventory deducted & locked)
   │
   └─► [ VOID ] (Cancelled order, token preserved)
```

Transitions are strictly validated at both client and database level (via stored procedure `transition_order_status`). No skipping states. Completed and Voided orders are permanently immutable.

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Supabase (Optional for Live Deployment)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```
*(Note: You can also enter or test credentials directly from the in-app `/settings` screen at runtime!)*

### 3. Run the Supabase SQL Setup
Open the **SQL Editor** in your Supabase Dashboard:
1. Copy and execute all commands from `supabase/schema.sql` (Creates tables, indexes, RLS policies, atomic RPCs, and Realtime publications).
2. Copy and execute `supabase/seed.sql` to populate the 20 exhibition toys with stock and prices.

### 4. Start the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser:
- Open a browser window for **Mobile POS / Billing**: `/`
- Open a second window or tab for **Desktop Billing Counter**: `/tokens`
- Generate an order from the first window and watch it land instantly on the desktop queue with real-time audio chime!

---

## ⌨️ Fast Keyboard Shortcuts

| Key | Action | Context |
| :--- | :--- | :--- |
| **`F1`** | Navigate to POS / Billing | Anywhere |
| **`F2`** | Navigate to Live Tokens | Anywhere |
| **`F3`** | Generate Token | Cart has items |
| **`F4`** | Accept / Confirm Active Token | Billing Counter |
| **`/`** | Focus Product Search | POS Page |
| **`Esc`** | Dismiss Modals / Clear Search | Modals & Dialogs |
| **`Barcode`** | Hardware Scanner Integration | Rapid Keystroke Entry |

---

## 📊 Reports & Z-Report
Navigate to `/reports` for:
- Today's Total Gross Revenue
- Cash vs UPI Split Collections
- Average Order Value (AOV)
- Total Products Sold & Remaining Stock
- Top Selling Toys ranking bar chart
- 1-Click Day-End **Z-Report** thermal printable summary
- Full CSV export of orders and products

