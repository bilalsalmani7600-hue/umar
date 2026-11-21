import React from 'react';
import { useSettings } from '@/context/SettingsContext';
import { Wifi, WifiOff, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ConnectionStatusBadge: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const { isOnline, isSupabaseConnected } = useSettings();

  return (
    <button
      onClick={onClick}
      type="button"
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all border',
        !isOnline
          ? 'bg-red-500/10 text-red-400 border-red-500/30'
          : isSupabaseConnected
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
          : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
      )}
      title={
        !isOnline
          ? 'Offline mode - Actions saved locally'
          : isSupabaseConnected
          ? 'Connected to Supabase Realtime'
          : 'Local Sync Mode (Click to configure Supabase)'
      }
    >
      <span
        className={cn(
          'h-2 w-2 rounded-full animate-pulse',
          !isOnline ? 'bg-red-500' : isSupabaseConnected ? 'bg-emerald-500' : 'bg-amber-400'
        )}
      />
      {!isOnline ? (
        <span className="flex items-center gap-1">
          <WifiOff className="h-3 w-3" /> Offline
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

