import React, { useState } from 'react';
import { useSettings } from '@/context/SettingsContext';
import { api } from '@/lib/api';
import { resetSupabaseClient, getSupabaseCredentials } from '@/lib/supabase';
import { Navbar } from '@/components/common/Navbar';
import { Sidebar } from '@/components/common/Sidebar';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
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
  } = useSettings();

  const currentCreds = getSupabaseCredentials();
  const [supabaseUrl, setSupabaseUrl] = useState<string>(currentCreds.url || '');
  const [supabaseKey, setSupabaseKey] = useState<string>(currentCreds.key || '');
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

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

