import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Product } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface QuantityAdjustModalProps {
  product: Product | null;
  currentQuantity: number;
  open: boolean;
  onClose: () => void;
  onSave: (qty: number) => void;
}

export const QuantityAdjustModal: React.FC<QuantityAdjustModalProps> = ({
  product,
  currentQuantity,
  open,
  onClose,
  onSave,
}) => {
  const [val, setVal] = useState<string>(currentQuantity > 0 ? String(currentQuantity) : '1');

  if (!product) return null;

  const handleKey = (digit: string) => {
    if (val === '0' || val === '') {
      setVal(digit);
    } else {
      const next = val + digit;
      if (parseInt(next, 10) <= product.stock) {
        setVal(next);
      }
    }
  };

  const handleBackspace = () => {
    setVal((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
  };

  const handleConfirm = () => {
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      onSave(Math.min(parsed, product.stock));
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xs p-5" onClose={onClose}>
        <DialogHeader>
          <DialogTitle className="text-base text-center">
            Set Quantity for <span className="text-brand">{product.name}</span>
          </DialogTitle>
          <p className="text-xs text-center text-muted-foreground">
            Price: {formatCurrency(product.price)} • Available Stock: {product.stock}
          </p>
        </DialogHeader>

        {/* Display */}
        <div className="my-3 text-center">
          <div className="h-14 rounded-2xl bg-muted/60 flex items-center justify-center text-3xl font-black tracking-wider border border-border">
            {val}
          </div>
        </div>

        {/* Touch keypad */}
        <div className="grid grid-cols-3 gap-2 my-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                if (k === 'C') setVal('0');
                else if (k === '⌫') handleBackspace();
                else handleKey(k);
              }}
              className="h-12 rounded-xl bg-card border border-border hover:bg-muted font-black text-lg active:scale-95 transition-all flex items-center justify-center text-foreground"
            >
              {k}
            </button>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <Button onClick={handleConfirm} className="w-full text-base font-bold" variant="default">
            Apply Quantity
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

