import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Order } from '@/lib/types';
import { formatCurrency, formatClockTime } from '@/lib/utils';
import { Printer, X } from 'lucide-react';

interface ThermalReceiptModalProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  order,
  open,
  onClose,
}) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xs sm:max-w-sm p-4 bg-white text-black dark:bg-zinc-900 dark:text-zinc-100 font-mono">
        <div className="flex justify-between items-center border-b pb-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Print Token Slip
          </span>
          <button onClick={onClose} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Printable Thermal Slip (Designed for 58mm / 80mm printers) */}
        <div id="printable-receipt" className="border border-dashed border-zinc-400 p-4 rounded bg-zinc-50 dark:bg-zinc-950 text-center text-xs">
          <div className="text-xl font-black mb-1 tracking-tight">🧸 TOY STALL POS</div>
          <div className="text-[11px] text-zinc-600 dark:text-zinc-400">Exhibition Mega Stall • Counter 1</div>
          <div className="text-[10px] text-zinc-500 mb-2">--------------------------------</div>

          {/* LARGE TOKEN DISPLAY */}
          <div className="my-3 py-2 border-y-2 border-black dark:border-white">
            <div className="text-xs uppercase font-bold tracking-widest text-zinc-600 dark:text-zinc-400">CUSTOMER TOKEN</div>
            <div className="text-5xl font-black tracking-tight my-1">{order.token_number}</div>
            <div className="text-[10px] text-zinc-500">Show this token at the billing counter</div>
          </div>

          <div className="text-left text-[11px] space-y-1 my-2">
            <div className="flex justify-between">
              <span>Time:</span>
              <span>{formatClockTime(order.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="font-bold">{order.status}</span>
            </div>
          </div>

          <div className="text-[10px] text-zinc-500 my-1">--------------------------------</div>

          {/* ITEMS LIST */}
          <div className="text-left space-y-1 my-2">
            {order.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between text-xs">
                <span>
                  {item.quantity}x {item.product_name}
                </span>
                <span className="font-semibold">{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
          </div>

          <div className="text-[10px] text-zinc-500 my-1">--------------------------------</div>

          {/* TOTAL */}
          <div className="flex justify-between text-sm font-black pt-1">
            <span>TOTAL AMOUNT:</span>
            <span>{formatCurrency(order.total_amount)}</span>
          </div>

          {/* BARCODE REPRESENTATION */}
          <div className="mt-4 pt-2 border-t border-dashed border-zinc-400">
            <div className="font-mono text-lg tracking-widest font-bold">||| | |||| | ||| ||</div>
            <div className="text-[10px] text-zinc-500 mt-1">*{order.token_number}*</div>
          </div>

          <div className="text-[10px] text-zinc-500 mt-3">
            Thank you for visiting! ✨
            <br />
            Keep your physical token ready.
          </div>
        </div>

        {/* Action button */}
        <div className="mt-4 flex gap-2">
          <Button onClick={handlePrint} className="w-full flex items-center justify-center gap-2" variant="default">
            <Printer className="h-4 w-4" /> Print Thermal Slip
          </Button>
          <Button onClick={onClose} variant="outline" className="px-4">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

