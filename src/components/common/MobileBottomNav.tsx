import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useOrders } from '@/hooks/useOrders';
import { useProducts } from '@/hooks/useProducts';
import {
  ShoppingCart,
  Ticket,
  Package,
  PieChart,
  FileText,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const { orders } = useOrders();
  const { products } = useProducts();

  const pendingCount = orders.filter((o) => o.status === 'NEW').length;
  const outOfStockCount = products.filter((p) => p.stock <= 0).length;

  const navItems = [
    {
      to: '/',
      label: 'Billing',
      icon: ShoppingCart,
    },
    {
      to: '/tokens',
      label: 'Tokens',
      icon: Ticket,
      badge: pendingCount > 0 ? pendingCount : undefined,
      badgeColor: 'bg-amber-500 text-black',
    },
    {
      to: '/inventory',
      label: 'Inventory',
      icon: Package,
      badge: outOfStockCount > 0 ? outOfStockCount : undefined,
      badgeColor: 'bg-red-500 text-white',
    },
    {
      to: '/reports',
      label: 'Reports',
      icon: PieChart,
    },
    {
      to: '/orders',
      label: 'Orders',
      icon: FileText,
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-lg border-t border-border px-1 py-1.5 shadow-lg select-none">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all relative',
                isActive
                  ? 'text-brand font-black'
                  : 'text-muted-foreground hover:text-foreground font-semibold'
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    'h-5 w-5 transition-transform',
                    isActive ? 'scale-110 stroke-[2.5px]' : 'stroke-[1.8px]'
                  )}
                />
                {item.badge !== undefined && (
                  <span
                    className={cn(
                      'absolute -top-1.5 -right-2.5 h-4 min-w-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center shadow-xs',
                      item.badgeColor
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight leading-none">
                {item.label}
              </span>
              {isActive && (
                <span className="h-1 w-4 rounded-full bg-brand mt-0.5" />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
