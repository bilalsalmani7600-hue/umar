import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, Order, CartItem } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import {
  Search,
  ShoppingCart,
  Trash2,
  Printer,
  Settings,
  Plus,
  Minus,
  X,
  Ticket,
  Check,
  CheckCircle2,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobilePOSViewProps {
  products: Product[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  cartItems: CartItem[];
  onAddToCart: (product: Product) => void;
  onDecrementQuantity: (productId: string) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onClearCart: () => void;
  getItemQuantity: (productId: string) => number;
  onGenerateToken: () => void;
  onInstantCheckout?: () => void;
  isGenerating: boolean;
  recentOrders: Order[];
  onOpenReceipt: () => void;
}

export const MobilePOSView: React.FC<MobilePOSViewProps> = ({
  products,
  searchQuery,
  onSearchChange,
  cartItems,
  onAddToCart,
  onDecrementQuantity,
  onUpdateQuantity,
  onClearCart,
  getItemQuantity,
  onGenerateToken,
  onInstantCheckout,
  isGenerating,
  recentOrders,
  onOpenReceipt,
}) => {
  const navigate = useNavigate();

  // Local stepper buffer per product so staff can set custom qty before adding
  const [localQtys, setLocalQtys] = useState<Record<string, number>>({});

  const getRowStepperQty = (productId: string) => {
    const inCart = getItemQuantity(productId);
    if (inCart > 0) return inCart;
    return localQtys[productId] || 1;
  };

  const handleRowIncrement = (product: Product) => {
    const inCart = getItemQuantity(product.id);
    if (inCart > 0) {
      onAddToCart(product);
    } else {
      setLocalQtys((prev) => ({
        ...prev,
        [product.id]: (prev[product.id] || 1) + 1,
      }));
    }
  };

  const handleRowDecrement = (product: Product) => {
    const inCart = getItemQuantity(product.id);
    if (inCart > 0) {
      onDecrementQuantity(product.id);
    } else {
      setLocalQtys((prev) => ({
        ...prev,
        [product.id]: Math.max(1, (prev[product.id] || 1) - 1),
      }));
    }
  };

  const handleRowAddToCart = (product: Product) => {
    const inCart = getItemQuantity(product.id);
    if (inCart > 0) {
      onAddToCart(product);
    } else {
      const targetQty = localQtys[product.id] || 1;
      for (let i = 0; i < targetQty; i++) {
        onAddToCart(product);
      }
      setLocalQtys((prev) => ({ ...prev, [product.id]: 1 }));
    }
  };

  const totalItemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const grandTotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  // Take top 3 recent tokens for the bottom strip
  const liveTokens = recentOrders.slice(0, 3);

  return (
    <div className="w-full min-h-screen bg-[#FAF6F0] dark:bg-zinc-950 text-stone-900 dark:text-zinc-100 flex flex-col pb-8 select-none font-sans">
      {/* 1. TOP BAR (Matching Screenshot) */}
      <header className="flex items-center justify-between px-4 pt-3 pb-2.5 bg-[#FAF6F0] dark:bg-zinc-950 shrink-0">
        <div className="flex items-center gap-2">
          <div className="text-3xl leading-none">🧸</div>
          <span className="font-extrabold text-xl tracking-tight text-stone-900 dark:text-white">
            Toy Stall POS
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenReceipt}
            className="h-10 w-10 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-center text-stone-700 dark:text-zinc-300 shadow-sm active:scale-95 transition-all"
            title="Print Receipt"
          >
            <Printer className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="h-10 w-10 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-center text-stone-700 dark:text-zinc-300 shadow-sm active:scale-95 transition-all"
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* 2. SHORTCUT TABS (F1 Billing / F2 Tokens) */}
      <div className="grid grid-cols-2 gap-2.5 px-4 mb-3 shrink-0">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="h-11 rounded-xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 text-stone-900 dark:text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm"
        >
          <span className="text-[10px] px-1.5 py-0.5 rounded border border-stone-300 dark:border-zinc-700 font-mono text-stone-600 dark:text-zinc-400">
            F1
          </span>
          <span>Billing</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/tokens')}
          className="h-11 rounded-xl bg-[#7A1D24] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all"
        >
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/20 font-mono text-white/90">
            F2
          </span>
          <span>Tokens</span>
        </button>
      </div>

      {/* 3. SEARCH BAR */}
      <div className="px-4 mb-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search item (e.g., Doraemon, Car, Bear...)"
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-medium text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#7A1D24] shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 hover:text-stone-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 4. MAIN SCROLLABLE CONTAINER */}
      <div className="px-2.5 sm:px-4 space-y-3 flex-1">
        {/* CARD A: PRODUCTS TABLE LIST (Exact Matching Screenshot) */}
        <div className="rounded-2xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden p-2 sm:p-2.5">
          {/* Table Header */}
          <div className="grid grid-cols-[18px_1fr_44px_48px_104px] sm:grid-cols-[22px_1fr_52px_56px_112px] gap-1 sm:gap-2 px-1 pb-2 border-b border-stone-100 dark:border-zinc-800 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-stone-500 dark:text-zinc-400 items-center">
            <div className="text-center">#</div>
            <div className="pl-1 truncate">Item Name</div>
            <div className="text-center">Stock</div>
            <div className="text-right pr-0.5">Price</div>
            <div className="text-right pr-1">Action</div>
          </div>

          {/* Product Rows */}
          <div className="divide-y divide-stone-100 dark:divide-zinc-800/60 max-h-[340px] overflow-y-auto scrollbar-thin">
            {products.length === 0 ? (
              <div className="py-8 text-center text-stone-400 text-xs">
                No toys match your search
              </div>
            ) : (
              products.map((product, idx) => {
                const qtyInCart = getItemQuantity(product.id);
                const displayQty = getRowStepperQty(product.id);
                const isSelected = qtyInCart > 0;

                return (
                  <div
                    key={product.id}
                    className={cn(
                      'grid grid-cols-[18px_1fr_44px_48px_104px] sm:grid-cols-[22px_1fr_52px_56px_112px] gap-1 sm:gap-2 items-center py-2 px-1 rounded-xl transition-all',
                      isSelected
                        ? 'bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 my-0.5'
                        : 'hover:bg-stone-50/60 dark:hover:bg-zinc-800/40'
                    )}
                  >
                    {/* Index */}
                    <div className="text-center font-bold text-xs text-stone-500 dark:text-zinc-400 font-mono">
                      {(idx + 1).toString().padStart(2, '0')}
                    </div>

                    {/* Image & Name */}
                    <div className="flex items-center gap-1.5 min-w-0 pl-0.5">
                      {product.image && (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg object-cover bg-stone-100 dark:bg-zinc-800 shrink-0 border border-stone-200/60 dark:border-zinc-700/50"
                        />
                      )}
                      <span className="font-extrabold text-[11px] sm:text-xs text-stone-900 dark:text-zinc-100 line-clamp-2 leading-snug">
                        {product.name}
                      </span>
                    </div>

                    {/* Stock Badge */}
                    <div className="flex justify-center">
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 whitespace-nowrap">
                        {product.stock} pcs
                      </span>
                    </div>

                    {/* Price (100% visible, NEVER clipped) */}
                    <div className="text-right font-black text-xs sm:text-sm text-stone-900 dark:text-zinc-100 whitespace-nowrap tabular-nums pr-0.5">
                      ₹{product.price}
                    </div>

                    {/* Stepper + Add Cart Button */}
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Stepper */}
                      <div className="flex items-center border border-stone-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 h-8 px-1 shadow-2xs shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRowDecrement(product)}
                          className="h-6 w-4.5 flex items-center justify-center text-stone-600 dark:text-zinc-300 hover:text-stone-900 active:scale-90"
                        >
                          <Minus className="h-2.5 w-2.5" />
                        </button>
                        <span className="font-black text-xs w-4 text-center text-stone-900 dark:text-zinc-100">
                          {displayQty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRowIncrement(product)}
                          className="h-6 w-4.5 flex items-center justify-center text-stone-600 dark:text-zinc-300 hover:text-stone-900 active:scale-90"
                        >
                          <Plus className="h-2.5 w-2.5" />
                        </button>
                      </div>

                      {/* Buy (Add to Cart) Button - Prominent Square Icon Button */}
                      <button
                        type="button"
                        onClick={() => handleRowAddToCart(product)}
                        className="h-8 w-8 min-w-[32px] sm:h-9 sm:w-9 sm:min-w-[36px] rounded-lg bg-[#7A1D24] text-white flex items-center justify-center shadow-md active:scale-90 hover:bg-[#68181E] transition-transform shrink-0 cursor-pointer"
                        title="Add to cart"
                      >
                        <ShoppingCart className="h-4 w-4 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CARD B: CHECKOUT (CART PREVIEW & GENERATE TOKEN) */}
        <div className="rounded-2xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-3.5 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4.5 w-4.5 text-stone-800 dark:text-zinc-200" />
              <h3 className="font-extrabold text-base text-stone-900 dark:text-zinc-100">
                Checkout ({totalItemsCount})
              </h3>
            </div>

            {cartItems.length > 0 && (
              <button
                type="button"
                onClick={onClearCart}
                className="inline-flex items-center gap-1 text-xs font-bold text-stone-500 hover:text-red-600 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>

          {/* Cart Items List */}
          {cartItems.length === 0 ? (
            <div className="py-4 text-center text-xs text-stone-400">
              Your cart is empty. Tap <Plus className="inline h-3 w-3" /> or <ShoppingCart className="inline h-3 w-3" /> above to add toys.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-0.5 scrollbar-thin">
              {cartItems.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  {/* Image & Title */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {item.product.image && (
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="h-8 w-8 rounded-md object-cover bg-stone-100 dark:bg-zinc-800 shrink-0 border border-stone-200/50"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="font-extrabold text-stone-900 dark:text-zinc-100 truncate">
                        {item.product.name}
                      </div>
                      <div className="text-[11px] text-stone-500 dark:text-zinc-400">
                        ₹{item.product.price} × {item.quantity}
                      </div>
                    </div>
                  </div>

                  {/* Stepper */}
                  <div className="flex items-center border border-stone-200 dark:border-zinc-700 rounded-lg bg-stone-50 dark:bg-zinc-800 h-7 px-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onDecrementQuantity(item.product.id)}
                      className="h-5 w-4 flex items-center justify-center text-stone-600 hover:text-stone-900"
                    >
                      <Minus className="h-2.5 w-2.5" />
                    </button>
                    <span className="font-black text-xs w-4 text-center text-stone-900 dark:text-zinc-100">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onAddToCart(item.product)}
                      className="h-5 w-4 flex items-center justify-center text-stone-600 hover:text-stone-900"
                    >
                      <Plus className="h-2.5 w-2.5" />
                    </button>
                  </div>

                  {/* Subtotal */}
                  <div className="font-black text-sm text-stone-900 dark:text-zinc-100 min-w-[50px] text-right">
                    ₹{item.product.price * item.quantity}
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.product.id, 0)}
                    className="p-1 text-stone-400 hover:text-stone-700 shrink-0"
                    title="Remove item"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Grand Total Row */}
          <div className="flex items-baseline justify-between pt-2 border-t border-stone-100 dark:border-zinc-800">
            <span className="font-extrabold text-base text-stone-900 dark:text-zinc-100">
              Total
            </span>
            <span className="font-black text-2xl text-stone-900 dark:text-zinc-100 tracking-tight">
              {formatCurrency(grandTotal)}
            </span>
          </div>

          {/* GENERATE TOKEN & INSTANT SALE BUTTONS */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onGenerateToken}
              disabled={cartItems.length === 0 || isGenerating}
              className={cn(
                'w-full h-12 py-3 rounded-xl font-black text-base flex items-center justify-center gap-2 shadow-md transition-all select-none',
                cartItems.length === 0 || isGenerating
                  ? 'bg-stone-300 dark:bg-zinc-800 text-stone-500 cursor-not-allowed'
                  : 'bg-[#7A1D24] hover:bg-[#68181E] text-white active:scale-98'
              )}
            >
              <Tag className="h-4.5 w-4.5" />
              <span>{isGenerating ? 'Generating...' : 'Generate Token (F3)'}</span>
            </button>

            {onInstantCheckout && (
              <button
                type="button"
                onClick={onInstantCheckout}
                disabled={cartItems.length === 0 || isGenerating}
                className={cn(
                  'w-full h-11 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-sm transition-all select-none',
                  cartItems.length === 0 || isGenerating
                    ? 'bg-stone-200 dark:bg-zinc-800/50 text-stone-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-98'
                )}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>⚡ Instant Cash Sale (Deduct Stock)</span>
              </button>
            )}
          </div>
        </div>

        {/* CARD C: LIVE TOKENS (Matching Screenshot Bottom) */}
        <div className="rounded-2xl border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm p-3.5 space-y-2.5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-stone-800 dark:text-zinc-200" />
              <span className="font-extrabold text-sm text-stone-900 dark:text-zinc-100">
                Live Tokens
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
              </span>
            </div>

            <div className="text-xs font-bold text-stone-500 dark:text-zinc-400">
              Today: {recentOrders.length}
            </div>
          </div>

          {/* 3 Horizontal Live Token Cards */}
          {liveTokens.length === 0 ? (
            <div className="py-3 text-center text-xs text-stone-400">
              No tokens generated today yet.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {liveTokens.map((token, index) => {
                const isFirst = index === 0;
                const isCompleted = token.status === 'COMPLETED';

                return (
                  <div
                    key={token.id}
                    onClick={() => navigate('/tokens')}
                    className={cn(
                      'p-2.5 rounded-xl border text-center transition-all cursor-pointer select-none',
                      isFirst
                        ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 shadow-2xs'
                        : isCompleted
                        ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20'
                        : 'border-stone-200 dark:border-zinc-800 bg-stone-50/60 dark:bg-zinc-800/40'
                    )}
                  >
                    <div className="font-mono font-black text-lg text-stone-900 dark:text-zinc-100 leading-tight">
                      {token.token_number}
                    </div>

                    <div className="my-1 flex justify-center">
                      {isCompleted ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400">
                          <Check className="h-2.5 w-2.5" /> Completed
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold text-rose-700 bg-rose-100 dark:bg-rose-950 dark:text-rose-400">
                          New
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] text-stone-600 dark:text-zinc-400 font-semibold mt-0.5">
                      🛒 {token.items_count} {token.items_count === 1 ? 'Item' : 'Items'}
                    </div>

                    <div className="font-black text-xs text-stone-900 dark:text-zinc-100 mt-0.5">
                      ₹{token.total_amount}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
