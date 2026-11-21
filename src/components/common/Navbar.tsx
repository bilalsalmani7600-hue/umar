import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { useOrders } from '@/hooks/useOrders';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import {
  Search,
  Printer,
  Settings,
  Bell,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Keyboard,
  User,
  Store,
  Menu,
  X,
  Package,
  PieChart,
  ShoppingCart,
  Ticket,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavbarProps {
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  searchInputRef?: React.RefObject<HTMLInputElement>;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  searchInputRef,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, switchRole, availableStaff } = useAuth();
  const {
    isDarkMode,
    setIsDarkMode,
    soundEnabled,
    setSoundEnabled,
    counterId,
    setCounterId,
  } = useSettings();
  const { orders } = useOrders();

  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showStaffMenu, setShowStaffMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const pendingOrdersCount = orders.filter((o) => o.status === 'NEW').length;

  const isPOSActive = location.pathname === '/';
  const isTokensActive = location.pathname === '/tokens';

  return (
    <>
      <header className="shrink-0 h-16 w-full border-b border-border/80 bg-card/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 select-none z-30">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="text-2xl sm:text-3xl transition-transform group-hover:scale-110">🧸</div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight leading-none text-foreground">
                Toy Stall POS
              </span>
              <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Expo
              </span>
            </div>
          </div>
        </div>

        {/* Search Bar - Instant Filter */}
        {onSearchChange !== undefined && (
          <div className="flex-1 max-w-xl mx-2 hidden md:block">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery || ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search item... (e.g. Doraemon, Car, Bear) [Press /]"
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-input bg-muted/30 focus:bg-background text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground hover:text-foreground bg-muted px-1.5 py-0.5 rounded"
                >
                  ESC
                </button>
              )}
            </div>
          </div>
        )}

        {/* Center / Right Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* F1 Billing Shortcut Button */}
          <button
            onClick={() => navigate('/')}
            className={cn(
              'h-9 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-sm',
              isPOSActive
                ? 'bg-brand text-white hover:bg-brand-700'
                : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <span className="text-[10px] px-1 py-0.5 rounded bg-black/20 font-mono">F1</span>
            <span>Billing</span>
          </button>

          {/* F2 Tokens Shortcut Button */}
          <button
            onClick={() => navigate('/tokens')}
            className={cn(
              'h-9 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-sm relative',
              isTokensActive
                ? 'bg-brand text-white hover:bg-brand-700'
                : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <span className="text-[10px] px-1 py-0.5 rounded bg-black/20 font-mono">F2</span>
            <span>Tokens</span>
            {pendingOrdersCount > 0 && (
              <span className="h-5 min-w-5 px-1 rounded-full bg-amber-500 text-black text-[10px] font-black flex items-center justify-center animate-pulse">
                {pendingOrdersCount}
              </span>
            )}
          </button>

          {/* Counter Switcher */}
          <div className="hidden lg:flex items-center gap-1 border border-border rounded-xl px-2 py-1 bg-muted/40">
            <Store className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={counterId}
              onChange={(e) => setCounterId(e.target.value)}
              className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer"
            >
              <option value="Counter 1" className="bg-card text-foreground">Counter 1</option>
              <option value="Counter 2" className="bg-card text-foreground">Counter 2</option>
              <option value="Mobile 1" className="bg-card text-foreground">Mobile 1</option>
              <option value="Mobile 2" className="bg-card text-foreground">Mobile 2</option>
            </select>
          </div>

          {/* Supabase / Online Status */}
          <ConnectionStatusBadge onClick={() => navigate('/settings')} />

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
            title={soundEnabled ? 'Mute sound alerts' : 'Enable sound alerts'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-400" /> : <VolumeX className="h-4 w-4 text-zinc-500" />}
          </button>

          {/* Theme Dark/Light Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
            title="Toggle Theme"
          >
            {isDarkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Keyboard Shortcuts Trigger */}
          <button
            onClick={() => setShowShortcuts(true)}
            className="hidden sm:flex h-9 w-9 rounded-xl items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
            title="Keyboard Shortcuts"
          >
            <Keyboard className="h-4 w-4" />
          </button>

          {/* Settings Navigation */}
          <button
            onClick={() => navigate('/settings')}
            className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
            title="System Settings"
          >
            <Settings className="h-4 w-4" />
          </button>

          {/* Role / Staff Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowStaffMenu(!showStaffMenu)}
              className="h-9 px-2 sm:px-2.5 rounded-xl border border-border bg-muted/50 hover:bg-muted flex items-center gap-1.5 transition-all text-xs font-bold"
            >
              <div className="h-6 w-6 rounded-full bg-brand/30 text-brand flex items-center justify-center text-xs font-black">
                {currentUser.name.charAt(0)}
              </div>
              <span className="hidden sm:inline max-w-[90px] truncate">{currentUser.name}</span>
            </button>

            {showStaffMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowStaffMenu(false)}
                />
                <div className="absolute right-0 top-11 z-50 w-56 rounded-2xl border border-border bg-card p-2 shadow-2xl animate-in fade-in-50 zoom-in-95">
                  <div className="px-2 py-1.5 border-b border-border mb-1">
                    <p className="text-xs font-bold text-foreground">Current Staff</p>
                    <p className="text-[11px] text-muted-foreground capitalize">
                      {currentUser.name} ({currentUser.role.replace('_', ' ')})
                    </p>
                  </div>

                  <div className="space-y-1">
                    {availableStaff.map((staff) => (
                      <button
                        key={staff.id}
                        onClick={() => {
                          switchRole(staff.role);
                          setShowStaffMenu(false);
                        }}
                        className={cn(
                          'w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors',
                          currentUser.role === staff.role
                            ? 'bg-brand text-white'
                            : 'hover:bg-muted text-foreground'
                        )}
                      >
                        <div>
                          <div>{staff.name}</div>
                          <div className="text-[10px] opacity-80 capitalize">
                            {staff.role.replace('_', ' ')}
                          </div>
                        </div>
                        {currentUser.role === staff.role && <span>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          {/* Mobile Hamburger Menu Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden h-9 w-9 rounded-xl border border-border bg-muted/60 hover:bg-muted flex items-center justify-center text-foreground active:scale-95 transition-all"
            title="Navigation Menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Slide-down Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="absolute inset-0" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="relative z-10 w-full bg-card border-b border-border p-4 shadow-2xl animate-in slide-in-from-top duration-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="font-extrabold text-sm text-foreground">Menu & Navigation</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  navigate('/');
                  setIsMobileMenuOpen(false);
                }}
                className={cn(
                  'p-3 rounded-xl flex items-center gap-2.5 font-bold text-xs border text-left',
                  location.pathname === '/' ? 'bg-brand text-white border-brand' : 'bg-muted/40 border-border text-foreground'
                )}
              >
                <ShoppingCart className="h-4 w-4 shrink-0" />
                <span>POS Billing</span>
              </button>

              <button
                onClick={() => {
                  navigate('/tokens');
                  setIsMobileMenuOpen(false);
                }}
                className={cn(
                  'p-3 rounded-xl flex items-center justify-between font-bold text-xs border text-left',
                  location.pathname === '/tokens' ? 'bg-brand text-white border-brand' : 'bg-muted/40 border-border text-foreground'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Ticket className="h-4 w-4 shrink-0" />
                  <span>Tokens (Live)</span>
                </div>
                {pendingOrdersCount > 0 && (
                  <span className="h-4 min-w-4 px-1 rounded-full bg-amber-500 text-black text-[9px] font-black flex items-center justify-center">
                    {pendingOrdersCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  navigate('/inventory');
                  setIsMobileMenuOpen(false);
                }}
                className={cn(
                  'p-3 rounded-xl flex items-center gap-2.5 font-bold text-xs border text-left',
                  location.pathname === '/inventory' ? 'bg-brand text-white border-brand' : 'bg-muted/40 border-border text-foreground'
                )}
              >
                <Package className="h-4 w-4 shrink-0" />
                <span>Inventory & Stock</span>
              </button>

              <button
                onClick={() => {
                  navigate('/reports');
                  setIsMobileMenuOpen(false);
                }}
                className={cn(
                  'p-3 rounded-xl flex items-center gap-2.5 font-bold text-xs border text-left',
                  location.pathname === '/reports' ? 'bg-brand text-white border-brand' : 'bg-muted/40 border-border text-foreground'
                )}
              >
                <PieChart className="h-4 w-4 shrink-0" />
                <span>Reports & Analytics</span>
              </button>

              <button
                onClick={() => {
                  navigate('/orders');
                  setIsMobileMenuOpen(false);
                }}
                className={cn(
                  'p-3 rounded-xl flex items-center gap-2.5 font-bold text-xs border text-left',
                  location.pathname === '/orders' ? 'bg-brand text-white border-brand' : 'bg-muted/40 border-border text-foreground'
                )}
              >
                <FileText className="h-4 w-4 shrink-0" />
                <span>Orders Ledger</span>
              </button>

              <button
                onClick={() => {
                  navigate('/settings');
                  setIsMobileMenuOpen(false);
                }}
                className={cn(
                  'p-3 rounded-xl flex items-center gap-2.5 font-bold text-xs border text-left',
                  location.pathname === '/settings' ? 'bg-brand text-white border-brand' : 'bg-muted/40 border-border text-foreground'
                )}
              >
                <Settings className="h-4 w-4 shrink-0" />
                <span>Settings</span>
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Keyboard shortcuts popup modal */}
      <KeyboardShortcutsModal
        open={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
    </>
  );
};

