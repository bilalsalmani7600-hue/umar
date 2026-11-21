import React, { useEffect, useState } from 'react';
import { Order } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Printer, ArrowRight, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TokenGeneratedModalProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  onPrint: () => void;
}

export const TokenGeneratedModal: React.FC<TokenGeneratedModalProps> = ({
  order,
  open,
  onClose,
  onPrint,
}) => {
  const [countdown, setCountdown] = useState<number>(5);

  useEffect(() => {
    if (open) {
      setCountdown(5);
      // Trigger instant confetti for celebration
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // ignore
      }

      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            onClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
          clearInterval(timer);
          onClose();
        }
      };
      window.addEventListener('keydown', handleKey);

      return () => {
        clearInterval(timer);
        window.removeEventListener('keydown', handleKey);
      };
    }
  }, [open, onClose]);

  if (!open || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-100 select-none">
      <div className="w-full max-w-md rounded-3xl bg-card border-2 border-brand/50 p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-brand/20 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold mb-4">
          <CheckCircle2 className="h-3.5 w-3.5" /> Order Saved & Sent to Counter
        </div>

        {/* Large Token Headline */}
        <h2 className="text-sm uppercase tracking-widest font-black text-muted-foreground">
          CUSTOMER TOKEN
        </h2>

        {/* Giant Token Number */}
        <div className="my-3 py-4 rounded-2xl bg-brand/10 border-2 border-brand text-brand">
          <div className="text-6xl sm:text-7xl font-black font-mono tracking-tight animate-pulse-subtle">
            {order.token_number}
          </div>
        </div>

        {/* Order summary pill */}
        <div className="flex items-center justify-center gap-4 py-2 border-y border-border/80 my-3 text-sm">
          <div>
            <span className="text-muted-foreground text-xs">Total Items: </span>
            <span className="font-extrabold text-foreground">{order.items_count}</span>
          </div>
          <div className="h-3 w-px bg-border" />
          <div>
            <span className="text-muted-foreground text-xs">Grand Total: </span>
            <span className="font-extrabold text-brand">{formatCurrency(order.total_amount)}</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          Hand physical token <strong className="text-foreground">{order.token_number}</strong> to the customer.
        </p>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
          <Button
            onClick={onPrint}
            variant="outline"
            className="flex-1 h-12 rounded-xl flex items-center justify-center gap-2 font-bold"
          >
            <Printer className="h-4 w-4" /> Print Slip
          </Button>

          <Button
            onClick={onClose}
            variant="default"
            className="flex-1 h-12 rounded-xl flex items-center justify-center gap-2 font-black text-base shadow-lg"
          >
            <span>Next Customer</span>
            <span className="text-xs bg-black/30 px-1.5 py-0.5 rounded-full font-mono">
              {countdown}s
            </span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="text-[10px] text-muted-foreground mt-3">
          Press <kbd className="font-mono bg-muted px-1 rounded">Enter</kbd> or click to return immediately
        </div>
      </div>
    </div>
  );
};

