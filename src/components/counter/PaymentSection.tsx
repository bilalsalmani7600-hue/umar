import React, { useState } from 'react';
import { PaymentMethod } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Banknote, QrCode, Split, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentSectionProps {
  totalAmount: number;
  onConfirmPayment: (paymentData: {
    method: PaymentMethod;
    amount: number;
    cashTendered?: number;
    changeReturned?: number;
    cashAmount?: number;
    upiAmount?: number;
    transactionReference?: string;
  }) => void;
  isProcessing?: boolean;
}

export const PaymentSection: React.FC<PaymentSectionProps> = ({
  totalAmount,
  onConfirmPayment,
  isProcessing,
}) => {
  const [method, setMethod] = useState<PaymentMethod>('CASH');

  // Cash state
  const [cashTendered, setCashTendered] = useState<number>(totalAmount);

  // Split state
  const [splitCash, setSplitCash] = useState<number>(Math.floor(totalAmount / 2));
  const splitUpi = Math.max(0, totalAmount - splitCash);

  // UPI state
  const [upiRef, setUpiRef] = useState<string>('');

  const changeReturned = Math.max(0, cashTendered - totalAmount);
  const isCashInsufficient = cashTendered < totalAmount;

  const handleQuickCash = (addAmount: number) => {
    setCashTendered((prev) => prev + addAmount);
  };

  const handleSetExactCash = () => {
    setCashTendered(totalAmount);
  };

  const handleSubmit = () => {
    if (method === 'CASH') {
      if (isCashInsufficient) return;
      onConfirmPayment({
        method: 'CASH',
        amount: totalAmount,
        cashTendered,
        changeReturned,
        cashAmount: totalAmount,
      });
    } else if (method === 'UPI') {
      onConfirmPayment({
        method: 'UPI',
        amount: totalAmount,
        upiAmount: totalAmount,
        transactionReference: upiRef || `UPI-${Date.now().toString().slice(-6)}`,
      });
    } else if (method === 'SPLIT') {
      onConfirmPayment({
        method: 'SPLIT',
        amount: totalAmount,
        cashAmount: splitCash,
        upiAmount: splitUpi,
        transactionReference: upiRef || `SPLIT-${Date.now().toString().slice(-6)}`,
      });
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card/80 p-3 sm:p-3.5 space-y-2.5 max-h-[320px] overflow-y-auto scrollbar-thin">
      <div className="flex items-center justify-between">
        <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-foreground">
          Select Payment Method
        </h4>
        <span className="text-xs sm:text-sm font-black text-brand">
          Due: {formatCurrency(totalAmount)}
        </span>
      </div>

      {/* Method tabs */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setMethod('CASH')}
          className={cn(
            'flex flex-col items-center justify-center gap-1 py-2 sm:py-2.5 rounded-xl border text-xs font-black transition-all active:scale-95',
            method === 'CASH'
              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-sm'
              : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted'
          )}
        >
          <Banknote className="h-4 w-4 sm:h-5 sm:w-5" />
          <span>Cash</span>
        </button>

        <button
          type="button"
          onClick={() => setMethod('UPI')}
          className={cn(
            'flex flex-col items-center justify-center gap-1 py-2 sm:py-2.5 rounded-xl border text-xs font-black transition-all active:scale-95',
            method === 'UPI'
              ? 'border-sky-500 bg-sky-500/10 text-sky-400 shadow-sm'
              : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted'
          )}
        >
          <QrCode className="h-4 w-4 sm:h-5 sm:w-5" />
          <span>UPI / QR</span>
        </button>

        <button
          type="button"
          onClick={() => setMethod('SPLIT')}
          className={cn(
            'flex flex-col items-center justify-center gap-1 py-2 sm:py-2.5 rounded-xl border text-xs font-black transition-all active:scale-95',
            method === 'SPLIT'
              ? 'border-amber-500 bg-amber-500/10 text-amber-400 shadow-sm'
              : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted'
          )}
        >
          <Split className="h-4 w-4 sm:h-5 sm:w-5" />
          <span>Split</span>
        </button>
      </div>

      {/* CASH PAYMENT UI */}
      {method === 'CASH' && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between gap-3">
            <label className="text-xs font-bold text-muted-foreground">
              Cash Tendered:
            </label>
            <div className="relative w-36 sm:w-40">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-muted-foreground">
                ₹
              </span>
              <input
                type="number"
                value={cashTendered}
                onChange={(e) => setCashTendered(Number(e.target.value) || 0)}
                className="w-full h-9 pl-7 pr-3 rounded-xl border border-input bg-background font-mono font-black text-sm sm:text-base text-right focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>

          {/* Quick denomination buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={handleSetExactCash}
              className="px-2 py-1 rounded-lg border border-border bg-muted/40 hover:bg-muted text-[11px] font-bold shrink-0"
            >
              Exact
            </button>
            {[100, 200, 500, 1000, 2000].map((denom) => (
              <button
                key={denom}
                type="button"
                onClick={() => handleQuickCash(denom)}
                className="px-2 py-1 rounded-lg border border-border bg-muted/40 hover:bg-muted text-[11px] font-mono font-bold shrink-0"
              >
                +{denom}
              </button>
            ))}
          </div>

          {/* Change return calculation display */}
          <div className="p-2.5 rounded-xl bg-muted/50 border border-border flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">
              Change to Return:
            </span>
            <span
              className={cn(
                'text-base sm:text-lg font-black font-mono',
                isCashInsufficient ? 'text-red-400' : 'text-emerald-400'
              )}
            >
              {isCashInsufficient
                ? `Short by ${formatCurrency(totalAmount - cashTendered)}`
                : formatCurrency(changeReturned)}
            </span>
          </div>
        </div>
      )}

      {/* UPI PAYMENT UI */}
      {method === 'UPI' && (
        <div className="space-y-2 pt-1 text-center">
          <div className="inline-block p-2 rounded-xl bg-white border border-zinc-200">
            {/* Mock QR Code representation */}
            <div className="h-24 w-24 flex flex-col items-center justify-center border-2 border-black rounded-lg p-1 bg-white text-black">
              <QrCode className="h-14 w-14 text-black mb-0.5" />
              <div className="text-[9px] font-mono font-bold text-brand">
                {formatCurrency(totalAmount)}
              </div>
            </div>
          </div>

          <div className="text-[11px] font-semibold text-muted-foreground">
            UPI ID: <span className="font-mono text-foreground font-bold">toystall@upi</span>
          </div>

          <input
            type="text"
            placeholder="Optional UPI Ref / UTR No."
            value={upiRef}
            onChange={(e) => setUpiRef(e.target.value)}
            className="w-full h-8 px-3 rounded-xl border border-input bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
      )}

      {/* SPLIT PAYMENT UI */}
      {method === 'SPLIT' && (
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                Cash Amount:
              </label>
              <input
                type="number"
                value={splitCash}
                max={totalAmount}
                min={0}
                onChange={(e) => setSplitCash(Math.min(totalAmount, Number(e.target.value) || 0))}
                className="w-full h-9 px-3 rounded-xl border border-input bg-background font-mono font-black text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                UPI Amount:
              </label>
              <div className="w-full h-9 px-3 rounded-xl border border-border bg-muted flex items-center font-mono font-black text-xs sm:text-sm text-foreground">
                {formatCurrency(splitUpi)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Confirmation Button */}
      <Button
        onClick={handleSubmit}
        disabled={isProcessing || (method === 'CASH' && isCashInsufficient)}
        variant="success"
        className="w-full h-11 sm:h-12 rounded-xl text-sm sm:text-base font-bold shadow-lg flex items-center justify-center gap-2"
      >
        <Check className="h-5 w-5" />
        <span>Confirm Payment ({formatCurrency(totalAmount)})</span>
      </Button>
    </div>
  );
};

