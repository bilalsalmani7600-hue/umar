import React from 'react';
import { useCart } from '@/context/CartContext';
import { useOrders } from '@/hooks/useOrders';
import { formatCurrency, cn } from '@/lib/utils';
import { Minus, Plus, Trash2, Tag, ShoppingBag, X } from 'lucide-react';

interface CartSidebarProps {
  onGenerateToken: () => void;
  isGenerating?: boolean;
}

export const CartSidebar: React.FC<CartSidebarProps> = ({
  onGenerateToken,
  isGenerating,
}) => {
  const { items, clearCart, updateQuantity, decrementQuantity, removeFromCart, totalAmount, totalItems } = useCart();
  const { orders } = useOrders();

  // Get today's recent tokens for the bottom widget
  const todayOrders = orders.slice(0, 4);
  const todayCount = orders.length;

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl border border-border p-3.5 sm:p-4 select-none min-h-0 overflow-hidden">
      {/* Header: Checkout & Clear */}
      <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-brand" />
          <h3 className="font-extrabold text-base text-foreground">
            Checkout ({totalItems})
          </h3>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={clearCart}
            className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-red-500 transition-colors p-1 rounded"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto py-2.5 space-y-2 min-h-0 scrollbar-thin">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
            <div className="text-4xl mb-2 opacity-50">🛒</div>
            <p className="text-sm font-bold">Cart is empty</p>
            <p className="text-xs mt-1">Tap any toy card to start building order</p>
          </div>
        ) : (
          items.map(({ product, quantity }) => {
            const itemSubtotal = product.price * quantity;
            return (
              <div
                key={product.id}
                className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/50 group"
              >
                {/* Thumb + Title */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-10 w-10 rounded-lg object-cover bg-muted shrink-0 border border-border"
                  />
                  <div className="min-w-0 flex-1">
                    <h5 className="font-bold text-xs sm:text-sm text-foreground truncate">
                      {product.name}
                    </h5>
                    <p className="text-[11px] text-muted-foreground">
                      {formatCurrency(product.price)} × {quantity}
                    </p>
                  </div>
                </div>

                {/* Stepper */}
                <div className="flex items-center rounded-lg border border-border bg-card p-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => decrementQuantity(product.id)}
                    className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-95"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-black">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    disabled={quantity >= product.stock}
                    onClick={() => updateQuantity(product.id, quantity + 1)}
                    className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 active:scale-95"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                {/* Price & Remove */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs sm:text-sm font-black text-foreground min-w-[55px] text-right">
                    {formatCurrency(itemSubtotal)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFromCart(product.id)}
                    className="text-muted-foreground hover:text-red-500 p-1 rounded transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Cart Summary & Token Button */}
      <div className="pt-2.5 sm:pt-3 border-t border-border mt-auto shrink-0">
        <div className="flex items-baseline justify-between mb-2.5">
          <span className="text-xs sm:text-sm font-bold text-muted-foreground">Total</span>
          <span className="text-xl sm:text-2xl font-black text-foreground">
            {formatCurrency(totalAmount)}
          </span>
        </div>

        <button
          type="button"
          disabled={items.length === 0 || isGenerating}
          onClick={onGenerateToken}
          className={cn(
            'w-full h-12 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-black text-sm sm:text-base shadow-lg transition-all active:scale-[0.98]',
            items.length === 0
              ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
              : 'bg-brand text-white hover:bg-brand-700 active:bg-brand-800'
          )}
        >
          <Tag className="h-5 w-5" />
          <span>{isGenerating ? 'Generating...' : 'Generate Token (F3)'}</span>
        </button>
      </div>

      {/* Live Tokens Section (matching Screenshot 1 bottom) */}
      <div className="mt-3 pt-2.5 sm:pt-3 border-t border-border shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black uppercase text-foreground">Live Tokens</span>
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
            </span>
          </div>
          <span className="text-[11px] font-bold text-muted-foreground">
            Today: {todayCount}
          </span>
        </div>

        {/* Token mini cards row */}
        <div className="grid grid-cols-3 gap-2">
          {todayOrders.slice(0, 3).map((o) => (
            <div
              key={o.id}
              className={cn(
                'rounded-xl border p-2 text-center transition-all',
                o.status === 'NEW'
                  ? 'border-brand/40 bg-brand/5'
                  : o.status === 'COMPLETED'
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-border bg-muted/40'
              )}
            >
              <div className="font-mono font-black text-sm text-foreground">
                {o.token_number}
              </div>
              <div className="my-0.5">
                <span
                  className={cn(
                    'text-[9px] font-bold px-1.5 py-0.2 rounded-full',
                    o.status === 'NEW'
                      ? 'bg-brand/20 text-brand'
                      : o.status === 'COMPLETED'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {o.status === 'NEW' ? 'New' : o.status === 'COMPLETED' ? 'Completed' : o.status}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground">
                {o.items_count} Items
              </div>
              <div className="text-[11px] font-black text-foreground">
                {formatCurrency(o.total_amount)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

