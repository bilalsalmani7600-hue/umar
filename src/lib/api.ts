import { getSupabaseClient } from './supabase';
import {
  Product,
  Order,
  InventoryLog,
  DashboardMetrics,
  CreateOrderPayload,
  TransitionOrderPayload,
  OrderStatus,
} from './types';
import { INITIAL_PRODUCTS, INITIAL_ORDERS } from './mockData';
import {
  withTimeout,
  addToSyncQueue,
  getPendingQueue,
} from './offlineSync';

// BroadcastChannel for cross-tab synchronization during demo/offline operation
const syncChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('pos_realtime_sync')
    : null;

// LocalStorage persistence helpers for fallback mode
const STORAGE_KEYS = {
  PRODUCTS: 'pos_local_products_v4',
  ORDERS: 'pos_local_orders_v4',
  TOKEN_SEQ: 'pos_local_token_sequence_v4',
  LOGS: 'pos_local_inventory_logs_v4',
};

function getLocalProducts(): Product[] {
  const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    return INITIAL_PRODUCTS;
  }
  try {
    const parsed: Product[] = JSON.parse(data);
    // Sanitize: filter out any inactive products or test fixtures (like bilal or 9999 stock)
    const valid = parsed.filter((p) => p.name !== 'bilal' && p.active !== false && p.stock < 1000);
    if (valid.length < 25) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }
    return valid;
  } catch (e) {
    return INITIAL_PRODUCTS;
  }
}

function saveLocalProducts(products: Product[]) {
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  syncChannel?.postMessage({ type: 'PRODUCTS_UPDATED', payload: products });
}

function getLocalOrders(): Order[] {
  const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
    return INITIAL_ORDERS;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return INITIAL_ORDERS;
  }
}

function saveLocalOrders(orders: Order[]) {
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  syncChannel?.postMessage({ type: 'ORDERS_UPDATED', payload: orders });
}

function getNextLocalTokenSequence(): number {
  const current = parseInt(localStorage.getItem(STORAGE_KEYS.TOKEN_SEQ) || '54', 10);
  const next = current + 1;
  localStorage.setItem(STORAGE_KEYS.TOKEN_SEQ, next.toString());
  return next;
}

// Singleton Realtime Subscription Manager
let activeSupabaseChannel: any = null;
const newOrderListeners = new Set<(order: Order) => void>();
const orderUpdatedListeners = new Set<(order: Order) => void>();
const productsUpdatedListeners = new Set<() => void>();

function initRealtimeChannel() {
  const supabase = getSupabaseClient();
  if (!supabase || activeSupabaseChannel) return;

  try {
    activeSupabaseChannel = supabase
      .channel('pos_realtime_singleton')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new as Order;
          newOrderListeners.forEach((fn) => fn(newOrder));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const updatedOrder = payload.new as Order;
          orderUpdatedListeners.forEach((fn) => fn(updatedOrder));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          productsUpdatedListeners.forEach((fn) => fn());
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Connected
        }
      });
  } catch (err) {
    console.warn('Realtime subscription error:', err);
  }
}

// Helper to ensure valid UUID strings reach Postgres UUID columns
function isValidUUID(val?: string | null): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

function sanitizeUUID(val?: string | null): string | null {
  return isValidUUID(val) ? (val as string) : null;
}

