import React, { useState, useEffect } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { api } from '@/lib/api';
import { resetSupabaseClient, getSupabaseCredentials } from '@/lib/supabase';
import { Navbar } from '@/components/common/Navbar';
import { Sidebar } from '@/components/common/Sidebar';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import {
  isAppInstalled,
  canPromptInstall,
  promptInstall,
  subscribeToInstallPrompt,
} from '@/lib/pwa';
import {
  subscribeToSyncQueue,
  processSyncQueue,
  getPendingQueue,
  clearSyncQueue,
} from '@/lib/offlineSync';
import {
  Settings,
  Database,
  RefreshCw,
  Volume2,
  Printer,
  ShieldAlert,
  Download,
  CheckCircle2,
  Store,
  Terminal,
  Smartphone,
  Laptop,
  Info,
  Wifi,
  WifiOff,
  CloudLightning,
  Trash2,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const {
    counterId,
    setCounterId,
    soundEnabled,
    setSoundEnabled,
    autoPrintReceipt,
    setAutoPrintReceipt,
    isSupabaseConnected,
    setSupabaseConnected,
    isOnline,
  } = useSettings();

  const currentCreds = getSupabaseCredentials();
  const [supabaseUrl, setSupabaseUrl] = useState<string>(currentCreds.url || '');
  const [supabaseKey, setSupabaseKey] = useState<string>(currentCreds.key || '');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Offline Sync State
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() => getPendingQueue().length);
  const [isSyncingOffline, setIsSyncingOffline] = useState<boolean>(false);

  useEffect(() => {
    const unsub = subscribeToSyncQueue((count, syncing) => {
      setPendingSyncCount(count);
      setIsSyncingOffline(syncing);
    });
    return () => unsub();
  }, []);

  const handleManualSyncNow = async () => {
    setIsSyncingOffline(true);
    const { successCount, failedCount } = await processSyncQueue();
    setIsSyncingOffline(false);
    if (successCount === 0 && failedCount === 0 && pendingSyncCount === 0) {
      toast({
        title: 'All Data Synchronized',
        description: 'No offline pending transactions found in queue.',
        variant: 'default',
      });
    }
  };

  const handleClearSyncQueue = () => {
    if (window.confirm('Clear all pending offline items from queue?')) {
      clearSyncQueue();
      toast({
        title: 'Queue Cleared',
        variant: 'default',
      });
    }
  };

  const handleHardRefreshData = async () => {
    const confirmed = window.confirm(
      '🔄 Clear local device cache and reload fresh product catalog? Old cached test data will be reset.'
    );
    if (!confirmed) return;

    localStorage.removeItem('pos_local_products_v4');
    localStorage.removeItem('pos_local_orders_v4');
    localStorage.removeItem('pos_local_token_sequence_v4');
    localStorage.removeItem('pos_offline_sync_queue_v1');

    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }

    toast({
      title: 'Cache Cleared!',
      description: 'Reloading fresh catalog and orders...',
      variant: 'success',
    });

    setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  // PWA Installation State
  const [isInstalled, setIsInstalled] = useState<boolean>(isAppInstalled());
  const [canPrompt, setCanPrompt] = useState<boolean>(canPromptInstall());
  const [showManualGuide, setShowManualGuide] = useState<boolean>(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'android' | 'ios' | 'pc'>('android');

  useEffect(() => {
    const unsubscribe = subscribeToInstallPrompt((canInstall) => {
      setCanPrompt(canInstall);
      setIsInstalled(isAppInstalled());
    });
    return () => unsubscribe();
  }, []);

  const handleInstallClick = async () => {
    if (isInstalled) {
      toast({
        title: 'App Already Installed',
        description: 'Toy Stall POS is running in standalone app mode on this device.',
        variant: 'success',
      });
      return;
    }

    if (canPrompt) {
      const accepted = await promptInstall();
      if (accepted) {
        setIsInstalled(true);
        toast({
          title: 'App Installed Successfully!',
          description: 'Toy Stall POS has been added to your home screen/desktop.',
          variant: 'success',
        });
        return;
      }
    }

    // If browser does not support programmatic prompt (e.g. iOS Safari) or hasn't fired it yet
    setShowManualGuide(true);
    toast({
      title: 'Installation Instructions',
      description: 'Follow the device steps below to add Toy Stall POS to your home screen.',
    });
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);

    try {
      const client = resetSupabaseClient(supabaseUrl.trim(), supabaseKey.trim());
      if (client) {
        // Quick probe query
        const { error } = await client.from('products').select('id').limit(1);
        if (error && !error.message.includes('permission')) {
          throw error;
        }
        setSupabaseConnected(true);
        toast({
          title: 'Supabase Connected Successfully!',
          description: 'Realtime synchronization is now live.',
          variant: 'success',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Connection Failed',
        description: err.message || 'Please check your Supabase URL and anon key',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleResetExhibition = async () => {
    const confirmation = window.confirm(
      '⚠️ WARNING: This will reset all today\'s orders, set token sequence back to 001, and restore inventory for the exhibition morning. Proceed?'
    );
    if (!confirmation) return;

    setIsResetting(true);
    try {
      await api.resetExhibition();
      toast({
        title: 'Exhibition Reset Complete',
        description: 'Orders cleared, tokens will now start from T001.',
        variant: 'success',
      });
    } catch (err: any) {
      toast({
        title: 'Reset Failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleBackupData = async () => {
    try {
      const [products, orders] = await Promise.all([api.getProducts(), api.getOrders()]);
      const backup = {
        exportedAt: new Date().toISOString(),
        products,
        orders,
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `toy_pos_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: 'Backup downloaded successfully', variant: 'success' });
    } catch (e: any) {
      toast({ title: 'Backup failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="h-screen max-h-screen w-full flex flex-col bg-background text-foreground overflow-hidden">
      <Navbar />

      <div className="flex-1 flex overflow-hidden min-h-0 w-full">
        <Sidebar />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-5xl min-h-0">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
              <Settings className="h-5 w-5 text-brand" /> System Settings & Supabase
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure database sync, counter assignments, and exhibition parameters
            </p>
          </div>

          {/* PWA INSTALLATION CARD */}
          <div className="p-5 rounded-2xl border border-border bg-card space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-brand/15 border border-brand/30 flex items-center justify-center text-brand shrink-0">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                    Install App (PWA) on Mobile & PC
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Launch Toy Stall POS full-screen with 0ms lag — no browser URL bars
                  </p>
                </div>
              </div>

              <div>
                {isInstalled ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Installed & Running
                  </span>
                ) : canPrompt ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand/15 text-brand border border-brand/30 animate-pulse">
                    ⚡ 1-Tap Install Ready
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-muted text-muted-foreground border border-border">
                    Browser Mode
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl bg-muted/30 border border-border">
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Download className="h-4 w-4 text-brand" />
                  {isInstalled ? 'Toy Stall POS App is Active' : 'Install as Standalone Web App'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isInstalled
                    ? 'App is installed and running in dedicated standalone window mode.'
                    : 'Installs directly onto your Android phone, iPhone, iPad, or Windows PC desktop.'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!isInstalled && (
                  <Button
                    type="button"
                    onClick={handleInstallClick}
                    className="bg-brand hover:bg-brand/90 text-white font-extrabold px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Install App</span>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowManualGuide(!showManualGuide)}
                  className="font-bold text-xs px-3.5 py-2 rounded-xl"
                >
                  {showManualGuide ? 'Hide Guide' : 'How to Install ℹ️'}
                </Button>
              </div>
            </div>

            {/* DEVICE-SPECIFIC INSTALLATION TABS & GUIDE */}
            {(showManualGuide || !isInstalled) && (
              <div className="pt-2 border-t border-border/60">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Quick Install Instructions:
                  </span>
                  <div className="flex gap-1 bg-muted/60 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setActiveGuideTab('android')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                        activeGuideTab === 'android'
                          ? 'bg-brand text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      🤖 Android
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveGuideTab('ios')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                        activeGuideTab === 'ios'
                          ? 'bg-brand text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      🍎 iPhone / iPad
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveGuideTab('pc')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                        activeGuideTab === 'pc'
                          ? 'bg-brand text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      💻 PC / Laptop
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-background border border-border text-xs space-y-2">
                  {activeGuideTab === 'android' && (
                    <div className="space-y-1.5 text-muted-foreground">
                      <p className="font-bold text-foreground">📱 On Android (Google Chrome / Brave):</p>
                      <ol className="list-decimal list-inside space-y-1.5">
                        <li>Tap the red <strong className="text-foreground">"Install App"</strong> button above.</li>
                        <li>If prompted, tap <strong className="text-foreground">"Install"</strong> or <strong className="text-foreground">"Add to Home screen"</strong>.</li>
                        <li>Alternatively, tap Chrome&apos;s three-dot menu (<strong className="text-foreground">⋮</strong>) at top-right and select <strong className="text-foreground">"Install app"</strong>.</li>
                      </ol>
                    </div>
                  )}

                  {activeGuideTab === 'ios' && (
                    <div className="space-y-1.5 text-muted-foreground">
                      <p className="font-bold text-foreground">🍎 On iPhone / iPad (Safari):</p>
                      <ol className="list-decimal list-inside space-y-1.5">
                        <li>Open this URL in <strong className="text-foreground">Safari</strong>.</li>
                        <li>Tap the <strong className="text-foreground">Share button</strong> (square icon with upward arrow <span className="text-base leading-none">📤</span>) in the bottom navigation bar.</li>
                        <li>Scroll down and tap <strong className="text-foreground">"Add to Home Screen" ➕</strong>.</li>
                        <li>Tap <strong className="text-foreground">"Add"</strong> at top-right. The Toy Stall POS icon will appear on your iPhone screen!</li>
                      </ol>
                    </div>
                  )}

                  {activeGuideTab === 'pc' && (
                    <div className="space-y-1.5 text-muted-foreground">
                      <p className="font-bold text-foreground">💻 On Windows PC or Mac (Chrome / Edge):</p>
                      <ol className="list-decimal list-inside space-y-1.5">
                        <li>Click the red <strong className="text-foreground">"Install App"</strong> button above.</li>
                        <li>Or look at the right end of your browser address bar and click the <strong className="text-foreground">Install Icon (⊕ or 💻)</strong>.</li>
                        <li>Click <strong className="text-foreground">"Install"</strong>. A standalone desktop app window will open automatically.</li>
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SUPABASE CONNECTION CARD */}
          <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <Database className="h-5 w-5 text-brand" />
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base">
                    Supabase Database & Realtime
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Connect both Mobile and Desktop devices through a shared cloud database
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {isSupabaseConnected ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    Demo Mode (Local Sync)
                  </span>
                )}
              </div>
            </div>

            <form onSubmit={handleSaveCredentials} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Supabase Project URL:
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://xyzproject.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background font-mono text-xs focus:ring-2 focus:ring-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Supabase Anon Public Key:
                </label>
                <input
                  type="text"
                  required
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background font-mono text-xs focus:ring-2 focus:ring-brand focus:outline-none"
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-[11px] text-muted-foreground">
                  Credentials are encrypted and saved in your browser storage.
                </span>
                <Button
                  type="submit"
                  disabled={isTesting}
                  variant="default"
                  className="font-bold flex items-center gap-2"
                >
                  <RefreshCw className={isTesting ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                  <span>{isTesting ? 'Testing...' : 'Save & Connect'}</span>
                </Button>
              </div>
            </form>

            {/* Quick SQL Schema Notice */}
            <div className="p-3.5 rounded-xl bg-muted/50 border border-border flex items-start gap-3">
              <Terminal className="h-4 w-4 text-brand shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-foreground">Supabase SQL Schema Ready</p>
                <p className="text-muted-foreground">
                  Run the SQL scripts in <code className="bg-background px-1 py-0.5 rounded font-mono">supabase/schema.sql</code> and <code className="bg-background px-1 py-0.5 rounded font-mono">supabase/seed.sql</code> in your Supabase SQL Editor to initialize all tables, atomic RPC procedures, and seed toy catalog.
                </p>
              </div>
            </div>
          </div>

          {/* OFFLINE POS ENGINE & RESILIENCE CARD */}
          <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-2">
              <div className="flex items-center gap-2.5">
                <WifiOff className="h-5 w-5 text-amber-500" />
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base">
                    Offline POS Engine & Background Sync
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Continue full sales, token creation & inventory tracking even if exhibition Wi-Fi dies
                  </p>
                </div>
              </div>

              <div>
                {!isOnline ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    <WifiOff className="h-3.5 w-3.5" /> Working Offline
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <Wifi className="h-3.5 w-3.5" /> Online & Synchronized
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-1.5">
                <span className="text-xs font-bold text-foreground block">
                  Offline Pending Sync Queue
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black font-mono text-brand">
                    {pendingSyncCount}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleManualSyncNow}
                      disabled={isSyncingOffline || pendingSyncCount === 0 || !isOnline}
                      className="font-bold text-xs flex items-center gap-1.5"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isSyncingOffline ? 'animate-spin' : ''}`} />
                      <span>{isSyncingOffline ? 'Syncing...' : 'Sync Now'}</span>
                    </Button>
                    {pendingSyncCount > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={handleClearSyncQueue}
                        className="text-muted-foreground hover:text-red-400 text-xs px-2"
                        title="Clear Queue"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Orders, payments, and stock adjustments created while offline are held safely here until internet restores.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-1.5">
                <span className="text-xs font-bold text-foreground block">
                  Offline Cache Status
                </span>
                <p className="text-xs text-muted-foreground">
                  Catalog, prices, and stock are automatically cached to your device. If cellular signal drops during a rush, you can keep taking cash or UPI payments without losing a single customer.
                </p>
                <div className="pt-1 flex items-center gap-2 text-[11px] font-bold text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>0ms Instant Local Storage Fallback Active</span>
                </div>
              </div>
            </div>
          </div>

          {/* HARDWARE & POS CONFIGURATION */}
          <div className="p-5 rounded-2xl border border-border bg-card space-y-4">
            <h4 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
              <Store className="h-5 w-5 text-brand" /> Counter & Hardware Options
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Counter ID Assignment */}
              <div className="p-3.5 rounded-xl border border-border bg-muted/30">
                <label className="text-xs font-bold text-muted-foreground block mb-1">
                  Terminal Counter ID:
                </label>
                <select
                  value={counterId}
                  onChange={(e) => setCounterId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm font-bold focus:outline-none"
                >
                  <option value="Counter 1">Billing Counter 1 (Desktop)</option>
                  <option value="Counter 2">Billing Counter 2 (Desktop)</option>
                  <option value="Mobile 1">Mobile Device 1 (Inventory Staff)</option>
                  <option value="Mobile 2">Mobile Device 2 (Inventory Staff)</option>
                </select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Identifies which station generates each token or payment.
                </p>
              </div>

              {/* Sound Alerts */}
              <div className="p-3.5 rounded-xl border border-border bg-muted/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    POS Audio Feedback
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Synthesized beeps for product taps and incoming order dings
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`h-7 w-12 rounded-full p-1 transition-colors ${
                    soundEnabled ? 'bg-brand' : 'bg-muted'
                  }`}
                >
                  <div
                    className={`h-5 w-5 rounded-full bg-white transition-transform ${
                      soundEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Auto print receipt */}
              <div className="p-3.5 rounded-xl border border-border bg-muted/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    Auto-Print Token Slip
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Automatically prompt thermal printer after generating token
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoPrintReceipt(!autoPrintReceipt)}
                  className={`h-7 w-12 rounded-full p-1 transition-colors ${
                    autoPrintReceipt ? 'bg-brand' : 'bg-muted'
                  }`}
                >
                  <div
                    className={`h-5 w-5 rounded-full bg-white transition-transform ${
                      autoPrintReceipt ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Backup Database */}
              <div className="p-3.5 rounded-xl border border-border bg-muted/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    Data Backup Export
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Download full JSON snapshot of all products and orders
                  </span>
                </div>
                <Button onClick={handleBackupData} size="sm" variant="outline" className="font-bold">
                  <Download className="h-4 w-4 mr-1" /> Backup
                </Button>
              </div>

              {/* Reset Old Local Cache */}
              <div className="p-3.5 rounded-xl border border-border bg-muted/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    Clear Local Cache & Reset Old Data
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Removes old device cache and refreshes catalog with Cost Price & Selling Price
                  </span>
                </div>
                <Button
                  onClick={handleHardRefreshData}
                  size="sm"
                  variant="outline"
                  className="font-bold text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                >
                  <RefreshCw className="h-4 w-4 mr-1" /> Reset Old Cache
                </Button>
              </div>
            </div>
          </div>

          {/* EXHIBITION RESET (ADMIN) */}
          <div className="p-5 rounded-2xl border border-red-500/30 bg-red-950/10 space-y-3">
            <div className="flex items-center gap-2 text-red-400 font-extrabold text-sm sm:text-base">
              <ShieldAlert className="h-5 w-5" />
              <span>Exhibition Event Reset Tool</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Used by exhibition organizers on the morning of the exhibition day. Clears test/trial orders and resets the token counter atomically so customer tokens begin cleanly at <strong>T001</strong>.
            </p>
            <div className="pt-1">
              <Button
                onClick={handleResetExhibition}
                disabled={isResetting}
                variant="destructive"
                className="font-bold shadow-md"
              >
                <RefreshCw className={isResetting ? 'h-4 w-4 mr-1.5 animate-spin' : 'h-4 w-4 mr-1.5'} />
                <span>{isResetting ? 'Resetting...' : 'Reset Exhibition & Restart Tokens from 001'}</span>
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

