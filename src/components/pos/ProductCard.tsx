import React, { useRef } from 'react';
import { Product } from '@/lib/types';
import { formatCurrency, cn } from '@/lib/utils';
import { Minus, Plus, ShoppingCart, AlertTriangle } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  quantityInCart: number;
  onAddToCart: (product: Product) => void;
  onDecrement: (productId: string) => void;
  onOpenQuantityModal: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  quantityInCart,
  onAddToCart,
  onDecrement,
  onOpenQuantityModal,
}) => {
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      onOpenQuantityModal(product);
    }, 600);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      className={cn(
        'group relative flex flex-col justify-between rounded-2xl border p-3 transition-all select-none min-w-0',
        isOutOfStock
          ? 'bg-muted/30 border-dashed border-muted-foreground/30 opacity-60'
          : quantityInCart > 0
          ? 'bg-card border-brand/50 shadow-md ring-1 ring-brand/30'
          : 'bg-card border-border hover:border-brand/40 shadow-xs hover:shadow-sm'
      )}
    >
      {/* Top Section: Image + Details */}
      <div
        className="flex items-start gap-2.5 cursor-pointer min-w-0"
        onClick={() => !isOutOfStock && onAddToCart(product)}
      >
        {/* Product Image */}
        <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-xl bg-muted/60 border border-border">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-1 text-center">
              <span className="text-[9px] font-black uppercase text-red-400 leading-tight">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* Text Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <h4
            className="font-extrabold text-xs sm:text-sm text-foreground line-clamp-2 leading-snug min-h-[2rem]"
            title={product.name}
          >
            {product.name}
          </h4>

          {/* Stock */}
          <div className="mt-1">
            {isOutOfStock ? (
              <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
                Stock: 0
              </span>
            ) : isLowStock ? (
              <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                <AlertTriangle className="h-2.5 w-2.5" /> Stock: {product.stock}
              </span>
            ) : (
              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                Stock: {product.stock}
              </span>
            )}
          </div>

          {/* Price */}
          <div className="mt-1.5 text-sm sm:text-base font-black text-foreground">
            {formatCurrency(product.price)}
          </div>
        </div>
      </div>

      {/* Bottom Action Bar (Matching Screenshot Mockup 1: Stepper + Square Maroon Cart Button) */}
      <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between gap-1.5">
        {/* Quantity Stepper */}
        <div className="flex items-center rounded-xl border border-border bg-muted/40 p-0.5 h-8">
          <button
            type="button"
            disabled={quantityInCart === 0 || isOutOfStock}
            onClick={(e) => {
              e.stopPropagation();
              onDecrement(product.id);
            }}
            className="h-7 w-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card disabled:opacity-30 active:scale-95 transition-all"
          >
            <Minus className="h-3 w-3" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenQuantityModal(product);
            }}
            className="h-7 px-1.5 text-center text-xs font-black hover:text-brand transition-colors min-w-[20px]"
            title="Click to enter exact quantity"
          >
            {quantityInCart > 0 ? quantityInCart : 1}
          </button>

          <button
            type="button"
            disabled={isOutOfStock || quantityInCart >= product.stock}
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product);
            }}
            className="h-7 w-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card disabled:opacity-30 active:scale-95 transition-all"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        {/* Square Maroon Cart Icon Button (Matching Image 1) */}
        <button
          type="button"
          disabled={isOutOfStock}
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart(product);
          }}
          className={cn(
            'h-8 w-8 sm:h-9 sm:w-9 rounded-xl flex items-center justify-center transition-all shadow-sm active:scale-90 shrink-0',
            isOutOfStock
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-brand hover:bg-brand-700 text-white'
          )}
          title="Add to Cart"
        >
          <ShoppingCart className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
