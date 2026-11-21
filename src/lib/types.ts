export type UserRole = 'inventory_staff' | 'billing_staff' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  counterId?: string;
  avatar?: string;
}

export type OrderStatus = 'NEW' | 'ACCEPTED' | 'PAID' | 'COMPLETED' | 'VOID';

export type PaymentMethod = 'CASH' | 'UPI' | 'SPLIT' | 'CARD';

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number; // Selling price
  cost_price?: number; // Real purchase / buying cost
  stock: number;
  image: string;
  active: boolean;
  barcode?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OrderItem {
  id?: string;
  order_id?: string;
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  image?: string;
}

export interface PaymentRecord {
  id: string;
  order_id: string;
  payment_method: PaymentMethod;
  amount: number;
  cash_tendered?: number;
  change_returned?: number;
  cash_amount?: number;
  upi_amount?: number;
  transaction_reference?: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  staff_id?: string;
  staff_name?: string;
  created_at: string;
}

export interface Order {
  id: string;
  token_number: string; // e.g., 'T054' or '054'
  token_sequence: number;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  tax: number;
  total_amount: number;
  items_count: number;
  counter_id: string;
  created_by_staff_id?: string;
  created_by_staff_name?: string;
  accepted_by_staff_id?: string;
  completed_by_staff_id?: string;
  notes?: string;
  void_reason?: string;
  created_at: string;
  accepted_at?: string;
  paid_at?: string;
  completed_at?: string;
  updated_at: string;
  items?: OrderItem[];
  payments?: PaymentRecord[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface InventoryLog {
  id: string;
  product_id: string;
  product_name?: string;
  change_quantity: number;
  stock_before: number;
  stock_after: number;
  reason: 'ORDER_COMPLETED' | 'RESTOCK' | 'MANUAL_ADJUSTMENT' | 'INITIAL_STOCK' | 'DAMAGE_WASTE';
  order_id?: string;
  created_by?: string;
  created_at: string;
}

export interface DashboardMetrics {
  totalRevenue: number;
  cashRevenue: number;
  upiRevenue: number;
  totalOrders: number;
  pendingTokens: number;
  completedOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
  totalProductsSold: number;
  topSellingToys: {
    productId: string;
    productName: string;
    quantitySold: number;
    revenue: number;
    image: string;
  }[];
  categoryBreakdown: {
    category: string;
    itemsSold: number;
    revenue: number;
  }[];
  recentActivity: Order[];
}

export interface CreateOrderPayload {
  items: {
    product_id: string;
    product_name: string;
    unit_price: number;
    quantity: number;
    subtotal: number;
  }[];
  counter_id: string;
  notes?: string;
  staff_id?: string;
  staff_name?: string;
}

export interface TransitionOrderPayload {
  orderId: string;
  targetStatus: OrderStatus;
  staffId?: string;
  staffName?: string;
  notes?: string;
  payment?: {
    method: PaymentMethod;
    amount: number;
    cashTendered?: number;
    changeReturned?: number;
    cashAmount?: number;
    upiAmount?: number;
    transactionReference?: string;
  };
}

