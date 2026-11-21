import React from 'react';
import { NavLink } from 'react-router-dom';
import { useOrders } from '@/hooks/useOrders';
import {
  ShoppingCart,
  Ticket,
  BarChart3,
  Package,
  PieChart,
  Settings,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const Sidebar: React.FC = () => {
  const { orders } = useOrders();
  const pendingCount = orders.filter((o) => o.status === 'NEW').length;

  const links = [
    {
      to: '/',
      label: 'POS / Billing',
      icon: ShoppingCart,
      shortcut: 'F1',
    },
    {
      to: '/tokens',
      label: 'Tokens (Live)',
      icon: Ticket,
      badge: pendingCount > 0 ? pendingCount : undefined,
      shortcut: 'F2',
    },
    {
      to: '/orders',
      label: 'Orders / Sales',
      icon: BarChart3,
    },
    {
      to: '/inventory',
      label: 'Inventory',
      icon: Package,
    },
    {
      to: '/reports',
      label: 'Reports',
      icon: PieChart,
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <aside className="hidden md:flex flex-col w-56 lg:w-60 shrink-0 border-r border-border bg-card/60 p-3 sm:p-4 justify-between select-none h-full min-h-0 overflow-y-auto scrollbar-thin">
      <div className="space-y-1">
        <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Navigation
        </div>
        <nav className="space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl font-bold text-sm transition-all group',
                    isActive
                      ? 'bg-brand text-white shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <Icon className={cn('h-4 w-4 transition-transform group-hover:scale-110', isActive ? 'text-white' : 'text-muted-foreground')} />
                      <span>{link.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {link.badge !== undefined && (
                        <span
                          className={cn(
                            'h-5 min-w-5 px-1.5 rounded-full text-xs font-black flex items-center justify-center animate-pulse',
                            isActive ? 'bg-white text-brand' : 'bg-brand text-white'
                          )}
                        >
                          {link.badge}
                        </span>
                      )}
                      {link.shortcut && (
                        <span className={cn(
                          'text-[10px] font-mono px-1 rounded opacity-60',
                          isActive ? 'bg-black/20 text-white' : 'bg-muted text-muted-foreground'
                        )}>
                          {link.shortcut}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Exhibition Mascot Card */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-brand/10 to-brand/5 p-3 sm:p-4 text-center relative overflow-hidden shrink-0 mt-3">
        <div className="text-2xl sm:text-3xl mb-1 animate-bounce">🧸🏎️🚀</div>
        <h4 className="text-xs font-black text-foreground">Exhibition Mega Stall</h4>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          High-Speed POS Engine
        </p>
        <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
          <Sparkles className="h-2.5 w-2.5" /> 0ms Lag Sync
        </div>
      </div>
    </aside>
  );
};

