/**
 * Toy Stall POS - Offline Synchronization Engine
 * Handles offline queues, background syncing to Supabase, and network resilience.
 */

import { getSupabaseClient } from './supabase';
import { toast } from '@/components/ui/use-toast';

export interface SyncQueueItem {
  id: string;
  type: 'CREATE_ORDER' | 'TRANSITION_ORDER' | 'ADJUST_STOCK' | 'UPDATE_PRODUCT' | 'CREATE_PRODUCT';
  payload: any;
  timestamp: number;
  retryCount: number;
}

const SYNC_QUEUE_KEY = 'pos_offline_sync_queue_v1';

// Helper to ensure valid UUID strings
function isValidUUID(val?: string | null): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

function sanitizeUUID(val?: string | null): string | null {
  return isValidUUID(val) ? (val as string) : null;
}

// Timeout wrapper for network promises or Postgrest builders to prevent UI hangs during weak Wi-Fi
export async function withTimeout<T = any>(
  promiseOrThenable: PromiseLike<T> | Promise<T> | any,
  timeoutMs = 2800
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Network request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    Promise.resolve(promiseOrThenable)
      .then((res) => {
        clearTimeout(timer);
        resolve(res as T);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Queue listeners
type QueueListener = (pendingCount: number, isSyncing: boolean) => void;
const queueListeners = new Set<QueueListener>();

let isSyncInProgress = false;

function notifyListeners() {
  const count = getPendingQueue().length;
  queueListeners.forEach((fn) => {
    try {
      fn(count, isSyncInProgress);
    } catch (e) {
      console.warn('Queue listener error:', e);
    }
  });
}

export function subscribeToSyncQueue(callback: QueueListener): () => void {
  queueListeners.add(callback);
  callback(getPendingQueue().length, isSyncInProgress);
  return () => {
    queueListeners.delete(callback);
  };
}

export function getPendingQueue(): SyncQueueItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(SYNC_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to read sync queue:', e);
    return [];
  }
}

export function addToSyncQueue(
  item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>
): SyncQueueItem {
  const queue = getPendingQueue();
  const newItem: SyncQueueItem = {
    ...item,
    id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    retryCount: 0,
  };

  queue.push(newItem);
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to save to sync queue:', e);
  }

  notifyListeners();
  return newItem;
}

export function removeFromSyncQueue(id: string): void {
  const queue = getPendingQueue();
  const filtered = queue.filter((item) => item.id !== id);
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to remove from sync queue:', e);
  }
  notifyListeners();
}

export function clearSyncQueue(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SYNC_QUEUE_KEY);
  notifyListeners();
}

/**
 * Process all queued offline changes against Supabase
 */
export async function processSyncQueue(): Promise<{ successCount: number; failedCount: number }> {
  if (typeof window === 'undefined') return { successCount: 0, failedCount: 0 };
  if (isSyncInProgress) return { successCount: 0, failedCount: 0 };

  const isOnline = navigator.onLine;
  if (!isOnline) {
    return { successCount: 0, failedCount: 0 };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return { successCount: 0, failedCount: 0 };
  }

  const queue = getPendingQueue();
  if (queue.length === 0) {
    return { successCount: 0, failedCount: 0 };
  }

  isSyncInProgress = true;
  notifyListeners();

  let successCount = 0;
  let failedCount = 0;

  for (const item of queue) {
    try {
      if (item.type === 'CREATE_ORDER') {
        const order = item.payload;
        const sanitizedItems = (order.items || []).map((i: any) => ({
          product_id: sanitizeUUID(i.product_id) || 'c0000001-0000-0000-0000-000000000001',
          product_name: i.product_name,
          unit_price: i.unit_price,
          quantity: i.quantity,
          subtotal: i.subtotal,
        }));

        await withTimeout(
          supabase.rpc('create_token_order', {
            p_items: sanitizedItems,
            p_counter_id: order.counter_id || 'Mobile 1',
            p_notes: order.notes || null,
            p_staff_id: sanitizeUUID(order.created_by_staff_id),
          }),
          4000
        );
        removeFromSyncQueue(item.id);
        successCount++;
      } else if (item.type === 'TRANSITION_ORDER') {
        const { orderId, targetStatus, staffId, notes, payment } = item.payload;
        await withTimeout(
          supabase.rpc('transition_order_status', {
            p_order_id: orderId,
            p_target_status: targetStatus,
            p_staff_id: sanitizeUUID(staffId),
            p_notes: notes || null,
            p_payment_data: payment || null,
          }),
          4000
        );
        removeFromSyncQueue(item.id);
        successCount++;
      } else if (item.type === 'ADJUST_STOCK') {
        const { productId, delta } = item.payload;
        const res: any = await withTimeout(
          supabase.from('products').select('stock').eq('id', productId).single(),
          3000
        );
        const current = res?.data;
        if (current) {
          const newStock = Math.max(0, current.stock + delta);
          await withTimeout(
            supabase.from('products').update({ stock: newStock }).eq('id', productId),
            3000
          );
        }
        removeFromSyncQueue(item.id);
        successCount++;
      } else if (item.type === 'UPDATE_PRODUCT') {
        const { id, updates } = item.payload;
        await withTimeout(
          supabase.from('products').update(updates).eq('id', id),
          3000
        );
        removeFromSyncQueue(item.id);
        successCount++;
      }
    } catch (err) {
      console.warn(`Sync queue processing failed for item ${item.id}:`, err);
      failedCount++;
      item.retryCount = (item.retryCount || 0) + 1;
      if (item.retryCount > 6) {
        // Discard permanently failing item to unblock the rest of the queue
        removeFromSyncQueue(item.id);
      }
    }
  }

  isSyncInProgress = false;
  notifyListeners();

  if (successCount > 0) {
    toast({
      title: '🟢 Cloud Sync Complete!',
      description: `Successfully synchronized ${successCount} offline action${
        successCount > 1 ? 's' : ''
      } to Supabase.`,
      variant: 'success',
    });
  }

  return { successCount, failedCount };
}

// Background sync triggers on network reconnect
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    setTimeout(() => {
      processSyncQueue();
    }, 1500);
  });

  // Periodic queue sweep every 20 seconds if online
  setInterval(() => {
    if (navigator.onLine && getPendingQueue().length > 0 && !isSyncInProgress) {
      processSyncQueue();
    }
  }, 20000);
}
