import React, { useState, useEffect } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { subscribeToSyncQueue, getPendingQueue } from '@/lib/offlineSync';
import { Wifi, WifiOff, Database, CloudLightning } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ConnectionStatusBadge: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const { isOnline, isSupabaseConnected, isOfflineOnly } = useSettings();
  const [pendingCount, setPendingCount] = useState<number>(() => getPendingQueue().length);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = subscribeToSyncQueue((count, syncing) => {
      setPendingCount(count);
      setIsSyncing(syncing);
    });
    return () => unsubscribe();
  }, []);

  return (
    <button
      onClick={onClick}
      type="button"
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all border',
        isOfflineOnly
          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
          : !isOnline
          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
          : pendingCount > 0
          ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
          : isSupabaseConnected
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
          : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
      )}
      title={
        isOfflineOnly
          ? '100% Offline Mode active - Data stored safely inside project without Supabase quota limits'
          : !isOnline
          ? 'Offline mode - POS operating locally, will auto-sync when online'
          : pendingCount > 0
          ? `${pendingCount} offline items pending sync to cloud`
          : isSupabaseConnected
          ? 'Connected to Supabase Realtime'
          : 'Local Sync Mode (Click to configure Supabase)'
      }
    >
      <span
        className={cn(
          'h-2 w-2 rounded-full animate-pulse',
          isOfflineOnly
            ? 'bg-emerald-400'
            : !isOnline
            ? 'bg-amber-400'
            : pendingCount > 0
            ? 'bg-sky-400'
            : isSupabaseConnected
            ? 'bg-emerald-500'
            : 'bg-amber-400'
        )}
      />
      {isOfflineOnly ? (
        <span className="flex items-center gap-1">
          <Database className="h-3 w-3 text-emerald-400" /> Offline POS (Local)
        </span>
      ) : !isOnline ? (
        <span className="flex items-center gap-1">
          <WifiOff className="h-3 w-3" /> Offline
          {pendingCount > 0 && (
            <span className="ml-0.5 px-1 py-0.2 rounded bg-amber-500/30 text-[10px] font-mono">
              ({pendingCount})
            </span>
          )}
        </span>
      ) : pendingCount > 0 ? (
        <span className="flex items-center gap-1">
          <CloudLightning className="h-3 w-3 animate-spin" />
          <span>{isSyncing ? 'Syncing...' : `Sync (${pendingCount})`}</span>
        </span>
      ) : isSupabaseConnected ? (
        <span className="flex items-center gap-1">
          <Wifi className="h-3 w-3" /> Supabase Live
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <Database className="h-3 w-3" /> Demo Mode
        </span>
      )}
    </button>
  );
};
