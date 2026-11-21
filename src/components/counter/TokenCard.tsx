import React from 'react';
import { Order } from '@/lib/types';
import { formatCurrency, formatTimeAgo, cn } from '@/lib/utils';
import { Clock, CheckCircle2, XCircle, ChevronRight, Check, ArrowRight } from 'lucide-react';

interface TokenCardProps {
  order: Order;
  isSelected: boolean;
  onSelect: (order: Order) => void;
  onQuickAccept?: (orderId: string) => void;
  isProcessing?: boolean;
}

export const TokenCard: React.FC<TokenCardProps> = ({
  order,
  isSelected,
  onSelect,
  onQuickAccept,
  isProcessing,
}) => {
  const isNew = order.status === 'NEW';
  const isAccepted = order.status === 'ACCEPTED';
  const isPending = isNew || isAccepted;
  const isCompleted = order.status === 'COMPLETED';
  const isVoid = order.status === 'VOID';

  return (
    <div
      onClick={() => onSelect(order)}
      className={cn(
        'group flex items-center justify-between p-2.5 sm:p-3.5 rounded-2xl border transition-all cursor-pointer select-none gap-2',
        isSelected
          ? 'bg-amber-500/10 border-amber-500 shadow-md ring-1 ring-amber-500'
          : 'bg-card border-border hover:border-muted-foreground/30 hover:bg-muted/30'
      )}
    >
      {/* Left side: Token & Price */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="font-mono font-black text-base sm:text-xl text-foreground shrink-0">
          {order.token_number}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-black text-sm sm:text-base text-foreground leading-tight">
            {formatCurrency(order.total_amount)}
          </span>
          <span className="text-[10px] text-muted-foreground font-semibold">
            {order.items_count} {order.items_count === 1 ? 'item' : 'items'}
          </span>
        </div>
      </div>

      {/* Right side: Actions, Badges & Time */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Mobile Quick Action Buttons */}
        {isNew && onQuickAccept && (
          <button
            type="button"
            disabled={isProcessing}
            onClick={(e) => {
              e.stopPropagation();
              onQuickAccept(order.id);
            }}
            className="px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-sm flex items-center gap-1 transition-all"
            title="Approve Token"
          >
            <Check className="h-3 w-3 stroke-[3]" />
            <span>Approve</span>
          </button>
        )}

        {isAccepted && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <ArrowRight className="h-3 w-3" />
            Pay
          </span>
        )}

        {/* Status Badge (when not showing quick action) */}
        {!isAccepted && !isNew && isPending && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        )}

        {isCompleted && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="h-3 w-3" /> Done
          </span>
        )}

        {isVoid && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
            <XCircle className="h-3 w-3" /> Cancelled
          </span>
        )}

        <div className="text-[11px] text-muted-foreground hidden sm:block min-w-[55px] text-right font-medium">
          {formatTimeAgo(order.created_at)}
        </div>

        <ChevronRight
          className={cn(
            'h-4 w-4 transition-transform text-muted-foreground group-hover:translate-x-0.5',
            isSelected && 'text-amber-500 translate-x-0.5'
          )}
        />
      </div>
    </div>
  );
};

