import React, { useState, useEffect } from 'react';
import { useSettings } from '@/context/SettingsContext';
import {
  subscribeToSyncQueue,
  processSyncQueue,
  getPendingQueue,
} from '@/lib/offlineSync';
import { WifiOff, RefreshCw, CheckCircle2, CloudLightning } from 'lucide-react';

export const OfflineNoticeBanner: React.FC = () => {
  const { isOnline } = useSettings();
  const [pendingCount, setPendingCount] = useState<number>(() => getPendingQueue().length);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = subscribeToSyncQueue((count, syncing) => {
      setPendingCount(count);
      setIsSyncing(syncing);
    });
    return () => unsubscribe();
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    await processSyncQueue();
    setIsSyncing(false);
  };

  // Only show when offline OR when there are pending items waiting to sync
  if (isOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <div
      className={`shrink-0 w-full px-3 py-1.5 sm:px-4 text-xs font-bold transition-all flex flex-wrap items-center justify-between gap-2 shadow-sm z-40 select-none ${
        !isOnline
          ? 'bg-amber-600 text-white'
          : 'bg-sky-600 text-white'
      }`}
    >
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <span className="flex items-center gap-1.5 font-extrabold">
            <WifiOff className="h-4 w-4 animate-pulse shrink-0" />
            <span>Offline Mode Active</span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5 font-extrabold">
            <CloudLightning className="h-4 w-4 animate-bounce shrink-0" />
            <span>Connection Restored</span>
          </span>
        )}
        <span className="hidden sm:inline opacity-90 text-[11px] font-medium">
          {!isOnline
            ? '— POS Billing & Inventory remain 100% operational offline. Orders are saved safely on this device.'
            : '— Synchronizing saved offline orders & stock with Supabase cloud database.'}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-auto">
        {pendingCount > 0 && (
          <span className="bg-black/25 px-2 py-0.5 rounded-md font-mono text-[11px]">
            {pendingCount} item{pendingCount > 1 ? 's' : ''} queued
          </span>
        )}

        {isOnline && (
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="bg-white text-black hover:bg-white/90 px-2.5 py-0.5 rounded-md font-extrabold text-[11px] flex items-center gap-1 transition-transform active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