export const api = {
  // PRODUCTS
  async getProducts(): Promise<Product[]> {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
      return getLocalProducts().filter((p) => p.active !== false);
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const data = await withTimeout(
          supabase
            .from('products')
            .select('*')
            .eq('active', true)
            .order('name', { ascending: true })
            .then((res) => {
              if (res.error) throw res.error;
              return res.data;
            }),
          2500
        );

        if (data && data.length > 0) {
          saveLocalProducts(data);
          return data;
        }
      } catch (err) {
        console.warn('Supabase fetch products error, using local fallback:', err);
      }
    }
    return getLocalProducts().filter((p) => p.active !== false);
  },

  async createProduct(product: Omit<Product, 'id'>): Promise<Product> {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const supabase = getSupabaseClient();
    if (isOnline && supabase) {
      try {
        const data = await withTimeout(
          supabase
            .from('products')
            .insert([product])
            .select()
            .single()
            .then((res) => {
              if (res.error) {
                if (res.error.message?.includes('cost_price')) {
                  const { cost_price, ...rest } = product as any;
                  return supabase.from('products').insert([rest]).select().single().then((r2) => {
                    if (r2.error) throw r2.error;
                    return { ...r2.data, cost_price };
                  });
                }
                throw res.error;
              }
              return res.data;
            }),
          3000
        );

        if (data) {
          const products = getLocalProducts();
          saveLocalProducts([...products, data]);
          return data;
        }
      } catch (err) {
        console.warn('Supabase createProduct failed, saving locally:', err);
      }
    }

    const products = getLocalProducts();
    const newProduct: Product = {
      ...product,
      id: `p-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    saveLocalProducts([...products, newProduct]);
    addToSyncQueue({
      type: 'CREATE_PRODUCT',
      payload: newProduct,
    });
    return newProduct;
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const supabase = getSupabaseClient();
    if (isOnline && supabase) {
      try {
        const data = await withTimeout(
          supabase
            .from('products')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single()
            .then((res) => {
              if (res.error) {
                if (res.error.message?.includes('cost_price')) {
                  const { cost_price, ...rest } = updates as any;
                  return supabase
                    .from('products')
                    .update({ ...rest, updated_at: new Date().toISOString() })
                    .eq('id', id)
                    .select()
                    .single()
                    .then((r2) => {
                      if (r2.error) throw r2.error;
                      return { ...r2.data, cost_price };
                    });
                }
                throw res.error;
              }
              return res.data;
            }),
          3000
        );

        if (data) {
          const products = getLocalProducts();
          const newProducts = products.map((p) => (p.id === id ? { ...p, ...data } : p));
          saveLocalProducts(newProducts);
          return data;
        }
      } catch (err) {
        console.warn('Supabase updateProduct failed, saving locally:', err);
      }
    }

    const products = getLocalProducts();
    let updated: Product | null = null;
    const newProducts = products.map((p) => {
      if (p.id === id) {
        updated = { ...p, ...updates, updated_at: new Date().toISOString() };
        return updated;
      }
      return p;
    });
    saveLocalProducts(newProducts);
    addToSyncQueue({
      type: 'UPDATE_PRODUCT',
      payload: { id, updates },
    });
    return updated || products[0];
  },

  async deleteProduct(id: string): Promise<boolean> {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const supabase = getSupabaseClient();
    if (isOnline && supabase) {
      try {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.warn('Supabase deleteProduct failed:', err);
      }
    }

    const products = getLocalProducts();
    saveLocalProducts(products.filter((p) => p.id !== id));
    return true;
  },

  async adjustStock(productId: string, quantityDelta: number, reason: string): Promise<void> {
    // 1. Immediately apply local inventory update for instantaneous 0ms UI feedback
    const products = getLocalProducts();
    const newProducts = products.map((p) => {
      if (p.id === productId) {
        const stockAfter = Math.max(0, p.stock + quantityDelta);
        return { ...p, stock: stockAfter };
      }
      return p;
    });
    saveLocalProducts(newProducts);

    // 2. Try Supabase if online
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const supabase = getSupabaseClient();
    if (isOnline && supabase) {
      try {
        const current = await withTimeout(
          supabase
            .from('products')
            .select('stock')
            .eq('id', productId)
            .single()
            .then((res) => res.data),
          2500
        );

        if (current) {
          const newStock = Math.max(0, current.stock + quantityDelta);
          await withTimeout(
            supabase
              .from('products')
              .update({ stock: newStock, updated_at: new Date().toISOString() })
              .eq('id', productId),
            2500
          );

          await withTimeout(
            supabase.from('inventory_logs').insert([
              {
                product_id: productId,
                change_quantity: quantityDelta,
                stock_before: current.stock,
                stock_after: newStock,
                reason: 'MANUAL_ADJUSTMENT',
              },
            ]),
            2500
          );
          return;
        }
      } catch (e) {
        console.warn('Supabase adjustStock error, queued for sync:', e);
      }
    }

    // Queue for sync when online
    addToSyncQueue({
      type: 'ADJUST_STOCK',
      payload: { productId, delta: quantityDelta, reason },
    });
  },

  // ORDERS & TOKENS
  async getOrders(): Promise<Order[]> {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
      return getLocalOrders();
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const data = await withTimeout(
          supabase
            .from('orders')
            .select(`
              *,
              items:order_items(*),
              payments(*)
            `)
            .order('created_at', { ascending: false })
            .then((res) => {
              if (res.error) throw res.error;
              return res.data;
            }),
          3000
        );

        if (data) {
          // Preserve any pending offline orders that have not synced yet
          const localOrders = getLocalOrders();
          const pending = getPendingQueue();
          const pendingOrderIds = new Set(
            pending.filter((q) => q.type === 'CREATE_ORDER').map((q) => q.payload?.id)
          );
          const unsynced = localOrders.filter((o) => pendingOrderIds.has(o.id));
          const merged = [...unsynced, ...(data as Order[]).filter((d: Order) => !pendingOrderIds.has(d.id))];
          saveLocalOrders(merged);
          return merged;
        }
      } catch (err) {
        console.warn('Supabase getOrders failed, using local orders:', err);
      }
    }
    return getLocalOrders();
  },

  async createTokenOrder(payload: CreateOrderPayload): Promise<Order> {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const supabase = getSupabaseClient();

    if (isOnline && supabase) {
      try {
        // Sanitize product UUIDs and staff UUIDs so Postgres 22P02 invalid UUID error never occurs
        const sanitizedItems = payload.items.map((i) => {
          let pid = sanitizeUUID(i.product_id);
          if (!pid) {
            // Find by product name in official catalog
            const matched = INITIAL_PRODUCTS.find(
              (p) => p.name.toLowerCase() === (i.product_name || '').toLowerCase()
            );
            pid = matched?.id || 'c0000001-0000-0000-0000-000000000001';
          }
          return {
            ...i,
            product_id: pid,
          };
        });

        // Call the atomic stored procedure create_token_order with 3.5s timeout
        const data = await withTimeout(
          supabase.rpc('create_token_order', {
            p_items: sanitizedItems,
            p_counter_id: payload.counter_id || 'Mobile 1',
            p_notes: payload.notes || null,
            p_staff_id: sanitizeUUID(payload.staff_id),
          }).then((res) => {
            if (res.error) throw res.error;
            return res.data;
          }),
          3500
        );

        // Fetch full order with items
        if (data?.order_id) {
          const fullOrder = await withTimeout(
            supabase
              .from('orders')
              .select(`
                *,
                items:order_items(*),
                payments(*)
              `)
              .eq('id', data.order_id)
              .single()
              .then((res) => {
                if (res.error) throw res.error;
                return res.data;
              }),
            3000
          );

          if (fullOrder) {
            syncChannel?.postMessage({ type: 'NEW_ORDER_CREATED', payload: fullOrder });
            return fullOrder;
          }
        }
      } catch (err) {
        console.warn('Supabase createTokenOrder failed, attempting offline local fallback:', err);
      }
    }

    // Local atomic token creation (Offline / Weak network mode)
    const nextSeq = getNextLocalTokenSequence();
    const tokenNumber = `T${nextSeq.toString().padStart(3, '0')}`;
    const totalAmount = payload.items.reduce((sum, item) => sum + item.subtotal, 0);
    const itemsCount = payload.items.reduce((sum, item) => sum + item.quantity, 0);

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      token_number: tokenNumber,
      token_sequence: nextSeq,
      status: 'NEW',
      subtotal: totalAmount,
      discount: 0,
      tax: 0,
      total_amount: totalAmount,
      items_count: itemsCount,
      counter_id: payload.counter_id,
      created_by_staff_id: payload.staff_id,
      created_by_staff_name: payload.staff_name,
      notes: payload.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: payload.items.map((i) => ({
        id: `item-${Date.now()}-${Math.random()}`,
        product_id: i.product_id,
        product_name: i.product_name,
        unit_price: i.unit_price,
        quantity: i.quantity,
        subtotal: i.subtotal,
      })),
    };

    const currentOrders = getLocalOrders();
    const updatedOrders = [newOrder, ...currentOrders];
    saveLocalOrders(updatedOrders);

    // Queue for sync when online
    addToSyncQueue({
      type: 'CREATE_ORDER',
      payload: newOrder,
    });

    // Notify other tabs
    syncChannel?.postMessage({ type: 'NEW_ORDER_CREATED', payload: newOrder });

    return newOrder;
  },

  async transitionOrderStatus(payload: TransitionOrderPayload): Promise<Order> {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const supabase = getSupabaseClient();

    if (isOnline && supabase) {
      try {
        // Fetch current order status to handle flexible transitions seamlessly
        const currentOrder = await withTimeout(
          supabase
            .from('orders')
            .select('status, total_amount')
            .eq('id', payload.orderId)
            .single()
            .then((res) => res.data),
          2500
        );

        const currentStatus = currentOrder?.status || 'NEW';
        const total = currentOrder?.total_amount || 0;
        const paymentData = payload.payment || {
          method: 'CASH',
          amount: total,
          cashAmount: total,
          cashTendered: total,
          changeReturned: 0,
        };

        if (payload.targetStatus === 'COMPLETED') {
          // If NEW, step to ACCEPTED
          if (currentStatus === 'NEW') {
            await withTimeout(
              supabase.rpc('transition_order_status', {
                p_order_id: payload.orderId,
                p_target_status: 'ACCEPTED',
                p_staff_id: sanitizeUUID(payload.staffId),
                p_notes: payload.notes || null,
              }),
              3000
            );
          }
          // If was NEW or ACCEPTED, step to PAID with payment details
          if (currentStatus === 'NEW' || currentStatus === 'ACCEPTED') {
            await withTimeout(
              supabase.rpc('transition_order_status', {
                p_order_id: payload.orderId,
                p_target_status: 'PAID',
                p_staff_id: sanitizeUUID(payload.staffId),
                p_payment_data: paymentData,
              }),
              3000
            );
          }
          // Now execute COMPLETED (which triggers atomic inventory deduction in PostgreSQL)
          const compRes: any = await withTimeout(
            supabase.rpc('transition_order_status', {
              p_order_id: payload.orderId,
              p_target_status: 'COMPLETED',
              p_staff_id: sanitizeUUID(payload.staffId),
              p_notes: payload.notes || null,
            }),
            3000
          );
          if (compRes?.error) throw compRes.error;
        } else if (payload.targetStatus === 'PAID') {
          if (currentStatus === 'NEW') {
            await withTimeout(
              supabase.rpc('transition_order_status', {
                p_order_id: payload.orderId,
                p_target_status: 'ACCEPTED',
                p_staff_id: sanitizeUUID(payload.staffId),
              }),
              3000
            );
          }
          const paidRes: any = await withTimeout(
            supabase.rpc('transition_order_status', {
              p_order_id: payload.orderId,
              p_target_status: 'PAID',
              p_staff_id: sanitizeUUID(payload.staffId),
              p_payment_data: paymentData,
            }),
            3000
          );
          if (paidRes?.error) throw paidRes.error;
        } else {
          // Normal transition (e.g. ACCEPTED or VOID)
          const transRes: any = await withTimeout(
            supabase.rpc('transition_order_status', {
              p_order_id: payload.orderId,
              p_target_status: payload.targetStatus,
              p_staff_id: sanitizeUUID(payload.staffId),
              p_notes: payload.notes || null,
              p_payment_data: payload.payment || null,
            }),
            3000
          );
          if (transRes?.error) throw transRes.error;
        }

        // Fetch refreshed order
        const updated = await withTimeout(
          supabase
            .from('orders')
            .select(`
              *,
              items:order_items(*),
              payments(*)
            `)
            .eq('id', payload.orderId)
            .single()
            .then((res) => res.data),
          3000
        );

        if (updated) {
          syncChannel?.postMessage({ type: 'ORDER_UPDATED', payload: updated });
          return updated;
        }
      } catch (err) {
        console.warn('Supabase transition_order_status error, falling back locally:', err);
      }
    }

    // Local transition
    const orders = getLocalOrders();
    let updatedOrder: Order | null = null;
    const nowIso = new Date().toISOString();

    const updatedOrders = orders.map((o) => {
      if (o.id === payload.orderId) {
        // Enforce state machine transitions (locked once COMPLETED or VOID)
        if (o.status === 'COMPLETED' || o.status === 'VOID') {
          throw new Error(`Order ${o.token_number} is locked in status ${o.status}`);
        }

        const next: Order = {
          ...o,
          status: payload.targetStatus,
          updated_at: nowIso,
          accepted_at:
            payload.targetStatus === 'ACCEPTED' ||
            payload.targetStatus === 'PAID' ||
            payload.targetStatus === 'COMPLETED'
              ? o.accepted_at || nowIso
              : o.accepted_at,
          paid_at:
            payload.targetStatus === 'PAID' || payload.targetStatus === 'COMPLETED'
              ? o.paid_at || nowIso
              : o.paid_at,
          completed_at: payload.targetStatus === 'COMPLETED' ? nowIso : o.completed_at,
        };

        const paymentRecord = payload.payment || {
          method: 'CASH',
          amount: o.total_amount,
          cashTendered: o.total_amount,
          changeReturned: 0,
          cashAmount: o.total_amount,
          upiAmount: 0,
        };

        if (
          payload.payment ||
          payload.targetStatus === 'PAID' ||
          payload.targetStatus === 'COMPLETED'
        ) {
          next.payments = [
            ...(o.payments || []),
            {
              id: `pay-${Date.now()}`,
              order_id: o.id,
              payment_method: paymentRecord.method,
              amount: paymentRecord.amount,
              cash_tendered: paymentRecord.cashTendered,
              change_returned: paymentRecord.changeReturned,
              cash_amount: paymentRecord.cashAmount,
              upi_amount: paymentRecord.upiAmount,
              transaction_reference: paymentRecord.transactionReference || undefined,
              status: 'SUCCESS',
              staff_id: payload.staffId,
              staff_name: payload.staffName,
              created_at: nowIso,
            },
          ];
        }

        updatedOrder = next;
        return next;
      }
      return o;
    });

    // If order was COMPLETED, deduct inventory locally now
    if (payload.targetStatus === 'COMPLETED' && updatedOrder) {
      const order = updatedOrder as Order;
      const products = getLocalProducts();
      const updatedProducts = products.map((p) => {
        const matchedItem = order.items?.find(
          (item) =>
            item.product_id === p.id ||
            item.product_name?.toLowerCase() === p.name?.toLowerCase()
        );
        if (matchedItem) {
          const newStock = Math.max(0, p.stock - matchedItem.quantity);
          return { ...p, stock: newStock };
        }
        return p;
      });
      saveLocalProducts(updatedProducts);
    }

    saveLocalOrders(updatedOrders);

    // Queue for sync to Supabase when network is back
    addToSyncQueue({
      type: 'TRANSITION_ORDER',
      payload: {
        orderId: payload.orderId,
        targetStatus: payload.targetStatus,
        staffId: payload.staffId,
        staffName: payload.staffName,
        notes: payload.notes,
        payment: payload.payment,
      },
    });

    syncChannel?.postMessage({ type: 'ORDER_UPDATED', payload: updatedOrder });
    return updatedOrder || orders[0];
  },

  async resetExhibition(): Promise<void> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.rpc('reset_exhibition_data');
      } catch (err) {
        console.warn('Supabase resetExhibition failed:', err);
      }
    }
    localStorage.removeItem(STORAGE_KEYS.ORDERS);
    localStorage.setItem(STORAGE_KEYS.TOKEN_SEQ, '0');
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    syncChannel?.postMessage({ type: 'RESET_EXHIBITION' });
  },

  // REALTIME LISTENERS
  subscribeRealtime(
    onNewOrder: (order: Order) => void,
    onOrderUpdated: (order: Order) => void,
    onProductsUpdated: () => void
  ) {
    newOrderListeners.add(onNewOrder);
    orderUpdatedListeners.add(onOrderUpdated);
    productsUpdatedListeners.add(onProductsUpdated);

    initRealtimeChannel();

    // Also listen to cross-tab BroadcastChannel
    const handleBroadcast = (event: MessageEvent) => {
      const { type, payload } = event.data || {};
      if (type === 'NEW_ORDER_CREATED') {
        onNewOrder(payload);
      } else if (type === 'ORDER_UPDATED') {
        onOrderUpdated(payload);
      } else if (type === 'PRODUCTS_UPDATED' || type === 'RESET_EXHIBITION') {
        onProductsUpdated();
      }
    };

    syncChannel?.addEventListener('message', handleBroadcast);

    return () => {
      newOrderListeners.delete(onNewOrder);
      orderUpdatedListeners.delete(onOrderUpdated);
      productsUpdatedListeners.delete(onProductsUpdated);
      syncChannel?.removeEventListener('message', handleBroadcast);

      if (
        newOrderListeners.size === 0 &&
        orderUpdatedListeners.size === 0 &&
        productsUpdatedListeners.size === 0 &&
        activeSupabaseChannel
      ) {
        const supabase = getSupabaseClient();
        if (supabase) {
          supabase.removeChannel(activeSupabaseChannel);
        }
        activeSupabaseChannel = null;
      }
    };
  },
};

