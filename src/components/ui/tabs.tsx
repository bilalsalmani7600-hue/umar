import * as React from 'react';
import { cn } from '@/lib/utils';

interface TabsContextValue {
  value: string;
  onValueChange: (val: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

export function Tabs({
  value,
  onValueChange,
  defaultValue,
  className,
  children,
}: {
  value?: string;
  onValueChange?: (val: string) => void;
  defaultValue?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || '');
  const activeValue = value !== undefined ? value : internalValue;
  const setActiveValue = onValueChange || setInternalValue;

  return (
    <TabsContext.Provider value={{ value: activeValue, onValueChange: setActiveValue }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'inline-flex h-11 items-center justify-center rounded-xl bg-muted/60 p-1 text-muted-foreground',
        className
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  className,
  children,
  badge,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
  badge?: number | string;
}) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used within Tabs');

  const isActive = context.value === value;

  return (
    <button
      type="button"
      onClick={() => context.onValueChange(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        isActive
          ? 'bg-card text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
        className
      )}
    >
      <span>{children}</span>
      {badge !== undefined && (
        <span
          className={cn(
            'ml-1.5 inline-flex h-5 items-center justify-center rounded-full px-1.5 text-xs font-bold',
            isActive ? 'bg-brand text-white' : 'bg-muted-foreground/20 text-muted-foreground'
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error('TabsContent must be used within Tabs');

  if (context.value !== value) return null;

  return <div className={cn('mt-3 focus-visible:outline-none', className)}>{children}</div>;
}

